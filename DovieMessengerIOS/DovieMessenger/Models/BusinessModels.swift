//
//  BusinessModels.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation

struct BusinessPost: Codable, Identifiable {
    let id: Int
    let userId: Int?
    let companyChannelId: Int?
    let content: String
    let imageUrl: String?
    let linkUrl: String?
    let linkTitle: String?
    let linkDescription: String?
    let postType: String
    let isVisible: Bool
    let likesCount: Int
    let commentsCount: Int
    let sharesCount: Int
    let createdAt: Date
    let updatedAt: Date
    
    // 런타임에서 추가되는 정보
    var author: User?
    var isLiked: Bool = false
    var comments: [BusinessPostComment] = []
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case companyChannelId = "company_channel_id"
        case content
        case imageUrl = "image_url"
        case linkUrl = "link_url"
        case linkTitle = "link_title"
        case linkDescription = "link_description"
        case postType = "post_type"
        case isVisible = "is_visible"
        case likesCount = "likes_count"
        case commentsCount = "comments_count"
        case sharesCount = "shares_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case author
        case isLiked = "is_liked"
        case comments
    }
}

struct BusinessPostComment: Codable, Identifiable {
    let id: Int
    let postId: Int
    let userId: Int
    let content: String
    let createdAt: Date
    let updatedAt: Date
    
    var author: User?
    
    enum CodingKeys: String, CodingKey {
        case id
        case postId = "post_id"
        case userId = "user_id"
        case content
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case author
    }
}

struct CompanyChannel: Codable, Identifiable {
    let id: Int
    let name: String
    let description: String?
    let logoUrl: String?
    let website: String?
    let isVerified: Bool
    let createdById: Int?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case logoUrl = "logo_url"
        case website
        case isVerified = "is_verified"
        case createdById = "created_by_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct UserBusinessProfile: Codable, Identifiable {
    let id: Int
    let userId: Int
    let jobTitle: String?
    let company: String?
    let bio: String?
    let website: String?
    let location: String?
    let linkedinUrl: String?
    let industry: String?
    let experienceYears: Int?
    let skills: [String]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case jobTitle = "job_title"
        case company
        case bio
        case website
        case location
        case linkedinUrl = "linkedin_url"
        case industry
        case experienceYears = "experience_years"
        case skills
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CompanyProfile: Codable, Identifiable {
    let id: Int
    let userId: Int
    let companyName: String
    let industry: String?
    let location: String?
    let description: String?
    let website: String?
    let logoUrl: String?
    let bannerUrl: String?
    let employeeCount: String?
    let foundedYear: Int?
    let visitorCount: Int
    let followerCount: Int
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case companyName = "company_name"
        case industry
        case location
        case description
        case website
        case logoUrl = "logo_url"
        case bannerUrl = "banner_url"
        case employeeCount = "employee_count"
        case foundedYear = "founded_year"
        case visitorCount = "visitor_count"
        case followerCount = "follower_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}