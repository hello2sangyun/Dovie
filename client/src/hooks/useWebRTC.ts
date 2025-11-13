import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WebRTCConfig {
  chatRoomId: number;
  isCall

er: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnd?: () => void;
  onTranscript?: (text: string, speaker: 'local' | 'remote') => void;
}

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const ICE_SERVERS: ICEServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTC({
  chatRoomId,
  isCaller,
  onRemoteStream,
  onCallEnd,
  onTranscript,
}: WebRTCConfig) {
  const { ws, sendMessage } = useWebSocket();
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const audioChunks = useRef<Blob[]>([]);
  const transcriptionTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [callSessionId] = useState(() => crypto.randomUUID());
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        sendMessage({
          type: 'call-ice-candidate',
          chatRoomId,
          callSessionId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📞 Received remote track:', event.streams[0]);
      if (onRemoteStream && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('📞 Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        onCallEnd?.();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [chatRoomId, callSessionId, ws, sendMessage, onRemoteStream, onCallEnd]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStream.current = stream;
      console.log('📞 Local stream started');
      
      return stream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }
  }, []);

  const startRecording = useCallback((stream: MediaStream) => {
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
          audioChunks.current.push(event.data);
        }
      };

      recorder.start(1000);
      mediaRecorder.current = recorder;
      setIsRecording(true);
      console.log('🎙️ Recording started');

      startTranscriptionChunking();
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }, []);

  const startTranscriptionChunking = useCallback(() => {
    transcriptionTimer.current = setInterval(async () => {
      if (audioChunks.current.length === 0) return;

      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      audioChunks.current = [];

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'chunk.webm');

        const response = await fetch('/api/transcribe-chunk', {
          method: 'POST',
          headers: {
            'x-user-id': String(localStorage.getItem('userId') || ''),
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.transcription && onTranscript) {
            onTranscript(result.transcription, 'local');
          }
        }
      } catch (error) {
        console.error('❌ Transcription chunk failed:', error);
      }
    }, 3000);
  }, [onTranscript]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(recordedChunks.current, { type: 'audio/webm' });
        recordedChunks.current = [];
        audioChunks.current = [];
        setIsRecording(false);
        console.log('🎙️ Recording stopped');
        resolve(audioBlob);
      };

      mediaRecorder.current.stop();

      if (transcriptionTimer.current) {
        clearInterval(transcriptionTimer.current);
        transcriptionTimer.current = null;
      }
    });
  }, []);

  const initiateCall = useCallback(async () => {
    const stream = await startLocalStream();
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendMessage({
      type: 'call-offer',
      chatRoomId,
      callSessionId,
      offer: pc.localDescription,
    });

    startRecording(stream);
  }, [chatRoomId, callSessionId, startLocalStream, createPeerConnection, sendMessage, startRecording]);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const stream = await startLocalStream();
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendMessage({
      type: 'call-answer',
      chatRoomId,
      callSessionId,
      answer: pc.localDescription,
    });

    startRecording(stream);
  }, [chatRoomId, callSessionId, startLocalStream, createPeerConnection, sendMessage, startRecording]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerConnection.current) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const endCall = useCallback(async () => {
    const recordingBlob = await stopRecording();

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    sendMessage({
      type: 'call-end',
      chatRoomId,
      callSessionId,
    });

    return recordingBlob;
  }, [chatRoomId, callSessionId, stopRecording, sendMessage]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.callSessionId !== callSessionId) return;

        switch (data.type) {
          case 'call-offer':
            if (!isCaller) {
              answerCall(data.offer);
            }
            break;
          case 'call-answer':
            if (isCaller) {
              handleAnswer(data.answer);
            }
            break;
          case 'call-ice-candidate':
            handleICECandidate(data.candidate);
            break;
          case 'call-end':
            onCallEnd?.();
            break;
        }
      } catch (error) {
        console.error('❌ WebRTC message error:', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, callSessionId, isCaller, answerCall, handleAnswer, handleICECandidate, onCallEnd]);

  useEffect(() => {
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (transcriptionTimer.current) {
        clearInterval(transcriptionTimer.current);
      }
    };
  }, []);

  return {
    initiateCall,
    answerCall,
    endCall,
    isRecording,
    connectionState,
    callSessionId,
  };
}
