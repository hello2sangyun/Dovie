//
//  User.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation

struct User: Codable, Identifiable {
    let id: String
    let username: String
    let displayName: String
    let email: String?
    let phoneNumber: String?
    let profileImageUrl: String?
    let profilePicture: String? // 추가된 필드
    let initials: String // 추가된 필드
    let businessAddress: String? // 추가된 필드
    let isOnline: Bool
    let lastSeen: Date?
    let createdAt: Date
    
    static func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$"
        let emailPredicate = NSPredicate(format:"SELF MATCHES[c] %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    // 이니셜 생성 헬퍼
    var computedInitials: String {
        if !initials.isEmpty {
            return initials
        }
        let names = displayName.split(separator: " ")
        if names.count >= 2 {
            return String(names[0].prefix(1)) + String(names[1].prefix(1))
        } else if !names.isEmpty {
            return String(names[0].prefix(2))
        }
        return "??"
    }
    
    // 프로필 이미지 URL 헬퍼
    var profileImageURL: String? {
        return profileImageUrl ?? profilePicture
    }
}