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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined>;

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
  saveCommand(command: InsertCommand): Promise<Command>;
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

  // Business card operations removed - digital business card functionality disabled
  
  // Business profile operations
  getBusinessProfile(userId: number): Promise<BusinessProfile | undefined>;
  createOrUpdateBusinessProfile(userId: number, profileData: Partial<InsertBusinessProfile>): Promise<BusinessProfile>;
  
  // Business card sharing operations (removed - feature disabled)
  
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

  async updateUserProfilePicture(id: number, profilePicture: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profilePicture })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getContacts(userId: number): Promise<(Contact & { contactUser: User })[]> {
    const result = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.isBlocked, false) // 차단된 연락처 제외
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
      ));

    if (userChatRooms.length === 0) return [];

    const chatRoomIds = userChatRooms.map(({ chatRoom }) => chatRoom.id);

    // Get blocked contacts to filter out chat rooms with blocked users
    const blockedContacts = await db
      .select({ contactUserId: contacts.contactUserId })
      .from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.isBlocked, true)
      ));

    const blockedUserIds = new Set(blockedContacts.map(({ contactUserId }) => contactUserId));

    // Batch fetch all participants for these chat rooms
    const allParticipants = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId,
        user: users
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatParticipants.chatRoomId, chatRoomIds));

    // Get last messages for each chat room - optimized query
    const lastMessages = await db
      .select({
        id: messages.id,
        chatRoomId: messages.chatRoomId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        fileName: messages.fileName,
        isCommandRecall: messages.isCommandRecall,
        createdAt: messages.createdAt,
        sender: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(inArray(messages.chatRoomId, chatRoomIds))
      .orderBy(messages.chatRoomId, desc(messages.createdAt));

    // Group by chat room and get the latest message for each
    const lastMessageByRoom = new Map<number, Message & { sender: User }>();
    for (const message of lastMessages) {
      if (!lastMessageByRoom.has(message.chatRoomId)) {
        lastMessageByRoom.set(message.chatRoomId, {
          id: message.id,
          chatRoomId: message.chatRoomId,
          senderId: message.senderId,
          content: decryptText(message.content),
          messageType: message.messageType,
          fileName: message.fileName,
          isCommandRecall: message.isCommandRecall,
          createdAt: message.createdAt,
          sender: message.sender
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

    // Filter out chat rooms with blocked users and combine results
    return userChatRooms
      .map(({ chatRoom }) => ({
        ...chatRoom,
        participants: participantsByRoom.get(chatRoom.id) || [],
        lastMessage: lastMessageByRoom.get(chatRoom.id)
      }))
      .filter(chatRoom => {
        // 그룹 채팅방은 유지 (3명 이상)
        if (chatRoom.participants.length > 2) return true;
        
        // 1:1 채팅방에서 차단된 사용자가 있으면 숨김
        return !chatRoom.participants.some(participant => 
          participant.id !== userId && blockedUserIds.has(participant.id)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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

    // 채팅방 업데이트 시간 갱신 (최신 메시지 기준 정렬을 위해)
    await db
      .update(chatRooms)
      .set({ updatedAt: new Date() })
      .where(eq(chatRooms.id, message.chatRoomId));
    
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

  async saveCommand(command: InsertCommand): Promise<Command> {
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
    // Support multiple hashtags separated by spaces or commas
    const searchTerms = searchTerm.split(/[,\s]+/).filter(term => term.trim().length > 0);
    
    if (searchTerms.length === 0) {
      return [];
    }

    if (searchTerms.length === 1) {
      // Single search term - search in command names and file names
      const term = searchTerms[0];
      const cleanTerm = term.startsWith('#') ? term.slice(1) : term;
      const searchPattern = `%${cleanTerm}%`;
      
      const result = await db
        .select()
        .from(commands)
        .leftJoin(users, eq(commands.originalSenderId, users.id))
        .where(and(
          eq(commands.userId, userId),
          or(
            like(commands.commandName, searchPattern),
            like(commands.fileName, searchPattern)
          )
        ))
        .orderBy(desc(commands.createdAt));

      return result.map(row => ({
        ...row.commands,
        originalSender: row.users || undefined
      }));
    } else {
      // Multiple search terms - find commands where ALL hashtag names exist as individual commands
      const cleanTerms = searchTerms.map(term => term.startsWith('#') ? term.slice(1) : term);
      
      // Get all commands that match any of the search terms
      const matchingCommands = await db
        .select()
        .from(commands)
        .leftJoin(users, eq(commands.originalSenderId, users.id))
        .where(and(
          eq(commands.userId, userId),
          or(
            ...cleanTerms.map(term => like(commands.commandName, `%${term}%`))
          )
        ))
        .orderBy(desc(commands.createdAt));

      // Group by message ID and find messages that have ALL required hashtags
      const messageGroups = new Map<number, (Command & { originalSender?: User })[]>();
      
      matchingCommands.forEach(row => {
        const command = { ...row.commands, originalSender: row.users || undefined };
        if (command.messageId) {
          if (!messageGroups.has(command.messageId)) {
            messageGroups.set(command.messageId, []);
          }
          messageGroups.get(command.messageId)!.push(command);
        }
      });

      // Find messages that have commands matching ALL search terms
      const result: (Command & { originalSender?: User })[] = [];
      messageGroups.forEach((commandsForMessage) => {
        const commandNames = commandsForMessage.map(cmd => cmd.commandName?.toLowerCase() || '');
        const hasAllTerms = cleanTerms.every(term => 
          commandNames.some(name => name.includes(term.toLowerCase()))
        );
        
        if (hasAllTerms) {
          result.push(...commandsForMessage);
        }
      });

      // Remove duplicates and sort by creation date
      const uniqueResults = result.filter((command, index, self) => 
        index === self.findIndex(c => c.id === command.id)
      );
      
      return uniqueResults.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
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
    // Optimized single query using joins and subqueries
    const result = await db
      .select({
        chatRoomId: chatParticipants.chatRoomId,
        totalMessages: count(messages.id),
        lastReadMessageId: messageReads.lastReadMessageId
      })
      .from(chatParticipants)
      .leftJoin(messages, eq(chatParticipants.chatRoomId, messages.chatRoomId))
      .leftJoin(messageReads, and(
        eq(messageReads.userId, userId),
        eq(messageReads.chatRoomId, chatParticipants.chatRoomId)
      ))
      .where(eq(chatParticipants.userId, userId))
      .groupBy(chatParticipants.chatRoomId, messageReads.lastReadMessageId);

    // Calculate unread counts
    const unreadCounts = [];
    for (const row of result) {
      let unreadCount = 0;
      
      if (!row.lastReadMessageId) {
        // No read record, all messages are unread
        unreadCount = row.totalMessages;
      } else {
        // Count messages after last read message
        const [countResult] = await db
          .select({ count: count(messages.id) })
          .from(messages)
          .where(and(
            eq(messages.chatRoomId, row.chatRoomId),
            gt(messages.id, row.lastReadMessageId)
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
    // Location functionality removed - no-op
    console.log('Location update skipped - feature disabled');
  }

  async getNearbyLocationChatRooms(latitude: number, longitude: number, radius: number = 100): Promise<any[]> {
    // Location chat functionality removed
    return [];
  }

  async createLocationChatRoom(userId: number, roomData: { name: string; latitude: number; longitude: number; address: string }): Promise<any> {
    // Location chat functionality removed
    throw new Error('Location chat rooms disabled');
  }

  async joinLocationChatRoom(userId: number, roomId: number, profileData: { nickname: string; profileImageUrl?: string }): Promise<void> {
    // Location chat functionality removed
    throw new Error('Location chat rooms disabled');
  }

  async getLocationChatProfile(userId: number, roomId: number): Promise<{ nickname: string; profileImageUrl?: string } | undefined> {
    // Location chat functionality removed
    return undefined;
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
    // Location chat functionality removed
    return [];
  }

  // Business card operations removed - digital business card functionality disabled
  async getBusinessCard(userId: number): Promise<any> {
    // Business card functionality removed
    return undefined;
  }

  async createOrUpdateBusinessCard(userId: number, cardData: any): Promise<any> {
    // Business card functionality removed
    throw new Error('Business card functionality disabled');
  }

  async getBusinessProfile(userId: number): Promise<any> {
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

  // Business card sharing operations removed - digital business card functionality disabled
  async createBusinessCardShare(userId: number): Promise<any> {
    // Business card functionality removed
    throw new Error('Business card functionality disabled');
  }

  async getBusinessCardShare(shareToken: string): Promise<any> {
    // Business card functionality removed
    return undefined;
  }

  async getBusinessCardShareInfo(userId: number): Promise<any> {
    // Business card functionality removed
    return undefined;
  }
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

  // Command 저장 메서드 추가 (해시태그 자동 추출용)
  async saveCommand(command: InsertCommand): Promise<Command> {
    // 저장된 텍스트가 있으면 암호화, 파일 정보는 그대로 유지
    const encryptedCommand = {
      ...command,
      savedText: command.savedText ? encryptText(command.savedText) : command.savedText,
      fileUrl: command.fileUrl || null,
      fileName: command.fileName || null,
      fileSize: command.fileSize || null
    };
    
    console.log('Saving command with file data:', {
      commandName: command.commandName,
      fileUrl: command.fileUrl,
      fileName: command.fileName,
      fileSize: command.fileSize
    });
    
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

  // Voice settings operations
  async updateVoiceSettings(userId: number, settings: { allowVoicePlayback?: boolean; autoPlayVoiceMessages?: boolean }): Promise<User | undefined> {
    const updateData: any = {};
    
    if (settings.allowVoicePlayback !== undefined) {
      updateData.allowVoicePlayback = settings.allowVoicePlayback;
    }
    
    if (settings.autoPlayVoiceMessages !== undefined) {
      updateData.autoPlayVoiceMessages = settings.autoPlayVoiceMessages;
    }
    
    if (Object.keys(updateData).length === 0) {
      return this.getUser(userId);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  // Location sharing operations
  async createLocationShareRequest(request: InsertLocationShareRequest): Promise<LocationShareRequest> {
    const [newRequest] = await db
      .insert(locationShareRequests)
      .values(request)
      .returning();
    
    return newRequest;
  }

  async getLocationShareRequest(requestId: number): Promise<LocationShareRequest | undefined> {
    const [request] = await db
      .select()
      .from(locationShareRequests)
      .where(eq(locationShareRequests.id, requestId));
    
    return request || undefined;
  }

  async updateLocationShareRequest(requestId: number, updates: Partial<InsertLocationShareRequest>): Promise<LocationShareRequest | undefined> {
    const [updatedRequest] = await db
      .update(locationShareRequests)
      .set(updates)
      .where(eq(locationShareRequests.id, requestId))
      .returning();
    
    return updatedRequest || undefined;
  }

  async createLocationShare(share: InsertLocationShare): Promise<LocationShare> {
    const [newShare] = await db
      .insert(locationShares)
      .values(share)
      .returning();
    
    return newShare;
  }

  async getLocationSharesForChatRoom(chatRoomId: number): Promise<LocationShare[]> {
    const shares = await db
      .select()
      .from(locationShares)
      .where(eq(locationShares.chatRoomId, chatRoomId))
      .orderBy(desc(locationShares.createdAt));
    
    return shares;
  }

  detectLocationRequest(message: string): boolean {
    // 일반적인 위치 관련 키워드
    const locationKeywords = [
      '어디로', '어디에', '어디야', '어디지', '어디임', '어디인',
      '위치', '장소', '주소', '어디', '가는', '길', '찾아가', 
      '오는', '만날', '어디서', '어디까지', '어느', '방향',
      '어떻게', '가야', '가면', '와야', '오면'
    ];
    
    // 위치 요청을 나타내는 구체적인 패턴들
    const locationRequestPatterns = [
      '어디로가면', '어디로 가면', '어디로 가야', '어디로가야',
      '어디야', '어디지', '어디인', '어디임',
      '주소 알려', '주소알려', '주소 가르쳐', '주소가르쳐',
      '위치 알려', '위치알려', '위치 가르쳐', '위치가르쳐',
      '어떻게 가', '어떻게가', '어떻게 와', '어떻게와',
      '길 알려', '길알려', '길 가르쳐', '길가르쳐',
      '어디서 만', '어디서만', '어디에서 만', '어디에서만',
      '몇번 출구', '몇 번 출구', '어느 출구',
      '어디쯤', '어디 쯤', '어느 쪽', '어느쪽'
    ];
    
    // 질문 표시어
    const questionIndicators = ['?', '？', '요', '줘', '쳐', '해'];
    
    const messageText = message.toLowerCase().replace(/\s+/g, '');
    
    // 특정 패턴이 포함되어 있는지 확인
    const hasSpecificPattern = locationRequestPatterns.some(pattern => 
      messageText.includes(pattern.replace(/\s+/g, ''))
    );
    
    // 일반 키워드 + 질문 표시어 조합
    const hasLocationKeyword = locationKeywords.some(keyword => 
      messageText.includes(keyword)
    );
    
    const hasQuestionIndicator = questionIndicators.some(indicator => 
      message.includes(indicator)
    );
    
    // 특정 패턴이 있거나, 위치 키워드와 질문 표시어가 함께 있으면 위치 요청으로 판단
    return hasSpecificPattern || (hasLocationKeyword && hasQuestionIndicator);
  }
}

export const storage = new DatabaseStorage();
