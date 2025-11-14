# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application offering real-time communication, secure file sharing, business networking, and location-based interactions. It integrates AI-powered commands and aims to provide a native-like mobile experience with robust push notifications and cross-platform badging, focusing on performance and a comprehensive messaging solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX Decisions
The frontend uses React, TypeScript, Vite, Tailwind CSS, and shadcn/ui, with state managed by TanStack Query and routing by Wouter. It features a premium purple theme with gradients, shadows, and rounded corners, optimized for mobile responsiveness. Key UI elements include instant image loading with global Blob-based caching, compact chat bubbles, top banner-style mobile notifications, and a comprehensive PWA badge system. iOS-like navigation includes swipe-back gestures and smooth slide transitions. Touch event handling is optimized for previews, long-press, and scroll. Multi-file uploads show unified progress. iOS zoom prevention is implemented to prevent automatic zoom when opening modals or focusing inputs.

### Technical Implementations
The backend is built with Node.js and Express.js (TypeScript, ES modules), using PostgreSQL and Drizzle ORM. Authentication includes email/password/phone verification with bcrypt. File handling uses Multer and AES-256 encryption. A WebSocket server manages real-time communication with intelligent background/foreground handling. AI integration uses OpenAI for commands, translation, transcription, and suggestions. Voice messages feature real-time transcription, waveform visualization, and silence detection. WebRTC voice calling uses peer-to-peer connections with STUN/TURN for NAT traversal. Comprehensive PWA capabilities and native iOS conversion via Capacitor enhance features like intelligent browser history, persistent sessions, and message retry. Battery optimization includes WebSocket auto-disconnection and microphone teardown. **CallKit VoIP Integration**: Production-ready native iOS CallKit integration via custom Capacitor plugin (CallKitVoipPlugin.swift), registered in CapacitorPlugins.swift and added to Xcode project via automated script (add-swift-files-to-xcode.cjs). Uses 3-layer architecture: (1) Native Bridge Bootstrap - one-time CallKit/PushKit registration per process lifecycle, (2) Per-User Context - safe userId/userName updates without touching native listeners, (3) Handler Management - effect-safe JS callback binding with explicit unbind. Includes PushKit VoIP push notifications (.voip topic), native incoming call UI, and system call history integration. Event bridge connects native CallKit actions (answer/end) to CallSessionStore for WebRTC session management. VoIP token preserved across auth refresh and re-registered on user switch. NOTE: Backend VoIP token deregistration endpoint pending implementation - requires unified `/api/push/device-tokens` POST/DELETE with tokenType discrimination.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup, role-based access.
- **Chat System**: Real-time group/direct chats, encrypted file sharing, emoji reactions with user profiles, replies, archiving, infinite scroll pagination, and per-file download loading states.
- **Business Features**: Business profiles and professional networking.
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Intelligent filtering, grouped notifications, iOS PWA/Native app support with sound, badges, Dovie logo icons, and background message preloading. Supports iOS Rich Notifications for media previews.
- **Hashtag System**: Single hashtag per file, auto-extraction, enhanced search.
- **Voice Messages**: Unified recording experience with a full-screen modal, real-time transcription, smart suggestions, silence detection, and reply support.
- **YouTube Integration**: Search, preview, and sharing within chat.
- **AI Inbox (Smart Inbox)**: Intelligent message filtering, notification management with badges, swipe-to-delete, message highlighting, and filter toggles.
- **Settings**: Account management, AI settings, language selection, and support.
- **File Uploads**: Increased per-file upload limit (100MB) with inline previews.
- **File Preview**: Fullscreen immersive modal with pinch-to-zoom, pan, double-tap reset, auto-hiding UI, and gesture-optimized controls for images, videos, and PDFs. Includes share/save/forward capabilities via Capacitor.
- **CallKit Integration**: Native iOS calling experience using Apple's CallKit with VoIP push notifications, including native incoming call UI and system call history integration.

### System Design Choices
The application prioritizes mobile performance. iOS keyboard handling uses `resize: 'native'` in Capacitor with CSS for proper viewport behavior. Code splitting with React.lazy reduces bundle size. Main thread blocking operations are avoided. Standardized loading states and refined push notifications enhance UX. Message pagination uses infinite scroll with IntersectionObserver. File caching implements a per-URL subscriber pattern for efficient downloads. Emoji reactions use database joins to avoid N+1 queries.

## External Dependencies
- **Database**: `@neondatabase/serverless`, `drizzle-orm`.
- **Authentication/Security**: `bcryptjs`, `crypto-js`, `jsonwebtoken`.
- **File Uploads**: `multer`.
- **Real-time**: `ws` (WebSocket).
- **AI**: `openai`.
- **Frontend State Management**: `@tanstack/react-query`.
- **UI Components**: `@radix-ui/*`, `tailwindcss`, `lucide-react`.
- **Routing**: `wouter`.
- **Date Utilities**: `date-fns`.
- **SMS/Phone Verification**: Twilio SMS API.
- **Geolocation**: ipapi.co service, browser geolocation API.
- **Maps**: Google Maps integration.
- **Native App Conversion**: Capacitor framework (`@capacitor/keyboard`, `@capacitor/push-notifications`, `@capacitor/share`, `@capacitor/filesystem`).
- **iOS Push Notifications**: Apple Push Notification service (APNS).
- **Push Notifications**: `web-push` for PWA notifications.
- **File Operations**: Capacitor Share API, Filesystem API.
- **CallKit VoIP**: Custom Capacitor plugin for iOS CallKit integration.