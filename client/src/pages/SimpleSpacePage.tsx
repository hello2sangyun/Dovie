import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ScrollIndicator from "@/components/ScrollIndicator";
import {
  Building2,
  Search,
  Plus,
  Image,
  Video,
  X,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Globe,
  Users,
  Lock,
  Verified
} from "lucide-react";

// Utility functions
const getAvatarColor = (id: string) => {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e"
  ];
  const index = parseInt(id) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  if (!name) return "U";
  return name.split(" ").map(part => part[0]).join("").toUpperCase().slice(0, 2);
};

export default function SimpleSpacePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"feed" | "my-space">("my-space");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");

  // Queries
  const { data: spaceFeed = { posts: [] }, isLoading: isFeedLoading } = useQuery({
    queryKey: ["/api/space/feed"],
    enabled: activeTab === "feed"
  });

  const { data: myPosts = { posts: [] }, isLoading: isMyPostsLoading } = useQuery({
    queryKey: ["/api/space/my-posts"],
    enabled: activeTab === "my-space"
  });

  const { data: spaceNotifications = { unreadCount: 0 } } = useQuery({
    queryKey: ["/api/space/notifications"]
  });

  // Company pages search query
  const { data: companyPages = { companies: [] }, isLoading: isCompaniesLoading } = useQuery({
    queryKey: ["/api/space/companies", searchQuery],
    enabled: activeTab === "feed" && !!searchQuery,
    queryFn: async () => {
      const response = await fetch(`/api/space/companies?search=${encodeURIComponent(searchQuery)}`);
      return response.json();
    }
  });

  const unreadSpaceCount = spaceNotifications?.unreadCount || 0;
  const isLoading = activeTab === "feed" ? isFeedLoading : isMyPostsLoading;
  const posts = activeTab === "feed" ? spaceFeed.posts : myPosts.posts;

  // Filter posts based on search
  const filteredPosts = posts.filter((post: any) =>
    !searchQuery || 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.companyChannel?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate search results for Business Space
  const searchResults = {
    companies: searchQuery && activeTab === "feed" ? companyPages.companies || [] : [],
    posts: filteredPosts
  };

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/space/posts", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/space/my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/space/feed"] });
      setNewPostTitle("");
      setNewPostContent("");
      setSelectedFiles([]);
      setVisibility("public");
    }
  });

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Create post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    const formData = new FormData();
    formData.append("content", newPostContent);
    if (newPostTitle.trim()) {
      formData.append("title", newPostTitle);
    }
    formData.append("visibility", visibility);

    selectedFiles.forEach((file) => {
      formData.append("attachments", file);
    });

    createPostMutation.mutate(formData);
  };

  // Visibility helpers
  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case "public": return <Globe className="w-4 h-4" />;
      case "friends": return <Users className="w-4 h-4" />;
      case "private": return <Lock className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityText = (vis: string) => {
    switch (vis) {
      case "public": return "전체 공개";
      case "friends": return "친구만";
      case "private": return "나만 보기";
      default: return "전체 공개";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ScrollIndicator />
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="w-full max-w-full overflow-hidden">
          {/* Title and Search Row */}
          <div className="px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                <span className="hidden sm:inline">SPACE</span>
                <span className="sm:hidden">SPACE</span>
              </h1>
              
              {/* Mobile Search Button and Desktop Search */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-40 lg:w-48 h-8 text-sm"
                  />
                </div>
                <Button size="sm" className="h-8 px-2 sm:px-3 text-sm bg-blue-600 hover:bg-blue-700 hidden sm:flex">
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden lg:inline">회사</span>
                </Button>
                <Button size="sm" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 sm:hidden">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-3 sm:px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={activeTab === "feed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("feed")}
                className="h-9 px-4 sm:px-6 text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                Space Home
              </Button>
              <Button
                variant={activeTab === "my-space" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("my-space")}
                className="h-9 px-4 sm:px-6 text-sm font-medium whitespace-nowrap flex-shrink-0 relative"
              >
                My Space
                {unreadSpaceCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadSpaceCount > 9 ? "9+" : unreadSpaceCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden bg-white border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Create Post - Only show in My Space tab */}
          {activeTab === "my-space" && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-lg sm:rounded-xl p-1 mb-6 sm:mb-8">
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-100 flex-shrink-0">
                      <AvatarImage src={user?.profilePicture || undefined} />
                      <AvatarFallback style={{ backgroundColor: getAvatarColor((user?.id || 0).toString()) }}>
                        {getInitials(user?.displayName || user?.username || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="text-sm text-gray-600 font-medium">새 포스트 작성</div>
                        <Input
                          placeholder="제목을 입력하세요 (선택사항)"
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          className="border-gray-200 focus:border-blue-400 focus:ring-blue-100 text-sm"
                        />
                        <Textarea
                          placeholder="무슨 일이 일어나고 있나요? 여러분의 이야기를 들려주세요..."
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          className="border-gray-200 focus:border-blue-400 focus:ring-blue-100 resize-none text-sm"
                          rows={3}
                        />
                        
                        {/* File Preview */}
                        {selectedFiles.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="relative bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    {file.type.startsWith('image/') ? (
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Image className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Video className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate block">{file.name}</span>
                                      <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFile(index)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                                    >
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8 sm:h-9 px-2 sm:px-3 text-gray-600 border-gray-200 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
                            >
                              <Image className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">미디어</span>
                            </Button>
                            
                            {/* Visibility Selector */}
                            <Select value={visibility} onValueChange={(value: "public" | "friends" | "private") => setVisibility(value)}>
                              <SelectTrigger className="w-24 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm border-gray-200">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  {getVisibilityIcon(visibility)}
                                  <span className="truncate">{getVisibilityText(visibility)}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">
                                  <div className="flex items-center space-x-2">
                                    <Globe className="w-4 h-4" />
                                    <span>모두에게 공개</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="friends">
                                  <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4" />
                                    <span>친구들에게만</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="private">
                                  <div className="flex items-center space-x-2">
                                    <Lock className="w-4 h-4" />
                                    <span>나만 보기</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleCreatePost}
                            disabled={!newPostContent.trim() || createPostMutation.isPending}
                            size="sm"
                            className="h-8 sm:h-9 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap"
                          >
                            {createPostMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span className="hidden sm:inline">발행 중...</span>
                                <span className="sm:hidden">발행중</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">발행</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Posts Section */}
          {activeTab === "my-space" && filteredPosts.length > 0 && (
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 sm:pb-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">내 게시물</h3>
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 sm:px-3 rounded-full">{filteredPosts.length}개의 포스트</span>
            </div>
          )}

          {/* Search Results for Business Space */}
          {activeTab === "feed" && searchQuery && (
            <>
              {/* Company Pages Section */}
              {searchResults.companies.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">회사 페이지</h3>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 sm:px-3 rounded-full">
                      {searchResults.companies.length}개 결과
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {searchResults.companies.map((company: any) => (
                      <Card key={company.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{company.name}</h4>
                              <p className="text-sm text-gray-500 truncate">{company.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400">{company.followerCount || 0} 팔로워</span>
                                {company.isVerified && <Verified className="w-3 h-3 text-blue-600" />}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section Header for Search */}
              {searchResults.posts.length > 0 && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 sm:pb-3 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">관련 게시물</h3>
                  <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 sm:px-3 rounded-full">
                    {searchResults.posts.length}개 결과
                  </span>
                </div>
              )}
            </>
          )}

          {/* Posts Feed */}
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2 sm:space-y-3">
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-16 sm:h-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchResults.posts.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <Building2 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">
                  {searchQuery ? "검색 결과가 없습니다" : 
                   activeTab === "feed" ? "친구들의 포스트가 없습니다" : "아직 포스트가 없습니다"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {searchQuery ? "다른 검색어로 시도해보세요." :
                   activeTab === "feed" ? "친구를 추가하여 피드를 채워보세요!" : "첫 번째 비즈니스 포스트를 작성해보세요!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPosts.map((post: any) => (
                <Card key={post.id} className="hover:shadow-lg transition-all duration-200 border border-gray-100 bg-white">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={post.user?.profilePicture || undefined} />
                        <AvatarFallback style={{ backgroundColor: getAvatarColor((post.user?.id || 0).toString()) }}>
                          {getInitials(post.user?.displayName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{post.user?.displayName}</h4>
                          {post.companyChannel && (
                            <>
                              <span className="text-gray-400 text-xs sm:text-sm">·</span>
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-blue-600 cursor-pointer hover:underline text-xs sm:text-sm">
                                  {post.companyChannel.companyName}
                                </span>
                                {post.companyChannel.isVerified && (
                                  <Verified className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                )}
                              </div>
                            </>
                          )}
                          <span className="text-xs sm:text-sm text-gray-400">·</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {formatDistanceToNow(new Date(post.createdAt), { locale: ko, addSuffix: true })}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">·</span>
                          <div className="flex items-center gap-1 hidden sm:flex">
                            {getVisibilityIcon(post.visibility)}
                            <span className="text-xs sm:text-sm text-gray-500">{getVisibilityText(post.visibility)}</span>
                          </div>
                        </div>
                        
                        {post.title && (
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 leading-tight">{post.title}</h3>
                        )}
                        
                        <p className="text-sm sm:text-base text-gray-800 mb-3 sm:mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        
                        {/* Post attachments */}
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-3 sm:mb-4">
                            {post.attachments.map((attachment: string, index: number) => (
                              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden">
                                {attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img 
                                    src={attachment} 
                                    alt={`Attachment ${index + 1}`}
                                    className="w-full max-h-64 sm:max-h-80 object-cover"
                                  />
                                ) : attachment.match(/\.(mp4|webm|ogg)$/i) ? (
                                  <video 
                                    src={attachment} 
                                    controls 
                                    className="w-full max-h-64 sm:max-h-80"
                                    preload="metadata"
                                  />
                                ) : (
                                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-base sm:text-lg">📄</span>
                                    </div>
                                    <span className="text-sm sm:text-base text-gray-700 font-medium">첨부파일</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 sm:gap-6 pt-2 sm:pt-3 border-t border-gray-100">
                          <button 
                            className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm hover:text-red-500 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}
                          >
                            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span className="font-medium">{post.likeCount || 0}</span>
                          </button>
                          <button className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="font-medium">{post.commentCount || 0}</span>
                          </button>
                          <button className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-green-500 transition-colors">
                            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="font-medium">{post.shareCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}