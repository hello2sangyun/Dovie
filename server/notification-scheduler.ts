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
  
  try {
    // Create a system message in the chat room for the reminder
    const systemMessage = {
      chatRoomId: chatRoomId,
      senderId: userId, // Use the user who set the reminder as sender
      content: `⏰ 리마인더: ${reminderText}`,
      messageType: "text" as const,
      isSystemMessage: true
    };

    // Save the reminder message to the database
    const savedMessage = await storage.createMessage(systemMessage);
    console.log(`💬 Reminder message created: ${savedMessage.id}`);

    // Get chat room participants to broadcast the message
    const chatRoom = await storage.getChatRoom(chatRoomId);
    if (chatRoom && chatRoom.participants) {
      // Broadcast the new reminder message to all participants
      const messageData = {
        type: "new_message",
        message: {
          ...savedMessage,
          sender: { id: userId, displayName: "시스템" }
        },
        chatRoomId: chatRoomId
      };

      // Send to all participants in the chat room
      chatRoom.participants.forEach((participant: any) => {
        const ws = connections?.get(participant.id);
        if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
          try {
            ws.send(JSON.stringify(messageData));
            console.log(`📱 Reminder message sent to participant ${participant.id}`);
          } catch (error) {
            console.error(`Failed to send reminder message to participant ${participant.id}:`, error);
          }
        }
      });
    }

    // Also send a system notification for immediate attention
    const notificationData = {
      type: "reminder_notification", 
      title: "⏰ 리마인더 알림",
      message: reminderText,
      chatRoomId: chatRoomId,
      timestamp: new Date().toISOString(),
      reminderId: reminder.id
    };

    if (connections && connections.has(userId)) {
      try {
        broadcastToUser(userId, notificationData);
        console.log(`📱 Additional notification sent to user ${userId}`);
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    console.log(`✅ Reminder sent as chat message for chat room ${chatRoomId}: ${reminderText}`);
  } catch (error) {
    console.error(`❌ Failed to send reminder notification:`, error);
    throw error;
  }
}

// Export for external use
export { checkAndSendReminders };