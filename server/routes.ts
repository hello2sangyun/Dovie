import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertCommandSchema, insertContactSchema, insertChatRoomSchema, insertPhoneVerificationSchema, insertUserPostSchema, insertPostLikeSchema, insertPostCommentSchema, insertCompanyChannelSchema, insertCompanyProfileSchema, insertLocationShareRequestSchema, insertLocationShareSchema, chatRooms, chatParticipants, userPosts, postLikes, postComments, companyChannels, companyChannelFollowers, companyChannelAdmins, users, businessProfiles, contacts, businessPostReads, businessPosts, businessPostLikes, companyProfiles, messages, messageLikes, linkPreviews, locationShares } from "@shared/schema";
import { sql } from "drizzle-orm";
import { translateText, transcribeAudio } from "./openai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { encryptFileData, decryptFileData, hashFileName, decryptText } from "./crypto";
import { processCommand } from "./openai";
import { db } from "./db";
import { eq, and, inArray, desc, gte, isNull } from "drizzle-orm";
import { initializeNotificationScheduler } from "./notification-scheduler";
import { sendMessageNotification, getVapidPublicKey } from "./push-notifications";
import twilio from "twilio";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
  fileFilter: (req, file, cb) => {
    // UTF-8 파일명 인코딩 지원
    if (file.originalname) {
      try {
        // Buffer로 변환 후 UTF-8로 디코딩하여 파일명 보정
        const buffer = Buffer.from(file.originalname, 'latin1');
        file.originalname = buffer.toString('utf8');
      } catch (error) {
        // 인코딩 변환 실패 시 원본 유지
        console.log('Filename encoding conversion failed, using original:', file.originalname);
      }
    }
    cb(null, true);
  }
});

// WebSocket connection management
const connections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes

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

      // 전화번호 정규화 (국가코드 + 전화번호)
      // Twilio expects +36703566630 format, not HU+36703566630
      const fullPhoneNumber = countryCode.startsWith('+') ? `${countryCode}${phoneNumber}` : `+${countryCode}${phoneNumber}`;

      // 새 인증 코드 저장 (정규화된 전화번호로)
      const verification = await storage.createPhoneVerification({
        phoneNumber: fullPhoneNumber,
        countryCode,
        verificationCode,
        expiresAt,
        isVerified: false,
      });

      // Twilio 클라이언트 초기화
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      try {
        // 실제 SMS 전송 시도
        const message = await client.messages.create({
          body: `Dovie Messenger 인증 코드: ${verificationCode}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: fullPhoneNumber
        });

        console.log(`SMS 전송 성공: ${message.sid} (${fullPhoneNumber})`);

        res.json({ 
          success: true, 
          message: "인증 코드를 전송했습니다.",
          messageSid: message.sid
        });
      } catch (smsError: any) {
        console.error("Twilio SMS 전송 오류:", smsError);
        
        // Trial 계정 제한이나 기타 SMS 전송 실패 시 개발 모드에서는 성공으로 처리
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 개발 모드: SMS 전송 실패하였지만 테스트를 위해 성공으로 처리`);
          console.log(`📱 인증 코드: ${verificationCode} (${fullPhoneNumber})`);
          console.log(`💡 실제 운영환경에서는 Twilio 계정을 업그레이드하거나 번호를 검증해주세요.`);
          
          res.json({ 
            success: true, 
            message: "개발 모드: 인증 코드가 콘솔에 표시되었습니다.",
            developmentMode: true,
            verificationCode: verificationCode // 개발용으로만 포함
          });
        } else {
          // 운영 환경에서는 실제 오류 반환
          throw new Error("SMS 전송에 실패했습니다. Twilio 계정을 확인해주세요.");
        }
      }
    } catch (error) {
      console.error("SMS send error:", error);
      res.status(500).json({ message: "인증 코드 전송에 실패했습니다." });
    }
  });

  // SMS 인증 코드 확인
  app.post("/api/auth/verify-sms", async (req, res) => {
    try {
      const { phoneNumber, verificationCode, countryCode } = req.body;
      
      if (!phoneNumber || !verificationCode || !countryCode) {
        return res.status(400).json({ message: "Phone number, country code, and verification code are required" });
      }

      // 전화번호 정규화 (저장된 형식과 동일하게)
      const fullPhoneNumber = countryCode.startsWith('+') ? `${countryCode}${phoneNumber}` : `+${countryCode}${phoneNumber}`;
      
      console.log(`SMS 인증 확인 시도: ${fullPhoneNumber}, 코드: ${verificationCode}`);

      // 인증 코드 확인 (아직 사용되지 않고 만료되지 않은 코드)
      const verification = await storage.getPhoneVerification(fullPhoneNumber, verificationCode);
      
      if (!verification) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // 사용자 찾기 또는 생성
      let user = await storage.getUserByPhoneNumber(fullPhoneNumber);
      
      if (!user) {
        const hashedPassword = await bcrypt.hash("phone_auth_temp", 10);
        const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
        const timestamp = Date.now();
        const userData = insertUserSchema.parse({
          username: `user_${cleanPhoneNumber}_${timestamp}`,
          displayName: `사용자 ${phoneNumber.slice(-4)}`,
          phoneNumber: fullPhoneNumber,
          email: `${cleanPhoneNumber}@phone.local`,
          password: hashedPassword,
          isEmailVerified: true,
          isProfileComplete: false,
        });
        user = await storage.createUser(userData);
      }

      // 사용자 온라인 상태 업데이트
      const updatedUser = await storage.updateUser(user.id, { isOnline: true, phoneNumber: fullPhoneNumber });

      // 성공적으로 로그인 완료된 후에만 인증 코드를 사용됨으로 표시
      await storage.markPhoneVerificationAsUsed(verification.id);

      // 업데이트된 사용자 정보가 있으면 사용하고, 없으면 원본 사용자 정보 사용
      res.json({ user: updatedUser || user });
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

  // 사용자명 로그인 API
  app.post("/api/auth/username-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "사용자명과 비밀번호를 입력해주세요." });
      }

      // 사용자명으로 사용자 찾기
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "사용자명 또는 비밀번호가 올바르지 않습니다." });
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "사용자명 또는 비밀번호가 올바르지 않습니다." });
      }

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(user.id, { isOnline: true });

      res.json({ user });
    } catch (error: any) {
      console.error("Username login error:", error);
      res.status(500).json({ message: "로그인에 실패했습니다." });
    }
  });

  // 이메일 로그인 API (기존 유지)
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

  // 현재 사용자 정보 조회 API (자동 로그인 지원)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      // 자동 로그인 성공 시 사용자 온라인 상태 업데이트
      await storage.updateUser(user.id, { 
        isOnline: true,
        lastSeen: new Date()
      });

      console.log(`✅ 자동 로그인 성공: 사용자 ${user.id} (${user.username})`);
      
      res.json({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "사용자 정보 조회에 실패했습니다." });
    }
  });

  // 프로필 업데이트 API
  app.patch("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const requestUserId = req.headers["x-user-id"];
      
      if (!requestUserId || requestUserId !== userId) {
        return res.status(401).json({ message: "권한이 없습니다." });
      }

      const { username, displayName, email, phoneNumber, birthday, profilePicture, password, isProfileComplete } = req.body;
      
      // 사용자명 중복 확인 (기존 사용자가 아닌 경우)
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== Number(userId)) {
          return res.status(400).json({ message: "이미 사용 중인 사용자명입니다." });
        }
      }

      // 이메일 중복 확인 (기존 사용자가 아닌 경우)
      if (email) {
        const existingUserByEmail = await storage.getUserByEmail(email);
        if (existingUserByEmail && existingUserByEmail.id !== Number(userId)) {
          return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
        }
      }

      const updateData: any = {};
      if (username) updateData.username = username;
      if (displayName) updateData.displayName = displayName;
      if (email) updateData.email = email;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (birthday) updateData.birthday = birthday;
      if (profilePicture) updateData.profilePicture = profilePicture;
      if (typeof isProfileComplete === 'boolean') updateData.isProfileComplete = isProfileComplete;
      
      // 비밀번호 업데이트 (해싱 필요)
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      const updatedUser = await storage.updateUser(Number(userId), updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "프로필 업데이트에 실패했습니다." });
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

  // 프로필 업데이트 API (인증된 사용자)
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const updates = req.body;

      // username이 변경되는 경우 중복 체크
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== Number(userId)) {
          return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
        }
      }

      const user = await storage.updateUser(Number(userId), updates);
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      res.json({ user });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "프로필 업데이트에 실패했습니다." });
    }
  });

  // 프로필 업데이트 API (사용자 ID로)
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

  // Location chat messages routes
  app.get("/api/location/chat-rooms/:roomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const roomId = Number(req.params.roomId);
      
      // Verify user is participant in location chat
      const profile = await storage.getLocationChatProfile(Number(userId), roomId);
      if (!profile) {
        return res.status(403).json({ message: "Not a participant in this location chat" });
      }

      // Location chat functionality removed
      res.status(404).json({ message: "Location chat not available" });
    } catch (error) {
      console.error("Get location messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/location/chat-rooms/:roomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const roomId = Number(req.params.roomId);
      
      // Verify user is participant in location chat
      const profile = await storage.getLocationChatProfile(Number(userId), roomId);
      if (!profile) {
        return res.status(403).json({ message: "Not a participant in this location chat" });
      }

      // Location chat functionality removed
      res.status(404).json({ message: "Location chat not available" });
      return;

      // For location chat, create response with profile info
      const user = await storage.getUser(Number(userId));
      const messageWithSender = {
        ...message,
        sender: user,
        senderProfile: profile
      };

      // Broadcast to location chat participants via WebSocket
      broadcastToRoom(roomId, {
        type: "new_message",
        message: messageWithSender,
        isLocationChat: true
      });

      res.json({ message: messageWithSender });
    } catch (error) {
      console.error("Location message creation error:", error);
      res.status(500).json({ message: "Failed to send message" });
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

  // Pin/unpin contact route
  app.post("/api/contacts/:contactUserId/pin", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { isPinned } = req.body;
      await storage.updateContactPin(Number(userId), Number(req.params.contactUserId), isPinned);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating contact pin status:", error);
      res.status(500).json({ message: "Failed to update contact pin status" });
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
      const targetUserId = req.params.userId ? Number(req.params.userId) : Number(userId);
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
      
      // Simple HTML page for business card viewing
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${businessCard?.fullName || user?.displayName || 'Business Card'}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; }
            .name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .title { font-size: 18px; color: #666; margin-bottom: 10px; }
            .company { font-size: 16px; margin-bottom: 15px; }
            .contact-info { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${businessCard?.fullName || user?.displayName || 'Name not available'}</div>
            <div class="title">${businessCard?.jobTitle || 'Position not available'}</div>
            <div class="company">${businessCard?.companyName || 'Company not available'}</div>
            ${businessCard?.email ? `<div class="contact-info">📧 ${businessCard.email}</div>` : ''}
            ${businessCard?.phoneNumber ? `<div class="contact-info">📞 ${businessCard.phoneNumber}</div>` : ''}
            ${businessCard?.website ? `<div class="contact-info">🌐 <a href="${businessCard.website}">${businessCard.website}</a></div>` : ''}
            ${businessCard?.address ? `<div class="contact-info">📍 ${businessCard.address}</div>` : ''}
            ${businessCard?.description ? `<div style="margin-top: 15px;">${businessCard.description}</div>` : ''}
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("Error displaying business card:", error);
      res.status(500).send("Error loading business card");
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
      console.error("Chat rooms error:", error);
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
      const chatRoomId = Number(req.params.chatRoomId);
      const messages = await storage.getMessages(chatRoomId);
      res.json({ messages });
    } catch (error) {
      console.error("Messages fetch error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // 제스처 기반 퀵 리액션 API 엔드포인트
  app.post("/api/messages/:messageId/quick-reply", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      const { content, type } = req.body;

      if (type === 'reaction') {
        // 리액션 처리 - 기존 좋아요 API 사용
        const response = await fetch(`http://localhost:5000/api/messages/${messageId}/like`, {
          method: 'POST',
          headers: {
            'x-user-id': userId as string,
            'Content-Type': 'application/json'
          }
        });
        const result = await response.json();
        res.json(result);
      } else if (type === 'text') {
        // 텍스트 답장 처리 - 새 메시지 생성
        const messages = await storage.getMessages(0); // 임시로 모든 메시지 조회
        const originalMessage = messages.find(m => m.id === messageId);
        
        if (!originalMessage) {
          return res.status(404).json({ message: 'Message not found' });
        }

        const newMessage = await storage.createMessage({
          chatRoomId: originalMessage.chatRoomId,
          senderId: Number(userId),
          content,
          messageType: 'text',
          replyToMessageId: messageId
        });

        // WebSocket으로 실시간 전송
        broadcastToRoom(originalMessage.chatRoomId, {
          type: 'new_message',
          message: newMessage
        });

        res.json(newMessage);
      } else {
        res.status(400).json({ message: 'Invalid reply type' });
      }
    } catch (error) {
      console.error('Error handling quick reply:', error);
      res.status(500).json({ message: 'Internal server error' });
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

      // Auto-save files to storage and extract hashtags from message content
      // Skip hashtag extraction for YouTube messages and recommendation messages
      const skipHashtagExtraction = messageData.messageType === 'youtube' || 
                                   (messageData.content && messageData.content.includes('🎬 YouTube 동영상')) ||
                                   (messageData.content && messageData.content.includes('유튜브 검색'));
      
      // Auto-save file uploads to storage
      if (messageData.messageType === 'file' && messageData.fileUrl && messageData.fileName) {
        console.log(`Auto-saving file to storage: ${messageData.fileName}`);
        try {
          // Use filename (without extension) as the command name for files
          const commandName = messageData.fileName.split('.')[0];
          await storage.saveCommand({
            userId: Number(userId),
            chatRoomId: Number(req.params.chatRoomId),
            commandName: commandName,
            messageId: message.id,
            savedText: messageData.content || null,
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize || null,
            originalSenderId: Number(userId),
            originalTimestamp: new Date()
          });
          console.log(`Successfully auto-saved file: ${messageData.fileName}`);
        } catch (error) {
          console.log(`Failed to auto-save file ${messageData.fileName}:`, error);
        }
      }
      
      // Extract hashtags from text content
      if (messageData.content && typeof messageData.content === 'string' && !skipHashtagExtraction) {
        const hashtagRegex = /#[\w가-힣]+/g;
        const hashtags = messageData.content.match(hashtagRegex);
        
        if (hashtags && hashtags.length > 0) {
          console.log(`Found hashtags in message: ${hashtags.join(', ')}`);
          for (const hashtag of hashtags) {
            // Create a command for each hashtag
            const commandName = hashtag.slice(1); // Remove the # symbol
            try {
              await storage.saveCommand({
                userId: Number(userId),
                chatRoomId: Number(req.params.chatRoomId),
                commandName: commandName,
                messageId: message.id,
                savedText: messageData.content,
                fileUrl: messageData.fileUrl || null,
                fileName: messageData.fileName || null,
                fileSize: messageData.fileSize || null,
                originalSenderId: Number(userId),
                originalTimestamp: new Date()
              });
              console.log(`Successfully saved hashtag command: ${commandName}`);
            } catch (error) {
              console.log(`Failed to save hashtag command for ${hashtag}:`, error);
            }
          }
        }
      } else if (skipHashtagExtraction) {
        console.log('Skipping hashtag extraction for YouTube message');
      }

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

  // Chat room upload endpoint for voice messages with transcription
  app.post("/api/chat-rooms/:chatRoomId/upload", upload.single("file"), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const messageType = req.body.messageType || 'file';

      if (messageType === 'voice') {
        // 음성 파일 처리 - 암호화하지 않고 원본 형태로 저장
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `voice_${timestamp}_${randomString}.webm`;
        const finalPath = path.join(uploadDir, fileName);
        
        // 파일을 최종 위치로 이동
        fs.renameSync(req.file.path, finalPath);

        console.log(`Audio file saved: ${fileName} URL: /uploads/${fileName}`);

        // OpenAI 음성 텍스트 변환
        try {
          const transcriptionResult = await transcribeAudio(finalPath);
          console.log('Transcription result:', transcriptionResult);

          const fileUrl = `/uploads/${fileName}`;
          res.json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            transcription: transcriptionResult.transcription || '음성 메시지',
            language: transcriptionResult.detectedLanguage || 'korean',
            duration: transcriptionResult.duration || 3,
            confidence: String(transcriptionResult.confidence || 0.9)
          });
        } catch (transcriptionError) {
          console.error('Transcription failed:', transcriptionError);
          // 텍스트 변환 실패해도 파일 업로드는 성공으로 처리
          const fileUrl = `/uploads/${fileName}`;
          res.json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            transcription: '음성 메시지',
            language: 'korean',
            duration: 3,
            confidence: '0.5'
          });
        }
      } else {
        // 일반 파일 처리 - 암호화
        const fileBuffer = fs.readFileSync(req.file.path);
        const encryptedData = encryptFileData(fileBuffer);
        
        const encryptedFileName = hashFileName(req.file.originalname);
        const encryptedFilePath = path.join(uploadDir, encryptedFileName);
        
        fs.writeFileSync(encryptedFilePath, encryptedData, 'utf8');
        fs.unlinkSync(req.file.path);

        // AI 파일 요약 생성
        let fileSummary = "파일";
        try {
          const { generateFileSummary } = await import("./openai");
          fileSummary = await generateFileSummary(req.file.originalname, req.file.mimetype);
        } catch (summaryError) {
          console.log("File summary generation failed, using default");
        }

        const fileUrl = `/uploads/${encryptedFileName}`;
        res.json({
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          summary: fileSummary,
        });
      }
    } catch (error) {
      console.error("Chat room file upload error:", error);
      res.status(500).json({ message: "File upload failed" });
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

  // Profile photo upload route
  app.post("/api/upload-profile-photo", upload.single("file"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 이미지 파일만 허용
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // 파일 크기 제한 (5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      // 파일 데이터 암호화
      const encryptedData = encryptFileData(req.file.buffer);
      const hashedFileName = hashFileName(req.file.originalname);

      // 기존 프로필 사진 파일 삭제 (있는 경우)
      const existingUser = await storage.getUser(Number(userId));
      if (existingUser?.profilePicture) {
        try {
          const existingFileName = existingUser.profilePicture.split('/').pop();
          if (existingFileName) {
            const existingFilePath = path.join(uploadDir, existingFileName);
            if (fs.existsSync(existingFilePath)) {
              fs.unlinkSync(existingFilePath);
            }
          }
        } catch (deleteError) {
          console.log("Could not delete existing profile photo:", deleteError);
        }
      }

      // 새 프로필 사진 저장
      const encryptedFilePath = path.join(uploadDir, hashedFileName);
      fs.writeFileSync(encryptedFilePath, encryptedData, 'utf8');

      const fileUrl = `/uploads/${hashedFileName}`;

      // 사용자 프로필 업데이트
      await storage.updateUserProfilePicture(Number(userId), fileUrl);

      res.json({
        success: true,
        profilePicture: fileUrl,
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      res.status(500).json({ message: "Profile photo upload failed" });
    }
  });

  // Profile picture upload endpoint for new component
  app.post("/api/upload/profile-picture", upload.single("file"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 이미지 파일만 허용
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // 파일 크기 제한 (5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      // 프로필 이미지는 암호화하지 않고 원본 저장 (빠른 로딩을 위해)
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(req.file.originalname);
      const profileFileName = `profile_${timestamp}_${randomString}${fileExtension}`;
      const finalPath = path.join(uploadDir, profileFileName);
      
      // 파일을 최종 위치로 이동 (암호화 없음)
      fs.renameSync(req.file.path, finalPath);

      // 기존 프로필 사진 파일 삭제 (있는 경우)
      const existingUser = await storage.getUser(Number(userId));
      if (existingUser?.profilePicture) {
        try {
          const existingFileName = existingUser.profilePicture.split('/').pop();
          if (existingFileName && existingFileName.startsWith('profile_')) {
            const existingFilePath = path.join(uploadDir, existingFileName);
            if (fs.existsSync(existingFilePath)) {
              fs.unlinkSync(existingFilePath);
            }
          }
        } catch (deleteError) {
          console.log("Could not delete existing profile photo:", deleteError);
        }
      }

      const fileUrl = `/uploads/${profileFileName}`;

      // 사용자 프로필 업데이트
      await storage.updateUserProfilePicture(Number(userId), fileUrl);

      res.json({
        success: true,
        profilePicture: fileUrl,
      });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ message: "Profile picture upload failed" });
    }
  });

  // Profile image serving endpoint (optimized for instant loading)
  app.get("/api/profile-images/:filename", async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // 보안 검증: profile_ 접두사가 있는 파일만 허용
      if (!filename.startsWith('profile_')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Profile image not found" });
      }
      
      // 파일 정보 확인
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filename).toLowerCase();
      
      // MIME 타입 설정
      let contentType = 'image/jpeg';
      switch (fileExtension) {
        case '.png': contentType = 'image/png'; break;
        case '.gif': contentType = 'image/gif'; break;
        case '.webp': contentType = 'image/webp'; break;
        case '.jpg':
        case '.jpeg': 
        default: contentType = 'image/jpeg'; break;
      }
      
      // 캐시 헤더 설정 (1일)
      res.set({
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=86400',
        'ETag': `"${stats.mtime.getTime()}-${stats.size}"`,
        'Last-Modified': stats.mtime.toUTCString()
      });
      
      // ETag 기반 조건부 요청 처리
      const ifNoneMatch = req.headers['if-none-match'];
      const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
      
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }
      
      // 파일 스트림으로 전송
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Profile image serving error:", error);
      res.status(500).json({ message: "Failed to serve profile image" });
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

      // AI 파일 요약 생성
      let fileSummary = "파일";
      try {
        const { generateFileSummary } = await import("./openai");
        fileSummary = await generateFileSummary(req.file.originalname, req.file.mimetype);
      } catch (summaryError) {
        console.log("File summary generation failed, using default");
      }

      // 파일명 UTF-8 보정
      let displayFileName = req.file.originalname;
      try {
        // UTF-8 디코딩 시도 (이미 fileFilter에서 처리되었지만 추가 보정)
        const buffer = Buffer.from(req.file.originalname, 'latin1');
        const decodedFileName = buffer.toString('utf8');
        displayFileName = decodedFileName;
      } catch (error) {
        // 디코딩 실패 시 원본 사용
        console.log('Filename encoding conversion failed, using original:', req.file.originalname);
      }

      const fileUrl = `/uploads/${encryptedFileName}`;
      res.json({
        fileUrl,
        fileName: displayFileName,
        fileSize: req.file.size,
        summary: fileSummary,
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
      
      // 파일명 UTF-8 보정 및 안전한 파일명 생성
      let safeFileName;
      try {
        // UTF-8 디코딩 시도
        const buffer = Buffer.from(fileName, 'latin1');
        const decodedFileName = buffer.toString('utf8');
        safeFileName = decodedFileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_') + '.txt';
      } catch (error) {
        // 디코딩 실패 시 원본 사용
        safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_') + '.txt';
      }
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

  // Push notification subscription management
  app.post('/api/push-subscription', async (req, res) => {
    try {
      const { user } = req as any;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { endpoint, keys } = req.body;
      const { p256dh, auth } = keys;
      const userAgent = req.headers['user-agent'] || '';

      // 기존 구독이 있다면 업데이트, 없다면 새로 생성
      await storage.upsertPushSubscription(user.id, {
        endpoint,
        p256dh,
        auth,
        userAgent
      });

      res.json({ success: true, message: "푸시 알림 구독이 완료되었습니다." });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({ message: "푸시 알림 구독 중 오류가 발생했습니다." });
    }
  });

  app.delete('/api/push-subscription', async (req, res) => {
    try {
      const { user } = req as any;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { endpoint } = req.body;
      await storage.deletePushSubscription(user.id, endpoint);

      res.json({ success: true, message: "푸시 알림 구독이 해제되었습니다." });
    } catch (error) {
      console.error("Push unsubscription error:", error);
      res.status(500).json({ message: "푸시 알림 구독 해제 중 오류가 발생했습니다." });
    }
  });

  // Bulk delete commands endpoint
  app.post("/api/commands/bulk-delete", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { commandIds } = req.body;
      if (!Array.isArray(commandIds) || commandIds.length === 0) {
        return res.status(400).json({ message: "Command IDs are required" });
      }

      // Get commands to delete (verify ownership)
      const commandsToDelete = await storage.getCommandsByIds(Number(userId), commandIds);
      
      if (commandsToDelete.length === 0) {
        return res.status(404).json({ message: "No commands found to delete" });
      }

      // Delete associated files from filesystem
      for (const command of commandsToDelete) {
        if (command.fileName) {
          try {
            const filePath = path.join(uploadDir, command.fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (fileError) {
            console.error(`Failed to delete file ${command.fileName}:`, fileError);
            // Continue with database deletion even if file deletion fails
          }
        }
      }

      // Delete commands from database
      await storage.deleteCommands(Number(userId), commandIds);

      res.json({ 
        success: true, 
        deletedCount: commandsToDelete.length,
        message: `${commandsToDelete.length}개의 파일이 삭제되었습니다.`
      });
    } catch (error) {
      console.error("Bulk delete error:", error);
      res.status(500).json({ message: "파일 삭제 중 오류가 발생했습니다." });
    }
  });

  // Link preview endpoint
  app.get('/api/link-preview', async (req: Request, res: Response) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Check if we have cached preview data
      const [existingPreview] = await db
        .select()
        .from(linkPreviews)
        .where(eq(linkPreviews.url, url))
        .limit(1);

      if (existingPreview) {
        return res.json(existingPreview);
      }

      // Fetch link metadata
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch URL');
        }

        const html = await response.text();
        
        // Simple regex-based meta tag extraction
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || 
                         html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
        const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
        const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i);

        const previewData = {
          url,
          title: titleMatch?.[1]?.trim() || new URL(url).hostname,
          description: descMatch?.[1]?.trim() || null,
          image: imageMatch?.[1] || null,
          siteName: siteNameMatch?.[1] || new URL(url).hostname,
          type: 'website' as const
        };

        // Cache the preview data
        const [newPreview] = await db
          .insert(linkPreviews)
          .values(previewData)
          .returning();

        return res.json(newPreview);
      } catch (fetchError) {
        // Return basic URL info if fetch fails
        const basicPreview = {
          url,
          title: new URL(url).hostname,
          siteName: new URL(url).hostname,
          type: 'website' as const
        };

        const [newPreview] = await db
          .insert(linkPreviews)
          .values(basicPreview)
          .returning();

        return res.json(newPreview);
      }
    } catch (error) {
      console.error('Link preview error:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // Message like endpoint
  app.post('/api/messages/:messageId/like', async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.headers["x-user-id"];

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user already liked this message
      const [existingLike] = await db
        .select()
        .from(messageLikes)
        .where(and(
          eq(messageLikes.messageId, messageId),
          eq(messageLikes.userId, userId)
        ))
        .limit(1);

      if (existingLike) {
        // Remove like
        await db
          .delete(messageLikes)
          .where(and(
            eq(messageLikes.messageId, messageId),
            eq(messageLikes.userId, userId)
          ));

        return res.json({ liked: false, action: 'unliked' });
      } else {
        // Add like
        await db
          .insert(messageLikes)
          .values({
            messageId,
            userId
          });

        return res.json({ liked: true, action: 'liked' });
      }
    } catch (error) {
      console.error('Message like error:', error);
      res.status(500).json({ error: 'Failed to toggle like' });
    }
  });

  // 프로필 이미지 전용 빠른 서빙을 위한 메모리 캐시
  const profileImageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
  const CACHE_TTL = 60 * 60 * 1000; // 1시간
  
  // 프로필 이미지 전용 엔드포인트 (최적화된 성능)
  app.get("/api/profile-images/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const cacheKey = filename;
      
      // 메모리 캐시에서 확인
      const cached = profileImageCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.set({
          'Content-Type': cached.contentType,
          'Content-Length': cached.buffer.length,
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
          'ETag': `"${filename}"`
        });
        return res.send(cached.buffer);
      }
      
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Profile image not found" });
      }
      
      // 이미지 확장자에 따른 Content-Type 설정
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'image/jpeg'; // 기본값
      
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.bmp') contentType = 'image/bmp';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      
      let fileBuffer: Buffer;
      
      try {
        // 먼저 암호화된 파일로 시도
        const encryptedData = fs.readFileSync(filePath, 'utf8');
        fileBuffer = decryptFileData(encryptedData);
      } catch (decryptError) {
        // 복호화 실패시 일반 파일로 읽기
        fileBuffer = fs.readFileSync(filePath);
      }
      
      // 메모리 캐시에 저장
      profileImageCache.set(cacheKey, {
        buffer: fileBuffer,
        contentType,
        timestamp: Date.now()
      });
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'ETag': `"${filename}"`
      });
      
      res.send(fileBuffer);
    } catch (error) {
      console.error('Profile image serving error:', error);
      res.status(500).json({ message: "Failed to serve profile image" });
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
      // 프로필 이미지인지 확인 (profile_로 시작하는 파일명)
      const isProfileImage = filename.startsWith('profile_');
      
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
      } else if (isProfileImage) {
        // 프로필 이미지는 최적화된 엔드포인트로 리다이렉트
        return res.redirect(`/api/profile-images/${filename}`);
      } else {
        // 일반 파일 처리 (암호화된 파일 포함)
        let fileBuffer: Buffer;
        
        try {
          // 먼저 암호화된 텍스트로 읽기 시도
          const encryptedData = fs.readFileSync(filePath, 'utf8');
          fileBuffer = decryptFileData(encryptedData);
          console.log(`Successfully decrypted file: ${filename}`);
        } catch (decryptError) {
          // 복호화 실패시 바이너리로 읽기 (암호화되지 않은 파일)
          fileBuffer = fs.readFileSync(filePath);
          console.log(`File not encrypted, serving directly: ${filename}`);
        }
        
        // 이미지 확장자에 따른 Content-Type 설정
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
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
          'Content-Length': fileBuffer.length,
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes'
        });
        
        res.send(fileBuffer);
      }
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Legacy encrypted file serving for non-profile images
  app.get("/api/encrypted-files/:filename", async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

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
    } catch (error) {
      console.error('Encrypted file serving error:', error);
      res.status(500).json({ message: "Failed to serve encrypted file" });
    }
  });

  // Message read tracking routes
  app.post("/api/chat-rooms/:chatRoomId/mark-read", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { lastMessageId } = req.body;
      console.log(`Mark read request: userId=${userId}, chatRoomId=${req.params.chatRoomId}, lastMessageId=${lastMessageId}`);
      
      if (!lastMessageId) {
        return res.status(400).json({ message: "lastMessageId is required" });
      }
      
      await storage.markMessagesAsRead(Number(userId), Number(req.params.chatRoomId), Number(lastMessageId));
      res.json({ success: true });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ message: "Failed to mark messages as read", error: error.message });
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
      
      // Process saved_text for hashtag extraction
      const processedCommands = commands.map(command => {
        let processedText = command.savedText;
        
        // Only attempt decryption if savedText looks like encrypted data (starts with "U2FsdGVkX1")
        if (command.savedText && command.savedText.startsWith('U2FsdGVkX1')) {
          try {
            processedText = decryptText(command.savedText);
          } catch (error) {
            console.log('Failed to decrypt saved_text for command:', command.id, error.message);
            processedText = command.savedText; // fallback to original
          }
        }
        
        return {
          ...command,
          savedText: processedText
        };
      });
      
      res.json({ commands: processedCommands });
    } catch (error) {
      console.error('Commands API error:', error);
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
        originalTimestamp: req.body.originalTimestamp ? new Date(req.body.originalTimestamp) : null,
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

    try {
      // Pass the file directly to transcribeAudio function
      const result = await transcribeAudio(req.file.path);
      
      // Check for silent recording before saving file
      if (result.error === "SILENT_RECORDING") {
        console.log("🔇 Silent recording detected, not saving file");
        // Clean up temporary file
        fs.unlinkSync(req.file.path);
        
        return res.json({
          success: false,
          error: "SILENT_RECORDING",
          message: "빈 음성 녹음이 감지되었습니다."
        });
      }
      
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
        console.log("📤 Sending transcribe response with smartSuggestions:", result.smartSuggestions?.length || 0);
        console.log("📤 smartSuggestions data:", result.smartSuggestions);
        
        res.json({
          success: true,
          transcription: result.transcription,
          duration: result.duration,
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence,
          audioUrl: audioUrl,
          smartSuggestions: result.smartSuggestions || []
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || "음성 변환에 실패했습니다."
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      // Clean up temporary file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: "음성 변환 중 오류가 발생했습니다."
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

  // WebSocket connections map
  const connections = new Map<number, WebSocket>();

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection attempt from:', req.url);
    let userId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);
        
        if (message.type === 'auth' && message.userId) {
          userId = Number(message.userId);
          connections.set(userId, ws);
          console.log('WebSocket user authenticated:', userId);
          
          try {
            // Verify user exists before updating status
            const user = await storage.getUser(userId);
            if (user) {
              await storage.updateUser(userId, { isOnline: true });
              // Send confirmation back to client
              ws.send(JSON.stringify({ type: 'auth_success', userId }));
            } else {
              ws.send(JSON.stringify({ type: 'auth_error', error: 'User not found' }));
            }
          } catch (error) {
            console.error('Error updating user online status:', error);
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Failed to update status' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket connection closed for user:', userId);
      if (userId) {
        connections.delete(userId);
        try {
          await storage.updateUser(userId, { isOnline: false });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for user:', userId, error);
    });
  });

  async function broadcastToRoom(chatRoomId: number, data: any) {
    try {
      // 채팅방 참가자 정보 가져오기
      const chatRoom = await storage.getChatRoomById(chatRoomId);
      if (!chatRoom || !chatRoom.participants) {
        console.log('채팅방 또는 참가자 정보를 찾을 수 없음:', chatRoomId);
        return;
      }

      console.log('간편음성메세지 브로드캐스트 시작:', chatRoomId, '참가자:', chatRoom.participants.length);
      
      // 각 참가자에게 메시지 전송
      chatRoom.participants.forEach((participant: any) => {
        const ws = connections.get(participant.id);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(data));
            console.log('메시지 전송 성공:', participant.id);
          } catch (error) {
            console.error(`참가자 ${participant.id}에게 메시지 전송 실패:`, error);
            connections.delete(participant.id);
          }
        } else {
          console.log('WebSocket 연결 없음 또는 닫힘:', participant.id);
        }
      });
    } catch (error) {
      console.error('broadcastToRoom 오류:', error);
    }
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

  // Initialize notification scheduler
  initializeNotificationScheduler(connections, broadcastToUser);

  // YouTube search API endpoint
  app.post("/api/youtube/search", async (req, res) => {
    try {
      const { query, maxResults = 8 } = req.body;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ success: false, error: "검색어가 필요합니다." });
      }

      // YouTube Data API v3를 사용한 검색
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      
      if (!YOUTUBE_API_KEY) {
        console.log("YouTube API 키가 설정되지 않았습니다.");
        return res.status(500).json({ 
          success: false, 
          error: "YouTube API 키가 설정되지 않았습니다." 
        });
      }

      // YouTube API 호출 - 여러 비디오 검색
      const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(youtubeApiUrl);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        // 비디오 ID들을 수집하여 추가 정보 가져오기
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
        
        // 비디오 상세 정보 (duration, viewCount 등) 가져오기
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        // 검색 결과와 상세 정보 결합
        const videos = data.items.map((item: any, index: number) => {
          const details = detailsData.items?.[index];
          const videoId = item.id.videoId;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          
          return {
            videoId: videoId,
            title: item.snippet.title,
            url: videoUrl,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            description: item.snippet.description,
            duration: details?.contentDetails?.duration,
            viewCount: details?.statistics?.viewCount
          };
        });
        
        res.json({
          success: true,
          videos: videos
        });
      } else {
        res.json({
          success: false,
          error: "검색 결과를 찾을 수 없습니다.",
          videos: []
        });
      }
    } catch (error) {
      console.error("YouTube 검색 오류:", error);
      
      // 오류 발생 시 기본 검색 URL 반환
      const { query } = req.body;
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query || "")}`;
      
      res.json({
        success: true,
        videos: [{
          videoId: "fallback",
          title: `"${query || "검색"}" 검색 결과`,
          url: searchUrl,
          thumbnailUrl: "https://via.placeholder.com/320x180/ff0000/ffffff?text=YouTube",
          channelTitle: "YouTube 검색",
          publishedAt: new Date().toISOString(),
          description: "YouTube에서 직접 검색하기"
        }]
      });
    }
  });

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

  // Voice Settings API
  app.patch("/api/user/voice-settings", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { allowVoicePlayback, autoPlayVoiceMessages } = req.body;
      
      const updatedUser = await storage.updateVoiceSettings(Number(userId), {
        allowVoicePlayback,
        autoPlayVoiceMessages
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        success: true,
        settings: {
          allowVoicePlayback: updatedUser.allowVoicePlayback,
          autoPlayVoiceMessages: updatedUser.autoPlayVoiceMessages
        }
      });
    } catch (error) {
      console.error("Error updating voice settings:", error);
      res.status(500).json({ error: "Failed to update voice settings" });
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

  // Location sharing endpoints
  app.post("/api/location/share", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { chatRoomId, latitude, longitude, address, googleMapsUrl, requestMessage } = req.body;

      // Create location share record
      const [locationShare] = await db.insert(locationShares).values({
        userId: Number(userId),
        chatRoomId: Number(chatRoomId),
        latitude,
        longitude,
        address,
        googleMapsUrl,
      }).returning();

      // Create a message with the location
      const locationMessage = await storage.createMessage({
        chatRoomId: Number(chatRoomId),
        senderId: Number(userId),
        content: `📍 위치 공유: ${address || '현재 위치'}`,
        messageType: 'location',
        locationData: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address,
          googleMapsUrl
        }
      });

      // Broadcast the location message to chat participants
      const participants = await storage.getChatParticipants(Number(chatRoomId));
      participants.forEach(participant => {
        if (wsConnections.has(participant.userId)) {
          const ws = wsConnections.get(participant.userId);
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'new_message',
              message: locationMessage,
              chatRoomId: Number(chatRoomId)
            }));
          }
        }
      });

      res.json({ 
        success: true, 
        locationShare,
        message: locationMessage
      });
    } catch (error) {
      console.error('Location share error:', error);
      res.status(500).json({ message: "Failed to share location" });
    }
  });

  app.post("/api/location/detect", async (req, res) => {
    try {
      const { text } = req.body;
      
      // Simple location-related keyword detection
      const locationKeywords = [
        '주소', '위치', '어디야', '어디로', '맵', '지도', 
        '길', '내비', '구글맵', '카카오맵', '찾아와',
        '여기로', '거기로', '보내줄게', '알려줄게'
      ];
      
      const isLocationRequest = locationKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      res.json({ isLocationRequest });
    } catch (error) {
      console.error('Location detection error:', error);
      res.status(500).json({ message: "Failed to detect location intent" });
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

  // Location sharing API routes
  app.post("/api/location/detect", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message content required" });
      }

      const isLocationRequest = storage.detectLocationRequest(message);
      
      res.json({ isLocationRequest });
    } catch (error) {
      console.error("Location detection error:", error);
      res.status(500).json({ message: "Failed to detect location request" });
    }
  });

  app.post("/api/location/request", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const requestData = insertLocationShareRequestSchema.parse(req.body);
      const request = await storage.createLocationShareRequest({
        ...requestData,
        requesterId: parseInt(userId as string)
      });

      // Notify the target user via WebSocket
      broadcastToUser(requestData.targetUserId, {
        type: 'location_share_request',
        data: request
      });

      res.json({ request });
    } catch (error) {
      console.error("Location share request error:", error);
      res.status(500).json({ message: "Failed to create location share request" });
    }
  });

  app.post("/api/location/respond", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { requestId, approved } = req.body;
      
      if (typeof requestId !== 'number' || typeof approved !== 'boolean') {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const request = await storage.getLocationShareRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Location share request not found" });
      }

      if (request.targetUserId !== parseInt(userId as string)) {
        return res.status(403).json({ message: "Not authorized to respond to this request" });
      }

      // Update the request with response
      const updatedRequest = await storage.updateLocationShareRequest(requestId, {
        response: approved ? 'approved' : 'denied',
        respondedAt: new Date()
      });

      // If approved, ask for location from the target user
      if (approved) {
        broadcastToUser(request.targetUserId, {
          type: 'location_share_approved',
          data: { requestId }
        });
      } else {
        // Notify requester of denial
        broadcastToUser(request.requesterId, {
          type: 'location_share_denied',
          data: { requestId }
        });
      }

      res.json({ request: updatedRequest });
    } catch (error) {
      console.error("Location share response error:", error);
      res.status(500).json({ message: "Failed to respond to location share request" });
    }
  });

  app.post("/api/location/share", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const shareData = insertLocationShareSchema.parse(req.body);
      const locationShare = await storage.createLocationShare({
        ...shareData,
        senderId: parseInt(userId as string)
      });

      // Create a message with the location share
      const locationMessage = await storage.createMessage({
        chatRoomId: shareData.chatRoomId,
        senderId: parseInt(userId as string),
        content: `내 위치를 공유했습니다: ${shareData.locationName || '현재 위치'}`,
        messageType: 'location',
        locationData: JSON.stringify({
          latitude: shareData.latitude,
          longitude: shareData.longitude,
          locationName: shareData.locationName,
          googleMapsUrl: `https://maps.google.com/maps?q=${shareData.latitude},${shareData.longitude}`
        })
      });

      // Broadcast location share to chat room
      broadcastToRoom(shareData.chatRoomId, {
        type: 'new_message',
        data: locationMessage
      });

      res.json({ locationShare, message: locationMessage });
    } catch (error) {
      console.error("Location share error:", error);
      res.status(500).json({ message: "Failed to share location" });
    }
  });

  app.get("/api/location/shares/:chatRoomId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { chatRoomId } = req.params;
      
      if (!chatRoomId || isNaN(Number(chatRoomId))) {
        return res.status(400).json({ message: "Valid chat room ID required" });
      }

      // Verify user has access to this chat room
      const chatRoom = await storage.getChatRoomById(Number(chatRoomId));
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }

      const hasAccess = chatRoom.participants.some(p => p.id === parseInt(userId as string));
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat room" });
      }

      const shares = await storage.getLocationSharesForChatRoom(Number(chatRoomId));
      res.json({ shares });
    } catch (error) {
      console.error("Get location shares error:", error);
      res.status(500).json({ message: "Failed to get location shares" });
    }
  });

  // Get all profile images for preloading
  app.get("/api/users/all-profile-images", async (req, res) => {
    const userId = req.session?.userId || req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Get all users with profile pictures
      const users = await storage.getAllUsers();
      const images = users
        .filter(user => user.profilePicture)
        .map(user => user.profilePicture)
        .filter(Boolean);

      res.json({ images });
    } catch (error) {
      console.error("Get profile images error:", error);
      res.status(500).json({ message: "Failed to get profile images" });
    }
  });

  // Reminder endpoints
  app.post('/api/reminders', async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { chatRoomId, reminderTime, reminderText } = req.body;
      
      if (!chatRoomId || !reminderTime || !reminderText) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const reminder = await storage.createReminder({
        chatRoomId: Number(chatRoomId),
        userId: userId,
        reminderText: reminderText,
        reminderTime: new Date(reminderTime),
        isPrivate: true
      });

      res.json({ reminder });
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get('/api/reminders', async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { chatRoomId } = req.query;
      
      let reminders;
      if (chatRoomId) {
        reminders = await storage.getChatRoomReminders(userId, Number(chatRoomId));
      } else {
        reminders = await storage.getUserReminders(userId);
      }

      res.json({ reminders });
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ message: "Failed to get reminders" });
    }
  });

  app.put('/api/reminders/:id', async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    const reminderId = Number(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const updates = req.body;
      const reminder = await storage.updateReminder(reminderId, userId, updates);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      res.json({ reminder });
    } catch (error) {
      console.error("Update reminder error:", error);
      res.status(500).json({ message: "Failed to update reminder" });
    }
  });

  app.delete('/api/reminders/:id', async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    const reminderId = Number(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.deleteReminder(reminderId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reminder error:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  // Message reaction API endpoints
  app.post("/api/messages/:messageId/react", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = Number(req.params.messageId);
      const { emoji, emojiName } = req.body;

      if (!emoji || !emojiName) {
        return res.status(400).json({ message: "Emoji and emoji name are required" });
      }

      await storage.addMessageReaction(messageId, Number(userId), emoji, emojiName);
      res.json({ success: true });
    } catch (error) {
      console.error("Message reaction error:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.delete("/api/messages/:messageId/react", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = Number(req.params.messageId);
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ message: "Emoji is required" });
      }

      await storage.removeMessageReaction(messageId, Number(userId), emoji);
      res.json({ success: true });
    } catch (error) {
      console.error("Message reaction removal error:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  app.get("/api/messages/:messageId/reactions", async (req, res) => {
    try {
      const messageId = Number(req.params.messageId);
      const reactions = await storage.getMessageReactions(messageId);
      res.json({ reactions });
    } catch (error) {
      console.error("Get message reactions error:", error);
      res.status(500).json({ message: "Failed to get reactions" });
    }
  });

  app.get("/api/messages/:messageId/reaction-suggestions", async (req, res) => {
    try {
      const messageId = Number(req.params.messageId);
      const suggestions = await storage.getMessageReactionSuggestions(messageId);
      res.json({ suggestions });
    } catch (error) {
      console.error("Get reaction suggestions error:", error);
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });

  return httpServer;
}
