import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  phoneNumber: text("phone_number"),
  birthday: text("birthday"),
  profilePicture: text("profile_picture"),
  qrCode: text("qr_code"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  language: text("language").default("ko"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  notificationSound: text("notification_sound").default("default"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isProfileComplete: boolean("is_profile_complete").default(false),
  userRole: text("user_role").default("user"), // user, business, admin
  businessName: text("business_name"),
  businessAddress: text("business_address"),
  businessLatitude: decimal("business_latitude", { precision: 10, scale: 8 }),
  businessLongitude: decimal("business_longitude", { precision: 11, scale: 8 }),
  isBusinessVerified: boolean("is_business_verified").default(false),
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
  isLocationChat: boolean("is_location_chat").default(false), // 주변챗 구분용
  locationChatRoomId: integer("location_chat_room_id").references(() => locationChatRooms.id),
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
  messageType: text("message_type").notNull().default("text"), // text, file, command, reply
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  voiceDuration: integer("voice_duration"), // in seconds for voice messages
  detectedLanguage: text("detected_language"), // detected language for voice messages
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // transcription confidence score
  isCommandRecall: boolean("is_command_recall").default(false),
  isTranslated: boolean("is_translated").default(false),
  isCalculated: boolean("is_calculated").default(false),
  pollData: text("poll_data"), // JSON string containing poll information
  originalMessageId: integer("original_message_id").references(() => messages.id),
  replyToMessageId: integer("reply_to_message_id").references(() => messages.id),
  // Boom message fields
  boomTimer: integer("boom_timer"), // Timer in seconds
  expiresAt: timestamp("expires_at"), // When the boom message expires
  targetUserId: integer("target_user_id").references(() => users.id), // For sendback messages
  spotlightMessageId: integer("spotlight_message_id").references(() => messages.id), // For spotlight messages
  spotlightDuration: text("spotlight_duration"), // Duration for spotlight
  isEdited: boolean("is_edited").default(false), // Track if message was edited
  editedAt: timestamp("edited_at"), // When the message was last edited
  mentionedUserIds: text("mentioned_user_ids"), // JSON array of mentioned user IDs
  mentionAll: boolean("mention_all").default(false), // Whether this message mentions all users
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  lastReadMessageId: integer("last_read_message_id").references(() => messages.id),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
});

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id), // Made nullable for archived commands
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

export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  countryCode: text("country_code").notNull(),
  verificationCode: text("verification_code").notNull(),
  isVerified: boolean("is_verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  duration: integer("duration").notNull(), // Duration in hours
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").references(() => polls.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Location-based chat rooms
export const locationChatRooms = pgTable("location_chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radius: integer("radius").default(50), // meters - 기본 50미터 반경
  address: text("address"),
  isOfficial: boolean("is_official").default(false),
  businessOwnerId: integer("business_owner_id").references(() => users.id),
  autoDeleteAt: timestamp("auto_delete_at"),
  isActive: boolean("is_active").default(true),
  maxParticipants: integer("max_participants").default(100),
  participantCount: integer("participant_count").default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locationChatParticipants = pgTable("location_chat_participants", {
  id: serial("id").primaryKey(),
  locationChatRoomId: integer("location_chat_room_id").references(() => locationChatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nickname: text("nickname"),
  profileImageUrl: text("profile_image_url"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  isMuted: boolean("is_muted").default(false),
  isBlocked: boolean("is_blocked").default(false),
}, (table) => ({
  uniqueParticipant: unique().on(table.locationChatRoomId, table.userId),
}));

export const locationChatMessages = pgTable("location_chat_messages", {
  id: serial("id").primaryKey(),
  locationChatRoomId: integer("location_chat_room_id").references(() => locationChatRooms.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, image, voice, file
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  voiceDuration: integer("voice_duration"),
  detectedLanguage: text("detected_language"),
  confidence: text("confidence"),
  isSystemMessage: boolean("is_system_message").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false)
});

export const fileDownloads = pgTable("file_downloads", {
  id: serial("id").primaryKey(),
  fileUploadId: integer("file_upload_id").references(() => fileUploads.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

export const businessCards = pgTable("business_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fullName: text("full_name"),
  companyName: text("company_name"),
  jobTitle: text("job_title"),
  department: text("department"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  fax: text("fax"),
  website: text("website"),
  address: text("address"),
  description: text("description"),
  cardImageUrl: text("card_image_url"),
  extractedText: text("extracted_text"), // OCR로 추출된 원본 텍스트
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts, { relationName: "userContacts" }),
  contactOf: many(contacts, { relationName: "contactUser" }),
  createdChatRooms: many(chatRooms),
  chatParticipants: many(chatParticipants),
  sentMessages: many(messages),
  commands: many(commands),
  ownedLocationChatRooms: many(locationChatRooms),
  locationChatParticipants: many(locationChatParticipants),
  locationChatMessages: many(locationChatMessages),
  userLocation: many(userLocations),
  businessCards: many(businessCards),
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

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  user: one(users, {
    fields: [messageReads.userId],
    references: [users.id],
  }),
  chatRoom: one(chatRooms, {
    fields: [messageReads.chatRoomId],
    references: [chatRooms.id],
  }),
  lastReadMessage: one(messages, {
    fields: [messageReads.lastReadMessageId],
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

// Location chat relations
export const locationChatRoomsRelations = relations(locationChatRooms, ({ one, many }) => ({
  businessOwner: one(users, {
    fields: [locationChatRooms.businessOwnerId],
    references: [users.id],
  }),
  participants: many(locationChatParticipants),
  messages: many(locationChatMessages),
}));

export const locationChatParticipantsRelations = relations(locationChatParticipants, ({ one }) => ({
  locationChatRoom: one(locationChatRooms, {
    fields: [locationChatParticipants.locationChatRoomId],
    references: [locationChatRooms.id],
  }),
  user: one(users, {
    fields: [locationChatParticipants.userId],
    references: [users.id],
  }),
}));

export const locationChatMessagesRelations = relations(locationChatMessages, ({ one }) => ({
  locationChatRoom: one(locationChatRooms, {
    fields: [locationChatMessages.locationChatRoomId],
    references: [locationChatRooms.id],
  }),
  sender: one(users, {
    fields: [locationChatMessages.senderId],
    references: [users.id],
  }),
}));

export const userLocationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, {
    fields: [userLocations.userId],
    references: [users.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one, many }) => ({
  user: one(users, {
    fields: [fileUploads.userId],
    references: [users.id],
  }),
  chatRoom: one(chatRooms, {
    fields: [fileUploads.chatRoomId],
    references: [chatRooms.id],
  }),
  downloads: many(fileDownloads),
}));

export const fileDownloadsRelations = relations(fileDownloads, ({ one }) => ({
  fileUpload: one(fileUploads, {
    fields: [fileDownloads.fileUploadId],
    references: [fileUploads.id],
  }),
  user: one(users, {
    fields: [fileDownloads.userId],
    references: [users.id],
  }),
}));

// Business profiles table
export const businessProfiles = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: text("company_name"),
  jobTitle: text("job_title"),
  department: text("department"),
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  twitterProfile: text("twitter_profile"),
  bio: text("bio"),
  skills: text("skills").array(), // Array of skills
  achievements: jsonb("achievements"), // JSON object for achievements
  isPublic: boolean("is_public").default(true),
  allowBusinessCardSharing: boolean("allow_business_card_sharing").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User posts table for social features
export const userPosts = pgTable("user_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  postType: text("post_type").default("text"), // text, image, link, etc.
  attachments: text("attachments").array(), // Array of file URLs
  visibility: text("visibility").default("friends"), // public, friends, private
  tags: text("tags").array(), // Array of tags
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business card sharing links
export const businessCardShares = pgTable("business_card_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  shareToken: text("share_token").notNull().unique(),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
  allowDownload: boolean("allow_download").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessCardsRelations = relations(businessCards, ({ one }) => ({
  user: one(users, {
    fields: [businessCards.userId],
    references: [users.id],
  }),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  user: one(users, {
    fields: [businessProfiles.userId],
    references: [users.id],
  }),
}));

export const userPostsRelations = relations(userPosts, ({ one }) => ({
  user: one(users, {
    fields: [userPosts.userId],
    references: [users.id],
  }),
}));

export const businessCardSharesRelations = relations(businessCardShares, ({ one }) => ({
  user: one(users, {
    fields: [businessCardShares.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
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

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  lastReadAt: true,
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  createdAt: true,
});

export const insertPhoneVerificationSchema = createInsertSchema(phoneVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertLocationChatRoomSchema = createInsertSchema(locationChatRooms).omit({
  id: true,
  createdAt: true,
  participantCount: true,
  lastActivity: true,
});

export const insertLocationChatParticipantSchema = createInsertSchema(locationChatParticipants).omit({
  id: true,
  joinedAt: true,
  lastSeen: true,
});

export const insertLocationChatMessageSchema = createInsertSchema(locationChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserLocationSchema = createInsertSchema(userLocations).omit({
  id: true,
  updatedAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertFileDownloadSchema = createInsertSchema(fileDownloads).omit({
  id: true,
  downloadedAt: true,
});

export const insertBusinessCardSchema = createInsertSchema(businessCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessProfileSchema = createInsertSchema(businessProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPostSchema = createInsertSchema(userPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessCardShareSchema = createInsertSchema(businessCardShares).omit({
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
export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type PhoneVerification = typeof phoneVerifications.$inferSelect;
export type InsertPhoneVerification = z.infer<typeof insertPhoneVerificationSchema>;

export type LocationChatRoom = typeof locationChatRooms.$inferSelect;
export type InsertLocationChatRoom = z.infer<typeof insertLocationChatRoomSchema>;
export type LocationChatParticipant = typeof locationChatParticipants.$inferSelect;
export type InsertLocationChatParticipant = z.infer<typeof insertLocationChatParticipantSchema>;
export type LocationChatMessage = typeof locationChatMessages.$inferSelect;
export type InsertLocationChatMessage = z.infer<typeof insertLocationChatMessageSchema>;
export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileDownload = typeof fileDownloads.$inferSelect;
export type InsertFileDownload = z.infer<typeof insertFileDownloadSchema>;
export type BusinessCard = typeof businessCards.$inferSelect;
export type InsertBusinessCard = z.infer<typeof insertBusinessCardSchema>;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type UserPost = typeof userPosts.$inferSelect;
export type InsertUserPost = z.infer<typeof insertUserPostSchema>;
export type BusinessCardShare = typeof businessCardShares.$inferSelect;
export type InsertBusinessCardShare = z.infer<typeof insertBusinessCardShareSchema>;
