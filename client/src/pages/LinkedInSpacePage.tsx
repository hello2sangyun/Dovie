import { useState, useRef, useCallback } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  ArrowLeft,
  Camera,
  Video,
  X,
  ImageIcon,
  Settings,
  ThumbsUp
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
  onBack?: () => void;
}

export default function LinkedInSpacePage({ onBack }: LinkedInSpacePageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Use existing posts API for main feed view
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['/api/posts/user'],
    enabled: !!user,
    staleTime: 15000,
  });

  const feedPosts = Array.isArray(postsData) ? postsData : [];

  // 포스트 생성 뮤테이션
  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const userId = localStorage.getItem("userId");
      const headers: Record<string, string> = {};
      if (userId) {
        headers["x-user-id"] = userId;
      }

      // Use FormData for file uploads, otherwise use JSON
      const hasFiles = selectedFiles.length > 0;
      
      if (hasFiles) {
        // Use the regular posts endpoint for file uploads
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers,
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`포스트 작성 실패: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
      } else {
        // Use space posts endpoint for text-only posts
        const content = formData.get('content') as string;
        
        const response = await fetch('/api/space/posts', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`포스트 작성 실패: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
      }
    },
    onSuccess: () => {
      setPostContent('');
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
    },
    onError: (error) => {
      console.error('Post creation error:', error);
    },
  });

  // 좋아요 토글 뮤테이션
  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest(`/api/space/posts/${postId}/like`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
    },
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitPost = useCallback(() => {
    if (!postContent.trim() && selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('content', postContent);
    formData.append('postType', 'business');
    
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    createPostMutation.mutate(formData);
  }, [postContent, selectedFiles, createPostMutation]);

  const isVideo = (file: File) => {
    return file.type.startsWith('video/');
  };

  const isImage = (file: File) => {
    return file.type.startsWith('image/');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">Dovie 네트워크</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 스크롤 가능한 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        
        {/* 포스트 작성 카드 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={user?.profilePicture || undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                {user?.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="무슨 일이 일어나고 있나요?"
                className="min-h-[80px] border-none p-0 resize-none focus:ring-0 text-base placeholder:text-gray-400"
              />
              
              {/* 첨부 파일 미리보기 */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {isImage(file) ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : isVideo(file) ? (
                          <video
                            src={URL.createObjectURL(file)}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-sm text-gray-500">{file.name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-1 right-1 w-6 h-6 p-0 rounded-full"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 text-blue-600 hover:bg-blue-50"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-sm">사진</span>
              </Button>
              
              <input
                ref={videoInputRef}
                type="file"
                multiple
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center space-x-2 text-green-600 hover:bg-green-50"
              >
                <Video className="w-4 h-4" />
                <span className="text-sm">동영상</span>
              </Button>
            </div>
            
            <Button
              onClick={handleSubmitPost}
              disabled={(!postContent.trim() && selectedFiles.length === 0) || createPostMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium"
            >
              {createPostMutation.isPending ? '게시 중...' : '게시'}
            </Button>
          </div>
        </div>

        {/* 포스트 피드 */}
        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="mx-4 bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">아직 게시물이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">첫 번째 게시물을 작성해보세요!</p>
            </div>
          ) : (
            feedPosts.map((post: BusinessPost) => (
              <Card key={post.id} className="mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.user?.profilePicture || undefined} />
                        <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                          {post.user?.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {post.user?.displayName || '사용자'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {post.title && (
                    <h2 className="font-semibold text-gray-900 mb-2">{post.title}</h2>
                  )}
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    {post.content}
                  </p>
                  
                  {/* 첨부 파일 표시 */}
                  {post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0 && (
                    <div className="mb-4">
                      {post.attachments.map((attachment, index) => {
                        console.log('🔍 DEBUG - Rendering attachment:', attachment, 'for post:', post.id, 'type:', typeof attachment);
                        
                        if (typeof attachment === 'string' && attachment.trim()) {
                          const imageUrl = attachment.startsWith('/') ? attachment : `/${attachment}`;
                          console.log('🔍 DEBUG - Final image URL:', imageUrl);
                          
                          return (
                            <div key={`${post.id}-${index}`} className="mb-2">
                              <img
                                src={imageUrl}
                                alt={`첨부파일 ${index + 1}`}
                                className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 shadow-md bg-white"
                                style={{ 
                                  display: 'block',
                                  minHeight: '100px',
                                  backgroundColor: '#ffffff'
                                }}
                                onLoad={(e) => {
                                  console.log('✅ SUCCESS - Image loaded:', imageUrl);
                                  const img = e.target as HTMLImageElement;
                                  console.log('✅ Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                                }}
                                onError={(e) => {
                                  console.error('❌ FAILED - Image load error:', imageUrl);
                                  console.error('❌ Error event:', e);
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = 'none';
                                  
                                  // Create fallback element
                                  const fallback = document.createElement('div');
                                  fallback.className = 'flex items-center justify-center p-8 bg-red-50 rounded-lg border-2 border-red-200';
                                  fallback.innerHTML = `
                                    <div class="text-center">
                                      <div class="text-red-400 text-4xl mb-2">❌</div>
                                      <p class="text-sm text-red-600 font-medium">이미지 로드 실패</p>
                                      <p class="text-xs text-red-500 mt-1">${imageUrl}</p>
                                      <button onclick="location.reload()" class="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">새로고침</button>
                                    </div>
                                  `;
                                  img.parentNode?.insertBefore(fallback, img);
                                }}
                              />
                            </div>
                          );
                        }
                        
                        console.log('⚠️ SKIP - Invalid attachment:', attachment);
                        return null;
                      })}
                    </div>
                  )}
                  
                  <Separator className="mb-3" />
                  
                  {/* 액션 버튼들 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLikeMutation.mutate(post.id)}
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-sm">{post.likeCount}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 text-gray-500 hover:text-green-600 hover:bg-green-50 p-2 rounded-lg"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{post.commentCount}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="text-sm">{post.shareCount}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}