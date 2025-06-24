import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function PWAOnlyTest() {
  const testBadge = async (count: number) => {
    try {
      console.log(`Testing badge: ${count}`);
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        console.log(`Badge set to ${count}`);
        alert(`Badge set to ${count}!`);
      } else {
        console.log('Badge API not supported');
        alert('Badge API not supported on this device');
      }
    } catch (error) {
      console.error('Badge error:', error);
      alert(`Badge error: ${error}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '32px'
        }}>
          PWA Badge Test
        </h1>
        
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Badge API Support: {('setAppBadge' in navigator) ? '✅ YES' : '❌ NO'}
          </p>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            PWA Mode: {window.matchMedia('(display-mode: standalone)').matches ? '✅ YES' : '❌ NO'}
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => testBadge(5)}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
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
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Set Badge to 11
          </button>
          
          <button 
            onClick={async () => {
              try {
                if ('clearAppBadge' in navigator) {
                  await (navigator as any).clearAppBadge();
                  alert('Badge cleared!');
                } else {
                  await testBadge(0);
                }
              } catch (error) {
                alert(`Clear error: ${error}`);
              }
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Clear Badge
          </button>
        </div>
        
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginTop: '24px',
          lineHeight: '1.5'
        }}>
          iOS 16+ Safari: Add to Home Screen → Open → Test
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PWAOnlyTest />
  </StrictMode>,
)