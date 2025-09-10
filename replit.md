# Dovie Messenger - Replit Project Guide

## Overview
Dovie Messenger is a full-stack chat application designed to be a feature-rich messaging platform. It supports real-time chat, file sharing, business networking, location-based chat, and AI-powered commands. The project aims to provide a comprehensive communication solution with a focus on modern web technologies and a seamless user experience, transitioning from a PWA to a native iOS application.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Real-time**: WebSocket client
- **UI/UX**: Gradient backgrounds, rounded corners, optimized message density, instant image loading, auto-resizing text areas, mobile-first design, adaptive layout for desktop. Unified send button for text/voice. Dynamic audio waveform visualization.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom authentication with bcrypt, SMS verification via Twilio, profile setup flow, IP/GPS-based country detection.
- **File Handling**: Multer for uploads with AES-256 encryption.
- **Real-time**: WebSocket server for chat and push notifications.
- **AI Integration**: OpenAI API for commands, text translation, audio transcription, smart suggestions (primarily YouTube video search/sharing, reminders).
- **Core Features**:
    - **Chat System**: Real-time messaging (group/direct), encrypted file sharing, message reactions/replies, archive.
    - **Business Features**: Business profiles/cards, professional networking space, business posts, company channels.
    - **Location Features**: Location-based chat rooms, nearby user discovery, location sharing.
    - **File Management**: Encrypted storage, preview, download tracking, hashtag-based organization with PC-style folder structure.
    - **Notifications**: Comprehensive PWA and native iOS push notification system (Capacitor), app badge management, intelligent suppression for active users, sound support, and real-time badge updates via Service Worker with IndexedDB.
    - **Optimizations**: Image preloading, virtual scrolling, WebSocket connection management with smart retry, debounced search, aggressive polling for native app feel.
    - **Security**: AES-256 file encryption, bcrypt password hashing, input validation, CORS.
    - **Native iOS App**: Conversion from PWA to native iOS app using Capacitor, including proper entitlements for APNS, device token management, and native permission handling.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL client
- **drizzle-orm**: ORM
- **bcryptjs**: Password hashing
- **multer**: File uploads
- **ws**: WebSocket server
- **openai**: AI service integration
- **crypto-js**: Encryption utilities
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **wouter**: Routing
- **tailwindcss**: CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation
- **twilio**: SMS authentication
- **web-push**: Push notifications
- **@capacitor/core**: iOS native app framework
- **@capacitor/push-notifications**: Capacitor push notification plugin