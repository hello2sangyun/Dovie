import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads, phoneVerifications,
  fileUploads, fileDownloads, businessCards, businessProfiles, userPosts, businessCardShares, nfcExchanges,
  personFolders, folderItems,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead,
  type PhoneVerification, type InsertPhoneVerification,
  type FileUpload, type InsertFileUpload, type FileDownload, type InsertFileDownload,
  type BusinessCard, type InsertBusinessCard, type BusinessProfile, type InsertBusinessProfile,
  type UserPost, type InsertUserPost, type BusinessCardShare, type InsertBusinessCardShare,
  type NfcExchange, type InsertNfcExchange, type PersonFolder, type InsertPersonFolder,
  type FolderItem, type InsertFolderItem
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
  getContactById(userId: number, contactId: number): Promise<(Contact & { contactUser?: User }) | undefined>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactUserId: number): Promise<void>;
  removeContactById(userId: number, contactId: number): Promise<void>;
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

  // NFC exchange operations
  createNfcExchange(initiatorUserId: number, exchangeToken: string): Promise<NfcExchange>;
  completeNfcExchange(exchangeToken: string, recipientUserId: number): Promise<NfcExchange | undefined>;
  processAutomaticFriendAdd(exchange: NfcExchange): Promise<void>;

  // Person folder operations
  getPersonFolders(userId: number): Promise<(PersonFolder & { contact: Contact; itemCount: number })[]>;
  createPersonFolder(userId: number, contactId: number, folderName: string): Promise<PersonFolder>;
  getPersonFolderById(userId: number, folderId: number): Promise<(PersonFolder & { contact: Contact; items: FolderItem[] }) | undefined>;
  createOrFindPersonFolder(userId: number, contactId: number, personName: string): Promise<PersonFolder>;
  
  // Folder item operations
  getFolderItems(folderId: number): Promise<FolderItem[]>;
  addFolderItem(itemData: InsertFolderItem): Promise<FolderItem>;
  removeFolderItem(itemId: number): Promise<void>;
  updateFolderItemCount(folderId: number): Promise<void>;
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

  async getContactById(userId: number, contactId: number): Promise<(Contact & { contactUser?: User }) | undefined> {
    const result = await db
      .select()
      .from(contacts)
      .leftJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.id, contactId)
      ));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.contacts,
      contactUser: row.users || undefined
    };
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

  async removeContactById(userId: number, contactId: number): Promise<void> {
    await db
      .delete(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.id, contactId)
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

  // NFC exchange operations
  async createNfcExchange(initiatorUserId: number, exchangeToken: string): Promise<NfcExchange> {
    const initiatorBusinessCard = await this.getBusinessCard(initiatorUserId);
    
    const [exchange] = await db
      .insert(nfcExchanges)
      .values({
        initiatorUserId,
        recipientUserId: 0, // Will be set when completed
        exchangeToken,
        status: "pending",
        initiatorBusinessCardId: initiatorBusinessCard?.id,
        isAutomaticFriendAdd: true
      })
      .returning();
    
    return exchange;
  }

  async completeNfcExchange(exchangeToken: string, recipientUserId: number): Promise<NfcExchange | undefined> {
    // Find the pending exchange
    const [exchange] = await db
      .select()
      .from(nfcExchanges)
      .where(and(
        eq(nfcExchanges.exchangeToken, exchangeToken),
        eq(nfcExchanges.status, "pending")
      ))
      .limit(1);

    if (!exchange) {
      return undefined;
    }

    // Prevent self-exchange
    if (exchange.initiatorUserId === recipientUserId) {
      await db
        .update(nfcExchanges)
        .set({ 
          status: "failed",
          completedAt: new Date()
        })
        .where(eq(nfcExchanges.id, exchange.id));
      return undefined;
    }

    const recipientBusinessCard = await this.getBusinessCard(recipientUserId);

    // Complete the exchange
    const [completedExchange] = await db
      .update(nfcExchanges)
      .set({
        recipientUserId,
        recipientBusinessCardId: recipientBusinessCard?.id,
        status: "completed",
        completedAt: new Date()
      })
      .where(eq(nfcExchanges.id, exchange.id))
      .returning();

    // Process automatic friend addition
    if (completedExchange.isAutomaticFriendAdd) {
      await this.processAutomaticFriendAdd(completedExchange);
    }

    return completedExchange;
  }

  async processAutomaticFriendAdd(exchange: NfcExchange): Promise<void> {
    const { initiatorUserId, recipientUserId } = exchange;
    
    if (!recipientUserId) return;

    // Check if they're already friends
    const alreadyFriends = await this.areUsersFriends(initiatorUserId, recipientUserId);
    
    if (!alreadyFriends) {
      // Add bidirectional friendship
      await Promise.all([
        // Initiator adds recipient as contact
        db.insert(contacts).values({
          userId: initiatorUserId,
          contactUserId: recipientUserId,
          nickname: null,
          isPinned: false,
          isFavorite: false,
          isBlocked: false
        }).onConflictDoNothing(),
        
        // Recipient adds initiator as contact
        db.insert(contacts).values({
          userId: recipientUserId,
          contactUserId: initiatorUserId,
          nickname: null,
          isPinned: false,
          isFavorite: false,
          isBlocked: false
        }).onConflictDoNothing()
      ]);
    }
  }
  // Person folder operations
  async getPersonFolders(userId: number): Promise<(PersonFolder & { contact: Contact; itemCount: number })[]> {
    const result = await db
      .select({
        folder: personFolders,
        contact: contacts,
        itemCount: sql<number>`COUNT(${folderItems.id})::int`.as('itemCount')
      })
      .from(personFolders)
      .leftJoin(contacts, eq(personFolders.contactId, contacts.id))
      .leftJoin(folderItems, eq(personFolders.id, folderItems.folderId))
      .where(eq(personFolders.userId, userId))
      .groupBy(personFolders.id, contacts.id)
      .orderBy(desc(personFolders.lastActivity));

    return result.map(row => ({
      ...row.folder,
      contact: row.contact!,
      itemCount: row.itemCount || 0
    }));
  }

  async createPersonFolder(userId: number, contactId: number, folderName: string): Promise<PersonFolder> {
    console.log('createPersonFolder called with:', { userId, contactId, folderName });
    
    const insertData = {
      userId,
      contactId,
      personName: folderName,
      folderName,
      lastActivity: new Date(),
      itemCount: 0
    };
    
    console.log('Insert data:', insertData);
    
    const [folder] = await db.insert(personFolders).values(insertData).returning();
    return folder;
  }

  async getPersonFolderById(userId: number, folderId: number): Promise<(PersonFolder & { contact: Contact; items: FolderItem[] }) | undefined> {
    const [folderResult] = await db
      .select({
        folder: personFolders,
        contact: contacts
      })
      .from(personFolders)
      .leftJoin(contacts, eq(personFolders.contactId, contacts.id))
      .where(and(
        eq(personFolders.id, folderId),
        eq(personFolders.userId, userId)
      ));

    if (!folderResult) return undefined;

    const items = await db
      .select()
      .from(folderItems)
      .where(eq(folderItems.folderId, folderId))
      .orderBy(desc(folderItems.createdAt));

    return {
      ...folderResult.folder,
      contact: folderResult.contact!,
      items
    };
  }

  async createOrFindPersonFolder(userId: number, contactId: number, personName: string): Promise<PersonFolder> {
    // Try to find existing folder
    const [existingFolder] = await db
      .select()
      .from(personFolders)
      .where(and(
        eq(personFolders.userId, userId),
        eq(personFolders.contactId, contactId)
      ));

    if (existingFolder) {
      return existingFolder;
    }

    // Create new folder
    const folderName = personName || "새 연락처";
    const [newFolder] = await db
      .insert(personFolders)
      .values({
        userId,
        contactId,
        folderName,
        lastActivity: new Date()
      })
      .returning();

    return newFolder;
  }

  async getFolderItems(folderId: number): Promise<FolderItem[]> {
    return await db
      .select()
      .from(folderItems)
      .where(eq(folderItems.folderId, folderId))
      .orderBy(desc(folderItems.createdAt));
  }

  async addFolderItem(itemData: InsertFolderItem): Promise<FolderItem> {
    const [item] = await db.insert(folderItems).values(itemData).returning();
    
    // Update folder's last activity
    await db
      .update(personFolders)
      .set({ lastActivity: new Date() })
      .where(eq(personFolders.id, itemData.folderId));

    return item;
  }

  async removeFolderItem(itemId: number): Promise<void> {
    await db.delete(folderItems).where(eq(folderItems.id, itemId));
  }

  async updateFolderItemCount(folderId: number): Promise<void> {
    // This is handled automatically via the getPersonFolders query
    // No explicit action needed as we count items dynamically
  }

  // Contact creation for person folders
  async createContact(userId: number, contactData: any): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({
        userId,
        contactUserId: null,
        name: contactData.name,
        nickname: contactData.nickname || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        company: contactData.company || null,
        jobTitle: contactData.jobTitle || null,
        isPinned: false,
        isFavorite: false,
        isBlocked: false
      })
      .returning();
    
    return contact;
  }

  async createOrFindPersonFolder(userId: number, contactId: number, personName: string): Promise<PersonFolder> {
    // 기존 폴더가 있는지 확인
    const [existingFolder] = await db
      .select()
      .from(personFolders)
      .where(and(
        eq(personFolders.userId, userId),
        eq(personFolders.contactId, contactId)
      ))
      .limit(1);

    if (existingFolder) {
      return existingFolder;
    }

    // 새 폴더 생성
    return this.createPersonFolder({
      userId,
      contactId,
      folderName: personName,
      lastActivity: new Date(),
      itemCount: 0
    });
  }

  // Folder item operations
  async getFolderItems(folderId: number): Promise<FolderItem[]> {
    return await db
      .select()
      .from(folderItems)
      .where(eq(folderItems.folderId, folderId))
      .orderBy(desc(folderItems.createdAt));
  }

  async addFolderItem(itemData: InsertFolderItem): Promise<FolderItem> {
    const [item] = await db
      .insert(folderItems)
      .values(itemData)
      .returning();

    // 폴더의 아이템 수 업데이트
    await this.updateFolderItemCount(itemData.folderId);
    
    // 폴더의 마지막 활동 시간 업데이트
    await db
      .update(personFolders)
      .set({ lastActivity: new Date() })
      .where(eq(personFolders.id, itemData.folderId));

    return item;
  }

  async removeFolderItem(itemId: number): Promise<void> {
    const [item] = await db
      .select()
      .from(folderItems)
      .where(eq(folderItems.id, itemId))
      .limit(1);

    if (item) {
      await db
        .delete(folderItems)
        .where(eq(folderItems.id, itemId));
      
      await this.updateFolderItemCount(item.folderId);
    }
  }

  async updateFolderItemCount(folderId: number): Promise<void> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(folderItems)
      .where(eq(folderItems.folderId, folderId));

    if (result) {
      await db
        .update(personFolders)
        .set({ itemCount: result.count })
        .where(eq(personFolders.id, folderId));
    }
  }
}

export const storage = new DatabaseStorage();
