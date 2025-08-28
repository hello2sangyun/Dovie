"""
Push notification service for web push and iOS APNS
"""

import os
import json
import asyncio
from typing import List, Dict, Optional
from pywebpush import webpush, WebPushException
from apns2.client import APNsClient
from apns2.payload import Payload
from apns2.credentials import TokenCredentials
from sqlalchemy.orm import Session
from models import User, PushSubscription, IOSDeviceToken
import logging

logger = logging.getLogger(__name__)

class PushNotificationService:
    def __init__(self):
        # VAPID keys for web push
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_email = os.getenv("VAPID_EMAIL", "mailto:support@dovie-messenger.com")
        
        # iOS APNS configuration
        self.apns_key_id = os.getenv("APNS_KEY_ID")
        self.apns_team_id = os.getenv("APNS_TEAM_ID")
        self.apns_key_path = os.getenv("APNS_KEY_PATH")
        self.apns_bundle_id = os.getenv("APNS_BUNDLE_ID", "com.dovie.messenger")
        
        # Initialize APNS client
        self.apns_client = None
        if self.apns_key_id and self.apns_team_id and self.apns_key_path:
            try:
                credentials = TokenCredentials(
                    auth_key_path=self.apns_key_path,
                    auth_key_id=self.apns_key_id,
                    team_id=self.apns_team_id
                )
                self.apns_client = APNsClient(credentials=credentials, use_sandbox=False)
                logger.info("✅ APNS client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize APNS client: {e}")
        
        # Generate VAPID keys if not provided
        if not self.vapid_private_key or not self.vapid_public_key:
            logger.warning("⚠️ VAPID keys not found, generating new ones...")
            self._generate_vapid_keys()

    def _generate_vapid_keys(self):
        """Generate VAPID keys for web push notifications"""
        try:
            from pywebpush import generate_vapid_keys
            vapid_keys = generate_vapid_keys()
            self.vapid_private_key = vapid_keys['private_key'].decode()
            self.vapid_public_key = vapid_keys['public_key'].decode()
            
            logger.info("🔑 Generated new VAPID keys")
            logger.info(f"📝 Add these to your environment variables:")
            logger.info(f"VAPID_PRIVATE_KEY={self.vapid_private_key}")
            logger.info(f"VAPID_PUBLIC_KEY={self.vapid_public_key}")
        except Exception as e:
            logger.error(f"❌ Failed to generate VAPID keys: {e}")

    def get_vapid_public_key(self) -> str:
        """Get VAPID public key for client subscription"""
        return self.vapid_public_key

    async def send_web_push(
        self,
        subscription: Dict,
        payload: Dict,
        ttl: int = 86400  # 24 hours
    ) -> bool:
        """Send web push notification"""
        try:
            webpush(
                subscription_info=subscription,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": self.vapid_email,
                },
                ttl=ttl
            )
            logger.info(f"📱 Web push sent successfully")
            return True
        except WebPushException as e:
            logger.error(f"❌ Web push failed: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error sending web push: {e}")
            return False

    async def send_ios_push(
        self,
        device_token: str,
        title: str,
        body: str,
        badge: int = None,
        sound: str = "default",
        data: Dict = None
    ) -> bool:
        """Send iOS APNS push notification"""
        if not self.apns_client:
            logger.warning("⚠️ APNS client not configured")
            return False
        
        try:
            payload = Payload(
                alert={
                    "title": title,
                    "body": body
                },
                badge=badge,
                sound=sound,
                custom=data or {}
            )
            
            self.apns_client.send_notification(device_token, payload, self.apns_bundle_id)
            logger.info(f"🍎 iOS push sent successfully to {device_token[:10]}...")
            return True
        except Exception as e:
            logger.error(f"❌ iOS push failed for {device_token[:10]}...: {e}")
            return False

    async def send_notification_to_user(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Dict = None,
        db: Session = None
    ) -> Dict[str, int]:
        """Send notification to all user's devices"""
        if not db:
            return {"web": 0, "ios": 0}
        
        results = {"web": 0, "ios": 0}
        
        # Get user's web push subscriptions
        web_subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).all()
        
        # Send web push notifications
        for subscription in web_subscriptions:
            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            }
            
            payload = {
                "title": title,
                "body": body,
                "icon": "/icon-192x192.png",
                "badge": "/badge-icon.png",
                "data": data or {}
            }
            
            if await self.send_web_push(subscription_info, payload):
                results["web"] += 1
        
        # Get user's iOS device tokens
        ios_tokens = db.query(IOSDeviceToken).filter(
            IOSDeviceToken.user_id == user_id,
            IOSDeviceToken.is_active == True
        ).all()
        
        # Send iOS push notifications
        for token in ios_tokens:
            if await self.send_ios_push(
                device_token=token.device_token,
                title=title,
                body=body,
                data=data
            ):
                results["ios"] += 1
        
        logger.info(f"📊 Sent {results['web']} web push, {results['ios']} iOS push to user {user_id}")
        return results

    async def send_message_notification(
        self,
        recipient_user_id: int,
        sender_name: str,
        message_content: str,
        chat_room_name: str,
        chat_room_id: int,
        db: Session
    ):
        """Send notification for new message"""
        # Check if user has notifications enabled
        user = db.query(User).filter(User.id == recipient_user_id).first()
        if not user or not user.notifications_enabled:
            return
        
        # Truncate long messages
        if len(message_content) > 100:
            message_content = message_content[:97] + "..."
        
        title = f"{sender_name} • {chat_room_name}"
        body = message_content
        
        data = {
            "type": "message",
            "chat_room_id": chat_room_id,
            "sender_name": sender_name,
            "action": "open_chat"
        }
        
        await self.send_notification_to_user(
            user_id=recipient_user_id,
            title=title,
            body=body,
            data=data,
            db=db
        )

    async def send_bulk_notification(
        self,
        user_ids: List[int],
        title: str,
        body: str,
        data: Dict = None,
        db: Session = None
    ):
        """Send notification to multiple users"""
        tasks = []
        for user_id in user_ids:
            task = self.send_notification_to_user(user_id, title, body, data, db)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_web = sum(r.get("web", 0) for r in results if isinstance(r, dict))
        total_ios = sum(r.get("ios", 0) for r in results if isinstance(r, dict))
        
        logger.info(f"📊 Bulk notification sent: {total_web} web push, {total_ios} iOS push")
        return {"web": total_web, "ios": total_ios}

    async def subscribe_web_push(
        self,
        user_id: int,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str,
        db: Session
    ) -> bool:
        """Subscribe user to web push notifications"""
        try:
            # Check if subscription already exists
            existing = db.query(PushSubscription).filter(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint
            ).first()
            
            if existing:
                # Update existing subscription
                existing.p256dh = p256dh
                existing.auth = auth
                existing.user_agent = user_agent
            else:
                # Create new subscription
                subscription = PushSubscription(
                    user_id=user_id,
                    endpoint=endpoint,
                    p256dh=p256dh,
                    auth=auth,
                    user_agent=user_agent
                )
                db.add(subscription)
            
            db.commit()
            logger.info(f"✅ Web push subscription added for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to subscribe user {user_id} to web push: {e}")
            db.rollback()
            return False

    async def subscribe_ios_push(
        self,
        user_id: int,
        device_token: str,
        db: Session
    ) -> bool:
        """Subscribe user to iOS push notifications"""
        try:
            # Check if token already exists
            existing = db.query(IOSDeviceToken).filter(
                IOSDeviceToken.user_id == user_id,
                IOSDeviceToken.device_token == device_token
            ).first()
            
            if existing:
                # Reactivate if inactive
                existing.is_active = True
            else:
                # Create new device token
                token = IOSDeviceToken(
                    user_id=user_id,
                    device_token=device_token,
                    platform="ios",
                    is_active=True
                )
                db.add(token)
            
            db.commit()
            logger.info(f"🍎 iOS push token added for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to subscribe user {user_id} to iOS push: {e}")
            db.rollback()
            return False

# Global push notification service instance
push_service = PushNotificationService()