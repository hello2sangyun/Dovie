import { Capacitor } from '@capacitor/core';

/**
 * Get the API base URL based on the current environment
 * - Web/PWA: Use relative URLs (empty string)
 * - Native app (iOS/Android): Use absolute URL to development server
 */
export function getApiBaseUrl(): string {
  // Check if running in Capacitor (native app)
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // For native apps, use the development server URL
    // This is set at build time via Vite environment variables
    const devServerUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (devServerUrl) {
      console.log(`📱 Native app detected - using API base URL: ${devServerUrl}`);
      return devServerUrl;
    }
    
    // Fallback to production server if no dev URL is set
    const productionUrl = 'https://dovie.online';
    console.warn(`⚠️ No VITE_API_BASE_URL set, falling back to: ${productionUrl}`);
    return productionUrl;
  }
  
  // For web/PWA, use relative URLs (same-origin)
  console.log('🌐 Web/PWA detected - using relative URLs');
  return '';
}

/**
 * Construct a full API URL
 * @param path - API path starting with /
 * @returns Full URL for the API endpoint
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
}
