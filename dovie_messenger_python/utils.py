"""
Utility functions for Dovie Messenger
"""

import os
import re
import uuid
import hashlib
import mimetypes
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from urllib.parse import urlparse
import httpx
# from bs4 import BeautifulSoup  # Optional dependency
import logging

logger = logging.getLogger(__name__)

def generate_unique_filename(original_filename: str, user_id: int) -> str:
    """Generate unique filename for uploads"""
    # Get file extension
    name, ext = os.path.splitext(original_filename)
    
    # Generate unique ID
    timestamp = int(datetime.utcnow().timestamp())
    unique_id = str(uuid.uuid4())[:8]
    
    # Sanitize filename
    safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', name)[:50]
    
    return f"{user_id}_{timestamp}_{unique_id}_{safe_name}{ext}"

def get_file_type_category(filename: str) -> str:
    """Determine file type category"""
    ext = os.path.splitext(filename)[1].lower()
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
    audio_extensions = {'.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'}
    document_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'}
    
    if ext in image_extensions:
        return 'image'
    elif ext in video_extensions:
        return 'video'
    elif ext in audio_extensions:
        return 'audio'
    elif ext in document_extensions:
        return 'document'
    else:
        return 'file'

def validate_file_upload(filename: str, file_size: int, user_role: str = 'user') -> Dict[str, Any]:
    """Validate file upload constraints"""
    # Size limits based on user role
    size_limits = {
        'user': 100 * 1024 * 1024,      # 100MB
        'business': 500 * 1024 * 1024,  # 500MB
        'admin': 1024 * 1024 * 1024     # 1GB
    }
    
    max_size = size_limits.get(user_role, size_limits['user'])
    
    # Check file size
    if file_size > max_size:
        return {
            'valid': False,
            'error': f'File too large. Maximum size: {max_size // (1024*1024)}MB'
        }
    
    # Check file extension
    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = {
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',  # Images
        '.mp4', '.avi', '.mov', '.webm',                   # Videos
        '.mp3', '.wav', '.ogg', '.m4a',                    # Audio
        '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'    # Documents
    }
    
    if ext not in allowed_extensions:
        return {
            'valid': False,
            'error': f'File type not allowed: {ext}'
        }
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(filename)
    
    return {
        'valid': True,
        'file_type': get_file_type_category(filename),
        'mime_type': mime_type,
        'size_mb': round(file_size / (1024 * 1024), 2)
    }

def extract_hashtags(text: str) -> List[str]:
    """Extract hashtags from text"""
    if not text:
        return []
    
    hashtag_pattern = r'#([a-zA-Z0-9_가-힣]+)'
    hashtags = re.findall(hashtag_pattern, text)
    
    # Remove duplicates and limit to 10
    unique_hashtags = list(dict.fromkeys(hashtags))[:10]
    
    return unique_hashtags

def detect_urls(text: str) -> List[str]:
    """Detect URLs in text"""
    if not text:
        return []
    
    url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    urls = re.findall(url_pattern, text)
    
    return urls

async def fetch_link_preview(url: str) -> Dict[str, Any]:
    """Fetch link preview data"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, follow_redirects=True)
            
            if response.status_code != 200:
                return None
            
            # soup = BeautifulSoup(response.text, 'html.parser')  # Requires beautifulsoup4
        # For now, return basic URL info
        return {
            'url': url,
            'title': 'Link Preview',
            'description': f'Link to {urlparse(url).netloc}',
            'image_url': None,
            'site_name': urlparse(url).netloc
        }
            
            # Extract title
            title = None
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
            
            # Try Open Graph title
            og_title = soup.find('meta', property='og:title')
            if og_title:
                title = og_title.get('content', title)
            
            # Extract description
            description = None
            desc_tag = soup.find('meta', attrs={'name': 'description'})
            if desc_tag:
                description = desc_tag.get('content')
            
            # Try Open Graph description
            og_desc = soup.find('meta', property='og:description')
            if og_desc:
                description = og_desc.get('content', description)
            
            # Extract image
            image_url = None
            og_image = soup.find('meta', property='og:image')
            if og_image:
                image_url = og_image.get('content')
            
            # Extract site name
            site_name = None
            og_site = soup.find('meta', property='og:site_name')
            if og_site:
                site_name = og_site.get('content')
            else:
                # Extract from URL
                parsed = urlparse(url)
                site_name = parsed.netloc
            
            preview_data = {
                'url': url,
                'title': title[:200] if title else None,
                'description': description[:500] if description else None,
                'image_url': image_url,
                'site_name': site_name[:50] if site_name else None
            }
            
            logger.info(f"🔗 Fetched link preview for: {url}")
            return preview_data
            
    except Exception as e:
        logger.error(f"❌ Failed to fetch link preview for {url}: {e}")
        return None

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove control characters
    filename = ''.join(char for char in filename if ord(char) >= 32)
    
    # Limit length
    name, ext = os.path.splitext(filename)
    if len(name) > 100:
        name = name[:100]
    
    return name + ext

def validate_phone_number(phone: str, country_code: str) -> Dict[str, Any]:
    """Validate phone number format"""
    # Remove spaces and special characters
    clean_phone = re.sub(r'[^\d]', '', phone)
    
    # Basic validation rules by country
    country_rules = {
        '+1': {'min_length': 10, 'max_length': 10},    # US/Canada
        '+82': {'min_length': 9, 'max_length': 11},     # South Korea
        '+36': {'min_length': 8, 'max_length': 9},      # Hungary
        '+44': {'min_length': 10, 'max_length': 11},    # UK
        '+49': {'min_length': 10, 'max_length': 12},    # Germany
    }
    
    # Normalize country code
    if not country_code.startswith('+'):
        country_code = '+' + country_code
    
    rules = country_rules.get(country_code, {'min_length': 8, 'max_length': 15})
    
    if len(clean_phone) < rules['min_length']:
        return {
            'valid': False,
            'error': f'Phone number too short for {country_code}'
        }
    
    if len(clean_phone) > rules['max_length']:
        return {
            'valid': False,
            'error': f'Phone number too long for {country_code}'
        }
    
    return {
        'valid': True,
        'formatted': f"{country_code}{clean_phone}",
        'clean': clean_phone
    }

def generate_qr_token(user_id: int, username: str) -> str:
    """Generate QR code token for user"""
    data = f"{user_id}:{username}:{datetime.utcnow().isoformat()}"
    return hashlib.md5(data.encode()).hexdigest()

def time_ago(dt: datetime) -> str:
    """Convert datetime to human readable time ago format"""
    now = datetime.utcnow()
    
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    
    diff = now - dt
    
    if diff.days > 0:
        return f"{diff.days}일 전"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours}시간 전"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes}분 전"
    else:
        return "방금 전"

def is_business_hours(timezone: str = 'UTC') -> bool:
    """Check if current time is within business hours"""
    # Simple business hours check (9 AM - 6 PM)
    current_hour = datetime.utcnow().hour
    return 9 <= current_hour <= 18

def generate_verification_code(length: int = 6) -> str:
    """Generate numeric verification code"""
    import random
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])

def mask_sensitive_data(data: str, data_type: str = 'email') -> str:
    """Mask sensitive data for logging"""
    if data_type == 'email':
        if '@' in data:
            local, domain = data.split('@', 1)
            return f"{local[:2]}***@{domain}"
        return data[:3] + '***'
    
    elif data_type == 'phone':
        if len(data) > 6:
            return data[:3] + '***' + data[-3:]
        return '***' + data[-2:]
    
    else:
        return data[:3] + '***' if len(data) > 6 else '***'

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, key: str, max_requests: int = 10, window_minutes: int = 5) -> bool:
        """Check if request is allowed within rate limit"""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        # Clean old entries
        if key in self.requests:
            self.requests[key] = [
                timestamp for timestamp in self.requests[key] 
                if timestamp > window_start
            ]
        
        # Check current count
        current_requests = len(self.requests.get(key, []))
        
        if current_requests >= max_requests:
            return False
        
        # Add current request
        if key not in self.requests:
            self.requests[key] = []
        
        self.requests[key].append(now)
        return True
    
    def get_remaining(self, key: str, max_requests: int = 10, window_minutes: int = 5) -> int:
        """Get remaining requests for key"""
        current_requests = len(self.requests.get(key, []))
        return max(0, max_requests - current_requests)

# Global rate limiter instance
rate_limiter = RateLimiter()