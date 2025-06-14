# Dovie Messenger - Replit Project Documentation

## Overview

Dovie Messenger is a modern, secure messaging application built with a full-stack TypeScript architecture. The application features real-time messaging, AI-powered smart features, business card scanning, file sharing with encryption, and advanced contact management. It's designed as a comprehensive communication platform with professional networking capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom animations and themes
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time**: WebSocket integration for live messaging

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT-based auth with bcrypt password hashing
- **File Storage**: Local encrypted file system with crypto-js
- **Real-time**: WebSocket server for instant messaging
- **AI Integration**: OpenAI GPT-4o for smart features

### Database Architecture
- **ORM**: Drizzle with type-safe queries
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Comprehensive relational design with users, contacts, messages, chat rooms, business cards, and file management
- **Migrations**: Automated schema management with drizzle-kit

## Key Components

### Authentication System
- Multi-method authentication (email/password, phone/SMS)
- Secure password hashing with bcryptjs
- Session management with user ID headers
- Profile setup flow for new users

### Messaging System
- Real-time WebSocket-based messaging
- Group chat support with participant management
- Message encryption for sensitive data
- File sharing with automatic encryption/decryption
- Message status tracking (sent, delivered, read)

### AI-Powered Features
- **Business Card Scanner**: OCR with OpenAI Vision API for card data extraction
- **Text Translation**: Multi-language translation with GPT-4o
- **Audio Transcription**: Voice message transcription
- **Smart Commands**: AI-powered text processing and analysis

### File Management
- Encrypted file storage with AES-256 encryption
- Automatic file type detection and validation
- Progress tracking for uploads/downloads
- Image optimization and compression
- Secure file serving with access control

### Business Networking
- Digital business card creation and sharing
- QR code generation for contact sharing
- Professional profile management
- Business post creation and sharing (LinkedIn-style)
- Contact organization with folders and tags

## Data Flow

### Message Flow
1. User composes message in chat interface
2. Message sent via WebSocket to server
3. Server validates and stores encrypted message
4. Server broadcasts to all chat participants
5. Recipients receive real-time updates via WebSocket
6. Message status updated across all clients

### File Upload Flow
1. User selects file in chat or profile
2. Client-side validation and compression
3. File encrypted and uploaded to server
4. Server stores encrypted file with metadata
5. File URL returned to client
6. File access controlled by user permissions

### AI Processing Flow
1. User triggers AI command or uploads business card
2. Data sent to OpenAI API with optimized prompts
3. AI processes and returns structured response
4. Results integrated into user interface
5. Extracted data stored in database for future use

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@tanstack/react-query**: Advanced server state management
- **drizzle-orm**: Type-safe database ORM
- **openai**: AI integration for smart features
- **bcryptjs**: Secure password hashing
- **crypto-js**: File encryption and data security
- **multer**: File upload handling
- **ws**: WebSocket server implementation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **framer-motion**: Advanced animations
- **lucide-react**: Modern icon library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Dynamic class generation

### Development Dependencies
- **vite**: Fast build tool and dev server
- **typescript**: Type safety and tooling
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler

## Deployment Strategy

### Production Build
- Frontend: Vite builds optimized React bundle to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Database: Drizzle migrations applied automatically
- Environment: Node.js production server with proper error handling

### Replit Configuration
- **Run Command**: `npm run dev` for development
- **Build Command**: `npm run build` for production
- **Start Command**: `npm run start` for production server
- **Database**: Automatic PostgreSQL provisioning
- **Port**: 5000 (internal) mapped to 80 (external)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access key
- `ENCRYPTION_KEY`: File encryption key
- `NODE_ENV`: Environment flag (development/production)

## Changelog
- June 14, 2025: Initial setup
- June 14, 2025: Fixed bulk deletion error with proper number validation and improved mobile UX/UI with larger touch targets and better responsive design
- June 14, 2025: Major AI functionality expansion:
  * Enhanced OCR accuracy with multi-language support (Korean, English, Japanese)
  * Intelligent automatic tag generation based on industry and job function
  * Contact priority analysis with follow-up recommendations
  * Improved business card data extraction with structured tagging
  * Complete folder deletion bug fix with comprehensive validation
- June 14, 2025: Comprehensive performance optimization:
  * Database query optimization with CTE-based unread counts and limits
  * API response caching with 15-30 second TTL for static data
  * Reduced client query intervals from 5s to 15s with stale time management
  * Image processing optimization with reduced JPEG quality (85% vs 98%)
  * Static file serving with 1-year aggressive caching for images
  * Optimized Sharp image processing pipeline with faster cubic kernel
- June 14, 2025: UI cleanup - Removed "One Pager 명함 스캐너" container box from Cabinet tab for cleaner interface per user request
- June 14, 2025: Performance fixes - Optimized crop box touch responsiveness with 60fps throttling and business card ratio initialization, added Cabinet folder refresh after business card scanning
- June 14, 2025: Enhanced memo functionality - Added memo input after business card scanning with server-side storage and automatic Cabinet folder refresh
- June 14, 2025: Interface improvement - Removed redundant scanner container box from Cabinet tab, streamlined to clean title and scan button only
- June 14, 2025: Navigation restructure - Set Cabinet as default page for all users, replaced scan tab with Network tab for business SNS functionality using existing LinkedInSpacePage component
- June 14, 2025: Service rebranding - Changed name from "Dovie Messenger" to just "Dovie" throughout application including logos, landing page, and all user-facing text
- June 14, 2025: Enhanced memo functionality - Added proper memo viewing and deletion capabilities in folder shared files section with dedicated memo icon, viewing via toast notifications, and confirmation-based deletion
- June 14, 2025: Network page image display overhaul - Completely rewrote image rendering logic with enhanced error handling, console debugging, and fallback UI for failed image loads

## User Preferences

Preferred communication style: Simple, everyday language.