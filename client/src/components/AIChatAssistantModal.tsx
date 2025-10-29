import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Mic, Send, Sparkles, Download, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId: number;
}

// Dovie Wings Icon Component with sparkle animation
const DovieWingsIcon = ({ className = "" }: { className?: string }) => {
  return (
    <div className="relative inline-block">
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Left Wing */}
        <path 
          d="M8 12C8 12 6 10 4 10C2 10 1 11 1 12C1 13 2 14 4 14C6 14 8 12 8 12Z" 
          fill="currentColor"
          className="animate-pulse"
        />
        {/* Right Wing */}
        <path 
          d="M16 12C16 12 18 10 20 10C22 10 23 11 23 12C23 13 22 14 20 14C18 14 16 12 16 12Z" 
          fill="currentColor"
          className="animate-pulse"
        />
        {/* Body */}
        <circle 
          cx="12" 
          cy="12" 
          r="3" 
          fill="currentColor"
        />
      </svg>
      {/* Sparkle effect */}
      <div className="absolute -top-1 -right-1 text-yellow-400 animate-ping">
        <Sparkles className="h-3 w-3" />
      </div>
    </div>
  );
};

interface FileSearchResult {
  type: 'file_search';
  files: Array<{
    id: number;
    fileUrl: string;
    fileName: string;
    description?: string;
    uploadedBy: string;
    uploadedAt: string;
    reason?: string;
  }>;
  message: string;
}

export const AIChatAssistantModal = ({ isOpen, onClose, chatRoomId }: AIChatAssistantModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [fileSearchResult, setFileSearchResult] = useState<FileSearchResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Transcribe audio to text
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const userId = localStorage.getItem("userId");
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          ...(userId ? { "x-user-id": userId } : {})
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      if (data.success && data.transcription) {
        setQuestion(data.transcription);
        textareaRef.current?.focus();
      } else {
        throw new Error('No transcription received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  // Submit question to AI
  const handleSubmit = async () => {
    if (!question.trim()) {
      return;
    }

    setIsLoading(true);
    setAnswer("");
    setFileSearchResult(null);
    setSelectedFiles(new Set()); // Clear previous selections

    try {
      const response = await apiRequest(`/api/chat-rooms/${chatRoomId}/ai-assistant`, 'POST', {
        question: question.trim()
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Check if this is a file search response
        if (data.type === 'file_search' && data.data) {
          setFileSearchResult(data.data);
          setAnswer("");
        } else if (data.answer) {
          setAnswer(data.answer);
          setFileSearchResult(null);
        } else {
          throw new Error('No answer received');
        }
      } else {
        throw new Error('No answer received');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: number) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Select all files
  const selectAllFiles = () => {
    if (!fileSearchResult) return;
    setSelectedFiles(new Set(fileSearchResult.files.map(f => f.id)));
  };

  // Deselect all files
  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  // Download selected files
  const downloadSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    
    const filesToDownload = fileSearchResult?.files.filter(f => selectedFiles.has(f.id)) || [];
    
    for (const file of filesToDownload) {
      try {
        const response = await fetch(file.fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error(`Failed to download ${file.fileName}:`, error);
      }
    }
    
    toast({
      title: "다운로드 완료",
      description: `${filesToDownload.length}개 파일 다운로드를 시작했습니다.`,
    });
  };

  // Share selected files using Web Share API
  const shareSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    
    const filesToShare = fileSearchResult?.files.filter(f => selectedFiles.has(f.id)) || [];
    
    if (filesToShare.length === 0) return;

    // Use Web Share API if available
    if (navigator.share && filesToShare.length === 1) {
      try {
        const file = filesToShare[0];
        const response = await fetch(file.fileUrl);
        const blob = await response.blob();
        const shareFile = new File([blob], file.fileName, { type: blob.type });
        
        await navigator.share({
          title: file.fileName,
          text: file.description || '',
          files: [shareFile]
        });
        
        toast({
          title: "공유 완료",
          description: "파일을 공유했습니다.",
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          fallbackShare(filesToShare);
        }
      }
    } else {
      // Fallback: copy file URLs to clipboard
      fallbackShare(filesToShare);
    }
  };

  // Fallback share method: copy file URLs
  const fallbackShare = (files: Array<{
    id: number;
    fileUrl: string;
    fileName: string;
    description?: string;
    uploadedBy: string;
    uploadedAt: string;
    reason?: string;
  }>) => {
    const fileUrls = files.map(f => `${window.location.origin}${f.fileUrl}`).join('\n');
    navigator.clipboard.writeText(fileUrls).then(() => {
      toast({
        title: "링크 복사 완료",
        description: `${files.length}개 파일 링크가 클립보드에 복사되었습니다.`,
      });
    }).catch(() => {
      toast({
        title: "공유 실패",
        description: "파일 공유에 실패했습니다.",
        variant: "destructive"
      });
    });
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion("");
      setAnswer("");
      setFileSearchResult(null);
      setSelectedFiles(new Set());
      setIsLoading(false);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <DovieWingsIcon className="text-white" />
            <DialogTitle className="text-white text-lg font-semibold">
              Dovie AI 어시스턴트
            </DialogTitle>
          </div>
          <p className="text-sm text-white/90 mt-1">
            이 채팅방의 대화 내용을 학습한 AI에게 무엇이든 물어보세요
          </p>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Question Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">질문</label>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 수진이 생일이 언제야? 내일 뭐한다고 했지?"
                className="min-h-[80px] pr-12 resize-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading || isRecording}
                data-testid="input-ai-question"
              />
            </div>
          </div>

          {/* Unified Send Button - Text + Voice */}
          <div className="flex items-center justify-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                녹음 중
              </div>
            )}
            
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                if (isLoading) return;
                
                // 텍스트가 있으면 즉시 전송
                if (question.trim()) {
                  handleSubmit();
                } else {
                  // 텍스트가 없으면 녹음 시작
                  if (!isRecording) {
                    startRecording();
                  }
                }
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                if (isRecording) {
                  stopRecording();
                }
              }}
              onMouseLeave={(e) => {
                if (isRecording) {
                  stopRecording();
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (isLoading) return;
                
                if (question.trim()) {
                  handleSubmit();
                } else {
                  if (!isRecording) {
                    startRecording();
                  }
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (isRecording) {
                  stopRecording();
                }
              }}
              disabled={isLoading}
              className={`h-14 w-14 p-3 rounded-xl transition-all duration-200 select-none cursor-pointer flex items-center justify-center shadow-lg ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : question.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={
                isRecording 
                  ? '녹음 중지' 
                  : question.trim() 
                    ? '질문 전송' 
                    : '누르면 음성 입력'
              }
              data-testid="button-unified-send"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : isRecording ? (
                <Mic className="h-5 w-5 animate-pulse" />
              ) : question.trim() ? (
                <Send className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Answer Display */}
          {answer && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI 답변
              </label>
              <div 
                className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
                data-testid="text-ai-answer"
              >
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {answer}
                </p>
              </div>
            </div>
          )}

          {/* File Search Results */}
          {fileSearchResult && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  {fileSearchResult.message}
                </label>
                <span className="text-xs text-gray-500">{fileSearchResult.files.length}개 파일</span>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedFiles.size === 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllFiles}
                    className="text-xs"
                    data-testid="button-select-all"
                  >
                    전체 선택
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllFiles}
                      className="text-xs"
                      data-testid="button-deselect-all"
                    >
                      선택 해제
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={downloadSelectedFiles}
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                      data-testid="button-download-selected"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      다운로드 ({selectedFiles.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={shareSelectedFiles}
                      className="text-xs bg-purple-600 hover:bg-purple-700"
                      data-testid="button-share-selected"
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      공유 ({selectedFiles.size})
                    </Button>
                  </>
                )}
              </div>
              
              {/* Scrollable file grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {fileSearchResult.files.map((file) => (
                  <div
                    key={file.id}
                    className={`relative group bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-md ${
                      selectedFiles.has(file.id) 
                        ? 'border-purple-500 ring-2 ring-purple-300' 
                        : 'border-purple-200 hover:border-purple-400'
                    }`}
                    data-testid={`file-card-${file.id}`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-5 w-5 rounded border-2 border-white shadow-lg cursor-pointer accent-purple-600"
                        data-testid={`checkbox-file-${file.id}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* File Thumbnail or Icon */}
                    <div 
                      className="aspect-square bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center relative overflow-hidden"
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      {file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={file.fileUrl} 
                          alt={file.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-purple-500 text-4xl">📎</div>
                      )}
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.fileUrl, '_blank');
                          }}
                          className="p-2 bg-white rounded-full hover:bg-gray-100"
                          title="미리보기"
                          data-testid={`button-preview-${file.id}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-white rounded-full hover:bg-gray-100"
                          title="다운로드"
                          data-testid={`button-download-${file.id}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-2 space-y-1" onClick={() => toggleFileSelection(file.id)}>
                      <p className="text-xs font-medium text-gray-900 truncate" title={file.fileName}>
                        {file.fileName}
                      </p>
                      {file.description && (
                        <p className="text-xs text-gray-600 line-clamp-2" title={file.description}>
                          {file.description}
                        </p>
                      )}
                      {file.reason && (
                        <p className="text-xs text-purple-600 line-clamp-2 font-medium" title={file.reason}>
                          💡 {file.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{file.uploadedBy}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">💡</span>
              </div>
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">AI가 도와드릴 수 있는 것들:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>대화 내용에서 특정 정보 찾기</li>
                  <li>약속 날짜나 시간 확인</li>
                  <li>파일 및 사진 검색 (예: "소은이 사진 찾아줘")</li>
                  <li>누가 무슨 말을 했는지 기억하기</li>
                  <li>대화 내용 요약하기</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
