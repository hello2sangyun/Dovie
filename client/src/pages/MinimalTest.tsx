export default function MinimalTest() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          Dovie PWA Test
        </h1>
        
        <div style={{
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '8px' }}>
            PWA Status
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>
            ✅ Active
          </p>
        </div>
        
        <button 
          onClick={() => {
            if ('setAppBadge' in navigator) {
              (navigator as any).setAppBadge(5);
              alert('Badge set to 5!');
            } else {
              alert('Badge API not supported');
            }
          }}
          style={{
            width: '100%',
            background: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Test Badge (Set to 5)
        </button>
        
        <button 
          onClick={() => {
            if ('clearAppBadge' in navigator) {
              (navigator as any).clearAppBadge();
              alert('Badge cleared!');
            } else {
              alert('Badge API not supported');
            }
          }}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Clear Badge
        </button>
        
        <div style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginTop: '24px',
          lineHeight: '1.5'
        }}>
          <p>iOS 16+ Safari PWA Badge Test</p>
          <p>Add to Home Screen to test badge functionality</p>
        </div>
      </div>
    </div>
  );
}