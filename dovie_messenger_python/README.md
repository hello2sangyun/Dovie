# Dovie Messenger Python 🚀

Complete Python implementation of Dovie Messenger with all features from the original Node.js version.

## ✨ Features

### 🔐 Authentication & Security
- ✅ Email/Password authentication with JWT tokens
- ✅ Social login (Google, Facebook) support
- ✅ Phone number verification via SMS (Twilio)
- ✅ QR code generation for easy friend adding
- ✅ Secure password hashing with bcrypt

### 💬 Real-time Messaging
- ✅ WebSocket-based real-time chat
- ✅ Group chats and direct messages
- ✅ Message reactions and replies
- ✅ File sharing with encryption
- ✅ Voice message support with transcription
- ✅ Message search and hashtags
- ✅ Typing indicators and read receipts

### 📱 Push Notifications
- ✅ Web Push notifications (VAPID)
- ✅ iOS APNS integration
- ✅ Smart notification filtering
- ✅ Badge count updates
- ✅ Custom notification sounds

### 📍 Location Features
- ✅ Location sharing in chats
- ✅ Nearby user discovery
- ✅ Location-based chat rooms
- ✅ Google Maps integration

### 🤖 AI Integration
- ✅ OpenAI GPT for smart suggestions
- ✅ Voice transcription with Whisper
- ✅ Text translation
- ✅ YouTube video search
- ✅ Automatic reminders

### 💼 Business Features
- ✅ Business profiles and verification
- ✅ Company channels
- ✅ Professional networking
- ✅ Business post creation

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+ 
- PostgreSQL database
- Redis (optional, for sessions)

### 1. Clone and Setup
```bash
# Create project directory
mkdir dovie_messenger_python
cd dovie_messenger_python

# Copy all the .py files from this project

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb dovie_messenger

# Set database URL in .env
DATABASE_URL=postgresql://username:password@localhost:5432/dovie_messenger
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/dovie_messenger
SECRET_KEY=your-very-secure-secret-key-change-in-production
```

Optional (for full functionality):
```env
# SMS verification
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AI features
OPENAI_API_KEY=your_openai_api_key

# Push notifications
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_PUBLIC_KEY=your_vapid_public_key

# iOS push notifications
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id
APNS_KEY_PATH=path/to/apns/key.p8

# Social login
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### 4. Run the Server

#### Development mode:
```bash
python run.py
```

#### Direct execution:
```bash
python main.py
```

#### Using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/social-login` - Social media login

### SMS Verification  
- `POST /api/auth/send-sms` - Send verification code
- `POST /api/auth/verify-sms` - Verify SMS code

### Chat Rooms
- `GET /api/chat-rooms` - Get user's chat rooms
- `POST /api/chat-rooms` - Create new chat room
- `GET /api/chat-rooms/{id}/messages` - Get messages
- `POST /api/chat-rooms/{id}/messages` - Send message

### File Management
- `POST /api/upload` - Upload file
- `GET /api/files/{filename}` - Download file
- `GET /api/profile-images/{filename}` - Get profile image

### Push Notifications
- `GET /api/push-vapid-key` - Get VAPID public key
- `POST /api/push-subscribe` - Subscribe to web push
- `POST /api/ios-push-token` - Register iOS token

### Location
- `POST /api/chat-rooms/{id}/location` - Share location

### AI Features
- `POST /api/transcribe` - Transcribe audio
- `POST /api/translate` - Translate text

### WebSocket
- `WebSocket /ws` - Real-time messaging connection

## 📊 Database Schema

The application automatically creates all required database tables on first run:

### Core Tables
- `users` - User accounts and profiles
- `chat_rooms` - Chat room information
- `chat_participants` - Chat room membership
- `messages` - Chat messages
- `contacts` - User contacts/friends

### Feature Tables
- `push_subscriptions` - Web push subscriptions
- `ios_device_tokens` - iOS device tokens
- `phone_verifications` - SMS verification codes
- `location_shares` - Shared locations
- `user_posts` - Business/social posts
- `commands` - Saved commands and shortcuts

## 🔧 Configuration Options

### Server Configuration
```python
# main.py
port = int(os.getenv("PORT", 8000))
host = os.getenv("HOST", "0.0.0.0")
```

### Database Configuration
```python
# database.py
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://...")
```

### Push Notifications
```python
# push_notifications.py
vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
```

## 🧪 Testing

### Test the API:
```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "display_name": "Test User", "email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "password123"}'
```

### WebSocket testing:
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

## 🚀 Deployment

### Using Docker:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "run.py"]
```

### Using systemd:
```ini
# /etc/systemd/system/dovie-messenger.service
[Unit]
Description=Dovie Messenger Python Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/dovie_messenger_python
ExecStart=/usr/bin/python3 run.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### Using nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔍 Monitoring & Logging

Logs are written to both file and console:
- `dovie_messenger.log` - Application logs
- Console output - Real-time monitoring

Key metrics to monitor:
- WebSocket connections
- Database connection pool
- Push notification delivery rates
- API response times

## 🆘 Troubleshooting

### Common Issues:

1. **Database connection failed**
   ```bash
   # Check PostgreSQL is running
   sudo systemctl status postgresql
   
   # Verify connection string
   psql "postgresql://username:password@localhost:5432/dovie_messenger"
   ```

2. **SMS not sending**
   ```bash
   # Verify Twilio credentials
   # Check phone number format (+1234567890)
   # Ensure Twilio account has sufficient credit
   ```

3. **Push notifications not working**
   ```bash
   # Generate new VAPID keys
   python -c "from pywebpush import generate_vapid_keys; print(generate_vapid_keys())"
   
   # Check VAPID configuration in .env
   ```

4. **WebSocket connection issues**
   ```bash
   # Check firewall rules
   # Verify JWT token is valid
   # Monitor server logs for WebSocket errors
   ```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation at `/docs` when server is running

---

**Made with ❤️ using FastAPI, SQLAlchemy, and Python**