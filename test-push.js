// Test PWA push notification system
const testPushNotification = async () => {
  try {
    console.log('Testing PWA push notification system...');
    
    // Test VAPID key endpoint
    const vapidResponse = await fetch('/api/vapid-public-key');
    const vapidData = await vapidResponse.json();
    console.log('VAPID Key Response:', vapidData);
    
    // Test unread counts endpoint
    const unreadResponse = await fetch('/api/unread-counts', {
      headers: {
        'X-User-ID': '112'
      }
    });
    const unreadData = await unreadResponse.json();
    console.log('Unread Counts Response:', unreadData);
    
    // Test push subscription status
    const statusResponse = await fetch('/api/push-subscription/status', {
      headers: {
        'X-User-ID': '112'
      }
    });
    const statusData = await statusResponse.json();
    console.log('Push Subscription Status:', statusData);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run test if in browser
if (typeof window !== 'undefined') {
  testPushNotification();
}

module.exports = { testPushNotification };