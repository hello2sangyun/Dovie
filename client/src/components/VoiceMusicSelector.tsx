import React, { useState, useEffect } from 'react';
import { Music, Play, Pause, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MusicOption {
  id: string;
  name: string;
  description: string;
  file: string;
  mood: string;
  color: string;
}

interface VoiceMusicSelectorProps {
  transcribedText: string;
  audioBlob: Blob;
  onMusicSelected: (musicId: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const MUSIC_OPTIONS: MusicOption[] = [
  {
    id: 'calm',
    name: '차분한 분위기',
    description: '잔잔하고 평온한 느낌',
    file: '/background-music/calm.mp3',
    mood: 'calm',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'happy',
    name: '밝은 분위기',
    description: '즐겁고 활기찬 느낌',
    file: '/background-music/happy.mp3',
    mood: 'happy',
    color: 'bg-yellow-100 text-yellow-700'
  },
  {
    id: 'romantic',
    name: '로맨틱한 분위기',
    description: '따뜻하고 감성적인 느낌',
    file: '/background-music/romantic.mp3',
    mood: 'romantic',
    color: 'bg-pink-100 text-pink-700'
  },
  {
    id: 'professional',
    name: '전문적인 분위기',
    description: '깔끔하고 신뢰감 있는 느낌',
    file: '/background-music/professional.mp3',
    mood: 'professional',
    color: 'bg-gray-100 text-gray-700'
  },
  {
    id: 'energetic',
    name: '역동적인 분위기',
    description: '힘차고 에너지 넘치는 느낌',
    file: '/background-music/energetic.mp3',
    mood: 'energetic',
    color: 'bg-orange-100 text-orange-700'
  },
  {
    id: 'mysterious',
    name: '신비로운 분위기',
    description: '몽환적이고 흥미로운 느낌',
    file: '/background-music/mysterious.mp3',
    mood: 'mysterious',
    color: 'bg-purple-100 text-purple-700'
  }
];

export function VoiceMusicSelector({
  transcribedText,
  audioBlob,
  onMusicSelected,
  onCancel,
  onConfirm
}: VoiceMusicSelectorProps) {
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [recommendedMusic, setRecommendedMusic] = useState<string[]>([]);
  const [playingMusic, setPlayingMusic] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // AI 분석을 통한 음악 추천
  useEffect(() => {
    const analyzeVoiceContent = async () => {
      try {
        setIsAnalyzing(true);
        
        const response = await fetch('/api/analyze-voice-mood', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: transcribedText }),
        });

        if (response.ok) {
          const { recommendedMoods } = await response.json();
          setRecommendedMusic(recommendedMoods);
        } else {
          // 기본 추천 (첫 번째 옵션)
          setRecommendedMusic(['calm']);
        }
      } catch (error) {
        console.error('음성 분석 실패:', error);
        setRecommendedMusic(['calm']);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (transcribedText) {
      analyzeVoiceContent();
    }
  }, [transcribedText]);

  // 오디오 요소 초기화
  useEffect(() => {
    const elements: { [key: string]: HTMLAudioElement } = {};
    MUSIC_OPTIONS.forEach(option => {
      elements[option.id] = new Audio(option.file);
      elements[option.id].volume = 0.3; // 배경음악은 낮은 볼륨
      elements[option.id].loop = false;
    });
    setAudioElements(elements);

    return () => {
      // 컴포넌트 언마운트 시 모든 오디오 정지
      Object.values(elements).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  const handleMusicPreview = (musicId: string) => {
    // 현재 재생 중인 음악 정지
    if (playingMusic && audioElements[playingMusic]) {
      audioElements[playingMusic].pause();
      audioElements[playingMusic].currentTime = 0;
    }

    if (playingMusic === musicId) {
      setPlayingMusic(null);
    } else {
      // 새로운 음악 재생
      if (audioElements[musicId]) {
        audioElements[musicId].play().catch(console.error);
        setPlayingMusic(musicId);
        
        // 5초 후 자동 정지
        setTimeout(() => {
          if (audioElements[musicId]) {
            audioElements[musicId].pause();
            audioElements[musicId].currentTime = 0;
          }
          setPlayingMusic(null);
        }, 5000);
      }
    }
  };

  const handleMusicSelect = (musicId: string) => {
    setSelectedMusic(musicId);
    onMusicSelected(musicId);
  };

  const handleNoMusic = () => {
    setSelectedMusic(null);
    onMusicSelected(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Music className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">배경음악 선택</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            음성 메시지에 어울리는 배경음악을 선택해주세요
          </p>
          {transcribedText && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              "{transcribedText}"
            </div>
          )}
        </div>

        <div className="p-4">
          {isAnalyzing ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <p className="text-sm text-gray-600 mt-2">음성 내용을 분석중...</p>
            </div>
          ) : (
            <>
              {/* 음악 없음 옵션 */}
              <div 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-3 ${
                  selectedMusic === null 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={handleNoMusic}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">배경음악 없음</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">원본 음성만 전송</p>
                  </div>
                  {selectedMusic === null && (
                    <Check className="h-5 w-5 text-purple-600" />
                  )}
                </div>
              </div>

              {/* 음악 옵션들 */}
              <div className="space-y-2">
                {MUSIC_OPTIONS.map(option => {
                  const isRecommended = recommendedMusic.includes(option.mood);
                  const isSelected = selectedMusic === option.id;
                  const isPlaying = playingMusic === option.id;

                  return (
                    <div 
                      key={option.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${isRecommended ? 'ring-2 ring-purple-200' : ''}`}
                      onClick={() => handleMusicSelect(option.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{option.name}</h4>
                            {isRecommended && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                추천
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMusicPreview(option.id);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          {isSelected && (
                            <Check className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            취소
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isAnalyzing}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}