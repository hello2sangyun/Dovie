import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building, MapPin, Globe, User } from "lucide-react";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { getInitials } from "@/lib/utils";

export default function BusinessCardDetail() {
  const { contactId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch the specific contact/business card details
  const { data: contact, isLoading } = useQuery({
    queryKey: [`/api/contacts/${contactId}`],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch contact");
      return response.json();
    },
    enabled: !!contactId && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">명함 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">명함을 찾을 수 없습니다.</p>
          <Button onClick={() => setLocation("/app")}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const displayName = contact.nickname || contact.name || "이름 없음";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/app")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              연락처로 돌아가기
            </Button>
          </div>
        </div>
      </div>

      {/* Business Card Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-white shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white pb-6">
            <div className="flex items-center space-x-4">
              <OptimizedAvatar
                src={null}
                fallback={getInitials(displayName)}
                className="w-20 h-20 bg-white/20 text-white text-2xl font-bold ring-4 ring-white/30"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {contact.jobTitle && (
                  <p className="text-blue-100 text-lg">{contact.jobTitle}</p>
                )}
                {contact.company && (
                  <p className="text-blue-200 text-sm">{contact.company}</p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                연락처 정보
              </h3>
              
              {contact.email && (
                <div className="flex items-center space-x-3 text-gray-700">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>{contact.email}</span>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center space-x-3 text-gray-700">
                  <Phone className="w-5 h-5 text-green-600" />
                  <span>{contact.phone}</span>
                </div>
              )}
              
              {contact.website && (
                <div className="flex items-center space-x-3 text-gray-700">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <a 
                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {contact.website}
                  </a>
                </div>
              )}
            </div>

            {/* Company Information */}
            {(contact.company || contact.address) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  회사 정보
                </h3>
                
                {contact.company && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <Building className="w-5 h-5 text-orange-600" />
                    <span>{contact.company}</span>
                  </div>
                )}
                
                {contact.address && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <span>{contact.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Information */}
            {contact.notes && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  추가 정보
                </h3>
                <p className="text-gray-700 leading-relaxed">{contact.notes}</p>
              </div>
            )}

            {/* One Pager Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">One Pager 명함</h4>
                  <p className="text-sm text-gray-600">AI로 스캔된 디지털 명함입니다</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation("/app")}
              >
                연락처로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}