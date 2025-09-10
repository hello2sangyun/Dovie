# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack, feature-rich chat application designed for real-time communication, file sharing, and business networking. It includes advanced capabilities like location-based chat and AI-powered commands. The project aims to provide a seamless, native-like messaging experience across web and mobile platforms, leveraging modern web technologies for scalability and performance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Real-time**: WebSocket client
- **UI/UX**: Gradient backgrounds, rounded corners, animated elements, compact message bubbles for high message density, adaptive mobile layouts, instant image loading, and a purple-themed scrollbar.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom authentication with bcrypt hashing and SMS verification (Twilio integration).
- **File Handling**: Multer for encrypted uploads (AES-256).
- **Real-time**: WebSocket server.
- **AI Integration**: OpenAI API for smart commands (YouTube video search and sharing, text translation, audio transcription).
- **Architecture**: Microservice-oriented design for distinct functionalities like chat, authentication, and AI processing.

### Database Design
- **ORM**: Drizzle with PostgreSQL.
- **Encryption**: AES-256 for file storage.
- **Schema**: Includes users, contacts, chat rooms, messages, commands, and push subscriptions.

### Core Features
- **Authentication**: Email/password, phone number, and profile setup flow.
- **Chat**: Real-time messaging, group chats, direct messages, encrypted file sharing, message reactions/replies, and archive functionality. Intelligent auto-scroll and smart retry mechanisms for messages.
- **Business Features**: Business profiles, cards, and networking spaces (LinkedIn-style).
- **Location Features**: Location-based chat rooms and nearby user discovery (removed during development, but architecture supported it).
- **AI Integration**: OpenAI for smart suggestions (focused on YouTube search), text translation, and audio transcription.
- **File Management**: Encrypted storage, preview, download tracking, and single-hashtag organization.
- **Push Notifications**: Comprehensive PWA and native iOS push notification system with app badge management, sound, and intelligent filtering (e.g., suppressing notifications for active users).
- **Voice Messaging**: Quick voice messages with OpenAI transcription, waveform visualization, and privacy controls. Intelligent silence detection and cancellation.
- **PWA Capabilities**: Offline caching, home screen installation, and native-like mobile experience.
- **Native iOS App**: Conversion to Capacitor-based native iOS app for full platform integration, including APNS-based push notifications.

## External Dependencies

### Core
- **@neondatabase/serverless**: Neon PostgreSQL client
- **drizzle-orm**: Database ORM
- **bcryptjs**: Password hashing
- **multer**: File upload handling
- **ws**: WebSocket server
- **openai**: AI service integration
- **crypto-js**: Encryption utilities
- **web-push**: Push notification library
- **Twilio**: SMS verification

### Frontend
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **wouter**: Lightweight routing
- **tailwindcss**: CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation

### Development
- **vite**: Build tool
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: Fast bundling

### iOS Native (Capacitor)
- **@capacitor/core**: Core Capacitor framework
- **@capacitor/push-notifications**: Push notification plugin for native apps
- **@capacitor/splash-screen**: Splash screen plugin