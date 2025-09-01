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
    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var deviceToken: String?
    
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        checkAuthorizationStatus()
    }
    
    // MARK: - 권한 관리
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                if granted {
                    self?.authorizationStatus = .authorized
                    self?.registerForRemoteNotifications()
                } else {
                    self?.authorizationStatus = .denied
                }
                
                if let error = error {
                    print("푸시 알림 권한 요청 실패: \(error)")
                }
            }
        }
    }
    
    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.authorizationStatus = settings.authorizationStatus
            }
        }
    }
    
    private func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    // MARK: - 디바이스 토큰 관리
    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
        
        // 서버에 디바이스 토큰 등록
        registerDeviceToken(tokenString)
    }
    
    func didFailToRegisterForRemoteNotifications(with error: Error) {
        print("원격 알림 등록 실패: \(error)")
    }
    
    private func registerDeviceToken(_ token: String) {
        let tokenData = [
            "deviceToken": token,
            "platform": "ios"
        ]
        
        apiService.request(
            endpoint: "/api/device-tokens",
            method: .POST,
            body: tokenData
        )
        .sink(
            receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("디바이스 토큰 등록 실패: \(error)")
                }
            },
            receiveValue: { (_: [String: Any]) in
                print("디바이스 토큰이 성공적으로 등록되었습니다")
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - 알림 배지 관리
    func updateBadgeCount(_ count: Int) {
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
        }
    }
    
    func clearBadge() {
        updateBadgeCount(0)
    }
    
    // MARK: - 로컬 알림
    func scheduleLocalNotification(
        title: String,
        body: String,
        identifier: String,
        timeInterval: TimeInterval = 0
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let trigger: UNNotificationTrigger
        if timeInterval > 0 {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
        } else {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        }
        
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("로컬 알림 스케줄링 실패: \(error)")
            }
        }
    }
    
    func removeNotification(withIdentifier identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension PushNotificationManager: UNUserNotificationCenterDelegate {
    // 앱이 포그라운드에 있을 때 알림 처리
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // 포그라운드에서도 알림 표시
        completionHandler([.banner, .sound, .badge])
    }
    
    // 사용자가 알림을 탭했을 때
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        // 알림 데이터 처리
        if let chatRoomId = userInfo["chatRoomId"] as? Int {
            // 해당 채팅방으로 이동
            NotificationCenter.default.post(
                name: .openChatRoom,
                object: nil,
                userInfo: ["chatRoomId": chatRoomId]
            )
        }
        
        completionHandler()
    }
}

// MARK: - 알림 이름
extension Notification.Name {
    static let openChatRoom = Notification.Name("openChatRoom")
}