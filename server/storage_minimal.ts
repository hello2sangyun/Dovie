import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads, phoneVerifications,
  fileUploads, fileDownloads, businessProfiles, userPosts, locationShareRequests, locationShares,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead,
  type PhoneVerification, type InsertPhoneVerification,
  type FileUpload, type InsertFileUpload, type FileDownload, type InsertFileDownload,
  type BusinessProfile, type InsertBusinessProfile,
  type UserPost, type InsertUserPost,
  type LocationShareRequest, type InsertLocationShareRequest,
  type LocationShare, type InsertLocationShare
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, count, gt, lt, sql, inArray } from "drizzle-orm";
import { encryptText, decryptText } from "./crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined>;

  // Contact operations - FIXED for favorite toggle and blocking
  getContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactUserId: number): Promise<void>;
  updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  updateContact(userId: number, contactId: number, updates: Partial<InsertContact>, byId?: boolean): Promise<Contact | undefined>;
  blockContact(userId: number, contactUserId: number): Promise<void>;
  unblockContact(userId: number, contactUserId: number): Promise<void>;
  getBlockedContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;

  // Simplified methods for core functionality
  getChatRooms(userId: number): Promise<any[]>;
  getChatRoomById(chatRoomId: number): Promise<any>;
  createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom>;
  deleteChatRoom(chatRoomId: number, userId: number): Promise<void>;
  updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined>;
  leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void>;
  getMessages(chatRoomId: number, limit?: number): Promise<any[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(messageId: number): Promise<any>;
  updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined>;
  getCommands(userId: number, chatRoomId?: number): Promise<any[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  saveCommand(command: InsertCommand): Promise<Command>;
  deleteCommand(commandId: number, userId: number): Promise<void>;
  getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined>;
  searchCommands(userId: number, searchTerm: string): Promise<any[]>;
  markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void>;
  getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]>;
  createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification>;
  getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined>;
  markPhoneVerificationAsUsed(id: number): Promise<void>;
  cleanupExpiredVerifications(): Promise<void>;
  registerBusinessUser(userId: number, businessData: { businessName: string; businessAddress: string }): Promise<User | undefined>;
  getStorageAnalytics(userId: number, timeRange: string): Promise<any>;
  trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void>;
  trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void>;
  getBusinessProfile(userId: number): Promise<BusinessProfile | undefined>;
  createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile>;
  getUserPosts(userId: number): Promise<UserPost[]>;
  createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost>;
  updateVoiceSettings(userId: number, settings: { allowVoicePlayback?: boolean; autoPlayVoiceMessages?: boolean }): Promise<User | undefined>;
  createLocationShareRequest(request: InsertLocationShareRequest): Promise<LocationShareRequest>;
  getLocationShareRequest(requestId: number): Promise<LocationShareRequest | undefined>;
  updateLocationShareRequest(requestId: number, updates: Partial<InsertLocationShareRequest>): Promise<LocationShareRequest | undefined>;
  createLocationShare(share: InsertLocationShare): Promise<LocationShare>;
  getLocationSharesForChatRoom(chatRoomId: number): Promise<LocationShare[]>;
  detectLocationRequest(message: string): boolean;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ profilePicture }).where(eq(users.id, id)).returning();
    return user;
  }

  // CORE CONTACT FUNCTIONALITY - PROPERLY IMPLEMENTED
  async getContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const results = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.isBlocked, false)
        )
      )
      .orderBy(
        desc(contacts.isPinned),
        asc(contacts.nickname)
      );

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

  // OVERLOADED UPDATE CONTACT METHOD FOR FAVORITE TOGGLE
  async updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  async updateContact(userId: number, contactId: number, updates: Partial<InsertContact>, byId?: boolean): Promise<Contact | undefined>;
  async updateContact(userId: number, identifier: number, updates: Partial<InsertContact>, byId: boolean = false): Promise<Contact | undefined> {
    const whereCondition = byId 
      ? and(eq(contacts.userId, userId), eq(contacts.id, identifier))
      : and(eq(contacts.userId, userId), eq(contacts.contactUserId, identifier));

    const [contact] = await db
      .update(contacts)
      .set(updates)
      .where(whereCondition)
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

  // Chat room implementations
  async getChatRooms(userId: number): Promise<any[]> {
    try {
      const results = await db
        .select({
          id: chatRooms.id,
          name: chatRooms.name,
          isGroup: chatRooms.isGroup,
          createdAt: chatRooms.createdAt,
          updatedAt: chatRooms.updatedAt
        })
        .from(chatRooms)
        .innerJoin(chatParticipants, eq(chatRooms.id, chatParticipants.chatRoomId))
        .where(eq(chatParticipants.userId, userId))
        .orderBy(desc(chatRooms.updatedAt));

      // Get participants for each chat room
      const chatRoomsWithParticipants = await Promise.all(
        results.map(async (room) => {
          const participants = await db
            .select({
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              profilePicture: users.profilePicture
            })
            .from(chatParticipants)
            .innerJoin(users, eq(chatParticipants.userId, users.id))
            .where(eq(chatParticipants.chatRoomId, room.id));

          // Get last message
          const lastMessages = await db
            .select({
              id: messages.id,
              content: messages.content,
              messageType: messages.messageType,
              createdAt: messages.createdAt,
              senderId: messages.senderId,
              senderUsername: users.username,
              senderDisplayName: users.displayName
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.chatRoomId, room.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          const lastMessage = lastMessages[0] || null;

          return {
            ...room,
            participants,
            lastMessage: lastMessage ? {
              ...lastMessage,
              sender: {
                id: lastMessage.senderId,
                username: lastMessage.senderUsername,
                displayName: lastMessage.senderDisplayName
              }
            } : null
          };
        })
      );

      return chatRoomsWithParticipants;
    } catch (error) {
      console.error("Get chat rooms error:", error);
      return [];
    }
  }

  async getChatRoomById(chatRoomId: number): Promise<any> {
    try {
      const [room] = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.id, chatRoomId));

      if (!room) return undefined;

      const participants = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture
        })
        .from(chatParticipants)
        .innerJoin(users, eq(chatParticipants.userId, users.id))
        .where(eq(chatParticipants.chatRoomId, chatRoomId));

      return {
        ...room,
        participants
      };
    } catch (error) {
      console.error("Get chat room by ID error:", error);
      return undefined;
    }
  }

  async createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom> {
    const [newChatRoom] = await db.insert(chatRooms).values(chatRoom).returning();
    
    // Add participants to chat room
    const participantData = participantIds.map(userId => ({
      chatRoomId: newChatRoom.id,
      userId
    }));
    
    await db.insert(chatParticipants).values(participantData);
    
    return newChatRoom;
  }

  async deleteChatRoom(chatRoomId: number, userId: number): Promise<void> {}

  async updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const [chatRoom] = await db.update(chatRooms).set(updates).where(eq(chatRooms.id, chatRoomId)).returning();
    return chatRoom;
  }

  async leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void> {}

  async getMessages(chatRoomId: number, limit: number = 50): Promise<any[]> {
    try {
      const results = await db
        .select({
          id: messages.id,
          content: messages.content,
          messageType: messages.messageType,
          createdAt: messages.createdAt,
          senderId: messages.senderId,
          senderUsername: users.username,
          senderDisplayName: users.displayName
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.chatRoomId, chatRoomId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return results.map(msg => ({
        ...msg,
        sender: {
          id: msg.senderId,
          username: msg.senderUsername,
          displayName: msg.senderDisplayName
        }
      }));
    } catch (error) {
      console.error("Get messages error:", error);
      return [];
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const result = await db.insert(messages).values(message).returning();
      return (result as any)[0];
    } catch (error) {
      console.error("Create message error:", error);
      throw error;
    }
  }

  async getMessageById(messageId: number): Promise<any> {
    return undefined;
  }

  async updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async getCommands(userId: number, chatRoomId?: number): Promise<any[]> {
    return [];
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const [newCommand] = await db.insert(commands).values(command).returning();
    return newCommand;
  }

  async saveCommand(command: InsertCommand): Promise<Command> {
    const [newCommand] = await db.insert(commands).values(command).returning();
    return newCommand;
  }

  async deleteCommand(commandId: number, userId: number): Promise<void> {}

  async getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined> {
    return undefined;
  }

  async searchCommands(userId: number, searchTerm: string): Promise<any[]> {
    return [];
  }

  async markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void> {}

  async getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]> {
    return [];
  }

  async createPhoneVerification(verification: InsertPhoneVerification): Promise<PhoneVerification> {
    const [newVerification] = await db.insert(phoneVerifications).values(verification).returning();
    return newVerification;
  }

  async getPhoneVerification(phoneNumber: string, verificationCode: string): Promise<PhoneVerification | undefined> {
    return undefined;
  }

  async markPhoneVerificationAsUsed(id: number): Promise<void> {}

  async cleanupExpiredVerifications(): Promise<void> {}

  async registerBusinessUser(userId: number, businessData: { businessName: string; businessAddress: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        userRole: 'business',
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getStorageAnalytics(userId: number, timeRange: string): Promise<any> {
    return {};
  }

  async trackFileUpload(fileData: { userId: number; chatRoomId?: number; fileName: string; originalName: string; fileSize: number; fileType: string; filePath: string }): Promise<void> {}

  async trackFileDownload(fileUploadId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<void> {}

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
    return await db
      .select()
      .from(userPosts)
      .where(eq(userPosts.userId, userId))
      .orderBy(desc(userPosts.createdAt));
  }

  async createUserPost(userId: number, postData: Partial<InsertUserPost>): Promise<UserPost> {
    const [post] = await db
      .insert(userPosts)
      .values({ userId, content: postData.content || '', ...postData })
      .returning();
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
    return await db
      .select()
      .from(locationShares)
      .where(eq(locationShares.chatRoomId, chatRoomId))
      .orderBy(desc(locationShares.createdAt));
  }

  detectLocationRequest(message: string): boolean {
    const locationPatterns = [
      /어디.*가면.*되/i,
      /어디야/i,
      /주소.*알려/i,
      /위치.*보내/i,
      /어디.*있어/i,
      /장소.*알려/i,
      /현재.*위치/i,
      /지금.*어디/i
    ];
    
    return locationPatterns.some(pattern => pattern.test(message));
  }
}

export const storage = new DatabaseStorage();