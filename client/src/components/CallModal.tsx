import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: number;
  targetName: string;
  chatRoomId: number;
  isIncoming?: boolean;
  callSessionId?: string;
  offer?: RTCSessionDescriptionInit;
}

type CallState = 'connecting' | 'ringing' | 'connected' | 'ended';

export function CallModal({
  isOpen,
  onClose,
  targetUserId,
  targetName,
  chatRoomId,
  isIncoming = false,
  callSessionId: initialCallSessionId,
  offer: initialOffer
}: CallModalProps) {
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { sendMessage } = useWebSocket(user?.id);
  const { toast } = useToast();
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callSessionIdRef = useRef<string>(initialCallSessionId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<number>(0);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebRTC
  useEffect(() => {
    if (!isOpen) return;

    const setupCall = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        localStreamRef.current = stream;

        // Create peer connection
        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle incoming remote stream
        pc.ontrack = (event) => {
          console.log('📞 Received remote track:', event.track.kind);
          remoteStreamRef.current = event.streams[0];
          
          // Play remote audio
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
          }
          remoteAudioRef.current.srcObject = event.streams[0];
          
          // Start recording after both local and remote tracks are available
          if (localStreamRef.current && pc.connectionState === 'connected') {
            console.log('📞 Both tracks available - starting call recording');
            startCallRecording();
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('📞 Sending ICE candidate');
            sendMessage({
              type: 'call-ice-candidate',
              targetUserId,
              callSessionId: callSessionIdRef.current,
              candidate: event.candidate
            });
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('📞 Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setCallState('connected');
            startCallTimer();
            
            // Start recording if remote track already received
            if (remoteStreamRef.current && localStreamRef.current) {
              console.log('📞 Connection established - starting call recording');
              startCallRecording();
            }
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
          }
        };

        // If incoming call, set remote description and create answer
        if (isIncoming && initialOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          sendMessage({
            type: 'call-answer',
            targetUserId,
            callSessionId: callSessionIdRef.current,
            answer: pc.localDescription
          });
          
          setCallState('connecting');
        } else if (!isIncoming) {
          // Outgoing call: create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          sendMessage({
            type: 'call-offer',
            targetUserId,
            callSessionId: callSessionIdRef.current,
            offer: pc.localDescription
          });
          
          setCallState('ringing');
        }
      } catch (error) {
        console.error('📞 Error setting up call:', error);
        toast({
          title: '통화 연결 실패',
          description: '마이크 권한을 확인해주세요.',
          variant: 'destructive'
        });
        onClose();
      }
    };

    setupCall();

    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Start call timer
  const startCallTimer = () => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setDuration(elapsed);
    }, 1000);
  };

  // Start recording the call
  const startCallRecording = () => {
    // Guard: prevent duplicate recordings
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('📞 Recording already in progress, skipping duplicate start');
      return;
    }
    
    if (!localStreamRef.current) return;

    try {
      // Clear previous call's audio chunks
      audioChunksRef.current = [];
      
      // Create mixed stream for recording (local + remote)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      
      // Add local stream
      const localSource = audioContext.createMediaStreamSource(localStreamRef.current);
      localSource.connect(destination);
      
      // Add remote stream if available
      if (remoteStreamRef.current) {
        const remoteSource = audioContext.createMediaStreamSource(remoteStreamRef.current);
        remoteSource.connect(destination);
        console.log('📞 Both local and remote streams added to recording');
      } else {
        console.warn('📞 Starting recording without remote stream');
      }

      const recorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await saveCallRecording(audioBlob);
        
        // Close AudioContext to release resources
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      // Start real-time transcription every 3 seconds
      startTranscription();
    } catch (error) {
      console.error('📞 Error starting call recording:', error);
    }
  };

  // Start real-time transcription
  const startTranscription = () => {
    transcriptionIntervalRef.current = setInterval(async () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        // Request chunk for transcription
        mediaRecorderRef.current.requestData();
        
        // Get last chunk and transcribe
        if (audioChunksRef.current.length > 0) {
          const lastChunk = audioChunksRef.current[audioChunksRef.current.length - 1];
          await transcribeChunk(lastChunk);
        }
      }
    }, 3000); // Every 3 seconds
  };

  // Transcribe audio chunk
  const transcribeChunk = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text.trim()) {
          setTranscript(prev => [...prev, data.text]);
        }
      }
    } catch (error) {
      console.error('📞 Transcription error:', error);
    }
  };

  // Save call recording to server
  const saveCallRecording = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'call-recording.webm');
      formData.append('chatRoomId', chatRoomId.toString());
      formData.append('targetUserId', targetUserId.toString());
      formData.append('duration', duration.toString());
      formData.append('transcript', JSON.stringify(transcript));

      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id?.toString() || ''
        },
        body: formData
      });

      if (response.ok) {
        console.log('📞 Call recording saved successfully');
      } else {
        console.error('📞 Failed to save call recording:', response.status);
      }
    } catch (error) {
      console.error('📞 Error saving call recording:', error);
    } finally {
      // Clear chunks after upload (success or failure)
      audioChunksRef.current = [];
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // Note: Speaker mode is mostly for UI - actual audio routing is handled by the device
  };

  // End call
  const endCall = () => {
    setCallState('ended');
    
    // Send end call message
    sendMessage({
      type: 'call-end',
      targetUserId,
      callSessionId: callSessionIdRef.current
    });

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Close after a moment
    setTimeout(() => {
      cleanup();
      onClose();
    }, 1000);
  };

  // Reject incoming call
  const rejectCall = () => {
    sendMessage({
      type: 'call-reject',
      targetUserId,
      callSessionId: callSessionIdRef.current
    });
    
    cleanup();
    onClose();
  };

  // Cleanup resources
  const cleanup = () => {
    // Stop timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Stop remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Reset refs
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteAudioRef.current = null;
  };

  // Listen for WebSocket messages
  useEffect(() => {
    if (!isOpen) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.callSessionId !== callSessionIdRef.current) return;

        switch (data.type) {
          case 'call-answer':
            if (peerConnectionRef.current && data.answer) {
              peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            break;
            
          case 'call-ice-candidate':
            if (peerConnectionRef.current && data.candidate) {
              peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
            
          case 'call-end':
            endCall();
            break;
            
          case 'call-reject':
            toast({
              title: '통화 거부됨',
              description: `${targetName}님이 통화를 거부했습니다.`,
              variant: 'destructive'
            });
            onClose();
            break;
            
          case 'call-error':
            toast({
              title: '통화 오류',
              description: data.error || '통화 연결에 실패했습니다.',
              variant: 'destructive'
            });
            onClose();
            break;
        }
      } catch (error) {
        console.error('📞 Error handling WebSocket message:', error);
      }
    };

    // Add event listener to WebSocket
    // Note: This is a simplified version - in production, you'd want to integrate this more tightly with useWebSocket
    window.addEventListener('message', handleWebSocketMessage);

    return () => {
      window.removeEventListener('message', handleWebSocketMessage);
    };
  }, [isOpen]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-between p-6">
      {/* Top Section: Status */}
      <div className="w-full max-w-md text-center pt-20">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
          <div className="text-5xl">📞</div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">{targetName}</h2>
        
        <div className="text-white/80 text-lg">
          {callState === 'ringing' && '전화 거는 중...'}
          {callState === 'connecting' && '연결 중...'}
          {callState === 'connected' && formatDuration(duration)}
          {callState === 'ended' && '통화 종료'}
        </div>
      </div>

      {/* Middle Section: Transcript */}
      {callState === 'connected' && transcript.length > 0 && (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl p-4 max-h-40 overflow-y-auto">
          <div className="text-white/60 text-xs mb-2">실시간 전사</div>
          <div className="space-y-1">
            {transcript.slice(-3).map((text, index) => (
              <div key={index} className="text-white text-sm">
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Section: Controls */}
      <div className="w-full max-w-md">
        {callState === 'connected' && (
          <div className="flex justify-center gap-6 mb-8">
            <Button
              onClick={toggleMute}
              size="lg"
              variant={isMuted ? 'destructive' : 'secondary'}
              className="w-16 h-16 rounded-full"
              data-testid="button-mute-toggle"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            
            <Button
              onClick={toggleSpeaker}
              size="lg"
              variant={isSpeaker ? 'default' : 'secondary'}
              className="w-16 h-16 rounded-full"
              data-testid="button-speaker-toggle"
            >
              {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>
          </div>
        )}

        {/* End/Reject Call Button */}
        <div className="flex justify-center">
          {isIncoming && callState === 'ringing' ? (
            <div className="flex gap-4">
              <Button
                onClick={rejectCall}
                size="lg"
                variant="destructive"
                className="w-20 h-20 rounded-full"
                data-testid="button-reject-call"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button
                onClick={() => setCallState('connecting')}
                size="lg"
                variant="default"
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600"
                data-testid="button-accept-call"
              >
                <Phone className="w-8 h-8" />
              </Button>
            </div>
          ) : callState !== 'ended' ? (
            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
              className="w-20 h-20 rounded-full"
              data-testid="button-end-call"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
