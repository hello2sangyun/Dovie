import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique, decimal, varchar } from "drizzle-orm/pg-core";
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
  qrToken: text("qr_token"), // 임시 QR 토큰
  qrTokenExpiry: timestamp("qr_token_expiry"), // 토큰 만료 시간
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
  // 음성 메시지 설정
  allowVoicePlayback: boolean("allow_voice_playback").default(true), // 다른 사람이 내 음성을 들을 수 있는지
  autoPlayVoiceMessages: boolean("auto_play_voice_messages").default(false), // 이어폰 착용 시 자동 재생
  allowVoiceBookmarks: boolean("allow_voice_bookmarks").default(true), // 다른 사람이 내 음성을 북마크할 수 있는지
  // 소셜 로그인 정보
  authProvider: text("auth_provider"), // 'google', 'apple', 'local' (기본 username/email/phone)
  providerId: text("provider_id"), // OAuth provider's unique user ID
  providerEmail: text("provider_email"), // Email from OAuth provider (Apple 재로그인 시 null 가능)
  // AI 설정
  aiPreferences: jsonb("ai_preferences"), // Smart Inbox 필터 등 AI 관련 설정
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactUserId: integer("contact_user_id").references(() => users.id).notNull(),
  nickname: text("nickname"),
  isPinned: boolean("is_pinned").default(false),
  isFavorite: boolean("is_favorite").default(false),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 위치 공유 요청 테이블
export const locationShareRequests = pgTable("location_share_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  requestMessage: text("request_message").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 위치 공유 데이터 테이블
export const locationShares = pgTable("location_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  messageId: integer("message_id").references(() => messages.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  mapImageUrl: text("map_image_url"),
  googleMapsUrl: text("google_maps_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spaceNotifications = pgTable("space_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'new_post', 'post_like', 'post_comment'
  targetUserId: integer("target_user_id").references(() => users.id),
  postId: integer("post_id").references(() => userPosts.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// iOS 네이티브 디바이스 토큰 테이블
export const iosDeviceTokens = pgTable("ios_device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").notNull(),
  platform: text("platform").default("ios").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserToken: unique().on(table.userId, table.deviceToken),
}));

// 알림 설정 테이블
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  notificationSound: varchar("notification_sound", { length: 50 }).default("default"),
  showPreview: boolean("show_preview").default(true),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  muteAllNotifications: boolean("mute_all_notifications").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS 인증 코드 테이블
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isGroup: boolean("is_group").default(false),
  isPinned: boolean("is_pinned").default(false),
  isLocationChat: boolean("is_location_chat").default(false), // 주변챗 구분용
  profileImage: text("profile_image"), // 그룹 프로필 사진

  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatParticipants = pgTable("chat_participants", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const userChatSettings = pgTable("user_chat_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  isMuted: boolean("is_muted").default(false), // 무음 모드
  isPinned: boolean("is_pinned").default(false), // 채팅방 고정
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserChatRoom: unique().on(table.userId, table.chatRoomId),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content"),
  messageType: text("message_type").notNull().default("text"), // text, file, command, reply
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  voiceDuration: decimal("voice_duration", { precision: 10, scale: 2 }), // in seconds for voice messages (e.g., 2.72)
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
  youtubePreview: jsonb("youtube_preview"), // YouTube video preview data
  isSystemMessage: boolean("is_system_message").default(false), // For system-generated messages like reminders
  isStarred: boolean("is_starred").default(false), // Star/important message marker
  starredAt: timestamp("starred_at"), // When the message was starred
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  lastReadMessageId: integer("last_read_message_id").references(() => messages.id),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserChatRoom: unique().on(table.userId, table.chatRoomId),
}));

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
  description: text("description"), // AI learning data
  originalSenderId: integer("original_sender_id").references(() => users.id),
  originalTimestamp: timestamp("original_timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Notices - Smart notifications detected by AI (appointments, schedules, important info)
export const aiNotices = pgTable("ai_notices", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // User who should see this notice
  noticeType: text("notice_type").notNull(), // appointment, schedule, reminder, important_info, deadline, unanswered_message
  content: text("content").notNull(), // AI-generated notice text
  metadata: jsonb("metadata"), // Additional structured data (date, time, location, participants, etc.)
  priority: text("priority").default("medium"), // low, medium, high
  snoozedUntil: timestamp("snoozed_until"), // When snoozed notice should reappear
  isRead: boolean("is_read").default(false),
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



export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  description: text("description"),
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

// Business Cards table removed - Digital business card functionality disabled

// 회사 채널 테이블
export const companyChannels = pgTable("company_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  isVerified: boolean("is_verified").default(false),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 회사 채널 관리자 테이블
export const companyChannelAdmins = pgTable("company_channel_admins", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => companyChannels.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("admin"), // admin, moderator
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 회사 채널 팔로워 테이블
export const companyChannelFollowers = pgTable("company_channel_followers", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => companyChannels.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 비즈니스 피드 포스트 테이블
export const businessPosts = pgTable("business_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyChannelId: integer("company_channel_id").references(() => companyChannels.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkTitle: text("link_title"),
  linkDescription: text("link_description"),
  postType: text("post_type").default("personal"), // personal, company
  isVisible: boolean("is_visible").default(true),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 비즈니스 포스트 좋아요
export const businessPostLikes = pgTable("business_post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => businessPosts.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 비즈니스 포스트 댓글
export const businessPostComments = pgTable("business_post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => businessPosts.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 비즈니스 포스트 읽음 상태 테이블
export const businessPostReads = pgTable("business_post_reads", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => businessPosts.id),
  userId: integer("user_id").references(() => users.id),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  uniquePostRead: unique().on(table.postId, table.userId),
}));

// 사용자 프로필 확장 (비즈니스 정보)
export const userBusinessProfiles = pgTable("user_business_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobTitle: text("job_title"),
  company: text("company"),
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  industry: text("industry"),
  experienceYears: integer("experience_years"),
  skills: text("skills").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 회사 프로필 테이블
export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  location: text("location"),
  description: text("description"),
  website: text("website"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  employeeCount: text("employee_count"),
  foundedYear: integer("founded_year"),
  visitorCount: integer("visitor_count").default(0),
  followerCount: integer("follower_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserCompany: unique().on(table.userId),
}));



// 리마인더 테이블
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reminderText: text("reminder_text").notNull(),
  reminderTime: timestamp("reminder_time").notNull(),
  isCompleted: boolean("is_completed").default(false),
  isPrivate: boolean("is_private").default(true), // 나만 볼 수 있는 개인 리마인더
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// 북마크 테이블
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  bookmarkType: text("bookmark_type").notNull(), // "message", "file", "voice"
  note: text("note"), // 북마크에 대한 사용자 메모
  createdAt: timestamp("created_at").defaultNow(),
});

// 음성 북마크 요청 테이블
export const voiceBookmarkRequests = pgTable("voice_bookmark_requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  targetUserId: integer("target_user_id").references(() => users.id).notNull(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "denied"
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  uniqueRequest: unique().on(table.requesterId, table.messageId),
}));

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts, { relationName: "userContacts" }),
  contactOf: many(contacts, { relationName: "contactUser" }),
  createdChatRooms: many(chatRooms),
  chatParticipants: many(chatParticipants),
  sentMessages: many(messages),
  commands: many(commands),
  // businessCards relation removed - digital business card functionality disabled
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

// Message reactions table (enhanced from likes to support emoji reactions)
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  emoji: text("emoji").notNull(), // The actual emoji (❤️, 😀, 👍, etc.)
  emojiName: text("emoji_name").notNull(), // Human readable name (heart, smile, thumbs_up, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate reactions from same user with same emoji on same message
  uniqueUserMessageEmoji: unique().on(table.userId, table.messageId, table.emoji),
}));

// Keep message_likes for backward compatibility
export const messageLikes = pgTable("message_likes", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Link previews table for cached link metadata
export const linkPreviews = pgTable("link_previews", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title"),
  description: text("description"),
  image: text("image"),
  siteName: text("site_name"),
  type: text("type").default("website"), // website, youtube, video, image
  metadata: jsonb("metadata"), // Additional metadata like YouTube video ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User posts table for social features
export const userPosts = pgTable("user_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyChannelId: integer("company_channel_id").references(() => companyChannels.id), // Optional for company posts
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

// Business card shares table removed - digital business card functionality disabled

// Space company channels table (기존과 통합)
export const spaceCompanyChannels = pgTable("space_company_channels", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  description: text("description"),
  website: text("website"),
  logo: text("logo"),
  banner: text("banner"),
  industry: text("industry"),
  employeeCount: text("employee_count"), // "1-10", "11-50", etc.
  location: text("location"),
  isVerified: boolean("is_verified").default(false),
  isApproved: boolean("is_approved").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  followerCount: integer("follower_count").default(0),
  postCount: integer("post_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company channel followers
export const companyFollowers = pgTable("company_followers", {
  id: serial("id").primaryKey(),
  companyChannelId: integer("company_channel_id").references(() => companyChannels.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
}, (table) => ({
  uniqueFollower: unique().on(table.companyChannelId, table.userId),
}));

// Post likes table
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => userPosts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  likedAt: timestamp("liked_at").defaultNow(),
}, (table) => ({
  uniqueLike: unique().on(table.postId, table.userId),
}));

// Post comments table
export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => userPosts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id").references(() => postComments.id),
  likeCount: integer("like_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business card relations removed - digital business card functionality disabled



export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  user: one(users, {
    fields: [businessProfiles.userId],
    references: [users.id],
  }),
}));

export const userPostsRelations = relations(userPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [userPosts.userId],
    references: [users.id],
  }),
  companyChannel: one(companyChannels, {
    fields: [userPosts.companyChannelId],
    references: [companyChannels.id],
  }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const companyChannelsRelations = relations(companyChannels, ({ one, many }) => ({
  creator: one(users, {
    fields: [companyChannels.createdById],
    references: [users.id],
  }),
  followers: many(companyFollowers),
  posts: many(userPosts),
}));

export const companyFollowersRelations = relations(companyFollowers, ({ one }) => ({
  companyChannel: one(companyChannels, {
    fields: [companyFollowers.companyChannelId],
    references: [companyChannels.id],
  }),
  user: one(users, {
    fields: [companyFollowers.userId],
    references: [users.id],
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(userPosts, {
    fields: [postLikes.postId],
    references: [userPosts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
  post: one(userPosts, {
    fields: [postComments.postId],
    references: [userPosts.id],
  }),
  user: one(users, {
    fields: [postComments.userId],
    references: [users.id],
  }),
  parentComment: one(postComments, {
    fields: [postComments.parentCommentId],
    references: [postComments.id],
  }),
  replies: many(postComments),
}));

// Location share insert schemas and types
export const insertLocationShareRequestSchema = createInsertSchema(locationShareRequests).omit({
  id: true,
  createdAt: true,
});

export const insertLocationShareSchema = createInsertSchema(locationShares).omit({
  id: true,
  createdAt: true,
});

export type InsertLocationShareRequest = z.infer<typeof insertLocationShareRequestSchema>;
export type SelectLocationShareRequest = typeof locationShareRequests.$inferSelect;
export type InsertLocationShare = z.infer<typeof insertLocationShareSchema>;
export type SelectLocationShare = typeof locationShares.$inferSelect;



// Reminder insert schema
export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

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

export const insertUserChatSettingsSchema = createInsertSchema(userChatSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).extend({
  voiceDuration: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'string') return parseFloat(val);
    return val;
  }).optional(),
});

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  lastReadAt: true,
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  createdAt: true,
});

export const insertAiNoticeSchema = createInsertSchema(aiNotices).omit({
  id: true,
  createdAt: true,
});

export const insertPhoneVerificationSchema = createInsertSchema(phoneVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceBookmarkRequestSchema = createInsertSchema(voiceBookmarkRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertFileDownloadSchema = createInsertSchema(fileDownloads).omit({
  id: true,
  downloadedAt: true,
});

// Business card schema removed - digital business card functionality disabled

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

// Business card share schema removed - digital business card functionality disabled

export const insertCompanyChannelSchema = createInsertSchema(companyChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostLikeSchema = createInsertSchema(postLikes).omit({
  id: true,
  likedAt: true,
});

export const insertPostCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type UserChatSettings = typeof userChatSettings.$inferSelect;
export type InsertUserChatSettings = z.infer<typeof insertUserChatSettingsSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type AiNotice = typeof aiNotices.$inferSelect;
export type InsertAiNotice = z.infer<typeof insertAiNoticeSchema>;
export type PhoneVerification = typeof phoneVerifications.$inferSelect;
export type InsertPhoneVerification = z.infer<typeof insertPhoneVerificationSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type VoiceBookmarkRequest = typeof voiceBookmarkRequests.$inferSelect;
export type InsertVoiceBookmarkRequest = z.infer<typeof insertVoiceBookmarkRequestSchema>;

export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileDownload = typeof fileDownloads.$inferSelect;
export type InsertFileDownload = z.infer<typeof insertFileDownloadSchema>;
// Business card types removed - digital business card functionality disabled
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type UserPost = typeof userPosts.$inferSelect;
export type InsertUserPost = z.infer<typeof insertUserPostSchema>;
// Business card share types removed - digital business card functionality disabled
export type CompanyChannel = typeof companyChannels.$inferSelect;
export type InsertCompanyChannel = z.infer<typeof insertCompanyChannelSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = z.infer<typeof insertPostLikeSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;

// Message reactions and likes types
export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageLikeSchema = createInsertSchema(messageLikes);
export const insertLinkPreviewSchema = createInsertSchema(linkPreviews);

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
});

export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageLike = typeof messageLikes.$inferSelect;
export type InsertMessageLike = z.infer<typeof insertMessageLikeSchema>;
export type LinkPreview = typeof linkPreviews.$inferSelect;
export type InsertLinkPreview = z.infer<typeof insertLinkPreviewSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
