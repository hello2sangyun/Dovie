import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertCommandSchema, insertContactSchema, insertChatRoomSchema, insertPhoneVerificationSchema } from "@shared/schema";
import { translateText, transcribeAudio } from "./openai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { encryptFileData, decryptFileData, hashFileName } from "./crypto";
import { processCommand } from "./openai";

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
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Error details:", error.message);
      if (error.issues) {
        console.error("Validation issues:", error.issues);
      }
      res.status(500).json({ message: "회원가입에 실패했습니다.", error: error.message });
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

  // 프로필 업데이트 API
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      if (!userId) {
        return res.status(400).json({ message: "사용자 ID가 필요합니다." });
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
      await storage.leaveChatRoom(Number(req.params.chatRoomId), Number(userId), saveFiles);
      
      // 나가기 메시지 전송
      const leaveMessage = await storage.createMessage({
        chatRoomId: Number(req.params.chatRoomId),
        senderId: Number(userId),
        content: `사용자가 채팅방을 나갔습니다.`,
        messageType: "system",
      });

      // WebSocket으로 알림
      broadcastToRoom(Number(req.params.chatRoomId), {
        type: "message",
        message: leaveMessage,
      });

      res.json({ success: true });
    } catch (error) {
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
      console.error("Message creation error:", error);
      res.status(500).json({ message: "Failed to send message", error: error.message });
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
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    if (result.success) {
      res.json({
        success: true,
        transcription: result.transcription,
        duration: result.duration,
        detectedLanguage: result.detectedLanguage,
        confidence: result.confidence
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "음성 변환에 실패했습니다."
      });
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
