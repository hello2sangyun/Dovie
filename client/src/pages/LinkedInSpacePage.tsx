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
  Plus, 
  ArrowLeft,
  Building2,
  Users,
  Verified,
  Camera,
  FileText,
  Link as LinkIcon,
  Briefcase,
  MapPin,
  Calendar
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface BusinessPost {
  id: number;
  userId: number;
  companyChannelId?: number;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  postType: 'personal' | 'company';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
  companyChannel?: {
    id: number;
    name: string;
    logoUrl?: string;
    isVerified: boolean;
  };
}

interface CompanyChannel {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  isVerified: boolean;
  followersCount: number;
  isFollowing?: boolean;
}

interface LinkedInSpacePageProps {
  onBack: () => void;
}

export default function LinkedInSpacePage({ onBack }: LinkedInSpacePageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 비즈니스 피드 쿼리 (기존 userPosts 사용)
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['/api/space/feed'],
    queryFn: async () => {
      const response = await fetch('/api/space/feed', {
        headers: { 'x-user-id': user?.id?.toString() || '' },
      });
      return response.json();
    },
    enabled: !!user,
  });

  // 추천 회사 채널 쿼리 (임시로 빈 배열 반환)
  const { data: companiesData } = useQuery({
    queryKey: ['/api/space/companies/suggested'],
    queryFn: async () => {
      return { companies: [] };
    },
    enabled: !!user,
  });

  // 포스트 작성 뮤테이션
  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string }) => {
      const response = await fetch('/api/space/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify(postData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/space/feed'] });
      setShowPostModal(false);
      setPostContent('');
      setSelectedImage(null);
    },
  });

  // 좋아요 토글 뮤테이션
  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/space/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/space/feed'] });
    },
  });

  // 무한 스크롤 감지
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop 
        >= document.documentElement.offsetHeight - 1000) {
      if (hasNextPage && !isFetchingNextPage) {
        setPage(prev => prev + 1);
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleCreatePost = () => {
    if (!postContent.trim() && !selectedImage) return;

    const formData = new FormData();
    formData.append('content', postContent);
    formData.append('postType', 'personal');
    
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    createPostMutation.mutate(formData);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const posts = postsData?.posts || [];
  const companies = companiesData?.companies || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Space</h1>
              </div>
            </div>
            <Button onClick={() => setShowPostModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              포스트 작성
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽 사이드바 - 프로필 요약 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={user?.profilePicture} />
                    <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{user?.displayName}</h3>
                  <p className="text-gray-600 text-sm">@{user?.username}</p>
                  <p className="text-gray-500 text-sm mt-2">비즈니스 프로필을 완성하여 더 많은 기회를 찾아보세요</p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span>직책 추가</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>회사 추가</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>위치 추가</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 추천 회사 채널 */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">팔로우할 회사</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {companies.map((company: CompanyChannel) => (
                  <div key={company.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={company.logoUrl} />
                        <AvatarFallback>{company.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-sm">{company.name}</span>
                          {company.isVerified && (
                            <Verified className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{company.followersCount} 팔로워</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      팔로우
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 메인 피드 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 포스트 작성 영역 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user?.profilePicture} />
                    <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start text-gray-500"
                    onClick={() => setShowPostModal(true)}
                  >
                    무슨 일이 일어나고 있나요?
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      사진
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      문서
                    </Button>
                    <Button variant="ghost" size="sm">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      링크
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 피드 포스트들 */}
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
            ) : (
              posts.map((post: BusinessPost) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    {/* 포스트 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={post.user.profilePicture} />
                          <AvatarFallback>{post.user.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{post.user.displayName}</span>
                            {post.companyChannel && (
                              <>
                                <span className="text-gray-500">•</span>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm text-blue-600 font-medium cursor-pointer hover:underline">
                                    {post.companyChannel.name}
                                  </span>
                                  {post.companyChannel.isVerified && (
                                    <Verified className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 포스트 콘텐츠 */}
                    <div className="mb-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                      {post.imageUrl && (
                        <img 
                          src={post.imageUrl} 
                          alt="Post image" 
                          className="mt-3 rounded-lg max-w-full h-auto"
                        />
                      )}
                      {post.linkUrl && (
                        <div className="mt-3 border border-gray-200 rounded-lg p-3">
                          <h4 className="font-medium text-sm">{post.linkTitle}</h4>
                          <p className="text-xs text-gray-500 mt-1">{post.linkDescription}</p>
                          <p className="text-xs text-blue-600 mt-1">{post.linkUrl}</p>
                        </div>
                      )}
                    </div>

                    {/* 포스트 액션 */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex space-x-6">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleLikeMutation.mutate(post.id)}
                          className={cn(
                            "flex items-center space-x-2",
                            post.isLiked && "text-red-500"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", post.isLiked && "fill-current")} />
                          <span>{post.likesCount}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                          <Share2 className="w-4 h-4" />
                          <span>{post.sharesCount}</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* 무한 스크롤 로딩 */}
            {isFetchingNextPage && (
              <Card>
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
            )}
          </div>
        </div>
      </div>

      {/* 포스트 작성 모달 */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">포스트 작성</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPostModal(false)}>
                ×
              </Button>
            </div>
            
            <div className="flex items-start space-x-3 mb-4">
              <Avatar>
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="무슨 일이 일어나고 있나요?"
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
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
                disabled={(!postContent.trim() && !selectedImage) || createPostMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createPostMutation.isPending ? '게시 중...' : '게시'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}