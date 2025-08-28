"""
Database models for Dovie Messenger
Complete Python SQLAlchemy implementation
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, UniqueConstraint, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String)  # Nullable for social login
    phone_number = Column(String)
    
    # Social login information
    google_id = Column(String, unique=True)
    facebook_id = Column(String, unique=True)
    login_provider = Column(String, default="email")  # email, google, facebook, phone
    
    # Profile information
    birthday = Column(String)
    profile_picture = Column(String)
    qr_code = Column(String)
    qr_token = Column(String)  # Temporary QR token
    qr_token_expiry = Column(DateTime)  # Token expiry time
    
    # Status and settings
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=func.now())
    language = Column(String, default="ko")
    notifications_enabled = Column(Boolean, default=True)
    notification_sound = Column(String, default="default")
    is_email_verified = Column(Boolean, default=False)
    is_profile_complete = Column(Boolean, default=False)
    
    # User roles and business info
    user_role = Column(String, default="user")  # user, business, admin
    business_name = Column(String)
    business_address = Column(String)
    business_latitude = Column(DECIMAL(10, 8))
    business_longitude = Column(DECIMAL(11, 8))
    is_business_verified = Column(Boolean, default=False)
    
    # Voice message settings
    allow_voice_playback = Column(Boolean, default=True)
    auto_play_voice_messages = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nickname = Column(String)
    is_pinned = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_group = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_location_chat = Column(Boolean, default=False)  # For nearby chats
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ChatParticipant(Base):
    __tablename__ = "chat_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=func.now())
    last_read_message_id = Column(Integer, ForeignKey("messages.id"))
    is_admin = Column(Boolean, default=False)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text)
    message_type = Column(String, default="text")  # text, image, file, voice, location, poll
    file_url = Column(String)
    file_name = Column(String)
    file_size = Column(Integer)
    file_type = Column(String)
    encrypted_file_key = Column(String)
    voice_duration = Column(Integer)  # For voice messages in seconds
    hashtags = Column(String)  # Comma-separated hashtags
    reply_to_message_id = Column(Integer, ForeignKey("messages.id"))
    is_system_message = Column(Boolean, default=False)
    is_command_recall = Column(Boolean, default=False)
    is_local_only = Column(Boolean, default=False)
    metadata = Column(JSON)  # For additional message data
    created_at = Column(DateTime, default=func.now())

class MessageLike(Base):
    __tablename__ = "message_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, default="👍")
    created_at = Column(DateTime, default=func.now())

class PhoneVerification(Base):
    __tablename__ = "phone_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, nullable=False)
    country_code = Column(String, nullable=False)
    verification_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    user_agent = Column(String)
    created_at = Column(DateTime, default=func.now())

class IOSDeviceToken(Base):
    __tablename__ = "ios_device_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_token = Column(String, nullable=False)
    platform = Column(String, default="ios", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('user_id', 'device_token', name='unique_user_token'),)

class LocationShareRequest(Base):
    __tablename__ = "location_share_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    request_message = Column(String, nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    address = Column(String)
    is_shared = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class LocationShare(Base):
    __tablename__ = "location_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"))
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    address = Column(String)
    map_image_url = Column(String)
    google_maps_url = Column(String)
    created_at = Column(DateTime, default=func.now())

class UserPost(Base):
    __tablename__ = "user_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String)
    hashtags = Column(String)  # Comma-separated
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    is_business_post = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class PostLike(Base):
    __tablename__ = "post_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("user_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

class PostComment(Base):
    __tablename__ = "post_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("user_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("post_comments.id"))
    created_at = Column(DateTime, default=func.now())

class Command(Base):
    __tablename__ = "commands"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id"))
    command_name = Column(String, nullable=False)
    command_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())

class LinkPreview(Base):
    __tablename__ = "link_previews"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False, unique=True)
    title = Column(String)
    description = Column(Text)
    image_url = Column(String)
    site_name = Column(String)
    created_at = Column(DateTime, default=func.now())