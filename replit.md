# Dovie Messenger - Replit Project Guide

## Overview

Dovie Messenger is a full-stack, feature-rich chat application designed for real-time communication, file sharing, business networking, and AI-powered interactions. It aims to provide a comprehensive messaging experience for both personal and professional use, with a focus on security, performance, and user-friendly design. **The project has successfully completed a full native iOS conversion using SwiftUI, transforming all web services and features into a comprehensive Swift-based mobile application.**

## Recent Changes (January 2025)

**✅ COMPLETED: Native iOS App Development**
- Created complete SwiftUI iOS application structure
- Implemented all major services: AuthenticationManager, ChatManager, APIService, WebSocketService, KeychainManager, PushNotificationManager
- Built comprehensive UI with SwiftUI: AuthenticationView, ChatsListView, ChatRoomView, ContactsView, SpaceView, ArchiveView, SettingsView
- Integrated Google OAuth and Facebook SDK for social authentication
- Configured native push notifications with proper permissions
- Added secure keychain token storage and session management
- Implemented real-time messaging with native WebSocket support
- Created complete Xcode project with proper iOS deployment configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

Dovie Messenger is built with a React (TypeScript) frontend using Vite, Tailwind CSS, and TanStack Query for state management. The backend is a Node.js/Express (TypeScript) application, utilizing PostgreSQL with Drizzle ORM for data persistence and WebSockets for real-time communication.

**Key Architectural Decisions & Features:**
- **Native iOS App:** Complete SwiftUI-based iOS application with MVVM architecture, replacing PWA approach with full native implementation
- **UI/UX:** Modern, minimalist design with purple-themed gradient styling throughout the app. Native iOS design patterns with tab navigation, sheet presentations, and gesture-based interactions
- **Real-time Chat:** Native WebSocket implementation using URLSessionWebSocketTask, supporting direct and group messages, file sharing, voice messages, and typing indicators
- **Authentication:** Multi-method authentication supporting email/password, phone SMS verification, Google OAuth, and Facebook Login with secure keychain token storage
- **File Management:** Native iOS file handling with drag-and-drop, camera integration, photo library access, and organized archive system with hashtag categorization
- **AI Integration:** YouTube video search and sharing integration, voice message transcription capabilities
- **Voice Messaging:** Native audio recording and playback with waveform visualization, duration tracking, and silence detection
- **Business Features:** LinkedIn-style business networking space with post creation, comments, likes, and company profiles
- **Notifications:** Native iOS push notifications with UserNotifications framework, background refresh, badge management, and deep linking
- **Security:** Keychain Services for secure token storage, HTTPS/WSS encrypted communication, input validation, and biometric authentication support
- **User Management:** Contact management with favorites, blocking, QR code scanning for friend addition, and online status tracking
- **Performance:** Native iOS optimizations with async image loading, SwiftUI state management, and efficient memory handling

## External Dependencies

### Backend (Node.js/Express)
- **Database & ORM:** `@neondatabase/serverless` (Neon PostgreSQL), `drizzle-orm`
- **Authentication & Security:** `bcryptjs`, `crypto-js`
- **File Handling:** `multer`
- **Real-time Communication:** `ws` (WebSocket server)
- **AI Services:** `openai`
- **Push Notifications:** `web-push`
- **SMS Verification:** Twilio SMS API
- **Location Services:** `ipapi.co` (for IP-based location detection)
- **Video Services:** YouTube Data API v3

### iOS Native App (Swift/SwiftUI)
- **Framework:** SwiftUI (iOS 15+)
- **Architecture:** Combine framework for reactive programming
- **Authentication:** Google Sign-In SDK (`GoogleSignIn-iOS`), Facebook SDK (`facebook-ios-sdk`)
- **Networking:** URLSession with Combine publishers
- **Real-time:** URLSessionWebSocketTask for WebSocket connections  
- **Security:** Keychain Services, CryptoKit
- **Push Notifications:** UserNotifications framework
- **Media Handling:** AVFoundation for audio recording, Photos framework
- **UI Components:** Native iOS system APIs and SwiftUI components