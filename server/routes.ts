import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertCommandSchema, insertContactSchema, insertChatRoomSchema, insertPhoneVerificationSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// 임시 인증 데이터 저장소 (실제로는 Redis 등을 사용해야 함)
const tempVerificationData = new Map<string, { phoneNumber: string; email?: string; timestamp: number }>();
import multer from "multer";
import path from "path";
import fs from "fs";
import { encryptFileData, decryptFileData, hashFileName } from "./crypto";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
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
        const userData = insertUserSchema.parse({
          username,
          displayName: username,
        });
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

  // 전화번호 가용성 확인 (회원가입용)
  app.post("/api/auth/check-phone", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);
      
      res.json({ 
        available: !existingUser,
        message: existingUser ? "이미 가입된 번호입니다" : "사용 가능한 번호입니다"
      });
    } catch (error) {
      console.error("Phone check error:", error);
      res.status(500).json({ message: "전화번호 확인에 실패했습니다." });
    }
  });

  // SMS 인증 코드 전송 (로그인용)
  app.post("/api/auth/send-sms-login", async (req, res) => {
    try {
      const { phoneNumber, countryCode } = req.body;
      
      if (!phoneNumber || !countryCode) {
        return res.status(400).json({ message: "Phone number and country code are required" });
      }

      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // 기존 사용자 확인 - 가입된 사용자만 로그인 가능
      const existingUser = await storage.getUserByPhoneNumber(fullPhoneNumber);
      if (!existingUser) {
        return res.status(404).json({ 
          message: "가입되지 않은 전화번호입니다. 회원가입을 먼저 진행해주세요.",
          error: "USER_NOT_FOUND"
        });
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

      // 개발 환경에서는 SMS 전송 없이 콘솔에서만 확인
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [개발용] SMS 인증 코드: ${verificationCode} (${fullPhoneNumber})`);
        console.log(`📱 위 코드를 인증 화면에 입력하세요!`);
      } else {
        // 프로덕션에서는 실제 SMS 전송
        try {
          const { sendSMSVerification } = await import('./sms');
          await sendSMSVerification(fullPhoneNumber, verificationCode);
          console.log(`SMS 전송 성공: ${fullPhoneNumber}`);
        } catch (smsError) {
          console.error("SMS 전송 실패:", smsError);
          throw smsError;
        }
      }

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

  // SMS 인증 코드 전송 (회원가입용)
  app.post("/api/auth/send-sms-signup", async (req, res) => {
    try {
      const { phoneNumber, countryCode } = req.body;
      
      if (!phoneNumber || !countryCode) {
        return res.status(400).json({ message: "Phone number and country code are required" });
      }

      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // 기존 사용자 확인 - 이미 가입된 사용자는 회원가입 불가
      const existingUser = await storage.getUserByPhoneNumber(fullPhoneNumber);
      if (existingUser) {
        return res.status(409).json({ 
          message: "이미 가입된 전화번호입니다.",
          error: "PHONE_ALREADY_EXISTS"
        });
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

      // 개발 환경에서는 SMS 전송 없이 콘솔에서만 확인
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [개발용] SMS 인증 코드: ${verificationCode} (${fullPhoneNumber})`);
        console.log(`📱 위 코드를 인증 화면에 입력하세요!`);
      } else {
        // 프로덕션에서는 실제 SMS 전송
        try {
          const { sendSMSVerification } = await import('./sms');
          await sendSMSVerification(fullPhoneNumber, verificationCode);
          console.log(`SMS 전송 성공: ${fullPhoneNumber}`);
        } catch (smsError) {
          console.error("SMS 전송 실패:", smsError);
          throw smsError;
        }
      }

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

  // SMS 인증 확인 (로그인용)
  app.post("/api/auth/verify-sms-login", async (req, res) => {
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

      // 기존 사용자 로그인
      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);
      
      if (!existingUser) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(existingUser.id, { isOnline: true });
      
      res.json({ 
        success: true,
        user: existingUser,
        message: "로그인이 완료되었습니다."
      });
    } catch (error) {
      console.error("SMS verify error:", error);
      res.status(500).json({ message: "인증에 실패했습니다." });
    }
  });

  // SMS 인증 확인 (회원가입용)
  app.post("/api/auth/verify-sms-signup", async (req, res) => {
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

      // 새 사용자 생성
      const phoneDigits = phoneNumber.replace(/[^\d]/g, '');
      const timestamp = Date.now();
      const userData = insertUserSchema.parse({
        username: `user_${phoneDigits.slice(-8)}_${timestamp}`,
        displayName: `사용자 ${phoneNumber.slice(-4)}`,
        phoneNumber: phoneNumber,
      });

      const newUser = await storage.createUser(userData);

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(newUser.id, { isOnline: true });
      
      res.json({ 
        success: true,
        user: newUser,
        message: "회원가입이 완료되었습니다. 프로필을 설정해주세요."
      });
    } catch (error) {
      console.error("SMS verify signup error:", error);
      res.status(500).json({ message: "회원가입에 실패했습니다." });
    }
  });

  // 기존 SMS 인증 코드 (호환성 유지)
  app.post("/api/auth/send-sms", async (req, res) => {
    res.status(404).json({ message: "Deprecated endpoint. Use /api/auth/send-sms-login or /api/auth/send-sms-signup" });
  });

  // 기존 SMS 인증 코드 확인 (호환성 유지)
  app.post("/api/auth/verify-sms", async (req, res) => {
    res.status(404).json({ message: "Deprecated endpoint. Use /api/auth/verify-sms-login or /api/auth/verify-sms-signup" });
  });
          user: existingUser,
          message: "로그인이 완료되었습니다."
        });
      } else {
        // 새 사용자 생성 및 프로필 설정으로 이동
        const phoneDigits = phoneNumber.replace(/[^\d]/g, '');
        const timestamp = Date.now();
        const userData = insertUserSchema.parse({
          username: `user_${phoneDigits.slice(-8)}_${timestamp}`,
          displayName: `사용자 ${phoneNumber.slice(-4)}`,
          phoneNumber: phoneNumber,
        });

        const newUser = await storage.createUser(userData);

        // 사용자 온라인 상태 업데이트
        await storage.updateUser(newUser.id, { isOnline: true });
        
        res.json({ 
          success: true,
          nextStep: "profile_setup",
          user: newUser,
          message: "전화번호 인증이 완료되었습니다. 프로필을 설정해주세요."
        });
      }
    } catch (error) {
      console.error("SMS verify error:", error);
      res.status(500).json({ message: "인증에 실패했습니다." });
    }
  });

  // 이메일 인증 코드 전송
  app.post("/api/auth/send-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // 임시 데이터에서 전화번호 확인
      const { tempId } = req.body;
      if (!tempId || !tempVerificationData.has(tempId)) {
        return res.status(400).json({ message: "Phone verification required first" });
      }

      const tempData = tempVerificationData.get(tempId)!;

      // 기존 사용자 확인 - 이미 가입된 이메일인지 체크
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "이미 가입되어 있는 이메일 주소입니다.",
          error: "EMAIL_ALREADY_EXISTS"
        });
      }

      // 6자리 인증 코드 생성
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 만료 시간 설정 (10분)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // 기존 미인증 코드 정리
      await storage.cleanupExpiredEmailVerifications();

      // 새 인증 코드 저장
      const verification = await storage.createEmailVerification({
        email,
        verificationCode,
        expiresAt,
        isVerified: false,
      });

      // 개발 환경에서는 이메일 전송 없이 콘솔에서만 확인
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [개발용] 이메일 인증 코드: ${verificationCode} (${email})`);
        console.log(`✉️ 위 코드를 이메일 인증 화면에 입력하세요!`);
      } else {
        // 프로덕션에서는 실제 이메일 전송
        try {
          const { sendEmailVerification } = await import('./email');
          await sendEmailVerification(email, verificationCode);
          console.log(`이메일 전송 성공: ${email}`);
        } catch (emailError) {
          console.error("이메일 전송 실패:", emailError);
          throw emailError;
        }
      }

      // 임시 데이터에 이메일 추가
      tempData.email = email;
      tempVerificationData.set(tempId, tempData);

      res.json({ 
        success: true, 
        message: "인증 코드를 이메일로 전송했습니다.",
        // 개발용으로만 포함 (프로덕션에서는 제거)
        ...(process.env.NODE_ENV === 'development' && { verificationCode })
      });
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ message: "이메일 전송에 실패했습니다." });
    }
  });

  // 이메일 인증 코드 확인
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, verificationCode, tempId } = req.body;
      
      if (!email || !verificationCode || !tempId) {
        return res.status(400).json({ message: "Email, verification code, and tempId are required" });
      }

      // 임시 데이터 확인
      if (!tempVerificationData.has(tempId)) {
        return res.status(400).json({ message: "Invalid session. Please start over." });
      }

      const tempData = tempVerificationData.get(tempId)!;

      // 인증 코드 확인
      const verification = await storage.getEmailVerification(email, verificationCode);
      
      if (!verification) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // 인증 코드를 사용됨으로 표시
      await storage.markEmailVerificationAsUsed(verification.id);

      // 이제 사용자 생성 - 전화번호와 이메일 인증이 모두 완료됨
      const phoneDigits = tempData.phoneNumber.replace(/[^\d]/g, '');
      const timestamp = Date.now();
      const userData = insertUserSchema.parse({
        username: `user_${phoneDigits.slice(-8)}_${timestamp}`,
        displayName: `사용자 ${tempData.phoneNumber.slice(-4)}`,
        phoneNumber: tempData.phoneNumber,
        email: email,
        isEmailVerified: true
      });

      const newUser = await storage.createUser(userData);

      // 임시 데이터 삭제
      tempVerificationData.delete(tempId);

      // 사용자 온라인 상태 업데이트
      await storage.updateUser(newUser.id, { isOnline: true });

      res.json({ 
        success: true,
        nextStep: "profile_setup",
        user: newUser,
        message: "이메일 인증이 완료되었습니다. 프로필을 설정해주세요."
      });
    } catch (error) {
      console.error("Email verify error:", error);
      res.status(500).json({ message: "이메일 인증에 실패했습니다." });
    }
  });

  // 프로필 설정 완료
  app.post("/api/auth/complete-profile", async (req, res) => {
    try {
      const { userId, username, displayName, profilePicture } = req.body;
      
      if (!userId || !username || !displayName) {
        return res.status(400).json({ message: "User ID, username, and display name are required" });
      }

      // 사용자명 중복 확인
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // 프로필 정보 업데이트
      const updatedUser = await storage.updateUser(userId, { 
        username,
        displayName,
        profilePicture,
        isProfileComplete: true
      });

      res.json({ 
        success: true,
        user: updatedUser,
        message: "프로필 설정이 완료되었습니다."
      });
    } catch (error) {
      console.error("Profile setup error:", error);
      res.status(500).json({ message: "프로필 설정에 실패했습니다." });
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
      const messageData = insertMessageSchema.parse({
        chatRoomId: Number(req.params.chatRoomId),
        senderId: Number(userId),
        ...req.body,
      });

      const message = await storage.createMessage(messageData);
      const messageWithSender = await storage.getMessageById(message.id);

      // Broadcast to WebSocket connections
      broadcastToRoom(Number(req.params.chatRoomId), {
        type: "new_message",
        message: messageWithSender,
      });

      res.json({ message: messageWithSender });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // File upload route with encryption
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

  // Serve encrypted files with decryption
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadDir, filename);
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // 암호화된 파일 읽기
      const encryptedData = fs.readFileSync(filePath, 'utf8');
      
      // 파일 복호화
      const decryptedBuffer = decryptFileData(encryptedData);
      
      // 파일 확장자에 따른 Content-Type 설정
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.txt') contentType = 'text/plain; charset=utf-8';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.pdf') contentType = 'application/pdf';
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': decryptedBuffer.length,
      });
      
      res.send(decryptedBuffer);
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
      const commandData = insertCommandSchema.parse({
        userId: Number(userId),
        ...req.body,
      });

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
      res.json({ command });
    } catch (error) {
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

  return httpServer;
}
