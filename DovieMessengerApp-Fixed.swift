//
//  DovieMessengerApp.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import UserNotifications

@main
struct DovieMessengerApp: App {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var chatManager = ChatManager()
    @StateObject private var pushManager = PushNotificationManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(chatManager)
                .environmentObject(pushManager)
                .onAppear {
                    setupNotifications()
                }
        }
    }
    
    private func setupNotifications() {
        UNUserNotificationCenter.current().delegate = pushManager
        pushManager.requestPermissions()
    }
}

// MARK: - App Delegate Methods
extension DovieMessengerApp {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        pushManager.setDeviceToken(deviceToken)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("푸시 알림 등록 실패: \(error)")
    }
}