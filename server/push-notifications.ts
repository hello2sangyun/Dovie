import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys for web push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEJz0sc4kl1Mc2a34ZXfkT3zTCkgJtWE58fpZgpo7Z9tAl3cmbwGP4JCZSrbMdCzvILww-1eMC7ONC-JCo_dFRc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Dq1anJf0nXWXhNT27dI0SEXIsfImRbRnrFeB5WJZvQU';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@dovie.com';

// Configure web-push
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  sound?: string;
  unreadCount?: number;
}

export async function sendPushNotification(
  userId: number, 
  payload: PushNotificationPayload
): Promise<void> {
  try {
    // Get user's push subscriptions
    const subscriptions = await storage.getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Do NOT include badge count in push notification payload
    // Badge will be managed separately by the app based on actual unread messages
    const badgeCount = 0; // Always send 0 to prevent notification system from affecting badge
    
    // iOS 16+ PWA 최적화 알림 페이로드
    const notificationPayload = JSON.stringify({
      title: payload.title || "새 메시지",
      body: payload.body || "새 메시지가 도착했습니다",
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      unreadCount: 0, // Always 0 - badge managed independently by app
      data: {
        url: '/',
        timestamp: Date.now(),
        type: 'message',
        chatRoomId: payload.data?.chatRoomId,
        messageId: payload.data?.messageId,
        ...payload.data
      },
      tag: 'dovie-message-' + Date.now(), // Unique tag for iPhone PWA
      requireInteraction: false, // Critical for iPhone PWA auto-dismiss
      silent: false, // Enable sound on iPhone PWA
      vibrate: [200, 100, 200], // Simplified vibration for iPhone
      renotify: true, // Force new notification on iPhone
      // iPhone PWA specific optimizations
      dir: 'auto',
      lang: 'ko-KR'
    });

    // Send notifications to all user devices
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        const options = {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: 'high' as const, // High priority for iPhone PWA
          headers: {
            'Topic': 'dovie-messenger',
            // iOS PWA 특화 헤더
            'apns-priority': '10', // 최고 우선순위
            'apns-push-type': 'alert',
            'apns-topic': 'com.dovie.messenger'
          }
        };

        console.log(`Sending push notification to user ${userId}:`, {
          endpoint: subscription.endpoint,
          payload: JSON.parse(notificationPayload)
        });

        const result = await webpush.sendNotification(pushSubscription, notificationPayload, options);
        console.log(`Push notification sent successfully to user ${userId}:`, result);
      } catch (error) {
        console.error(`Failed to send push notification to user ${userId}:`, error);
        
        // Remove invalid subscriptions
        if (error instanceof Error && (
          error.message.includes('410') || 
          error.message.includes('invalid') ||
          error.message.includes('expired')
        )) {
          await storage.deletePushSubscription(userId, subscription.endpoint);
          console.log(`Removed invalid push subscription for user ${userId}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

export async function sendMessageNotification(
  recipientUserId: number,
  senderName: string,
  messageContent: string,
  chatRoomId: number,
  messageType: string = 'text'
): Promise<void> {
  try {
    // Get total unread count across all chat rooms for app badge
    const unreadCounts = await storage.getUnreadCounts(recipientUserId);
    const totalUnreadCount = unreadCounts.reduce((total, count) => total + count.unreadCount, 0) + 1;
    
    let notificationBody = messageContent;
    
    // Customize notification body based on message type
    switch (messageType) {
      case 'voice':
        // For voice messages, use the transcribed content if available
        if (messageContent && messageContent.trim() !== '') {
          notificationBody = messageContent.length > 50 
            ? messageContent.substring(0, 47) + '...'
            : messageContent;
        } else {
          notificationBody = '음성 메시지를 보냈습니다';
        }
        break;
      case 'file':
        notificationBody = '파일을 보냈습니다';
        break;
      case 'image':
        notificationBody = '사진을 보냈습니다';
        break;
      case 'video':
        notificationBody = '동영상을 보냈습니다';
        break;
      case 'youtube':
        notificationBody = 'YouTube 동영상을 공유했습니다';
        break;
      default:
        // Limit text message length for notification
        if (messageContent && messageContent.length > 50) {
          notificationBody = messageContent.substring(0, 47) + '...';
        }
        break;
    }

    console.log(`Sending push notification to user ${recipientUserId}: ${senderName} - ${notificationBody}`);

    await sendPushNotification(recipientUserId, {
      title: senderName,
      body: notificationBody,
      data: {
        chatRoomId,
        messageType,
        senderId: recipientUserId,
        url: `/?chat=${chatRoomId}`
      },
      tag: `dovie-chat-${chatRoomId}`,
      requireInteraction: false,
      silent: false,
      sound: '/notification-sound.mp3',
      unreadCount: totalUnreadCount
    });
  } catch (error) {
    console.error(`Failed to send message notification to user ${recipientUserId}:`, error);
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}