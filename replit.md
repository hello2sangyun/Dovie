# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application designed to be a feature-rich messaging platform. It includes real-time chat, file sharing, business networking, location-based chat, and AI-powered commands. Originally built with Node.js/Express backend and React frontend, now also available as a complete Python/FastAPI implementation. Both versions provide comprehensive communication solutions with strong market potential for personal and business use.

### **Major Technology Migration Completed (August 2025)**
- ✅ **Complete Python/FastAPI Port**: Full Dovie Messenger implementation created in Python
- ✅ **All Features Ported**: Real-time WebSocket messaging, authentication, database models, push notifications
- ✅ **Production Ready**: Includes installation scripts, Docker support, and comprehensive documentation
- ✅ **Immediate Deployment**: Ready-to-run Python application with automated setup

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework**: React with TypeScript.
- **Build Tool**: Vite.
- **UI**: Tailwind CSS with shadcn/ui components, custom purple gradient themes.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Real-time**: WebSocket client.
- **Design Principles**: Focus on compact, elegant design with high message density, responsive layouts (mobile-first), and smooth animations (selective, performance-optimized). Chat bubbles feature gradient backgrounds and subtle shadows.
- **User Experience**: Features intelligent auto-scroll, instant image loading with preloading and caching, dynamic audio waveform visualizations for voice messages, and a unified send button for text/voice. Comprehensive PWA features for a native-like mobile experience.

### Backend - Dual Implementation
#### Original Node.js Version:
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM for schema management.

#### **New Python Version (Complete Implementation):**
- **Runtime**: Python 3.8+ with FastAPI
- **Language**: Python with full type hints
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing, supporting email/password and phone number (Twilio SMS API) login. Social login (Google, Facebook) integration ready.
- **File Handling**: FastAPI file uploads with AES-256 encryption for file storage
- **Real-time**: WebSocket manager for live chat with connection pooling
- **Security**: Advanced AES-256 file encryption, bcrypt password hashing, input validation, CORS, and rate limiting
- **AI Integration**: OpenAI API integration for smart commands (YouTube search/sharing, voice transcription, translation, reminder suggestions)
- **Push Notifications**: Complete web push (VAPID) and iOS APNS implementation
- **Installation**: Automated setup with install.py, quickstart.py, and Docker support
- **Core Features**:
    - **Authentication System**: Email/phone login, profile setup, role-based access.
    - **Chat System**: Real-time messaging (group/direct), file sharing (encrypted), message reactions/replies.
    - **Business Features**: Business profiles, professional networking space, post creation. (Note: digital business card feature removed from PC version).
    - **Location Features**: Location-based chat rooms, nearby user discovery, automated location sharing prompts based on message content.
    - **AI Integration**: OpenAI for YouTube search/sharing and smart reminders. Cost-efficient combined API calls for voice transcription and smart suggestions.
    - **File Management**: Encrypted storage, file preview, hashtag-based organization (single hashtag per file), PC-style folder structure for archive (자료실) based on chat rooms.
    - **Admin Panel**: For system monitoring and user management.
    - **Notifications**: Comprehensive PWA push notification system with VAPID key authentication, app badge updates, sound support, and intelligent filtering (Telegram/WhatsApp-style) to prevent notifications for active users. iOS Capacitor integration for native app push notifications with APNS entitlements.

### Data Flow
- **User Authentication**: Credentials submitted, validated, session managed, profile completion for new users.
- **Message Flow**: Message composed, sent via WebSocket, server processes/encrypts/stores, broadcast to participants.
- **File Upload Flow**: User selects file, client validates, uploaded, server encrypts, stored with metadata, URL returned. Includes real-time progress indicators and temporary message display during upload.

### PWA and Native App Conversion
- **PWA Conversion**: Comprehensive manifest.json, service worker for offline caching, app icons, and install prompt. Optimized for mobile installation and offline capabilities.
- **Native iOS App Conversion**: Transitioned from PWA to native iOS app using Capacitor, managing device tokens, and integrating with Apple Push Notification service (APNS). Focus on resolving iOS-specific build errors, status bar issues, and ensuring proper entitlements for push notifications.

## External Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL client.
- **drizzle-orm**: Database ORM and query builder.
- **bcryptjs**: Password hashing.
- **multer**: File upload handling.
- **ws**: WebSocket server implementation.
- **openai**: AI service integration.
- **crypto-js**: Encryption utilities.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Accessible UI components.
- **wouter**: Lightweight routing.
- **tailwindcss**: Utility-first CSS framework.
- **lucide-react**: Icon library.
- **date-fns**: Date manipulation.
- **twilio**: For SMS authentication.
- **ipapi.co**: For IP-based location detection (country selection).
- **react-image-crop**: For profile photo cropping.
- **web-push**: For push notification backend.
- **@capacitor/core**, **@capacitor/ios**, **@capacitor/push-notifications**: For iOS native app conversion and push notifications.

### Python Implementation Dependencies
- **fastapi**: Modern, fast web framework for building APIs
- **uvicorn**: ASGI server for FastAPI
- **sqlalchemy**: SQL toolkit and Object-Relational Mapping
- **asyncpg**: Async PostgreSQL driver
- **pywebpush**: Web push notification implementation
- **apns2**: Apple Push Notification service
- **openai**: OpenAI API integration
- **twilio**: SMS/phone verification
- **qrcode**: QR code generation
- **cryptography**: Advanced encryption support
- **websockets**: WebSocket server implementation