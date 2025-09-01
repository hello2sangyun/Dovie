//
//  ChatManager.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation
import Combine

class ChatManager: ObservableObject {
    @Published var chatRooms: [ChatRoom] = []
    @Published var currentChatRoom: ChatRoom?
    @Published var messages: [Message] = []
    @Published var isConnected = false
    @Published var typingUsers: [Int: User] = [:]
    @Published var unreadCounts: [Int: Int] = [:]
    
    private let apiService = APIService.shared
    private let websocketService = WebSocketService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        setupWebSocketListeners()
        loadChatRooms()
    }
    
    // MARK: - WebSocket 연결
    func connectWebSocket() {
        websocketService.connect()
    }
    
    func disconnectWebSocket() {
        websocketService.disconnect()
    }
    
    private func setupWebSocketListeners() {
        // 연결 상태 모니터링
        websocketService.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: \.isConnected, on: self)
            .store(in: &cancellables)
        
        // 새 메시지 수신
        websocketService.messageReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                self?.handleNewMessage(message)
            }
            .store(in: &cancellables)
        
        // 타이핑 상태 업데이트
        websocketService.typingUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] update in
                self?.handleTypingUpdate(update)
            }
            .store(in: &cancellables)
        
        // 사용자 온라인 상태 업데이트
        websocketService.userStatusUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] update in
                self?.handleUserStatusUpdate(update)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - 채팅방 관리
    func loadChatRooms() {
        apiService.request(endpoint: "/api/chat-rooms", method: .GET)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("채팅방 로드 실패: \(error)")
                    }
                },
                receiveValue: { [weak self] (response: ChatRoomsResponse) in
                    self?.chatRooms = response.chatRooms
                    self?.unreadCounts = response.unreadCounts
                }
            )
            .store(in: &cancellables)
    }
    
    func createChatRoom(name: String, participantIds: [Int], isGroup: Bool = false) {
        let createData = [
            "name": name,
            "participantIds": participantIds,
            "isGroup": isGroup
        ] as [String: Any]
        
        apiService.request(
            endpoint: "/api/chat-rooms",
            method: .POST,
            body: createData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("채팅방 생성 실패: \(error)")
                }
            },
            receiveValue: { [weak self] (chatRoom: ChatRoom) in
                self?.chatRooms.insert(chatRoom, at: 0)
            }
        )
        .store(in: &cancellables)
    }
    
    func joinChatRoom(_ chatRoom: ChatRoom) {
        currentChatRoom = chatRoom
        loadMessages(for: chatRoom.id)
        markAsRead(chatRoomId: chatRoom.id)
        
        // WebSocket에 채팅방 조인 알림
        websocketService.joinRoom(chatRoomId: chatRoom.id)
    }
    
    func leaveChatRoom() {
        if let chatRoomId = currentChatRoom?.id {
            websocketService.leaveRoom(chatRoomId: chatRoomId)
        }
        currentChatRoom = nil
        messages = []
        typingUsers = [:]
    }
    
    // MARK: - 메시지 관리
    func loadMessages(for chatRoomId: Int, lastMessageId: Int? = nil) {
        var endpoint = "/api/chat-rooms/\(chatRoomId)/messages"
        if let lastMessageId = lastMessageId {
            endpoint += "?lastMessageId=\(lastMessageId)"
        }
        
        apiService.request(endpoint: endpoint, method: .GET)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("메시지 로드 실패: \(error)")
                    }
                },
                receiveValue: { [weak self] (loadedMessages: [Message]) in
                    if lastMessageId == nil {
                        // 초기 로드
                        self?.messages = loadedMessages.reversed()
                    } else {
                        // 이전 메시지 로드 (페이지네이션)
                        self?.messages = loadedMessages.reversed() + (self?.messages ?? [])
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    func sendMessage(content: String, type: MessageType = .text, replyToMessageId: Int? = nil) {
        guard let chatRoomId = currentChatRoom?.id else { return }
        
        let messageData = [
            "content": content,
            "messageType": type.rawValue,
            "replyToMessageId": replyToMessageId as Any
        ]
        
        websocketService.sendMessage(
            chatRoomId: chatRoomId,
            messageData: messageData
        )
    }
    
    func sendFileMessage(fileData: Data, fileName: String, fileType: String) {
        guard let chatRoomId = currentChatRoom?.id else { return }
        
        // 파일 업로드 API 호출
        apiService.uploadFile(
            fileData: fileData,
            fileName: fileName,
            fileType: fileType,
            chatRoomId: chatRoomId
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("파일 업로드 실패: \(error)")
                }
            },
            receiveValue: { [weak self] (response: FileUploadResponse) in
                // 파일 메시지 전송
                let messageData = [
                    "content": fileName,
                    "messageType": MessageType.file.rawValue,
                    "fileUrl": response.fileUrl,
                    "fileName": fileName,
                    "fileSize": fileData.count
                ] as [String: Any]
                
                self?.websocketService.sendMessage(
                    chatRoomId: chatRoomId,
                    messageData: messageData
                )
            }
        )
        .store(in: &cancellables)
    }
    
    func sendVoiceMessage(audioData: Data, duration: Int) {
        guard let chatRoomId = currentChatRoom?.id else { return }
        
        // 음성 파일 업로드
        apiService.uploadFile(
            fileData: audioData,
            fileName: "voice_\(Date().timeIntervalSince1970).m4a",
            fileType: "audio/m4a",
            chatRoomId: chatRoomId
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("음성 메시지 업로드 실패: \(error)")
                }
            },
            receiveValue: { [weak self] (response: FileUploadResponse) in
                // 음성 메시지 전송
                let messageData = [
                    "content": "음성 메시지",
                    "messageType": MessageType.voice.rawValue,
                    "fileUrl": response.fileUrl,
                    "voiceDuration": duration
                ] as [String: Any]
                
                self?.websocketService.sendMessage(
                    chatRoomId: chatRoomId,
                    messageData: messageData
                )
            }
        )
        .store(in: &cancellables)
    }
    
    func markAsRead(chatRoomId: Int) {
        apiService.request(
            endpoint: "/api/chat-rooms/\(chatRoomId)/read",
            method: .POST
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { _ in },
            receiveValue: { [weak self] (_: [String: Any]) in
                self?.unreadCounts[chatRoomId] = 0
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - 타이핑 상태
    func startTyping() {
        guard let chatRoomId = currentChatRoom?.id else { return }
        websocketService.sendTypingStatus(chatRoomId: chatRoomId, isTyping: true)
    }
    
    func stopTyping() {
        guard let chatRoomId = currentChatRoom?.id else { return }
        websocketService.sendTypingStatus(chatRoomId: chatRoomId, isTyping: false)
    }
    
    // MARK: - WebSocket 이벤트 처리
    private func handleNewMessage(_ message: Message) {
        // 현재 채팅방의 메시지인 경우 추가
        if message.chatRoomId == currentChatRoom?.id {
            messages.append(message)
            markAsRead(chatRoomId: message.chatRoomId)
        } else {
            // 다른 채팅방의 메시지인 경우 읽지 않음 수 증가
            unreadCounts[message.chatRoomId] = (unreadCounts[message.chatRoomId] ?? 0) + 1
        }
        
        // 채팅방 목록에서 해당 채팅방의 마지막 메시지 업데이트
        if let index = chatRooms.firstIndex(where: { $0.id == message.chatRoomId }) {
            chatRooms[index].lastMessage = message
            
            // 채팅방을 목록 상단으로 이동
            let chatRoom = chatRooms.remove(at: index)
            chatRooms.insert(chatRoom, at: 0)
        }
    }
    
    private func handleTypingUpdate(_ update: TypingUpdate) {
        if update.chatRoomId == currentChatRoom?.id {
            if update.isTyping {
                typingUsers[update.userId] = update.user
            } else {
                typingUsers.removeValue(forKey: update.userId)
            }
        }
    }
    
    private func handleUserStatusUpdate(_ update: UserStatusUpdate) {
        // 채팅방 참가자들의 온라인 상태 업데이트
        for i in 0..<chatRooms.count {
            for j in 0..<chatRooms[i].participants.count {
                if chatRooms[i].participants[j].id == update.userId {
                    chatRooms[i].participants[j] = update.user
                }
            }
        }
    }
}

// MARK: - 응답 모델
struct ChatRoomsResponse: Codable {
    let chatRooms: [ChatRoom]
    let unreadCounts: [Int: Int]
    
    enum CodingKeys: String, CodingKey {
        case chatRooms = "chat_rooms"
        case unreadCounts = "unread_counts"
    }
}

struct FileUploadResponse: Codable {
    let fileUrl: String
    let fileName: String
    
    enum CodingKeys: String, CodingKey {
        case fileUrl = "file_url"
        case fileName = "file_name"
    }
}

struct TypingUpdate: Codable {
    let chatRoomId: Int
    let userId: Int
    let isTyping: Bool
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case chatRoomId = "chat_room_id"
        case userId = "user_id"
        case isTyping = "is_typing"
        case user
    }
}

struct UserStatusUpdate: Codable {
    let userId: Int
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case user
    }
}