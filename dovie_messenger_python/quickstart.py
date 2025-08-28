#!/usr/bin/env python3
"""
One-click quickstart for Dovie Messenger Python
This script sets up everything and runs the server
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def main():
    print("🚀 Dovie Messenger Python - Quickstart")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print(f"❌ Python 3.8+ required. Current: {sys.version}")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]}")
    
    # Install requirements
    print("📦 Installing requirements...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "--quiet"
        ])
        print("✅ Requirements installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements")
        print("Try: pip install -r requirements.txt")
        sys.exit(1)
    
    # Create .env if not exists
    if not os.path.exists('.env'):
        print("📝 Creating .env file...")
        with open('.env.example', 'r') as example, open('.env', 'w') as env_file:
            content = example.read()
            # Set a default database URL for quick testing
            content = content.replace(
                'DATABASE_URL=postgresql://username:password@localhost:5432/dovie_messenger',
                'DATABASE_URL=postgresql://dovie:password@localhost:5432/dovie_messenger'
            )
            # Generate a secret key
            import secrets, string
            secret_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(50))
            content = content.replace('SECRET_KEY=your-very-secure-secret-key-change-in-production', f'SECRET_KEY={secret_key}')
            env_file.write(content)
        print("✅ .env file created")
    
    # Create directories
    for directory in ['uploads', 'logs', 'temp']:
        Path(directory).mkdir(exist_ok=True)
    
    print("📁 Directories created")
    
    # Check if database is accessible
    print("🗄️  Checking database...")
    try:
        from database import engine
        from models import Base
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        
        print("✅ Database connection successful")
        
    except Exception as e:
        print(f"⚠️  Database issue: {e}")
        print("   The server will start but database features may not work")
        print("   Configure DATABASE_URL in .env file")
    
    print("\n🌟 Starting Dovie Messenger server...")
    print("   Server will be available at: http://localhost:8000")
    print("   API documentation: http://localhost:8000/docs")
    print("   Press Ctrl+C to stop")
    print("-" * 50)
    
    # Start the server
    try:
        from main import app
        import uvicorn
        
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Install missing packages: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()