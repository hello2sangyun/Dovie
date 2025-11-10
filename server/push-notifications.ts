import webpush from 'web-push';
import { ApnsClient, Notification } from 'apns2';
import { storage } from './storage';

// APNS Environment Detection
const IS_PRODUCTION = process.env.NODE_ENV !== 'development';
const APNS_SERVER = IS_PRODUCTION ? 'api.push.apple.com' : 'api.development.push.apple.com';

console.log(`\n📱 ========================================`);
console.log(`📱 APNS Push Notification Service`);
console.log(`📱 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`📱 Server: ${APNS_SERVER}`);
console.log(`📱 ========================================\n`);

// APNS Client Setup with apns2 (HTTP/2 + JWT auto-handling)
let apnsClient: ApnsClient | null = null;

function initializeAPNSClient(): ApnsClient | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (!keyId || !teamId || !privateKey) {
    console.warn('⚠️  APNS credentials not configured. iOS push notifications will not work.');
    console.warn('   Please set: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY');
    return null;
  }

  try {
    // Format private key: convert \n escape sequences to actual newlines
    let formattedKey = privateKey
      .replace(/\\n/g, '\n')
      .trim();
    
    // Debug: Log key format
    console.log('🔍 APNS Private Key Debug:');
    console.log(`   Raw length: ${privateKey.length} chars`);
    console.log(`   Has \\n escapes: ${privateKey.includes('\\n')}`);
    console.log(`   First 50 chars: ${privateKey.substring(0, 50)}...`);
    console.log(`   After format length: ${formattedKey.length} chars`);
    console.log(`   After format first 50 chars: ${formattedKey.substring(0, 50)}...`);
    console.log(`   Has PEM header: ${formattedKey.includes('-----BEGIN PRIVATE KEY-----')}`);
    console.log(`   Line count: ${formattedKey.split('\n').length} lines`);
    
    // Validate PEM format
    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ APNS_PRIVATE_KEY missing PEM header. Expected format:');
      console.error('   -----BEGIN PRIVATE KEY-----');
      console.error('   (key content)');
      console.error('   -----END PRIVATE KEY-----');
      return null;
    }

    // Initialize apns2 client with HTTP/2 support
    const client = new ApnsClient({
      team: teamId,
      keyId: keyId,
      signingKey: formattedKey,
      defaultTopic: 'com.dovie.messenger',
      production: IS_PRODUCTION,
      requestTimeout: 10000, // 10 seconds timeout
      keepAlive: true // Reuse HTTP/2 connections for better performance
    });

    console.log(`✅ APNS Client initialized successfully`);
    console.log(`   Team ID: ${teamId}`);
    console.log(`   Key ID: ${keyId}`);
    console.log(`   Production: ${IS_PRODUCTION}`);
    console.log(`   Default Topic: com.dovie.messenger`);
    
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize APNS client:', error);
    return null;
  }
}

// Initialize APNS client on startup
apnsClient = initializeAPNSClient();

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
  badgeCount?: number;  // Explicit iOS badge count
  timestamp?: number;   // Notification timestamp
  renotify?: boolean;   // Re-notify for grouped notifications
}

export async function sendPushNotification(
  userId: number, 
  payload: PushNotificationPayload
): Promise<void> {
  try {
    console.log(`\n📱 ========== PUSH NOTIFICATION START ==========`);
    console.log(`📱 User: ${userId}`);
    console.log(`📱 Title: ${payload.title}`);
    console.log(`📱 Body: ${payload.body}`);
    console.log(`📱 Badge Count (provided): ${payload.badgeCount}`);
    
    // Auto-calculate badge count if not provided (for backward compatibility)
    // This ensures both PWA and iOS receive accurate badge counts
    if (payload.badgeCount === undefined) {
      console.log(`⚠️  Badge count not provided, calculating from unread counts for user ${userId}`);
      const unreadCounts = await storage.getUnreadCounts(userId);
      const totalUnread = unreadCounts.reduce((total, count) => total + count.unreadCount, 0);
      const unreadAiNotices = await storage.getUnreadAiNoticesCount(userId);
      payload.badgeCount = totalUnread + unreadAiNotices;
      console.log(`📊 Auto-calculated badge count: ${payload.badgeCount} (${totalUnread} messages + ${unreadAiNotices} AI notices)`);
    } else {
      console.log(`✅ Badge count explicitly provided: ${payload.badgeCount}`);
    }
    
    const notificationSettings = await storage.getNotificationSettings(userId);
    
    if (notificationSettings?.muteAllNotifications) {
      console.log(`🚫 Skipping push notification for user ${userId}: all notifications muted`);
      return;
    }

    const quietHoursStart = notificationSettings?.quietHoursStart;
    const quietHoursEnd = notificationSettings?.quietHoursEnd;
    if (quietHoursStart && quietHoursEnd) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (quietHoursStart <= quietHoursEnd) {
        if (currentTime >= quietHoursStart && currentTime < quietHoursEnd) {
          console.log(`🚫 Skipping push notification for user ${userId}: quiet hours (${quietHoursStart} - ${quietHoursEnd})`);
          return;
        }
      } else {
        if (currentTime >= quietHoursStart || currentTime < quietHoursEnd) {
          console.log(`🚫 Skipping push notification for user ${userId}: quiet hours (${quietHoursStart} - ${quietHoursEnd})`);
          return;
        }
      }
    }

    // Telegram/WhatsApp-style intelligent filtering: Send silent push to active users
    // This ensures badge updates even when the app is in background
    const userActivity = await storage.getUserActivity(userId);
    let isSilentPush = false;
    
    // CRITICAL FIX: Only check WebSocket connection status, NOT lastSeen time
    // Users in background should receive FULL notifications, not silent
    if (userActivity?.isOnline) {
      // isOnline means WebSocket is connected (app is open AND in foreground)
      console.log(`🔕 User ${userId} currently active/online (WebSocket connected) - sending silent push (badge only)`);
      isSilentPush = true;
    } else {
      console.log(`📱 User ${userId} offline/background - sending FULL notification with alert + sound + badge`);
      isSilentPush = false;
    }

    // Get user's push subscriptions (PWA)
    const subscriptions = await storage.getUserPushSubscriptions(userId);
    
    // Get iOS device tokens (native app)
    let iosTokens: any[] = [];
    try {
      iosTokens = await storage.getIOSDeviceTokens(userId);
      console.log(`📱 Found ${iosTokens.length} iOS device tokens for user ${userId}`);
    } catch (error) {
      console.log(`❌ Failed to get iOS tokens for user ${userId}:`, error);
    }
    
    if (subscriptions.length === 0 && iosTokens.length === 0) {
      console.log(`❌ No push subscriptions or iOS tokens found for user ${userId}`);
      return;
    }

    console.log(`📱 총 알림 대상: PWA ${subscriptions.length}개, iOS ${iosTokens.length}개`);

    // Telegram/WhatsApp-style notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title || "새 메시지",
      body: payload.body || "새 메시지가 도착했습니다",
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: payload.data?.url || '/',
        timestamp: payload.timestamp || Date.now(),
        type: payload.data?.type || 'message',
        chatRoomId: payload.data?.chatRoomId,
        messageId: payload.data?.messageId,
        senderId: payload.data?.senderId,
        senderName: payload.data?.senderName,
        unreadCount: payload.data?.unreadCount ?? 0,  // Use ?? to preserve legitimate 0 values
        badgeCount: payload.badgeCount ?? payload.data?.badgeCount ?? 0,  // For PWA badge API
        // Telegram-style actions
        actions: [
          {
            action: 'reply',
            title: '답장',
            icon: '/icons/reply-icon.png'
          },
          {
            action: 'mark_read',
            title: '읽음',
            icon: '/icons/read-icon.png'
          }
        ],
        ...payload.data
      },
      // WhatsApp/Telegram-style notification settings
      tag: payload.tag || `dovie-chat-${payload.data?.chatRoomId}`,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      vibrate: [200, 100, 200, 100, 200], // Telegram-style vibration pattern
      renotify: payload.renotify || true,
      // Telegram-style notification grouping and persistence
      persistent: true,
      sticky: false,
      dir: 'auto',
      lang: 'ko-KR',
      // WhatsApp-style priority and urgency
      urgency: 'high'
    });

    // Send notifications to all user devices with Telegram/WhatsApp optimizations
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        // Telegram/WhatsApp-style delivery options
        const headers: Record<string, string> = {
          'Topic': 'dovie-messenger',
          // iOS optimizations (like WhatsApp iOS)
          'apns-priority': '10',
          'apns-push-type': 'alert',
          'apns-topic': 'com.dovie.messenger',
          // Android optimizations (like Telegram Android)
          'FCM-Priority': 'high'
        };
        
        // Add optional headers only if they exist
        if (payload.tag) {
          headers['apns-collapse-id'] = payload.tag; // Group notifications like WhatsApp
          headers['FCM-Collapse-Key'] = payload.tag;
        }
        
        const options = {
          TTL: 60 * 60 * 24 * 7, // 7 days (like Telegram)
          urgency: 'high' as const,
          headers
        };

        console.log(`📱 Sending Telegram-style notification to user ${userId}:`, {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          title: payload.title,
          body: payload.body,
          tag: payload.tag
        });

        const result = await webpush.sendNotification(pushSubscription, notificationPayload, options);
        console.log(`📱 Notification delivered successfully to user ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to user ${userId}:`, error);
        
        // Clean up invalid subscriptions (like WhatsApp/Telegram)
        if (error instanceof Error && (
          error.message.includes('410') || 
          error.message.includes('invalid') ||
          error.message.includes('expired') ||
          error.message.includes('unsubscribed')
        )) {
          await storage.deletePushSubscription(userId, subscription.endpoint);
          console.log(`🧹 Removed invalid subscription for user ${userId}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // iOS APNS 푸시 알림 발송
    if (iosTokens.length > 0) {
      if (isSilentPush) {
        console.log(`📱 iOS APNS Silent Push 발송 시작: ${iosTokens.length}개 디바이스 (배지만 업데이트)`);
      } else {
        console.log(`📱 iOS APNS 알림 발송 시작: ${iosTokens.length}개 디바이스`);
      }
      await sendIOSPushNotifications(iosTokens, payload, userId, isSilentPush);
    }

  } catch (error) {
    console.error('❌ Push notification system error:', error);
  }
}

// iOS APNS 푸시 알림 발송 함수 (apns2 라이브러리 사용)
async function sendIOSPushNotifications(
  iosTokens: any[], 
  payload: PushNotificationPayload,
  userId: number,
  isSilent: boolean = false
): Promise<void> {
  // Check if APNS client is initialized
  if (!apnsClient) {
    console.warn('⚠️ APNS client not initialized. Skipping iOS push notifications.');
    return;
  }

  const sendPromises = iosTokens.map(async (tokenInfo) => {
    try {
      // Drizzle ORM은 camelCase로 변환하므로 deviceToken 사용
      const deviceToken = tokenInfo.deviceToken;
      
      // 디바이스 토큰 검증
      if (!deviceToken || typeof deviceToken !== 'string') {
        console.warn(`⚠️ Skipping invalid device token for user ${userId}:`, tokenInfo);
        return;
      }
      
      // iOS APNS 페이로드 구성 (올바른 aps 래퍼 구조)
      const customData = {
        type: payload.data?.type || 'message',
        chatRoomId: payload.data?.chatRoomId,
        messageId: payload.data?.messageId,
        senderId: payload.data?.senderId,
        senderName: payload.data?.senderName,
        url: payload.data?.url || '/',
        // Image/media attachment URL for rich notifications
        ...(payload.data?.imageUrl && { imageUrl: payload.data.imageUrl }),
        ...(payload.data?.videoUrl && { videoUrl: payload.data.videoUrl }),
        ...(payload.data?.audioUrl && { audioUrl: payload.data.audioUrl })
      };

      let notification: Notification;

      if (isSilent) {
        // Silent badge update: badge only, no alert/sound
        // contentAvailable: true → apns2 auto-sets pushType='background' HTTP/2 header
        notification = new Notification(deviceToken, {
          badge: payload.badgeCount ?? 0,
          contentAvailable: true,
          threadId: `chat-${payload.data?.chatRoomId || 'default'}`,
          payload: customData,
          priority: 5 // Power efficient
        });
        
        console.log(`🔕 iOS APNS Silent Push 발송 (배지만): ${deviceToken.substring(0, 20)}...`);
        console.log(`   Badge: ${payload.badgeCount}`);
        console.log(`   Push Type: background (auto-set by apns2)`);
      } else {
        // Normal notification: alert, badge, sound, rich media
        // alert present → apns2 auto-sets pushType='alert' HTTP/2 header
        notification = new Notification(deviceToken, {
          alert: {
            title: payload.title || "새 메시지",
            body: payload.body || "새 메시지가 도착했습니다",
            // Optional subtitle for additional context
            ...(payload.data?.subtitle && { subtitle: payload.data.subtitle })
          },
          badge: payload.badgeCount ?? 0,
          sound: payload.sound || "default",
          mutableContent: true, // Enable rich notifications (images, videos, audio)
          contentAvailable: true, // Enable background updates
          category: "MESSAGE_CATEGORY", // Action buttons (reply, mark read)
          threadId: `chat-${payload.data?.chatRoomId || 'default'}`,
          payload: customData,
          priority: 10 // Immediate delivery
        });
        
        console.log(`📱 iOS APNS 알림 발송: ${deviceToken.substring(0, 20)}...`);
        console.log(`   Title: ${payload.title}`);
        console.log(`   Body: ${payload.body}`);
        console.log(`   Badge: ${payload.badgeCount}`);
        console.log(`   Push Type: alert (auto-set by apns2)`);
      }

      // Set expiry (1 hour from now)
      notification.expiry = Math.floor(Date.now() / 1000) + 3600;

      console.log(`📱 Full APNS Notification:`, JSON.stringify(notification, null, 2));

      // Send notification via apns2 (HTTP/2 + JWT auto-handled)
      const result = await apnsClient.send(notification);
      
      console.log(`✅ iOS 푸시 알림 성공: user ${userId}, token: ${deviceToken.substring(0, 20)}...`);
      console.log(`   APNS Response:`, result);

    } catch (error: any) {
      const tokenPreview = tokenInfo.deviceToken 
        ? tokenInfo.deviceToken.substring(0, 20) + '...' 
        : 'unknown';
      
      console.error(`❌ iOS 토큰 ${tokenPreview} 발송 실패 (user ${userId}):`, error);
      
      // Handle token expiration (410 status)
      if (error.statusCode === 410 || error.reason === 'Unregistered' || error.reason === 'BadDeviceToken') {
        console.log(`🧹 iOS 토큰 만료됨, 삭제: user ${userId}`);
        await storage.deleteIOSDeviceToken(userId, tokenInfo.deviceToken);
      }
    }
  });

  // Send all notifications in parallel
  await Promise.allSettled(sendPromises);
}

export async function sendMessageNotification(
  recipientUserId: number,
  senderName: string,
  messageContent: string,
  chatRoomId: number,
  messageType: string = 'text',
  mediaUrl?: string  // Optional: Image, video, or audio URL for rich notifications
): Promise<void> {
  try {
    // Get total unread count across all chat rooms AND AI notices for app badge
    // Note: The new message being sent will be marked as unread by storage layer,
    // so we don't need to add +1 here (it would cause double-counting)
    const unreadCounts = await storage.getUnreadCounts(recipientUserId);
    const currentTotalUnread = unreadCounts.reduce((total, count) => total + count.unreadCount, 0);
    
    // Get AI notices count
    const unreadAiNotices = await storage.getUnreadAiNoticesCount(recipientUserId);
    
    // Calculate total badge count: messages + AI notices (no +1 to avoid double-counting)
    const totalBadgeCount = currentTotalUnread + unreadAiNotices;
    
    console.log(`📊 Badge count for user ${recipientUserId}:`);
    console.log(`   - Total unread messages: ${currentTotalUnread}`);
    console.log(`   - Unread AI notices: ${unreadAiNotices}`);
    console.log(`   - TOTAL BADGE: ${totalBadgeCount}`);
    console.log(`📊 Unread counts breakdown:`, unreadCounts.map(c => `Chat ${c.chatRoomId}: ${c.unreadCount}`).join(', '));
    
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

    // Prepare data payload with media URL for rich notifications
    const notificationData: any = {
      chatRoomId,
      messageType,
      senderId: recipientUserId,
      url: `/?chat=${chatRoomId}`,
      unreadCount: totalBadgeCount,  // For PWA clients
      badgeCount: totalBadgeCount    // For APNS badge (read from payload.data?.badgeCount)
    };

    // Add media URL based on message type for APNS rich notifications
    if (mediaUrl) {
      switch (messageType) {
        case 'image':
          notificationData.imageUrl = mediaUrl;
          console.log(`📸 Including image URL in notification: ${mediaUrl.substring(0, 50)}...`);
          break;
        case 'video':
          notificationData.videoUrl = mediaUrl;
          console.log(`🎥 Including video URL in notification: ${mediaUrl.substring(0, 50)}...`);
          break;
        case 'voice':
          notificationData.audioUrl = mediaUrl;
          console.log(`🎤 Including audio URL in notification: ${mediaUrl.substring(0, 50)}...`);
          break;
      }
    }

    await sendPushNotification(recipientUserId, {
      title: senderName,
      body: notificationBody,
      data: notificationData,
      tag: `dovie-chat-${chatRoomId}`,
      requireInteraction: false,
      silent: false,
      sound: '/notification-sound.mp3',
      badgeCount: totalBadgeCount  // Badge count for iOS APNS
    });
  } catch (error) {
    console.error(`Failed to send message notification to user ${recipientUserId}:`, error);
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}