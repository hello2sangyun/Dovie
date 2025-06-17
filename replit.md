# Dovie Messenger - Replit Project Guide

## Overview

Dovie Messenger is a full-stack chat application built with modern web technologies. It's a feature-rich messaging platform that includes real-time chat, file sharing, business networking features, location-based chat, and AI-powered commands. The application uses a Node.js/Express backend with React frontend, PostgreSQL database with Drizzle ORM, and WebSocket for real-time communication.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom configuration
- **UI Framework**: Tailwind CSS with shadcn/ui components  
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Real-time**: WebSocket client for live updates

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom auth with bcrypt password hashing
- **File Handling**: Multer for uploads with encryption
- **Real-time**: WebSocket server for live chat

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Encryption**: AES-256 encryption for file storage
- **Schema**: Comprehensive schema including users, contacts, chat rooms, messages, commands, business features

## Key Components

### Authentication System
- Email/password and phone number authentication
- Test login functionality for development
- Profile setup flow for new users
- Role-based access (user, business, admin)

### Chat System
- Real-time messaging with WebSocket
- Group chats and direct messages
- File sharing with encryption
- Message reactions and replies
- Archive functionality

### Business Features
- Business profiles and cards
- LinkedIn-style space for professional networking
- Business post creation and sharing
- Company channels and verification

### Location Features
- Location-based chat rooms
- Nearby user discovery
- GPS integration for location sharing

### AI Integration
- OpenAI API integration for commands
- Text translation services
- Audio transcription capabilities
- Smart command processing

### File Management
- Encrypted file storage system
- Support for images, documents, audio, video
- File preview and download tracking  
- Storage analytics

### Admin Panel
- System monitoring dashboard
- User management
- Performance metrics
- API status monitoring

## Data Flow

### User Authentication Flow
1. User submits credentials via login/signup forms
2. Backend validates and creates/verifies user account
3. JWT-like session management with user ID storage
4. Profile completion flow for new users
5. Location permission requests for enhanced features

### Message Flow
1. User composes message in chat interface
2. Message sent via WebSocket connection
3. Server processes, encrypts, and stores in database
4. Real-time broadcast to chat participants
5. Client updates UI with new message

### File Upload Flow
1. User selects file via drag-drop or file picker
2. Client validates file type and size
3. File uploaded via multipart form data
4. Server encrypts file content with AES-256
5. Encrypted file stored with metadata in database
6. File URL returned for message attachment

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL client
- **drizzle-orm**: Database ORM and query builder
- **bcryptjs**: Password hashing
- **multer**: File upload handling
- **ws**: WebSocket server implementation
- **openai**: AI service integration
- **crypto-js**: Encryption utilities

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **wouter**: Lightweight routing
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: Fast bundling

## Deployment Strategy

### Environment Configuration
- **Development**: Uses Vite dev server with HMR
- **Production**: Builds client with Vite, server with esbuild
- **Database**: Neon PostgreSQL with connection pooling
- **File Storage**: Local encrypted file system

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Development**: `npm run dev`
- **Database Setup**: `npm run db:push`

### Performance Optimizations
- React Query caching with 5-minute stale time
- Image preloading and optimization
- Virtual scrolling for large lists
- WebSocket connection management
- File encryption with crypto-js

### Security Measures
- AES-256 file encryption
- bcrypt password hashing
- Input validation and sanitization
- CORS configuration
- User session management

## Changelog

- June 16, 2025: Initial setup
- June 16, 2025: Completed comprehensive removal of nearby chat (주변챗) functionality including:
  - Removed location-based database tables (locationChatRooms, locationChatParticipants, locationChatMessages, userLocations)
  - Deleted all location-based API endpoints (/api/location/*)
  - Cleaned up storage interface and implementation methods
  - Removed location-based cleanup intervals and automation
  - Eliminated NearbyChats.tsx component and all location permission requests
  - Removed all mobile and desktop navigation tabs for nearby chat
  - Cleaned up state management to remove location-based variables
  - Removed MapPin icon import and all location-related UI elements
  - Fixed syntax errors and maintained core chat functionality
- June 16, 2025: Fixed critical login authentication issues:
  - Resolved selectedLocationChatRoom undefined variable error in MainApp.tsx
  - Fixed React Query cache invalidation for immediate user state updates
  - Optimized authentication flow with proper localStorage and state synchronization
  - Corrected password hash for hello2sangyun@gmail.com account (password: sangyun)
  - Login now successfully redirects to main application interface
- June 16, 2025: Completed location permission removal:
  - Eliminated remaining geolocation API calls in useWeather.tsx hook
  - Replaced location-based weather with default Seoul weather data
  - No location permissions are now requested by the application
- June 16, 2025: Completely removed weather functionality:
  - Deleted useWeather.tsx hook and all weather-related imports
  - Removed weather background patterns and CSS animations from index.css
  - Eliminated Weather API monitoring from AdminPage.tsx
  - Cleaned up all weather icons and UI components from ChatArea.tsx
  - Application no longer has any weather-related features
- June 16, 2025: Completed digital business card functionality removal:
  - Removed digital business card section from right panel in MainApp.tsx
  - Eliminated business_cards and business_card_shares tables from database schema
  - Cleaned up all business card related imports from storage.ts and routes.ts
  - Removed business card operations from IStorage interface
  - Deleted business card type definitions and schema references
  - Digital business card functionality is now completely disabled
- June 16, 2025: Enhanced Quick Voice Message (간편음성메세지) functionality:
  - Integrated full voice processing pipeline identical to regular chat voice messages
  - Added OpenAI transcription for automatic text conversion from audio
  - Implemented proper file upload handling with FormData
  - Added comprehensive debugging logs for troubleshooting
  - Voice messages successfully save to database with proper encryption
  - Real-time delivery depends on WebSocket connection status
- June 17, 2025: Completed Quick Voice Message implementation:
  - Created missing `/api/chat-rooms/:chatRoomId/upload` endpoint with voice transcription
  - Fixed JSON parsing errors and HTML response issues
  - Successfully tested complete workflow: long-press contact → voice recording → OpenAI transcription → database storage → chat room navigation
  - Verified message ID 376 saved with content "하나님이 보우하사 우리나라 만세"
  - Quick Voice Message feature now fully functional from contacts list
- June 17, 2025: Refined smart suggestion system by removing 8 unwanted features:
  - Deleted emotion analysis (감정 감지) functionality completely
  - Removed todo list creation (할 일) detection and generation
  - Eliminated poll creation (투표) feature from smart suggestions
  - Deleted food delivery suggestions (음식 감지) capability
  - Removed schedule management (일정/시간) detection system
  - Eliminated video meeting link generation (화상회의) functionality
  - Deleted success quotes/motivation (동기부여/명언) feature
  - Removed celebration card creation (축하 카드) functionality
  - Smart suggestion system now focuses on 16 core features: profanity detection, business tone conversion, auto translation, currency conversion, search, news summary, unit conversion, YouTube integration, and other utility functions
- June 17, 2025: Fixed mobile notification display issues:
  - Replaced bottom popup notifications that blocked mobile screen with top banner-style notifications
  - Created MobileBannerNotification component with modern gradient design and progress countdown
  - Implemented responsive notification system: mobile uses top banners, desktop keeps existing toasts
  - Added smooth slide-in animations and auto-dismiss functionality
  - Enhanced readability with proper color coding: success (green), error (red), warning (orange), info (blue)
  - Mobile notifications no longer obstruct screen content and provide better user experience
- June 17, 2025: Enhanced voice message bubbles with audio waveform visualization:
  - Added dynamic audio waveform graphs that adjust to voice message duration (20-40 bars)
  - Implemented animated progress indicators during playback with pulsing effects
  - Increased play button size from 8x8 to 10x10 pixels for better mobile usability
  - Added visual feedback with color-coded waveform bars (active vs inactive states)
  - Repositioned "음성" label to top-right corner and removed voice icon for cleaner design
  - Voice messages now provide visual audio content preview for better user experience
- June 17, 2025: Added profile photo upload with crop functionality in settings:
  - Created ProfilePhotoUpload component with react-image-crop integration
  - Implemented square (1:1 aspect ratio) cropping with circular preview
  - Added clickable profile picture in settings page to trigger upload modal
  - Backend API endpoint for secure profile picture upload with encryption
  - Automatic deletion of previous profile pictures when updating
  - 5MB file size limit and image-only validation for security
- June 17, 2025: Enhanced Footer design and unified send button functionality:
  - Increased Footer height with improved padding (px-4 py-3) for better usability
  - Created UnifiedSendButton component combining voice recording and text sending
  - Left buttons redesigned with larger clickable areas (h-9 w-9) and hover effects
  - Text input area width optimized with max-w-2xl constraint for better proportion
  - Unified button: tap to send text messages, long press (500ms) for voice recording
  - Recording duration display with animated red indicator during voice capture
  - Fixed UTF-8 encoding for international filenames in file uploads
- June 17, 2025: Optimized chat media display and improved send button:
  - Made image bubbles more compact (max-h-48 instead of max-h-80) to reduce screen space usage
  - Reduced YouTube preview size (h-32 instead of h-48) and smaller play button for better proportion
  - Enhanced send button visibility with larger size (h-12 w-12) and improved color scheme
  - Fixed voice recording to complete immediately when finger is lifted (no delay)
  - Send button now shows purple for mic, blue for text sending, red with pulse for recording
  - Made voice message waveform graphs static (removed animations) for cleaner UI presentation
  - Enhanced voice message replies with compact display showing only transcribed text content
  - Removed unnecessary UI elements (play buttons, voice icons) from reply previews for cleaner presentation
  - Fixed profile picture upload encryption error by reading file from disk before encryption
  - Added proper temporary file cleanup to prevent disk space issues

## User Preferences

Preferred communication style: Simple, everyday language.