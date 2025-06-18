import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface AccessibleVoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds
  visualMode?: boolean;
}

export default function AccessibleVoiceRecorder({
  onRecordingComplete,
  disabled = false,
  maxDuration = 300, // 5 minutes default
  visualMode = false
}: AccessibleVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Visual feedback animation
  const updateAudioVisualization = useCallback(() => {
    if (!analyserRef.current || !isRecording || isPaused) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average audio level (0-100)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(Math.round((average / 255) * 100));
    
    // Update waveform data (keep last 50 samples)
    setWaveformData(prev => {
      const newData = [...prev, average];
      return newData.slice(-50);
    });
    
    animationRef.current = requestAnimationFrame(updateAudioVisualization);
  }, [isRecording, isPaused]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Setup audio analysis for visual feedback
      if (visualMode) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const actualDuration = Math.round((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        onRecordingComplete(audioBlob, actualDuration);
        cleanup();
      };
      
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setWaveformData([]);
      
      // Start timer
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          setDuration(prev => {
            const newDuration = prev + 1;
            if (newDuration >= maxDuration) {
              stopRecording();
              return maxDuration;
            }
            return newDuration;
          });
        }
      }, 1000);
      
      // Start visual feedback
      if (visualMode) {
        updateAudioVisualization();
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onRecordingComplete, maxDuration, visualMode, updateAudioVisualization, isPaused]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    if (isPaused) {
      // Resume
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (visualMode) {
        updateAudioVisualization();
      }
    } else {
      // Pause
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pausedTimeRef.current += Date.now() - startTimeRef.current;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isPaused, isRecording, visualMode, updateAudioVisualization]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [isRecording]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setAudioLevel(0);
    setDuration(0);
    setWaveformData([]);
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (duration / maxDuration) * 100;

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-4">
        {/* Status and Duration */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {isRecording && (
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                isPaused ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            )}
            <span className="text-lg font-medium">
              {isRecording ? (isPaused ? '일시정지됨' : '녹음 중...') : '음성 녹음 준비'}
            </span>
          </div>
          
          <div className="text-2xl font-mono text-primary">
            {formatDuration(duration)}
          </div>
          
          {maxDuration > 0 && (
            <div className="text-sm text-muted-foreground">
              최대 {formatDuration(maxDuration)}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <Progress 
          value={progressPercentage} 
          className="h-2"
          aria-label={`녹음 진행률: ${Math.round(progressPercentage)}%`}
        />

        {/* Visual Feedback */}
        {visualMode && (
          <>
            {/* Audio Level Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>음성 레벨</span>
                <span>{audioLevel}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${
                    audioLevel > 70 ? 'bg-red-500' : 
                    audioLevel > 30 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>

            {/* Waveform Visualization */}
            <div className="h-16 bg-gray-100 rounded-lg flex items-end justify-center gap-1 p-2">
              {waveformData.length > 0 ? (
                waveformData.slice(-25).map((level, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 w-1 transition-all duration-100"
                    style={{ 
                      height: `${Math.max((level / 255) * 100, 5)}%`,
                      opacity: 0.3 + (index / 25) * 0.7
                    }}
                  />
                ))
              ) : (
                <div className="text-sm text-gray-500">음성 파형이 여기에 표시됩니다</div>
              )}
            </div>
          </>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center gap-3">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={disabled}
              size="lg"
              className="h-16 w-16 rounded-full"
              aria-label="음성 녹음 시작"
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                onClick={togglePause}
                variant="outline"
                size="lg"
                className="h-12 w-12 rounded-full"
                aria-label={isPaused ? "녹음 재시작" : "녹음 일시정지"}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="h-16 w-16 rounded-full"
                aria-label="녹음 중지 및 전송"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Audio Level Indicator */}
        {isRecording && !isPaused && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {audioLevel > 10 ? (
              <Volume2 className="h-4 w-4 text-green-500" />
            ) : (
              <VolumeX className="h-4 w-4 text-red-500" />
            )}
            <span>
              {audioLevel > 10 ? '음성이 감지되고 있습니다' : '음성을 감지할 수 없습니다'}
            </span>
          </div>
        )}

        {/* Accessibility Information */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• 스페이스바: 녹음 시작/중지</p>
          <p>• Enter: 일시정지/재시작</p>
          <p>• 화면 리더에서 녹음 상태를 음성으로 안내합니다</p>
        </div>
      </CardContent>
    </Card>
  );
}