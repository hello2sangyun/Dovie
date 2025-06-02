import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  ArrowLeft,
  Building2,
  Users,
  Verified,
  Camera,
  FileText,
  Link as LinkIcon,
  Briefcase,
  MapPin,
  Calendar,
  Edit3,
  ThumbsUp,
  Video,
  X,
  ImageIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface BusinessPost {
  id: number;
  userId: number;
  content: string;
  title?: string;
  postType?: string;
  attachments?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
}

interface LinkedInSpacePageProps {
  onBack: () => void;
}

export default function LinkedInSpacePage({ onBack }: LinkedInSpacePageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 기존 user posts API 사용
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['/api/posts/user'],
    enabled: !!user,
  });

  // 포스트 작성 뮤테이션
  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      setPostContent('');
      setSelectedFiles([]);
    },
  });

  // 좋아요 토글 뮤테이션
  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest(`/api/posts/${postId}/like`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
    },
  });

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    
    const formData = new FormData();
    formData.append('content', postContent);
    
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    
    createPostMutation.mutate(formData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isVideo = (file: File) => {
    return file.type.startsWith('video/');
  };

  const isImage = (file: File) => {
    return file.type.startsWith('image/');
  };

  const posts = Array.isArray(postsData) ? postsData : [];

  return (
    <div 
      className="w-full bg-gray-50" 
      style={{ 
        height: '100vh', 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        position: 'relative'
      }}
    >
      {/* 토스 스타일 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="w-8 h-8 p-0 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Button>
              <h1 className="text-lg font-bold text-gray-900">비즈니스 공간</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto pb-40" style={{ paddingTop: '0px' }}>
        {/* 토스 스타일 프로필 카드 */}
        <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* 간단한 헤더 */}
          <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
            <div className="absolute bottom-3 right-4">
              <Button size="sm" className="bg-black/20 hover:bg-black/30 text-white border-0 rounded-full text-xs px-3 py-1.5">
                <Camera className="w-3 h-3 mr-1" />
                편집
              </Button>
            </div>
          </div>
          
          {/* 프로필 정보 */}
          <div className="px-5 pb-6">
            <div className="flex items-start justify-between -mt-8">
              <Avatar className="w-16 h-16 border-3 border-white shadow-lg">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback className="text-lg bg-gray-100 text-gray-700 font-semibold">
                  {user?.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 rounded-full border-gray-200 hover:bg-gray-50 text-xs px-4 py-2"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                편집
              </Button>
            </div>
            
            <div className="mt-3">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{user?.displayName}</h2>
              <p className="text-sm text-gray-600 mb-2">비즈니스 전문가</p>
              <p className="text-xs text-gray-500 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                대한민국
              </p>
            </div>
            
            {/* 통계 */}
            <div className="flex justify-around mt-6 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">247</div>
                <div className="text-xs text-gray-500">연결</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">1,234</div>
                <div className="text-xs text-gray-500">팔로워</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{posts.length}</div>
                <div className="text-xs text-gray-500">게시물</div>
              </div>
            </div>
          </div>
        </div>

        {/* 토스 스타일 탭 */}
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
            <div className="flex">
              <button className="flex-1 py-3 px-4 rounded-xl bg-blue-50 text-blue-600 font-semibold text-sm">
                게시물
              </button>
              <button className="flex-1 py-3 px-4 rounded-xl text-gray-500 font-medium text-sm">
                정보
              </button>
              <button className="flex-1 py-3 px-4 rounded-xl text-gray-500 font-medium text-sm">
                활동
              </button>
            </div>
          </div>
        </div>

        {/* 토스 스타일 포스트 작성 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={user?.profilePicture || undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                {user?.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="무엇을 공유하고 싶나요?"
                className="w-full p-0 border-0 resize-none focus:outline-none bg-transparent text-sm placeholder-gray-400 min-h-[80px]"
                style={{ touchAction: 'manipulation' }}
                rows={3}
              />
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      {isImage(file) && (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="선택된 이미지" 
                          className="w-full h-auto rounded-xl border border-gray-200"
                        />
                      )}
                      {isVideo(file) && (
                        <video 
                          src={URL.createObjectURL(file)}
                          className="w-full h-auto rounded-xl border border-gray-200"
                          controls
                        />
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex space-x-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    사진
                  </button>
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center text-gray-600 hover:text-purple-600 transition-colors text-sm"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    동영상
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <Button 
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() || createPostMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPostMutation.isPending ? '게시 중...' : '게시'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 토스 스타일 게시물 피드 */}
        <div className="mx-4 mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-gray-300 mb-4">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 게시물이 없어요</h3>
              <p className="text-gray-500 text-sm">
                첫 번째 게시물을 작성해보세요
              </p>
            </div>
          ) : (
            posts.map((post: BusinessPost) => (
              <div key={post.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.user?.profilePicture || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                      {post.user?.displayName?.[0] || user?.displayName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {post.user?.displayName || user?.displayName}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 leading-relaxed text-sm">
                        {post.content}
                      </p>
                      
                      {/* 첨부파일 표시 */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {post.attachments.map((attachment, index) => {
                            const isImageFile = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isVideoFile = attachment.match(/\.(mp4|webm|mov|avi)$/i);
                            
                            return (
                              <div key={index} className="rounded-xl overflow-hidden border border-gray-200">
                                {isImageFile && (
                                  <img 
                                    src={attachment}
                                    alt="첨부 이미지"
                                    className="w-full h-auto"
                                  />
                                )}
                                {isVideoFile && (
                                  <video 
                                    src={attachment}
                                    className="w-full h-auto"
                                    controls
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex space-x-6">
                        <button 
                          onClick={() => toggleLikeMutation.mutate(post.id)}
                          className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-xs"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{post.likeCount}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-xs">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentCount}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-xs">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}