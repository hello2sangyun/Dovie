import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketContext } from '@/hooks/useWebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CallSounds } from '@/utils/callSounds';
import { useCallSessionStore } from '@/hooks/useCallSessionStore';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: number;
  targetName: string;
  targetProfilePicture?: string;
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
  targetProfilePicture,
  chatRoomId,
  isIncoming = false,
  callSessionId: initialCallSessionId,
  offer: initialOffer
}: CallModalProps) {
  const { user } = useAuth();
  const { sendMessage, subscribeToSignaling } = useWebSocketContext();
  const { toast } = useToast();
  const { activeSession } = useCallSessionStore();
  
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  // Initialize from activeSession to handle CallKit answer before modal mount
  const [hasAnswered, setHasAnswered] = useState(() => Boolean(activeSession?.hasAnswered));
  
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
  const callSoundsRef = useRef<CallSounds | null>(null);

  // ICE servers configuration with multiple STUN servers and free TURN server
  const iceServers = {
    iceServers: [
      // Google STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Cloudflare STUN
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // Free TURN server from metered.ca (no authentication required for basic use)
      {
        urls: 'turn:a.relay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:a.relay.metered.ca:80?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
  };

  // Initialize call sounds
  useEffect(() => {
    if (isOpen) {
      callSoundsRef.current = new CallSounds();
    }
    
    return () => {
      if (callSoundsRef.current) {
        callSoundsRef.current.cleanup();
        callSoundsRef.current = null;
      }
    };
  }, [isOpen]);

  // Sync hasAnswered from activeSession (CallKit native answer bridge)
  useEffect(() => {
    if (activeSession?.hasAnswered && !hasAnswered) {
      console.log('✅ [CallModal] Session answered from CallKit native UI, starting WebRTC');
      setHasAnswered(true);
      setCallState('connecting');
      
      // Stop incoming ringtone
      if (callSoundsRef.current) {
        callSoundsRef.current.stopIncomingRingtone();
      }
    }
  }, [activeSession?.hasAnswered, hasAnswered]);

  // Play incoming ringtone for receiver
  useEffect(() => {
    if (isOpen && isIncoming && callState === 'ringing' && callSoundsRef.current) {
      console.log('📱 Starting incoming ringtone for receiver');
      callSoundsRef.current.startIncomingRingtone();
    }
    
    return () => {
      if (callSoundsRef.current) {
        callSoundsRef.current.stopIncomingRingtone();
      }
    };
  }, [isOpen, isIncoming, callState]);

  // Initialize WebRTC
  useEffect(() => {
    console.log('📞 CallModal useEffect triggered:', { isOpen, isIncoming, hasAnswered });
    
    if (!isOpen) {
      console.log('📞 Modal not open, skipping WebRTC setup');
      return;
    }
    
    // For incoming calls, wait for user to accept before setting up WebRTC
    if (isIncoming && !hasAnswered) {
      console.log('📞 Incoming call - waiting for user to answer');
      return;
    }

    console.log('📞 Setting up call...');

    const setupCall = async () => {
      try {
        console.log('📞 Getting local media stream...');
        setCallState('connecting');
        
        // Start ringback tone for outgoing calls
        if (!isIncoming && callSoundsRef.current) {
          callSoundsRef.current.startRingbackTone();
        }
        
        // Get local media stream with timeout and retry
        const getUserMediaWithTimeout = async (constraints: MediaStreamConstraints, timeoutMs = 10000) => {
          return Promise.race([
            navigator.mediaDevices.getUserMedia(constraints),
            new Promise<MediaStream>((_, reject) => 
              setTimeout(() => reject(new Error('마이크 접근 시간 초과. 다시 시도해주세요.')), timeoutMs)
            )
          ]);
        };
        
        let stream: MediaStream;
        try {
          stream = await getUserMediaWithTimeout({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
        } catch (error) {
          console.error('📞 First getUserMedia attempt failed:', error);
          // Retry with simpler constraints for mobile compatibility
          console.log('📞 Retrying with simpler audio constraints...');
          stream = await getUserMediaWithTimeout({ audio: true }, 10000);
        }
        
        localStreamRef.current = stream;
        console.log('📞 Local stream acquired:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));

        // Create peer connection
        console.log('📞 Creating peer connection...');
        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;
        console.log('📞 Peer connection created');

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle incoming remote stream
        pc.ontrack = async (event) => {
          console.log('📞 Received remote track:', event.track.kind);
          remoteStreamRef.current = event.streams[0];
          
          // Play remote audio - MUST call play() explicitly to avoid browser autoplay blocking
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
            remoteAudioRef.current.volume = 1.0;
          }
          remoteAudioRef.current.srcObject = event.streams[0];
          
          // Explicitly play the audio (required for iOS and some browsers)
          try {
            await remoteAudioRef.current.play();
            console.log('📞 Remote audio playing successfully');
          } catch (error) {
            console.error('📞 Failed to play remote audio:', error);
          }
          
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
            // Stop ringback tone and play connected sound
            if (callSoundsRef.current) {
              callSoundsRef.current.stopRingbackTone();
              callSoundsRef.current.playConnectedSound();
            }
            
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
            chatRoomId,
            callSessionId: callSessionIdRef.current,
            callType: 'voice',
            offer: pc.localDescription
          });
          
          setCallState('ringing');
        }
      } catch (error) {
        console.error('📞 Error setting up call:', error);
        
        // Determine user-friendly error message
        let errorTitle = '통화 연결 실패';
        let errorDescription = '다시 시도해주세요.';
        
        if (error instanceof Error) {
          if (error.message.includes('시간 초과') || error.message.includes('timeout')) {
            errorTitle = '마이크 접근 시간 초과';
            errorDescription = '브라우저를 새로고침하거나 마이크 권한을 다시 설정해주세요.';
          } else if (error.message.includes('Permission') || error.message.includes('NotAllowedError')) {
            errorTitle = '마이크 권한 필요';
            errorDescription = '브라우저 설정에서 마이크 권한을 허용해주세요.';
          } else if (error.message.includes('NotFoundError')) {
            errorTitle = '마이크를 찾을 수 없음';
            errorDescription = '마이크가 연결되어 있는지 확인해주세요.';
          } else if (error.message.includes('NotReadableError')) {
            errorTitle = '마이크 사용 불가';
            errorDescription = '다른 앱에서 마이크를 사용 중일 수 있습니다. 잠시 후 다시 시도해주세요.';
          }
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: 'destructive'
        });
        onClose();
      }
    };

    setupCall();

    return () => {
      cleanup();
    };
  }, [isOpen, hasAnswered]);

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
        const callData = await response.json();
        console.log('📞 Call recording saved successfully', callData);
        
        // Create a call message in the chat timeline
        if (callData.call?.id && user?.id) {
          const durationMin = Math.floor(duration / 60);
          const durationSec = duration % 60;
          const durationText = durationMin > 0 
            ? `${durationMin}분 ${durationSec}초`
            : `${durationSec}초`;
          
          try {
            await apiRequest('/api/messages', 'POST', {
              chatRoomId,
              senderId: user.id,
              messageType: 'call',
              callId: callData.call.id,
              content: `통화 (${durationText})`
            });
            
            // Invalidate messages cache to show the call message
            queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms`, chatRoomId, 'messages'] });
            queryClient.invalidateQueries({ queryKey: ['/api/chat-rooms'] });
            queryClient.invalidateQueries({ queryKey: [`/api/calls/${chatRoomId}`] });
            
            console.log('📞 Call message created in chat timeline');
          } catch (error) {
            console.error('📞 Failed to create call message:', error);
          }
        }
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
    // Stop call sounds
    if (callSoundsRef.current) {
      callSoundsRef.current.stopRingbackTone();
    }
    
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

  // Listen for WebSocket signaling messages
  useEffect(() => {
    if (!isOpen || !subscribeToSignaling) return;

    const handleSignalingMessage = (data: any) => {
      // Only handle messages for this call session
      if (data.callSessionId !== callSessionIdRef.current) return;

      console.log('📞 CallModal received signaling message:', data.type);

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
          cleanup();
          onClose();
          break;
          
        case 'call-error':
          toast({
            title: '통화 오류',
            description: data.error || '통화 연결에 실패했습니다.',
            variant: 'destructive'
          });
          cleanup();
          onClose();
          break;
      }
    };

    // Subscribe to signaling messages from useWebSocket
    const unsubscribe = subscribeToSignaling(handleSignalingMessage);

    return () => {
      unsubscribe();
    };
  }, [isOpen, subscribeToSignaling]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-6">
      {/* Top Section: Profile and Status */}
      <div className="w-full max-w-md text-center pt-20">
        {/* Profile Image */}
        <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg overflow-hidden">
          {targetProfilePicture ? (
            <img 
              src={targetProfilePicture} 
              alt={targetName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700 text-6xl font-semibold">
              {targetName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">{targetName}</h2>
        
        <div className="text-gray-500 text-lg font-medium">
          {callState === 'ringing' && '전화 거는 중...'}
          {callState === 'connecting' && '연결 중...'}
          {callState === 'connected' && formatDuration(duration)}
          {callState === 'ended' && '통화 종료'}
        </div>
      </div>

      {/* Middle Section: Transcript */}
      {callState === 'connected' && transcript.length > 0 && (
        <div className="w-full max-w-md bg-gray-50 rounded-2xl p-5 max-h-40 overflow-y-auto shadow-sm border border-gray-100">
          <div className="text-gray-400 text-xs font-medium mb-3">실시간 전사</div>
          <div className="space-y-2">
            {transcript.slice(-3).map((text, index) => (
              <div key={index} className="text-gray-700 text-sm leading-relaxed">
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Section: Controls - Modern Clean Style */}
      <div className="w-full max-w-md pb-8">
        {isIncoming && callState === 'ringing' ? (
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={rejectCall}
                size="lg"
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-reject-call"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </Button>
              <span className="text-gray-600 text-sm font-medium">종료</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={() => {
                  setHasAnswered(true);
                  setCallState('connecting');
                }}
                size="lg"
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-accept-call"
              >
                <Phone className="w-8 h-8 text-white" />
              </Button>
              <span className="text-gray-600 text-sm font-medium">수락</span>
            </div>
          </div>
        ) : callState === 'connected' ? (
          <div className="flex justify-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={toggleSpeaker}
                size="lg"
                className={`w-16 h-16 rounded-full shadow-md hover:shadow-lg transition-all ${
                  isSpeaker 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="button-speaker-toggle"
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
              <span className="text-gray-500 text-xs font-medium">스피커</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={toggleMute}
                size="lg"
                className={`w-16 h-16 rounded-full shadow-md hover:shadow-lg transition-all ${
                  isMuted 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid="button-mute-toggle"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <span className="text-gray-500 text-xs font-medium">음소거</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={endCall}
                size="lg"
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg transition-all"
                data-testid="button-end-call"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </Button>
              <span className="text-gray-500 text-xs font-medium">종료</span>
            </div>
          </div>
        ) : callState !== 'ended' ? (
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={endCall}
                size="lg"
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-end-call"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </Button>
              <span className="text-gray-600 text-sm font-medium">종료</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
