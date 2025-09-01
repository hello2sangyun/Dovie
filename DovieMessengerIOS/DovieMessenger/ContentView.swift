//
//  ContentView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var chatManager: ChatManager
    @State private var selectedTab = 0
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView(selectedTab: $selectedTab)
            } else {
                AuthenticationView()
            }
        }
        .onAppear {
            authManager.checkAuthenticationStatus()
        }
    }
}

struct MainTabView: View {
    @Binding var selectedTab: Int
    @EnvironmentObject var chatManager: ChatManager
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ChatsListView()
                .tabItem {
                    Image(systemName: "message")
                    Text("채팅")
                }
                .tag(0)
            
            ContactsView()
                .tabItem {
                    Image(systemName: "person.2")
                    Text("연락처")
                }
                .tag(1)
            
            SpaceView()
                .tabItem {
                    Image(systemName: "building.2")
                    Text("비즈니스")
                }
                .tag(2)
            
            ArchiveView()
                .tabItem {
                    Image(systemName: "archivebox")
                    Text("아카이브")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("설정")
                }
                .tag(4)
        }
        .accentColor(.purple)
        .onAppear {
            // 탭뷰가 나타날 때 실시간 연결 시작
            chatManager.connectWebSocket()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationManager())
        .environmentObject(ChatManager())
        .environmentObject(PushNotificationManager())
}