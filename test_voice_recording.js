// Test script to verify MediaRecorder functionality
console.log('Testing MediaRecorder support...');

// Check browser support
console.log('MediaRecorder supported:', !!window.MediaRecorder);
console.log('getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia);

// Test supported MIME types
const supportedTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/wav'
];

supportedTypes.forEach(type => {
  console.log(`${type}: ${MediaRecorder.isTypeSupported(type)}`);
});

// Test basic recording flow
async function testRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted');
    
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const chunks = [];
    
    recorder.ondataavailable = (event) => {
      console.log('Data chunk received:', event.data.size);
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    recorder.onstop = () => {
      console.log('Recording stopped, chunks:', chunks.length);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      console.log('Final blob size:', blob.size);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    };
    
    recorder.start(100);
    console.log('Recording started');
    
    // Stop after 2 seconds
    setTimeout(() => {
      recorder.requestData();
      recorder.stop();
    }, 2000);
    
  } catch (error) {
    console.error('Recording test failed:', error);
  }
}

// Run test when called
window.testVoiceRecording = testRecording;