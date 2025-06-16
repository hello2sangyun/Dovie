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

  // Business card operations
  getBusinessCard(userId: number): Promise<BusinessCard | undefined>;
  createOrUpdateBusinessCard(userId: number, cardData: Partial<InsertBusinessCard>): Promise<BusinessCard>;
  
  // Business profile operations
  getBusinessProfile(userId: number): Promise<BusinessProfile | undefined>;
  createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile>;
  
  // Business card sharing operations
  createBusinessCardShare(userId: number): Promise<BusinessCardShare>;
  getBusinessCardShare(shareToken: string): Promise<BusinessCardShare | undefined>;
  getBusinessCardShareInfo(userId: number): Promise<BusinessCardShare | undefined>;
  
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
    console.log("Getting blocked contacts for user:", userId);
    
    const result = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.isBlocked, true)
      ))
      .orderBy(asc(users.displayName));
    
    console.log("Blocked contacts query result:", result);
    
    const mappedResult = result.map(row => ({
      ...row.contacts,
      contactUser: row.users
    }));
    
    console.log("Mapped blocked contacts:", mappedResult);
    
    return mappedResult;
  }

  async getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]> {
    // Get user's chat rooms (excluding location-based chats)
    const userChatRooms = await db
      .select({ chatRoom: chatRooms })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatParticipants.chatRoomId, chatRooms.id))
      .where(and(
        eq(chatParticipants.userId, userId),
        eq(chatRooms.isLocationChat, false) // 주변챗 제외
      ))
      .orderBy(desc(chatRooms.isPinned), desc(chatRooms.createdAt));

    if (userChatRooms.length === 0) return [];

    const chatRoomIds = userChatRooms.map(({ chatRoom }) => chatRoom.id);

    // Batch fetch all participants for these chat rooms
    const allParticipants = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId,
        user: users
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatParticipants.chatRoomId, chatRoomIds));

    // Simple sequential approach for last messages
    const lastMessageByRoom = new Map<number, Message & { sender: User }>();
    
    for (const chatRoomId of chatRoomIds) {
      const [lastMessageData] = await db
        .select()
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.chatRoomId, chatRoomId))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      
      if (lastMessageData) {
        lastMessageByRoom.set(chatRoomId, {
          ...lastMessageData.messages,
          content: lastMessageData.messages.content ? decryptText(lastMessageData.messages.content) : lastMessageData.messages.content,
          sender: lastMessageData.users
        });
      }
    }

    // Group participants by chat room
    const participantsByRoom = new Map<number, User[]>();
    allParticipants.forEach(({ chatRoomId, user }) => {
      if (!participantsByRoom.has(chatRoomId)) {
        participantsByRoom.set(chatRoomId, []);
      }
      participantsByRoom.get(chatRoomId)!.push(user);
    });

    // Combine results
    return userChatRooms.map(({ chatRoom }) => ({
      ...chatRoom,
      participants: participantsByRoom.get(chatRoom.id) || [],
      lastMessage: lastMessageByRoom.get(chatRoom.id)
    }));
  }

  async getChatRoomById(chatRoomId: number): Promise<(ChatRoom & { participants: User[] }) | undefined> {
    const [chatRoom] = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, chatRoomId));

    if (!chatRoom) return undefined;

    // Get participants for this chat room
    const participants = await db
      .select({ user: users })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(eq(chatParticipants.chatRoomId, chatRoomId));

    return {
      ...chatRoom,
      participants: participants.map(({ user }) => user)
    };
  }

  async createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom> {
    const [newChatRoom] = await db
      .insert(chatRooms)
      .values(chatRoom)
      .returning();

    // Add participants
    const participantData = participantIds.map(userId => ({
      chatRoomId: newChatRoom.id,
      userId
    }));

    await db.insert(chatParticipants).values(participantData);

    return newChatRoom;
  }

  async deleteChatRoom(chatRoomId: number, userId: number): Promise<void> {
    // Only allow deletion if user is the creator
    await db
      .delete(chatRooms)
      .where(and(
        eq(chatRooms.id, chatRoomId),
        eq(chatRooms.createdBy, userId)
      ));
  }

  async updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const [chatRoom] = await db
      .update(chatRooms)
      .set(updates)
      .where(eq(chatRooms.id, chatRoomId))
      .returning();
    return chatRoom || undefined;
  }

  async leaveChatRoom(chatRoomId: number, userId: number, saveFiles: boolean): Promise<void> {
    // Remove user from chat participants
    await db
      .delete(chatParticipants)
      .where(and(
        eq(chatParticipants.chatRoomId, chatRoomId),
        eq(chatParticipants.userId, userId)
      ));

    // Handle files based on saveFiles flag
    if (saveFiles) {
      // Move files to user's archive/storage
      // For now, we'll just mark them as archived
      await db
        .update(commands)
        .set({ chatRoomId: null }) // Remove from chat room but keep for user
        .where(and(
          eq(commands.chatRoomId, chatRoomId),
          eq(commands.userId, userId)
        ));
    } else {
      // Delete user's commands/files from this chat room
      await db
        .delete(commands)
        .where(and(
          eq(commands.chatRoomId, chatRoomId),
          eq(commands.userId, userId)
        ));
    }

    // Check if chat room is empty and delete if needed
    const remainingParticipants = await db
      .select()
      .from(chatParticipants)
      .where(eq(chatParticipants.chatRoomId, chatRoomId));

    if (remainingParticipants.length === 0) {
      // Never delete chat rooms that might have messages
      // Just mark the chat room as inactive
      await db
        .update(chatRooms)
        .set({ 
          name: `[삭제된 채팅방]`,
          isGroup: false 
        })
        .where(eq(chatRooms.id, chatRoomId));
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
      content: decryptText(row.messages.content), // 메시지 내용 복호화
      sender: row.users
    })).reverse();
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // 메시지 내용 암호화
    const encryptedMessage = {
      ...message,
      content: encryptText(message.content)
    };
    
    const [newMessage] = await db
      .insert(messages)
      .values(encryptedMessage)
      .returning();
    
    // 반환할 때는 복호화해서 반환
    return {
      ...newMessage,
      content: decryptText(newMessage.content)
    };
  }

  async getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined> {
    const [result] = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId));

    return result ? {
      ...result.messages,
      sender: result.users
    } : undefined;
  }

  async updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();

    return updatedMessage;
  }

  async getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User })[]> {
    let whereCondition = eq(commands.userId, userId);

    if (chatRoomId) {
      whereCondition = and(
        eq(commands.userId, userId),
        eq(commands.chatRoomId, chatRoomId)
      );
    }

    const result = await db
      .select()
      .from(commands)
      .leftJoin(users, eq(commands.originalSenderId, users.id))
      .where(whereCondition)
      .orderBy(desc(commands.createdAt));

    return result.map(row => ({
      ...row.commands,
      originalSender: row.users || undefined
    }));
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    // 저장된 텍스트가 있으면 암호화
    const encryptedCommand = {
      ...command,
      savedText: command.savedText ? encryptText(command.savedText) : command.savedText
    };
    
    const [newCommand] = await db
      .insert(commands)
      .values(encryptedCommand)
      .returning();
    
    // 반환할 때는 복호화해서 반환
    return {
      ...newCommand,
      savedText: newCommand.savedText ? decryptText(newCommand.savedText) : newCommand.savedText
    };
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
    const result = await db
      .select()
      .from(commands)
      .leftJoin(users, eq(commands.originalSenderId, users.id))
      .where(and(
        eq(commands.userId, userId),
        or(
          like(commands.commandName, `%${searchTerm}%`),
          like(commands.fileName, `%${searchTerm}%`),
          like(commands.savedText, `%${searchTerm}%`)
        )
      ))
      .orderBy(desc(commands.createdAt));

    return result.map(row => ({
      ...row.commands,
      originalSender: row.users || undefined
    }));
  }

  async markMessagesAsRead(userId: number, chatRoomId: number, lastMessageId: number): Promise<void> {
    // 기존 레코드가 있는지 확인
    const [existingRecord] = await db
      .select()
      .from(messageReads)
      .where(and(
        eq(messageReads.userId, userId),
        eq(messageReads.chatRoomId, chatRoomId)
      ));

    if (existingRecord) {
      // 업데이트
      await db
        .update(messageReads)
        .set({
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date(),
        })
        .where(and(
          eq(messageReads.userId, userId),
          eq(messageReads.chatRoomId, chatRoomId)
        ));
    } else {
      // 새로 삽입
      await db
        .insert(messageReads)
        .values({
          userId,
          chatRoomId,
          lastReadMessageId: lastMessageId,
        });
    }
  }

  async getUnreadCounts(userId: number): Promise<{ chatRoomId: number; unreadCount: number }[]> {
    // Get all chat rooms the user participates in
    const userChatRooms = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId,
      })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    const unreadCounts = [];

    for (const room of userChatRooms) {
      // Get the last read message for this chat room
      const [readRecord] = await db
        .select()
        .from(messageReads)
        .where(and(
          eq(messageReads.userId, userId),
          eq(messageReads.chatRoomId, room.chatRoomId)
        ));

      let unreadCount = 0;
      if (!readRecord) {
        // No read record exists, count all messages
        const [countResult] = await db
          .select({ count: count(messages.id) })
          .from(messages)
          .where(eq(messages.chatRoomId, room.chatRoomId));
        unreadCount = countResult.count;
      } else {
        // Count messages after the last read message
        const [countResult] = await db
          .select({ count: count(messages.id) })
          .from(messages)
          .where(and(
            eq(messages.chatRoomId, room.chatRoomId),
            gt(messages.id, readRecord.lastReadMessageId || 0)
          ));
        unreadCount = countResult.count;
      }

      if (unreadCount > 0) {
        unreadCounts.push({
          chatRoomId: room.chatRoomId,
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

  async updateUserLocation(userId: number, location: { latitude: number; longitude: number; accuracy: number }): Promise<void> {
    // Use upsert to handle existing locations
    await db
      .insert(userLocations)
      .values({
        userId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy.toString(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userLocations.userId,
        set: {
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          accuracy: location.accuracy.toString(),
          updatedAt: new Date()
        }
      });
  }

  async getNearbyLocationChatRooms(latitude: number, longitude: number, radius: number = 100): Promise<any[]> {
    const result = await db
      .select({
        id: locationChatRooms.id,
        name: locationChatRooms.name,
        latitude: locationChatRooms.latitude,
        longitude: locationChatRooms.longitude,
        radius: locationChatRooms.radius,
        address: locationChatRooms.address,
        isOfficial: locationChatRooms.isOfficial,
        participantCount: locationChatRooms.participantCount,
        maxParticipants: locationChatRooms.maxParticipants,
        lastActivity: locationChatRooms.lastActivity
      })
      .from(locationChatRooms)
      .where(eq(locationChatRooms.isActive, true));
    
    return result;
  }

  async createLocationChatRoom(userId: number, roomData: { name: string; latitude: number; longitude: number; address: string }): Promise<any> {
    const autoDeleteAt = new Date();
    autoDeleteAt.setHours(autoDeleteAt.getHours() + 12); // Auto delete after 12 hours

    const [newRoom] = await db
      .insert(locationChatRooms)
      .values({
        name: roomData.name,
        latitude: roomData.latitude.toString(),
        longitude: roomData.longitude.toString(),
        address: roomData.address,
        autoDeleteAt,
        participantCount: 1
      })
      .returning();

    // Auto-join the creator
    await db
      .insert(locationChatParticipants)
      .values({
        locationChatRoomId: newRoom.id,
        userId
      });

    return newRoom;
  }

  async joinLocationChatRoom(userId: number, roomId: number, profileData: { nickname: string; profileImageUrl?: string }): Promise<void> {
    // Check if already joined
    const existing = await db
      .select()
      .from(locationChatParticipants)
      .where(and(
        eq(locationChatParticipants.locationChatRoomId, roomId),
        eq(locationChatParticipants.userId, userId)
      ));

    if (existing.length === 0) {
      await db
        .insert(locationChatParticipants)
        .values({
          locationChatRoomId: roomId,
          userId,
          nickname: profileData.nickname,
          profileImageUrl: profileData.profileImageUrl || null
        });

      // Update participant count
      await db
        .update(locationChatRooms)
        .set({
          participantCount: sql`${locationChatRooms.participantCount} + 1`,
          lastActivity: new Date()
        })
        .where(eq(locationChatRooms.id, roomId));
    } else {
      // Update existing participant's profile
      await db
        .update(locationChatParticipants)
        .set({
          nickname: profileData.nickname,
          profileImageUrl: profileData.profileImageUrl || null,
          lastSeen: new Date()
        })
        .where(and(
          eq(locationChatParticipants.locationChatRoomId, roomId),
          eq(locationChatParticipants.userId, userId)
        ));
    }
  }

  async getLocationChatProfile(userId: number, roomId: number): Promise<{ nickname: string; profileImageUrl?: string } | undefined> {
    const [participant] = await db
      .select({
        nickname: locationChatParticipants.nickname,
        profileImageUrl: locationChatParticipants.profileImageUrl
      })
      .from(locationChatParticipants)
      .where(and(
        eq(locationChatParticipants.locationChatRoomId, roomId),
        eq(locationChatParticipants.userId, userId)
      ));

    if (!participant || !participant.nickname) {
      return undefined;
    }

    return {
      nickname: participant.nickname,
      profileImageUrl: participant.profileImageUrl || undefined
    };
  }



  async getStorageAnalytics(userId: number, timeRange: string): Promise<any> {
    const timeCondition = this.getTimeCondition(timeRange);
    
    // Get user's file uploads with chat room info
    const userFileUploads = await db
      .select({
        id: fileUploads.id,
        fileName: fileUploads.fileName,
        originalName: fileUploads.originalName,
        fileSize: fileUploads.fileSize,
        fileType: fileUploads.fileType,
        uploadedAt: fileUploads.uploadedAt,
        chatRoomName: chatRooms.name,
        chatRoomId: fileUploads.chatRoomId
      })
      .from(fileUploads)
      .leftJoin(chatRooms, eq(fileUploads.chatRoomId, chatRooms.id))
      .where(
        and(
          eq(fileUploads.userId, userId),
          eq(fileUploads.isDeleted, false),
          timeCondition || sql`true`
        )
      );

    // Get download logs for user's files
    const downloads = await db
      .select({
        id: fileDownloads.id,
        fileName: fileUploads.fileName,
        downloaderName: users.displayName,
        downloadedAt: fileDownloads.downloadedAt,
        ipAddress: fileDownloads.ipAddress,
        fileUploadId: fileDownloads.fileUploadId
      })
      .from(fileDownloads)
      .innerJoin(fileUploads, eq(fileDownloads.fileUploadId, fileUploads.id))
      .innerJoin(users, eq(fileDownloads.userId, users.id))
      .where(eq(fileUploads.userId, userId));

    // Calculate totals and breakdowns
    const totalSize = userFileUploads.reduce((sum: number, file: any) => sum + file.fileSize, 0);
    
    const typeBreakdown = {
      images: 0,
      documents: 0,
      audio: 0,
      video: 0,
      other: 0
    };

    userFileUploads.forEach((file: any) => {
      if (file.fileType.startsWith('image/')) {
        typeBreakdown.images += file.fileSize;
      } else if (file.fileType.startsWith('video/')) {
        typeBreakdown.video += file.fileSize;
      } else if (file.fileType.startsWith('audio/')) {
        typeBreakdown.audio += file.fileSize;
      } else if (file.fileType.includes('document') || file.fileType.includes('pdf') || file.fileType.includes('text')) {
        typeBreakdown.documents += file.fileSize;
      } else {
        typeBreakdown.other += file.fileSize;
      }
    });

    // Chat room breakdown
    const chatRoomMap = new Map();
    userFileUploads.forEach((file: any) => {
      const roomName = file.chatRoomName || '개인 파일';
      if (!chatRoomMap.has(roomName)) {
        chatRoomMap.set(roomName, { roomName, fileCount: 0, totalSize: 0 });
      }
      const room = chatRoomMap.get(roomName);
      room.fileCount++;
      room.totalSize += file.fileSize;
    });

    return {
      totalSize,
      typeBreakdown,
      chatRoomBreakdown: Array.from(chatRoomMap.values()),
      recentDownloads: downloads.slice(0, 20) // Latest 20 downloads
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

  async checkLocationProximity(userId: number): Promise<{ roomId: number; distance: number; hasNewChats: boolean }[]> {
    const userLocation = await db.select()
      .from(userLocations)
      .where(eq(userLocations.userId, userId));

    if (!userLocation.length) return [];

    const { latitude: userLat, longitude: userLng } = userLocation[0];
    
    // 주변 50미터 내 채팅방 찾기
    const nearbyRooms = await db.select({
      id: locationChatRooms.id,
      name: locationChatRooms.name,
      latitude: locationChatRooms.latitude,
      longitude: locationChatRooms.longitude,
      radius: locationChatRooms.radius,
      participantCount: locationChatRooms.participantCount,
      lastActivity: locationChatRooms.lastActivity,
    })
    .from(locationChatRooms)
    .where(eq(locationChatRooms.isActive, true));

    const proximityResults = [];
    for (const room of nearbyRooms) {
      const distance = this.calculateDistance(
        parseFloat(userLat.toString()),
        parseFloat(userLng.toString()),
        parseFloat(room.latitude.toString()),
        parseFloat(room.longitude.toString())
      );

      if (distance <= (room.radius || 50)) {
        // 사용자가 이미 참여하고 있는지 확인
        const isParticipant = await db.select()
          .from(locationChatParticipants)
          .where(
            and(
              eq(locationChatParticipants.userId, userId),
              eq(locationChatParticipants.locationChatRoomId, room.id)
            )
          );

        const hasNewChats = !isParticipant.length;
        
        proximityResults.push({
          roomId: room.id,
          distance,
          hasNewChats
        });
      }
    }

    return proximityResults;
  }

  async getLocationChatMessages(roomId: number, limit: number = 50): Promise<any[]> {
    const messages = await db
      .select({
        id: locationChatMessages.id,
        content: locationChatMessages.content,
        messageType: locationChatMessages.messageType,
        fileName: locationChatMessages.fileName,
        fileSize: locationChatMessages.fileSize,
        voiceDuration: locationChatMessages.voiceDuration,
        detectedLanguage: locationChatMessages.detectedLanguage,
        createdAt: locationChatMessages.createdAt,
        senderId: locationChatMessages.senderId,
        locationChatRoomId: locationChatMessages.locationChatRoomId,
        sender: {
          id: users.id,
          displayName: users.displayName,
          profilePicture: users.profilePicture
        },
        senderProfile: {
          nickname: locationChatParticipants.nickname,
          profileImageUrl: locationChatParticipants.profileImageUrl
        }
      })
      .from(locationChatMessages)
      .innerJoin(users, eq(locationChatMessages.senderId, users.id))
      .leftJoin(locationChatParticipants, and(
        eq(locationChatParticipants.userId, locationChatMessages.senderId),
        eq(locationChatParticipants.locationChatRoomId, roomId)
      ))
      .where(eq(locationChatMessages.locationChatRoomId, roomId))
      .orderBy(desc(locationChatMessages.createdAt))
      .limit(limit);

    return messages.reverse();
  }

  async createLocationChatMessage(roomId: number, senderId: number, messageData: any): Promise<any> {
    const [message] = await db
      .insert(locationChatMessages)
      .values({
        locationChatRoomId: roomId,
        senderId: senderId,
        content: messageData.content,
        messageType: messageData.messageType || "text",
        fileName: messageData.fileName,
        fileSize: messageData.fileSize,
        voiceDuration: messageData.voiceDuration,
        detectedLanguage: messageData.detectedLanguage
      })
      .returning();

    return message;
  }

  // Business card operations
  async getBusinessCard(userId: number): Promise<BusinessCard | undefined> {
    const [card] = await db.select().from(businessCards).where(eq(businessCards.userId, userId));
    return card || undefined;
  }

  async createOrUpdateBusinessCard(userId: number, cardData: Partial<InsertBusinessCard>): Promise<BusinessCard> {
    const existingCard = await this.getBusinessCard(userId);
    
    if (existingCard) {
      const [updatedCard] = await db
        .update(businessCards)
        .set({ ...cardData, updatedAt: new Date() })
        .where(eq(businessCards.userId, userId))
        .returning();
      return updatedCard;
    } else {
      const [newCard] = await db
        .insert(businessCards)
        .values({ ...cardData, userId })
        .returning();
      return newCard;
    }
  }

  // Business profile operations
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

  // Business card sharing operations
  async createBusinessCardShare(userId: number): Promise<BusinessCardShare> {
    // Generate unique share token
    const shareToken = Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join('');

    const [share] = await db
      .insert(businessCardShares)
      .values({
        userId,
        shareToken,
        isActive: true,
        allowDownload: true
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
        eq(businessCardShares.isActive, true)
      ));
    
    if (share) {
      // Increment view count
      await db
        .update(businessCardShares)
        .set({ viewCount: share.viewCount + 1 })
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

  // User posts operations
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
      .values({ ...postData, userId })
      .returning();
    
    return post;
  }

  // 사용자들이 친구인지 확인
  async areUsersFriends(userId1: number, userId2: number): Promise<boolean> {
    const contact = await db.select()
      .from(contacts)
      .where(
        or(
          and(eq(contacts.userId, userId1), eq(contacts.contactUserId, userId2)),
          and(eq(contacts.userId, userId2), eq(contacts.contactUserId, userId1))
        )
      )
      .limit(1);
    
    return contact.length > 0;
  }
}

export const storage = new DatabaseStorage();
