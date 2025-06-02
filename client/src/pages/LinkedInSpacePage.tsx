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
        <Card className="mb-6 overflow-hidden">
          {/* 배경 커버 */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative">
            <div className="absolute bottom-4 right-4">
              <Button variant="secondary" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                커버 편집
              </Button>
            </div>
          </div>
          
          {/* 프로필 정보 */}
          <CardContent className="relative px-6 pb-6">
            <div className="flex items-end justify-between -mt-16">
              <div className="flex items-end space-x-4">
                <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                    {user?.displayName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{user?.displayName}</h1>
                  <p className="text-lg text-gray-600">비즈니스 전문가</p>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    대한민국
                  </p>
                </div>
              </div>
              <Button variant="outline">
                <Edit3 className="w-4 h-4 mr-2" />
                프로필 편집
              </Button>
            </div>
            
            {/* 프로필 통계 */}
            <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">247</div>
                <div className="text-sm text-gray-500">연결</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1,234</div>
                <div className="text-sm text-gray-500">팔로워</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
                <div className="text-sm text-gray-500">게시물</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 활동 탭 */}
        <div className="mb-6">
          <div className="flex space-x-8 border-b">
            <button className="py-3 px-1 border-b-2 border-blue-600 text-blue-600 font-medium">
              게시물
            </button>
            <button className="py-3 px-1 text-gray-500 hover:text-gray-700">
              정보
            </button>
            <button className="py-3 px-1 text-gray-500 hover:text-gray-700">
              활동
            </button>
          </div>
        </div>

        {/* 포스트 작성 영역 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <Avatar>
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="업계 동료들과 인사이트를 공유해보세요..."
                  className="w-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  rows={4}
                />
                {selectedImage && (
                  <div className="mt-3">
                    <img 
                      src={URL.createObjectURL(selectedImage)} 
                      alt="Selected" 
                      className="max-w-full h-auto rounded-lg"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedImage(null)}
                      className="mt-2"
                    >
                      이미지 제거
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      사진
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                      <FileText className="w-5 h-5 mr-2" />
                      문서
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                      <Calendar className="w-5 h-5 mr-2" />
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {createPostMutation.isPending ? '게시 중...' : '게시'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 게시물 피드 */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <FileText className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 게시물이 없습니다</h3>
                <p className="text-gray-500">첫 번째 게시물을 작성해서 네트워크와 인사이트를 공유해보세요.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post: BusinessPost) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarImage src={post.user?.profilePicture} />
                      <AvatarFallback>{post.user?.displayName?.[0] || user?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {post.user?.displayName || user?.displayName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            비즈니스 전문가 · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <div className="flex space-x-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                            onClick={() => toggleLikeMutation.mutate(post.id)}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>좋아요 {post.likeCount}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
                            <MessageCircle className="w-4 h-4" />
                            <span>댓글 {post.commentCount}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
                            <Share2 className="w-4 h-4" />
                            <span>공유 {post.shareCount}</span>
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