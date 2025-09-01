//
//  DovieMessengerApp.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import UserNotifications
import AVFoundation

@main
struct DovieMessengerApp: App {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var chatManager = ChatManager()
    @StateObject private var pushNotificationManager = PushNotificationManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(chatManager)
                .environmentObject(pushNotificationManager)
                .onAppear {
                    configureApp()
                }
        }
    }
    
    private func configureApp() {
        // 푸시 알림 권한 요청
        pushNotificationManager.requestPermission()
        
        // 오디오 세션 설정
        configureAudioSession()
        
        // 백그라운드 작업 등록
        configureBackgroundTasks()
    }
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
        } catch {
            print("오디오 세션 설정 실패: \(error)")
        }
    }
    
    private func configureBackgroundTasks() {
        // 백그라운드 메시지 동기화 작업 등록
        // iOS 13+ 백그라운드 앱 새로고침 설정
    }
}