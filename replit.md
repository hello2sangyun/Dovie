# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application designed to be a feature-rich messaging platform. It supports real-time chat, file sharing with encryption, business networking, location-based features, and AI-powered commands. The project aims to provide a comprehensive communication solution with a focus on a native-like mobile experience and advanced functionalities, including robust push notification and badging systems across various platforms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX
- **Frontend Framework**: React with TypeScript.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS with shadcn/ui components.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Real-time**: WebSocket for live updates.
- **Visuals**: Gradient backgrounds, subtle shadows, rounded corners, and purple theming for a premium aesthetic.
- **Mobile Optimization**: Responsive design, mobile-optimized modals, keyboard handling, and touch-friendly interactions.
- **Image Loading**: Instant image loading via global Blob-based caching and preloading for zero-delay display.
- **Chat Bubbles**: Compact, smart design with gradient backgrounds and optimized spacing for high message density.
- **Notifications**: Top banner-style mobile notifications and a comprehensive PWA badge system that functions even when the app is closed.

### Technical Implementations
- **Backend**: Node.js with Express.js (TypeScript, ES modules).
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom email/password/phone authentication with bcrypt hashing.
- **File Handling**: Multer for uploads, AES-256 encryption for storage.
- **Real-time**: WebSocket server.
- **AI Integration**: OpenAI API for commands, translation, transcription, and smart suggestions (focused on YouTube).
- **Voice Messages**: Real-time transcription, waveform visualization, and silence detection.
- **Smart Suggestions**: Unified system across all message types, primarily for YouTube video search and sharing.
- **PWA Capabilities**: Comprehensive `manifest.json`, service worker for offline caching, push notifications, and home screen installation.
- **Native Conversion (iOS)**: Transitioned from PWA to native iOS app using Capacitor, including native push notifications, badge management, and microphone permissions.
- **Browser Navigation**: Intelligent history management to prevent accidental logout.
- **Auto-Login**: Persistent user sessions across refreshes and restarts.
- **Message Retry**: Intelligent WebSocket connection management with exponential backoff and pending message queue.
- **File Organization**: PC-style folder structure in the archive, automatically organizing files by chat room and supporting single hashtags per file.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup flow, role-based access.
- **Chat System**: Real-time messaging, group/direct chats, encrypted file sharing, reactions, replies, archive.
- **Business Features**: Business profiles, professional networking space (LinkedIn-style), company channels (partially removed/streamlined).
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Telegram/WhatsApp-style intelligent notification filtering based on user activity, grouped notifications, and comprehensive iOS PWA/Native app support with sound and app badges.
- **Hashtag System**: Single hashtag per file for simplified organization, auto-extraction from messages, and enhanced search.
- **Voice Messages**: Quick voice messages from contacts with confirmation modal for reviewing/editing transcriptions before sending, voice transcription, smart suggestion integration, and retry capability on send failures. Voice messages accessible via 800ms long-press on chat list and contact list items.
- **YouTube Integration**: Search, preview, and sharing of YouTube videos within chat.

## External Dependencies
- **Database**: `@neondatabase/serverless`, `drizzle-orm`.
- **Authentication/Security**: `bcryptjs`, `crypto-js`.
- **File Uploads**: `multer`.
- **Real-time**: `ws` (WebSocket).
- **AI**: `openai`.
- **Frontend State Management**: `@tanstack/react-query`.
- **UI Components**: `@radix-ui/*`, `tailwindcss`, `lucide-react`.
- **Routing**: `wouter`.
- **Date Utilities**: `date-fns`.
- **Development Tools**: `vite`, `typescript`, `tsx`, `esbuild`.
- **SMS/Phone Verification**: Twilio SMS API.
- **Geolocation**: ipapi.co service, browser geolocation API.
- **Maps**: Google Maps integration.
- **Native App Conversion**: Capacitor framework (`@capacitor/push-notifications`).
- **iOS Push Notifications**: Apple Push Notification service (APNS).