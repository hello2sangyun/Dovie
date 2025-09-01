//
//  AppDelegate+PushNotifications.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import UIKit
import UserNotifications

extension UIApplication {
    func registerForPushNotifications() {
        UNUserNotificationCenter.current().delegate = UIApplication.shared.delegate as? UNUserNotificationCenterDelegate
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            print("Push notification permission granted: \(granted)")
            
            DispatchQueue.main.async {
                self.registerForRemoteNotifications()
            }
        }
    }
}

// MARK: - Remote Notifications
extension UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("Device Token: \(token)")
        
        // PushNotificationManager에 토큰 전달
        if let pushManager = (UIApplication.shared.delegate as? AppDelegate)?.pushNotificationManager {
            pushManager.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
        }
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for remote notifications: \(error)")
        
        // PushNotificationManager에 오류 전달
        if let pushManager = (UIApplication.shared.delegate as? AppDelegate)?.pushNotificationManager {
            pushManager.didFailToRegisterForRemoteNotifications(with: error)
        }
    }
}

// MARK: - Notification Handling
extension UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("Received remote notification: \(userInfo)")
        
        // 백그라운드에서 메시지 동기화
        handleRemoteNotification(userInfo: userInfo) { result in
            completionHandler(result)
        }
    }
    
    private func handleRemoteNotification(
        userInfo: [AnyHashable: Any],
        completion: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // 메시지 데이터 파싱
        guard let messageData = userInfo["message"] as? [String: Any],
              let chatRoomId = messageData["chatRoomId"] as? Int else {
            completion(.noData)
            return
        }
        
        // ChatManager를 통해 메시지 동기화
        // TODO: ChatManager 인스턴스에 접근하여 메시지 업데이트
        
        completion(.newData)
    }
}

// MARK: - App Delegate
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var pushNotificationManager: PushNotificationManager?
    
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        
        // 푸시 알림 매니저 초기화
        pushNotificationManager = PushNotificationManager()
        
        // 푸시 알림 등록
        application.registerForPushNotifications()
        
        return true
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // 포그라운드에서도 알림 표시
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        // 알림 탭 처리
        handleNotificationTap(userInfo: userInfo)
        
        completionHandler()
    }
    
    private func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        // 딥링크 처리
        if let chatRoomId = userInfo["chatRoomId"] as? Int {
            NotificationCenter.default.post(
                name: .openChatRoom,
                object: nil,
                userInfo: ["chatRoomId": chatRoomId]
            )
        }
    }
}