"""
WebSocket connection management for real-time messaging
"""

import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, ChatParticipant
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections: user_id -> websocket
        self.active_connections: Dict[int, WebSocket] = {}
        # Store user's chat rooms for targeted messaging
        self.user_chat_rooms: Dict[int, Set[int]] = {}
        # Store chat room participants for broadcast
        self.chat_room_participants: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, db: Session):
        """Connect a user's websocket"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Load user's chat rooms
        user_chat_rooms = db.query(ChatParticipant).filter(
            ChatParticipant.user_id == user_id
        ).all()
        
        self.user_chat_rooms[user_id] = {cp.chat_room_id for cp in user_chat_rooms}
        
        # Update chat room participants mapping
        for chat_room_id in self.user_chat_rooms[user_id]:
            if chat_room_id not in self.chat_room_participants:
                self.chat_room_participants[chat_room_id] = set()
            self.chat_room_participants[chat_room_id].add(user_id)
        
        # Update user online status
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_online = True
            db.commit()
        
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Notify other users in chat rooms that this user is online
        await self.broadcast_user_status(user_id, "online", db)

    def disconnect(self, user_id: int, db: Session):
        """Disconnect a user's websocket"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Remove from chat room participants
        if user_id in self.user_chat_rooms:
            for chat_room_id in self.user_chat_rooms[user_id]:
                if chat_room_id in self.chat_room_participants:
                    self.chat_room_participants[chat_room_id].discard(user_id)
            del self.user_chat_rooms[user_id]
        
        # Update user online status
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_online = False
            user.last_seen = func.now()
            db.commit()
        
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                # Remove broken connection
                if user_id in self.active_connections:
                    del self.active_connections[user_id]

    async def broadcast_to_chat_room(self, message: dict, chat_room_id: int, exclude_user_id: int = None):
        """Broadcast a message to all participants in a chat room"""
        if chat_room_id not in self.chat_room_participants:
            return
        
        participants = self.chat_room_participants[chat_room_id].copy()
        if exclude_user_id:
            participants.discard(exclude_user_id)
        
        # Send to all online participants
        for user_id in participants:
            await self.send_personal_message(message, user_id)

    async def broadcast_user_status(self, user_id: int, status: str, db: Session):
        """Broadcast user online/offline status to relevant chat rooms"""
        if user_id not in self.user_chat_rooms:
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        status_message = {
            "type": "user_status",
            "data": {
                "user_id": user_id,
                "status": status,
                "display_name": user.display_name,
                "last_seen": user.last_seen.isoformat() if user.last_seen else None
            }
        }
        
        # Send to all chat rooms where this user participates
        for chat_room_id in self.user_chat_rooms[user_id]:
            await self.broadcast_to_chat_room(status_message, chat_room_id, exclude_user_id=user_id)

    async def send_typing_indicator(self, user_id: int, chat_room_id: int, is_typing: bool):
        """Send typing indicator to chat room participants"""
        if user_id not in self.active_connections:
            return
        
        user = self.active_connections[user_id]
        typing_message = {
            "type": "typing",
            "data": {
                "user_id": user_id,
                "chat_room_id": chat_room_id,
                "is_typing": is_typing
            }
        }
        
        await self.broadcast_to_chat_room(typing_message, chat_room_id, exclude_user_id=user_id)

    async def send_message_delivered(self, message_id: int, chat_room_id: int, sender_id: int):
        """Send message delivered confirmation"""
        delivery_message = {
            "type": "message_delivered",
            "data": {
                "message_id": message_id,
                "chat_room_id": chat_room_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_personal_message(delivery_message, sender_id)

    async def send_new_message(self, message_data: dict, chat_room_id: int, exclude_user_id: int = None):
        """Send new message to chat room participants"""
        new_message = {
            "type": "new_message",
            "data": message_data
        }
        
        await self.broadcast_to_chat_room(new_message, chat_room_id, exclude_user_id)

    def get_online_users_in_room(self, chat_room_id: int) -> List[int]:
        """Get list of online users in a chat room"""
        if chat_room_id not in self.chat_room_participants:
            return []
        
        online_users = []
        for user_id in self.chat_room_participants[chat_room_id]:
            if user_id in self.active_connections:
                online_users.append(user_id)
        
        return online_users

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections

# Global connection manager instance
manager = ConnectionManager()