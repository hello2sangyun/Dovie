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
- June 17, 2025: Fixed hashtag search functionality in tag recall feature:
  - Resolved server-side decryption issues causing empty savedText values in API responses
  - Added proper handling for both encrypted and plain text saved_text data
  - Created comprehensive test data with various hashtags (#Important, #회의, #문서, #발표, #계약서)
  - Enhanced command API to properly return decrypted text for hashtag extraction
  - Fixed search functionality to work with both command names and hashtag content
  - Hashtag recommendations now display correctly in the tag recall interface
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
- June 18, 2025: Completed hashtag auto-extraction system implementation:
  - Fixed critical `saveCommand` method missing from DatabaseStorage class
  - Implemented automatic hashtag detection and command creation for both text and file messages
  - Enhanced hashtag regex to support Korean characters and alphanumeric tags
  - Added comprehensive logging for hashtag extraction debugging
  - Verified successful auto-extraction: #eee hashtag automatically saved as searchable command
  - Tag recall feature now works seamlessly with auto-generated hashtag commands
- June 18, 2025: Enhanced hashtag search functionality with immediate access:
  - Added React Query cache invalidation to FileUploadModal for instant search availability
  - Implemented multi-hashtag search capability (e.g., "#테스트 #다중" finds content with both tags)
  - Enhanced search logic to group commands by message ID and find content containing ALL specified hashtags
  - Updated search UI with clear indicators for single vs multi-hashtag searches
  - Verified complete workflow: file upload with hashtags → automatic command creation → immediate multi-hashtag search capability
- June 18, 2025: Optimized voice message UI and improved friend addition UX:
  - Made voice message waveform static and compact (15 bars, 1.5px width, 4px height)
  - Reduced waveform opacity to 70% for less prominent appearance
  - Implemented automatic popup closing after successful friend addition
  - Enhanced friend addition workflow with 100ms delay before closing for better UX
  - Voice messages now have cleaner, more compact visual presentation
- June 18, 2025: Added comprehensive voice message privacy controls to chat menu:
  - Integrated voice playback permission toggle in chat room dropdown menu (three dots icon)
  - Added auto-play voice message setting with earphone detection in chat settings
  - Created real-time toggle switches with immediate API updates and user feedback
  - Voice settings now accessible directly from any chat room for quick adjustments
  - Enhanced user experience with clear descriptions and status indicators for each setting
- June 18, 2025: Improved chat room settings menu design and usability:
  - Removed emoji icons from voice settings menu items for cleaner appearance
  - Added click-outside functionality to automatically close settings dropdown menu
  - Enhanced user experience with more intuitive menu interaction patterns
  - Settings menu now displays only text labels without visual clutter
- June 18, 2025: Implemented comprehensive location sharing functionality:
  - Added location sharing database schema with locationShareRequests and locationShares tables
  - Created complete backend API endpoints for location detection, sharing, and management
  - Developed LocationShareModal with browser geolocation API and Google Maps integration
  - Implemented automatic detection of Korean location-related questions in message flow
  - Enhanced detection patterns to recognize various forms: "어디로가면 되?", "어디야?", "주소 알려줘", etc.
  - Location sharing triggers automatically when users ask location questions, prompting GPS permission
  - Shared locations appear as messages with Google Maps links for easy viewing
- June 18, 2025: Enhanced YouTube video embedding functionality for message sharing:
  - Fixed YouTube search to perform actual video searches instead of just opening browser tabs
  - Created YouTube API endpoint (/api/youtube/search) that searches real videos using YouTube Data API v3
  - Added YouTube video preview component with thumbnail, title, channel info, and clickable play button
  - Updated database schema to support YouTube preview data storage (youtubePreview jsonb field)
  - Integrated YouTube search with both voice message smart recommendations and text input
  - Users can now share actual YouTube videos as embedded messages that recipients can watch in chat
  - Enhanced detection patterns to extract search queries from voice messages like "지드래곤 유튜브 영상 봐봐"
  - Modified voice message YouTube suggestions to preserve original voice message with transcribed text
  - When using YouTube smart suggestion, both the voice message bubble and video preview are sent as separate messages
- June 18, 2025: Integrated all smart recommendation features into quick voice messages:
  - Added comprehensive smart suggestion processing to ChatsList component for long-press voice messages
  - Quick voice messages now automatically detect and process YouTube, location, translation, search, news, calculation, and currency requests
  - Voice transcription triggers automatic smart recommendations after message is sent
  - Location sharing, YouTube video embedding, and other AI features work seamlessly from contact list long-press
  - Complete feature parity between regular chat voice messages and quick voice messages from contact list
- June 18, 2025: Enhanced YouTube video sharing with advanced selection interface:
  - Replaced simple confirmation dialogs with comprehensive YoutubeSelectionModal showing multiple video options
  - Updated YouTube API endpoint to return up to 8 video results with thumbnails, titles, channel info, and view counts
  - Integrated selection modal with both ChatArea and ChatsList components for consistent user experience
  - Added manual search input refinement capability within the modal interface
  - Users can now browse and select from multiple YouTube videos before sharing in chat
  - Eliminated redundant third message bubble in YouTube sharing workflow for cleaner interface
- June 18, 2025: Implemented cost-efficient integrated voice transcription and smart suggestions:
  - Combined OpenAI Whisper transcription and GPT-4o smart suggestion analysis into single API call
  - Reduced AI API costs by eliminating separate analysis requests for voice messages
  - Enhanced voice transcription to automatically detect YouTube search requests and extract keywords
  - Voice messages like "지드래곤 유튜브 영상 보니까 좋더라" now automatically trigger YouTube search modal with "지드래곤" pre-filled
  - Added automatic YouTube search detection for both text and voice messages with keyword extraction
  - Streamlined smart suggestion processing with server-side analysis and client-side action handling
  - Fixed microphone button becoming disabled after YouTube video sharing by adding proper state reset
  - Applied unified YouTube smart recommendation system to quick voice messages from contacts list
  - Contacts list long-press voice messages now automatically trigger YouTube search with extracted keywords
- June 18, 2025: Implemented intelligent voice message silence detection and cancellation:
  - Added comprehensive silence detection in OpenAI transcription to prevent empty voice messages
  - Server-side analysis identifies noise-only recordings, filler sounds, and meaningless transcriptions
  - Empty or silent recordings are automatically canceled without sending messages to chat
  - Enhanced user experience by eliminating accidental blank voice messages from being posted
  - Both ChatArea and ChatsList components handle silent recording cancellation gracefully
  - No user notification for canceled silent recordings to avoid interrupting conversation flow
- June 18, 2025: Created unified smart suggestion system across all message types:
  - Developed comprehensive smart suggestion analysis function covering 8 core features: YouTube, location sharing, translation, search, calculation, currency conversion, news, and text summarization
  - Unified all three message input methods (chat text input, chat voice messages, contacts list quick voice messages) to use identical smart suggestion logic
  - Eliminated inconsistencies between different message types by creating shared suggestion detection patterns
  - Enhanced keyword extraction for YouTube searches with improved filtering of common words
  - Implemented fallback system where client-side analysis supplements server-side suggestions when needed
  - All message types now provide consistent smart recommendation experience with same detection accuracy and suggestion formats
- June 19, 2025: Implemented intelligent auto-scroll functionality with comprehensive user experience enhancements:
  - Added intelligent scroll detection that automatically tracks user scrolling behavior in chat messages
  - Created smooth auto-scroll system that automatically moves to new messages when users are at bottom of chat
  - Implemented scroll event handler that detects when users manually scroll up to read older messages
  - Added floating scroll-to-bottom button that appears when users scroll away from latest messages
  - Built automatic scroll resumption when users return to bottom of chat conversation
  - Enhanced smart recommendation processing for voice messages sent from chat room tabs list
  - Verified YouTube selection modal already has proper scrolling functionality with ScrollArea component
  - Completed comprehensive smart recommendation support across all voice message input methods
- June 19, 2025: Implemented instant image loading system to eliminate profile picture loading delays and flickering:
  - Created useInstantImageCache hook with global Blob-based caching system for zero-delay image access
  - Built InstantAvatar component that replaces FastLoadingAvatar with immediate image display capabilities
  - Integrated comprehensive image preloader in MainApp that downloads all profile images at application startup
  - Replaced all FastLoadingAvatar instances with InstantAvatar across ContactsList and ChatsList components
  - Fixed Map iterator compatibility issues for cross-browser support
  - Profile images now load instantly without any visible delays or flickering effects
  - App downloads all images as Blobs during initialization, then serves them immediately from memory cache

## User Preferences

Preferred communication style: Simple, everyday language.