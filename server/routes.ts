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
import { eq, desc, or, and, like, count, lt, asc } from "drizzle-orm";
import { db } from "./db";

const upload = multer({ dest: "uploads/" });

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

  // Authentication endpoints
  app.post("/api/register", async (req, res) => {
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

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

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
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const chatRoomId = Number(req.params.chatRoomId);
      let messageData: any = {
        chatRoomId,
        senderId: Number(userId),
        messageType: 'text',
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

      const message = await storage.createMessage(insertMessageSchema.parse(messageData));
      
      broadcastToRoom(chatRoomId, {
        type: 'new_message',
        message: message,
      });

      res.json({ message });
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(500).json({ message: "Failed to create message" });
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

  // File serving
  app.get("/api/files/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join('uploads', fileName);
      
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
      const encryptedBuffer = await fs.readFile(filePath);
      
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(decrypted);
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

  return httpServer;
}