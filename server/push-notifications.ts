import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys for web push (these should be environment variables in production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BM8UjB_8gXGqDT6D_hJnm-kKz8S3g5j5bvBq0sZJdF9wQ_wHKYJJSGHJKLJHSDGJHSDGJHSDGJHSDGJHSDGJHSDGJH';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'your-private-key-here';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

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

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      data: {
        url: '/',
        timestamp: Date.now(),
        ...payload.data
      },
      tag: payload.tag || 'message',
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      sound: payload.sound || '/sounds/notification.mp3',
      actions: [
        {
          action: 'open',
          title: '열기'
        },
        {
          action: 'reply',
          title: '답장'
        }
      ]
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
          urgency: 'normal' as const,
          headers: {}
        };

        await webpush.sendNotification(pushSubscription, notificationPayload, options);
        console.log(`Push notification sent successfully to user ${userId} device`);
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
  // Get unread count for badge
  const unreadCount = await storage.getUnreadMessageCount(recipientUserId);
  
  let notificationBody = messageContent;
  
  // Customize notification body based on message type
  switch (messageType) {
    case 'voice':
      notificationBody = '음성 메시지를 보냈습니다';
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
    default:
      // Limit text message length for notification
      if (messageContent.length > 50) {
        notificationBody = messageContent.substring(0, 47) + '...';
      }
      break;
  }

  await sendPushNotification(recipientUserId, {
    title: senderName,
    body: notificationBody,
    data: {
      chatRoomId,
      messageType,
      senderId: recipientUserId
    },
    tag: `chat-${chatRoomId}`,
    requireInteraction: false,
    sound: '/sounds/notification.mp3',
    unreadCount: unreadCount
  });
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}