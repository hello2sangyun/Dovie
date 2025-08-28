"""
Cryptography utilities for file encryption and security
"""

import os
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import logging

logger = logging.getLogger(__name__)

class CryptoService:
    def __init__(self):
        self.master_key = os.getenv("ENCRYPTION_MASTER_KEY", "default-master-key-change-in-production")
    
    def generate_key_from_password(self, password: str, salt: bytes = None) -> bytes:
        """Generate encryption key from password"""
        if salt is None:
            salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key, salt
    
    def generate_file_key(self) -> str:
        """Generate random key for file encryption"""
        key = Fernet.generate_key()
        return base64.urlsafe_b64encode(key).decode()
    
    def encrypt_file_data(self, file_data: bytes, file_key: str = None) -> tuple[bytes, str]:
        """Encrypt file data and return encrypted data with key"""
        if file_key is None:
            file_key = self.generate_file_key()
        
        # Decode the key
        key = base64.urlsafe_b64decode(file_key.encode())
        fernet = Fernet(key)
        
        # Encrypt the file data
        encrypted_data = fernet.encrypt(file_data)
        
        logger.info(f"🔒 File encrypted ({len(file_data)} -> {len(encrypted_data)} bytes)")
        return encrypted_data, file_key
    
    def decrypt_file_data(self, encrypted_data: bytes, file_key: str) -> bytes:
        """Decrypt file data using the provided key"""
        try:
            key = base64.urlsafe_b64decode(file_key.encode())
            fernet = Fernet(key)
            
            decrypted_data = fernet.decrypt(encrypted_data)
            logger.info(f"🔓 File decrypted ({len(encrypted_data)} -> {len(decrypted_data)} bytes)")
            return decrypted_data
        except Exception as e:
            logger.error(f"❌ File decryption failed: {e}")
            raise ValueError("Failed to decrypt file")
    
    def hash_filename(self, filename: str, user_id: int) -> str:
        """Generate secure hash for filename"""
        data = f"{user_id}_{filename}_{self.master_key}"
        hash_object = hashlib.sha256(data.encode())
        return hash_object.hexdigest()[:16]  # First 16 characters
    
    def encrypt_text(self, text: str) -> str:
        """Encrypt text data"""
        key, salt = self.generate_key_from_password(self.master_key)
        fernet = Fernet(key)
        
        encrypted_text = fernet.encrypt(text.encode())
        
        # Combine salt and encrypted text
        combined = base64.urlsafe_b64encode(salt + encrypted_text).decode()
        return combined
    
    def decrypt_text(self, encrypted_text: str) -> str:
        """Decrypt text data"""
        try:
            # Decode and separate salt and encrypted text
            combined = base64.urlsafe_b64decode(encrypted_text.encode())
            salt = combined[:16]
            encrypted_data = combined[16:]
            
            # Generate key from password and salt
            key, _ = self.generate_key_from_password(self.master_key, salt)
            fernet = Fernet(key)
            
            # Decrypt
            decrypted_text = fernet.decrypt(encrypted_data).decode()
            return decrypted_text
        except Exception as e:
            logger.error(f"❌ Text decryption failed: {e}")
            return encrypted_text  # Return original if decryption fails

# Global crypto service instance
crypto_service = CryptoService()