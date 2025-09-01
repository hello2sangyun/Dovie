//
//  Constants.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation

struct AppConstants {
    // MARK: - API URLs
    struct API {
        static let baseURL = "https://dovie-hello2sangyun.replit.app"
        static let websocketURL = "wss://dovie-hello2sangyun.replit.app/ws"
        
        // Auth endpoints
        static let login = "/api/auth/login"
        static let signup = "/api/auth/signup"
        static let logout = "/api/auth/logout"
        static let currentUser = "/api/auth/user"
        static let googleAuth = "/api/auth/google"
        static let facebookAuth = "/api/auth/facebook"
        
        // Chat endpoints
        static let chatRooms = "/api/chat-rooms"
        static let messages = "/api/messages"
        static let uploadFile = "/api/upload"
        
        // Contacts endpoints
        static let contacts = "/api/contacts"
        static let addContact = "/api/contacts/add"
        
        // Business endpoints
        static let businessPosts = "/api/business/posts"
        static let businessProfiles = "/api/business/profiles"
        
        // Push notifications
        static let deviceTokens = "/api/device-tokens"
    }
    
    // MARK: - UI Constants
    struct UI {
        static let cornerRadius: CGFloat = 12
        static let shadowRadius: CGFloat = 2
        static let shadowOpacity: Float = 0.1
        
        // Animation durations
        static let shortAnimation: TimeInterval = 0.25
        static let mediumAnimation: TimeInterval = 0.5
        static let longAnimation: TimeInterval = 1.0
        
        // Spacing
        static let smallSpacing: CGFloat = 8
        static let mediumSpacing: CGFloat = 16
        static let largeSpacing: CGFloat = 24
        
        // Avatar sizes
        static let smallAvatarSize: CGFloat = 30
        static let mediumAvatarSize: CGFloat = 50
        static let largeAvatarSize: CGFloat = 100
    }
    
    // MARK: - Message Constants
    struct Message {
        static let maxLength = 4000
        static let maxFileSize = 50 * 1024 * 1024 // 50MB
        static let maxVoiceDuration = 300 // 5 minutes
        static let typingTimeout: TimeInterval = 3.0
    }
    
    // MARK: - Cache Constants
    struct Cache {
        static let imagesCacheName = "DovieImagesCache"
        static let maxCacheSize = 100 * 1024 * 1024 // 100MB
        static let maxCacheAge: TimeInterval = 7 * 24 * 60 * 60 // 1 week
    }
    
    // MARK: - Notification Constants
    struct Notifications {
        static let messageReceived = "MessageReceived"
        static let userStatusChanged = "UserStatusChanged"
        static let connectionStatusChanged = "ConnectionStatusChanged"
        static let unreadCountChanged = "UnreadCountChanged"
    }
    
    // MARK: - Social Login
    struct SocialLogin {
        // Google OAuth 설정은 GoogleService-Info.plist에서 읽음
        struct Facebook {
            // Facebook 앱 ID는 환경변수나 설정에서 읽음
            static let permissions = ["public_profile", "email"]
        }
    }
    
    // MARK: - File Types
    struct FileTypes {
        static let images = ["jpg", "jpeg", "png", "gif", "heic", "webp"]
        static let videos = ["mp4", "mov", "avi", "mkv", "webm"]
        static let audio = ["mp3", "wav", "m4a", "aac", "flac"]
        static let documents = ["pdf", "doc", "docx", "txt", "rtf", "pages"]
        static let archives = ["zip", "rar", "7z", "tar", "gz"]
    }
    
    // MARK: - Voice Message
    struct Voice {
        static let sampleRate: Double = 44100
        static let bitRate = 128000
        static let channels = 1
        static let minRecordingDuration: TimeInterval = 1.0
        static let maxRecordingDuration: TimeInterval = 300.0 // 5분
    }
    
    // MARK: - Network
    struct Network {
        static let timeoutInterval: TimeInterval = 30
        static let maxRetryAttempts = 3
        static let retryDelay: TimeInterval = 1.0
    }
}

// MARK: - User Defaults Keys
extension UserDefaults {
    enum Key: String {
        case isFirstLaunch = "isFirstLaunch"
        case selectedLanguage = "selectedLanguage"
        case notificationsEnabled = "notificationsEnabled"
        case soundEnabled = "soundEnabled"
        case vibrationEnabled = "vibrationEnabled"
        case autoDownloadMedia = "autoDownloadMedia"
        case cacheSize = "cacheSize"
        case lastBackupDate = "lastBackupDate"
    }
    
    func set<T>(_ value: T, forKey key: Key) {
        set(value, forKey: key.rawValue)
    }
    
    func object(forKey key: Key) -> Any? {
        return object(forKey: key.rawValue)
    }
    
    func string(forKey key: Key) -> String? {
        return string(forKey: key.rawValue)
    }
    
    func bool(forKey key: Key) -> Bool {
        return bool(forKey: key.rawValue)
    }
    
    func integer(forKey key: Key) -> Int {
        return integer(forKey: key.rawValue)
    }
    
    func double(forKey key: Key) -> Double {
        return double(forKey: key.rawValue)
    }
    
    func removeObject(forKey key: Key) {
        removeObject(forKey: key.rawValue)
    }
}