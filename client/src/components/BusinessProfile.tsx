import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Briefcase, 
  Users, 
  Award, 
  Link as LinkIcon, 
  Linkedin, 
  Twitter, 
  Edit3,
  Plus,
  X
} from "lucide-react";

interface BusinessProfileProps {
  userId?: number;
  isOwnProfile?: boolean;
}

export default function BusinessProfile({ userId, isOwnProfile = false }: BusinessProfileProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const targetUserId = userId || user?.id;

  // Fetch business profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/business-profiles", targetUserId],
    enabled: !!targetUserId,
  });

  // Fetch user posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["/api/user-posts", targetUserId],
    enabled: !!targetUserId,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest("/api/business-profiles", "POST", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-profiles"] });
      setIsEditing(false);
    },
    onError: () => {
    },
  });

  const [formData, setFormData] = useState({
    companyName: profile?.companyName || "",
    jobTitle: profile?.jobTitle || "",
    department: profile?.department || "",
    website: profile?.website || "",
    linkedinProfile: profile?.linkedinProfile || "",
    twitterProfile: profile?.twitterProfile || "",
    bio: profile?.bio || "",
    skills: profile?.skills || [],
    isPublic: profile?.isPublic ?? true,
    allowBusinessCardSharing: profile?.allowBusinessCardSharing ?? true,
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Business Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>비즈니스 프로필</span>
            </CardTitle>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                수정
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">회사명</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="(주)도비테크"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">직책</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    placeholder="프론트엔드 개발자"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">부서</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder="개발팀"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">웹사이트</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedinProfile">LinkedIn</Label>
                  <Input
                    id="linkedinProfile"
                    value={formData.linkedinProfile}
                    onChange={(e) => setFormData({...formData, linkedinProfile: e.target.value})}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">소개</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="본인에 대한 간단한 소개를 입력해주세요"
                  rows={4}
                />
              </div>

              <div>
                <Label>스킬</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="새 스킬 추가"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  />
                  <Button variant="outline" onClick={handleAddSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic">프로필 공개</Label>
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowSharing">명함 공유 허용</Label>
                  <Switch
                    id="allowSharing"
                    checked={formData.allowBusinessCardSharing}
                    onCheckedChange={(checked) => setFormData({...formData, allowBusinessCardSharing: checked})}
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                  저장
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile ? (
                <>
                  {/* Company & Job Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{profile.companyName || "회사명 없음"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span>{profile.jobTitle || "직책 없음"}</span>
                      </div>
                      {profile.department && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{profile.department}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {profile.website && (
                        <div className="flex items-center space-x-2">
                          <LinkIcon className="h-4 w-4 text-gray-500" />
                          <a 
                            href={profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            웹사이트
                          </a>
                        </div>
                      )}
                      {profile.linkedinProfile && (
                        <div className="flex items-center space-x-2">
                          <Linkedin className="h-4 w-4 text-gray-500" />
                          <a 
                            href={profile.linkedinProfile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">소개</h4>
                        <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                      </div>
                    </>
                  )}

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">스킬</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>비즈니스 프로필이 없습니다</p>
                  {isOwnProfile && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsEditing(true)}
                    >
                      프로필 만들기
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Posts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>활동 및 게시물</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : posts && posts.posts && posts.posts.length > 0 ? (
            <div className="space-y-4">
              {posts.posts.map((post: any) => (
                <div key={post.id} className="border rounded-lg p-4">
                  {post.title && (
                    <h5 className="font-medium mb-2">{post.title}</h5>
                  )}
                  <p className="text-gray-700 mb-3">{post.content}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-4">
                      <span>좋아요 {post.likeCount}</span>
                      <span>댓글 {post.commentCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>게시물이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}