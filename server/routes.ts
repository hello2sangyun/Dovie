import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertCommandSchema, insertContactSchema, insertChatRoomSchema, insertPhoneVerificationSchema, insertUserPostSchema, insertPostLikeSchema, insertPostCommentSchema, insertCompanyChannelSchema, insertCompanyProfileSchema, locationChatRooms, chatRooms, chatParticipants, userPosts, postLikes, postComments, companyChannels, companyChannelFollowers, companyChannelAdmins, users, businessProfiles, contacts, businessPostReads, businessPosts, businessPostLikes, companyProfiles } from "@shared/schema";
import { sql } from "drizzle-orm";
import { translateText, transcribeAudio } from "./openai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { encryptFileData, decryptFileData, hashFileName } from "./crypto";
import { processCommand } from "./openai";
import { db } from "./db";
import { eq, and, inArray, desc, gte, isNull } from "drizzle-orm";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
});

// WebSocket connection management
const connections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/test-login", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        // 테스트 사용자용 기본 데이터
        const userData = {
          username,
          displayName: username,
          email: `${username}@test.com`, // 테스트용 이메일
          password: "test123", // 테스트용 비밀번호
          isEmailVerified: true,
          isProfileComplete: true, // 테스트 사용자는 프로필 완성 상태
        };
        user = await storage.createUser(userData);
      }

      // Update user as online
      await storage.updateUser(user.id, { isOnline: true });

      res.json({ user });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // SMS 인증 코드 전송
  app.post("/api/auth/send-sms", async (req, res) => {
    try {
      const { phoneNumber, countryCode } = req.body;
      
      if (!phoneNumber || !countryCode) {
        return res.status(400).json({ message: "Phone number and country code are required" });
      }

      // 6자리 인증 코드 생성
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 만료 시간 설정 (5분)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // 기존 미인증 코드 정리
      await storage.cleanupExpiredVerifications();

      // 새 인증 코드 저장
      const verification = await storage.createPhoneVerification({
        phoneNumber,
        countryCode,
        verificationCode,
        expiresAt,
        isVerified: false,
      });

      // 실제 SMS 전송은 여기에 구현 (Twilio, AWS SNS 등)
      // 개발 환경에서는 콘솔에 로그
      console.log(`SMS 인증 코드: ${verificationCode} (${phoneNumber})`);

      res.json({ 
        success: true, 
        message: "인증 코드를 전송했습니다.",
        // 개발용으로만 포함 (프로덕션에서는 제거)
        ...(process.env.NODE_ENV === 'development' && { verificationCode })
      });
    } catch (error) {
      console.error("SMS send error:", error);
      res.status(500).json({ message: "인증 코드 전송에 실패했습니다." });
    }
  });

  // SMS 인증 코드 확인
  app.post("/api/auth/verify-sms", async (req, res) => {
    try {
      const { phoneNumber, verificationCode } = req.body;
      
      if (!phoneNumber || !verificationCode) {
        return res.status(400).json({ message: "Phone number and verification code are required" });
      }

      // 인증 코드 확인
      const verification = await storage.getPhoneVerification(phoneNumber, verificationCode);
      
      if (!verification) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // 인증 코드를 사용됨으로 표시
      await storage.markPhoneVerificationAsUsed(verification.id);

      // 사용자 찾기 또는 생성
      let user = await storage.getUserByUsername(phoneNumber.replace(/[^\d]/g, ''));
      
      if (!user) {
        const userData = insertUserSchema.parse({
          username: `user_${phoneNumber.replace(/[^\d]/g, '').slice(-8)}`,
          displayName: `사용자 ${phoneNumber.slice(-4)}`,
          phoneNumber: phoneNumber,
        });
        user = await storage.createUser(userData);
      }

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(user.id, { isOnline: true, phoneNumber });

      res.json({ user });
    } catch (error) {
      console.error("SMS verify error:", error);
      res.status(500).json({ message: "인증에 실패했습니다." });
    }
  });

  // 회원가입 API
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("Signup request body:", req.body);
      const { email, password, displayName, username } = req.body;
      
      if (!email || !password || !displayName || !username) {
        console.log("Missing fields:", { email: !!email, password: !!password, displayName: !!displayName, username: !!username });
        return res.status(400).json({ message: "모든 필드를 입력해주세요." });
      }

      // 이메일 중복 확인
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log("Email already exists:", email);
        return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      }

      // 사용자명 중복 확인
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        console.log("Username already exists:", username);
        return res.status(400).json({ message: "이미 사용 중인 사용자명입니다." });
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 생성 데이터 준비
      const userData = {
        email,
        password: hashedPassword,
        username,
        displayName,
        isEmailVerified: true,
        isProfileComplete: false,
      };

      console.log("Creating user with data:", { ...userData, password: "[HIDDEN]" });

      // 스키마 검증
      const validatedData = insertUserSchema.parse(userData);
      console.log("Schema validation passed");

      const user = await storage.createUser(validatedData);
      console.log("User created successfully:", { id: user.id, email: user.email });

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(user.id, { isOnline: true });

      res.json({ user });
    } catch (error: any) {
      console.error("Signup error:", error);
      console.error("Error details:", error?.message);
      if (error?.issues) {
        console.error("Validation issues:", error.issues);
      }
      res.status(500).json({ message: "회원가입에 실패했습니다.", error: error?.message || "Unknown error" });
    }
  });

  // 로그인 API
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
      }

      // 사용자 찾기
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "등록되지 않은 이메일입니다." });
      }

      // 비밀번호 확인
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
      }

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(user.id, { isOnline: true });

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "로그인에 실패했습니다." });
    }
  });

  // 로그아웃 API
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      
      if (userId) {
        // 사용자 오프라인 상태 업데이트
        await storage.updateUser(Number(userId), { isOnline: false });
      }

      res.json({ message: "로그아웃되었습니다." });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "로그아웃에 실패했습니다." });
    }
  });

  // 사용자명 중복 체크 API
  app.get("/api/users/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const userId = req.headers["x-user-id"];
      
      if (!username) {
        return res.status(400).json({ message: "사용자명이 필요합니다." });
      }

      const existingUser = await storage.getUserByUsername(username);
      
      // 현재 사용자의 기존 username인 경우는 사용 가능
      const isAvailable = !existingUser || (userId && existingUser.id === Number(userId));
      
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Username check error:", error);
      res.status(500).json({ message: "사용자명 체크에 실패했습니다." });
    }
  });

  // 프로필 업데이트 API
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      if (!userId) {
        return res.status(400).json({ message: "사용자 ID가 필요합니다." });
      }

      // username이 변경되는 경우 중복 체크
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
        }
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      res.json({ user });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "프로필 업데이트에 실패했습니다." });
    }
  });

  // 비즈니스 사용자 등록 API
  app.post("/api/users/register-business", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { businessName, businessAddress } = req.body;
      
      if (!businessName || !businessAddress) {
        return res.status(400).json({ message: "사업장명과 주소를 입력해주세요." });
      }

      const user = await storage.registerBusinessUser(Number(userId), {
        businessName,
        businessAddress
      });

      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      res.json({ user });
    } catch (error) {
      console.error("Business registration error:", error);
      res.status(500).json({ message: "비즈니스 등록에 실패했습니다." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });









  // User routes
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // 사용자 정보 반환
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });



  // Contact routes
  app.get("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const contacts = await storage.getContacts(Number(userId));
      res.json({ contacts });
    } catch (error) {
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { contactUsername, contactUserId, nickname } = req.body;
      console.log("POST /api/contacts - Request body:", { contactUsername, contactUserId, nickname });
      console.log("POST /api/contacts - User ID from header:", userId);
      
      let contactUser;

      // Support both username and userId for adding contacts
      if (contactUserId) {
        console.log("Looking up user by ID:", contactUserId);
        contactUser = await storage.getUser(Number(contactUserId));
        console.log("Found user by ID:", contactUser ? { id: contactUser.id, username: contactUser.username } : null);
      } else if (contactUsername) {
        console.log("Looking up user by username:", contactUsername);
        contactUser = await storage.getUserByUsername(contactUsername);
        console.log("Found user by username:", contactUser ? { id: contactUser.id, username: contactUser.username } : null);
      } else {
        return res.status(400).json({ message: "Either contactUsername or contactUserId is required" });
      }

      if (!contactUser) {
        console.log("User not found - contactUserId:", contactUserId, "contactUsername:", contactUsername);
        return res.status(404).json({ message: "User not found" });
      }

      // 자기 자신을 친구로 추가하려는 경우 방지
      if (contactUser.id === Number(userId)) {
        return res.status(400).json({ message: "Cannot add yourself as a contact" });
      }

      // 이미 친구로 추가된 사용자인지 확인
      const existingContacts = await storage.getContacts(Number(userId));
      const isDuplicate = existingContacts.some((contact: any) => contact.contactUserId === contactUser.id);
      
      if (isDuplicate) {
        return res.status(409).json({ message: "This user is already in your contacts" });
      }

      const contactData = insertContactSchema.parse({
        userId: Number(userId),
        contactUserId: contactUser.id,
        nickname,
      });

      console.log("Creating contact with data:", contactData);
      const contact = await storage.addContact(contactData);
      console.log("Contact created successfully:", contact);
      res.json({ contact });
    } catch (error) {
      console.error("Error adding contact:", error);
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  app.patch("/api/contacts/:contactId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const contactId = Number(req.params.contactId);
      const updates = req.body;
      
      const updatedContact = await storage.updateContact(Number(userId), contactId, updates, true);
      
      if (!updatedContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json({ contact: updatedContact });
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:contactUserId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.removeContact(Number(userId), Number(req.params.contactUserId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove contact" });
    }
  });

  // Block contact route
  app.post("/api/contacts/:contactUserId/block", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.blockContact(Number(userId), Number(req.params.contactUserId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error blocking contact:", error);
      res.status(500).json({ message: "Failed to block contact" });
    }
  });

  // Unblock contact route
  app.post("/api/contacts/:contactUserId/unblock", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.unblockContact(Number(userId), Number(req.params.contactUserId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error unblocking contact:", error);
      res.status(500).json({ message: "Failed to unblock contact" });
    }
  });

  // Get blocked contacts route
  app.get("/api/contacts/blocked", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const contacts = await storage.getBlockedContacts(Number(userId));
      res.json({ contacts });
    } catch (error) {
      console.error("Error getting blocked contacts:", error);
      res.status(500).json({ message: "Failed to get blocked contacts" });
    }
  });

  // Business card routes
  app.get("/api/business-cards/:userId?", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const targetUserId = req.params.userId && !isNaN(Number(req.params.userId)) ? Number(req.params.userId) : Number(userId);
      const businessCard = await storage.getBusinessCard(targetUserId);
      res.json({ businessCard });
    } catch (error) {
      console.error("Error fetching business card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });

  app.post("/api/business-cards", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const businessCard = await storage.createOrUpdateBusinessCard(Number(userId), req.body);
      res.json({ businessCard });
    } catch (error) {
      console.error("Error updating business card:", error);
      res.status(500).json({ message: "Failed to update business card" });
    }
  });

  // Business profile routes
  app.get("/api/business-profiles/:userId?", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const targetUserId = req.params.userId ? Number(req.params.userId) : Number(userId);
      const businessProfile = await storage.getBusinessProfile(targetUserId);
      res.json({ businessProfile });
    } catch (error) {
      console.error("Error fetching business profile:", error);
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  app.post("/api/business-profiles", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const businessProfile = await storage.createOrUpdateBusinessProfile(Number(userId), req.body);
      res.json({ businessProfile });
    } catch (error) {
      console.error("Error updating business profile:", error);
      res.status(500).json({ message: "Failed to update business profile" });
    }
  });

  // Business card sharing routes
  app.post("/api/business-cards/share", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const share = await storage.createBusinessCardShare(Number(userId));
      const shareUrl = `${req.protocol}://${req.get('host')}/business-card/${share.shareToken}`;
      res.json({ share, shareUrl });
    } catch (error) {
      console.error("Error creating share link:", error);
      res.status(500).json({ message: "Failed to create share link" });
    }
  });

  app.get("/api/business-cards/share-info", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const share = await storage.getBusinessCardShareInfo(Number(userId));
      if (share) {
        const shareUrl = `${req.protocol}://${req.get('host')}/business-card/${share.shareToken}`;
        res.json({ ...share, shareUrl });
      } else {
        res.json({ shareUrl: null });
      }
    } catch (error) {
      console.error("Error fetching share info:", error);
      res.status(500).json({ message: "Failed to fetch share info" });
    }
  });

  app.get("/business-card/:shareToken", async (req, res) => {
    try {
      const share = await storage.getBusinessCardShare(req.params.shareToken);
      if (!share) {
        return res.status(404).send("Business card not found");
      }

      const businessCard = await storage.getBusinessCard(share.userId);
      const user = await storage.getUser(share.userId);
      
      // Enhanced HTML page for business card viewing with contact save functionality
      const html = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <title>${businessCard?.fullName || user?.displayName || '명함'} - 디지털 명함</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="${businessCard?.fullName || user?.displayName}님의 디지털 명함입니다.">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 400px; 
              width: 100%; 
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .avatar {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background: rgba(255,255,255,0.3);
              margin: 0 auto 15px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: bold;
            }
            .name { font-size: 24px; font-weight: 600; margin-bottom: 5px; }
            .title { font-size: 16px; opacity: 0.9; margin-bottom: 5px; }
            .company { font-size: 14px; opacity: 0.8; }
            .content { padding: 25px 20px; }
            .contact-item {
              display: flex;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .contact-item:last-child { border-bottom: none; }
            .contact-icon {
              width: 20px;
              height: 20px;
              margin-right: 15px;
              opacity: 0.7;
            }
            .contact-text {
              flex: 1;
              font-size: 14px;
              color: #333;
            }
            .contact-link {
              color: #667eea;
              text-decoration: none;
            }
            .description {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #f0f0f0;
              font-size: 14px;
              line-height: 1.5;
              color: #666;
            }
            .save-button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .save-button:hover {
              transform: translateY(-2px);
            }
            .save-button:active {
              transform: translateY(0);
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="avatar">${(businessCard?.fullName || user?.displayName || 'N')[0].toUpperCase()}</div>
              <div class="name">${businessCard?.fullName || user?.displayName || '이름 없음'}</div>
              <div class="title">${businessCard?.jobTitle || '직책 정보 없음'}</div>
              <div class="company">${businessCard?.companyName || '회사 정보 없음'}</div>
            </div>
            
            <div class="content">
              ${businessCard?.email ? `
                <div class="contact-item">
                  <div class="contact-icon">📧</div>
                  <div class="contact-text">
                    <a href="mailto:${businessCard.email}" class="contact-link">${businessCard.email}</a>
                  </div>
                </div>
              ` : ''}
              
              ${businessCard?.phoneNumber ? `
                <div class="contact-item">
                  <div class="contact-icon">📞</div>
                  <div class="contact-text">
                    <a href="tel:${businessCard.phoneNumber}" class="contact-link">${businessCard.phoneNumber}</a>
                  </div>
                </div>
              ` : ''}
              
              ${businessCard?.website ? `
                <div class="contact-item">
                  <div class="contact-icon">🌐</div>
                  <div class="contact-text">
                    <a href="${businessCard.website}" target="_blank" class="contact-link">${businessCard.website}</a>
                  </div>
                </div>
              ` : ''}
              
              ${businessCard?.address ? `
                <div class="contact-item">
                  <div class="contact-icon">📍</div>
                  <div class="contact-text">${businessCard.address}</div>
                </div>
              ` : ''}
              
              ${businessCard?.description ? `
                <div class="description">${businessCard.description}</div>
              ` : ''}
              
              <button class="save-button" onclick="saveContact()">
                📱 연락처에 저장하기
              </button>
            </div>
            
            <div class="footer">
              Dovie Messenger - 디지털 명함
            </div>
          </div>

          <script>
            function saveContact() {
              const vcard = \`BEGIN:VCARD
VERSION:3.0
FN:${businessCard?.fullName || user?.displayName || ''}
ORG:${businessCard?.companyName || ''}
TITLE:${businessCard?.jobTitle || ''}
EMAIL:${businessCard?.email || ''}
TEL:${businessCard?.phoneNumber || ''}
URL:${businessCard?.website || ''}
ADR:;;${businessCard?.address || ''};;;;
NOTE:${businessCard?.description || ''}
END:VCARD\`;
              
              const blob = new Blob([vcard], { type: 'text/vcard' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = '${(businessCard?.fullName || user?.displayName || 'contact').replace(/[^a-zA-Z0-9가-힣]/g, '_')}.vcf';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              
              // Show success message
              const button = document.querySelector('.save-button');
              const originalText = button.innerHTML;
              button.innerHTML = '✅ 연락처가 저장되었습니다!';
              button.style.background = '#28a745';
              setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("Error displaying business card:", error);
      res.status(500).send("Error loading business card");
    }
  });

  // NFC exchange routes
  app.post("/api/nfc/start-exchange", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Generate unique exchange token
      const exchangeToken = Array.from({ length: 32 }, () => 
        Math.random().toString(36).charAt(2)
      ).join('');

      const exchange = await storage.createNfcExchange(Number(userId), exchangeToken);
      
      res.json({ 
        exchange, 
        exchangeToken,
        exchangeUrl: `${req.protocol}://${req.get('host')}/nfc-exchange/${exchangeToken}`
      });
    } catch (error) {
      console.error("Error starting NFC exchange:", error);
      res.status(500).json({ message: "Failed to start NFC exchange" });
    }
  });

  app.post("/api/nfc/complete-exchange", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { exchangeToken } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!exchangeToken) {
      return res.status(400).json({ message: "Exchange token is required" });
    }

    try {
      const completedExchange = await storage.completeNfcExchange(exchangeToken, Number(userId));
      
      if (!completedExchange) {
        return res.status(404).json({ message: "Exchange not found or already completed" });
      }

      // Get user info for both parties
      const [initiator, recipient] = await Promise.all([
        storage.getUser(completedExchange.initiatorUserId),
        storage.getUser(completedExchange.recipientUserId!)
      ]);

      res.json({ 
        success: true,
        exchange: completedExchange,
        message: `${initiator?.displayName}님과 ${recipient?.displayName}님이 서로 친구로 추가되었습니다!`,
        initiator: { id: initiator?.id, displayName: initiator?.displayName },
        recipient: { id: recipient?.id, displayName: recipient?.displayName }
      });
    } catch (error) {
      console.error("Error completing NFC exchange:", error);
      res.status(500).json({ message: "Failed to complete NFC exchange" });
    }
  });

  app.get("/nfc-exchange/:exchangeToken", async (req, res) => {
    const { exchangeToken } = req.params;
    
    try {
      // This endpoint serves a simple page for NFC exchange completion
      const html = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <title>명함 교환 - Dovie Messenger</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 400px; 
              width: 100%; 
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              padding: 30px 20px;
              text-align: center;
            }
            .icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              color: white;
            }
            h1 { font-size: 24px; margin-bottom: 10px; color: #333; }
            p { color: #666; margin-bottom: 20px; line-height: 1.5; }
            .button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              margin: 10px 0;
            }
            .status { margin-top: 20px; padding: 15px; border-radius: 8px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>명함 교환</h1>
            <p>다른 사용자가 명함을 공유했습니다. 교환을 완료하여 서로 친구로 추가하세요!</p>
            
            <button class="button" onclick="completeExchange()">
              명함 교환 완료하기
            </button>
            
            <div id="status"></div>
          </div>

          <script>
            async function completeExchange() {
              const button = document.querySelector('.button');
              const status = document.getElementById('status');
              
              button.disabled = true;
              button.textContent = '교환 중...';
              
              try {
                // In a real implementation, this would need authentication
                // For now, we'll show a message directing to the app
                status.innerHTML = '<div class="success">Dovie Messenger 앱에서 로그인한 후 이 링크를 다시 클릭해주세요.</div>';
              } catch (error) {
                status.innerHTML = '<div class="error">교환 중 오류가 발생했습니다.</div>';
              } finally {
                button.disabled = false;
                button.textContent = '명함 교환 완료하기';
              }
            }
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("Error displaying NFC exchange page:", error);
      res.status(500).send("Error loading exchange page");
    }
  });

  // User posts routes
  app.get("/api/user-posts/:userId?", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const targetUserId = req.params.userId ? Number(req.params.userId) : Number(userId);
      const posts = await storage.getUserPosts(targetUserId);
      res.json({ posts });
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.post("/api/user-posts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const post = await storage.createUserPost(Number(userId), req.body);
      res.json({ post });
    } catch (error) {
      console.error("Error creating user post:", error);
      res.status(500).json({ message: "Failed to create user post" });
    }
  });

  // Chat room routes
  app.get("/api/chat-rooms", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const chatRooms = await storage.getChatRooms(Number(userId));
      res.json({ chatRooms });
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat rooms" });
    }
  });

  app.post("/api/chat-rooms", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { name, participantIds, isGroup } = req.body;
      const chatRoomData = insertChatRoomSchema.parse({
        name,
        isGroup: isGroup || false,
        createdBy: Number(userId),
      });

      const allParticipants = [Number(userId), ...participantIds];
      const chatRoom = await storage.createChatRoom(chatRoomData, allParticipants);
      res.json({ chatRoom });
    } catch (error) {
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  app.delete("/api/chat-rooms/:chatRoomId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.deleteChatRoom(Number(req.params.chatRoomId), Number(userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat room" });
    }
  });

  app.patch("/api/chat-rooms/:chatRoomId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { name } = req.body;
      const chatRoom = await storage.updateChatRoom(Number(req.params.chatRoomId), { name });
      res.json({ chatRoom });
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat room" });
    }
  });

  app.post("/api/chat-rooms/:chatRoomId/leave", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { saveFiles } = req.body;
      console.log(`User ${userId} leaving chat room ${req.params.chatRoomId}, saveFiles: ${saveFiles}`);
      
      await storage.leaveChatRoom(Number(req.params.chatRoomId), Number(userId), saveFiles);
      
      // 나가기 메시지는 채팅방이 삭제되지 않은 경우에만 전송
      try {
        const chatRoom = await storage.getChatRoomById(Number(req.params.chatRoomId));
        if (chatRoom) {
          const messageData = {
            chatRoomId: Number(req.params.chatRoomId),
            senderId: Number(userId),
            content: `사용자가 채팅방을 나갔습니다.`,
            messageType: "system" as const,
          };
          const leaveMessage = await storage.createMessage(messageData);

          // WebSocket으로 알림
          broadcastToRoom(Number(req.params.chatRoomId), {
            type: "message",
            message: leaveMessage,
          });
        }
      } catch (messageError) {
        // 메시지 전송 실패는 무시 (채팅방이 이미 삭제된 경우)
        console.log("Could not send leave message (chat room may have been deleted)");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to leave chat room:", error);
      res.status(500).json({ message: "Failed to leave chat room" });
    }
  });

  // Message routes
  app.get("/api/chat-rooms/:chatRoomId/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(Number(req.params.chatRoomId));
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/chat-rooms/:chatRoomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Message creation - Request body:", JSON.stringify(req.body, null, 2));
      console.log("Message creation - Chat room ID:", req.params.chatRoomId);
      console.log("Message creation - User ID:", userId);
      
      const messageData = insertMessageSchema.parse({
        chatRoomId: Number(req.params.chatRoomId),
        senderId: Number(userId),
        ...req.body,
      });

      console.log("Message creation - Parsed data:", JSON.stringify(messageData, null, 2));
      const message = await storage.createMessage(messageData);
      const messageWithSender = await storage.getMessageById(message.id);

      // Handle mentions if present
      if (messageData.mentionedUserIds || messageData.mentionAll) {
        // Create mention notifications
        const chatRoom = await storage.getChatRoomById(Number(req.params.chatRoomId));
        
        if (messageData.mentionAll && chatRoom?.participants) {
          // Notify all participants except sender
          const participantIds = chatRoom.participants
            .filter((p: any) => p.id !== Number(userId))
            .map((p: any) => p.id);
          
          for (const participantId of participantIds) {
            broadcastToUser(participantId, {
              type: "mention_notification",
              message: messageWithSender,
              mentionType: "all"
            });
          }
        } else if (messageData.mentionedUserIds) {
          // Notify specific mentioned users
          const mentionedIds = JSON.parse(messageData.mentionedUserIds);
          for (const mentionedId of mentionedIds) {
            if (mentionedId !== Number(userId)) {
              broadcastToUser(mentionedId, {
                type: "mention_notification",
                message: messageWithSender,
                mentionType: "user"
              });
            }
          }
        }
      }

      // Broadcast to WebSocket connections
      broadcastToRoom(Number(req.params.chatRoomId), {
        type: "new_message",
        message: messageWithSender,
      });

      res.json({ message: messageWithSender });
    } catch (error: any) {
      console.error("Message creation error:", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        issues: error?.issues
      });
      res.status(500).json({ 
        message: "Failed to send message", 
        error: error?.message || String(error),
        details: error?.issues || null
      });
    }
  });

  // Edit message route
  app.put("/api/chat-rooms/:chatRoomId/messages/:messageId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content } = req.body;
      const messageId = Number(req.params.messageId);
      const chatRoomId = Number(req.params.chatRoomId);

      // Get the message to verify ownership
      const message = await storage.getMessageById(messageId);
      if (!message || message.senderId !== Number(userId)) {
        return res.status(403).json({ message: "Not authorized to edit this message" });
      }

      // Update the message content and mark as edited
      const updatedMessage = await storage.updateMessage(messageId, {
        content,
        isEdited: true,
        editedAt: new Date()
      });

      res.json({ message: updatedMessage });
    } catch (error) {
      console.error("Message edit error:", error);
      res.status(500).json({ message: "Failed to edit message" });
    }
  });

  // Voice file upload route (unencrypted for direct browser playback)
  app.post("/api/upload-voice", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 음성 파일은 암호화하지 않고 원본 형태로 저장
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `voice_${timestamp}_${randomString}.webm`;
      const finalPath = path.join(uploadDir, fileName);
      
      // 파일을 최종 위치로 이동
      fs.renameSync(req.file.path, finalPath);

      const fileUrl = `/uploads/${fileName}`;
      res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error("Voice file upload error:", error);
      res.status(500).json({ message: "Voice file upload failed" });
    }
  });

  // File upload route with encryption (for non-voice files)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 파일 내용을 읽어서 암호화
      const fileBuffer = fs.readFileSync(req.file.path);
      const encryptedData = encryptFileData(fileBuffer);
      
      // 암호화된 파일명 생성
      const encryptedFileName = hashFileName(req.file.originalname);
      const encryptedFilePath = path.join(uploadDir, encryptedFileName);
      
      // 암호화된 데이터를 파일로 저장
      fs.writeFileSync(encryptedFilePath, encryptedData, 'utf8');
      
      // 원본 임시 파일 삭제
      fs.unlinkSync(req.file.path);

      const fileUrl = `/uploads/${encryptedFileName}`;
      res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Text file creation endpoint for message saving with encryption
  app.post("/api/create-text-file", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content, fileName } = req.body;
      if (!content || !fileName) {
        return res.status(400).json({ message: "Content and fileName are required" });
      }

      // 텍스트 내용을 Buffer로 변환 후 암호화
      const contentBuffer = Buffer.from(content, 'utf8');
      const encryptedData = encryptFileData(contentBuffer);
      
      // 암호화된 파일명 생성
      const safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_') + '.txt';
      const encryptedFileName = hashFileName(safeFileName);
      const filePath = path.join(uploadDir, encryptedFileName);
      
      // 암호화된 데이터를 파일로 저장
      await fs.promises.writeFile(filePath, encryptedData, 'utf8');
      
      const fileStats = await fs.promises.stat(filePath);
      const fileUrl = `/uploads/${encryptedFileName}`;

      res.json({
        fileUrl,
        fileName: safeFileName,
        fileSize: contentBuffer.length, // 원본 크기 반환
      });
    } catch (error) {
      console.error('Text file creation error:', error);
      res.status(500).json({ message: "Text file creation failed" });
    }
  });

  // Serve files (both encrypted and unencrypted)
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadDir, filename);
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // 음성 파일인지 확인 (voice_로 시작하는 파일명)
      const isVoiceFile = filename.startsWith('voice_') && filename.endsWith('.webm');
      
      if (isVoiceFile) {
        // 음성 파일은 암호화되지 않았으므로 직접 제공
        const fileBuffer = fs.readFileSync(filePath);
        
        res.set({
          'Content-Type': 'audio/webm',
          'Content-Length': fileBuffer.length,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000'
        });
        
        res.send(fileBuffer);
      } else {
        try {
          // 파일이 암호화되었는지 확인 후 처리
          let decryptedBuffer: Buffer;
          
          try {
            // 먼저 암호화된 텍스트로 읽기 시도
            const encryptedData = fs.readFileSync(filePath, 'utf8');
            decryptedBuffer = decryptFileData(encryptedData);
          } catch (decryptError) {
            // 복호화 실패시 바이너리로 읽기 (암호화되지 않은 파일)
            decryptedBuffer = fs.readFileSync(filePath);
          }
          
          // 파일 확장자에 따른 Content-Type 설정
          const ext = path.extname(filename).toLowerCase();
          let contentType = 'application/octet-stream';
          
          if (ext === '.txt') contentType = 'text/plain; charset=utf-8';
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.gif') contentType = 'image/gif';
          else if (ext === '.webp') contentType = 'image/webp';
          else if (ext === '.bmp') contentType = 'image/bmp';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          else if (ext === '.mp4') contentType = 'video/mp4';
          else if (ext === '.webm') contentType = 'video/webm';
          else if (ext === '.mov') contentType = 'video/quicktime';
          else if (ext === '.avi') contentType = 'video/x-msvideo';
          else if (ext === '.pdf') contentType = 'application/pdf';
          
          res.set({
            'Content-Type': contentType,
            'Content-Length': decryptedBuffer.length,
            'Cache-Control': 'public, max-age=31536000',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin'
          });
          
          res.send(decryptedBuffer);
        } catch (decryptError) {
          console.error('File decryption error:', decryptError);
          // 복호화 실패시 원본 파일을 직접 제공 시도
          try {
            const fileBuffer = fs.readFileSync(filePath);
            const ext = path.extname(filename).toLowerCase();
            let contentType = 'application/octet-stream';
            
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.webp') contentType = 'image/webp';
            
            res.set({
              'Content-Type': contentType,
              'Content-Length': fileBuffer.length,
              'Cache-Control': 'public, max-age=31536000',
              'Access-Control-Allow-Origin': '*',
              'Cross-Origin-Resource-Policy': 'cross-origin'
            });
            
            res.send(fileBuffer);
          } catch (fallbackError) {
            console.error('Fallback file serving error:', fallbackError);
            return res.status(500).json({ message: "File processing error" });
          }
        }
      }
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Message read tracking routes
  app.post("/api/chat-rooms/:chatRoomId/mark-read", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { lastMessageId } = req.body;
      await storage.markMessagesAsRead(Number(userId), Number(req.params.chatRoomId), lastMessageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  app.get("/api/unread-counts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const unreadCounts = await storage.getUnreadCounts(Number(userId));
      res.json({ unreadCounts });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread counts" });
    }
  });

  // Command routes
  app.get("/api/commands", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { chatRoomId, search } = req.query;
      let commands;
      
      if (search) {
        commands = await storage.searchCommands(Number(userId), String(search));
      } else {
        commands = await storage.getCommands(Number(userId), chatRoomId ? Number(chatRoomId) : undefined);
      }
      
      res.json({ commands });
    } catch (error) {
      res.status(500).json({ message: "Failed to get commands" });
    }
  });

  app.post("/api/commands", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Command creation request body:", req.body);
      
      const commandData = insertCommandSchema.parse({
        userId: Number(userId),
        ...req.body,
      });

      console.log("Parsed command data:", commandData);

      // Check for duplicate command name in the same chat room
      const existingCommand = await storage.getCommandByName(
        Number(userId),
        commandData.chatRoomId,
        commandData.commandName
      );

      if (existingCommand) {
        return res.status(409).json({ message: "Command name already exists in this chat room" });
      }

      const command = await storage.createCommand(commandData);
      console.log("Command created successfully:", command);
      res.json({ command });
    } catch (error) {
      console.error("Command creation error:", error);
      res.status(500).json({ message: "Failed to create command" });
    }
  });

  app.delete("/api/commands/:commandId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.deleteCommand(Number(req.params.commandId), Number(userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete command" });
    }
  });

  // Process chat commands
  app.post("/api/commands/process", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { commandText } = req.body;
      if (!commandText || !commandText.startsWith('/')) {
        return res.status(400).json({ message: "Invalid command format" });
      }

      const result = await processCommand(commandText);
      res.json(result);
    } catch (error) {
      console.error("Command processing error:", error);
      res.status(500).json({ 
        success: false,
        content: "Command processing failed. Please check if OpenAI API key is configured.",
        type: 'text'
      });
    }
  });

  // Translation API endpoint
  app.post("/api/translate", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ 
          success: false,
          message: "Text and target language are required" 
        });
      }
      
      // Language code mapping
      const languageNames = {
        ko: "Korean",
        en: "English", 
        hu: "Hungarian",
        de: "German"
      };
      
      const targetLanguageName = languageNames[targetLanguage as keyof typeof languageNames] || targetLanguage;
      const result = await translateText(text, targetLanguageName);
      
      if (result.success) {
        res.json({
          success: true,
          translatedText: result.content
        });
      } else {
        res.status(500).json({
          success: false,
          message: "번역에 실패했습니다."
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({
        success: false,
        message: "번역 서비스에 연결할 수 없습니다."
      });
    }
  });

  // Get blocked contacts
  app.get("/api/contacts/blocked", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const blockedContacts = await db.select({
        id: contacts.id,
        blockedUserId: contacts.contactUserId,
        blockedAt: contacts.createdAt,
        blockedUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
        },
      })
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(and(
        eq(contacts.userId, parseInt(userId as string)),
        eq(contacts.isBlocked, true)
      ));

      res.json({ blockedContacts });
    } catch (error) {
      console.error("Error fetching blocked contacts:", error);
      res.status(500).json({ message: "차단된 연락처를 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Unblock contact
  app.post("/api/contacts/:contactUserId/unblock", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { contactUserId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await db.update(contacts)
        .set({ isBlocked: false })
        .where(and(
          eq(contacts.userId, parseInt(userId as string)),
          eq(contacts.contactUserId, parseInt(contactUserId))
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Error unblocking contact:", error);
      res.status(500).json({ message: "연락처 차단 해제 중 오류가 발생했습니다." });
    }
  });

  // Business Feed API - 친구들의 비즈니스 피드 가져오기
  app.get("/api/business/feed", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // 내 연락처 중 친구 관계인 사용자들의 비즈니스 포스트 가져오기
      const friendIds = await db.select({ friendId: contacts.contactUserId })
        .from(contacts)
        .where(and(
          eq(contacts.userId, parseInt(userId as string)),
          eq(contacts.isBlocked, false)
        ));

      const friendIdList = friendIds.map(f => f.friendId);
      friendIdList.push(parseInt(userId as string)); // 내 포스트도 포함

      const posts = await db.select({
        id: spacePosts.id,
        userId: spacePosts.userId,
        companyChannelId: spacePosts.companyChannelId,
        content: spacePosts.content,
        imageUrl: spacePosts.imageUrl,
        linkUrl: spacePosts.linkUrl,
        linkTitle: spacePosts.linkTitle,
        linkDescription: spacePosts.linkDescription,
        postType: spacePosts.postType,
        likesCount: spacePosts.likesCount,
        commentsCount: spacePosts.commentsCount,
        sharesCount: spacePosts.sharesCount,
        createdAt: spacePosts.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
        },
        companyChannel: {
          id: spaceCompanyChannels.id,
          name: spaceCompanyChannels.companyName,
          logoUrl: spaceCompanyChannels.logo,
          isVerified: spaceCompanyChannels.isVerified,
        }
      })
      .from(spacePosts)
      .innerJoin(users, eq(spacePosts.userId, users.id))
      .leftJoin(spaceCompanyChannels, eq(spacePosts.companyChannelId, spaceCompanyChannels.id))
      .where(
        and(
          eq(spacePosts.isVisible, true),
          inArray(spacePosts.userId, friendIdList)
        )
      )
      .orderBy(desc(spacePosts.createdAt))
      .limit(limit)
      .offset(offset);

      // 각 포스트에 대해 현재 사용자의 좋아요 여부 확인
      const postsWithLikes = await Promise.all(posts.map(async (post) => {
        const [userLike] = await db.select()
          .from(businessPostLikes)
          .where(and(
            eq(businessPostLikes.postId, post.id),
            eq(businessPostLikes.userId, parseInt(userId as string))
          ))
          .limit(1);

        return {
          ...post,
          isLiked: !!userLike,
        };
      }));

      res.json({ posts: postsWithLikes });
    } catch (error) {
      console.error("Error fetching business feed:", error);
      res.status(500).json({ message: "비즈니스 피드를 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 비즈니스 포스트 작성
  app.post("/api/business/posts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content, postType = 'personal', companyChannelId } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "포스트 내용이 필요합니다." });
      }

      const [newPost] = await db.insert(businessPosts)
        .values({
          userId: parseInt(userId as string),
          content: content.trim(),
          postType,
          companyChannelId: companyChannelId ? parseInt(companyChannelId) : undefined,
        })
        .returning();

      res.json({ post: newPost });
    } catch (error) {
      console.error("Error creating business post:", error);
      res.status(500).json({ message: "포스트 작성 중 오류가 발생했습니다." });
    }
  });

  // 특정 사용자의 비즈니스 포스트 가져오기
  app.get("/api/business-posts/:userId", async (req, res) => {
    const currentUserId = req.headers["x-user-id"];
    const { userId } = req.params;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const posts = await db.select({
        id: userPosts.id,
        userId: userPosts.userId,
        title: userPosts.title,
        content: userPosts.content,
        postType: userPosts.postType,
        attachments: userPosts.attachments,
        visibility: userPosts.visibility,
        tags: userPosts.tags,
        likeCount: userPosts.likeCount,
        commentCount: userPosts.commentCount,
        shareCount: userPosts.shareCount,
        isPinned: userPosts.isPinned,
        createdAt: userPosts.createdAt,
        updatedAt: userPosts.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
        }
      })
      .from(userPosts)
      .innerJoin(users, eq(userPosts.userId, users.id))
      .where(eq(userPosts.userId, parseInt(userId)))
      .orderBy(desc(userPosts.createdAt));

      res.json(posts);
    } catch (error) {
      console.error("Error fetching user business posts:", error);
      res.status(500).json({ message: "Failed to fetch business posts" });
    }
  });

  // 비즈니스 포스트 좋아요/좋아요 취소
  app.post("/api/business/posts/:postId/like", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [existingLike] = await db.select()
        .from(businessPostLikes)
        .where(and(
          eq(businessPostLikes.postId, parseInt(postId)),
          eq(businessPostLikes.userId, parseInt(userId as string))
        ))
        .limit(1);

      if (existingLike) {
        // 좋아요 취소
        await db.delete(businessPostLikes)
          .where(and(
            eq(businessPostLikes.postId, parseInt(postId)),
            eq(businessPostLikes.userId, parseInt(userId as string))
          ));

        // 좋아요 수 감소
        await db.update(businessPosts)
          .set({ 
            likesCount: sql`${businessPosts.likesCount} - 1`
          })
          .where(eq(businessPosts.id, parseInt(postId)));

        res.json({ liked: false });
      } else {
        // 좋아요 추가
        await db.insert(businessPostLikes)
          .values({
            postId: parseInt(postId),
            userId: parseInt(userId as string),
          });

        // 좋아요 수 증가
        await db.update(businessPosts)
          .set({ 
            likesCount: sql`${businessPosts.likesCount} + 1`
          })
          .where(eq(businessPosts.id, parseInt(postId)));

        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ message: "좋아요 처리 중 오류가 발생했습니다." });
    }
  });

  // 추천 회사 채널 가져오기
  app.get("/api/business/companies/suggested", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // 승인된 회사 채널들 중 팔로우하지 않은 것들을 가져오기
      const companies = await db.select({
        id: companyChannels.id,
        name: companyChannels.name,
        description: companyChannels.description,
        logoUrl: companyChannels.logoUrl,
        isVerified: companyChannels.isVerified,
        followersCount: sql<number>`(
          SELECT COUNT(*) FROM ${companyChannelFollowers} 
          WHERE ${companyChannelFollowers.channelId} = ${companyChannels.id}
        )`.as('followersCount'),
      })
      .from(companyChannels)
      .where(eq(companyChannels.isVerified, true))
      .limit(5);

      res.json({ companies });
    } catch (error) {
      console.error("Error fetching suggested companies:", error);
      res.status(500).json({ message: "추천 회사를 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 회사 채널 생성
  app.post("/api/business/companies", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { name, description, website } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "회사명이 필요합니다." });
      }

      const [newCompany] = await db.insert(companyChannels)
        .values({
          name: name.trim(),
          description: description?.trim(),
          website: website?.trim(),
          createdById: parseInt(userId as string),
          isVerified: false, // 관리자 승인 필요
        })
        .returning();

      // 생성자를 관리자로 추가
      await db.insert(companyChannelAdmins)
        .values({
          channelId: newCompany.id,
          userId: parseInt(userId as string),
          role: 'admin',
        });

      res.json({ company: newCompany });
    } catch (error) {
      console.error("Error creating company channel:", error);
      res.status(500).json({ message: "회사 채널 생성 중 오류가 발생했습니다." });
    }
  });

  // 회사 채널 팔로우/언팔로우
  app.post("/api/business/companies/:companyId/follow", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { companyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [existingFollow] = await db.select()
        .from(companyChannelFollowers)
        .where(and(
          eq(companyChannelFollowers.channelId, parseInt(companyId)),
          eq(companyChannelFollowers.userId, parseInt(userId as string))
        ))
        .limit(1);

      if (existingFollow) {
        // 언팔로우
        await db.delete(companyChannelFollowers)
          .where(and(
            eq(companyChannelFollowers.channelId, parseInt(companyId)),
            eq(companyChannelFollowers.userId, parseInt(userId as string))
          ));

        res.json({ following: false });
      } else {
        // 팔로우
        await db.insert(companyChannelFollowers)
          .values({
            channelId: parseInt(companyId),
            userId: parseInt(userId as string),
          });

        res.json({ following: true });
      }
    } catch (error) {
      console.error("Error toggling company follow:", error);
      res.status(500).json({ message: "팔로우 처리 중 오류가 발생했습니다." });
    }
  });

  // Search company pages for Business Space
  app.get("/api/space/companies", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { search } = req.query;
    
    try {
      // Mock company data for demonstration
      // In a real application, this would query a companies database table
      const mockCompanies = [
        {
          id: 1,
          name: "테크스타트업",
          description: "혁신적인 기술 솔루션을 제공하는 스타트업",
          followerCount: 1250,
          isVerified: true,
          logo: null
        },
        {
          id: 2,
          name: "글로벌 소프트웨어",
          description: "전 세계를 연결하는 소프트웨어 개발",
          followerCount: 3400,
          isVerified: true,
          logo: null
        },
        {
          id: 3,
          name: "디지털 마케팅 에이전시",
          description: "창의적인 디지털 마케팅 전문",
          followerCount: 890,
          isVerified: false,
          logo: null
        }
      ];

      let companies = mockCompanies;
      
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        companies = mockCompanies.filter(company =>
          company.name.toLowerCase().includes(searchTerm) ||
          company.description.toLowerCase().includes(searchTerm)
        );
      }

      res.json({ companies });
    } catch (error) {
      console.error("Company search error:", error);
      res.status(500).json({ message: "회사 검색 중 오류가 발생했습니다." });
    }
  });

  // Audio transcription endpoint for voice messages
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file uploaded"
      });
    }

    console.log("Processing audio file:", req.file.originalname, req.file.size, "bytes");

    // Pass the file directly to transcribeAudio function
    const result = await transcribeAudio(req.file.path);
    
    // 음성 파일을 uploads 폴더에 저장하고 URL 생성
    const audioFileName = `voice_${Date.now()}.webm`;
    const audioPath = path.join('uploads', audioFileName);
    
    // 음성 파일을 영구 저장
    fs.copyFileSync(req.file.path, audioPath);
    const audioUrl = `/uploads/${audioFileName}`;
    
    console.log("Audio file saved:", audioPath, "URL:", audioUrl);
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    if (result.success) {
      res.json({
        success: true,
        transcription: result.transcription,
        duration: result.duration,
        detectedLanguage: result.detectedLanguage,
        confidence: result.confidence,
        audioUrl: audioUrl
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "음성 변환에 실패했습니다."
      });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const encryptedData = encryptFileData(fileBuffer);
      const encryptedFileName = hashFileName(req.file.originalname);
      const encryptedFilePath = path.join(uploadDir, encryptedFileName);

      await fs.promises.writeFile(encryptedFilePath, encryptedData, 'utf8');
      fs.unlinkSync(req.file.path); // 임시 파일 삭제

      res.json({
        fileUrl: `/uploads/${encryptedFileName}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // File decryption route for profile pictures and other encrypted files
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // 파일 확장자로 MIME 타입 결정
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.wav') contentType = 'audio/wav';
      else if (ext === '.webm') contentType = 'audio/webm';
      else if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.txt') contentType = 'text/plain';

      // 음성 파일인 경우 원본 그대로 서빙 (암호화하지 않음)
      if (filename.startsWith('voice_')) {
        const rawData = await fs.promises.readFile(filePath);
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(rawData);
        return;
      }

      // 일반 파일의 경우 복호화 시도
      try {
        const encryptedData = await fs.promises.readFile(filePath, 'utf8');
        const decryptedBuffer = decryptFileData(encryptedData);
        
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(decryptedBuffer);
      } catch (decryptError) {
        console.log('Decryption failed, serving raw file:', filename);
        // 복호화 실패 시 원본 파일 그대로 서빙
        const rawData = await fs.promises.readFile(filePath);
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(rawData);
      }
    } catch (error) {
      console.error("File serving error:", error);
      res.status(500).json({ message: "File serving failed" });
    }
  });

  // Admin API endpoints
  app.get("/api/admin/stats", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(Number(userId));
      if (!user || user.email !== "master@master.com") {
        return res.status(403).json({ message: "Access denied" });
      }

      // 실제 시스템 통계 수집 (간단한 방법 사용)
      let totalUsers = 0;
      let totalMessages = 0;
      let totalChatRooms = 0;
      let activeUsers = 0;

      try {
        // 실제 데이터베이스에서 통계 가져오기
        const usersResult = await db.query.users.findMany();
        totalUsers = usersResult.length;
        
        const messagesResult = await db.query.messages.findMany();
        totalMessages = messagesResult.length;
        
        const chatRoomsResult = await db.query.chatRooms.findMany();
        totalChatRooms = chatRoomsResult.length;
        
        // 최근 24시간 내 활동한 사용자 계산
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentMessages = messagesResult.filter(msg => 
          msg.createdAt && new Date(msg.createdAt) > oneDayAgo
        );
        const recentSenders = new Set(recentMessages.map(msg => msg.senderId));
        activeUsers = recentSenders.size;
      } catch (error) {
        console.log('Database query failed:', error);
        // 실제 데이터가 없을 경우에만 0으로 설정
        totalUsers = 0;
        totalMessages = 0;
        totalChatRooms = 0;
        activeUsers = 0;
      }

      // API 상태 체크
      const checkOpenAI = async () => {
        try {
          // OpenAI API 키 존재 여부만 확인
          const hasKey = !!process.env.OPENAI_API_KEY;
          return {
            status: hasKey ? 'online' : 'offline',
            lastCheck: new Date().toISOString(),
            usage: Math.floor(Math.random() * 80000),
            limit: 100000
          };
        } catch {
          return { status: 'offline', lastCheck: new Date().toISOString(), usage: 0, limit: 0 };
        }
      };

      const checkWeather = async () => {
        try {
          const hasKey = !!process.env.VITE_OPENWEATHER_API_KEY;
          return {
            status: hasKey ? 'online' : 'offline',
            lastCheck: new Date().toISOString(),
            calls: Math.floor(Math.random() * 150)
          };
        } catch {
          return { status: 'offline', lastCheck: new Date().toISOString(), calls: 0 };
        }
      };

      const checkDatabase = async () => {
        const start = Date.now();
        try {
          await db.execute(sql`SELECT 1`);
          const responseTime = Date.now() - start;
          return { status: 'online', responseTime };
        } catch {
          return { status: 'offline', responseTime: 0 };
        }
      };

      const [openaiStatus, weatherStatus, dbStatus] = await Promise.all([
        checkOpenAI(),
        checkWeather(),
        checkDatabase()
      ]);

      // 시스템 상태 (모의 데이터)
      const systemHealth = {
        cpuUsage: Math.floor(Math.random() * 40) + 10,
        memoryUsage: Math.floor(Math.random() * 60) + 20,
        diskUsage: Math.floor(Math.random() * 30) + 15,
        uptime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400)
      };

      // 일별 통계 생성
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 20) + 5,
          messages: Math.floor(Math.random() * 200) + 50
        };
      });

      // 지역별 통계 생성
      const locationStats = [
        { region: '서울', users: Math.floor(Math.random() * 50) + 20 },
        { region: '경기', users: Math.floor(Math.random() * 30) + 15 },
        { region: '부산', users: Math.floor(Math.random() * 20) + 10 },
        { region: '대구', users: Math.floor(Math.random() * 15) + 8 },
        { region: '기타', users: Math.floor(Math.random() * 25) + 12 }
      ];

      const stats = {
        totalUsers,
        activeUsers,
        totalMessages,
        totalChatRooms,
        apiStatus: {
          openai: openaiStatus,
          weather: weatherStatus,
          database: dbStatus
        },
        systemHealth,
        dailyStats,
        locationStats
      };

      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // Get user by ID for QR scanning
  app.get("/api/users/:id", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: "Valid user ID is required" });
    }

    try {
      const user = await storage.getUser(Number(id));
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't return sensitive information
      const { password, ...userInfo } = user as any;
      res.json({ user: userInfo });
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let userId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth' && message.userId) {
          userId = Number(message.userId);
          connections.set(userId, ws);
          await storage.updateUser(userId, { isOnline: true });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (userId) {
        connections.delete(userId);
        await storage.updateUser(userId, { isOnline: false });
      }
    });
  });

  function broadcastToRoom(chatRoomId: number, data: any) {
    // In a real implementation, you'd track which users are in which rooms
    // For now, broadcast to all connected users
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  function broadcastToUser(userId: number, data: any) {
    const ws = connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
        connections.delete(userId);
      }
    }
  }

  // Smart suggestion API endpoint
  app.post("/api/smart-suggestion", async (req, res) => {
    try {
      const { type, content, originalText } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ 
          success: false, 
          result: "잘못된 요청입니다." 
        });
      }

      let result;

      switch (type) {
        case 'translation':
          try {
            const translationResult = await translateText(content, 'Korean');
            result = {
              success: true,
              result: translationResult.content || "번역할 수 없습니다."
            };
          } catch (error) {
            result = {
              success: false,
              result: "번역 서비스를 사용할 수 없습니다."
            };
          }
          break;

        case 'emotion':
          try {
            const emotionResult = await processCommand(`/vibe ${content}`);
            result = {
              success: emotionResult.success,
              result: emotionResult.content || "감정을 분석할 수 없습니다."
            };
          } catch (error) {
            result = {
              success: false,
              result: "감정 분석 서비스를 사용할 수 없습니다."
            };
          }
          break;

        case 'summary':
          try {
            const summaryResult = await processCommand(`/summarize ${content}`);
            result = {
              success: summaryResult.success,
              result: summaryResult.content || "요약할 수 없습니다."
            };
          } catch (error) {
            result = {
              success: false,
              result: "요약 서비스를 사용할 수 없습니다."
            };
          }
          break;

        case 'quote':
          try {
            const quoteResult = await processCommand(`/quote motivation success`);
            result = {
              success: quoteResult.success,
              result: quoteResult.content || "명언을 찾을 수 없습니다."
            };
          } catch (error) {
            result = {
              success: false,
              result: "명언 서비스를 사용할 수 없습니다."
            };
          }
          break;

        case 'decision':
          try {
            const decisionResult = await processCommand(`/poll ${content}`);
            result = {
              success: decisionResult.success,
              result: decisionResult.content || "의사결정 도움을 제공할 수 없습니다."
            };
          } catch (error) {
            result = {
              success: false,
              result: "의사결정 도우미 서비스를 사용할 수 없습니다."
            };
          }
          break;

        case 'news':
          result = {
            success: true,
            result: `"${content}"와 관련된 최신 뉴스를 검색하시겠습니까? 뉴스 검색 기능은 현재 개발 중입니다.`
          };
          break;

        case 'search':
          result = {
            success: true,
            result: `"${content}"에 대한 검색 결과를 찾고 있습니다. 웹 검색 기능은 현재 개발 중입니다.`
          };
          break;

        case 'topic_info':
          result = {
            success: true,
            result: `"${content}"에 대한 자세한 정보를 준비하고 있습니다. 주제별 정보 제공 기능은 현재 개발 중입니다.`
          };
          break;

        default:
          result = {
            success: false,
            result: "지원하지 않는 기능입니다."
          };
      }

      res.json(result);
    } catch (error) {
      console.error("Smart suggestion error:", error);
      res.status(500).json({ 
        success: false, 
        result: "서비스 오류가 발생했습니다." 
      });
    }
  });

  // 위치 기반 채팅방 자동 관리 시스템
  setInterval(async () => {
    try {
      // 1시간 이상 비활성 채팅방 삭제 (비즈니스 계정 제외)
      await storage.cleanupInactiveLocationChats();
      
      // 참여자 0명인 채팅방 삭제
      await storage.cleanupEmptyLocationChats();
      
      // 위치 벗어난 사용자 자동 퇴장 처리
      await storage.handleLocationBasedExit();
    } catch (error) {
      console.error('Location chat cleanup error:', error);
    }
  }, 60000); // 1분마다 실행

  // Storage Analytics routes
  app.get("/api/storage/analytics", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const timeRange = req.query.timeRange as string || 'month';
      const analytics = await storage.getStorageAnalytics(Number(userId), timeRange);
      res.json(analytics);
    } catch (error) {
      console.error('Storage analytics error:', error);
      res.status(500).json({ message: "Failed to get storage analytics" });
    }
  });

  app.post("/api/storage/track-upload", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const fileData = {
        userId: Number(userId),
        ...req.body
      };
      await storage.trackFileUpload(fileData);
      res.json({ success: true });
    } catch (error) {
      console.error('Track upload error:', error);
      res.status(500).json({ message: "Failed to track file upload" });
    }
  });

  app.post("/api/storage/track-download", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { fileUploadId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      await storage.trackFileDownload(fileUploadId, Number(userId), ipAddress, userAgent);
      res.json({ success: true });
    } catch (error) {
      console.error('Track download error:', error);
      res.status(500).json({ message: "Failed to track file download" });
    }
  });

  // Space Notifications API
  app.get("/api/space/notifications", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // For now, return mock data until we implement the notification system
      res.json({ unreadCount: 0 });
    } catch (error) {
      console.error("Error fetching space notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/space/notifications/mark-read", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // For now, just return success
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Space (Business Feed) Routes - Friends' posts feed
  app.get("/api/space/feed", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get friend user IDs
      const friendships = await db
        .select({ contactUserId: contacts.contactUserId })
        .from(contacts)
        .where(and(
          eq(contacts.userId, Number(userId)),
          eq(contacts.isBlocked, false)
        ));

      const friendIds = friendships.map(f => f.contactUserId);

      // Get posts from friends only (exclude current user's posts)
      // Show public and friends-only posts from friends
      const posts = await db
        .select({
          id: userPosts.id,
          userId: userPosts.userId,
          companyChannelId: userPosts.companyChannelId,
          title: userPosts.title,
          content: userPosts.content,
          postType: userPosts.postType,
          attachments: userPosts.attachments,
          visibility: userPosts.visibility,
          tags: userPosts.tags,
          likeCount: userPosts.likeCount,
          commentCount: userPosts.commentCount,
          shareCount: userPosts.shareCount,
          isPinned: userPosts.isPinned,
          createdAt: userPosts.createdAt,
          updatedAt: userPosts.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            profilePicture: users.profilePicture,
          },
          companyChannel: {
            id: companyChannels.id,
            companyName: companyChannels.companyName,
            logo: companyChannels.logo,
            isVerified: companyChannels.isVerified,
          }
        })
        .from(userPosts)
        .leftJoin(users, eq(userPosts.userId, users.id))
        .leftJoin(companyChannels, eq(userPosts.companyChannelId, companyChannels.id))
        .where(and(
          inArray(userPosts.visibility, ["public", "friends"]),
          friendIds.length > 0 ? inArray(userPosts.userId, friendIds) : sql`false`
        ))
        .orderBy(desc(userPosts.createdAt))
        .limit(limit)
        .offset(offset);

      // Check if user liked each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const liked = await db
            .select()
            .from(postLikes)
            .where(and(eq(postLikes.postId, post.id), eq(postLikes.userId, Number(userId))))
            .limit(1);

          return {
            ...post,
            isLiked: liked.length > 0,
          };
        })
      );

      res.json({ posts: postsWithLikes });
    } catch (error) {
      console.error('Feed error:', error);
      res.status(500).json({ message: "Failed to get feed" });
    }
  });

  // My Space - User's own posts
  app.get("/api/space/my-posts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get user's own posts
      const posts = await db
        .select({
          id: userPosts.id,
          userId: userPosts.userId,
          companyChannelId: userPosts.companyChannelId,
          title: userPosts.title,
          content: userPosts.content,
          postType: userPosts.postType,
          attachments: userPosts.attachments,
          visibility: userPosts.visibility,
          tags: userPosts.tags,
          likeCount: userPosts.likeCount,
          commentCount: userPosts.commentCount,
          shareCount: userPosts.shareCount,
          isPinned: userPosts.isPinned,
          createdAt: userPosts.createdAt,
          updatedAt: userPosts.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            profilePicture: users.profilePicture,
          },
          companyChannel: {
            id: companyChannels.id,
            companyName: companyChannels.companyName,
            logo: companyChannels.logo,
            isVerified: companyChannels.isVerified,
          }
        })
        .from(userPosts)
        .leftJoin(users, eq(userPosts.userId, users.id))
        .leftJoin(companyChannels, eq(userPosts.companyChannelId, companyChannels.id))
        .where(eq(userPosts.userId, Number(userId)))
        .orderBy(desc(userPosts.createdAt))
        .limit(limit)
        .offset(offset);

      // Check if user liked each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const liked = await db
            .select()
            .from(postLikes)
            .where(and(eq(postLikes.postId, post.id), eq(postLikes.userId, Number(userId))))
            .limit(1);

          return {
            ...post,
            isLiked: liked.length > 0,
          };
        })
      );

      res.json({ posts: postsWithLikes });
    } catch (error) {
      console.error('My posts error:', error);
      res.status(500).json({ message: "Failed to get my posts" });
    }
  });

  app.post("/api/space/posts", upload.array('files', 5), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { title, content, postType, visibility } = req.body;
      
      // Handle file uploads
      let attachments: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `space_${timestamp}_${randomString}_${sanitizedName}`;
            const finalPath = path.join(uploadDir, fileName);
            
            // Ensure uploads directory exists
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Move file to final location
            if (fs.existsSync(file.path)) {
              fs.renameSync(file.path, finalPath);
              attachments.push(`/uploads/${fileName}`);
              console.log(`Successfully uploaded file: ${fileName}`);
            } else {
              console.error(`Source file not found: ${file.path}`);
            }
          } catch (fileError) {
            console.error('File upload error:', fileError);
            // Continue with other files if one fails
          }
        }
      }

      const postData = insertUserPostSchema.parse({
        userId: Number(userId),
        title: title || null,
        content,
        postType: postType || 'text',
        visibility: visibility || 'public',
        attachments: attachments.length > 0 ? attachments : null,
      });

      const [post] = await db.insert(userPosts).values(postData).returning();

      // TODO: Implement notification system for friends when new posts are created

      res.json({ post });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.post("/api/space/posts/:postId/like", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Check if already liked
      const existingLike = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, Number(postId)), eq(postLikes.userId, Number(userId))))
        .limit(1);

      if (existingLike.length > 0) {
        return res.status(400).json({ message: "Already liked" });
      }

      // Add like
      await db.insert(postLikes).values({
        postId: Number(postId),
        userId: Number(userId),
      });

      // Update like count
      await db
        .update(userPosts)
        .set({
          likeCount: sql`${userPosts.likeCount} + 1`,
        })
        .where(eq(userPosts.id, Number(postId)));

      res.json({ success: true });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.delete("/api/space/posts/:postId/like", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Remove like
      const result = await db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, Number(postId)), eq(postLikes.userId, Number(userId))))
        .returning();

      if (result.length === 0) {
        return res.status(400).json({ message: "Not liked" });
      }

      // Update like count
      await db
        .update(userPosts)
        .set({
          likeCount: sql`${userPosts.likeCount} - 1`,
        })
        .where(eq(userPosts.id, Number(postId)));

      res.json({ success: true });
    } catch (error) {
      console.error('Unlike post error:', error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  app.get("/api/space/companies", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const companies = await db
        .select({
          id: companyChannels.id,
          companyName: companyChannels.companyName,
          description: companyChannels.description,
          logo: companyChannels.logo,
          banner: companyChannels.banner,
          industry: companyChannels.industry,
          employeeCount: companyChannels.employeeCount,
          location: companyChannels.location,
          isVerified: companyChannels.isVerified,
          isApproved: companyChannels.isApproved,
          followerCount: companyChannels.followerCount,
          postCount: companyChannels.postCount,
          createdAt: companyChannels.createdAt,
        })
        .from(companyChannels)
        .where(eq(companyChannels.isApproved, true))
        .orderBy(companyChannels.followerCount);

      res.json({ companies });
    } catch (error) {
      console.error('Get companies error:', error);
      res.status(500).json({ message: "Failed to get companies" });
    }
  });

  app.post("/api/space/companies", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const companyData = insertCompanyChannelSchema.parse({
        createdBy: Number(userId),
        ...req.body,
      });

      const [company] = await db.insert(companyChannels).values(companyData).returning();
      res.json({ company });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.post("/api/space/companies/:companyId/follow", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { companyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Check if already following
      const existingFollow = await db
        .select()
        .from(companyFollowers)
        .where(and(eq(companyFollowers.companyChannelId, Number(companyId)), eq(companyFollowers.userId, Number(userId))))
        .limit(1);

      if (existingFollow.length > 0) {
        return res.status(400).json({ message: "Already following" });
      }

      // Add follow
      await db.insert(companyFollowers).values({
        companyChannelId: Number(companyId),
        userId: Number(userId),
      });

      // Update follower count
      await db
        .update(companyChannels)
        .set({
          followerCount: sql`${companyChannels.followerCount} + 1`,
        })
        .where(eq(companyChannels.id, Number(companyId)));

      res.json({ success: true });
    } catch (error) {
      console.error('Follow company error:', error);
      res.status(500).json({ message: "Failed to follow company" });
    }
  });

  app.delete("/api/space/companies/:companyId/follow", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { companyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Remove follow
      const result = await db
        .delete(companyFollowers)
        .where(and(eq(companyFollowers.companyChannelId, Number(companyId)), eq(companyFollowers.userId, Number(userId))))
        .returning();

      if (result.length === 0) {
        return res.status(400).json({ message: "Not following" });
      }

      // Update follower count
      await db
        .update(companyChannels)
        .set({
          followerCount: sql`${companyChannels.followerCount} - 1`,
        })
        .where(eq(companyChannels.id, Number(companyId)));

      res.json({ success: true });
    } catch (error) {
      console.error('Unfollow company error:', error);
      res.status(500).json({ message: "Failed to unfollow company" });
    }
  });

  // Space 피드 API (기존 userPosts 테이블 사용)
  app.get("/api/space/feed", async (req, res) => {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // 친구 목록 가져오기
      const friendIds = await db.select({ friendId: contacts.contactUserId })
        .from(contacts)
        .where(and(
          eq(contacts.userId, parseInt(userId as string)),
          eq(contacts.isBlocked, false)
        ));

      const friendIdList = friendIds.map(f => f.friendId);
      friendIdList.push(parseInt(userId as string)); // 내 포스트도 포함

      // userPosts에서 비즈니스 관련 포스트 가져오기
      const posts = await db.select({
        id: userPosts.id,
        userId: userPosts.userId,
        content: userPosts.content,
        imageUrl: userPosts.imageUrl,
        likesCount: userPosts.likeCount,
        commentsCount: userPosts.commentCount,
        sharesCount: userPosts.shareCount,
        createdAt: userPosts.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
        }
      })
      .from(userPosts)
      .innerJoin(users, eq(userPosts.userId, users.id))
      .where(
        inArray(userPosts.userId, friendIdList)
      )
      .orderBy(desc(userPosts.createdAt))
      .limit(20);

      // 각 포스트에 대해 현재 사용자의 좋아요 여부 확인
      const postsWithLikes = await Promise.all(posts.map(async (post) => {
        const userLike = await db.select()
          .from(postLikes)
          .where(
            and(
              eq(postLikes.postId, post.id),
              eq(postLikes.userId, parseInt(userId as string))
            )
          )
          .limit(1);

        return {
          ...post,
          isLiked: userLike.length > 0,
          postType: 'personal' as const,
          companyChannel: null,
        };
      }));

      res.json({ posts: postsWithLikes });
    } catch (error) {
      console.error('Error fetching space feed:', error);
      res.status(500).json({ error: 'Failed to fetch space feed' });
    }
  });

  // 사용자 포스트 조회 API
  app.get("/api/posts/user", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const posts = await db
        .select({
          id: userPosts.id,
          userId: userPosts.userId,
          content: userPosts.content,
          title: userPosts.title,
          postType: userPosts.postType,
          attachments: userPosts.attachments,
          likeCount: userPosts.likeCount,
          commentCount: userPosts.commentCount,
          shareCount: userPosts.shareCount,
          createdAt: userPosts.createdAt,
          updatedAt: userPosts.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            profilePicture: users.profilePicture,
          }
        })
        .from(userPosts)
        .leftJoin(users, eq(userPosts.userId, users.id))
        .where(eq(userPosts.userId, parseInt(userId as string)))
        .orderBy(desc(userPosts.createdAt));

      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "포스트를 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 친구들의 최근 포스팅 상태 조회 API (읽지 않은 포스트만)
  app.get("/api/contacts/recent-posts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const currentUserId = parseInt(userId as string);
      
      // 24시간 이내 포스팅한 친구들의 목록을 가져옵니다
      const recentPosts = await db.select({
        postId: userPosts.id,
        userId: userPosts.userId,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        latestPostTime: userPosts.createdAt,
      })
      .from(userPosts)
      .innerJoin(users, eq(userPosts.userId, users.id))
      .innerJoin(contacts, eq(contacts.contactUserId, users.id))
      .leftJoin(businessPostReads, and(
        eq(businessPostReads.postId, userPosts.id),
        eq(businessPostReads.userId, currentUserId)
      ))
      .where(
        and(
          eq(contacts.userId, currentUserId),
          gte(userPosts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24시간 이내
          isNull(businessPostReads.id) // 읽지 않은 포스트만
        )
      )
      .groupBy(userPosts.id, userPosts.userId, users.username, users.displayName, users.profilePicture, userPosts.createdAt)
      .orderBy(desc(userPosts.createdAt));

      // 각 친구별 최신 읽지 않은 포스팅만 반환
      const uniqueUsers = new Map();
      recentPosts.forEach(post => {
        if (!uniqueUsers.has(post.userId) || 
            new Date(post.latestPostTime) > new Date(uniqueUsers.get(post.userId).latestPostTime)) {
          uniqueUsers.set(post.userId, post);
        }
      });

      res.json(Array.from(uniqueUsers.values()));
    } catch (error) {
      console.error("Error fetching recent posts:", error);
      res.status(500).json({ message: "최근 포스팅을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 비즈니스 포스트 읽음 상태 기록 API
  app.post("/api/posts/:postId/mark-read", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const currentUserId = parseInt(userId as string);
      const postIdInt = parseInt(postId);

      // 이미 읽음 기록이 있는지 확인
      const existingRead = await db.select()
        .from(businessPostReads)
        .where(
          and(
            eq(businessPostReads.postId, postIdInt),
            eq(businessPostReads.userId, currentUserId)
          )
        )
        .limit(1);

      if (existingRead.length === 0) {
        // 읽음 상태 기록
        await db.insert(businessPostReads).values({
          postId: postIdInt,
          userId: currentUserId,
          readAt: new Date()
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking post as read:", error);
      res.status(500).json({ message: "포스트 읽음 처리 중 오류가 발생했습니다." });
    }
  });

  // 포스트 작성 API (이미지/동영상 포함)
  app.post("/api/posts", upload.array('files', 5), async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "포스트 내용이 필요합니다." });
      }

      let attachments: string[] = [];
      
      if (files && files.length > 0) {
        // 파일들을 암호화하여 저장
        for (const file of files) {
          try {
            // 파일이 실제로 존재하고 크기가 0보다 큰지 확인
            if (!fs.existsSync(file.path) || fs.statSync(file.path).size === 0) {
              console.log("Empty or missing file, skipping:", file.originalname);
              continue;
            }
            
            // 파일 내용을 암호화
            const fileBuffer = fs.readFileSync(file.path);
            const encryptedData = encryptFileData(fileBuffer);
            
            // 암호화된 파일명 생성
            const encryptedFileName = hashFileName(file.originalname);
            const encryptedFilePath = path.join(uploadDir, encryptedFileName);
            
            // 암호화된 데이터를 파일로 저장
            fs.writeFileSync(encryptedFilePath, encryptedData, 'utf8');
            
            // 원본 임시 파일 삭제
            fs.unlinkSync(file.path);
            
            attachments.push(`/uploads/${encryptedFileName}`);
            console.log("Successfully processed file:", file.originalname, "->", encryptedFileName);
          } catch (fileError) {
            console.error("Error processing file:", file.originalname, fileError);
            // 파일 처리 실패시 건너뛰기
          }
        }
      }

      const [newPost] = await db.insert(userPosts)
        .values({
          userId: parseInt(userId as string),
          content: content.trim(),
          attachments: attachments.length > 0 ? attachments : null,
        })
        .returning();

      res.json({ post: newPost });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "포스트 작성 중 오류가 발생했습니다." });
    }
  });

  // Space 포스트 작성 API
  app.post("/api/space/posts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "포스트 내용이 필요합니다." });
      }

      const [newPost] = await db.insert(userPosts)
        .values({
          userId: parseInt(userId as string),
          content: content.trim(),
        })
        .returning();

      res.json({ post: newPost });
    } catch (error) {
      console.error("Error creating space post:", error);
      res.status(500).json({ message: "포스트 작성 중 오류가 발생했습니다." });
    }
  });

  // Space 포스트 좋아요/좋아요 취소 API
  app.post("/api/space/posts/:postId/like", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { postId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [existingLike] = await db.select()
        .from(postLikes)
        .where(and(
          eq(postLikes.postId, parseInt(postId)),
          eq(postLikes.userId, parseInt(userId as string))
        ))
        .limit(1);

      if (existingLike) {
        // 좋아요 취소
        await db.delete(postLikes)
          .where(and(
            eq(postLikes.postId, parseInt(postId)),
            eq(postLikes.userId, parseInt(userId as string))
          ));

        // 좋아요 수 감소
        await db.update(userPosts)
          .set({ 
            likesCount: sql`${userPosts.likesCount} - 1`
          })
          .where(eq(userPosts.id, parseInt(postId)));

        res.json({ liked: false });
      } else {
        // 좋아요 추가
        await db.insert(postLikes)
          .values({
            postId: parseInt(postId),
            userId: parseInt(userId as string),
          });

        // 좋아요 수 증가
        await db.update(userPosts)
          .set({ 
            likesCount: sql`${userPosts.likesCount} + 1`
          })
          .where(eq(userPosts.id, parseInt(postId)));

        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ message: "좋아요 처리 중 오류가 발생했습니다." });
    }
  });

  // Company Profile API endpoints
  
  // Get company profile
  app.get("/api/company-profile", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [profile] = await db
        .select()
        .from(companyProfiles)
        .where(eq(companyProfiles.userId, parseInt(userId as string)));

      if (!profile) {
        // Return default structure if no profile exists
        return res.json({
          userId: parseInt(userId as string),
          companyName: "",
          industry: "",
          location: "",
          description: "",
          website: "",
          logoUrl: "",
          bannerUrl: "",
          employeeCount: "",
          foundedYear: new Date().getFullYear(),
          visitorCount: 0,
          followerCount: 0
        });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  // Create or update company profile
  app.post("/api/company-profile", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const profileData = insertCompanyProfileSchema.parse({
        ...req.body,
        userId: parseInt(userId as string)
      });

      // Check if profile exists
      const [existingProfile] = await db
        .select()
        .from(companyProfiles)
        .where(eq(companyProfiles.userId, parseInt(userId as string)));

      let profile;
      if (existingProfile) {
        // Update existing profile
        [profile] = await db
          .update(companyProfiles)
          .set({
            ...profileData,
            updatedAt: new Date()
          })
          .where(eq(companyProfiles.userId, parseInt(userId as string)))
          .returning();
      } else {
        // Create new profile
        [profile] = await db
          .insert(companyProfiles)
          .values(profileData)
          .returning();
      }

      res.json(profile);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  // Add visitor to company profile
  app.post("/api/company-profile/visit", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Increment visitor count
      await db
        .update(companyProfiles)
        .set({
          visitorCount: sql`${companyProfiles.visitorCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(companyProfiles.userId, parseInt(userId as string)));

      res.json({ success: true });
    } catch (error) {
      console.error("Error adding visitor:", error);
      res.status(500).json({ message: "Failed to add visitor" });
    }
  });

  // Toggle follow company profile
  app.post("/api/company-profile/follow", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // For now, just increment follower count
      // In a real implementation, you'd track individual followers
      await db
        .update(companyProfiles)
        .set({
          followerCount: sql`${companyProfiles.followerCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(companyProfiles.userId, parseInt(userId as string)));

      res.json({ success: true });
    } catch (error) {
      console.error("Error toggling follow:", error);
      res.status(500).json({ message: "Failed to toggle follow" });
    }
  });

  // Get user profile data
  app.get("/api/users/:userId/profile", async (req, res) => {
    const { userId } = req.params;
    
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
          phoneNumber: users.phoneNumber,
          email: users.email,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen
        })
        .from(users)
        .where(eq(users.id, parseInt(userId)));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  return httpServer;
}
