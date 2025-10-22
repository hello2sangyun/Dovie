import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Download } from 'lucide-react';

interface AudioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  fileName?: string;
  duration?: string;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  fileName,
  duration
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = fileName || 'audio';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold truncate flex-1 pr-4">
              {fileName || '음성 메시지'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-audio"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio Element */}
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          {/* Waveform Visualization (Simplified) */}
          <div className="relative h-16 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center space-x-1 p-2">
              {[...Array(40)].map((_, i) => {
                const height = Math.random() * 60 + 20;
                const isActive = (currentTime / totalDuration) * 40 > i;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-100 ${
                      isActive
                        ? 'bg-purple-600 dark:bg-purple-400'
                        : 'bg-purple-300 dark:bg-purple-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={totalDuration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            data-testid="audio-seek-bar"
          />

          {/* Time Display */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span data-testid="audio-current-time">{formatTime(currentTime)}</span>
            <span data-testid="audio-total-duration">{formatTime(totalDuration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePlayPause}
              className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white border-0"
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-10 px-4"
              data-testid="button-download-audio"
            >
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
