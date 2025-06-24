export default function StandalonePWA() {
  const testBadge = async (count: number) => {
    try {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        alert(`Badge set to ${count}!`);
      } else {
        alert('Badge API not supported on this device');
      }
    } catch (error) {
      alert(`Badge error: ${error}`);
    }
  };

  const clearBadge = async () => {
    try {
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
        alert('Badge cleared!');
      } else if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(0);
        alert('Badge set to 0!');
      } else {
        alert('Badge API not supported on this device');
      }
    } catch (error) {
      alert(`Badge clear error: ${error}`);
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
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Dovie PWA
        </h1>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '1.1rem'
        }}>
          iOS 16+ Badge Test
        </p>
        
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#374151'
          }}>
            PWA Status
          </p>
          <div style={{
            display: 'inline-block',
            background: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Active & Ready
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => testBadge(5)}
            style={{
              width: '100%',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#6d28d9'}
            onMouseOut={(e) => e.currentTarget.style.background = '#7c3aed'}
          >
            Set Badge to 5
          </button>
          
          <button 
            onClick={() => testBadge(11)}
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            Set Badge to 11
          </button>
          
          <button 
            onClick={clearBadge}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#374151',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Clear Badge
          </button>
        </div>
        
        <div style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '8px' }}>
            For iOS 16+ Safari:
          </p>
          <p style={{ marginBottom: '4px' }}>
            1. Add to Home Screen
          </p>
          <p style={{ marginBottom: '4px' }}>
            2. Open from home screen
          </p>
          <p>
            3. Test badge functionality
          </p>
        </div>
      </div>
    </div>
  );
}