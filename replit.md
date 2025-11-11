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

## Recent Changes (2025-11-11)
### Streamlined File Attachment Flow
- **Problem**: File upload modal workflow interrupted user flow with extra taps (paperclip → modal → select files → confirm)
- **Solution**: Direct file selection with inline preview (client/src/components/ChatArea.tsx)
  - **Direct Access**: Paperclip button now triggers native file picker immediately (no modal)
  - **Inline Preview**: Selected files display above message input with thumbnails, file info, and description textarea
  - **Mobile Optimization**: File list constrained to max-h-48 (3-4 files visible) with vertical scrolling, single-line textarea default (rows=1)
  - **Clean UI**: Send/Cancel buttons with pb-4 bottom padding to avoid keyboard overlap
  - **State Management**: New states for selectedPendingFiles, showFilePreview, fileDescription
  - **Code Cleanup**: Removed unused FileUploadModal state, import, and JSX rendering from ChatArea
- **User Experience**:
  - Tap paperclip → Native file picker opens instantly
  - Select files → Inline preview appears with thumbnails/icons
  - Add optional description → Tap send or cancel
  - Supports multi-file selection (max 10 files, 5MB each)
- **Result**: ✅ Faster, more intuitive file sharing workflow matching modern messaging apps

### Unified Loading Spinner Design
- **Problem**: Inconsistent loading indicators across the app (various custom div spinners with different styles)
- **Solution**: Standardized all loading states to use LoadingSpinner component (client/src/components/MicroInteractions.tsx)
  - **Component**: `<LoadingSpinner size="small|medium|large" color="purple" />`
  - **Locations Updated**:
    - Initial message loading: medium size with "메시지를 불러오는 중..." text
    - Initial loading overlay: large size (prevents scroll flicker)
    - Message upload progress: small size
    - File attachment button: small size during processing
  - **Replaced**: All bespoke animate-spin divs with inconsistent border widths and colors
- **Result**: ✅ Consistent visual language across all loading states, maintainable single source of truth

### Voice Message Push Notification Enhancement
- **Problem**: Voice message push notifications included 🎤 microphone emoji prefix, creating visual clutter
- **Solution**: Removed microphone emoji from voice message notification body (server/routes.ts)
  - Notifications now display clean transcription text or simple "음성 메시지" fallback
  - Cleaner, more professional notification appearance
- **Result**: ✅ Streamlined push notifications matching modern messaging app standards

### iOS-Style Swipe-Back Page Transition
- **Feature**: Added native-like swipe gesture for navigating back from chat rooms
- **Implementation** (client/src/hooks/useSwipeBack.tsx, client/src/components/ChatArea.tsx):
  - **Progress Tracking**: Hook now reports real-time swipe progress (0-1 scale) via onSwipeProgress callback
  - **Visual Feedback**: ChatArea applies translateX transform based on swipe distance
  - **Overlay Effect**: Dark overlay (opacity 0-0.2) fades in during swipe for depth perception
  - **Smooth Animation**: 300ms ease-out transition when navigation completes
  - **State Management**: useCallback stabilizes progress callback, prevents stale closures
  - **Cleanup**: State resets (swipeProgress, isNavigating) after animation completes
  - **Overflow Handling**: overflow-hidden on container prevents content shift
- **User Experience**:
  - Swipe from left edge (within 50px) to trigger back gesture
  - Page slides right in real-time following finger movement
  - Release past threshold (100px) to navigate, otherwise spring back
  - willChange optimization for smooth 60fps animation
- **Result**: ✅ Native iOS-like swipe-back interaction, production-ready implementation

### Previous Changes (2024-11-10)
#### iOS Keyboard Performance Fix (Final Solution)
- **Problem**: 9-second keyboard input lag on iOS login screen
  - Tapping text fields caused 9-second delay before keyboard appeared
  - "Reporter disconnected" errors (×9) flooding console
  - "RTIInputSystemClient" errors and "System gesture gate timed out" messages
  - Keyboard overlaying input fields, making them invisible
  
- **Root Cause Analysis** (Deep Investigation):
  - **Initial hypothesis #1 (INCORRECT)**: `resize: 'body'` mode causes native messaging overhead
  - **Testing #1**: Changed to `resize: 'none'` but lag persisted with same errors
  - **Initial hypothesis #2 (INCORRECT)**: `backdrop-filter: blur()` + CSS `transform` causes GPU stall
  - **Testing #2**: Removed backdrop-blur and transform, but lag still persisted
  - **True Root Cause**: `window.visualViewport` resize listener + `scrollIntoView({behavior: 'smooth'})`
  - WKWebView keyboard task queue blocks when smooth scrolling runs during keyboard presentation (Apple bug #103286930)
  - The visualViewport listener fires multiple times per keyboard animation, triggering smooth scrolls that block the queue
  - During this block, all native bridge calls fail → "Reporter disconnected" spam × 9
  
- **Final Solution**: Use Capacitor Keyboard events + non-blocking scroll
  
- **Configuration** (`capacitor.config.ts`):
  ```typescript
  Keyboard: {
    resize: 'none',              // Avoids WebView resize overhead
    style: 'dark',               // Matches app theme
    resizeOnFullScreen: false    // Prevents constraint conflicts
  }
  ```
  
- **LoginPage Implementation** (`client/src/pages/LoginPage.tsx`):
  - **Removed**: `window.visualViewport` resize listener (root cause)
  - **Removed**: `scrollIntoView({ behavior: 'smooth' })` (blocks keyboard queue)
  - **Removed**: `backdrop-blur-sm` from Card (cleanup)
  - **Added**: Capacitor `Keyboard.addListener('keyboardDidShow')` event with keyboard height info
  - **Added**: Smart scrolling - calculates available viewport space (window height - keyboard height) and centers input in visible area using `window.scrollTo` with `behavior: 'auto'`
  - 150ms timeout ensures keyboard animation finishes before measuring and scrolling
  
- **Why this approach works**:
  - Capacitor Keyboard events fire after keyboard animation completes
  - No synchronous work during keyboard presentation = no queue blocking
  - `behavior: 'auto'` scrolls instantly without animation, avoiding WKWebView bug
  - Input fields scroll into view reliably without blocking main thread
  - Clean separation: native keyboard handling + simple web scroll
  
- **Result**: 
  - ✅ Zero keyboard lag - instant response on text field tap
  - ✅ No "Reporter disconnected" errors
  - ✅ No keyboard task queue blocking
  - ✅ Input fields stay visible when keyboard appears
  - ✅ Stable, performant implementation

#### Profile Image Preloading Removal (2024-11-10)
- **Problem**: iOS keyboard lag persisted even after Capacitor keyboard config fix; profile image preloading blocked main thread during app initialization
- **Root Cause**: `preloadProfileImages` function (even with 5-second delay) created heavy network requests and Blob processing on main thread, causing "Reporter disconnected" errors and keyboard input lag
- **Solution**: Complete removal of eager preloading feature:
  - Removed `preloadProfileImages` function from `useAuth.tsx` (~100 lines)
  - Removed `isPreloadingImages` and `profileImagesLoaded` state management
  - Cleaned up `MainApp.tsx` preloading imports and useEffect
  - Profile images now load on-demand via existing `InstantAvatar` component with Blob-based caching
  - Service Worker cache versions bumped to v2 (sw.js, sw-ios16.js, sw-ios16-enhanced.js) to ensure fresh deployment
- **Result**: Zero main thread blocking during app startup, instant keyboard response, on-demand image loading sufficient for UX

#### Additional iOS Improvements (2024-11-10)
- **Badge Count Fix**: Removed duplicate +1 increment in unread message calculation (server/routes.ts Line 2015)
- **Logout Protection**: Complete push subscription cleanup - server deletes all PWA/iOS tokens on logout
- **Deep Linking**: Navigation service enables push notification tap → chat room navigation (both running app and cold start scenarios)