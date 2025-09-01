//
//  ChatRoomView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import AVFoundation

struct ChatRoomView: View {
    let chatRoom: ChatRoom
    @EnvironmentObject var chatManager: ChatManager
    @State private var messageText = ""
    @State private var showingAttachments = false
    @State private var showingVoiceRecorder = false
    @State private var isRecording = false
    @FocusState private var isTextFieldFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // 메시지 목록
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(chatManager.messages) { message in
                            MessageBubbleView(message: message)
                                .id(message.id)
                        }
                        
                        // 타이핑 인디케이터
                        if !chatManager.typingUsers.isEmpty {
                            TypingIndicatorView(users: Array(chatManager.typingUsers.values))
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
                .onTapGesture {
                    isTextFieldFocused = false
                }
                .onChange(of: chatManager.messages.count) { _ in
                    // 새 메시지가 있을 때 스크롤을 맨 아래로
                    if let lastMessage = chatManager.messages.last {
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            Divider()
            
            // 메시지 입력 영역
            MessageInputView(
                messageText: $messageText,
                showingAttachments: $showingAttachments,
                showingVoiceRecorder: $showingVoiceRecorder,
                isRecording: $isRecording,
                isTextFieldFocused: $isTextFieldFocused,
                onSendMessage: sendMessage,
                onStartRecording: startVoiceRecording,
                onStopRecording: stopVoiceRecording
            )
        }
        .navigationTitle(chatRoom.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    // TODO: 채팅방 설정
                }) {
                    Image(systemName: "line.3.horizontal")
                }
            }
        }
        .onAppear {
            chatManager.joinChatRoom(chatRoom)
        }
        .onDisappear {
            chatManager.leaveChatRoom()
        }
        .onChange(of: messageText) { newValue in
            if !newValue.isEmpty {
                chatManager.startTyping()
            } else {
                chatManager.stopTyping()
            }
        }
        .sheet(isPresented: $showingAttachments) {
            AttachmentPickerView { attachmentType, data in
                handleAttachment(type: attachmentType, data: data)
            }
        }
        .sheet(isPresented: $showingVoiceRecorder) {
            VoiceRecorderView(isRecording: $isRecording) { audioData, duration in
                chatManager.sendVoiceMessage(audioData: audioData, duration: duration)
            }
        }
    }
    
    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        chatManager.sendMessage(content: messageText.trimmingCharacters(in: .whitespacesAndNewlines))
        messageText = ""
        chatManager.stopTyping()
    }
    
    private func handleAttachment(type: AttachmentType, data: Data) {
        switch type {
        case .image:
            chatManager.sendFileMessage(fileData: data, fileName: "image.jpg", fileType: "image/jpeg")
        case .document:
            chatManager.sendFileMessage(fileData: data, fileName: "document.pdf", fileType: "application/pdf")
        }
    }
    
    private func startVoiceRecording() {
        isRecording = true
        // TODO: 음성 녹음 시작
    }
    
    private func stopVoiceRecording() {
        isRecording = false
        // TODO: 음성 녹음 중지 및 전송
    }
}

struct MessageBubbleView: View {
    let message: Message
    @EnvironmentObject var chatManager: ChatManager
    @EnvironmentObject var authManager: AuthenticationManager
    
    private var isFromCurrentUser: Bool {
        message.senderId == authManager.currentUser?.id
    }
    
    var body: some View {
        HStack {
            if isFromCurrentUser {
                Spacer()
            }
            
            VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                // 발신자 이름 (그룹 채팅에서만 표시)
                if !isFromCurrentUser && chatManager.currentChatRoom?.isGroup == true {
                    Text(message.sender?.displayName ?? "Unknown")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 12)
                }
                
                // 메시지 내용
                messageContentView
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(isFromCurrentUser ? 
                                LinearGradient(colors: [.purple, .blue], startPoint: .topLeading, endPoint: .bottomTrailing) :
                                Color(.systemGray5)
                            )
                    )
                    .foregroundColor(isFromCurrentUser ? .white : .primary)
                
                // 메시지 시간
                Text(formatMessageTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
            }
            .frame(maxWidth: UIScreen.main.bounds.width * 0.75, alignment: isFromCurrentUser ? .trailing : .leading)
            
            if !isFromCurrentUser {
                Spacer()
            }
        }
    }
    
    @ViewBuilder
    private var messageContentView: some View {
        switch message.messageType {
        case .text, .system:
            Text(message.content ?? "")
                .font(.body)
        
        case .image:
            if let fileUrl = message.fileUrl {
                AsyncImage(url: URL(string: fileUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .cornerRadius(12)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray4))
                        .frame(height: 200)
                        .overlay(
                            ProgressView()
                        )
                }
                .frame(maxHeight: 300)
            }
        
        case .voice:
            VoiceMessageView(message: message)
        
        case .file:
            FileMessageView(message: message)
        
        case .youtube:
            if let youtubePreview = message.youtubePreview {
                YouTubeMessageView(preview: youtubePreview)
            }
        
        default:
            Text(message.content ?? "지원하지 않는 메시지 타입")
                .font(.body)
                .italic()
        }
    }
    
    private func formatMessageTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

struct VoiceMessageView: View {
    let message: Message
    @State private var isPlaying = false
    @State private var playbackProgress: Double = 0
    
    var body: some View {
        HStack {
            Button(action: {
                if isPlaying {
                    stopPlayback()
                } else {
                    startPlayback()
                }
            }) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.title2)
            }
            
            // 파형 또는 프로그레스 바
            Rectangle()
                .fill(Color(.systemGray4))
                .frame(height: 2)
                .overlay(
                    Rectangle()
                        .fill(Color.white.opacity(0.8))
                        .frame(width: CGFloat(playbackProgress) * 100, height: 2),
                    alignment: .leading
                )
            
            Text(formatDuration(message.voiceDuration ?? 0))
                .font(.caption)
                .monospacedDigit()
        }
        .frame(minWidth: 120)
    }
    
    private func startPlayback() {
        isPlaying = true
        // TODO: 음성 재생 구현
    }
    
    private func stopPlayback() {
        isPlaying = false
        // TODO: 음성 재생 중지 구현
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return String(format: "%d:%02d", minutes, remainingSeconds)
    }
}

struct FileMessageView: View {
    let message: Message
    
    var body: some View {
        HStack {
            Image(systemName: "doc")
                .font(.title2)
                .foregroundColor(.blue)
            
            VStack(alignment: .leading) {
                Text(message.fileName ?? "파일")
                    .font(.headline)
                    .lineLimit(1)
                
                if let fileSize = message.fileSize {
                    Text(formatFileSize(fileSize))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Button("다운로드") {
                // TODO: 파일 다운로드 구현
            }
            .font(.caption)
        }
        .frame(minWidth: 200)
    }
    
    private func formatFileSize(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.unitStyle = .abbreviated
        return formatter.string(fromByteCount: Int64(bytes))
    }
}

struct YouTubeMessageView: View {
    let preview: YouTubePreview
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: URL(string: preview.thumbnailUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(8)
                    .overlay(
                        Image(systemName: "play.circle.fill")
                            .font(.largeTitle)
                            .foregroundColor(.white)
                            .shadow(radius: 2)
                    )
            } placeholder: {
                Rectangle()
                    .fill(Color(.systemGray4))
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(8)
                    .overlay(
                        ProgressView()
                    )
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(preview.title ?? "YouTube 영상")
                    .font(.headline)
                    .lineLimit(2)
                
                if let channelTitle = preview.channelTitle {
                    Text(channelTitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(maxWidth: 250)
        .onTapGesture {
            // TODO: YouTube 영상 재생
            if let url = URL(string: "https://www.youtube.com/watch?v=\(preview.videoId)") {
                UIApplication.shared.open(url)
            }
        }
    }
}

struct TypingIndicatorView: View {
    let users: [User]
    @State private var animationOffset: CGFloat = 0
    
    var body: some View {
        HStack {
            Text("\(users.map(\.displayName).joined(separator: ", "))이 입력 중")
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(spacing: 4) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.secondary)
                        .frame(width: 6, height: 6)
                        .offset(y: animationOffset)
                        .animation(
                            Animation.easeInOut(duration: 0.6)
                                .repeatForever()
                                .delay(Double(index) * 0.2),
                            value: animationOffset
                        )
                }
            }
            
            Spacer()
        }
        .padding(.horizontal)
        .onAppear {
            animationOffset = -4
        }
    }
}

#Preview {
    NavigationView {
        ChatRoomView(chatRoom: ChatRoom(
            id: 1,
            name: "테스트 채팅방",
            isGroup: false,
            isPinned: false,
            isLocationChat: false,
            createdBy: 1,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
    .environmentObject(ChatManager())
    .environmentObject(AuthenticationManager())
}