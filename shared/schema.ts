import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  phoneNumber: text("phone_number"),
  birthday: text("birthday"),
  profilePicture: text("profile_picture"),
  qrCode: text("qr_code"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  language: text("language").default("ko"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  notificationSound: text("notification_sound").default("default"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactUserId: integer("contact_user_id").references(() => users.id).notNull(),
  nickname: text("nickname"),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isGroup: boolean("is_group").default(false),
  isPinned: boolean("is_pinned").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatParticipants = pgTable("chat_participants", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content"),
  messageType: text("message_type").notNull().default("text"), // text, file, command
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  isCommandRecall: boolean("is_command_recall").default(false),
  originalMessageId: integer("original_message_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  commandName: text("command_name").notNull(),
  messageId: integer("message_id").references(() => messages.id),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  savedText: text("saved_text"),
  originalSenderId: integer("original_sender_id").references(() => users.id),
  originalTimestamp: timestamp("original_timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts, { relationName: "userContacts" }),
  contactOf: many(contacts, { relationName: "contactUser" }),
  createdChatRooms: many(chatRooms),
  chatParticipants: many(chatParticipants),
  sentMessages: many(messages),
  commands: many(commands),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
    relationName: "userContacts",
  }),
  contactUser: one(users, {
    fields: [contacts.contactUserId],
    references: [users.id],
    relationName: "contactUser",
  }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [chatRooms.createdBy],
    references: [users.id],
  }),
  participants: many(chatParticipants),
  messages: many(messages),
  commands: many(commands),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  chatRoom: one(chatRooms, {
    fields: [chatParticipants.chatRoomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [chatParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chatRoom: one(chatRooms, {
    fields: [messages.chatRoomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  originalMessage: one(messages, {
    fields: [messages.originalMessageId],
    references: [messages.id],
  }),
}));

export const commandsRelations = relations(commands, ({ one }) => ({
  user: one(users, {
    fields: [commands.userId],
    references: [users.id],
  }),
  chatRoom: one(chatRooms, {
    fields: [commands.chatRoomId],
    references: [chatRooms.id],
  }),
  message: one(messages, {
    fields: [commands.messageId],
    references: [messages.id],
  }),
  originalSender: one(users, {
    fields: [commands.originalSenderId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
