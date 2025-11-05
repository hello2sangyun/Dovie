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
- **Unified Header Design**: All main pages (Contacts, Chat Rooms, Smart Inbox, Bookmarks) follow consistent header design with text-xl font-bold titles, h-4/h-5 icons, and pl-10 search bars for improved UX consistency.

### Technical Implementations
- **Backend**: Node.js with Express.js (TypeScript, ES modules).
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom email/password/phone authentication with bcrypt hashing.
- **File Handling**: Multer for uploads, AES-256 encryption for storage.
- **Real-time**: WebSocket server with intelligent background/foreground management.
- **AI Integration**: OpenAI API for commands, translation, transcription, and smart suggestions (focused on YouTube).
- **Voice Messages**: Real-time transcription, waveform visualization, and silence detection.
- **Smart Suggestions**: Unified system across all message types, primarily for YouTube video search and sharing.
- **PWA Capabilities**: Comprehensive `manifest.json`, service worker for offline caching, push notifications, and home screen installation.
- **Native Conversion (iOS)**: Transitioned from PWA to native iOS app using Capacitor, including native push notifications, badge management, and microphone permissions.
- **Browser Navigation**: Intelligent history management to prevent accidental logout.
- **Auto-Login**: Persistent user sessions across refreshes and restarts.
- **Message Retry**: Intelligent WebSocket connection management with exponential backoff and pending message queue.
- **File Organization**: PC-style folder structure in the archive, automatically organizing files by chat room and supporting single hashtags per file.
- **Battery Optimization**: Comprehensive background lifecycle management - WebSocket auto-disconnection, microphone teardown, and polling suspension when app is backgrounded to maximize battery life.

### Feature Specifications
- **Authentication**: Email/password, phone number verification (Twilio), profile setup flow, role-based access.
- **Chat System**: Real-time messaging, group/direct chats, encrypted file sharing, emoji reactions (toggle add/remove, real-time updates), replies, archive.
- **Business Features**: Business profiles, professional networking space (LinkedIn-style), company channels (partially removed/streamlined).
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Telegram/WhatsApp-style intelligent notification filtering based on user activity, grouped notifications, and comprehensive iOS PWA/Native app support with sound and app badges.
- **Hashtag System**: Single hashtag per file for simplified organization, auto-extraction from messages, and enhanced search.
- **Voice Messages**: Quick voice messages from contacts with confirmation modal for reviewing/editing transcriptions before sending, voice transcription, smart suggestion integration, and retry capability on send failures. Voice messages accessible via 800ms long-press on chat list and contact list items.
- **YouTube Integration**: Search, preview, and sharing of YouTube videos within chat.
- **Settings**: Comprehensive settings system with multiple sections:
  - **Account Management**: Account deletion with password confirmation and warnings
  - **AI Settings**: Smart Inbox filter toggles for 15+ categories (연락처, 주소, 날짜/시간, 금액, etc.)
  - **Language Settings**: Language selection (한국어, English, 日本語)
  - **Help & Support**: Help center, contact forms, FAQ sections
  - All settings pages use gradient card UI design with icons and smooth navigation

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
- **Development Tools**: `vite`, `typescript`, `tsx`, `esbuild`.
- **SMS/Phone Verification**: Twilio SMS API.
- **Geolocation**: ipapi.co service, browser geolocation API.
- **Maps**: Google Maps integration.
- **Native App Conversion**: Capacitor framework (`@capacitor/push-notifications`).
- **iOS Push Notifications**: Apple Push Notification service (APNS) with JWT authentication.
- **Push Notifications**: `web-push` for PWA notifications, APNS for iOS native.

## Environment Variables

### Required for Production
- **APNS_KEY_ID**: Apple Push Notification Auth Key ID (from Apple Developer Console)
- **APNS_TEAM_ID**: Apple Developer Team ID
- **APNS_PRIVATE_KEY**: APNs Auth Key (.p8 file content with `\n` for line breaks)
- **FIREBASE_PROJECT_ID**: Firebase project identifier
- **FIREBASE_PRIVATE_KEY**: Firebase service account private key
- **FIREBASE_CLIENT_EMAIL**: Firebase service account email
- **OPENAI_API_KEY**: OpenAI API key for AI features
- **VAPID_PUBLIC_KEY**: VAPID public key for PWA push notifications
- **VAPID_PRIVATE_KEY**: VAPID private key for PWA push notifications

### Optional
- **NODE_ENV**: Set to `development` for testing mode (default: production)
- **VAPID_EMAIL**: Contact email for VAPID (default: `mailto:admin@dovie.com`)
- **TWILIO_ACCOUNT_SID**: Twilio account SID for SMS verification
- **TWILIO_AUTH_TOKEN**: Twilio auth token
- **TWILIO_PHONE_NUMBER**: Twilio phone number

### Auto-Provided by Replit
- **DATABASE_URL**: PostgreSQL connection string (automatically set)

## Production Deployment

### iOS Push Notifications Setup
For iOS push notifications to work in production, APNS credentials must be configured. See `APNS_SETUP_GUIDE.md` for detailed setup instructions.

**Quick Setup:**
1. Generate APNs Auth Key in Apple Developer Console
2. Add `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_PRIVATE_KEY` to Replit Secrets
3. Restart workflows
4. Verify in server logs: `📱 Using APNS server: api.push.apple.com (production)`

### Production vs Development Mode
- **Production** (default): Uses `api.push.apple.com`, activity filtering enabled
- **Development**: Set `NODE_ENV=development` to use `api.development.push.apple.com`, all push notifications sent for testing

## Recent Updates
- **2025-11-05**:
  - **Smart Inbox Visual Notification Indicator**: Subtle pulse animation on bottom tab
    - Real-time unread count tracking via `/api/ai-notices` endpoint (30s refresh)
    - Red badge showing unread item count (1-9 or "9+")
    - Pulse animation (`animate-pulse`) when unread items exist and tab inactive
    - Non-intrusive visual feedback matching Telegram/WhatsApp notification style
  - **iOS Splash Screen Optimization**: App launch speed improvement
    - Reduced splash screen duration: 3 seconds → 1 second (67% faster startup)
    - Changed background color to clean white (#FFFFFF) for better visual consistency
    - Removed loading spinner for cleaner, more professional appearance
    - Created comprehensive setup guide (IOS_SPLASH_SCREEN_SETUP.md) for Xcode splash image configuration
- **2024-11-04**: 
  - **Native Badge Manager**: Direct integration with Capacitor `PushNotifications.setBadgeCount()` for real-time app badge updates on iOS
    - WebSocket-driven badge sync: Instant badge updates when messages are read
    - Replaces inefficient polling with event-driven architecture
  - **Notification Settings System**: Comprehensive user notification preferences
    - Database: `notification_settings` table with notification sound, preview toggle, quiet hours, and mute all settings
    - Storage API: `getNotificationSettings`, `upsertNotificationSettings` for persistence
    - REST API: `GET/POST /api/notification-settings` endpoints
    - UI Integration: Full notification settings page with real-time backend sync
  - **Advanced Push Notification Filtering**: User-controlled notification behavior
    - Mute All Notifications: Complete notification silence when enabled
    - Quiet Hours: Time-based do-not-disturb with midnight wraparound support
    - Activity-Based Filtering: Telegram/WhatsApp-style intelligent suppression for active users
  - **APNS Rich Notifications**: Enhanced iOS push notification experience
    - Rich Media Support: Image, video, and audio attachments in notifications (`mutable-content: 1`)
    - Action Buttons: Interactive notifications with reply/mark-read actions (`category: MESSAGE_CATEGORY`)
    - Notification Grouping: Chat-based thread IDs for organized notification stacks (`thread-id: chat-{chatRoomId}`)
    - Automatic Media Inclusion: Server automatically includes media URLs based on message type
  - **Battery Optimization System**: Comprehensive background lifecycle management to maximize iOS battery life
    - WebSocket: Auto-disconnect when backgrounded, auto-reconnect when foregrounded (handles all edge cases including network loss)
    - Microphone: Voice recording stops immediately when app goes to background
    - Badge Polling: Suspended in background, resumed in foreground (5s interval)
    - All features use APNS for background notifications (OS-managed, battery-efficient)
  - Implemented production-ready push notification system with APNS JWT authentication
  - Fixed ChatsList touch detection (short tap vs long press) to match ContactsList behavior
  - Applied iOS Safe Area support across all pages to prevent content overlap with notch/Dynamic Island
  - Unified settings page design with neutral color scheme (purple icons, white/gray backgrounds)