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

  const unreadSpaceCount = spaceNotifications?.unreadCount || 0;
  const isLoading = activeTab === "feed" ? isFeedLoading : isMyPostsLoading;
  const posts = activeTab === "feed" ? spaceFeed.posts : myPosts.posts;

  // Filter posts based on search
  const filteredPosts = posts.filter((post: any) =>
    !searchQuery || 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <Building2 className="w-6 h-6 mr-3 text-blue-600" />
              SPACE
            </h1>
            <div className="flex items-center space-x-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48 h-9 text-sm"
                />
              </div>
              <Button size="sm" className="h-9 px-3 text-sm bg-blue-600 hover:bg-blue-700 hidden sm:flex">
                <Plus className="w-4 h-4 mr-2" />
                회사
              </Button>
              <Button size="sm" className="h-9 w-9 bg-blue-600 hover:bg-blue-700 sm:hidden">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-3">
            <Button
              variant={activeTab === "feed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("feed")}
              className="h-10 px-6 text-sm font-medium"
            >
              Space Home
            </Button>
            <Button
              variant={activeTab === "my-space" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("my-space")}
              className="h-10 px-6 text-sm font-medium relative"
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Create Post - Only show in My Space tab */}
          {activeTab === "my-space" && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-1 mb-8">
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12 border-2 border-blue-100">
                      <AvatarImage src={user?.profilePicture || undefined} />
                      <AvatarFallback style={{ backgroundColor: getAvatarColor((user?.id || 0).toString()) }}>
                        {getInitials(user?.displayName || user?.username || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="space-y-4">
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
                          rows={4}
                        />
                        
                        {/* File Preview */}
                        {selectedFiles.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="relative bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-3">
                                    {file.type.startsWith('image/') ? (
                                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Image className="w-4 h-4 text-blue-600" />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Video className="w-4 h-4 text-green-600" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-gray-900 truncate block">{file.name}</span>
                                      <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFile(index)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-3">
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
                              className="h-9 px-3 text-gray-600 border-gray-200 hover:bg-gray-50"
                            >
                              <Image className="w-4 h-4 mr-2" />
                              미디어
                            </Button>
                            
                            {/* Visibility Selector */}
                            <Select value={visibility} onValueChange={(value: "public" | "friends" | "private") => setVisibility(value)}>
                              <SelectTrigger className="w-36 h-9 text-sm border-gray-200">
                                <div className="flex items-center space-x-2">
                                  {getVisibilityIcon(visibility)}
                                  <span>{getVisibilityText(visibility)}</span>
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
                            className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          >
                            {createPostMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                발행 중...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                발행
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
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">내 게시물</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{filteredPosts.length}개의 포스트</span>
            </div>
          )}

          {/* Posts Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "검색 결과가 없습니다" : 
                   activeTab === "feed" ? "친구들의 포스트가 없습니다" : "아직 포스트가 없습니다"}
                </h3>
                <p className="text-sm text-gray-500">
                  {searchQuery ? "다른 검색어로 시도해보세요." :
                   activeTab === "feed" ? "친구를 추가하여 피드를 채워보세요!" : "첫 번째 비즈니스 포스트를 작성해보세요!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post: any) => (
                <Card key={post.id} className="hover:shadow-lg transition-all duration-200 border border-gray-100 bg-white">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <Avatar className="w-10 h-10 border-2 border-gray-100">
                        <AvatarImage src={post.user?.profilePicture || undefined} />
                        <AvatarFallback style={{ backgroundColor: getAvatarColor((post.user?.id || 0).toString()) }}>
                          {getInitials(post.user?.displayName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-base">{post.user?.displayName}</h4>
                          {post.companyChannel && (
                            <>
                              <span className="text-gray-400 text-sm">·</span>
                              <div className="flex items-center space-x-1">
                                <span className="font-medium text-blue-600 cursor-pointer hover:underline text-sm">
                                  {post.companyChannel.companyName}
                                </span>
                                {post.companyChannel.isVerified && (
                                  <Verified className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                            </>
                          )}
                          <span className="text-sm text-gray-400">·</span>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(post.createdAt), { locale: ko, addSuffix: true })}
                          </span>
                          <span className="text-sm text-gray-400">·</span>
                          <div className="flex items-center space-x-1">
                            {getVisibilityIcon(post.visibility)}
                            <span className="text-sm text-gray-500">{getVisibilityText(post.visibility)}</span>
                          </div>
                        </div>
                        
                        {post.title && (
                          <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">{post.title}</h3>
                        )}
                        
                        <p className="text-base text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        
                        {/* Post attachments */}
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="grid grid-cols-1 gap-3 mb-4">
                            {post.attachments.map((attachment: string, index: number) => (
                              <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                {attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img 
                                    src={attachment} 
                                    alt={`Attachment ${index + 1}`}
                                    className="w-full max-h-80 object-cover"
                                  />
                                ) : attachment.match(/\.(mp4|webm|ogg)$/i) ? (
                                  <video 
                                    src={attachment} 
                                    controls 
                                    className="w-full max-h-80"
                                    preload="metadata"
                                  />
                                ) : (
                                  <div className="p-4 flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-lg">📄</span>
                                    </div>
                                    <span className="text-base text-gray-700 font-medium">첨부파일</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
                          <button 
                            className={`flex items-center space-x-2 text-sm hover:text-red-500 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}
                          >
                            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span className="font-medium">{post.likeCount || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="font-medium">{post.commentCount || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-500 transition-colors">
                            <Share2 className="w-5 h-5" />
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