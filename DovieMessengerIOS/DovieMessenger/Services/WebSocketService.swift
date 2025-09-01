//
//  WebSocketService.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation
import Combine

class WebSocketService: ObservableObject {
    static let shared = WebSocketService()
    
    @Published var isConnected = false
    
    // 이벤트 퍼블리셔들
    let messageReceived = PassthroughSubject<Message, Never>()
    let typingUpdate = PassthroughSubject<TypingUpdate, Never>()
    let userStatusUpdate = PassthroughSubject<UserStatusUpdate, Never>()
    let connectionStatusChanged = PassthroughSubject<Bool, Never>()
    
    private var webSocketTask: URLSessionWebSocketTask?
    private let urlSession = URLSession.shared
    private let baseURL = "wss://dovie-hello2sangyun.replit.app/ws"
    private let keychain = KeychainManager()
    private var heartbeatTimer: Timer?
    private var reconnectTimer: Timer?
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    
    private init() {}
    
    // MARK: - 연결 관리
    func connect() {
        guard let token = keychain.getAccessToken() else {
            print("인증 토큰이 없어 WebSocket 연결을 할 수 없습니다")
            return
        }
        
        guard let url = URL(string: "\(baseURL)?token=\(token)") else {
            print("잘못된 WebSocket URL")
            return
        }
        
        webSocketTask = urlSession.webSocketTask(with: url)
        webSocketTask?.resume()
        
        startListening()
        startHeartbeat()
        
        isConnected = true
        connectionStatusChanged.send(true)
        reconnectAttempts = 0
        
        print("WebSocket 연결 시도 중...")
    }
    
    func disconnect() {
        stopHeartbeat()
        stopReconnectTimer()
        
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        
        isConnected = false
        connectionStatusChanged.send(false)
        
        print("WebSocket 연결 해제됨")
    }
    
    private func startListening() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .failure(let error):
                print("WebSocket 수신 오류: \(error)")
                self?.handleConnectionError()
                
            case .success(let message):
                self?.handleMessage(message)
                self?.startListening() // 계속 수신 대기
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            parseWebSocketMessage(text)
            
        case .data(let data):
            if let text = String(data: data, encoding: .utf8) {
                parseWebSocketMessage(text)
            }
            
        @unknown default:
            print("알 수 없는 WebSocket 메시지 타입")
        }
    }
    
    private func parseWebSocketMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        
        do {
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let type = json["type"] as? String {
                
                switch type {
                case "message":
                    if let messageData = json["data"] {
                        let messageJsonData = try JSONSerialization.data(withJSONObject: messageData)
                        let message = try JSONDecoder().decode(Message.self, from: messageJsonData)
                        messageReceived.send(message)
                    }
                    
                case "typing":
                    if let typingData = json["data"] {
                        let typingJsonData = try JSONSerialization.data(withJSONObject: typingData)
                        let typing = try JSONDecoder().decode(TypingUpdate.self, from: typingJsonData)
                        typingUpdate.send(typing)
                    }
                    
                case "user_status":
                    if let statusData = json["data"] {
                        let statusJsonData = try JSONSerialization.data(withJSONObject: statusData)
                        let status = try JSONDecoder().decode(UserStatusUpdate.self, from: statusJsonData)
                        userStatusUpdate.send(status)
                    }
                    
                case "pong":
                    // 서버로부터 하트비트 응답
                    break
                    
                default:
                    print("알 수 없는 WebSocket 메시지 타입: \(type)")
                }
            }
        } catch {
            print("WebSocket 메시지 파싱 오류: \(error)")
        }
    }
    
    // MARK: - 메시지 전송
    private func sendWebSocketMessage(_ data: [String: Any]) {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            let message = URLSessionWebSocketTask.Message.data(jsonData)
            
            webSocketTask?.send(message) { error in
                if let error = error {
                    print("WebSocket 메시지 전송 오류: \(error)")
                }
            }
        } catch {
            print("WebSocket 메시지 직렬화 오류: \(error)")
        }
    }
    
    func sendMessage(chatRoomId: Int, messageData: [String: Any]) {
        let data = [
            "type": "message",
            "chatRoomId": chatRoomId,
            "data": messageData
        ] as [String : Any]
        
        sendWebSocketMessage(data)
    }
    
    func joinRoom(chatRoomId: Int) {
        let data = [
            "type": "join_room",
            "chatRoomId": chatRoomId
        ]
        
        sendWebSocketMessage(data)
    }
    
    func leaveRoom(chatRoomId: Int) {
        let data = [
            "type": "leave_room",
            "chatRoomId": chatRoomId
        ]
        
        sendWebSocketMessage(data)
    }
    
    func sendTypingStatus(chatRoomId: Int, isTyping: Bool) {
        let data = [
            "type": "typing",
            "chatRoomId": chatRoomId,
            "isTyping": isTyping
        ] as [String : Any]
        
        sendWebSocketMessage(data)
    }
    
    // MARK: - 하트비트
    private func startHeartbeat() {
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }
    
    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }
    
    private func sendHeartbeat() {
        let data = ["type": "ping"]
        sendWebSocketMessage(data)
    }
    
    // MARK: - 재연결
    private func handleConnectionError() {
        isConnected = false
        connectionStatusChanged.send(false)
        
        if reconnectAttempts < maxReconnectAttempts {
            scheduleReconnect()
        } else {
            print("WebSocket 재연결 시도 한계 도달")
        }
    }
    
    private func scheduleReconnect() {
        reconnectAttempts += 1
        let delay = min(pow(2.0, Double(reconnectAttempts)), 30.0) // 지수 백오프, 최대 30초
        
        print("WebSocket \(delay)초 후 재연결 시도... (시도 \(reconnectAttempts)/\(maxReconnectAttempts))")
        
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.connect()
        }
    }
    
    private func stopReconnectTimer() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }
}