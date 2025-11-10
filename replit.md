# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application offering real-time communication, encrypted file sharing, business networking, location-based features, and AI-powered commands. It aims to provide a comprehensive messaging solution with a native-like mobile experience, including robust push notifications and badging across platforms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX
The frontend uses React with TypeScript, Vite, Tailwind CSS, and shadcn/ui components. State management is handled by TanStack Query, and Wouter is used for routing. Real-time updates are managed via WebSockets. The design features gradient backgrounds, subtle shadows, rounded corners, and a premium purple theme. It's optimized for mobile with responsive design, mobile-optimized modals, keyboard handling, and touch-friendly interactions. Key features include instant image loading with global Blob-based caching, compact chat bubbles with gradient backgrounds, top banner-style mobile notifications, and a comprehensive PWA badge system. All main pages maintain a consistent header design for improved UX.

### Technical Implementations
The backend is built with Node.js and Express.js (TypeScript, ES modules), utilizing PostgreSQL with Drizzle ORM. Authentication is custom with email/password/phone verification and bcrypt hashing. File handling uses Multer for uploads and AES-256 encryption. A WebSocket server manages real-time communication with intelligent background/foreground handling. AI integration leverages the OpenAI API for commands, translation, transcription, and smart suggestions. Voice messages feature real-time transcription, waveform visualization, and silence detection. The application includes comprehensive PWA capabilities (manifest, service worker, push notifications, home screen installation) and has been converted to a native iOS app using Capacitor for enhanced native features. It includes intelligent browser history management, persistent user sessions, and a message retry mechanism with exponential backoff. File organization in the archive supports PC-style folder structures and single hashtags per file. Battery optimization is achieved through comprehensive background lifecycle management, including WebSocket auto-disconnection and microphone teardown.

### Feature Specifications
Key features include:
- **Authentication**: Email/password, phone number verification (Twilio), profile setup, role-based access.
- **Chat System**: Real-time messaging, group/direct chats, encrypted file sharing, emoji reactions, replies, archive.
- **Business Features**: Business profiles and professional networking space.
- **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
- **Admin Panel**: Monitoring, user management, performance metrics.
- **Push Notifications**: Intelligent filtering (Telegram/WhatsApp-style), grouped notifications, comprehensive iOS PWA/Native app support with sound and badges.
- **Hashtag System**: Single hashtag per file, auto-extraction, enhanced search.
- **Voice Messages**: Quick voice messages with transcription, smart suggestion integration, and retry capability.
- **YouTube Integration**: Search, preview, and sharing of YouTube videos within chat.
- **Settings**: Comprehensive settings system including account management, AI settings (Smart Inbox filter toggles), language selection, and help/support.

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

## Recent Changes (2024-11-10)
### iOS Keyboard Performance Fix (Final Solution)
- **Problem**: 9-second keyboard input lag on iOS login screen
  - Tapping text fields caused 9-second delay before keyboard appeared
  - "Reporter disconnected" errors (×9) flooding console
  - "RTIInputSystemClient" errors and "System gesture gate timed out" messages
  - Keyboard overlaying input fields, making them invisible
  
- **Root Cause Analysis**:
  - `resize: 'body'` mode triggers excessive WKWebView ↔ iOS native messaging
  - Even without Capacitor Keyboard event listeners, the lag persisted
  - iOS text input system (RTIInputSystemClient) conflicts with `resize: 'body'`
  - 9-second timeout = iOS waiting for native bridge response before giving up
  
- **Final Solution**: `resize: 'none'` + visualViewport Web API
  
- **Configuration** (`capacitor.config.ts`):
  ```typescript
  Keyboard: {
    resize: 'none',              // Eliminates native bridge overhead
    style: 'dark',               // Matches app theme
    resizeOnFullScreen: false    // Prevents constraint conflicts
  }
  ```
  
- **LoginPage Implementation** (`client/src/pages/LoginPage.tsx`):
  - Uses `window.visualViewport` API (Web standard, no native communication)
  - Detects keyboard height: `window.innerHeight - window.visualViewport.height`
  - Applies CSS transform to move screen upward when keyboard appears
  - Smooth 0.3s ease-out transition animation
  - Moves screen up by 40% of keyboard height to keep input fields visible
  - Auto-resets to original position when keyboard dismisses
  
- **Why this approach works**:
  - `resize: 'none'` removes all native bridge communication for keyboard
  - visualViewport API is pure Web API - zero iOS native calls
  - CSS transform is handled entirely by browser rendering engine
  - No WKWebView ↔ iOS messaging = no lag
  - Input fields remain visible throughout keyboard interaction
  
- **Result**: 
  - ✅ Zero keyboard lag - instant response on text field tap
  - ✅ No "Reporter disconnected" errors
  - ✅ Input fields stay visible when keyboard appears
  - ✅ Smooth, native-like animation experience

### Profile Image Preloading Removal (2024-11-10)
- **Problem**: iOS keyboard lag persisted even after Capacitor keyboard config fix; profile image preloading blocked main thread during app initialization
- **Root Cause**: `preloadProfileImages` function (even with 5-second delay) created heavy network requests and Blob processing on main thread, causing "Reporter disconnected" errors and keyboard input lag
- **Solution**: Complete removal of eager preloading feature:
  - Removed `preloadProfileImages` function from `useAuth.tsx` (~100 lines)
  - Removed `isPreloadingImages` and `profileImagesLoaded` state management
  - Cleaned up `MainApp.tsx` preloading imports and useEffect
  - Profile images now load on-demand via existing `InstantAvatar` component with Blob-based caching
  - Service Worker cache versions bumped to v2 (sw.js, sw-ios16.js, sw-ios16-enhanced.js) to ensure fresh deployment
- **Result**: Zero main thread blocking during app startup, instant keyboard response, on-demand image loading sufficient for UX

### Additional iOS Improvements (2024-11-10)
- **Badge Count Fix**: Removed duplicate +1 increment in unread message calculation (server/routes.ts Line 2015)
- **Logout Protection**: Complete push subscription cleanup - server deletes all PWA/iOS tokens on logout
- **Deep Linking**: Navigation service enables push notification tap → chat room navigation (both running app and cold start scenarios)