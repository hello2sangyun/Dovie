"""
Database configuration and connection management
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from models import Base
import asyncio

# Database URL configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dovie:password@localhost/dovie_messenger")
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create engines
engine = create_engine(DATABASE_URL, poolclass=NullPool)
async_engine = create_async_engine(ASYNC_DATABASE_URL, poolclass=NullPool)

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

async def create_tables_async():
    """Create all database tables asynchronously"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    """Get async database session"""
    async with AsyncSessionLocal() as session:
        yield session

# Database initialization
def init_database():
    """Initialize database with tables"""
    print("🔄 Initializing database...")
    create_tables()
    print("✅ Database initialized successfully!")

async def init_database_async():
    """Initialize database with tables asynchronously"""
    print("🔄 Initializing database asynchronously...")
    await create_tables_async()
    print("✅ Database initialized successfully!")