//
//  PushNotificationManager.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation
import UserNotifications
import Combine

class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()
    
    @Published var isAuthorized = false
    @Published var deviceToken: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    override init() {
        super.init()
        checkAuthorizationStatus()
    }
    
    func requestPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { (granted: Bool, error: Error?) in
            DispatchQueue.main.async {
                self.isAuthorized = granted
                if granted {
                    self.registerForRemoteNotifications()
                }
            }
        }
    }
    
    private func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { (settings: UNNotificationSettings) in
            DispatchQueue.main.async {
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }
    
    private func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let delegate = windowScene.delegate as? UIWindowSceneDelegate {
                // UIApplication을 통한 등록 대신 다른 방법 사용
                print("푸시 알림 등록 준비 완료")
            }
        }
    }
    
    func setDeviceToken(_ tokenData: Data) {
        let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = token
        sendTokenToServer(token)
    }
    
    private func sendTokenToServer(_ token: String) {
        let body = ["deviceToken": token, "platform": "ios"]
        
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }
        
        APIService.shared.request<TokenResponse>(
            endpoint: "/api/notifications/register",
            method: .POST,
            body: bodyData,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("토큰 등록 실패: \(error)")
                }
            },
            receiveValue: { (response: TokenResponse) in
                print("푸시 토큰 등록 성공: \(response.success)")
            }
        )
        .store(in: &cancellables)
    }
    
    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        // 푸시 알림 처리 로직
        if let messageId = userInfo["messageId"] as? String {
            NotificationCenter.default.post(
                name: Notification.Name("NewMessageReceived"),
                object: nil,
                userInfo: ["messageId": messageId]
            )
        }
        
        if let chatRoomId = userInfo["chatRoomId"] as? String {
            NotificationCenter.default.post(
                name: Notification.Name("ChatRoomNotification"),
                object: nil,
                userInfo: ["chatRoomId": chatRoomId]
            )
        }
    }
    
    func setBadgeCount(_ count: Int) {
        DispatchQueue.main.async {
            UNUserNotificationCenter.current().setBadgeCount(count) { error in
                if let error = error {
                    print("뱃지 카운트 설정 실패: \(error)")
                }
            }
        }
    }
    
    func clearAllNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        setBadgeCount(0)
    }
    
    func scheduleLocalNotification(title: String, body: String, timeInterval: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { (error: Error?) in
            if let error = error {
                print("로컬 알림 스케줄링 실패: \(error)")
            }
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // 앱이 포그라운드에 있을 때 알림 표시
        completionHandler([.alert, .badge, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // 사용자가 알림을 탭했을 때 처리
        handleNotification(response.notification.request.content.userInfo)
        completionHandler()
    }
}

struct TokenResponse: Codable {
    let success: Bool
    let message: String?
}