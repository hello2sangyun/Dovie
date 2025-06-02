import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Building2,
  Send,
  Verified,
  Plus,
  Search,
  Image,
  Video,
  X,
  Globe,
  Users,
  Lock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getInitials, getAvatarColor } from "@/lib/utils";

export default function SimpleSpacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "my-space">("feed");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch friends' posts feed
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["/api/space/feed"],
    enabled: !!user && activeTab === "feed",
  });

  // Fetch user's own posts
  const { data: myPostsData, isLoading: myPostsLoading } = useQuery({
    queryKey: ["/api/space/my-posts"],
    enabled: !!user && activeTab === "my-space",
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const formData = new FormData();
      formData.append('title', postData.title || '');
      formData.append('content', postData.content);
      formData.append('postType', postData.postType);
      formData.append('visibility', postData.visibility);
      
      // Add files if any
      selectedFiles.forEach((file) => {
        formData.append(`files`, file);
      });

      const response = await fetch("/api/space/posts", {
        method: "POST",
        headers: {
          'x-user-id': user?.id?.toString() || '0',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/space/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/space/my-posts"] });
      setNewPostContent("");
      setNewPostTitle("");
      setSelectedFiles([]);
      setVisibility("public");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return (isImage || isVideo) && file.size <= 50 * 1024 * 1024; // 50MB limit
    });
    
    if (validFiles.length !== files.length) {
      toast({
        variant: "destructive",
        title: "파일 선택 오류",
        description: "이미지, 동영상 파일만 업로드 가능하며 파일 크기는 50MB 이하여야 합니다.",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast({
        variant: "destructive",
        title: "내용을 입력해주세요",
        description: "포스트 내용은 필수입니다.",
      });
      return;
    }

    const postType = selectedFiles.length > 0 ? "media" : "text";
    
    createPostMutation.mutate({
      title: newPostTitle.trim() || undefined,
      content: newPostContent.trim(),
      postType,
      visibility,
    });
  };

  // Space notifications for new posts badge
  const { data: spaceNotifications } = useQuery({
    queryKey: ["/api/space/notifications"],
    enabled: !!user,
  });

  const unreadSpaceCount = (spaceNotifications as any)?.unreadCount || 0;

  const currentPosts = activeTab === "feed" ? (feedData as any)?.posts || [] : (myPostsData as any)?.posts || [];
  const isLoading = activeTab === "feed" ? feedLoading : myPostsLoading;

  // Filter posts by search query
  const filteredPosts = currentPosts.filter((post: any) => {
    if (!searchQuery.trim()) return true;
    const searchTerm = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(searchTerm) ||
      post.content?.toLowerCase().includes(searchTerm) ||
      post.user?.displayName?.toLowerCase().includes(searchTerm) ||
      post.companyChannel?.companyName?.toLowerCase().includes(searchTerm)
    );
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-3 h-3" />;
      case "friends":
        return <Users className="w-3 h-3" />;
      case "private":
        return <Lock className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "모두에게 공개";
      case "friends":
        return "친구들에게만";
      case "private":
        return "나만 보기";
      default:
        return "모두에게 공개";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              SPACE
            </h1>
            <div className="flex items-center space-x-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-40 h-8 text-sm"
                />
              </div>
              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 hidden sm:flex">
                <Plus className="w-3 h-3 mr-1" />
                회사
              </Button>
              <Button size="sm" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 sm:hidden">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-2">
            <Button
              variant={activeTab === "feed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("feed")}
              className="h-8 text-xs"
            >
              Space Home
            </Button>
            <Button
              variant={activeTab === "my-space" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("my-space")}
              className="h-8 text-xs relative"
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
      <div className="flex-1">
        <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">


          {/* Create Post - Only show in My Space tab */}
          {activeTab === "my-space" && (
            <Card>
              <CardContent className="p-3">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profilePicture || undefined} />
                    <AvatarFallback style={{ backgroundColor: getAvatarColor((user?.id || 0).toString()) }}>
                      {getInitials(user?.displayName || user?.username || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <Input
                        placeholder="제목 (선택사항)"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        className="border-0 shadow-none p-0 text-sm font-medium h-auto"
                      />
                      <Textarea
                        placeholder="무슨 일이 일어나고 있나요?"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="min-h-[60px] border-0 shadow-none resize-none p-0 text-sm"
                      />
                      
                      {/* File previews */}
                      {selectedFiles.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="relative bg-gray-100 rounded-lg p-2">
                              <button
                                onClick={() => removeFile(index)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="flex items-center space-x-2">
                                {file.type.startsWith('image/') ? (
                                  <Image className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Video className="w-4 h-4 text-purple-600" />
                                )}
                                <span className="text-xs text-gray-600 truncate">{file.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
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
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 px-2 text-gray-500"
                          >
                            <Image className="w-4 h-4" />
                          </Button>
                          
                          {/* Visibility Selector */}
                          <Select value={visibility} onValueChange={(value: "public" | "friends" | "private") => setVisibility(value)}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <div className="flex items-center space-x-1">
                                {getVisibilityIcon(visibility)}
                                <span className="hidden sm:inline">{getVisibilityText(visibility)}</span>
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
                          className="h-8 bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          발행
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Feed */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-3">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {searchQuery ? "검색 결과가 없습니다" : 
                   activeTab === "feed" ? "친구들의 포스트가 없습니다" : "아직 포스트가 없습니다"}
                </h3>
                <p className="text-xs text-gray-500">
                  {searchQuery ? "다른 검색어로 시도해보세요." :
                   activeTab === "feed" ? "친구를 추가하여 피드를 채워보세요!" : "첫 번째 비즈니스 포스트를 작성해보세요!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post: any) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={post.user?.profilePicture || undefined} />
                      <AvatarFallback style={{ backgroundColor: getAvatarColor((post.user?.id || 0).toString()) }}>
                        {getInitials(post.user?.displayName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-1 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-sm">{post.user?.displayName}</h4>
                        {post.companyChannel && (
                          <>
                            <span className="text-gray-400 text-xs">at</span>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium text-blue-600 cursor-pointer hover:underline text-xs">
                                {post.companyChannel.companyName}
                              </span>
                              {post.companyChannel.isVerified && (
                                <Verified className="w-3 h-3 text-blue-600" />
                              )}
                            </div>
                          </>
                        )}
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(post.createdAt), { locale: ko, addSuffix: true })}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <div className="flex items-center space-x-1">
                          {getVisibilityIcon(post.visibility)}
                          <span className="text-xs text-gray-400">{getVisibilityText(post.visibility)}</span>
                        </div>
                      </div>
                      
                      {post.title && (
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">{post.title}</h3>
                      )}
                      
                      <p className="text-gray-700 mb-2 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

                      {/* Show attachments if any */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="mb-2">
                          <div className="grid grid-cols-1 gap-2">
                            {post.attachments.map((attachment: string, index: number) => (
                              <div key={index} className="bg-gray-100 rounded-lg p-2">
                                <div className="flex items-center space-x-2">
                                  <Image className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs text-gray-600 truncate">첨부파일 {index + 1}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" className="text-gray-500 h-7 px-2">
                          <Heart className="w-3 h-3 mr-1" />
                          <span className="text-xs">{post.likeCount || 0}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500 h-7 px-2">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          <span className="text-xs">{post.commentCount || 0}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500 h-7 px-2">
                          <Share2 className="w-3 h-3 mr-1" />
                          <span className="text-xs">{post.shareCount || 0}</span>
                        </Button>
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