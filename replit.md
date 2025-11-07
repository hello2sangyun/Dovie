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
- **Voice Messages**: Quick voice messages from contacts with confirmation modal for reviewing/editing transcriptions before sending, voice transcription, smart suggestion integration, and retry capability on send failures. Voice messages accessible via 640ms long-press on chat list and contact list items.
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
- **2024-11-07**:
  - **iOS APNS Push Token Registration Fix**: Resolved critical issue where iOS device tokens were not being forwarded to Capacitor
    - Root Cause: AppDelegate.swift was missing essential APNS delegate methods
    - Added `didRegisterForRemoteNotificationsWithDeviceToken` to forward successful token registration to Capacitor's NotificationCenter
    - Added `didFailToRegisterForRemoteNotificationsWithError` to handle registration failures
    - Added `didReceiveRemoteNotification` for background push notification handling
    - Integration: All methods properly post notifications to Capacitor's NotificationCenter for seamless iOS-to-JS communication
    - Expected Result: `⚡️ TO JS {token: "hex_string"}` should now appear in Xcode console when app launches
- **2024-11-06**:
  - **Login/Signup UI Improvements**:
    - **Login Page**: Removed Google login button, increased logo size to 1.5x, cleaner gradient design
    - **Password Recovery**: Three-step password reset flow (phone → SMS code → new password) using existing verification system
    - **Signup Page Enhancements**:
      - Username validation updated: now accepts English letters, numbers, and special characters (previously letters + special only)
      - DisplayName placeholder: "상대방에게 보여지는 나의 이름" with "추후 변경할 수 있습니다" note
      - Profile photo moved to top center with instant preview (click-to-upload, FileReader-based preview)
      - Clear error modals for duplicate username/phone with user-friendly Korean messages
  - **Bookmarked Message Visual Distinction**: 
    - Bookmarked messages now display with yellow ring accent (ring-2 ring-yellow-400)
    - Yellow bookmark icon badge in top-right corner of message bubble
    - Efficient O(1) lookup using Set of bookmarked message IDs
    - Fetches bookmarks via `GET /api/bookmarks` query
  - **Phone Number-Based Signup Flow**: Completely redesigned signup system with SMS verification
    - Database: `verification_codes` table with 6-digit codes, 5-minute TTL, and single-use enforcement
    - Storage API: `createVerificationCode`, `getVerificationCode`, `markVerificationCodeAsUsed` for SMS code lifecycle management
    - REST API: Three-step signup process
      - `POST /api/auth/send-verification-code`: Sends SMS verification code via Twilio
      - `POST /api/auth/verify-phone-code`: Validates SMS code without creating user
      - `POST /api/auth/signup-phone`: Completes signup with username, password, displayName, and optional profile photo
      - `POST /api/auth/reset-password`: Password reset using phone verification
    - UI: Three-step wizard flow (phone input → SMS code → user details → auto-login to /app)
    - Security: Phone number uniqueness check, username validation (English + numbers + special chars), bcrypt password hashing
    - Development Mode: SMS codes logged to console when Twilio SMS fails (trial account limitations)
    - Architect-reviewed and E2E tested via Playwright
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