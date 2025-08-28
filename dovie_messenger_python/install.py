#!/usr/bin/env python3
"""
Installation and setup script for Dovie Messenger Python
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def print_header():
    print("""
╔═══════════════════════════════════════════════════════════╗
║                🚀 Dovie Messenger Python                  ║
║              Complete Installation Script                  ║
╚═══════════════════════════════════════════════════════════╝
""")

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required!")
        print(f"   Current version: {sys.version}")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]} is compatible")

def check_system_dependencies():
    """Check and install system dependencies"""
    print("\n📦 Checking system dependencies...")
    
    system = platform.system().lower()
    
    # PostgreSQL check
    try:
        subprocess.run(["psql", "--version"], check=True, capture_output=True)
        print("✅ PostgreSQL is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  PostgreSQL not found")
        print("   Please install PostgreSQL:")
        if system == "darwin":  # macOS
            print("   brew install postgresql")
        elif system == "linux":
            print("   sudo apt-get install postgresql postgresql-contrib")
        elif system == "windows":
            print("   Download from: https://www.postgresql.org/download/windows/")
    
    # Redis check (optional)
    try:
        subprocess.run(["redis-server", "--version"], check=True, capture_output=True)
        print("✅ Redis is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  Redis not found (optional)")
        print("   For session management:")
        if system == "darwin":  # macOS
            print("   brew install redis")
        elif system == "linux":
            print("   sudo apt-get install redis-server")

def install_python_packages():
    """Install Python packages"""
    print("\n📚 Installing Python packages...")
    
    try:
        # Upgrade pip first
        subprocess.run([
            sys.executable, "-m", "pip", "install", "--upgrade", "pip"
        ], check=True)
        
        # Install from requirements.txt
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], check=True)
        
        print("✅ All Python packages installed successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        print("Try installing manually: pip install -r requirements.txt")
        return False
    
    return True

def setup_database():
    """Setup database"""
    print("\n🗄️  Setting up database...")
    
    db_name = input("Enter database name (default: dovie_messenger): ").strip()
    if not db_name:
        db_name = "dovie_messenger"
    
    db_user = input("Enter database user (default: postgres): ").strip()
    if not db_user:
        db_user = "postgres"
    
    db_password = input("Enter database password: ").strip()
    if not db_password:
        db_password = "password"
    
    db_host = input("Enter database host (default: localhost): ").strip()
    if not db_host:
        db_host = "localhost"
    
    db_port = input("Enter database port (default: 5432): ").strip()
    if not db_port:
        db_port = "5432"
    
    # Create database URL
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    print(f"📝 Database URL: {database_url}")
    
    # Try to create database
    try:
        create_cmd = [
            "createdb", "-h", db_host, "-p", db_port, "-U", db_user, db_name
        ]
        
        result = subprocess.run(create_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Database created successfully")
        else:
            if "already exists" in result.stderr:
                print("✅ Database already exists")
            else:
                print(f"⚠️  Could not create database: {result.stderr}")
                print("   You may need to create it manually")
    
    except FileNotFoundError:
        print("⚠️  createdb command not found")
        print("   Create database manually or ensure PostgreSQL client tools are installed")
    
    return database_url

def create_env_file(database_url):
    """Create .env file"""
    print("\n📝 Creating environment file...")
    
    env_content = f"""# Database Configuration
DATABASE_URL={database_url}

# Security
SECRET_KEY={generate_secret_key()}
NODE_ENV=development

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Push Notifications
VAPID_EMAIL=mailto:support@dovie-messenger.com

# Optional API Keys (configure as needed)
# OPENAI_API_KEY=your_openai_api_key
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=+1234567890
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# FACEBOOK_APP_ID=your_facebook_app_id
# FACEBOOK_APP_SECRET=your_facebook_app_secret
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ .env file created")
    print("   Edit .env file to add your API keys")

def generate_secret_key():
    """Generate secure secret key"""
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(50))

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    
    directories = ['uploads', 'logs', 'temp']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created {directory}/")

def test_installation():
    """Test the installation"""
    print("\n🧪 Testing installation...")
    
    try:
        # Test imports
        import fastapi
        import sqlalchemy
        import uvicorn
        print("✅ Core packages import successfully")
        
        # Test database connection
        from database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        print("✅ Database connection successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Installation test failed: {e}")
        return False

def print_next_steps():
    """Print next steps"""
    print("""
╔═══════════════════════════════════════════════════════════╗
║                    🎉 Installation Complete!              ║
╚═══════════════════════════════════════════════════════════╝

📋 Next Steps:

1. Configure API Keys (optional):
   Edit .env file to add:
   - OPENAI_API_KEY (for AI features)
   - TWILIO_* (for SMS verification)
   - GOOGLE_* & FACEBOOK_* (for social login)

2. Start the server:
   python run.py
   
   Or directly:
   python main.py

3. Test the API:
   Open http://localhost:8000 in your browser
   View API docs at http://localhost:8000/docs

4. Client Integration:
   Use the REST API endpoints or WebSocket for real-time features
   
📚 Documentation:
   See README.md for detailed usage instructions

🆘 Need Help?
   Check logs in dovie_messenger.log
   Review configuration in .env file
   
Happy messaging! 🚀
""")

def main():
    """Main installation function"""
    print_header()
    
    # Check requirements
    check_python_version()
    check_system_dependencies()
    
    # Install packages
    if not install_python_packages():
        print("❌ Package installation failed")
        sys.exit(1)
    
    # Setup database
    database_url = setup_database()
    
    # Create configuration
    create_env_file(database_url)
    create_directories()
    
    # Test installation
    if test_installation():
        print_next_steps()
    else:
        print("\n⚠️  Installation completed with warnings")
        print("   Check the error messages above and fix any issues")
        print("   You may need to configure API keys or database settings")

if __name__ == "__main__":
    main()