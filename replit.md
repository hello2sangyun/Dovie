# Dovie Messenger - Replit Setup Guide

## Overview

Dovie Messenger is a full-stack messaging application built with React, TypeScript, Node.js, and PostgreSQL. It features real-time chat, file sharing with encryption, AI-powered commands, business profiles, and location-based services. The application uses a modern tech stack with Drizzle ORM for database management and WebSocket for real-time communication.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and bundling
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **WebSocket**: ws library for real-time messaging
- **File Upload**: Multer for multipart form handling
- **Encryption**: Custom crypto module using AES-256

### Database Architecture
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Authentication & Authorization
- Email/password and phone number authentication
- Session-based user management with localStorage persistence
- Profile setup workflow for new users
- Role-based access (user, business, admin)

### Real-time Messaging
- WebSocket connections for instant message delivery
- Chat rooms with multiple participants
- Message encryption for secure communication
- File sharing with encrypted storage
- Message read receipts and online status

### AI Integration
- OpenAI GPT-4 integration for smart commands
- Translation services
- Audio transcription capabilities
- Weather information integration

### File Management
- Encrypted file storage with unique hashing
- File type detection and validation
- Image optimization and resizing
- Secure file serving with decryption

### Business Features
- Business cards and profiles
- Company channels and posts
- Professional networking capabilities
- Location-based business discovery

## Data Flow

1. **Client Authentication**: User logs in through React frontend
2. **WebSocket Connection**: Establishes real-time connection after auth
3. **Message Flow**: Messages encrypted client-side, stored encrypted, decrypted on delivery
4. **File Upload**: Files encrypted before storage, served with decryption
5. **AI Commands**: Processed server-side with OpenAI API integration

## External Dependencies

### Required Services
- **Neon PostgreSQL**: Database hosting and management
- **OpenAI API**: AI-powered features and translations
- **Weather API**: Location-based weather services

### Development Dependencies
- **Replit Environment**: Automatic deployment and hosting
- **Vite**: Development server and build tool
- **Drizzle Kit**: Database migrations and schema management

### Key NPM Packages
- **@neondatabase/serverless**: PostgreSQL connection
- **drizzle-orm**: Type-safe database queries
- **@tanstack/react-query**: Server state management
- **ws**: WebSocket implementation
- **bcryptjs**: Password hashing
- **crypto-js**: Encryption utilities
- **multer**: File upload handling

## Deployment Strategy

### Development Environment
- Runs on Replit with hot reload via Vite
- PostgreSQL database provisioned automatically
- Environment variables managed through Replit secrets

### Production Build
- Frontend: Vite builds to `dist/public`
- Backend: ESBuild bundles server to `dist/index.js`
- Static assets served from build directory

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: AI services authentication
- `ENCRYPTION_KEY`: File and message encryption key

## Changelog

```
Changelog:
- June 16, 2025. Initial setup
- June 16, 2025. Complete removal of ALL location chat (주변챗) functionality
  - Removed location permission requests from useAuth.tsx
  - Eliminated location chat tabs from desktop and mobile navigation
  - Cleaned up location chat references from ChatArea.tsx and MainApp.tsx
  - Removed location-based unread count calculations
  - Updated mobile interface to remove nearby chat navigation
  - Database migration to remove location chat tables
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```