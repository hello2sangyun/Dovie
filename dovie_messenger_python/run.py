#!/usr/bin/env python3
"""
Production-ready startup script for Dovie Messenger Python
"""

import os
import sys
import logging
import uvicorn
from dotenv import load_dotenv

def setup_logging():
    """Configure logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('dovie_messenger.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def check_requirements():
    """Check if all required packages are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'sqlalchemy', 'asyncpg', 'psycopg2-binary',
        'passlib', 'python-jose', 'pywebpush', 'twilio', 'openai', 'qrcode'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n💡 Install with: pip install -r requirements.txt")
        sys.exit(1)
    
    print("✅ All required packages are installed!")

def check_environment():
    """Check environment variables"""
    required_vars = ['DATABASE_URL', 'SECRET_KEY']
    recommended_vars = ['OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID', 'VAPID_PUBLIC_KEY']
    
    missing_required = []
    missing_recommended = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
    
    for var in recommended_vars:
        if not os.getenv(var):
            missing_recommended.append(var)
    
    if missing_required:
        print("❌ Missing required environment variables:")
        for var in missing_required:
            print(f"   - {var}")
        print("\n💡 Copy .env.example to .env and configure it")
        sys.exit(1)
    
    if missing_recommended:
        print("⚠️ Missing recommended environment variables:")
        for var in missing_recommended:
            print(f"   - {var}")
        print("   Some features may not work properly\n")
    
    print("✅ Environment configuration looks good!")

def main():
    """Main startup function"""
    print("🚀 Starting Dovie Messenger Python Server...")
    
    # Load environment variables
    load_dotenv()
    
    # Setup logging
    setup_logging()
    
    # Check requirements
    print("\n📦 Checking requirements...")
    check_requirements()
    
    # Check environment
    print("\n🔧 Checking environment...")
    check_environment()
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("NODE_ENV") == "development"
    
    print(f"\n🌐 Server will start on {host}:{port}")
    print(f"🔄 Auto-reload: {'enabled' if reload else 'disabled'}")
    print(f"🛠️ Environment: {os.getenv('NODE_ENV', 'production')}")
    
    # Start server
    print("\n✨ Starting server...")
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
            access_log=True,
            use_colors=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()