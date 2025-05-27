import { 
  users, contacts, chatRooms, chatParticipants, messages, commands, messageReads,
  type User, type InsertUser, type Contact, type InsertContact,
  type ChatRoom, type InsertChatRoom, type Message, type InsertMessage,
  type Command, type InsertCommand, type MessageRead, type InsertMessageRead
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Contact operations
  getContacts(userId: number): Promise<(Contact & { contactUser: User })[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactUserId: number): Promise<void>;
  updateContact(userId: number, contactUserId: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;

  // Chat room operations
  getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]>;
  createChatRoom(chatRoom: InsertChatRoom, participantIds: number[]): Promise<ChatRoom>;
  deleteChatRoom(chatRoomId: number, userId: number): Promise<void>;
  updateChatRoom(chatRoomId: number, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined>;

  // Message operations
  getMessages(chatRoomId: number, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(messageId: number): Promise<(Message & { sender: User }) | undefined>;

  // Command operations
  getCommands(userId: number, chatRoomId?: number): Promise<(Command & { originalSender?: User })[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  deleteCommand(commandId: number, userId: number): Promise<void>;
  getCommandByName(userId: number, chatRoomId: number, commandName: string): Promise<Command | undefined>;
  searchCommands(userId: number, searchTerm: string): Promise<(Command & { originalSender?: User })[]>;
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

  async getChatRooms(userId: number): Promise<(ChatRoom & { participants: User[], lastMessage?: Message & { sender: User } })[]> {
    // Get chat rooms where user is a participant
    const userChatRooms = await db
      .select({ chatRoom: chatRooms })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatParticipants.chatRoomId, chatRooms.id))
      .where(eq(chatParticipants.userId, userId))
      .orderBy(desc(chatRooms.isPinned), desc(chatRooms.createdAt));

    const result = [];
    for (const { chatRoom } of userChatRooms) {
      // Get participants
      const participantsData = await db
        .select({ user: users })
        .from(chatParticipants)
        .innerJoin(users, eq(chatParticipants.userId, users.id))
        .where(eq(chatParticipants.chatRoomId, chatRoom.id));
      
      const participants = participantsData.map(p => p.user);

      // Get last message
      const [lastMessageData] = await db
        .select()
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.chatRoomId, chatRoom.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const lastMessage = lastMessageData ? {
        ...lastMessageData.messages,
        sender: lastMessageData.users
      } : undefined;

      result.push({
        ...chatRoom,
        participants,
        lastMessage
      });
    }

    return result;
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
    })).reverse();
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

    return result ? {
      ...result.messages,
      sender: result.users
    } : undefined;
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
}

export const storage = new DatabaseStorage();
