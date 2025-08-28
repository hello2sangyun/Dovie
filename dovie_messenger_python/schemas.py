"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# User schemas
class UserBase(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    birthday: Optional[str] = None
    language: str = "ko"
    user_role: str = "user"
    business_name: Optional[str] = None
    business_address: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserSocialCreate(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    google_id: Optional[str] = None
    facebook_id: Optional[str] = None
    login_provider: str = "email"
    profile_picture: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    profile_picture: Optional[str] = None
    is_online: bool = False
    last_seen: Optional[datetime] = None
    notifications_enabled: bool = True
    is_email_verified: bool = False
    is_profile_complete: bool = False
    allow_voice_playback: bool = True
    auto_play_voice_messages: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

# Chat room schemas
class ChatRoomCreate(BaseModel):
    name: str
    is_group: bool = False
    is_location_chat: bool = False

class ChatRoomResponse(BaseModel):
    id: int
    name: str
    is_group: bool
    is_pinned: bool
    is_location_chat: bool
    created_by: int
    created_at: datetime
    participants: Optional[List[UserResponse]] = []
    
    class Config:
        from_attributes = True

# Message schemas
class MessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"
    reply_to_message_id: Optional[int] = None
    hashtags: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    content: Optional[str] = None
    message_type: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    voice_duration: Optional[int] = None
    hashtags: Optional[str] = None
    reply_to_message_id: Optional[int] = None
    is_system_message: bool = False
    is_command_recall: bool = False
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    sender: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# Contact schemas
class ContactCreate(BaseModel):
    contact_user_id: int
    nickname: Optional[str] = None

class ContactResponse(BaseModel):
    id: int
    user_id: int
    contact_user_id: int
    nickname: Optional[str] = None
    is_pinned: bool = False
    is_favorite: bool = False
    is_blocked: bool = False
    created_at: datetime
    contact_user: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# Phone verification schemas
class PhoneVerificationRequest(BaseModel):
    phone_number: str
    country_code: str

class PhoneVerificationVerify(BaseModel):
    phone_number: str
    country_code: str
    verification_code: str

# Push notification schemas
class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None

class PushNotificationData(BaseModel):
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[str] = None
    tag: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# Location schemas
class LocationShareCreate(BaseModel):
    latitude: Decimal
    longitude: Decimal
    address: Optional[str] = None
    message_id: Optional[int] = None

class LocationShareResponse(BaseModel):
    id: int
    user_id: int
    chat_room_id: int
    latitude: Decimal
    longitude: Decimal
    address: Optional[str] = None
    map_image_url: Optional[str] = None
    google_maps_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Post schemas
class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    hashtags: Optional[str] = None
    is_business_post: bool = False

class PostResponse(BaseModel):
    id: int
    user_id: int
    content: str
    image_url: Optional[str] = None
    hashtags: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    is_business_post: bool = False
    created_at: datetime
    author: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# Comment schemas
class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    parent_comment_id: Optional[int] = None
    created_at: datetime
    author: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# Command schemas
class CommandCreate(BaseModel):
    command_name: str
    command_data: Dict[str, Any]
    chat_room_id: Optional[int] = None

class CommandResponse(BaseModel):
    id: int
    user_id: int
    chat_room_id: Optional[int] = None
    command_name: str
    command_data: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# WebSocket message schemas
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    chat_room_id: Optional[int] = None
    user_id: Optional[int] = None

# Authentication token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None