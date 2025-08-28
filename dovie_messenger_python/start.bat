@echo off
REM Quick start script for Dovie Messenger Python (Windows)

echo 🚀 Starting Dovie Messenger Python...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is required but not installed.
    pause
    exit /b 1
)

echo ✅ Python detected

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📚 Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Copying from example...
    copy .env.example .env
    echo 📝 Please edit .env file with your configuration
    echo    At minimum, set DATABASE_URL and SECRET_KEY
)

REM Start the server
echo 🌟 Starting server...
python run.py

pause