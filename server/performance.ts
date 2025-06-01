import { performance } from 'perf_hooks';
import type { Request, Response, NextFunction } from 'express';

// Performance monitoring middleware
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    if (duration > 1000) { // Log slow requests (>1s)
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
}

// Database query performance tracker
export class QueryPerformanceTracker {
  private static queries = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  
  static trackQuery(queryName: string, duration: number) {
    const existing = this.queries.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    this.queries.set(queryName, existing);
  }
  
  static getStats() {
    return Array.from(this.queries.entries()).map(([name, stats]) => ({
      query: name,
      ...stats
    }));
  }
  
  static getSlow() {
    return this.getStats().filter(stat => stat.avgTime > 100); // Queries slower than 100ms
  }
}

// Memory usage monitor
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100
  };
}

// Connection pool monitoring
export class ConnectionPoolMonitor {
  private static connections = new Set<string>();
  
  static addConnection(id: string) {
    this.connections.add(id);
  }
  
  static removeConnection(id: string) {
    this.connections.delete(id);
  }
  
  static getActiveConnections() {
    return this.connections.size;
  }
}