import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertCommandSchema, insertContactSchema, insertChatRoomSchema, insertPhoneVerificationSchema, insertUserPostSchema, insertPostLikeSchema, insertPostCommentSchema, insertCompanyChannelSchema, insertCompanyProfileSchema, chatRooms, chatParticipants, userPosts, postLikes, postComments, companyChannels, companyChannelFollowers, companyChannelAdmins, users, contacts, companyProfiles, messages, messageReads } from "@shared/schema";
import { sql } from "drizzle-orm";
import { translateText, transcribeAudio } from "./openai";
import bcrypt from "bcryptjs";
import multer from "multer";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { ImageOptimizer } from "./imageOptimizer";
import { optimizeAllProfileImages } from "./optimizeExistingImages";
import { decryptFileData, encryptFileData } from "./crypto";
import { eq, desc, or, and, like, count, lt, asc } from "drizzle-orm";
import { db } from "./db";

const upload = multer({ dest: "uploads/" });

// WebSocket extension for user data
interface ExtendedWebSocket extends WebSocket {
  userData?: { chatRoomId: number; userId: number };
}

// Store WebSocket connections
const connections = new Set<WebSocket>();
const roomConnections = new Map<number, Set<WebSocket>>();
const userConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    connections.add(ws);
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join_room') {
          const { chatRoomId, userId } = data;
          if (!roomConnections.has(chatRoomId)) {
            roomConnections.set(chatRoomId, new Set());
          }
          roomConnections.get(chatRoomId)!.add(ws);
          userConnections.set(userId, ws);
          ws.userData = { chatRoomId, userId };
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connections.delete(ws);
      if (ws.userData) {
        const { chatRoomId, userId } = ws.userData;
        if (roomConnections.has(chatRoomId)) {
          roomConnections.get(chatRoomId)!.delete(ws);
        }
        userConnections.delete(userId);
      }
    });
  });

  function broadcastToRoom(chatRoomId: number, data: any) {
    if (roomConnections.has(chatRoomId)) {
      roomConnections.get(chatRoomId)!.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });
    }
  }

  function broadcastToUser(userId: number, data: any) {
    const ws = userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Authentication endpoints - moved to top priority
  app.post("/api/auth/register", async (req, res) => {
    console.log("🔐 Register endpoint hit:", req.body);
    try {
      const { username, email, password, displayName } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = insertUserSchema.parse({
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
      });

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    console.log("🔐 Login endpoint hit:", { email: req.body.email });
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("❌ User not found for email:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log("❌ Invalid password for user:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("✅ Login successful for user:", email);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
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
      const { name, participants } = req.body;
      
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ message: "At least one participant is required" });
      }

      const chatRoomData = insertChatRoomSchema.parse({
        name: name || "New Chat",
        createdBy: Number(userId),
      });

      const allParticipants = [...new Set([Number(userId), ...participants])];
      const chatRoom = await storage.createChatRoom(chatRoomData, allParticipants);
      
      res.json({ chatRoom });
    } catch (error) {
      console.error("Chat room creation error:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  // Message routes
  app.get("/api/chat-rooms/:chatRoomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messages = await storage.getMessages(Number(req.params.chatRoomId));
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/chat-rooms/:chatRoomId/messages", upload.single('file'), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      console.error("Message API: No user ID in headers");
      return res.status(401).json({ message: "Not authenticated" });
    }

    console.log("Message API: Received request", {
      chatRoomId: req.params.chatRoomId,
      userId,
      hasFile: !!req.file,
      body: req.body
    });

    try {
      const chatRoomId = Number(req.params.chatRoomId);
      
      if (!chatRoomId || isNaN(chatRoomId)) {
        console.error("Message API: Invalid chat room ID", req.params.chatRoomId);
        return res.status(400).json({ message: "Invalid chat room ID" });
      }

      let messageData: any = {
        chatRoomId,
        senderId: Number(userId),
        messageType: 'text',
        content: '', // 기본값 설정
      };

      if (req.file) {
        const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
        const fileBuffer = await fs.readFile(req.file.path);
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        let encrypted = cipher.update(fileBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const fileName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
        const filePath = path.join('uploads', fileName);
        await fs.writeFile(filePath, encrypted);
        await fs.unlink(req.file.path);

        messageData.fileUrl = filePath;
        messageData.fileName = req.file.originalname;
        messageData.messageType = 'file';
        messageData.content = req.body.content || `File: ${req.file.originalname}`;
      } else {
        messageData.content = req.body.content;
      }

      // 메시지 내용 검증
      if (!messageData.content || messageData.content.trim().length === 0) {
        console.error("Message API: Empty message content");
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      console.log("Message API: Creating message with data", messageData);

      const message = await storage.createMessage(insertMessageSchema.parse(messageData));
      
      console.log("Message API: Message created successfully", { messageId: message.id });

      broadcastToRoom(chatRoomId, {
        type: 'new_message',
        message: message,
      });

      res.json({ message });
    } catch (error) {
      console.error("Message creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to create message", error: errorMessage });
    }
  });

  // Contact routes with performance optimization
  app.get("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.time(`Get contacts for user ${userId}`);
      const contacts = await storage.getContacts(Number(userId));
      console.timeEnd(`Get contacts for user ${userId}`);
      
      // Set cache headers for better performance
      res.set('Cache-Control', 'private, max-age=30');
      res.json({ contacts });
    } catch (error) {
      console.error("Contact retrieval error:", error);
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const contactData = insertContactSchema.parse({
        userId: Number(userId),
        ...req.body,
      });

      const contact = await storage.addContact(contactData);
      res.json({ contact });
    } catch (error) {
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  // Profile image upload with optimization
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const tempFilePath = req.file.path;
      const originalFileName = req.file.originalname;
      const fileExtension = path.extname(originalFileName).toLowerCase();
      
      // Check if it's an image file
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);
      
      if (isImage) {
        // Optimize the image for profile pictures
        const optimizedFileName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.jpg`;
        const optimizedPath = path.join('uploads', `temp_${optimizedFileName}`);
        
        // Optimize the image
        const optimizationResult = await ImageOptimizer.optimizeProfileImage(tempFilePath, optimizedPath);
        
        // Encrypt the optimized image using CryptoJS method
        const optimizedBuffer = await fs.readFile(optimizedPath);
        const encryptedData = encryptFileData(optimizedBuffer);

        // Save encrypted file
        const finalPath = path.join('uploads', optimizedFileName);
        await fs.writeFile(finalPath, encryptedData, 'utf8');

        // Clean up temporary files
        await fs.unlink(tempFilePath);
        await fs.unlink(optimizedPath);

        console.log(`📸 Profile image optimized: ${optimizationResult.originalSize} → ${optimizationResult.optimizedSize} bytes (${optimizationResult.compressionRatio.toFixed(1)}% reduction)`);

        res.json({
          fileUrl: `/uploads/${optimizedFileName}`,
          fileName: originalFileName,
          fileSize: optimizationResult.optimizedSize,
          compressionRatio: optimizationResult.compressionRatio
        });
      } else {
        // Handle non-image files (keep existing encryption logic)
        const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
        const fileBuffer = await fs.readFile(tempFilePath);
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        let encrypted = cipher.update(fileBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const fileName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
        const filePath = path.join('uploads', fileName);
        await fs.writeFile(filePath, encrypted);
        await fs.unlink(tempFilePath);

        res.json({
          fileUrl: `/uploads/${fileName}`,
          fileName: originalFileName,
          fileSize: fileBuffer.length
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // File serving with fallback for different encryption methods
  app.get("/api/files/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join('uploads', fileName);
      
      try {
        // Try CryptoJS decryption first (for new optimized images)
        const encryptedData = await fs.readFile(filePath, 'utf8');
        const decryptedBuffer = decryptFileData(encryptedData);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(decryptedBuffer);
      } catch (cryptoJSError) {
        // Fallback to old Node.js crypto method
        try {
          const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
          const encryptedBuffer = await fs.readFile(filePath);
          
          const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
          let decrypted = decipher.update(encryptedBuffer);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.send(decrypted);
        } catch (nodeCryptoError) {
          console.error("Both decryption methods failed:", { cryptoJSError, nodeCryptoError });
          throw nodeCryptoError;
        }
      }
    } catch (error) {
      console.error("File serving error:", error);
      res.status(404).json({ message: "File not found" });
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

  // Image optimization endpoint
  app.post("/api/admin/optimize-images", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("🚀 Starting profile image optimization process...");
      const results = await optimizeAllProfileImages();
      res.json({ 
        success: true, 
        message: "Profile image optimization completed",
        results 
      });
    } catch (error) {
      console.error("Image optimization error:", error);
      res.status(500).json({ message: "Failed to optimize images" });
    }
  });

  return httpServer;
}