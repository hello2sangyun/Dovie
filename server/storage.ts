import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads, phoneVerifications,
  fileUploads, fileDownloads, businessProfiles, userPosts,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead,
  type PhoneVerification, type InsertPhoneVerification,
  type FileUpload, type InsertFileUpload, type FileDownload, type InsertFileDownload,
  type BusinessProfile, type InsertBusinessProfile,
  type UserPost, type InsertUserPost
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, count, gt, lt, sql, inArray } from "drizzle-orm";
import { encryptText, decryptText } from "./crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Contact operations
  getContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactUserId: number): Promise<void>;
  updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
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

  // Message operations
  getMessages(chatRoomId: number, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined>;
  updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined>;

  // Command operations
  getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User })[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  deleteCommand(commandId: number, userId: number): Promise<void>;

  // Message read tracking
  markMessageAsRead(userId: number, chatRoomId: number, messageId: number): Promise<void>;
  getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]>;

  // Phone verification
  createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification>;
  getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined>;
  markPhoneVerificationAsUsed(id: number): Promise<void>;
  cleanupExpiredVerifications(): Promise<void>;

  // Business operations
  registerBusinessUser(userId: number, businessData: { businessName: string; businessAddress: string }): Promise<User | undefined>;

  // File operations
  getStorageAnalytics(userId: number, timeRange: string): Promise<any>;
  trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void>;
  trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void>;

  // Business profile operations
  getBusinessProfile(userId: number): Promise<BusinessProfile | undefined>;
  createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile>;
  
  // User posts operations
  getUserPosts(userId: number): Promise<UserPost[]>;
  createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const result = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(eq(contacts.userId, userId))
      .orderBy(asc(users.displayName));
    
    return result.map(row => ({
      ...row.contacts,
      contactUser: row.users
    }));
  }

  async addContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async removeContact(userId: number, contactUserId: number): Promise<void> {
    await db
      .delete(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ));
  }

  async updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set(updates)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ))
      .returning();
    return contact || undefined;
  }

  async blockContact(userId: number, contactUserId: number): Promise<void> {
    await db
      .update(contacts)
      .set({ isBlocked: true })
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ));
  }

  async unblockContact(userId: number, contactUserId: number): Promise<void> {
    await db
      .update(contacts)
      .set({ isBlocked: false })
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ));
  }

  async getBlockedContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const result = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.isBlocked, true)
      ))
      .orderBy(asc(users.displayName));
    
    return result.map(row => ({
      ...row.contacts,
      contactUser: row.users
    }));
  }

  async getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]> {
    const userChatRooms = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId
      })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    if (userChatRooms.length === 0) {
      return [];
    }

    const chatRoomIds = userChatRooms.map(room => room.chatRoomId);

    const roomsWithParticipants = await db
      .select()
      .from(chatRooms)
      .leftJoin(chatParticipants, eq(chatRooms.id, chatParticipants.chatRoomId))
      .leftJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatRooms.id, chatRoomIds))
      .orderBy(desc(chatRooms.updatedAt));

    const lastMessages = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(inArray(messages.chatRoomId, chatRoomIds))
      .orderBy(desc(messages.createdAt));

    const chatRoomsMap = new Map<number, ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } }>();

    for (const row of roomsWithParticipants) {
      const chatRoom = row.chat_rooms;
      const participant = row.users;

      if (!chatRoomsMap.has(chatRoom.id)) {
        chatRoomsMap.set(chatRoom.id, {
          ...chatRoom,
          participants: [],
        });
      }

      const existingRoom = chatRoomsMap.get(chatRoom.id)!;
      if (participant && !existingRoom.participants.find(p => p.id === participant.id)) {
        existingRoom.participants.push(participant);
      }
    }

    for (const messageRow of lastMessages) {
      const message = messageRow.messages;
      const sender = messageRow.users;
      const room = chatRoomsMap.get(message.chatRoomId);
      
      if (room && !room.lastMessage) {
        room.lastMessage = {
          ...message,
          sender
        };
      }
    }

    return Array.from(chatRoomsMap.values());
  }

  async getChatRoomById(chatRoomId: number): Promise<(ChatRoom & { participants: User[] }) | undefined> {
    const roomWithParticipants = await db
      .select()
      .from(chatRooms)
      .leftJoin(chatParticipants, eq(chatRooms.id, chatParticipants.chatRoomId))
      .leftJoin(users, eq(chatParticipants.userId, users.id))
      .where(eq(chatRooms.id, chatRoomId));

    if (roomWithParticipants.length === 0) {
      return undefined;
    }

    const chatRoom = roomWithParticipants[0].chat_rooms;
    const participants: User[] = [];

    for (const row of roomWithParticipants) {
      if (row.users && !participants.find(p => p.id === row.users!.id)) {
        participants.push(row.users);
      }
    }

    return {
      ...chatRoom,
      participants
    };
  }

  async createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom> {
    const [newChatRoom] = await db
      .insert(chatRooms)
      .values(chatRoom)
      .returning();

    for (const participantId of participantIds) {
      await db
        .insert(chatParticipants)
        .values({
          chatRoomId: newChatRoom.id,
          userId: participantId
        });
    }

    return newChatRoom;
  }

  async deleteChatRoom(chatRoomId: number, userId: number): Promise<void> {
    const chatRoom = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, chatRoomId));

    if (chatRoom.length === 0 || chatRoom[0].createdBy !== userId) {
      throw new Error("Unauthorized to delete this chat room");
    }

    await db.delete(chatParticipants).where(eq(chatParticipants.chatRoomId, chatRoomId));
    await db.delete(messages).where(eq(messages.chatRoomId, chatRoomId));
    await db.delete(chatRooms).where(eq(chatRooms.id, chatRoomId));
  }

  async updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const [updatedRoom] = await db
      .update(chatRooms)
      .set(updates)
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return updatedRoom || undefined;
  }

  async leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void> {
    await db
      .delete(chatParticipants)
      .where(and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      ));

    if (!saveFiles) {
      await db
        .delete(fileUploads)
        .where(and(
          eq(fileUploads.chatRoomId, chatRoomId),
          eq(fileUploads.userId, userId)
        ));
    }
  }

  async getMessages(chatRoomId: number, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row.messages,
      sender: row.users
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined> {
    const [result] = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId));

    if (!result) return undefined;

    return {
      ...result.messages,
      sender: result.users
    };
  }

  async updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();
    return updatedMessage || undefined;
  }

  async getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User })[]> {
    let whereConditions = [eq(commands.userId, userId)];
    
    if (chatRoomId) {
      whereConditions.push(eq(commands.chatRoomId, chatRoomId));
    }

    const result = await db
      .select()
      .from(commands)
      .leftJoin(users, eq(commands.originalSenderId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(commands.createdAt));

    return result.map(row => ({
      ...row.commands,
      originalSender: row.users || undefined
    }));
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const [newCommand] = await db
      .insert(commands)
      .values(command)
      .returning();
    return newCommand;
  }

  async deleteCommand(commandId: number, userId: number): Promise<void> {
    await db
      .delete(commands)
      .where(and(
        eq(commands.id, commandId),
        eq(commands.userId, userId)
      ));
  }

  async markMessageAsRead(userId: number, chatRoomId: number, messageId: number): Promise<void> {
    await db
      .insert(messageReads)
      .values({
        userId,
        chatRoomId,
        lastReadMessageId: messageId
      })
      .onConflictDoUpdate({
        target: [messageReads.userId, messageReads.chatRoomId],
        set: {
          lastReadMessageId: messageId
        }
      });
  }

  async getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]> {
    const userChatRooms = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId
      })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    if (userChatRooms.length === 0) {
      return [];
    }

    const chatRoomIds = userChatRooms.map(room => room.chatRoomId);
    const unreadCounts: { chatRoomId: number; unreadCount: number }[] = [];

    for (const chatRoomId of chatRoomIds) {
      const [totalMessages] = await db
        .select({ count: count(messages.id) })
        .from(messages)
        .where(eq(messages.chatRoomId, chatRoomId));

      const [lastRead] = await db
        .select({ lastReadMessageId: messageReads.lastReadMessageId })
        .from(messageReads)
        .where(and(
          eq(messageReads.userId, userId),
          eq(messageReads.chatRoomId, chatRoomId)
        ));

      let unreadCount = 0;
      
      if (!lastRead || !lastRead.lastReadMessageId) {
        unreadCount = totalMessages.count;
      } else {
        const [countResult] = await db
          .select({ count: count(messages.id) })
          .from(messages)
          .where(and(
            eq(messages.chatRoomId, chatRoomId),
            gt(messages.id, lastRead.lastReadMessageId)
          ));
        unreadCount = countResult.count;
      }

      if (unreadCount > 0) {
        unreadCounts.push({
          chatRoomId,
          unreadCount,
        });
      }
    }

    return unreadCounts;
  }

  async createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification> {
    const [newVerification] = await db.insert(phoneVerifications).values(verification).returning();
    return newVerification;
  }

  async getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined> {
    const [verification] = await db
      .select()
      .from(phoneVerifications)
      .where(and(
        eq(phoneVerifications.phoneNumber, phoneNumber),
        eq(phoneVerifications.verificationCode, verificationCode),
        eq(phoneVerifications.isVerified, false),
        gt(phoneVerifications.expiresAt, new Date())
      ));
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
    const [updatedUser] = await db
      .update(users)
      .set({
        userRole: "business",
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress,
        isBusinessVerified: false
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async getStorageAnalytics(userId: number, timeRange: string): Promise<any> {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const [uploadStats] = await db
      .select({
        totalFiles: count(fileUploads.id),
        totalSize: sql<number>`COALESCE(SUM(${fileUploads.fileSize}), 0)`
      })
      .from(fileUploads)
      .where(and(
        eq(fileUploads.userId, userId),
        timeCondition
      ));

    return {
      totalFiles: uploadStats.totalFiles || 0,
      totalSize: uploadStats.totalSize || 0
    };
  }

  async trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void> {
    await db.insert(fileUploads).values({
      userId: fileData.userId,
      chatRoomId: fileData.chatRoomId || null,
      fileName: fileData.fileName,
      originalName: fileData.originalName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
      filePath: fileData.filePath
    });
  }

  async trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(fileDownloads).values({
      fileUploadId,
      userId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });
  }

  private getTimeCondition(timeRange: string) {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return sql`${fileUploads.uploadedAt} >= ${startDate}`;
  }

  async getBusinessProfile(userId: number): Promise<BusinessProfile | undefined> {
    const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId));
    return profile || undefined;
  }

  async createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile> {
    const existingProfile = await this.getBusinessProfile(userId);
    
    if (existingProfile) {
      const [updatedProfile] = await db
        .update(businessProfiles)
        .set({ ...profileData, updatedAt: new Date() })
        .where(eq(businessProfiles.userId, userId))
        .returning();
      return updatedProfile;
    } else {
      const [newProfile] = await db
        .insert(businessProfiles)
        .values({ ...profileData, userId })
        .returning();
      return newProfile;
    }
  }

  async getUserPosts(userId: number): Promise<UserPost[]> {
    const posts = await db
      .select()
      .from(userPosts)
      .where(eq(userPosts.userId, userId))
      .orderBy(desc(userPosts.createdAt));
    
    return posts;
  }

  async createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost> {
    const [newPost] = await db
      .insert(userPosts)
      .values({ 
        userId,
        content: postData.content || '',
        title: postData.title,
        postType: postData.postType,
        attachments: postData.attachments,
        visibility: postData.visibility,
        tags: postData.tags,
        isPinned: postData.isPinned
      })
      .returning();
    
    return newPost;
  }
}

export const storage = new DatabaseStorage();