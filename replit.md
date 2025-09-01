# Dovie Messenger - Replit Project Guide

## Overview

Dovie Messenger is a full-stack, feature-rich chat application designed for real-time communication, file sharing, business networking, and AI-powered interactions. It aims to provide a comprehensive messaging experience for both personal and professional use, with a focus on security, performance, and user-friendly design. The project ambitiously transitions from a PWA to a full native iOS application, enhancing its market potential and user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

Dovie Messenger is built with a React (TypeScript) frontend using Vite, Tailwind CSS, and TanStack Query for state management. The backend is a Node.js/Express (TypeScript) application, utilizing PostgreSQL with Drizzle ORM for data persistence and WebSockets for real-time communication.

**Key Architectural Decisions & Features:**
- **UI/UX:** Modern, minimalist design with a focus on compactness and visual appeal. Features include optimized chat bubble design with gradient backgrounds, intelligent auto-scroll, instant image loading with preloading for avatars, and responsive layouts for both desktop and mobile. A purple-themed design language is consistently applied.
- **Real-time Chat:** Core functionality is powered by WebSockets, supporting direct and group messages, file sharing (encrypted), message reactions, and replies.
- **Authentication:** Custom email/password and phone number authentication with Twilio SMS verification, bcrypt hashing, and a comprehensive profile setup flow.
- **File Management:** Encrypted file storage (AES-256), drag-and-drop uploads, and an organized archive system with single-hashtag categorization and search.
- **AI Integration:** Primarily focuses on YouTube video search and sharing via OpenAI API, with intelligent voice message transcription and smart suggestions.
- **Voice Messaging:** Comprehensive voice message functionality with real-time transcription, audio waveform visualization, and silence detection for cancellation.
- **Business Features:** Includes business profiles and a LinkedIn-style networking space. (Note: Some business card features were deprecated).
- **Notifications:** Advanced push notification system supporting iOS PWA and native iOS, with real-time app badge updates, sound support, intelligent filtering (Telegram/WhatsApp style to prevent spam for active users), and transcribed voice message content.
- **PWA & Native Transition:** The application is designed as a Progressive Web App (PWA) with full offline capabilities, and has been successfully converted into a standalone native iOS application using Capacitor, leveraging native APIs for permissions, push notifications, and system integration.
- **Performance & Security:** Emphasizes performance optimizations like query caching, image preloading, and virtual scrolling. Security measures include AES-256 encryption, bcrypt hashing, input validation, and secure session management.
- **User Management:** Includes contact management with favoriting, blocking, and a streamlined friend addition process via QR codes.
- **Reminders:** Smart recommendation reminders appear as system messages within chat rooms.

## External Dependencies

- **Database & ORM:** `@neondatabase/serverless` (Neon PostgreSQL), `drizzle-orm`
- **Authentication & Security:** `bcryptjs`, `crypto-js`
- **File Handling:** `multer`
- **Real-time Communication:** `ws` (WebSocket server)
- **AI Services:** `openai`
- **Push Notifications:** `web-push`, Capacitor push notification plugins
- **Frontend Frameworks & Utilities:** `react`, `vite`, `tailwindcss`, `@radix-ui/*`, `@tanstack/react-query`, `wouter`, `lucide-react`, `date-fns`, `react-image-crop`
- **SMS Verification:** Twilio SMS API
- **Location Services:** `ipapi.co` (for IP-based location detection)
- **Map Integration:** Google Maps (for location sharing)
- **Video Services:** YouTube Data API v3