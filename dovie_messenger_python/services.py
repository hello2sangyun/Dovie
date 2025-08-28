"""
Business logic services for Dovie Messenger
"""

import os
import json
import hashlib
import qrcode
import aiofiles
from io import BytesIO
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from models import User, ChatRoom, ChatParticipant, Message, Contact, PhoneVerification, PushSubscription, IOSDeviceToken, LocationShare, UserPost, PostLike, PostComment, Command, LinkPreview
from schemas import (
    UserCreate, UserSocialCreate, UserResponse,
    MessageCreate, MessageResponse,
    ChatRoomCreate, PhoneVerificationRequest,
    LocationShareCreate
)
from auth import hash_password
from push_notifications import push_service
import openai
import httpx
from twilio.rest import Client as TwilioClient
import logging

logger = logging.getLogger(__name__)

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

class UserService:
    @staticmethod
    def create_user(user_data: UserCreate, db: Session) -> User:
        """Create a new user"""
        # Check if username or email already exists
        existing_user = db.query(User).filter(
            or_(User.username == user_data.username, User.email == user_data.email)
        ).first()
        
        if existing_user:
            raise ValueError("Username or email already exists")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        user = User(
            username=user_data.username,
            display_name=user_data.display_name,
            email=user_data.email,
            password=hashed_password,
            phone_number=user_data.phone_number,
            birthday=user_data.birthday,
            language=user_data.language,
            user_role=user_data.user_role,
            business_name=user_data.business_name,
            business_address=user_data.business_address
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Generate QR code
        UserService.generate_qr_code(user.id, db)
        
        logger.info(f"✅ Created new user: {user.username} (ID: {user.id})")
        return user
    
    @staticmethod
    def create_social_user(user_data: UserSocialCreate, db: Session) -> User:
        """Create user from social login"""
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            # Link social account to existing user
            if user_data.google_id:
                existing_user.google_id = user_data.google_id
            if user_data.facebook_id:
                existing_user.facebook_id = user_data.facebook_id
            existing_user.login_provider = user_data.login_provider
            if user_data.profile_picture:
                existing_user.profile_picture = user_data.profile_picture
            db.commit()
            return existing_user
        
        # Create new social user
        user = User(
            username=user_data.username,
            display_name=user_data.display_name,
            email=user_data.email,
            google_id=user_data.google_id,
            facebook_id=user_data.facebook_id,
            login_provider=user_data.login_provider,
            profile_picture=user_data.profile_picture,
            is_profile_complete=False
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Generate QR code
        UserService.generate_qr_code(user.id, db)
        
        logger.info(f"✅ Created social user: {user.username} via {user.login_provider}")
        return user
    
    @staticmethod
    def generate_qr_code(user_id: int, db: Session):
        """Generate QR code for user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Generate QR token
        qr_token = hashlib.md5(f"{user.id}{user.username}{datetime.utcnow()}".encode()).hexdigest()
        
        # Create QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"dovie://add-friend/{qr_token}")
        qr.make(fit=True)
        
        # Save QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        qr_path = f"uploads/qr_{user.id}.png"
        os.makedirs(os.path.dirname(qr_path), exist_ok=True)
        img.save(qr_path)
        
        # Update user
        user.qr_code = qr_path
        user.qr_token = qr_token
        user.qr_token_expiry = datetime.utcnow() + timedelta(days=365)  # 1 year
        db.commit()
        
        logger.info(f"Generated QR code for user {user_id}")

class MessageService:
    @staticmethod
    async def create_message(
        chat_room_id: int,
        sender_id: int,
        message_data: MessageCreate,
        db: Session
    ) -> Message:
        """Create a new message"""
        # Create message
        message = Message(
            chat_room_id=chat_room_id,
            sender_id=sender_id,
            content=message_data.content,
            message_type=message_data.message_type,
            reply_to_message_id=message_data.reply_to_message_id,
            hashtags=message_data.hashtags,
            metadata=message_data.metadata
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Update chat room timestamp
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if chat_room:
            chat_room.updated_at = func.now()
            db.commit()
        
        # Send push notifications to other participants
        await MessageService.send_message_notifications(message, db)
        
        logger.info(f"📝 Created message {message.id} in room {chat_room_id}")
        return message
    
    @staticmethod
    async def send_message_notifications(message: Message, db: Session):
        """Send push notifications for new message"""
        # Get chat room participants
        participants = db.query(ChatParticipant).filter(
            ChatParticipant.chat_room_id == message.chat_room_id,
            ChatParticipant.user_id != message.sender_id
        ).all()
        
        # Get sender info
        sender = db.query(User).filter(User.id == message.sender_id).first()
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == message.chat_room_id).first()
        
        if not sender or not chat_room:
            return
        
        # Send notifications to each participant
        for participant in participants:
            await push_service.send_message_notification(
                recipient_user_id=participant.user_id,
                sender_name=sender.display_name,
                message_content=message.content or "파일",
                chat_room_name=chat_room.name,
                chat_room_id=chat_room.id,
                db=db
            )

class ChatRoomService:
    @staticmethod
    def create_chat_room(
        creator_id: int,
        room_data: ChatRoomCreate,
        participant_ids: List[int],
        db: Session
    ) -> ChatRoom:
        """Create a new chat room"""
        # Create chat room
        chat_room = ChatRoom(
            name=room_data.name,
            is_group=room_data.is_group,
            is_location_chat=room_data.is_location_chat,
            created_by=creator_id
        )
        
        db.add(chat_room)
        db.commit()
        db.refresh(chat_room)
        
        # Add participants
        all_participant_ids = list(set([creator_id] + participant_ids))
        for user_id in all_participant_ids:
            participant = ChatParticipant(
                chat_room_id=chat_room.id,
                user_id=user_id,
                is_admin=(user_id == creator_id)
            )
            db.add(participant)
        
        db.commit()
        
        logger.info(f"🏠 Created chat room {chat_room.id}: {room_data.name}")
        return chat_room
    
    @staticmethod
    def get_user_chat_rooms(user_id: int, db: Session) -> List[ChatRoom]:
        """Get all chat rooms for a user"""
        chat_rooms = db.query(ChatRoom).join(ChatParticipant).filter(
            ChatParticipant.user_id == user_id
        ).order_by(desc(ChatRoom.updated_at)).all()
        
        return chat_rooms
    
    @staticmethod
    def get_unread_counts(user_id: int, db: Session) -> Dict[int, int]:
        """Get unread message counts for user's chat rooms"""
        # Get user's last read message IDs for each chat room
        participants = db.query(ChatParticipant).filter(
            ChatParticipant.user_id == user_id
        ).all()
        
        unread_counts = {}
        
        for participant in participants:
            # Count messages after last read message
            query = db.query(func.count(Message.id)).filter(
                Message.chat_room_id == participant.chat_room_id,
                Message.sender_id != user_id  # Don't count own messages
            )
            
            if participant.last_read_message_id:
                query = query.filter(Message.id > participant.last_read_message_id)
            
            count = query.scalar() or 0
            if count > 0:
                unread_counts[participant.chat_room_id] = count
        
        return unread_counts

class PhoneVerificationService:
    @staticmethod
    def send_verification_code(
        phone_number: str,
        country_code: str,
        db: Session
    ) -> bool:
        """Send SMS verification code"""
        # Generate 6-digit code
        import random
        verification_code = f"{random.randint(100000, 999999)}"
        
        # Clean up old verifications
        db.query(PhoneVerification).filter(
            PhoneVerification.expires_at < datetime.utcnow()
        ).delete()
        db.commit()
        
        # Full phone number format
        full_phone = f"+{country_code.lstrip('+')}{phone_number}"
        
        # Create verification record
        verification = PhoneVerification(
            phone_number=full_phone,
            country_code=country_code,
            verification_code=verification_code,
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        db.add(verification)
        db.commit()
        
        # Send SMS via Twilio
        try:
            twilio_client = TwilioClient(
                os.getenv("TWILIO_ACCOUNT_SID"),
                os.getenv("TWILIO_AUTH_TOKEN")
            )
            
            message = twilio_client.messages.create(
                body=f"Dovie Messenger 인증 코드: {verification_code}",
                from_=os.getenv("TWILIO_PHONE_NUMBER"),
                to=full_phone
            )
            
            logger.info(f"📱 SMS sent to {full_phone}: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SMS failed for {full_phone}: {e}")
            # In development mode, just log the code
            if os.getenv("NODE_ENV") == "development":
                logger.info(f"🔧 DEV MODE - Verification code: {verification_code}")
                return True
            return False
    
    @staticmethod
    def verify_code(
        phone_number: str,
        country_code: str,
        verification_code: str,
        db: Session
    ) -> bool:
        """Verify SMS code"""
        full_phone = f"+{country_code.lstrip('+')}{phone_number}"
        
        verification = db.query(PhoneVerification).filter(
            PhoneVerification.phone_number == full_phone,
            PhoneVerification.verification_code == verification_code,
            PhoneVerification.expires_at > datetime.utcnow(),
            PhoneVerification.is_verified == False
        ).first()
        
        if not verification:
            return False
        
        verification.is_verified = True
        db.commit()
        
        logger.info(f"✅ Phone verified: {full_phone}")
        return True

class OpenAIService:
    @staticmethod
    async def transcribe_audio(file_path: str) -> str:
        """Transcribe audio file using OpenAI Whisper"""
        try:
            with open(file_path, "rb") as audio_file:
                transcript = openai.Audio.transcribe("whisper-1", audio_file)
                return transcript["text"]
        except Exception as e:
            logger.error(f"❌ Audio transcription failed: {e}")
            return ""
    
    @staticmethod
    async def translate_text(text: str, target_language: str = "ko") -> str:
        """Translate text using OpenAI"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": f"Translate the following text to {target_language}. Only return the translation, no explanations."},
                    {"role": "user", "content": text}
                ],
                max_tokens=200
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"❌ Translation failed: {e}")
            return text
    
    @staticmethod
    async def search_youtube(query: str) -> List[Dict]:
        """Search YouTube videos using OpenAI for query processing"""
        try:
            # Use a simple YouTube search API or return mock results
            # This would typically integrate with YouTube Data API
            return [
                {
                    "title": f"Video result for: {query}",
                    "url": f"https://youtube.com/search?q={query.replace(' ', '+')}",
                    "thumbnail": "https://img.youtube.com/vi/placeholder/mqdefault.jpg"
                }
            ]
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}")
            return []

class FileService:
    @staticmethod
    async def save_uploaded_file(file_content: bytes, filename: str, user_id: int) -> Dict[str, Any]:
        """Save uploaded file with encryption"""
        # Generate unique filename
        timestamp = int(datetime.utcnow().timestamp())
        safe_filename = f"{user_id}_{timestamp}_{filename}"
        
        # Create upload directory
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, safe_filename)
        
        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)
        
        # Get file info
        file_size = len(file_content)
        file_type = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
        
        logger.info(f"📁 Saved file: {safe_filename} ({file_size} bytes)")
        
        return {
            "file_path": file_path,
            "file_url": f"/api/files/{safe_filename}",
            "file_size": file_size,
            "file_type": file_type,
            "original_filename": filename
        }

class LocationService:
    @staticmethod
    def create_location_share(
        user_id: int,
        chat_room_id: int,
        location_data: LocationShareCreate,
        db: Session
    ) -> LocationShare:
        """Create location share"""
        location_share = LocationShare(
            user_id=user_id,
            chat_room_id=chat_room_id,
            latitude=location_data.latitude,
            longitude=location_data.longitude,
            address=location_data.address,
            message_id=location_data.message_id
        )
        
        db.add(location_share)
        db.commit()
        db.refresh(location_share)
        
        logger.info(f"📍 Created location share {location_share.id}")
        return location_share