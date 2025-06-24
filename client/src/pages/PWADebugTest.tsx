import { useState, useEffect } from "react";

export default function PWADebugTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [badgeCount, setBadgeCount] = useState(0);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev.slice(-20), logMessage]); // Keep last 20 logs
  };

  useEffect(() => {
    addLog("🚀 PWA Debug Test Started");
    
    // Check PWA environment
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isStandalone = (window.navigator as any).standalone === true;
    addLog(`📱 PWA Mode: ${isPWA || isStandalone ? 'YES' : 'NO'}`);
    
    // Check Service Worker support
    if ('serviceWorker' in navigator) {
      addLog("✅ Service Worker supported");
      
      navigator.serviceWorker.ready.then(registration => {
        addLog(`🔧 Service Worker ready: ${registration.scope}`);
      }).catch(error => {
        addLog(`❌ Service Worker error: ${error.message}`);
      });
    } else {
      addLog("❌ Service Worker not supported");
    }
    
    // Check Badge API support
    if ('setAppBadge' in navigator) {
      addLog("✅ Badge API (navigator.setAppBadge) supported");
    } else {
      addLog("❌ Badge API not supported");
    }
    
    // Check Push API support
    if ('PushManager' in window) {
      addLog("✅ Push API supported");
    } else {
      addLog("❌ Push API not supported");
    }
    
    // Check Notification API
    addLog(`🔔 Notification permission: ${Notification.permission}`);
    
  }, []);

  const testBadge = async (count: number) => {
    try {
      addLog(`🎯 Testing badge with count: ${count}`);
      
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        setBadgeCount(count);
        addLog(`✅ Badge set to ${count} via navigator.setAppBadge`);
      } else {
        addLog("❌ navigator.setAppBadge not available");
        
        // Try Service Worker approach
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if ('setAppBadge' in registration) {
            await (registration as any).setAppBadge(count);
            setBadgeCount(count);
            addLog(`✅ Badge set to ${count} via ServiceWorker.setAppBadge`);
          } else {
            addLog("❌ ServiceWorker.setAppBadge not available");
          }
        }
      }
    } catch (error) {
      addLog(`❌ Badge test error: ${(error as Error).message}`);
    }
  };

  const clearBadge = async () => {
    try {
      addLog("🧹 Clearing badge");
      
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
        setBadgeCount(0);
        addLog("✅ Badge cleared via navigator.clearAppBadge");
      } else if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(0);
        setBadgeCount(0);
        addLog("✅ Badge cleared via navigator.setAppBadge(0)");
      } else {
        addLog("❌ No badge clear method available");
      }
    } catch (error) {
      addLog(`❌ Badge clear error: ${(error as Error).message}`);
    }
  };

  const testNotificationPermission = async () => {
    try {
      addLog("🔔 Requesting notification permission");
      
      const permission = await Notification.requestPermission();
      addLog(`🔔 Notification permission result: ${permission}`);
      
      if (permission === 'granted') {
        const notification = new Notification('PWA Test', {
          body: 'Notification test successful!',
          badge: '/icon-192x192.png',
          icon: '/icon-192x192.png'
        });
        
        notification.onclick = () => {
          addLog("🔔 Notification clicked");
          notification.close();
        };
        
        setTimeout(() => notification.close(), 5000);
        addLog("✅ Test notification sent");
      }
    } catch (error) {
      addLog(`❌ Notification error: ${(error as Error).message}`);
    }
  };

  const testPushSubscription = async () => {
    try {
      addLog("📡 Testing push subscription");
      
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BMXIItKGDgf2hZcuJMCiQtZjGj_CkXW76qHE1KvELI0iLmjNNr5kJ_G_Q4W_Ac-iVjG5mF8D1hF9oJ0pQa2I_RnZ1Y3PYq7fghjkl'
        });
        
        addLog("✅ Push subscription successful");
        addLog(`📡 Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
      } else {
        addLog("❌ Push subscription not supported");
      }
    } catch (error) {
      addLog(`❌ Push subscription error: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          PWA Debug Test Console
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <button 
            onClick={() => testBadge(5)}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Set Badge to 5
          </button>
          
          <button 
            onClick={() => testBadge(11)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Set Badge to 11
          </button>
          
          <button 
            onClick={clearBadge}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Clear Badge
          </button>
          
          <button 
            onClick={testNotificationPermission}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Test Notification
          </button>
          
          <button 
            onClick={testPushSubscription}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Test Push Subscription
          </button>
        </div>
        
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>
            Current Badge Count: {badgeCount}
          </p>
        </div>
        
        <div style={{
          background: '#1f2937',
          color: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontSize: '0.875rem',
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Debug Console:</div>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))}
        </div>
        
        <div style={{
          marginTop: '16px',
          fontSize: '0.875rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Open browser dev tools to see detailed console output
        </div>
      </div>
    </div>
  );
}