import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage_minimal";
import { insertUserSchema, insertContactSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { encryptFileData, decryptFileData, hashFileName } from "./crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users, contacts } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// WebSocket connections map
const connections = new Map<number, WebSocket>();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, `${timestamp}_${originalName}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes - Test login for development
  app.post("/api/auth/test-login", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        // Create test user
        const hashedPassword = await bcrypt.hash("password123", 10);
        user = await storage.createUser({
          username,
          email: `${username}@test.com`,
          password: hashedPassword,
          displayName: username,
          profilePicture: null
        });
      }

      res.json({ user: { id: user.id, username: user.username, displayName: user.displayName } });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
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

      const { password, ...userWithoutPassword } = user as any;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get contacts - CORE FUNCTIONALITY
  app.get("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const contacts = await storage.getContacts(Number(userId));
      res.json({ contacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  // Add contact
  app.post("/api/contacts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { contactUserId, nickname } = req.body;
      const contact = await storage.addContact({
        userId: Number(userId),
        contactUserId,
        nickname: nickname || '',
        isPinned: false,
        isBlocked: false
      });
      res.json({ contact });
    } catch (error) {
      console.error("Add contact error:", error);
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  // Update contact (for favorite toggle) - FIXED
  app.patch("/api/contacts/:contactId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { contactId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const updates = req.body;
      const contact = await storage.updateContact(
        Number(userId), 
        Number(contactId), 
        updates, 
        true // byId = true for contactId
      );
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.json({ contact });
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  // Block contact - FIXED
  app.post("/api/contacts/:contactUserId/block", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { contactUserId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.blockContact(Number(userId), Number(contactUserId));
      res.json({ success: true, message: "Contact blocked successfully" });
    } catch (error) {
      console.error("Block contact error:", error);
      res.status(500).json({ message: "Failed to block contact" });
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
      await storage.unblockContact(Number(userId), Number(contactUserId));
      res.json({ success: true, message: "Contact unblocked successfully" });
    } catch (error) {
      console.error("Unblock contact error:", error);
      res.status(500).json({ message: "Failed to unblock contact" });
    }
  });

  // Delete contact
  app.delete("/api/contacts/:contactUserId", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { contactUserId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.removeContact(Number(userId), Number(contactUserId));
      res.json({ success: true, message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Get blocked contacts
  app.get("/api/contacts/blocked", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const blockedContacts = await storage.getBlockedContacts(Number(userId));
      res.json({ contacts: blockedContacts });
    } catch (error) {
      console.error("Get blocked contacts error:", error);
      res.status(500).json({ message: "Failed to get blocked contacts" });
    }
  });

  // Chat rooms implementation
  app.get("/api/chat-rooms", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const chatRooms = await storage.getChatRooms(Number(userId));
      res.json({ chatRooms });
    } catch (error) {
      console.error("Get chat rooms error:", error);
      res.status(500).json({ message: "Failed to get chat rooms" });
    }
  });

  // Create chat room
  app.post("/api/chat-rooms", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { participantIds, name, type = "direct" } = req.body;
      
      // Ensure current user is included in participants
      const allParticipantIds = [Number(userId), ...participantIds].filter((id, index, arr) => arr.indexOf(id) === index);
      
      const chatRoom = await storage.createChatRoom({
        name: name || null,
        isGroup: allParticipantIds.length > 2,
        createdBy: Number(userId)
      }, allParticipantIds);

      res.json({ chatRoom });
    } catch (error) {
      console.error("Create chat room error:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  // Get messages for a chat room
  app.get("/api/chat-rooms/:chatRoomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { chatRoomId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messages = await storage.getMessages(Number(chatRoomId), 50);
      res.json({ messages });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send message
  app.post("/api/chat-rooms/:chatRoomId/messages", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { chatRoomId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { content, messageType = "text" } = req.body;
      
      const message = await storage.createMessage({
        chatRoomId: Number(chatRoomId),
        senderId: Number(userId),
        content,
        messageType
      } as any);

      res.json({ message });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get unread counts
  app.get("/api/unread-counts", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const unreadCounts = await storage.getUnreadCounts(Number(userId));
      res.json(unreadCounts);
    } catch (error) {
      console.error("Get unread counts error:", error);
      res.status(500).json({ message: "Failed to get unread counts" });
    }
  });

  // Create HTTP server and WebSocket server
  const httpServer = createServer(app);

  // WebSocket setup - SIMPLIFIED AND FIXED
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection attempt');
    let userId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);
        
        if (message.type === 'auth' && message.userId) {
          userId = Number(message.userId);
          connections.set(userId, ws);
          console.log('WebSocket user authenticated:', userId);
          
          // Send successful authentication response
          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            userId,
            message: 'Authentication successful' 
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket connection closed for user:', userId);
      if (userId) {
        connections.delete(userId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for user:', userId, error);
    });
  });

  return httpServer;
}