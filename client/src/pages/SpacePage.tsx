import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Building2,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Image as ImageIcon,
  Send,
  Verified,
  Plus,
  Search,
  TrendingUp,
  Award
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getInitials, getAvatarColor } from "@/lib/utils";

interface Post {
  id: number;
  userId: number;
  companyChannelId?: number;
  title?: string;
  content: string;
  postType: string;
  attachments?: string[];
  visibility: string;
  tags?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    profilePicture?: string;
  };
  companyChannel?: {
    id: number;
    companyName: string;
    logo?: string;
    isVerified: boolean;
  };
  isLiked?: boolean;
}

interface CompanyChannel {
  id: number;
  companyName: string;
  description?: string;
  logo?: string;
  banner?: string;
  industry?: string;
  employeeCount?: string;
  location?: string;
  isVerified: boolean;
  isApproved: boolean;
  followerCount: number;
  postCount: number;
}

export default function SpacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "companies" | "trending">("feed");

  // Fetch business feed posts
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["/api/space/feed"],
    enabled: !!user,
  });

  // Fetch suggested companies
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/space/companies"],
    enabled: !!user,
  });

  // Fetch user's business profile
  const { data: profileData } = useQuery({
    queryKey: ["/api/business-profiles", user?.id],
    enabled: !!user,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await apiRequest("/api/space/posts", "POST", postData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/space/feed"] });
      setNewPostContent("");
      setNewPostTitle("");
      setIsCreatingPost(false);
      toast({
        title: "포스트 작성 완료",
        description: "새로운 포스트가 성공적으로 발행되었습니다.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "포스트 작성 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: "like" | "unlike" }) => {
      const response = await apiRequest(`/api/space/posts/${postId}/like`, action === "like" ? "POST" : "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/space/feed"] });
    },
  });

  // Follow company mutation
  const followCompanyMutation = useMutation({
    mutationFn: async ({ companyId, action }: { companyId: number; action: "follow" | "unfollow" }) => {
      const response = await apiRequest(`/api/space/companies/${companyId}/follow`, action === "follow" ? "POST" : "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/space/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/space/feed"] });
    },
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast({
        variant: "destructive",
        title: "내용을 입력해주세요",
        description: "포스트 내용은 필수입니다.",
      });
      return;
    }

    createPostMutation.mutate({
      title: newPostTitle.trim() || undefined,
      content: newPostContent.trim(),
      postType: "text",
      visibility: "public",
    });
  };

  const handleLikePost = (postId: number, isLiked: boolean) => {
    likePostMutation.mutate({
      postId,
      action: isLiked ? "unlike" : "like",
    });
  };

  const handleFollowCompany = (companyId: number, isFollowing: boolean) => {
    followCompanyMutation.mutate({
      companyId,
      action: isFollowing ? "unfollow" : "follow",
    });
  };

  const posts = (feedData as any)?.posts || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollIndicator />
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Building2 className="w-7 h-7 mr-2 text-blue-600" />
                Space
              </h1>
              <div className="hidden md:flex space-x-1">
                <Button
                  variant={activeTab === "feed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("feed")}
                >
                  피드
                </Button>
                <Button
                  variant={activeTab === "companies" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("companies")}
                >
                  회사
                </Button>
                <Button
                  variant={activeTab === "trending" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("trending")}
                >
                  트렌딩
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="회사나 사람 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                회사 만들기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - User Profile Summary */}
          <div className="lg:col-span-1">
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={user?.profilePicture || undefined} />
                    <AvatarFallback style={{ backgroundColor: getAvatarColor((user?.id || 0).toString()) }}>
                      {getInitials(user?.displayName || user?.username || "")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-gray-900">{user?.displayName}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {(profileData as any)?.jobTitle || "직책 미설정"} 
                    {(profileData as any)?.companyName && ` at ${(profileData as any).companyName}`}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    <div>
                      <div className="font-semibold text-blue-600">120</div>
                      <div className="text-gray-500">연결</div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-600">45</div>
                      <div className="text-gray-500">포스트</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  트렌딩 토픽
                </h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {["#인공지능", "#스타트업", "#개발자", "#디자인", "#마케팅"].map((tag, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <span className="text-blue-600 font-medium">{tag}</span>
                    <span className="text-xs text-gray-500">+12%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === "feed" && (
              <>
                {/* Create Post */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.profilePicture} />
                        <AvatarFallback style={{ backgroundColor: getAvatarColor(user?.id || 0) }}>
                          {getInitials(user?.displayName || user?.username || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="space-y-3">
                          <Input
                            placeholder="제목 (선택사항)"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            className="border-0 shadow-none p-0 text-lg font-medium"
                          />
                          <Textarea
                            placeholder="무슨 일이 일어나고 있나요?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="min-h-[100px] border-0 shadow-none resize-none p-0"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <ImageIcon className="w-4 h-4 mr-1" />
                                이미지
                              </Button>
                              <Button variant="ghost" size="sm">
                                <LinkIcon className="w-4 h-4 mr-1" />
                                링크
                              </Button>
                            </div>
                            <Button
                              onClick={handleCreatePost}
                              disabled={!newPostContent.trim() || createPostMutation.isPending}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              발행
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Posts Feed */}
                <div className="space-y-4">
                  {feedLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="flex space-x-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-20 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    posts.map((post: Post) => (
                      <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={post.user.profilePicture} />
                              <AvatarFallback style={{ backgroundColor: getAvatarColor(post.user.id) }}>
                                {getInitials(post.user.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{post.user.displayName}</h4>
                                {post.companyChannel && (
                                  <>
                                    <span className="text-gray-500">at</span>
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-blue-600 cursor-pointer hover:underline">
                                        {post.companyChannel.companyName}
                                      </span>
                                      {post.companyChannel.isVerified && (
                                        <Verified className="w-4 h-4 text-blue-600" />
                                      )}
                                    </div>
                                  </>
                                )}
                                <span className="text-sm text-gray-500">·</span>
                                <span className="text-sm text-gray-500">
                                  {formatDistanceToNow(new Date(post.createdAt), { locale: ko, addSuffix: true })}
                                </span>
                              </div>
                              
                              {post.title && (
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                              )}
                              
                              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                              
                              {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {post.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLikePost(post.id, post.isLiked || false)}
                                    className={post.isLiked ? "text-red-600" : "text-gray-500"}
                                  >
                                    <Heart className={`w-4 h-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                                    {post.likeCount}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-gray-500">
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {post.commentCount}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-gray-500">
                                    <Share2 className="w-4 h-4 mr-1" />
                                    {post.shareCount}
                                  </Button>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Load more indicator */}
                {feedLoading && posts.length === 0 && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                )}
              </>
            )}

            {activeTab === "companies" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">추천 회사</h2>
                {companiesLoading ? (
                  <div>로딩 중...</div>
                ) : (
                  <div className="grid gap-4">
                    {/* Company cards will be rendered here */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-gray-900">추천 팔로우</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Suggested connections will be rendered here */}
                <div className="text-center text-gray-500 text-sm py-4">
                  추천할 연결이 없습니다
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  인기 회사
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Popular companies will be rendered here */}
                <div className="text-center text-gray-500 text-sm py-4">
                  인기 회사 정보를 불러오는 중...
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}