# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application offering real-time communication, secure file sharing, business networking, and location-based interactions. It integrates AI-powered commands and aims to provide a native-like mobile experience with robust push notifications and cross-platform badging, focusing on performance and a comprehensive messaging solution.

**Platform Strategy:**
- **Android**: PWA (Progressive Web App) with Service Worker for push notifications and badge API
- **iOS**: Native App built with Capacitor for APNS push notifications and native badge support

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX Decisions
The frontend uses React, TypeScript, Vite, Tailwind CSS, and shadcn/ui, with state managed by TanStack Query and routing by Wouter. It features a premium purple theme with gradients, shadows, and rounded corners, optimized for mobile responsiveness. Key UI elements include instant image loading with global Blob-based caching, compact chat bubbles, top banner-style mobile notifications, and a comprehensive PWA badge system. iOS-like navigation includes swipe-back gestures and smooth slide transitions. Touch event handling is optimized for previews, long-press, and scroll. Multi-file uploads show unified progress. iOS zoom prevention is implemented to prevent automatic zoom when opening modals or focusing inputs.

### Technical Implementations
The backend is built with Node.js and Express.js (TypeScript, ES modules), using PostgreSQL and Drizzle ORM. Authentication includes email/password/phone verification with bcrypt. File handling uses Multer and AES-256 encryption. A WebSocket server manages real-time communication with intelligent background/foreground handling. AI integration uses OpenAI for commands, translation, transcription, and suggestions. Voice messages feature real-time transcription, waveform visualization, silence detection, and Chrome browser context menu prevention for long-press recording. WebRTC voice calling uses peer-to-peer connections with STUN/TURN for NAT traversal. Android PWA capabilities include Service Worker for offline support and badge API. Native iOS conversion via Capacitor provides APNS push notifications. Battery optimization includes WebSocket auto-disconnection and microphone teardown.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup, role-based access.
- **Chat System**: Real-time group/direct chats, encrypted file sharing, emoji reactions with user profiles, replies, archiving, infinite scroll pagination, and per-file download loading states.
- **Business Features**: Business profiles and professional networking.
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: 
  - **Android PWA**: Web Push API with Service Worker (`/sw.js`), setAppBadge API for badge counts
  - **iOS Native**: APNS (Apple Push Notification service) with native badge support
  - Features: Intelligent filtering, grouped notifications, sound, badges, Dovie logo icons, background message preloading, and Rich Notifications for media previews
- **Hashtag System**: Single hashtag per file, auto-extraction, enhanced search.
- **Voice Messages**: Unified recording experience with a full-screen modal, real-time transcription, smart suggestions, silence detection, and reply support.
- **YouTube Integration**: Search, preview, and sharing within chat.
- **AI Inbox (Smart Inbox)**: Intelligent message filtering, notification management with badges, swipe-to-delete, message highlighting, and filter toggles.
- **Settings**: Account management, AI settings, language selection, and support.
- **File Uploads**: Increased per-file upload limit (100MB) with inline previews. Multiple file uploads (2+ files) are grouped into a single Telegram-style message with attachments grid, while single file uploads remain as individual messages.
- **File Preview**: Fullscreen immersive modal with pinch-to-zoom, pan, double-tap reset, auto-hiding UI, and gesture-optimized controls for images, videos, and PDFs. Includes share/save/forward capabilities via Capacitor.

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
- **iOS Native App**: Capacitor framework (`@capacitor/keyboard`, `@capacitor/push-notifications`, `@capacitor/share`, `@capacitor/filesystem`) with APNS for push notifications.
- **Android PWA**: `web-push` for push notifications, Service Worker (`/sw.js`) for offline support and badge management.
- **File Operations**: Capacitor Share API, Filesystem API.