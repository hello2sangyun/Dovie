# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application designed for real-time communication, secure file sharing, business networking, and location-based interactions. It integrates AI-powered commands and aims to deliver a native-like mobile experience with robust push notifications and cross-platform badging. The project focuses on creating a comprehensive and performant messaging solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX
The frontend is built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. State management uses TanStack Query, and Wouter handles routing. Real-time updates are powered by WebSockets. The design emphasizes a premium purple theme with gradient backgrounds, subtle shadows, and rounded corners, optimized for mobile responsiveness. Key features include instant image loading with global Blob-based caching, compact chat bubbles, top banner-style mobile notifications, and a comprehensive PWA badge system. Consistent header design is maintained across all main pages. Native iOS-like navigation includes swipe-back gestures and smooth slide transitions when opening chat rooms (chat list slides left to reveal the chat area underneath, using 300ms ease-out animations). Touch event handling is optimized to allow file/image preview taps while maintaining long-press and scroll functionality.

### Technical Implementations
The backend uses Node.js and Express.js (TypeScript, ES modules) with PostgreSQL and Drizzle ORM. Custom authentication includes email/password/phone verification and bcrypt hashing. File handling uses Multer for uploads and AES-256 encryption. A WebSocket server manages real-time communication with intelligent background/foreground handling. AI integration leverages OpenAI for commands, translation, transcription, and smart suggestions. Voice messages include real-time transcription, waveform visualization, and silence detection. The application features comprehensive PWA capabilities (manifest, service worker, push notifications) and has been converted to a native iOS app using Capacitor for enhanced native features, including intelligent browser history management, persistent user sessions, and a message retry mechanism. Battery optimization is achieved through background lifecycle management, including WebSocket auto-disconnection and microphone teardown.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup, role-based access.
- **Chat System**: Real-time messaging, group/direct chats, encrypted file sharing, emoji reactions, replies, archive. Features infinite scroll pagination (loads 50 messages at a time with older messages fetched on scroll-up) and per-file download loading states with spinner overlays that maintain message bubble visibility.
- **Business Features**: Business profiles and professional networking.
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Intelligent filtering, grouped notifications, comprehensive iOS PWA/Native app support with sound and badges. Includes Dovie logo in notification icons. Service Worker preloads chat messages in background when push notifications are received for instant app opening.
- **Hashtag System**: Single hashtag per file, auto-extraction, enhanced search.
- **Voice Messages**: Quick voice messages with transcription, smart suggestion integration, and retry.
- **YouTube Integration**: Search, preview, and sharing of YouTube videos within chat.
- **Settings**: Comprehensive account management, AI settings (Smart Inbox filter toggles), language selection, and support.
- **File Uploads**: Increased per-file upload limit to 100MB with a streamlined attachment flow including inline previews.
- **File Preview**: Fullscreen immersive modal with pinch-to-zoom (0.5x-5x), pan navigation for zoomed images, double-tap reset, auto-hiding UI (3-second timer), and gesture-optimized controls. Supports images (with touch zoom), videos (with native controls and fullscreen playback), PDFs (iframe viewer), and files with share/save/forward capabilities using Capacitor APIs. Black background with minimal overlay controls for maximum content visibility. iOS-style back button (← arrow) in top-left corner.

### System Design Choices
The application prioritizes performance and responsiveness, particularly on mobile devices. This includes a "resize: 'body'" keyboard configuration for Capacitor on iOS to enable automatic viewport adjustment when the keyboard appears, ensuring input fields remain visible. Main thread blocking operations like eager profile image preloading have been removed for better performance. Loading states are standardized using a single `LoadingSpinner` component for visual consistency. Push notifications are refined for a cleaner appearance. Message pagination uses infinite scroll with IntersectionObserver for seamless loading of older messages while preserving scroll position. File caching implements a per-URL subscriber pattern with `useFileCacheEntry` hook that tracks individual download states, enabling concurrent downloads with shared network requests and proper cleanup.

## Deployment Configuration
- **Production Server**: `https://dovie-hello2sangyun.replit.app` - Official deployment server for production environment
- **iOS Native App**: Configured in `capacitor.config.ts` to connect to production server
- **WebSocket**: Uses same production server URL with `wss://` protocol for real-time communication

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
- **iOS Push Notifications**: Apple Push Notification service (APNS) with JWT authentication.
- **Push Notifications**: `web-push` for PWA notifications, APNS for iOS native.
- **File Operations**: Capacitor Share API for native sharing, Filesystem API for saving files to device.