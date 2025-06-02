import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Building2,
  Send,
  Verified,
  Plus,
  Search,
  TrendingUp
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

  // Fetch business feed posts
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["/api/space/feed"],
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

  const posts = (feedData as any)?.posts || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Building2 className="w-7 h-7 mr-2 text-blue-600" />
                Business Space
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="회사나 사람 검색..."
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Create Post */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback style={{ backgroundColor: getAvatarColor((user?.id || 0).toString()) }}>
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
                  <div className="flex items-center justify-end">
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
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 포스트가 없습니다</h3>
                <p className="text-gray-500 mb-4">첫 번째 비즈니스 포스트를 작성해보세요!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post: any) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.user?.profilePicture || undefined} />
                      <AvatarFallback style={{ backgroundColor: getAvatarColor((post.user?.id || 0).toString()) }}>
                        {getInitials(post.user?.displayName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{post.user?.displayName}</h4>
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

                      <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <Heart className="w-4 h-4 mr-1" />
                          {post.likeCount || 0}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {post.commentCount || 0}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <Share2 className="w-4 h-4 mr-1" />
                          {post.shareCount || 0}
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