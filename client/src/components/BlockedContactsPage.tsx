import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { InstantAvatar } from "@/components/InstantAvatar";
import { UserX, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockedContactsPageProps {
  onBack: () => void;
}

export default function BlockedContactsPage({ onBack }: BlockedContactsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch blocked contacts
  const { data: blockedContactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts/blocked"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/contacts/blocked", {
        headers: { "x-user-id": user!.id.toString() },
      });
      if (!response.ok) throw new Error("Failed to fetch blocked contacts");
      return response.json();
    },
  });

  // Unblock contact mutation
  const unblockContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest(`/api/contacts/${contactUserId}/unblock`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
    },
  });

  const blockedContacts = blockedContactsData?.contacts || [];

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">차단된 연락처</h1>
            <Button variant="outline" onClick={onBack}>
              뒤로 가기
            </Button>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">차단된 연락처</h1>
          <Button variant="outline" onClick={onBack}>
            뒤로 가기
          </Button>
        </div>

        {blockedContacts.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <UserX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">차단된 연락처가 없습니다</h3>
            <p className="text-gray-600">차단된 사용자가 있으면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-orange-800">
                  차단된 연락처는 메시지를 보내거나 받을 수 없습니다.
                </p>
              </div>
            </div>

            {blockedContacts.map((contact: any) => (
              <div key={contact.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <InstantAvatar 
                      src={contact.contactUser.profilePicture}
                      name={contact.contactUser.displayName}
                      className="w-12 h-12"
                      fallbackClassName="text-sm"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {contact.nickname || contact.contactUser.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">@{contact.contactUser.username}</p>
                      <p className="text-xs text-gray-400">
                        차단일: {new Date(contact.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unblockContactMutation.mutate(contact.contactUserId)}
                    disabled={unblockContactMutation.isPending}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    차단 해제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}