import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Video, UserPlus, Search, MoreHorizontal, MapPin, Briefcase, Globe, Calendar, Heart, MessageCircle, Share, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BusinessPost {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  user?: {
    id: number;
    displayName: string;
    profilePicture?: string;
  };
}

interface BusinessCard {
  id: number;
  userId: number;
  fullName?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  address?: string;
  description?: string;
  cardImageUrl?: string;
}

interface BusinessProfile {
  id: number;
  userId: number;
  jobTitle?: string;
  company?: string;
  bio?: string;
  website?: string;
  location?: string;
  linkedinUrl?: string;
  industry?: string;
  experienceYears?: number;
  skills?: string[];
}

export default function FriendProfilePage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/friend/:userId");
  const userId = params?.userId;

  const [activeTab, setActiveTab] = useState("posts");

  // Fetch friend's business posts
  const { data: businessPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/business-posts", userId],
    enabled: !!userId,
  });

  // Fetch friend's business card
  const { data: businessCard, isLoading: cardLoading } = useQuery({
    queryKey: [`/api/users/${userId}/business-card`],
    enabled: !!userId,
  });

  // Fetch friend's business profile
  const { data: businessProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/users/${userId}/business-profile`],
    enabled: !!userId,
  });

  if (!match || !userId) {
    setLocation("/");
    return null;
  }

  const friendName = businessCard?.fullName || businessProfile?.company || "친구";

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-white"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100"
      >
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")}
            className="text-blue-600 hover:bg-blue-50"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            뒤로
          </Button>
          
          <h1 className="font-semibold text-lg text-gray-900">프로필</h1>
          
          <Button variant="ghost" size="sm" className="text-gray-600">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-6 py-8 bg-white"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Avatar className="w-24 h-24 mx-auto mb-4 shadow-lg">
              <AvatarImage src={businessCard?.cardImageUrl} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                {friendName[0]}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{friendName}</h2>
            <p className="text-gray-600 mb-4">
              {businessCard?.jobTitle && businessCard?.companyName 
                ? `${businessCard.jobTitle} • ${businessCard.companyName}`
                : businessCard?.jobTitle || businessCard?.companyName || "프로필 정보"}
            </p>
          </motion.div>
          
          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex justify-center space-x-4 mb-6"
          >
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>통화</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>영상</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>친구 추가</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>검색</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="px-4"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="posts" className="text-sm">게시물</TabsTrigger>
            <TabsTrigger value="card" className="text-sm">명함</TabsTrigger>
            <TabsTrigger value="profile" className="text-sm">프로필</TabsTrigger>
          </TabsList>

          {/* Business Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {postsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="space-y-2">
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                              <div className="h-2 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : businessPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 게시물이 없어요</h3>
                    <p className="text-gray-500 text-sm">친구의 비즈니스 게시물이 표시됩니다</p>
                  </CardContent>
                </Card>
              ) : (
                businessPosts.map((post: BusinessPost, index: number) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={post.user?.profilePicture} />
                            <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                              {post.user?.displayName?.[0] || friendName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {post.user?.displayName || friendName}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-gray-800 leading-relaxed text-sm">
                                {post.content}
                              </p>
                              
                              {post.imageUrl && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                                  <img 
                                    src={post.imageUrl}
                                    alt="게시물 이미지"
                                    className="w-full h-auto"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex space-x-6">
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors text-xs">
                                  <Heart className="w-4 h-4" />
                                  <span>{post.likesCount}</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-xs">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.commentsCount}</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors text-xs">
                                  <Share className="w-4 h-4" />
                                  <span>{post.sharesCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          </TabsContent>

          {/* Business Card Tab */}
          <TabsContent value="card" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {cardLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : businessCard ? (
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {businessCard.fullName || friendName}
                      </h3>
                      {businessCard.jobTitle && (
                        <p className="text-lg text-gray-600 mb-1">{businessCard.jobTitle}</p>
                      )}
                      {businessCard.companyName && (
                        <p className="text-blue-600 font-semibold">{businessCard.companyName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {businessCard.phoneNumber && (
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Phone className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-800 font-medium">{businessCard.phoneNumber}</span>
                        </div>
                      )}
                      
                      {businessCard.email && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-5 h-5 text-gray-600">@</div>
                          <span className="text-gray-800">{businessCard.email}</span>
                        </div>
                      )}
                      
                      {businessCard.website && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Globe className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-800">{businessCard.website}</span>
                        </div>
                      )}
                      
                      {businessCard.address && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-800">{businessCard.address}</span>
                        </div>
                      )}
                      
                      {businessCard.description && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                          <p className="text-gray-700 leading-relaxed">{businessCard.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">명함 정보가 없어요</h3>
                    <p className="text-gray-500 text-sm">아직 등록된 명함 정보가 없습니다</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Business Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {profileLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : businessProfile ? (
                <Card className="shadow-lg">
                  <CardContent className="p-6 space-y-6">
                    {businessProfile.bio && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">소개</h4>
                        <p className="text-gray-700 leading-relaxed">{businessProfile.bio}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                      {businessProfile.company && (
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">회사</p>
                            <p className="font-medium text-gray-900">{businessProfile.company}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.industry && (
                        <div className="flex items-center space-x-3">
                          <Briefcase className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">업종</p>
                            <p className="font-medium text-gray-900">{businessProfile.industry}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.location && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">위치</p>
                            <p className="font-medium text-gray-900">{businessProfile.location}</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.experienceYears && (
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">경력</p>
                            <p className="font-medium text-gray-900">{businessProfile.experienceYears}년</p>
                          </div>
                        </div>
                      )}
                      
                      {businessProfile.website && (
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-500">웹사이트</p>
                            <p className="font-medium text-blue-600">{businessProfile.website}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {businessProfile.skills && businessProfile.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">기술 및 스킬</h4>
                        <div className="flex flex-wrap gap-2">
                          {businessProfile.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">프로필 정보가 없어요</h3>
                    <p className="text-gray-500 text-sm">아직 등록된 비즈니스 프로필이 없습니다</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}