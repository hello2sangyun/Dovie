import { useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef<number>();

  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      
      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          loadTime: performance.timing ? 
            performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
        }));
        
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      animationId.current = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  return metrics;
}

export function useRenderTime() {
  const [renderTime, setRenderTime] = useState(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    setRenderTime(endTime - startTime.current);
  });

  return renderTime;
}