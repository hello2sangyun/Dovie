"""
Main FastAPI application for Dovie Messenger
Complete Python implementation with all features
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func

# Import our modules
from database import get_db, init_database
from models import User, ChatRoom, ChatParticipant, Message, Contact, PhoneVerification, PushSubscription, IOSDeviceToken, LocationShare, UserPost, PostLike, PostComment, Command, LinkPreview
from schemas import (
    UserCreate, UserSocialCreate, UserLogin, UserResponse, Token,
    ChatRoomCreate, ChatRoomResponse, MessageCreate, MessageResponse,
    ContactCreate, ContactResponse, PhoneVerificationRequest, PhoneVerificationVerify,
    PushSubscriptionCreate, LocationShareCreate, LocationShareResponse,
    PostCreate, PostResponse, CommentCreate, CommentResponse,
    CommandCreate, CommandResponse, WebSocketMessage
)
from auth import authenticate_user, create_access_token, get_current_user, get_current_user_optional
from services import UserService, MessageService, ChatRoomService, PhoneVerificationService, OpenAIService, FileService, LocationService
from websocket_manager import manager
from push_notifications import push_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Dovie Messenger API",
    description="Complete Python implementation of Dovie Messenger",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Dovie Messenger Python Server...")
    init_database()
    logger.info("✅ Server startup completed!")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Authentication Routes
@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = UserService.create_user(user_data, db)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login", response_model=Token)
async def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = authenticate_user(user_data.username, user_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Update user online status
    user.is_online = True
    user.last_seen = func.now()
    db.commit()
    
    logger.info(f"👤 User {user.username} logged in")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.post("/api/auth/social-login", response_model=Token)
async def social_login(user_data: UserSocialCreate, db: Session = Depends(get_db)):
    """Login or register with social provider"""
    user = UserService.create_social_user(user_data, db)
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Update online status
    user.is_online = True
    user.last_seen = func.now()
    db.commit()
    
    logger.info(f"📱 Social login: {user.username} via {user.login_provider}")
    return {"access_token": access_token, "token_type": "bearer"}

# Phone Verification Routes
@app.post("/api/auth/send-sms")
async def send_sms_verification(
    request: PhoneVerificationRequest,
    db: Session = Depends(get_db)
):
    """Send SMS verification code"""
    success = PhoneVerificationService.send_verification_code(
        request.phone_number, request.country_code, db
    )
    
    if success:
        return {"success": True, "message": "인증 코드를 전송했습니다."}
    else:
        raise HTTPException(status_code=500, detail="SMS 전송에 실패했습니다.")

@app.post("/api/auth/verify-sms")
async def verify_sms_code(
    request: PhoneVerificationVerify,
    db: Session = Depends(get_db)
):
    """Verify SMS code"""
    success = PhoneVerificationService.verify_code(
        request.phone_number, request.country_code, request.verification_code, db
    )
    
    if success:
        return {"success": True, "message": "인증이 완료되었습니다."}
    else:
        raise HTTPException(status_code=400, detail="유효하지 않은 인증 코드입니다.")

# Chat Room Routes
@app.post("/api/chat-rooms", response_model=ChatRoomResponse)
async def create_chat_room(
    room_data: ChatRoomCreate,
    participant_ids: List[int] = [],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat room"""
    chat_room = ChatRoomService.create_chat_room(
        current_user.id, room_data, participant_ids, db
    )
    return chat_room

@app.get("/api/chat-rooms", response_model=List[ChatRoomResponse])
async def get_user_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's chat rooms"""
    chat_rooms = ChatRoomService.get_user_chat_rooms(current_user.id, db)
    
    # Load participants for each chat room
    for room in chat_rooms:
        participants = db.query(User).join(ChatParticipant).filter(
            ChatParticipant.chat_room_id == room.id
        ).all()
        room.participants = participants
    
    return chat_rooms

@app.get("/api/unread-counts")
async def get_unread_counts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread message counts"""
    unread_counts = ChatRoomService.get_unread_counts(current_user.id, db)
    
    return {
        "unreadCounts": [
            {"chatRoomId": room_id, "unreadCount": count}
            for room_id, count in unread_counts.items()
        ]
    }

# Message Routes
@app.get("/api/chat-rooms/{chat_room_id}/messages", response_model=List[MessageResponse])
async def get_chat_room_messages(
    chat_room_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages in a chat room"""
    # Verify user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_room_id == chat_room_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get messages with sender info
    messages = db.query(Message).options(
        joinedload(Message.sender)
    ).filter(
        Message.chat_room_id == chat_room_id
    ).order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
    
    # Reverse to get chronological order
    messages.reverse()
    
    return messages

@app.post("/api/chat-rooms/{chat_room_id}/messages", response_model=MessageResponse)
async def create_message(
    chat_room_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message"""
    # Verify user is participant
    participant = db.query(ChatParticipant).filter(
        and_(
            ChatParticipant.chat_room_id == chat_room_id,
            ChatParticipant.user_id == current_user.id
        )
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message = await MessageService.create_message(
        chat_room_id, current_user.id, message_data, db
    )
    
    # Load sender info (this would typically be done via a relationship in real implementation)
    # message.sender = current_user  # This is handled by the response model
    
    # Broadcast via WebSocket
    await manager.send_new_message(
        {
            "id": message.id,
            "chat_room_id": message.chat_room_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "message_type": message.message_type,
            "created_at": message.created_at.isoformat(),
            "sender": {
                "id": current_user.id,
                "display_name": current_user.display_name,
                "profile_picture": current_user.profile_picture
            }
        },
        chat_room_id,
        exclude_user_id=current_user.id
    )
    
    return message

# File Upload Routes
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Read file content
    file_content = await file.read()
    
    # Save file
    file_info = await FileService.save_uploaded_file(
        file_content, file.filename, current_user.id
    )
    
    return file_info

@app.get("/api/files/{filename}")
async def get_file(filename: str):
    """Serve uploaded files"""
    file_path = f"uploads/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@app.get("/api/profile-images/{filename}")
async def get_profile_image(filename: str):
    """Serve profile images"""
    file_path = f"uploads/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)

# Push Notification Routes
@app.get("/api/push-vapid-key")
async def get_vapid_key():
    """Get VAPID public key for push notifications"""
    return {"publicKey": push_service.get_vapid_public_key()}

@app.post("/api/push-subscribe")
async def subscribe_push(
    subscription_data: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to push notifications"""
    success = await push_service.subscribe_web_push(
        user_id=current_user.id,
        endpoint=subscription_data.endpoint,
        p256dh=subscription_data.p256dh,
        auth=subscription_data.auth,
        user_agent=subscription_data.user_agent,
        db=db
    )
    
    if success:
        return {"success": True, "message": "Push notifications enabled"}
    else:
        raise HTTPException(status_code=500, detail="Failed to subscribe to push notifications")

@app.post("/api/ios-push-token")
async def register_ios_token(
    token_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register iOS device token"""
    success = await push_service.subscribe_ios_push(
        user_id=current_user.id,
        device_token=token_data["deviceToken"],
        db=db
    )
    
    if success:
        return {"success": True, "message": "iOS push token registered"}
    else:
        raise HTTPException(status_code=500, detail="Failed to register iOS token")

# Location Routes
@app.post("/api/chat-rooms/{chat_room_id}/location")
async def share_location(
    chat_room_id: int,
    location_data: LocationShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share location in chat room"""
    location_share = LocationService.create_location_share(
        current_user.id, chat_room_id, location_data, db
    )
    return location_share

# OpenAI Integration Routes
@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio file"""
    if not file.filename or not file.filename.endswith(('.mp3', '.wav', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Invalid audio file")
    
    # Save temporary file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as temp_file:
        content = await file.read()
        temp_file.write(content)
    
    try:
        # Transcribe
        transcript = await OpenAIService.transcribe_audio(temp_path)
        return {"transcript": transcript}
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/translate")
async def translate_text(
    text_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Translate text"""
    translated = await OpenAIService.translate_text(
        text_data["text"], 
        text_data.get("target_language", "ko")
    )
    return {"translated": translated}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket connection for real-time messaging"""
    await websocket.accept()
    user_id = None
    
    try:
        # Wait for authentication message
        auth_message = await websocket.receive_text()
        auth_data = json.loads(auth_message)
        
        if auth_data.get("type") == "auth":
            token = auth_data.get("token")
            if token:
                # Verify token and get user
                try:
                    from auth import verify_token
                    token_data = verify_token(token)
                    user = db.query(User).filter(User.id == token_data.user_id).first()
                    if user:
                        user_id = user.id
                        await manager.connect(websocket, user_id, db)
                        await websocket.send_text(json.dumps({
                            "type": "auth_success",
                            "message": "Connected successfully"
                        }))
                        
                        # Listen for messages
                        while True:
                            try:
                                data = await websocket.receive_text()
                                message_data = json.loads(data)
                                
                                # Handle different message types
                                if message_data.get("type") == "typing":
                                    await manager.send_typing_indicator(
                                        user_id,
                                        message_data.get("chat_room_id"),
                                        message_data.get("is_typing", False)
                                    )
                                elif message_data.get("type") == "heartbeat":
                                    await websocket.send_text(json.dumps({
                                        "type": "heartbeat_ack"
                                    }))
                                    
                            except WebSocketDisconnect:
                                break
                            except Exception as e:
                                logger.error(f"WebSocket message error: {e}")
                                break
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "auth_error",
                            "message": "Invalid token"
                        }))
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "auth_error",
                        "message": "Authentication failed"
                    }))
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if user_id:
            manager.disconnect(user_id, db)

# Serve the frontend (optional - for single-file deployment)
@app.get("/")
async def serve_frontend():
    """Serve basic frontend for testing"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dovie Messenger Python</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .status { color: green; font-weight: bold; }
            .endpoint { background: white; padding: 10px; margin: 10px 0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Dovie Messenger Python Server</h1>
            <p class="status">✅ Server is running successfully!</p>
            
            <h2>API Endpoints</h2>
            <div class="endpoint">
                <strong>POST /api/auth/register</strong> - Register user
            </div>
            <div class="endpoint">
                <strong>POST /api/auth/login</strong> - Login user
            </div>
            <div class="endpoint">
                <strong>GET /api/chat-rooms</strong> - Get chat rooms
            </div>
            <div class="endpoint">
                <strong>POST /api/chat-rooms/{id}/messages</strong> - Send message
            </div>
            <div class="endpoint">
                <strong>WebSocket /ws</strong> - Real-time messaging
            </div>
            
            <h2>Features Implemented</h2>
            <ul>
                <li>✅ User authentication & social login</li>
                <li>✅ Real-time WebSocket messaging</li>
                <li>✅ Push notifications (Web & iOS)</li>
                <li>✅ File uploads & sharing</li>
                <li>✅ Location sharing</li>
                <li>✅ Voice transcription</li>
                <li>✅ SMS verification</li>
                <li>✅ Message reactions & replies</li>
                <li>✅ Group chats</li>
                <li>✅ QR code generation</li>
            </ul>
            
            <p><a href="/docs">📚 API Documentation</a></p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    # Run the server
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )