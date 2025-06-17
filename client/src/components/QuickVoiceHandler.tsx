import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export const useQuickVoiceHandler = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleQuickVoiceComplete = async (audioBlob: Blob, duration: number, recordingContact: any) => {
    if (!recordingContact) {
      console.error('녹음 대상 연락처가 없습니다');
      return;
    }

    try {
      console.log('간편음성메세지 전송 시작:', recordingContact.contactUserId, '지속시간:', duration);

      // 1:1 대화방 찾기 또는 생성
      const chatRoomResponse = await apiRequest('/api/chat-rooms/direct', 'POST', {
        participantId: recordingContact.contactUserId,
      });

      if (!chatRoomResponse.ok) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }
      
      const chatRoomData = await chatRoomResponse.json();
      const chatRoomId = chatRoomData.chatRoom.id;
      
      console.log('채팅방 확인 완료 - ID:', chatRoomId);

      // 간편음성메세지는 텍스트 메시지로 전송
      const messageContent = `[간편음성메세지] ${Math.round(duration)}초 음성 메시지를 보냈습니다.`;
      
      const messageResponse = await apiRequest(`/api/chat-rooms/${chatRoomId}/messages`, 'POST', {
        content: messageContent,
        messageType: 'text'
      });

      if (!messageResponse.ok) {
        throw new Error('메시지 전송에 실패했습니다.');
      }

      console.log('텍스트 메시지 전송 성공');

      // 캐시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/chat-rooms/${chatRoomId}/messages`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] })
      ]);

      // 채팅방으로 자동 이동
      setLocation(`/chat/${chatRoomId}`);
      
      // 성공 토스트
      toast({
        title: "간편음성메세지 전송 완료",
        description: `${recordingContact.contactUser.displayName || recordingContact.contactUser.username}에게 메시지를 보냈습니다.`,
      });

      console.log('간편음성메세지 전송 완료');
      return true;
    } catch (error: any) {
      console.error('간편음성메세지 전송 실패:', error);
      toast({
        variant: "destructive",
        title: "음성 메시지 전송 실패",
        description: error.message || "다시 시도해주세요.",
      });
      return false;
    }
  };

  return { handleQuickVoiceComplete };
};