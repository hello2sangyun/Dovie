import { useState, useCallback, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface CacheEntry {
  uri: string;
  size: number;
  timestamp: number;
  mimeType: string;
}

interface FileCacheStats {
  totalSize: number;
  fileCount: number;
  entries: CacheEntry[];
}

const CACHE_DIR = 'file_cache';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const CACHE_INDEX_KEY = 'file_cache_index';

class FileCache {
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Capacitor 네이티브 환경에서만 실행
      if (!Capacitor.isNativePlatform()) {
        console.log('[FileCache] Not a native platform, skipping initialization');
        this.initialized = true;
        return;
      }

      // 캐시 디렉토리 생성
      try {
        await Filesystem.mkdir({
          path: CACHE_DIR,
          directory: Directory.Cache,
          recursive: true
        });
      } catch (error: any) {
        // 디렉토리가 이미 존재하는 경우 무시
        if (!error.message?.includes('exists')) {
          throw error;
        }
      }

      // 캐시 인덱스 로드
      await this.loadCacheIndex();
      this.initialized = true;
      console.log('[FileCache] Initialized successfully');
    } catch (error) {
      console.error('[FileCache] Initialization failed:', error);
      this.initialized = true; // 실패해도 계속 진행
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const result = await Filesystem.readFile({
        path: `${CACHE_DIR}/index.json`,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      const data = JSON.parse(result.data as string);
      this.cacheIndex = new Map(Object.entries(data));
      console.log(`[FileCache] Loaded ${this.cacheIndex.size} cached files`);
    } catch (error) {
      console.log('[FileCache] No existing cache index, starting fresh');
      this.cacheIndex = new Map();
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const data = Object.fromEntries(this.cacheIndex);
      await Filesystem.writeFile({
        path: `${CACHE_DIR}/index.json`,
        directory: Directory.Cache,
        data: JSON.stringify(data),
        encoding: Encoding.UTF8
      });
    } catch (error) {
      console.error('[FileCache] Failed to save cache index:', error);
    }
  }

  private getFileName(url: string): string {
    // URL에서 파일명 추출 및 안전한 파일명 생성
    const urlHash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const extension = url.split('.').pop()?.split('?')[0] || 'bin';
    return `${urlHash}.${extension}`;
  }

  async getCachedFile(url: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return null; // 웹에서는 캐시 사용 안 함
    }

    await this.init();

    const entry = this.cacheIndex.get(url);
    if (!entry) {
      return null;
    }

    try {
      // 파일 존재 확인
      const fileName = this.getFileName(url);
      await Filesystem.stat({
        path: `${CACHE_DIR}/${fileName}`,
        directory: Directory.Cache
      });

      // LRU: 캐시 히트 시 타임스탬프 업데이트 (최근 접근 기록)
      entry.timestamp = Date.now();
      this.cacheIndex.set(url, entry);
      await this.saveCacheIndex();

      // Capacitor URI를 WebView에서 사용 가능한 형태로 변환
      const webViewUri = Capacitor.convertFileSrc(entry.uri);
      return webViewUri;
    } catch (error) {
      // 파일이 없으면 인덱스에서 제거
      this.cacheIndex.delete(url);
      await this.saveCacheIndex();
      return null;
    }
  }

  async cacheFile(url: string, blob: Blob): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      // 웹에서는 ObjectURL 반환
      return URL.createObjectURL(blob);
    }

    await this.init();

    const fileName = this.getFileName(url);
    const filePath = `${CACHE_DIR}/${fileName}`;

    try {
      // Blob을 Base64로 변환
      const base64Data = await this.blobToBase64(blob);

      // 파일 저장
      const result = await Filesystem.writeFile({
        path: filePath,
        directory: Directory.Cache,
        data: base64Data
      });

      // 캐시 인덱스 업데이트
      const entry: CacheEntry = {
        uri: result.uri,
        size: blob.size,
        timestamp: Date.now(),
        mimeType: blob.type
      };

      this.cacheIndex.set(url, entry);
      await this.saveCacheIndex();

      // 캐시 크기 확인 및 정리
      await this.evictIfNeeded();

      console.log(`[FileCache] Cached file: ${url} -> ${result.uri}`);
      
      // WebView에서 사용 가능한 URI로 변환 후 반환
      const webViewUri = Capacitor.convertFileSrc(result.uri);
      return webViewUri;
    } catch (error) {
      console.error('[FileCache] Failed to cache file:', error);
      // 실패 시 ObjectURL로 폴백
      return URL.createObjectURL(blob);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async evictIfNeeded(): Promise<void> {
    const stats = await this.getStats();
    
    if (stats.totalSize <= MAX_CACHE_SIZE) {
      return;
    }

    console.log(`[FileCache] Cache size (${stats.totalSize}) exceeds limit, evicting...`);

    // 오래된 파일부터 삭제
    const sortedEntries = Array.from(this.cacheIndex.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    const targetSize = MAX_CACHE_SIZE * 0.8; // 80%까지 줄이기

    for (const [url, entry] of sortedEntries) {
      if (stats.totalSize - freedSpace <= targetSize) {
        break;
      }

      try {
        const fileName = this.getFileName(url);
        await Filesystem.deleteFile({
          path: `${CACHE_DIR}/${fileName}`,
          directory: Directory.Cache
        });

        this.cacheIndex.delete(url);
        freedSpace += entry.size;
        console.log(`[FileCache] Evicted: ${url}`);
      } catch (error) {
        console.error('[FileCache] Failed to evict file:', error);
      }
    }

    await this.saveCacheIndex();
    console.log(`[FileCache] Eviction complete, freed ${freedSpace} bytes`);
  }

  async getStats(): Promise<FileCacheStats> {
    await this.init();

    let totalSize = 0;
    const entries: CacheEntry[] = [];

    for (const entry of Array.from(this.cacheIndex.values())) {
      totalSize += entry.size;
      entries.push(entry);
    }

    return {
      totalSize,
      fileCount: this.cacheIndex.size,
      entries: entries.sort((a, b) => b.timestamp - a.timestamp)
    };
  }

  async clearCache(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await this.init();

    try {
      // 캐시 디렉토리 전체 삭제
      await Filesystem.rmdir({
        path: CACHE_DIR,
        directory: Directory.Cache,
        recursive: true
      });

      // 다시 생성
      await Filesystem.mkdir({
        path: CACHE_DIR,
        directory: Directory.Cache,
        recursive: true
      });

      this.cacheIndex.clear();
      await this.saveCacheIndex();

      console.log('[FileCache] Cache cleared successfully');
    } catch (error) {
      console.error('[FileCache] Failed to clear cache:', error);
    }
  }
}

// 전역 싱글톤 인스턴스
const globalFileCache = new FileCache();

export function useFileCache() {
  const [stats, setStats] = useState<FileCacheStats>({
    totalSize: 0,
    fileCount: 0,
    entries: []
  });

  const [isLoading, setIsLoading] = useState(false);

  // 파일 가져오기 (캐시 우선)
  const getFile = useCallback(async (url: string): Promise<string> => {
    setIsLoading(true);

    try {
      // 1. 캐시 확인
      const cachedUri = await globalFileCache.getCachedFile(url);
      if (cachedUri) {
        console.log(`[useFileCache] Cache hit: ${url}`);
        setIsLoading(false);
        return cachedUri;
      }

      // 2. 네트워크에서 다운로드
      console.log(`[useFileCache] Cache miss, downloading: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // 3. 캐시에 저장
      const uri = await globalFileCache.cacheFile(url, blob);
      
      setIsLoading(false);
      return uri;
    } catch (error) {
      console.error('[useFileCache] Failed to get file:', error);
      setIsLoading(false);
      // 실패 시 원본 URL 반환
      return url;
    }
  }, []);

  // 통계 업데이트
  const refreshStats = useCallback(async () => {
    const newStats = await globalFileCache.getStats();
    setStats(newStats);
  }, []);

  // 캐시 정리
  const clearCache = useCallback(async () => {
    await globalFileCache.clearCache();
    await refreshStats();
  }, [refreshStats]);

  // 초기화 시 통계 로드
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    getFile,
    stats,
    refreshStats,
    clearCache,
    isLoading
  };
}

// 포맷 유틸리티
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
