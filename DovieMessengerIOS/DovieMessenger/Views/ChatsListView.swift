//
//  ChatsListView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct ChatsListView: View {
    @EnvironmentObject var chatManager: ChatManager
    @State private var searchText = ""
    @State private var showingCreateChat = false
    
    var filteredChatRooms: [ChatRoom] {
        if searchText.isEmpty {
            return chatManager.chatRooms
        } else {
            return chatManager.chatRooms.filter { chatRoom in
                chatRoom.name.localizedCaseInsensitiveContains(searchText) ||
                chatRoom.lastMessage?.content?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 검색 바
                HStack {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("채팅방 검색", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    
                    Button("새 채팅") {
                        showingCreateChat = true
                    }
                    .foregroundColor(.purple)
                }
                .padding()
                
                // 연결 상태 인디케이터
                if !chatManager.isConnected {
                    HStack {
                        Image(systemName: "wifi.slash")
                            .foregroundColor(.red)
                        Text("연결 중...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
                
                // 채팅방 목록
                List {
                    ForEach(filteredChatRooms) { chatRoom in
                        NavigationLink(destination: ChatRoomView(chatRoom: chatRoom)) {
                            ChatRoomRowView(chatRoom: chatRoom)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    }
                    .onDelete(perform: deleteChatRooms)
                }
                .listStyle(PlainListStyle())
                .refreshable {
                    chatManager.loadChatRooms()
                }
            }
            .navigationTitle("채팅")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingCreateChat) {
                CreateChatView()
            }
        }
        .onAppear {
            chatManager.loadChatRooms()
        }
    }
    
    private func deleteChatRooms(offsets: IndexSet) {
        // TODO: 채팅방 삭제 구현
    }
}

struct ChatRoomRowView: View {
    let chatRoom: ChatRoom
    @EnvironmentObject var chatManager: ChatManager
    
    private var unreadCount: Int {
        chatManager.unreadCounts[chatRoom.id] ?? 0
    }
    
    private var lastMessageText: String {
        guard let lastMessage = chatRoom.lastMessage else {
            return "새로운 채팅방입니다"
        }
        
        switch lastMessage.messageType {
        case .text, .system:
            return lastMessage.content ?? ""
        case .image:
            return "📷 사진"
        case .voice:
            return "🎤 음성 메시지"
        case .file:
            return "📎 파일"
        case .video:
            return "🎬 동영상"
        case .youtube:
            return "▶️ YouTube 영상"
        case .location:
            return "📍 위치"
        case .poll:
            return "📊 투표"
        default:
            return "메시지"
        }
    }
    
    private var lastMessageTime: String {
        guard let lastMessage = chatRoom.lastMessage else {
            return ""
        }
        
        let formatter = DateFormatter()
        let now = Date()
        let messageDate = lastMessage.createdAt
        
        if Calendar.current.isToday(messageDate) {
            formatter.dateFormat = "HH:mm"
        } else if Calendar.current.isYesterday(messageDate) {
            return "어제"
        } else {
            formatter.dateFormat = "MM/dd"
        }
        
        return formatter.string(from: messageDate)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // 프로필 이미지
            ChatRoomAvatarView(chatRoom: chatRoom)
            
            // 채팅방 정보
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(chatRoom.name)
                        .font(.headline)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    if !lastMessageTime.isEmpty {
                        Text(lastMessageTime)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                HStack {
                    Text(lastMessageText)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    Spacer()
                    
                    if unreadCount > 0 {
                        Text("\(unreadCount)")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.red)
                            .clipShape(Capsule())
                            .scaleEffect(unreadCount > 99 ? 0.8 : 1.0)
                    }
                }
            }
            
            if chatRoom.isPinned {
                Image(systemName: "pin.fill")
                    .foregroundColor(.orange)
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ChatRoomAvatarView: View {
    let chatRoom: ChatRoom
    
    var body: some View {
        if chatRoom.isGroup {
            // 그룹 채팅 아바타
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [.purple.opacity(0.3), .blue.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 50, height: 50)
                
                Image(systemName: "person.2")
                    .foregroundColor(.purple)
                    .font(.title3)
            }
        } else {
            // 개인 채팅 아바타
            if let participant = chatRoom.participants.first {
                AsyncImage(url: URL(string: participant.profilePicture ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(LinearGradient(
                            colors: [.purple.opacity(0.3), .blue.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .overlay(
                            Text(participant.displayName.prefix(1))
                                .font(.title2)
                                .foregroundColor(.purple)
                        )
                }
                .frame(width: 50, height: 50)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(participant.isOnline ? Color.green : Color.clear, lineWidth: 2)
                )
            } else {
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: "person")
                            .foregroundColor(.secondary)
                    )
            }
        }
    }
}

struct CreateChatView: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var chatManager: ChatManager
    @State private var chatName = ""
    @State private var selectedUsers: Set<Int> = []
    @State private var isGroup = false
    
    // TODO: 사용자 목록 로드
    @State private var availableUsers: [User] = []
    
    var body: some View {
        NavigationView {
            VStack {
                Form {
                    Section(header: Text("채팅방 정보")) {
                        TextField("채팅방 이름", text: $chatName)
                        
                        Toggle("그룹 채팅", isOn: $isGroup)
                    }
                    
                    Section(header: Text("참가자 선택")) {
                        ForEach(availableUsers) { user in
                            HStack {
                                AsyncImage(url: URL(string: user.profilePicture ?? "")) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Circle()
                                        .fill(Color(.systemGray5))
                                        .overlay(
                                            Text(user.displayName.prefix(1))
                                                .foregroundColor(.secondary)
                                        )
                                }
                                .frame(width: 40, height: 40)
                                .clipShape(Circle())
                                
                                VStack(alignment: .leading) {
                                    Text(user.displayName)
                                        .font(.headline)
                                    Text("@\(user.username)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                if selectedUsers.contains(user.id) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                if selectedUsers.contains(user.id) {
                                    selectedUsers.remove(user.id)
                                } else {
                                    selectedUsers.insert(user.id)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("새 채팅")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("생성") {
                        createChat()
                    }
                    .disabled(selectedUsers.isEmpty || chatName.isEmpty)
                }
            }
        }
    }
    
    private func createChat() {
        chatManager.createChatRoom(
            name: chatName,
            participantIds: Array(selectedUsers),
            isGroup: isGroup
        )
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    ChatsListView()
        .environmentObject(ChatManager())
}