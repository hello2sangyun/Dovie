# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application designed for real-time communication, secure file sharing, business networking, and location-based interactions. It integrates AI-powered commands and aims to deliver a native-like mobile experience with robust push notifications and cross-platform badging. The project focuses on creating a comprehensive and performant messaging solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX
The frontend is built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. State management uses TanStack Query, and Wouter handles routing. Real-time updates are powered by WebSockets. The design emphasizes a premium purple theme with gradient backgrounds, subtle shadows, and rounded corners, optimized for mobile responsiveness. Key features include instant image loading with global Blob-based caching, compact chat bubbles, top banner-style mobile notifications, and a comprehensive PWA badge system. Consistent header design is maintained across all main pages. Native iOS-like swipe-back navigation is implemented for improved user experience.

### Technical Implementations
The backend uses Node.js and Express.js (TypeScript, ES modules) with PostgreSQL and Drizzle ORM. Custom authentication includes email/password/phone verification and bcrypt hashing. File handling uses Multer for uploads and AES-256 encryption. A WebSocket server manages real-time communication with intelligent background/foreground handling. AI integration leverages OpenAI for commands, translation, transcription, and smart suggestions. Voice messages include real-time transcription, waveform visualization, and silence detection. The application features comprehensive PWA capabilities (manifest, service worker, push notifications) and has been converted to a native iOS app using Capacitor for enhanced native features, including intelligent browser history management, persistent user sessions, and a message retry mechanism. Battery optimization is achieved through background lifecycle management, including WebSocket auto-disconnection and microphone teardown.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup, role-based access.
- **Chat System**: Real-time messaging, group/direct chats, encrypted file sharing, emoji reactions, replies, archive.
- **Business Features**: Business profiles and professional networking.
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Intelligent filtering, grouped notifications, comprehensive iOS PWA/Native app support with sound and badges.
- **Hashtag System**: Single hashtag per file, auto-extraction, enhanced search.
- **Voice Messages**: Quick voice messages with transcription, smart suggestion integration, and retry.
- **YouTube Integration**: Search, preview, and sharing of YouTube videos within chat.
- **Settings**: Comprehensive account management, AI settings (Smart Inbox filter toggles), language selection, and support.
- **File Uploads**: Increased per-file upload limit to 100MB with a streamlined attachment flow including inline previews.

### System Design Choices
The application prioritizes performance and responsiveness, particularly on mobile devices. This includes a "resize: 'none'" keyboard configuration for Capacitor on iOS to prevent input lag, and the removal of main thread blocking operations like eager profile image preloading. Loading states are standardized using a single `LoadingSpinner` component for visual consistency. Push notifications are refined for a cleaner appearance.

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
- **Native App Conversion**: Capacitor framework (`@capacitor/keyboard`, `@capacitor/push-notifications`).
- **iOS Push Notifications**: Apple Push Notification service (APNS) with JWT authentication.
- **Push Notifications**: `web-push` for PWA notifications, APNS for iOS native.