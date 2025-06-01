// In-memory cache with TTL for improved performance
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cache = new MemoryCache();

// Cleanup expired cache entries every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Cache key generators
export const CacheKeys = {
  chatRooms: (userId: number) => `chatrooms:${userId}`,
  messages: (chatRoomId: number, limit?: number) => `messages:${chatRoomId}:${limit || 50}`,
  contacts: (userId: number) => `contacts:${userId}`,
  unreadCounts: (userId: number) => `unread:${userId}`,
  user: (userId: number) => `user:${userId}`,
  locationChats: (lat: number, lng: number) => `location:${lat.toFixed(4)}:${lng.toFixed(4)}`,
};