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
  onBack: () => void;
}

export default function LinkedInSpacePage({ onBack }: LinkedInSpacePageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존 user posts API 사용
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['/api/posts/user'],
    enabled: !!user,
  });

  // 포스트 작성 뮤테이션
  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string }) => {
      return apiRequest('/api/posts', 'POST', postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      setPostContent('');
      setSelectedImage(null);
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
    createPostMutation.mutate({ content: postContent });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const posts = Array.isArray(postsData) ? postsData : [];

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* 네비게이션 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Business Space</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 프로필 헤더 섹션 */}
        <Card className="mb-6 overflow-hidden shadow-lg">
          {/* 배경 커버 */}
          <div className="h-40 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            <div className="absolute bottom-4 right-4 z-10">
              <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-gray-700">
                <Camera className="w-4 h-4 mr-2" />
                커버 편집
              </Button>
            </div>
          </div>
          
          {/* 프로필 정보 */}
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-20">
              <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl mb-4 sm:mb-0">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className="text-3xl bg-blue-100 text-blue-600 font-bold">
                    {user?.displayName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-0 sm:pb-4 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{user?.displayName}</h1>
                  <p className="text-lg text-gray-600 mb-1">비즈니스 전문가</p>
                  <p className="text-sm text-gray-500 flex items-center justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 mr-1" />
                    대한민국
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
                <Button variant="outline" className="bg-white hover:bg-gray-50">
                  <Edit3 className="w-4 h-4 mr-2" />
                  프로필 편집
                </Button>
              </div>
            </div>
            
            {/* 프로필 통계 */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">247</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">연결</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">1,234</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">팔로워</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{posts.length}</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">게시물</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 활동 탭 */}
        <div className="mb-6">
          <div className="flex space-x-8 border-b border-gray-200">
            <button className="py-4 px-2 border-b-2 border-blue-600 text-blue-600 font-semibold text-sm">
              게시물
            </button>
            <button className="py-4 px-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">
              정보
            </button>
            <button className="py-4 px-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">
              활동
            </button>
          </div>
        </div>

        {/* 포스트 작성 영역 */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {user?.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="업계 동료들과 인사이트를 공유해보세요..."
                  className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white min-h-[120px] text-sm"
                  rows={4}
                />
                {selectedImage && (
                  <div className="mt-3 relative">
                    <img 
                      src={URL.createObjectURL(selectedImage)} 
                      alt="Selected" 
                      className="max-w-full h-auto rounded-xl border border-gray-200"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-sm"
                    >
                      ✕
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg px-3 py-2"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      사진
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg px-3 py-2">
                      <FileText className="w-4 h-4 mr-2" />
                      문서
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      이벤트
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                  <Button 
                    onClick={handleCreatePost}
                    disabled={!postContent.trim() || createPostMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {createPostMutation.isPending ? '게시 중...' : '게시'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 게시물 피드 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-16 text-center">
                <div className="text-gray-300 mb-6">
                  <FileText className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-3">아직 게시물이 없습니다</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  첫 번째 게시물을 작성해서 네트워크와 인사이트를 공유해보세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post: BusinessPost) => (
              <Card key={post.id} className="hover:shadow-lg transition-all duration-200 shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={post.user?.profilePicture || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {post.user?.displayName?.[0] || user?.displayName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {post.user?.displayName || user?.displayName}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            비즈니스 전문가 · {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                          {post.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex space-x-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg text-xs"
                            onClick={() => toggleLikeMutation.mutate(post.id)}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>좋아요 {post.likeCount}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg text-xs">
                            <MessageCircle className="w-4 h-4" />
                            <span>댓글 {post.commentCount}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg text-xs">
                            <Share2 className="w-4 h-4" />
                            <span>공유</span>
                          </Button>
                        </div>
                      </div>
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