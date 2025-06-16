# Dovie Messenger - Replit Project Guide

## Overview

Dovie Messenger is a full-stack web application built with modern technologies, featuring a React frontend, Express.js backend, and PostgreSQL database. The application provides secure messaging capabilities with advanced features including AI-powered commands, location-based chat rooms, file sharing with encryption, and real-time communication through WebSockets.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Real-time Communication**: WebSocket server for live messaging
- **File Processing**: Multer for file uploads with encryption

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless PostgreSQL adapter

## Key Components

### Authentication System
- Username/email-based authentication with bcrypt password hashing
- Phone number verification system with SMS integration
- Profile setup flow for new users
- Session management with localStorage persistence

### Messaging System
- Real-time messaging through WebSocket connections
- Group chat creation and management
- Message encryption for file attachments
- Message read tracking and status indicators

### AI Integration
- OpenAI GPT-4 integration for intelligent commands
- Text translation capabilities
- Audio transcription for voice messages
- Command system for automated responses

### File Management
- Encrypted file storage system
- Support for multiple file types (images, documents, audio)
- File preview and download capabilities
- Automatic file size optimization

### Location Services
- Location-based chat rooms for nearby users
- Business verification system for commercial entities
- Geolocation integration with permission handling

## Data Flow

### User Registration & Authentication
1. User signs up with email/password or phone number
2. Profile setup with optional photo upload
3. Authentication state managed through React Context
4. JWT-like session persistence in localStorage

### Message Flow
1. User types message in chat interface
2. Message sent via WebSocket connection
3. Server processes and stores in database
4. Real-time broadcast to chat participants
5. Client updates UI through React Query invalidation

### File Upload Process
1. File selected through drag-drop or file picker
2. Client-side file validation and compression
3. Encrypted upload to server storage
4. File metadata stored in database
5. Download links generated with decryption

## External Dependencies

### Core Technologies
- **React Ecosystem**: React 18, React Query, React Hook Form
- **UI Framework**: Radix UI primitives with shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: OpenAI API for GPT-4 integration
- **Real-time**: Native WebSocket implementation

### Third-party Services
- **SMS Verification**: Phone number validation service
- **Weather API**: Location-based weather integration
- **Maps Integration**: Geolocation services for nearby features
- **Audio Processing**: Web Audio API for voice messages

### Security Dependencies
- **Encryption**: CryptoJS for file and message encryption
- **Hashing**: bcryptjs for password security
- **File Validation**: MIME type checking and sanitization

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with development hot-reload
- **Database**: Local PostgreSQL instance or Neon cloud
- **Build Process**: Vite development server with HMR
- **Port Configuration**: Application runs on port 5000

### Production Deployment
- **Build Process**: 
  - Frontend: Vite build outputting to `dist/public`
  - Backend: esbuild bundling server code to `dist/index.js`
- **Environment Variables**: 
  - `DATABASE_URL` for PostgreSQL connection
  - `OPENAI_API_KEY` for AI features
  - `ENCRYPTION_KEY` for file security
- **Static Assets**: Served through Express with proper caching headers

### Scaling Considerations
- WebSocket connections managed per server instance
- File storage can be migrated to cloud storage (S3, etc.)
- Database supports connection pooling for high concurrency
- Horizontal scaling possible with session store externalization

## Changelog

```
Changelog:
- June 16, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```