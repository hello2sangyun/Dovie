//
//  ChatRoom.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation

struct ChatRoom: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let isGroup: Bool
    let isPinned: Bool
    let isLocationChat: Bool
    let createdBy: Int
    let createdAt: Date
    let updatedAt: Date
    
    // 런타임에서 추가되는 정보
    var participants: [User] = []
    var lastMessage: Message?
    var unreadCount: Int = 0
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case isGroup = "is_group"
        case isPinned = "is_pinned"
        case isLocationChat = "is_location_chat"
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case participants
        case lastMessage = "last_message"
        case unreadCount = "unread_count"
    }
}

struct Message: Codable, Identifiable, Equatable {
    let id: Int
    let chatRoomId: Int
    let senderId: Int
    let content: String?
    let messageType: MessageType
    let fileUrl: String?
    let fileName: String?
    let fileSize: Int?
    let voiceDuration: Int?
    let detectedLanguage: String?
    let confidence: Double?
    let isCommandRecall: Bool
    let isTranslated: Bool
    let isCalculated: Bool
    let pollData: String?
    let originalMessageId: Int?
    let replyToMessageId: Int?
    let boomTimer: Int?
    let expiresAt: Date?
    let targetUserId: Int?
    let spotlightMessageId: Int?
    let spotlightDuration: String?
    let isEdited: Bool
    let editedAt: Date?
    let mentionedUserIds: String?
    let mentionAll: Bool
    let youtubePreview: YouTubePreview?
    let isSystemMessage: Bool
    let createdAt: Date
    
    // 런타임에서 추가되는 정보
    var sender: User?
    var replyToMessage: Message?
    
    enum CodingKeys: String, CodingKey {
        case id
        case chatRoomId = "chat_room_id"
        case senderId = "sender_id"
        case content
        case messageType = "message_type"
        case fileUrl = "file_url"
        case fileName = "file_name"
        case fileSize = "file_size"
        case voiceDuration = "voice_duration"
        case detectedLanguage = "detected_language"
        case confidence
        case isCommandRecall = "is_command_recall"
        case isTranslated = "is_translated"
        case isCalculated = "is_calculated"
        case pollData = "poll_data"
        case originalMessageId = "original_message_id"
        case replyToMessageId = "reply_to_message_id"
        case boomTimer = "boom_timer"
        case expiresAt = "expires_at"
        case targetUserId = "target_user_id"
        case spotlightMessageId = "spotlight_message_id"
        case spotlightDuration = "spotlight_duration"
        case isEdited = "is_edited"
        case editedAt = "edited_at"
        case mentionedUserIds = "mentioned_user_ids"
        case mentionAll = "mention_all"
        case youtubePreview = "youtube_preview"
        case isSystemMessage = "is_system_message"
        case createdAt = "created_at"
        case sender
        case replyToMessage = "reply_to_message"
    }
}

enum MessageType: String, Codable, CaseIterable {
    case text = "text"
    case file = "file"
    case image = "image"
    case video = "video"
    case voice = "voice"
    case command = "command"
    case reply = "reply"
    case system = "system"
    case youtube = "youtube"
    case location = "location"
    case poll = "poll"
}

struct YouTubePreview: Codable {
    let videoId: String
    let title: String?
    let description: String?
    let thumbnailUrl: String?
    let duration: String?
    let channelTitle: String?
    
    enum CodingKeys: String, CodingKey {
        case videoId = "video_id"
        case title
        case description
        case thumbnailUrl = "thumbnail_url"
        case duration
        case channelTitle = "channel_title"
    }
}

struct MessageRead: Codable {
    let id: Int
    let userId: Int
    let chatRoomId: Int
    let lastReadMessageId: Int?
    let lastReadAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case chatRoomId = "chat_room_id"
        case lastReadMessageId = "last_read_message_id"
        case lastReadAt = "last_read_at"
    }
}