import { storage } from "./storage";
import type { WebSocket } from "ws";

// Global connection management (imported from routes.ts)
let connections: Map<number, WebSocket>;
let broadcastToUser: (userId: number, data: any) => void;

// Initialize with connections map and broadcast function from routes.ts
export function initializeNotificationScheduler(
  connectionsMap: Map<number, WebSocket>,
  broadcastFunction: (userId: number, data: any) => void
) {
  connections = connectionsMap;
  broadcastToUser = broadcastFunction;
  
  // Start the notification scheduler
  startNotificationScheduler();
  console.log("🔔 Notification scheduler initialized and started");
}

// Check for pending reminders every 30 seconds
function startNotificationScheduler() {
  setInterval(async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      console.error("Notification scheduler error:", error);
    }
  }, 30000); // Check every 30 seconds
}

async function checkAndSendReminders() {
  try {
    // Get all pending reminders (past due time and not completed)
    const pendingReminders = await storage.getPendingReminders();
    
    if (pendingReminders.length === 0) {
      return; // No pending reminders
    }
    
    console.log(`📬 Found ${pendingReminders.length} pending reminder(s) to process`);
    
    for (const reminder of pendingReminders) {
      try {
        // Send notification to user
        await sendReminderNotification(reminder);
        
        // Mark reminder as completed
        await storage.updateReminder(reminder.id, reminder.userId, {
          isCompleted: true
        });
        
        console.log(`✅ Reminder ${reminder.id} sent and marked as completed`);
      } catch (error) {
        console.error(`❌ Failed to process reminder ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error checking pending reminders:", error);
  }
}

async function sendReminderNotification(reminder: any) {
  const { userId, reminderText, chatRoomId } = reminder;
  
  // Format notification message
  const notificationData = {
    type: "reminder_notification",
    title: "⏰ 리마인더 알림",
    message: reminderText,
    chatRoomId: chatRoomId,
    timestamp: new Date().toISOString(),
    reminderId: reminder.id
  };
  
  // Send WebSocket notification if user is online
  if (connections && connections.has(userId)) {
    try {
      broadcastToUser(userId, notificationData);
      console.log(`📱 WebSocket notification sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send WebSocket notification to user ${userId}:`, error);
    }
  }
  
  // Create a system message in the chat room for the reminder
  try {
    const systemMessage = {
      chatRoomId: chatRoomId,
      senderId: userId,
      content: `⏰ 리마인더: ${reminderText}`,
      messageType: "system" as const
    };
    
    const message = await storage.createMessage(systemMessage);
    
    // Broadcast the reminder message to the chat room
    if (connections) {
      // Get all participants in the chat room
      const chatRoom = await storage.getChatRoomById(chatRoomId);
      if (chatRoom) {
        // Broadcast to all participants in the chat room
        for (const [connUserId, socket] of connections.entries()) {
          try {
            // Check if user is participant in this chat room
            const userChatRooms = await storage.getChatRooms(connUserId);
            const isParticipant = userChatRooms.some(room => room.id === chatRoomId);
            
            if (isParticipant && socket.readyState === socket.OPEN) {
              socket.send(JSON.stringify({
                type: "message",
                message: message
              }));
            }
          } catch (broadcastError) {
            console.error(`Failed to broadcast reminder message to user ${connUserId}:`, broadcastError);
          }
        }
      }
    }
    
    console.log(`💬 Reminder system message created in chat room ${chatRoomId}`);
  } catch (error) {
    console.error("Failed to create reminder system message:", error);
  }
}

// Export for external use
export { checkAndSendReminders };