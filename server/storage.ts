import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads, phoneVerifications,
  fileUploads, fileDownloads, userPosts,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead,
  type PhoneVerification, type InsertPhoneVerification,
  type FileUpload, type InsertFileUpload, type FileDownload, type InsertFileDownload,
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
  getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined>;
  searchCommands(userId: number, searchTerm: string): Promise<(Command & { originalSender?: User })[]>;

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
  trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void>;
  trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void>;


  
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
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const result = await db.select({
      contacts,
      users
    })
    .from(contacts)
    .innerJoin(users, eq(contacts.contactUserId, users.id))
    .where(and(
      eq(contacts.userId, userId),
      eq(contacts.isBlocked, false)
    ))
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
    const [updatedContact] = await db
      .update(contacts)
      .set(updates)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ))
      .returning();
    return updatedContact || undefined;
  }

  async blockContact(userId: number, contactUserId: number): Promise<void> {
    await db
      .update(contacts)
      .set({
        isBlocked: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ));
  }

  async unblockContact(userId: number, contactUserId: number): Promise<void> {
    await db
      .update(contacts)
      .set({
        isBlocked: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ));
  }

  async getBlockedContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const result = await db.select({
      contacts,
      users
    })
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
    try {
      // Get user's chat rooms
      const userChatRooms = await db.select({
        id: chatRooms.id,
        name: chatRooms.name,
        isGroup: chatRooms.isGroup,
        isPinned: chatRooms.isPinned,
        createdBy: chatRooms.createdBy,
        createdAt: chatRooms.createdAt
      })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatParticipants.chatRoomId, chatRooms.id))
      .where(eq(chatParticipants.userId, userId))
      .orderBy(desc(chatRooms.isPinned), desc(chatRooms.createdAt));

      // Get details for each chat room
      const chatRoomsWithDetails = await Promise.all(
        userChatRooms.map(async (room) => {
          // Get participants
          const participants = await db.select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            email: users.email,
            profilePicture: users.profilePicture,
            userRole: users.userRole,
            isOnline: users.isOnline
          })
          .from(chatParticipants)
          .innerJoin(users, eq(chatParticipants.userId, users.id))
          .where(eq(chatParticipants.chatRoomId, room.id));

          // Get last message
          const lastMessages = await db.select({
            id: messages.id,
            senderId: messages.senderId,
            content: messages.content,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
            sender: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              profilePicture: users.profilePicture
            }
          })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.chatRoomId, room.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

          const lastMessage = lastMessages.length > 0 ? {
            ...lastMessages[0],
            chatRoomId: room.id,
            content: lastMessages[0].content ? decryptText(lastMessages[0].content) : lastMessages[0].content
          } : undefined;

          return {
            ...room,
            participants,
            lastMessage
          };
        })
      );

      return chatRoomsWithDetails;
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      throw error;
    }
  }

  async getChatRoomById(chatRoomId: number): Promise<(ChatRoom & { participants: User[] }) | undefined> {
    const [chatRoom] = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, chatRoomId));

    if (!chatRoom) {
      return undefined;
    }

    const participants = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      profilePicture: users.profilePicture,
      userRole: users.userRole,
      isOnline: users.isOnline
    })
    .from(chatParticipants)
    .innerJoin(users, eq(chatParticipants.userId, users.id))
    .where(eq(chatParticipants.chatRoomId, chatRoomId));

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

    // Add participants
    await db.insert(chatParticipants).values(
      participantIds.map(userId => ({
        chatRoomId: newChatRoom.id,
        userId,
        joinedAt: new Date()
      }))
    );

    return newChatRoom;
  }

  async deleteChatRoom(chatRoomId: number, userId: number): Promise<void> {
    await db.delete(chatRooms).where(
      and(
        eq(chatRooms.id, chatRoomId),
        eq(chatRooms.createdBy, userId)
      )
    );
  }

  async updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const [updatedChatRoom] = await db
      .update(chatRooms)
      .set(updates)
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return updatedChatRoom || undefined;
  }

  async leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void> {
    await db
      .delete(chatParticipants)
      .where(and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      ));
  }

  async getMessages(chatRoomId: number, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await db.select({
      messages,
      users
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.chatRoomId, chatRoomId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

    return result.map(row => ({
      ...row.messages,
      content: row.messages.content ? decryptText(row.messages.content) : row.messages.content,
      sender: row.users
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const messageToInsert = {
      ...message,
      content: message.content ? encryptText(message.content) : message.content
    };

    const [newMessage] = await db
      .insert(messages)
      .values(messageToInsert)
      .returning();
    return newMessage;
  }

  async getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined> {
    const result = await db.select({
      messages,
      users
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.id, messageId))
    .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    return {
      ...row.messages,
      content: row.messages.content ? decryptText(row.messages.content) : row.messages.content,
      sender: row.users
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
    const conditions = [eq(commands.userId, userId)];
    if (chatRoomId) {
      conditions.push(eq(commands.chatRoomId, chatRoomId));
    }

    const result = await db.select({
      commands,
      users
    })
    .from(commands)
    .leftJoin(users, eq(commands.originalSenderId, users.id))
    .where(and(...conditions))
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

  async getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined> {
    const [command] = await db
      .select()
      .from(commands)
      .where(and(
        eq(commands.userId, userId),
        eq(commands.chatRoomId, chatRoomId),
        eq(commands.commandName, commandName)
      ));
    return command || undefined;
  }

  async searchCommands(userId: number, searchTerm: string): Promise<(Command & { originalSender?: User })[]> {
    const result = await db.select({
      commands,
      users
    })
    .from(commands)
    .leftJoin(users, eq(commands.originalSenderId, users.id))
    .where(and(
      eq(commands.userId, userId),
      or(
        like(commands.commandName, `%${searchTerm}%`),
        like(commands.response, `%${searchTerm}%`)
      )
    ))
    .orderBy(desc(commands.createdAt));

    return result.map(row => ({
      ...row.commands,
      originalSender: row.users || undefined
    }));
  }

  async markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void> {
    await db
      .insert(messageReads)
      .values({
        userId,
        chatRoomId,
        lastReadMessageId: lastMessageId,
        readAt: new Date()
      })
      .onConflictDoUpdate({
        target: [messageReads.userId, messageReads.chatRoomId],
        set: {
          lastReadMessageId: lastMessageId,
          readAt: new Date()
        }
      });
  }

  async getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        cr.id as chat_room_id,
        COALESCE(COUNT(m.id) - COALESCE(mr.last_read_message_id, 0), 0) as unread_count
      FROM chat_participants cp
      JOIN chat_rooms cr ON cp.chat_room_id = cr.id
      LEFT JOIN message_reads mr ON mr.user_id = cp.user_id AND mr.chat_room_id = cr.id
      LEFT JOIN messages m ON m.chat_room_id = cr.id
      WHERE cp.user_id = ${userId}
      GROUP BY cr.id, mr.last_read_message_id
    `);

    return result.map((row: any) => ({
      chatRoomId: row.chat_room_id,
      unreadCount: parseInt(row.unread_count) || 0
    }));
  }

  async createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification> {
    const [newVerification] = await db
      .insert(phoneVerifications)
      .values(verification)
      .returning();
    return newVerification;
  }

  async getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined> {
    const [verification] = await db
      .select()
      .from(phoneVerifications)
      .where(and(
        eq(phoneVerifications.phoneNumber, phoneNumber),
        eq(phoneVerifications.verificationCode, verificationCode),
        eq(phoneVerifications.used, false),
        gt(phoneVerifications.expiresAt, new Date())
      ));
    return verification || undefined;
  }

  async markPhoneVerificationAsUsed(id: number): Promise<void> {
    await db
      .update(phoneVerifications)
      .set({ used: true })
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
      .set({ userRole: 'business' })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async getStorageAnalytics(userId: number, timeRange: string): Promise<any> {
    let startDate: Date;
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const uploads = await db
      .select()
      .from(fileUploads)
      .where(and(
        eq(fileUploads.userId, userId),
        gt(fileUploads.uploadedAt, startDate)
      ));

    const downloads = await db
      .select()
      .from(fileDownloads)
      .where(and(
        eq(fileDownloads.userId, userId),
        gt(fileDownloads.downloadedAt, startDate)
      ));

    return {
      uploads: uploads.length,
      downloads: downloads.length,
      totalSize: uploads.reduce((sum, upload) => sum + (upload.fileSize || 0), 0)
    };
  }

  async trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void> {
    await db.insert(fileUploads).values({
      ...fileData,
      uploadedAt: new Date()
    });
  }

  async trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(fileDownloads).values({
      fileUploadId,
      userId,
      ipAddress,
      userAgent,
      downloadedAt: new Date()
    });
  }

  async getBusinessCard(userId: number): Promise<BusinessCard | undefined> {
    const [card] = await db
      .select()
      .from(businessCards)
      .where(eq(businessCards.userId, userId));
    return card || undefined;
  }

  async createOrUpdateBusinessCard(userId: number, cardData: Partial<InsertBusinessCard>): Promise<BusinessCard> {
    const [card] = await db
      .insert(businessCards)
      .values({ ...cardData, userId })
      .onConflictDoUpdate({
        target: businessCards.userId,
        set: cardData
      })
      .returning();
    return card;
  }

  async getBusinessProfile(userId: number): Promise<BusinessProfile | undefined> {
    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, userId));
    return profile || undefined;
  }

  async createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile> {
    const [profile] = await db
      .insert(businessProfiles)
      .values({ ...profileData, userId })
      .onConflictDoUpdate({
        target: businessProfiles.userId,
        set: profileData
      })
      .returning();
    return profile;
  }

  async createBusinessCardShare(userId: number): Promise<BusinessCardShare> {
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const [share] = await db
      .insert(businessCardShares)
      .values({
        userId,
        shareToken,
        expiresAt,
        viewCount: 0,
        isActive: true
      })
      .returning();
    return share;
  }

  async getBusinessCardShare(shareToken: string): Promise<BusinessCardShare | undefined> {
    const [share] = await db
      .select()
      .from(businessCardShares)
      .where(and(
        eq(businessCardShares.shareToken, shareToken),
        eq(businessCardShares.isActive, true),
        gt(businessCardShares.expiresAt, new Date())
      ));

    if (share) {
      // Increment view count
      await db
        .update(businessCardShares)
        .set({ viewCount: (share.viewCount || 0) + 1 })
        .where(eq(businessCardShares.id, share.id));
    }

    return share || undefined;
  }

  async getBusinessCardShareInfo(userId: number): Promise<BusinessCardShare | undefined> {
    const [share] = await db
      .select()
      .from(businessCardShares)
      .where(and(
        eq(businessCardShares.userId, userId),
        eq(businessCardShares.isActive, true)
      ))
      .orderBy(desc(businessCardShares.createdAt))
      .limit(1);
    return share || undefined;
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
    const [post] = await db
      .insert(userPosts)
      .values({
        userId,
        content: postData.content || '',
        postType: postData.postType || 'text',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0
      })
      .returning();
    return post;
  }
}

export const storage = new DatabaseStorage();