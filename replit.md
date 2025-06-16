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

## User Preferences

Preferred communication style: Simple, everyday language.