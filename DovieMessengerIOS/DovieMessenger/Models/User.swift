//
//  User.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: Int
    let username: String
    let displayName: String
    let email: String?
    let phoneNumber: String?
    let googleId: String?
    let facebookId: String?
    let loginProvider: String
    let birthday: String?
    let profilePicture: String?
    let qrCode: String?
    let qrToken: String?
    let qrTokenExpiry: Date?
    let isOnline: Bool
    let lastSeen: Date?
    let language: String
    let notificationsEnabled: Bool
    let notificationSound: String
    let isEmailVerified: Bool
    let isProfileComplete: Bool
    let userRole: String
    let businessName: String?
    let businessAddress: String?
    let businessLatitude: Double?
    let businessLongitude: Double?
    let isBusinessVerified: Bool
    let allowVoicePlayback: Bool
    let autoPlayVoiceMessages: Bool
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case username
        case displayName = "display_name"
        case email
        case phoneNumber = "phone_number"
        case googleId = "google_id"
        case facebookId = "facebook_id"
        case loginProvider = "login_provider"
        case birthday
        case profilePicture = "profile_picture"
        case qrCode = "qr_code"
        case qrToken = "qr_token"
        case qrTokenExpiry = "qr_token_expiry"
        case isOnline = "is_online"
        case lastSeen = "last_seen"
        case language
        case notificationsEnabled = "notifications_enabled"
        case notificationSound = "notification_sound"
        case isEmailVerified = "is_email_verified"
        case isProfileComplete = "is_profile_complete"
        case userRole = "user_role"
        case businessName = "business_name"
        case businessAddress = "business_address"
        case businessLatitude = "business_latitude"
        case businessLongitude = "business_longitude"
        case isBusinessVerified = "is_business_verified"
        case allowVoicePlayback = "allow_voice_playback"
        case autoPlayVoiceMessages = "auto_play_voice_messages"
        case createdAt = "created_at"
    }
}

struct Contact: Codable, Identifiable {
    let id: Int
    let userId: Int
    let contactUserId: Int
    let nickname: String?
    let isPinned: Bool
    let isFavorite: Bool
    let isBlocked: Bool
    let createdAt: Date
    
    // 연관된 사용자 정보
    var contactUser: User?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case contactUserId = "contact_user_id"
        case nickname
        case isPinned = "is_pinned"
        case isFavorite = "is_favorite"
        case isBlocked = "is_blocked"
        case createdAt = "created_at"
        case contactUser = "contact_user"
    }
}