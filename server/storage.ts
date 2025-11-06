import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads, phoneVerifications,
  fileUploads, fileDownloads, businessProfiles, userPosts, locationShareRequests, locationShares, reminders,
  messageReactions, messageLikes, pushSubscriptions, iosDeviceTokens, aiNotices, bookmarks, voiceBookmarkRequests,
  userChatSettings, notificationSettings, verificationCodes,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead,
  type PhoneVerification, type InsertPhoneVerification,
  type FileUpload, type InsertFileUpload, type FileDownload, type InsertFileDownload,
  type BusinessProfile, type InsertBusinessProfile,
  type UserPost, type InsertUserPost,
  type LocationShareRequest, type InsertLocationShareRequest,
  type LocationShare, type InsertLocationShare,
  type Reminder, type InsertReminder,
  type MessageReaction, type InsertMessageReaction,
  type AiNotice, type InsertAiNotice,
  type Bookmark, type InsertBookmark,
  type VoiceBookmarkRequest, type InsertVoiceBookmarkRequest,
  type UserChatSettings, type InsertUserChatSettings,
  type NotificationSettings, type InsertNotificationSettings,
  type VerificationCode, type InsertVerificationCode
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, count, gt, lt, sql, inArray } from "drizzle-orm";
import { encryptText, decryptText } from "./crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  getUserByProviderId(authProvider: string, providerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  // Contact operations
  getContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactUserId: number): Promise<void>;
  updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  updateContactPin(userId: number, contactUserId: number, isPinned: boolean): Promise<void>;
  blockContact(userId: number, contactUserId: number): Promise<void>;
  unblockContact(userId: number, contactUserId: number): Promise<void>;
  getBlockedContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;

  // Chat room operations
  getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]>;
  getChatRoomById(chatRoomId: number): Promise<(ChatRoom & { participants: User[] }) | undefined>;
  createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom>;
  deleteChatRoom(chatRoomId: number, userId: number): Promise<void>;
  updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined>;
  leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void>;
  updateChatRoomName(chatRoomId: number, userId: number, name: string): Promise<ChatRoom | undefined>;
  updateChatRoomProfileImage(chatRoomId: number, userId: number, profileImage: string): Promise<ChatRoom | undefined>;
  getChatRoomParticipants(chatRoomId: number): Promise<User[]>;
  inviteToChatRoom(chatRoomId: number, userId: number, inviteeIds: number[]): Promise<void>;
  
  // User Chat Settings operations
  getUserChatSettings(userId: number, chatRoomId: number): Promise<UserChatSettings | undefined>;
  upsertUserChatSettings(data: InsertUserChatSettings): Promise<UserChatSettings>;
  toggleChatMute(userId: number, chatRoomId: number, isMuted: boolean): Promise<UserChatSettings>;
  toggleChatPin(userId: number, chatRoomId: number, isPinned: boolean): Promise<UserChatSettings>;

  // Message operations
  getMessages(chatRoomId: number, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined>;
  updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined>;

  // Command operations
  getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User })[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  saveCommand(command: InsertCommand): Promise<Command>;
  deleteCommand(commandId: number, userId: number): Promise<void>;
  getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined>;
  searchCommands(userId: number, searchTerm: string): Promise<(Command & { originalSender?: User })[]>;
  getCommandsByIds(userId: number, commandIds: number[]): Promise<Command[]>;
  deleteCommands(userId: number, commandIds: number[]): Promise<void>;

  // Message read tracking
  markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void>;
  getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]>;

  // Phone verification operations
  createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification>;
  getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined>;
  markPhoneVerificationAsUsed(id: number): Promise<void>;
  cleanupExpiredVerifications(): Promise<void>;

  // Business user operations
  registerBusinessUser(userId: number, businessData: { businessName: string; businessAddress: string }): Promise<User | undefined>;

  // File storage analytics operations
  getStorageAnalytics(userId: number, timeRange: string): Promise<any>;
  trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string; description?: string | null }): Promise<void>;
  trackFileUploadWithMessage(fileData: { userId: number; chatRoomId: number; messageId: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string; description?: string | null }): Promise<void>;
  trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void>;
  getFileUploadsByChatRoom(chatRoomId: number): Promise<Array<FileUpload & { uploader: User }>>;
  getAllFileUploads(userId: number): Promise<Array<FileUpload & { uploader: User }>>;
  
  // Business profile operations
  getBusinessProfile(userId: number): Promise<BusinessProfile | undefined>;
  createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile>;
  
  // User posts operations
  getUserPosts(userId: number): Promise<UserPost[]>;
  createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost>;
  
  // Voice settings operations
  updateVoiceSettings(userId: number, settings: { allowVoicePlayback?: boolean; autoPlayVoiceMessages?: boolean }): Promise<User | undefined>;

  // Location sharing operations
  createLocationShareRequest(request: InsertLocationShareRequest): Promise<LocationShareRequest>;
  getLocationShareRequest(requestId: number): Promise<LocationShareRequest | undefined>;
  updateLocationShareRequest(requestId: number, updates: Partial<InsertLocationShareRequest>): Promise<LocationShareRequest | undefined>;
  createLocationShare(share: InsertLocationShare): Promise<LocationShare>;
  getLocationSharesForChatRoom(chatRoomId: number): Promise<LocationShare[]>;
  detectLocationRequest(message: string): boolean;

  // Reminder operations
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getUserReminders(userId: number): Promise<Reminder[]>;
  getChatRoomReminders(userId: number, chatRoomId: number): Promise<Reminder[]>;
  updateReminder(reminderId: number, userId: number, updates: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(reminderId: number, userId: number): Promise<void>;
  getPendingReminders(): Promise<Reminder[]>;

  // AI Notice operations
  createAiNotice(notice: InsertAiNotice): Promise<AiNotice>;
  getUserAiNotices(userId: number): Promise<AiNotice[]>;
  getChatRoomAiNotices(userId: number, chatRoomId: number): Promise<AiNotice[]>;
  markAiNoticeAsRead(noticeId: number, userId: number): Promise<void>;
  getUnreadAiNoticesCount(userId: number): Promise<number>;
  deleteAiNotice(noticeId: number, userId: number): Promise<void>;
  deleteAllAiNotices(userId: number): Promise<void>;
  snoozeAiNotice(noticeId: number, userId: number, snoozedUntil: Date): Promise<void>;
  searchAiNotices(userId: number, searchTerm: string): Promise<AiNotice[]>;
  checkUnansweredMessages(userId: number, hoursThreshold?: number): Promise<Array<{ chatRoomId: number; lastMessage: Message & { sender: User }; timeSinceMessage: number }>>;
  createUnansweredMessageNotices(userId: number): Promise<void>;

  // Message reaction operations
  addMessageReaction(messageId: number, userId: number, emoji: string, emojiName: string): Promise<void>;
  removeMessageReaction(messageId: number, userId: number, emoji: string): Promise<void>;
  getMessageReactions(messageId: number): Promise<Array<{ emoji: string; emojiName: string; count: number; userReacted: boolean; userId?: number }>>;
  getMessageReactionSuggestions(messageId: number): Promise<Array<{ emoji: string; name: string; confidence: number }>>;

  // Push notification operations
  upsertPushSubscription(userId: number, subscription: { endpoint: string; p256dh: string; auth: string; userAgent: string }): Promise<void>;
  deletePushSubscription(userId: number, endpoint: string): Promise<void>;
  getUserPushSubscriptions(userId: number): Promise<{ endpoint: string, p256dh: string, auth: string, userAgent: string }[]>;

  // iOS Native Push Notification operations
  saveIOSDeviceToken(userId: number, deviceToken: string, platform: string): Promise<void>;
  hasIOSDeviceToken(userId: number): Promise<boolean>;
  removeIOSDeviceToken(userId: number): Promise<void>;
  getIOSDeviceTokens(userId: number): Promise<{ deviceToken: string, platform: string }[]>;
  getIOSDeviceTokensCount(): Promise<number>;
  deleteIOSDeviceToken(userId: number, deviceToken: string): Promise<void>;

  // Notification Settings operations
  getNotificationSettings(userId: number): Promise<NotificationSettings | undefined>;
  upsertNotificationSettings(userId: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;

  // QR Code System
  generateQRToken(userId: number): Promise<string>;
  getUserByQRToken(token: string): Promise<any>;
  addContactByQRToken(userId: number, token: string): Promise<{ success: boolean; contact?: any; message: string }>;

  // User activity tracking for Telegram/WhatsApp-style notifications
  updateUserActivity(userId: number, activity: { lastSeen?: Date; isOnline?: boolean }): Promise<void>;
  getUserActivity(userId: number): Promise<{ lastSeen: Date | null; isOnline: boolean } | null>;
  getActiveUsers(chatRoomId: number): Promise<number[]>;

  // Bookmark operations
  createBookmark(data: InsertBookmark): Promise<Bookmark>;
  getBookmarksByUser(userId: number): Promise<Bookmark[]>;
  getBookmarkById(id: number): Promise<Bookmark | undefined>;
  deleteBookmark(id: number): Promise<void>;
  checkBookmarkExists(userId: number, messageId: number): Promise<boolean>;

  // Voice Bookmark Request operations
  createVoiceBookmarkRequest(data: InsertVoiceBookmarkRequest): Promise<VoiceBookmarkRequest>;
  getVoiceBookmarkRequestsByUser(userId: number): Promise<VoiceBookmarkRequest[]>;
  getPendingVoiceBookmarkRequestsForUser(targetUserId: number): Promise<VoiceBookmarkRequest[]>;
  updateVoiceBookmarkRequestStatus(id: number, status: string): Promise<void>;
  getVoiceBookmarkRequestById(id: number): Promise<VoiceBookmarkRequest | undefined>;

  // Verification Code operations
  createVerificationCode(data: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(phoneNumber: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeAsUsed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // 대소문자 구분 없이 검색 (기존 사용자 호환성 유지)
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async getUserByProviderId(authProvider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.authProvider, authProvider),
        eq(users.providerId, providerId)
      )
    );
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ profilePicture }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const results = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.isBlocked, false)
      ));

    return results.map(row => ({
      ...row.contacts,
      contactUser: row.users
    }));
  }

  async addContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async removeContact(userId: number, contactUserId: number): Promise<void> {
    await db.delete(contacts).where(
      and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      )
    );
  }

  async updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set(updates)
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.contactUserId, contactUserId)
        )
      )
      .returning();
    return contact;
  }

  async blockContact(userId: number, contactUserId: number): Promise<void> {
    await this.updateContact(userId, contactUserId, { isBlocked: true });
  }

  async unblockContact(userId: number, contactUserId: number): Promise<void> {
    await this.updateContact(userId, contactUserId, { isBlocked: false });
  }

  async updateContactPin(userId: number, contactUserId: number, isPinned: boolean): Promise<void> {
    await this.updateContact(userId, contactUserId, { isPinned });
  }

  async getBlockedContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const results = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.isBlocked, true)
        )
      );

    return results.map(row => ({
      ...row.contacts,
      contactUser: row.users
    }));
  }

  async getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]> {
    // Get chat rooms where user is a participant
    const participantResults = await db
      .select({
        chatRoom: chatRooms,
        participants: users
      })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatParticipants.chatRoomId, chatRooms.id))
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatRooms.id, 
        db.select({ id: chatParticipants.chatRoomId })
          .from(chatParticipants)
          .where(eq(chatParticipants.userId, userId))
      ))
      .orderBy(desc(chatRooms.updatedAt));

    // Group participants by chat room
    const roomMap = new Map<number, ChatRoom & { participants: User[] }>();
    
    participantResults.forEach(row => {
      const roomId = row.chatRoom.id;
      if (!roomMap.has(roomId)) {
        roomMap.set(roomId, {
          ...row.chatRoom,
          participants: []
        });
      }
      roomMap.get(roomId)!.participants.push(row.participants);
    });

    const chatRoomsList = Array.from(roomMap.values());
    const chatRoomIds = chatRoomsList.map(room => room.id);

    if (chatRoomIds.length === 0) {
      return [];
    }

    // Get last message for each chat room
    const lastMessages = await db
      .select({
        messages: messages,
        users: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(inArray(messages.chatRoomId, chatRoomIds))
      .orderBy(messages.chatRoomId, desc(messages.createdAt));

    // Group by chat room and get the latest message for each
    const lastMessageByRoom = new Map<number, any>();
    for (const message of lastMessages) {
      if (!lastMessageByRoom.has(message.messages.chatRoomId)) {
        lastMessageByRoom.set(message.messages.chatRoomId, {
          ...message.messages,
          content: (message.messages.content && message.messages.content.trim()) ? decryptText(message.messages.content) : null,
          sender: message.users
        });
      }
    }

    // Combine chat rooms with their last messages and handle 1:1 chat display
    return chatRoomsList.map(room => {
      // For 1:1 chats (exactly 2 participants), use opponent's info
      if (room.participants.length === 2) {
        const opponent = room.participants.find(p => p.id !== userId);
        if (opponent) {
          return {
            ...room,
            name: opponent.displayName,
            profileImage: opponent.profilePicture,
            lastMessage: lastMessageByRoom.get(room.id)
          };
        }
      }
      
      // For group chats or other cases, return as is
      return {
        ...room,
        lastMessage: lastMessageByRoom.get(room.id)
      };
    });
  }

  async getChatRoomById(chatRoomId: number): Promise<(ChatRoom & { participants: User[] }) | undefined> {
    const participantResults = await db
      .select({
        chatRoom: chatRooms,
        participants: users
      })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatParticipants.chatRoomId, chatRooms.id))
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(eq(chatRooms.id, chatRoomId));

    if (participantResults.length === 0) {
      return undefined;
    }

    const chatRoom = participantResults[0].chatRoom;
    const participants = participantResults.map(row => row.participants);

    return {
      ...chatRoom,
      participants
    };
  }

  async createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom> {
    const [newChatRoom] = await db.insert(chatRooms).values(chatRoom).returning();
    
    // Add participants
    const participantValues = participantIds.map(userId => ({
      chatRoomId: newChatRoom.id,
      userId
    }));
    
    await db.insert(chatParticipants).values(participantValues);
    
    return newChatRoom;
  }

  async deleteChatRoom(chatRoomId: number, userId: number): Promise<void> {
    // Only allow deletion if user is the creator
    const [chatRoom] = await db.select().from(chatRooms).where(eq(chatRooms.id, chatRoomId));
    
    if (!chatRoom || chatRoom.createdBy !== userId) {
      throw new Error("Unauthorized to delete this chat room");
    }

    // Delete participants first (foreign key constraint)
    await db.delete(chatParticipants).where(eq(chatParticipants.chatRoomId, chatRoomId));
    
    // Delete the chat room
    await db.delete(chatRooms).where(eq(chatRooms.id, chatRoomId));
  }

  async updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const [chatRoom] = await db
      .update(chatRooms)
      .set(updates)
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return chatRoom;
  }

  async leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void> {
    // Remove user from participants
    await db.delete(chatParticipants).where(
      and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      )
    );

    // If not saving files, handle file cleanup here if needed
    if (!saveFiles) {
      // File cleanup logic would go here
    }
  }

  async updateChatRoomName(chatRoomId: number, userId: number, name: string): Promise<ChatRoom | undefined> {
    // Verify user is a participant
    const participant = await db.select().from(chatParticipants).where(
      and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      )
    );
    
    if (participant.length === 0) {
      throw new Error("Unauthorized: Not a participant");
    }

    const [chatRoom] = await db
      .update(chatRooms)
      .set({ name, updatedAt: new Date() })
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return chatRoom;
  }

  async updateChatRoomProfileImage(chatRoomId: number, userId: number, profileImage: string): Promise<ChatRoom | undefined> {
    // Verify user is a participant
    const participant = await db.select().from(chatParticipants).where(
      and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      )
    );
    
    if (participant.length === 0) {
      throw new Error("Unauthorized: Not a participant");
    }

    const [chatRoom] = await db
      .update(chatRooms)
      .set({ profileImage, updatedAt: new Date() })
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return chatRoom;
  }

  async getChatRoomParticipants(chatRoomId: number): Promise<User[]> {
    const rows = await db
      .select({ user: users })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(eq(chatParticipants.chatRoomId, chatRoomId));
    
    return rows.map(row => row.user);
  }

  async inviteToChatRoom(chatRoomId: number, userId: number, inviteeIds: number[]): Promise<void> {
    // Verify user is a participant
    const participant = await db.select().from(chatParticipants).where(
      and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      )
    );
    
    if (participant.length === 0) {
      throw new Error("Unauthorized: Not a participant");
    }

    // Add new participants
    const participantValues = inviteeIds.map(inviteeId => ({
      chatRoomId,
      userId: inviteeId
    }));
    
    if (participantValues.length > 0) {
      await db.insert(chatParticipants).values(participantValues).onConflictDoNothing();
    }
  }

  async getUserChatSettings(userId: number, chatRoomId: number): Promise<UserChatSettings | undefined> {
    const [settings] = await db.select().from(userChatSettings).where(
      and(
        eq(userChatSettings.userId, userId),
        eq(userChatSettings.chatRoomId, chatRoomId)
      )
    );
    return settings;
  }

  async upsertUserChatSettings(data: InsertUserChatSettings): Promise<UserChatSettings> {
    const [settings] = await db
      .insert(userChatSettings)
      .values(data)
      .onConflictDoUpdate({
        target: [userChatSettings.userId, userChatSettings.chatRoomId],
        set: { 
          isMuted: data.isMuted,
          isPinned: data.isPinned,
          updatedAt: new Date()
        }
      })
      .returning();
    return settings;
  }

  async toggleChatMute(userId: number, chatRoomId: number, isMuted: boolean): Promise<UserChatSettings> {
    return this.upsertUserChatSettings({ userId, chatRoomId, isMuted });
  }

  async toggleChatPin(userId: number, chatRoomId: number, isPinned: boolean): Promise<UserChatSettings> {
    return this.upsertUserChatSettings({ userId, chatRoomId, isPinned });
  }

  async getMessages(chatRoomId: number, limit: number = 50): Promise<(Message & { sender: User, reactions?: any[] })[]> {
    const rows = await db
      .select({
        messages: messages,
        users: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    const messageList = rows.map(row => ({
      ...row.messages,
      content: (row.messages.content && row.messages.content.trim()) ? decryptText(row.messages.content) : null,
      sender: row.users
    })).reverse();

    // Get message IDs for fetching reactions
    const messageIds = messageList.map(msg => msg.id);

    if (messageIds.length === 0) {
      return messageList;
    }

    // Fetch all reactions for these messages
    const reactionsData = await db
      .select()
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, messageIds));

    // Group reactions by message ID
    const reactionsByMessage = new Map<number, any[]>();
    reactionsData.forEach(reaction => {
      if (!reactionsByMessage.has(reaction.messageId)) {
        reactionsByMessage.set(reaction.messageId, []);
      }
      reactionsByMessage.get(reaction.messageId)!.push(reaction);
    });

    // Attach reactions to each message
    return messageList.map(msg => ({
      ...msg,
      reactions: reactionsByMessage.get(msg.id) || []
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      // Encrypt message content
      const encryptedMessage = {
        ...message,
        content: message.content && typeof message.content === 'string' ? encryptText(message.content) : null
      };
      
      const [newMessage] = await db
        .insert(messages)
        .values(encryptedMessage)
        .returning();

      // Update chat room timestamp  
      if (message.chatRoomId) {
        await db
          .update(chatRooms)
          .set({ updatedAt: new Date() })
          .where(eq(chatRooms.id, message.chatRoomId));
      }
      
      // Return decrypted message
      return {
        ...newMessage,
        content: newMessage.content ? decryptText(newMessage.content) : null
      } as Message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined> {
    const [result] = await db
      .select({
        messages: messages,
        users: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId));

    if (!result) {
      return undefined;
    }

    return {
      ...result.messages,
      content: (result.messages.content && result.messages.content.trim()) ? decryptText(result.messages.content) : null,
      sender: result.users
    } as Message & { sender: User };
  }

  async updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User, chatRoomName?: string, chatRoomParticipants?: string })[]> {
    let query = db
      .select({
        commands: commands,
        users: users,
        chatRoom: chatRooms,
      })
      .from(commands)
      .leftJoin(users, eq(commands.originalSenderId, users.id))
      .leftJoin(chatRooms, eq(commands.chatRoomId, chatRooms.id))
      .where(eq(commands.userId, userId));

    if (chatRoomId) {
      query = query.where(eq(commands.chatRoomId, chatRoomId));
    }

    const results = await query.orderBy(desc(commands.createdAt));

    // Get participants for each chat room
    const enrichedResults = await Promise.all(results.map(async (row) => {
      let chatRoomParticipants = '';
      
      if (row.commands.chatRoomId) {
        // Get participants for this chat room
        const participants = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName
          })
          .from(chatParticipants)
          .innerJoin(users, eq(chatParticipants.userId, users.id))
          .where(eq(chatParticipants.chatRoomId, row.commands.chatRoomId));
        
        // Format participants as "displayName (username)"
        chatRoomParticipants = participants
          .filter(p => p.id !== userId) // Exclude current user
          .map(p => `${p.displayName} (${p.username})`)
          .join(', ');
      }
      
      return {
        ...row.commands,
        originalSender: row.users || undefined,
        chatRoomName: row.chatRoom?.name || `채팅방 ${row.commands.chatRoomId}`,
        chatRoomParticipants
      };
    }));

    return enrichedResults;
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const [newCommand] = await db.insert(commands).values(command).returning();
    return newCommand;
  }

  async saveCommand(command: InsertCommand): Promise<Command> {
    const [newCommand] = await db.insert(commands).values(command).returning();
    return newCommand;
  }

  async deleteCommand(commandId: number, userId: number): Promise<void> {
    await db.delete(commands).where(
      and(
        eq(commands.id, commandId),
        eq(commands.userId, userId)
      )
    );
  }

  async getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined> {
    const [command] = await db
      .select()
      .from(commands)
      .where(
        and(
          eq(commands.userId, userId),
          eq(commands.chatRoomId, chatRoomId),
          eq(commands.commandName, commandName)
        )
      );
    return command;
  }

  async searchCommands(userId: number, searchTerm: string): Promise<(Command & { originalSender?: User })[]> {
    const results = await db
      .select({
        commands: commands,
        users: users
      })
      .from(commands)
      .leftJoin(users, eq(commands.originalSenderId, users.id))
      .where(
        and(
          eq(commands.userId, userId),
          or(
            like(commands.commandName, `%${searchTerm}%`),
            like(commands.savedText, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(desc(commands.createdAt));

    return results.map(row => ({
      ...row.commands,
      originalSender: row.users || undefined
    }));
  }

  async getCommandsByIds(userId: number, commandIds: number[]): Promise<Command[]> {
    const results = await db
      .select()
      .from(commands)
      .where(
        and(
          eq(commands.userId, userId),
          inArray(commands.id, commandIds)
        )
      );
    return results;
  }

  async deleteCommands(userId: number, commandIds: number[]): Promise<void> {
    await db
      .delete(commands)
      .where(
        and(
          eq(commands.userId, userId),
          inArray(commands.id, commandIds)
        )
      );
  }

  async markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void> {
    await db
      .insert(messageReads)
      .values({
        userId,
        chatRoomId,
        lastReadMessageId: lastMessageId,
        lastReadAt: new Date()
      })
      .onConflictDoUpdate({
        target: [messageReads.userId, messageReads.chatRoomId],
        set: {
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date()
        }
      });
  }

  async getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]> {
    try {
      // 사용자가 참여한 모든 채팅방 가져오기
      const userChatRooms = await db
        .select({ chatRoomId: chatParticipants.chatRoomId })
        .from(chatParticipants)
        .where(eq(chatParticipants.userId, userId));

      const unreadCounts = [];

      for (const room of userChatRooms) {
        // 해당 채팅방에서 마지막으로 읽은 메시지 ID 가져오기
        const [lastRead] = await db
          .select({ lastReadMessageId: messageReads.lastReadMessageId })
          .from(messageReads)
          .where(
            and(
              eq(messageReads.userId, userId),
              eq(messageReads.chatRoomId, room.chatRoomId)
            )
          );

        let unreadCount = 0;

        if (!lastRead?.lastReadMessageId) {
          // 읽은 기록이 없으면 자신이 보내지 않은 모든 메시지가 안읽음
          const [totalMessages] = await db
            .select({ count: count(messages.id) })
            .from(messages)
            .where(
              and(
                eq(messages.chatRoomId, room.chatRoomId),
                sql`${messages.senderId} != ${userId}` // 자신이 보낸 메시지 제외
              )
            );
          
          unreadCount = totalMessages.count;
        } else {
          // 마지막 읽은 메시지 이후의 자신이 보내지 않은 메시지 수 계산
          const [newMessages] = await db
            .select({ count: count(messages.id) })
            .from(messages)
            .where(
              and(
                eq(messages.chatRoomId, room.chatRoomId),
                gt(messages.id, lastRead.lastReadMessageId),
                sql`${messages.senderId} != ${userId}` // 자신이 보낸 메시지 제외
              )
            );
          
          unreadCount = newMessages.count;
        }

        if (unreadCount > 0) {
          unreadCounts.push({
            chatRoomId: room.chatRoomId,
            unreadCount
          });
        }
      }

      return unreadCounts;
    } catch (error) {
      console.error('Error getting unread counts:', error);
      return [];
    }
  }

  async createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification> {
    const [newVerification] = await db.insert(phoneVerifications).values(verification).returning();
    return newVerification;
  }

  async getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined> {
    const [verification] = await db
      .select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.phoneNumber, phoneNumber),
          eq(phoneVerifications.verificationCode, verificationCode),
          eq(phoneVerifications.isVerified, false),
          gt(phoneVerifications.expiresAt, new Date())
        )
      );
    return verification;
  }

  async markPhoneVerificationAsUsed(id: number): Promise<void> {
    await db
      .update(phoneVerifications)
      .set({ isVerified: true })
      .where(eq(phoneVerifications.id, id));
  }

  async cleanupExpiredVerifications(): Promise<void> {
    await db
      .delete(phoneVerifications)
      .where(lt(phoneVerifications.expiresAt, new Date()));
  }

  async registerBusinessUser(userId: number, businessData: { businessName: string; businessAddress: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        userRole: "business",
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Stub implementations for required interface methods
  async getStorageAnalytics(userId: number, timeRange: string): Promise<any> {
    return { totalSize: 0, typeBreakdown: {}, chatRoomBreakdown: [], recentDownloads: [] };
  }

  async trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string; description?: string | null }): Promise<void> {
    await db.insert(fileUploads).values({
      userId: fileData.userId,
      chatRoomId: fileData.chatRoomId || null,
      fileName: fileData.fileName,
      originalName: fileData.originalName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
      filePath: fileData.filePath,
      description: fileData.description || null
    });
  }

  async trackFileUploadWithMessage(fileData: { userId: number; chatRoomId: number; messageId: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string; description?: string | null }): Promise<void> {
    // Check if file upload already exists for this message
    const existingUpload = await db.select()
      .from(fileUploads)
      .where(and(
        eq(fileUploads.chatRoomId, fileData.chatRoomId),
        eq(fileUploads.fileName, fileData.fileName)
      ))
      .limit(1);

    if (existingUpload.length === 0) {
      await db.insert(fileUploads).values({
        userId: fileData.userId,
        chatRoomId: fileData.chatRoomId,
        fileName: fileData.fileName,
        originalName: fileData.originalName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
        filePath: fileData.filePath,
        description: fileData.description || null
      });
    }
  }

  async trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    // Stub implementation for tracking downloads
  }

  async getFileUploadsByChatRoom(chatRoomId: number): Promise<Array<FileUpload & { uploader: User }>> {
    const uploads = await db.select({
      id: fileUploads.id,
      userId: fileUploads.userId,
      chatRoomId: fileUploads.chatRoomId,
      fileName: fileUploads.fileName,
      originalName: fileUploads.originalName,
      fileSize: fileUploads.fileSize,
      fileType: fileUploads.fileType,
      filePath: fileUploads.filePath,
      description: fileUploads.description,
      uploadedAt: fileUploads.uploadedAt,
      isDeleted: fileUploads.isDeleted,
      uploader: users
    })
    .from(fileUploads)
    .leftJoin(users, eq(fileUploads.userId, users.id))
    .where(and(
      eq(fileUploads.chatRoomId, chatRoomId),
      eq(fileUploads.isDeleted, false)
    ))
    .orderBy(desc(fileUploads.uploadedAt));

    return uploads.map(upload => ({
      ...upload,
      uploader: upload.uploader as User
    })) as Array<FileUpload & { uploader: User }>;
  }

  async getAllFileUploads(userId: number): Promise<Array<FileUpload & { uploader: User }>> {
    // Get all chat rooms where the user is a participant
    const userChatRooms = await db
      .select({ chatRoomId: chatParticipants.chatRoomId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    const chatRoomIds = userChatRooms.map(r => r.chatRoomId);

    if (chatRoomIds.length === 0) {
      return [];
    }

    // Get all file uploads from user's chat rooms
    const uploads = await db.select({
      id: fileUploads.id,
      userId: fileUploads.userId,
      chatRoomId: fileUploads.chatRoomId,
      fileName: fileUploads.fileName,
      originalName: fileUploads.originalName,
      fileSize: fileUploads.fileSize,
      fileType: fileUploads.fileType,
      filePath: fileUploads.filePath,
      description: fileUploads.description,
      uploadedAt: fileUploads.uploadedAt,
      isDeleted: fileUploads.isDeleted,
      uploader: users
    })
    .from(fileUploads)
    .leftJoin(users, eq(fileUploads.userId, users.id))
    .where(and(
      inArray(fileUploads.chatRoomId, chatRoomIds),
      eq(fileUploads.isDeleted, false)
    ))
    .orderBy(desc(fileUploads.uploadedAt));

    return uploads.map(upload => ({
      ...upload,
      uploader: upload.uploader as User
    })) as Array<FileUpload & { uploader: User }>;
  }

  async getBusinessProfile(userId: number): Promise<BusinessProfile | undefined> {
    const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId));
    return profile;
  }

  async createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile> {
    const [profile] = await db
      .insert(businessProfiles)
      .values({ userId, ...profileData })
      .onConflictDoUpdate({
        target: businessProfiles.userId,
        set: profileData
      })
      .returning();
    return profile;
  }

  async getUserPosts(userId: number): Promise<UserPost[]> {
    return await db.select().from(userPosts).where(eq(userPosts.userId, userId));
  }

  async createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost> {
    const [post] = await db.insert(userPosts).values({ userId, ...postData }).returning();
    return post;
  }

  async updateVoiceSettings(userId: number, settings: { allowVoicePlayback?: boolean; autoPlayVoiceMessages?: boolean }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createLocationShareRequest(request: InsertLocationShareRequest): Promise<LocationShareRequest> {
    const [newRequest] = await db.insert(locationShareRequests).values(request).returning();
    return newRequest;
  }

  async getLocationShareRequest(requestId: number): Promise<LocationShareRequest | undefined> {
    const [request] = await db.select().from(locationShareRequests).where(eq(locationShareRequests.id, requestId));
    return request;
  }

  async updateLocationShareRequest(requestId: number, updates: Partial<InsertLocationShareRequest>): Promise<LocationShareRequest | undefined> {
    const [request] = await db
      .update(locationShareRequests)
      .set(updates)
      .where(eq(locationShareRequests.id, requestId))
      .returning();
    return request;
  }

  async createLocationShare(share: InsertLocationShare): Promise<LocationShare> {
    const [newShare] = await db.insert(locationShares).values(share).returning();
    return newShare;
  }

  async getLocationSharesForChatRoom(chatRoomId: number): Promise<LocationShare[]> {
    return await db.select().from(locationShares).where(eq(locationShares.chatRoomId, chatRoomId));
  }

  detectLocationRequest(message: string): boolean {
    const locationKeywords = ['어디', '위치', '주소', '장소', 'where', 'location', 'address'];
    return locationKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  // Reminder operations implementation
  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values(reminder).returning();
    return newReminder;
  }

  async getUserReminders(userId: number): Promise<Reminder[]> {
    return await db.select().from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.isCompleted, false)))
      .orderBy(asc(reminders.reminderTime));
  }

  async getChatRoomReminders(userId: number, chatRoomId: number): Promise<Reminder[]> {
    return await db.select().from(reminders)
      .where(and(
        eq(reminders.userId, userId),
        eq(reminders.chatRoomId, chatRoomId),
        eq(reminders.isCompleted, false)
      ))
      .orderBy(asc(reminders.reminderTime));
  }

  async updateReminder(reminderId: number, userId: number, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updatedReminder] = await db
      .update(reminders)
      .set(updates)
      .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)))
      .returning();
    return updatedReminder;
  }

  async deleteReminder(reminderId: number, userId: number): Promise<void> {
    await db.delete(reminders)
      .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date();
    return await db.select().from(reminders)
      .where(and(
        eq(reminders.isCompleted, false),
        lt(reminders.reminderTime, now)
      ))
      .orderBy(asc(reminders.reminderTime));
  }

  // AI Notice operations implementation
  async createAiNotice(notice: InsertAiNotice): Promise<AiNotice> {
    const [newNotice] = await db.insert(aiNotices).values(notice).returning();
    return newNotice;
  }

  async getUserAiNotices(userId: number): Promise<AiNotice[]> {
    const results = await db
      .select({
        id: aiNotices.id,
        chatRoomId: aiNotices.chatRoomId,
        messageId: aiNotices.messageId,
        userId: aiNotices.userId,
        noticeType: aiNotices.noticeType,
        content: aiNotices.content,
        metadata: aiNotices.metadata,
        isRead: aiNotices.isRead,
        createdAt: aiNotices.createdAt,
        priority: aiNotices.priority,
        snoozedUntil: aiNotices.snoozedUntil,
        senderName: users.displayName,
        senderUsername: users.username,
        senderId: messages.senderId,
        senderProfilePicture: users.profilePicture,
        originalMessage: messages.content,
        messageType: messages.messageType,
      })
      .from(aiNotices)
      .leftJoin(messages, eq(aiNotices.messageId, messages.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(aiNotices.userId, userId))
      .orderBy(desc(aiNotices.createdAt));
    
    // Decrypt original messages
    return results.map(result => ({
      ...result,
      originalMessage: result.originalMessage ? decryptText(result.originalMessage) : null
    })) as any;
  }

  async getChatRoomAiNotices(userId: number, chatRoomId: number): Promise<AiNotice[]> {
    return await db.select().from(aiNotices)
      .where(and(
        eq(aiNotices.userId, userId),
        eq(aiNotices.chatRoomId, chatRoomId)
      ))
      .orderBy(desc(aiNotices.createdAt));
  }

  async markAiNoticeAsRead(noticeId: number, userId: number): Promise<void> {
    await db.update(aiNotices)
      .set({ isRead: true })
      .where(and(
        eq(aiNotices.id, noticeId),
        eq(aiNotices.userId, userId)
      ));
  }

  async getUnreadAiNoticesCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(aiNotices)
      .where(and(
        eq(aiNotices.userId, userId),
        eq(aiNotices.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async deleteAiNotice(noticeId: number, userId: number): Promise<void> {
    await db.delete(aiNotices)
      .where(and(
        eq(aiNotices.id, noticeId),
        eq(aiNotices.userId, userId)
      ));
  }

  async deleteAllAiNotices(userId: number): Promise<void> {
    await db.delete(aiNotices)
      .where(eq(aiNotices.userId, userId));
  }

  async snoozeAiNotice(noticeId: number, userId: number, snoozedUntil: Date): Promise<void> {
    await db.update(aiNotices)
      .set({ snoozedUntil })
      .where(and(
        eq(aiNotices.id, noticeId),
        eq(aiNotices.userId, userId)
      ));
  }

  async searchAiNotices(userId: number, searchTerm: string): Promise<AiNotice[]> {
    const results = await db
      .select({
        id: aiNotices.id,
        chatRoomId: aiNotices.chatRoomId,
        messageId: aiNotices.messageId,
        userId: aiNotices.userId,
        noticeType: aiNotices.noticeType,
        content: aiNotices.content,
        metadata: aiNotices.metadata,
        isRead: aiNotices.isRead,
        createdAt: aiNotices.createdAt,
        priority: aiNotices.priority,
        snoozedUntil: aiNotices.snoozedUntil,
        senderName: users.displayName,
        senderUsername: users.username,
        senderId: messages.senderId,
        senderProfilePicture: users.profilePicture,
        originalMessage: messages.content,
        messageType: messages.messageType,
      })
      .from(aiNotices)
      .leftJoin(messages, eq(aiNotices.messageId, messages.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(aiNotices.userId, userId),
        or(
          like(aiNotices.content, `%${searchTerm}%`),
          like(aiNotices.noticeType, `%${searchTerm}%`)
        )
      ))
      .orderBy(desc(aiNotices.createdAt));
    
    // Decrypt original messages
    return results.map(result => ({
      ...result,
      originalMessage: result.originalMessage ? decryptText(result.originalMessage) : null
    })) as any;
  }

  async checkUnansweredMessages(userId: number, hoursThreshold: number = 1): Promise<Array<{ chatRoomId: number; lastMessage: Message & { sender: User }; timeSinceMessage: number }>> {
    // Get all chat rooms where user is a participant
    const userChatRooms = await db.select({ chatRoomId: chatParticipants.chatRoomId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    const chatRoomIds = userChatRooms.map(cr => cr.chatRoomId);
    if (chatRoomIds.length === 0) return [];

    const unanswered: Array<{ chatRoomId: number; lastMessage: Message & { sender: User }; timeSinceMessage: number }> = [];

    for (const chatRoomId of chatRoomIds) {
      // Get last message in this chat room
      const [lastMessage] = await db.select()
        .from(messages)
        .where(eq(messages.chatRoomId, chatRoomId))
        .orderBy(desc(messages.createdAt))
        .limit(1)
        .leftJoin(users, eq(messages.senderId, users.id));

      if (!lastMessage || !lastMessage.messages) continue;

      const msg = lastMessage.messages;
      const sender = lastMessage.users;

      // Skip if last message is from current user
      if (msg.senderId === userId) continue;

      // Calculate time since message
      const timeSinceMessage = (Date.now() - new Date(msg.createdAt!).getTime()) / (1000 * 60 * 60); // hours

      // Skip if not enough time has passed
      if (timeSinceMessage < hoursThreshold) continue;

      // Check if user has sent any message after this one
      const [userResponseCount] = await db.select({ count: count() })
        .from(messages)
        .where(and(
          eq(messages.chatRoomId, chatRoomId),
          eq(messages.senderId, userId),
          gt(messages.createdAt, msg.createdAt!)
        ));

      // If user hasn't responded, add to unanswered list
      if (userResponseCount.count === 0) {
        unanswered.push({
          chatRoomId,
          lastMessage: { ...msg, sender: sender! },
          timeSinceMessage
        });
      }
    }

    return unanswered;
  }

  async createUnansweredMessageNotices(userId: number): Promise<void> {
    const unanswered = await this.checkUnansweredMessages(userId, 1); // 1 hour threshold

    for (const { chatRoomId, lastMessage } of unanswered) {
      // Check if notice already exists for this message
      const existing = await db.select()
        .from(aiNotices)
        .where(and(
          eq(aiNotices.userId, userId),
          eq(aiNotices.messageId, lastMessage.id),
          eq(aiNotices.noticeType, 'unanswered_message')
        ))
        .limit(1);

      if (existing.length > 0) continue; // Already created notice for this message

      // Get chat room info
      const chatRoom = await this.getChatRoomById(chatRoomId);
      if (!chatRoom) continue;

      const senderName = lastMessage.sender.displayName || lastMessage.sender.username;

      // Create notice
      await this.createAiNotice({
        chatRoomId,
        messageId: lastMessage.id,
        userId,
        noticeType: 'unanswered_message',
        content: `${senderName}에게 답변 잊지마 💬`,
        metadata: {
          senderName,
          chatRoomName: chatRoom.name,
          messagePreview: lastMessage.content?.substring(0, 50) || ''
        },
        priority: 'medium',
        isRead: false
      });
    }
  }

  // Message reaction operations
  async addMessageReaction(messageId: number, userId: number, emoji: string, emojiName: string): Promise<void> {
    try {
      await db.insert(messageReactions).values({
        messageId,
        userId,
        emoji,
        emojiName
      });
    } catch (error) {
      // Handle duplicate reaction by updating instead
      await db.delete(messageReactions)
        .where(and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        ));
      
      await db.insert(messageReactions).values({
        messageId,
        userId,
        emoji,
        emojiName
      });
    }
  }

  async removeMessageReaction(messageId: number, userId: number, emoji: string): Promise<void> {
    await db.delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      ));
  }

  async getMessageReactions(messageId: number): Promise<Array<{ emoji: string; emojiName: string; count: number; userReacted: boolean; userId?: number }>> {
    const reactions = await db.select().from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    // Group reactions by emoji
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          emojiName: reaction.emojiName,
          count: 0,
          userReacted: false,
          users: []
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.userId);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  async getMessageReactionSuggestions(messageId: number): Promise<Array<{ emoji: string; name: string; confidence: number }>> {
    // Get the message content to analyze
    const message = await this.getMessageById(messageId);
    if (!message) {
      return [];
    }

    // Import the OpenAI analysis function
    const { analyzeMessageForEmojiSuggestions } = await import('./openai');
    
    const result = await analyzeMessageForEmojiSuggestions(
      message.content || '',
      message.messageType || 'text'
    );

    return result.suggestions;
  }

  // Push notification operations
  async upsertPushSubscription(userId: number, subscription: { endpoint: string; p256dh: string; auth: string; userAgent: string }): Promise<void> {
    // First delete any existing subscriptions for this endpoint to prevent duplicates
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, subscription.endpoint)));

    // Then insert the new subscription
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: subscription.userAgent
    });

    console.log(`Push subscription upserted for user ${userId}, endpoint: ${subscription.endpoint.substring(0, 50)}...`);
  }

  async deletePushSubscription(userId: number, endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  async getUserPushSubscriptions(userId: number): Promise<{ endpoint: string, p256dh: string, auth: string, userAgent: string }[]> {
    return await db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
        userAgent: pushSubscriptions.userAgent
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(messages)
      .innerJoin(chatParticipants, eq(messages.chatRoomId, chatParticipants.chatRoomId))
      .leftJoin(messageReads, and(
        eq(messageReads.userId, userId),
        eq(messageReads.chatRoomId, messages.chatRoomId)
      ))
      .where(
        and(
          eq(chatParticipants.userId, userId),
          // Exclude messages sent by the user themselves
          sql`${messages.senderId} != ${userId}`,
          sql`${messages.createdAt} > COALESCE(${messageReads.lastReadAt}, '1970-01-01')`
        )
      );
      
    return result[0]?.count || 0;
  }

  // QR Code System Implementation
  async generateQRToken(userId: number): Promise<string> {
    // 보안 토큰 생성 (24시간 유효)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후 만료
    
    await db.update(users)
      .set({ 
        qrToken: token,
        qrTokenExpiry: expiry
      })
      .where(eq(users.id, userId));
    
    return token;
  }

  async getUserByQRToken(token: string): Promise<any> {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.qrToken, token),
        gt(users.qrTokenExpiry, new Date()) // 만료되지 않은 토큰만
      ),
      columns: {
        id: true,
        username: true,
        displayName: true,
        profilePicture: true,
        email: true,
        phoneNumber: true
      }
    });
    
    return user || null;
  }

  async addContactByQRToken(userId: number, token: string): Promise<{ success: boolean; contact?: any; message: string }> {
    try {
      // 토큰으로 사용자 찾기
      const targetUser = await this.getUserByQRToken(token);
      if (!targetUser) {
        return { success: false, message: "유효하지 않거나 만료된 QR 코드입니다." };
      }

      // 본인 추가 방지
      if (targetUser.id === userId) {
        return { success: false, message: "본인을 연락처에 추가할 수 없습니다." };
      }

      // 이미 연락처에 있는지 확인
      const existingContact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.userId, userId),
          eq(contacts.contactUserId, targetUser.id)
        )
      });

      if (existingContact) {
        return { success: false, message: "이미 연락처에 등록된 사용자입니다." };
      }

      // 연락처 추가
      await db.insert(contacts).values({
        userId: userId,
        contactUserId: targetUser.id,
        isPinned: false,
        isBlocked: false,
        createdAt: new Date()
      });

      return { 
        success: true, 
        contact: targetUser,
        message: `${targetUser.displayName}님이 연락처에 추가되었습니다.`
      };
    } catch (error) {
      console.error('QR 연락처 추가 오류:', error);
      return { success: false, message: "연락처 추가 중 오류가 발생했습니다." };
    }
  }

  // User activity tracking implementation for Telegram/WhatsApp-style notifications
  async updateUserActivity(userId: number, activity: { lastSeen?: Date; isOnline?: boolean }): Promise<void> {
    const updates: any = {};
    
    if (activity.lastSeen !== undefined) {
      updates.lastSeen = activity.lastSeen;
    }
    
    if (activity.isOnline !== undefined) {
      updates.isOnline = activity.isOnline;
    }
    
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  async getUserActivity(userId: number): Promise<{ lastSeen: Date | null; isOnline: boolean } | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        lastSeen: true,
        isOnline: true
      }
    });
    
    if (!user) return null;
    
    return {
      lastSeen: user.lastSeen,
      isOnline: user.isOnline || false
    };
  }

  async getActiveUsers(chatRoomId: number): Promise<number[]> {
    // Get participants who were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const activeParticipants = await db
      .select({ userId: chatParticipants.userId })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(
        and(
          eq(chatParticipants.chatRoomId, chatRoomId),
          or(
            eq(users.isOnline, true),
            gt(users.lastSeen, fiveMinutesAgo)
          )
        )
      );
    
    return activeParticipants.map(p => p.userId);
  }

  // iOS Native Push Notification operations implementation
  async saveIOSDeviceToken(userId: number, deviceToken: string, platform: string): Promise<void> {
    try {
      await db.insert(iosDeviceTokens).values({
        userId,
        deviceToken,
        platform,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: [iosDeviceTokens.userId, iosDeviceTokens.deviceToken],
        set: {
          isActive: true,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('iOS 디바이스 토큰 저장 오류:', error);
      throw error;
    }
  }

  async hasIOSDeviceToken(userId: number): Promise<boolean> {
    try {
      const token = await db.query.iosDeviceTokens.findFirst({
        where: and(
          eq(iosDeviceTokens.userId, userId),
          eq(iosDeviceTokens.isActive, true)
        )
      });
      return !!token;
    } catch (error) {
      console.error('iOS 디바이스 토큰 확인 오류:', error);
      return false;
    }
  }

  async removeIOSDeviceToken(userId: number): Promise<void> {
    try {
      await db.update(iosDeviceTokens)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(iosDeviceTokens.userId, userId));
    } catch (error) {
      console.error('iOS 디바이스 토큰 제거 오류:', error);
      throw error;
    }
  }

  async getIOSDeviceTokensCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(iosDeviceTokens)
        .where(eq(iosDeviceTokens.isActive, true));
      return result?.count || 0;
    } catch (error) {
      console.error('iOS 디바이스 토큰 카운트 조회 오류:', error);
      return 0;
    }
  }

  async getIOSDeviceTokens(userId: number): Promise<{ deviceToken: string, platform: string }[]> {
    try {
      console.log(`📱 iOS 토큰 조회 시작: userId=${userId}`);
      
      const tokens = await db.select({
        deviceToken: iosDeviceTokens.deviceToken,
        platform: iosDeviceTokens.platform
      })
      .from(iosDeviceTokens)
      .where(and(
        eq(iosDeviceTokens.userId, userId),
        eq(iosDeviceTokens.isActive, true)
      ));
      
      console.log(`📱 조회된 iOS 토큰 수: ${tokens.length}`);
      if (tokens.length > 0) {
        console.log(`📱 첫 번째 토큰: ${tokens[0].deviceToken.substring(0, 20)}...`);
      }
      
      return tokens;
    } catch (error) {
      console.error('iOS 디바이스 토큰 조회 오류:', error);
      return [];
    }
  }

  async deleteIOSDeviceToken(userId: number, deviceToken: string): Promise<void> {
    try {
      await db.delete(iosDeviceTokens)
        .where(and(
          eq(iosDeviceTokens.userId, userId),
          eq(iosDeviceTokens.deviceToken, deviceToken)
        ));
      console.log(`📱 iOS 토큰 삭제 완료: user ${userId}`);
    } catch (error) {
      console.error('iOS 디바이스 토큰 삭제 오류:', error);
      throw error;
    }
  }

  async getNotificationSettings(userId: number): Promise<NotificationSettings | undefined> {
    try {
      const settings = await db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, userId)
      });
      
      if (!settings) {
        const defaultSettings = await this.upsertNotificationSettings(userId, {});
        return defaultSettings;
      }
      
      return settings;
    } catch (error) {
      console.error('알림 설정 조회 오류:', error);
      return undefined;
    }
  }

  async upsertNotificationSettings(userId: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    try {
      const existing = await db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, userId)
      });
      
      if (existing) {
        const [updated] = await db.update(notificationSettings)
          .set({ ...settings, updatedAt: new Date() })
          .where(eq(notificationSettings.userId, userId))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(notificationSettings)
          .values({ userId, ...settings })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('알림 설정 저장 오류:', error);
      throw error;
    }
  }

  // Bookmark operations implementation
  async createBookmark(data: InsertBookmark): Promise<Bookmark> {
    try {
      const [bookmark] = await db.insert(bookmarks).values(data).returning();
      return bookmark;
    } catch (error) {
      console.error('북마크 생성 오류:', error);
      throw error;
    }
  }

  async getBookmarksByUser(userId: number): Promise<Bookmark[]> {
    try {
      const userBookmarks = await db.select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt));
      return userBookmarks;
    } catch (error) {
      console.error('북마크 조회 오류:', error);
      throw error;
    }
  }

  async getBookmarkById(id: number): Promise<Bookmark | undefined> {
    try {
      const [bookmark] = await db.select()
        .from(bookmarks)
        .where(eq(bookmarks.id, id));
      return bookmark;
    } catch (error) {
      console.error('북마크 조회 오류:', error);
      throw error;
    }
  }

  async deleteBookmark(id: number): Promise<void> {
    try {
      await db.delete(bookmarks).where(eq(bookmarks.id, id));
    } catch (error) {
      console.error('북마크 삭제 오류:', error);
      throw error;
    }
  }

  async checkBookmarkExists(userId: number, messageId: number): Promise<boolean> {
    try {
      const [bookmark] = await db.select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.messageId, messageId)
          )
        );
      return !!bookmark;
    } catch (error) {
      console.error('북마크 존재 확인 오류:', error);
      return false;
    }
  }

  // Voice Bookmark Request operations implementation
  async createVoiceBookmarkRequest(data: InsertVoiceBookmarkRequest): Promise<VoiceBookmarkRequest> {
    try {
      const [request] = await db.insert(voiceBookmarkRequests).values(data).returning();
      return request;
    } catch (error) {
      console.error('음성 북마크 요청 생성 오류:', error);
      throw error;
    }
  }

  async getVoiceBookmarkRequestsByUser(userId: number): Promise<VoiceBookmarkRequest[]> {
    try {
      const requests = await db.select()
        .from(voiceBookmarkRequests)
        .where(eq(voiceBookmarkRequests.requesterId, userId))
        .orderBy(desc(voiceBookmarkRequests.createdAt));
      return requests;
    } catch (error) {
      console.error('음성 북마크 요청 조회 오류:', error);
      throw error;
    }
  }

  async getPendingVoiceBookmarkRequestsForUser(targetUserId: number): Promise<VoiceBookmarkRequest[]> {
    try {
      const requests = await db.select()
        .from(voiceBookmarkRequests)
        .where(
          and(
            eq(voiceBookmarkRequests.targetUserId, targetUserId),
            eq(voiceBookmarkRequests.status, 'pending')
          )
        )
        .orderBy(desc(voiceBookmarkRequests.createdAt));
      return requests;
    } catch (error) {
      console.error('대기 중인 음성 북마크 요청 조회 오류:', error);
      throw error;
    }
  }

  async updateVoiceBookmarkRequestStatus(id: number, status: string): Promise<void> {
    try {
      await db.update(voiceBookmarkRequests)
        .set({ 
          status,
          respondedAt: new Date()
        })
        .where(eq(voiceBookmarkRequests.id, id));
    } catch (error) {
      console.error('음성 북마크 요청 상태 업데이트 오류:', error);
      throw error;
    }
  }

  async getVoiceBookmarkRequestById(id: number): Promise<VoiceBookmarkRequest | undefined> {
    try {
      const [request] = await db.select()
        .from(voiceBookmarkRequests)
        .where(eq(voiceBookmarkRequests.id, id));
      return request;
    } catch (error) {
      console.error('음성 북마크 요청 조회 오류:', error);
      throw error;
    }
  }

  async createVerificationCode(data: InsertVerificationCode): Promise<VerificationCode> {
    try {
      const [code] = await db.insert(verificationCodes).values(data).returning();
      return code;
    } catch (error) {
      console.error('인증 코드 생성 오류:', error);
      throw error;
    }
  }

  async getVerificationCode(phoneNumber: string, code: string): Promise<VerificationCode | undefined> {
    try {
      const [verification] = await db.select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.phoneNumber, phoneNumber),
            eq(verificationCodes.code, code),
            eq(verificationCodes.isUsed, false),
            gt(verificationCodes.expiresAt, new Date())
          )
        );
      return verification;
    } catch (error) {
      console.error('인증 코드 조회 오류:', error);
      throw error;
    }
  }

  async markVerificationCodeAsUsed(id: number): Promise<void> {
    try {
      await db.update(verificationCodes)
        .set({ isUsed: true })
        .where(eq(verificationCodes.id, id));
    } catch (error) {
      console.error('인증 코드 사용 처리 오류:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();