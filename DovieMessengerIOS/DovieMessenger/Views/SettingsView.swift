//
//  SettingsView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var pushNotificationManager: PushNotificationManager
    @State private var showingProfileEdit = false
    @State private var showingAbout = false
    
    var body: some View {
        NavigationView {
            List {
                // 프로필 섹션
                Section {
                    profileSection
                } header: {
                    Text("프로필")
                }
                
                // 알림 설정
                Section {
                    notificationSettings
                } header: {
                    Text("알림")
                }
                
                // 채팅 설정
                Section {
                    chatSettings
                } header: {
                    Text("채팅")
                }
                
                // 개인정보 및 보안
                Section {
                    privacyAndSecuritySettings
                } header: {
                    Text("개인정보 및 보안")
                }
                
                // 고급 설정
                Section {
                    advancedSettings
                } header: {
                    Text("고급")
                }
                
                // 정보
                Section {
                    aboutSection
                } header: {
                    Text("정보")
                }
                
                // 로그아웃
                Section {
                    logoutButton
                }
            }
            .navigationTitle("설정")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(isPresented: $showingProfileEdit) {
            ProfileEditView()
        }
        .sheet(isPresented: $showingAbout) {
            AboutView()
        }
    }
    
    private var profileSection: some View {
        HStack {
            AsyncImage(url: URL(string: authManager.currentUser?.profilePicture ?? "")) { image in
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
                        Text(authManager.currentUser?.displayName.prefix(1) ?? "?")
                            .font(.title)
                            .foregroundColor(.purple)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 4) {
                Text(authManager.currentUser?.displayName ?? "Unknown")
                    .font(.headline)
                
                Text("@\(authManager.currentUser?.username ?? "unknown")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                if let email = authManager.currentUser?.email {
                    Text(email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Button("편집") {
                showingProfileEdit = true
            }
            .foregroundColor(.purple)
        }
        .padding(.vertical, 8)
    }
    
    private var notificationSettings: some View {
        Group {
            NavigationLink(destination: NotificationSettingsView()) {
                HStack {
                    Image(systemName: "bell")
                        .foregroundColor(.red)
                        .frame(width: 25)
                    Text("푸시 알림")
                }
            }
            
            NavigationLink(destination: SoundSettingsView()) {
                HStack {
                    Image(systemName: "speaker.wave.2")
                        .foregroundColor(.blue)
                        .frame(width: 25)
                    Text("알림음")
                }
            }
        }
    }
    
    private var chatSettings: some View {
        Group {
            NavigationLink(destination: ChatSettingsView()) {
                HStack {
                    Image(systemName: "message")
                        .foregroundColor(.green)
                        .frame(width: 25)
                    Text("메시지 설정")
                }
            }
            
            NavigationLink(destination: VoiceSettingsView()) {
                HStack {
                    Image(systemName: "mic")
                        .foregroundColor(.orange)
                        .frame(width: 25)
                    Text("음성 메시지")
                }
            }
        }
    }
    
    private var privacyAndSecuritySettings: some View {
        Group {
            NavigationLink(destination: PrivacySettingsView()) {
                HStack {
                    Image(systemName: "lock")
                        .foregroundColor(.purple)
                        .frame(width: 25)
                    Text("개인정보")
                }
            }
            
            NavigationLink(destination: SecuritySettingsView()) {
                HStack {
                    Image(systemName: "shield")
                        .foregroundColor(.indigo)
                        .frame(width: 25)
                    Text("보안")
                }
            }
            
            NavigationLink(destination: BlockedContactsView()) {
                HStack {
                    Image(systemName: "hand.raised")
                        .foregroundColor(.red)
                        .frame(width: 25)
                    Text("차단된 연락처")
                }
            }
        }
    }
    
    private var advancedSettings: some View {
        Group {
            NavigationLink(destination: StorageSettingsView()) {
                HStack {
                    Image(systemName: "internaldrive")
                        .foregroundColor(.gray)
                        .frame(width: 25)
                    Text("저장공간")
                }
            }
            
            NavigationLink(destination: LanguageSettingsView()) {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.cyan)
                        .frame(width: 25)
                    Text("언어")
                }
            }
        }
    }
    
    private var aboutSection: some View {
        Group {
            NavigationLink(destination: HelpView()) {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundColor(.blue)
                        .frame(width: 25)
                    Text("도움말")
                }
            }
            
            Button(action: {
                showingAbout = true
            }) {
                HStack {
                    Image(systemName: "info.circle")
                        .foregroundColor(.gray)
                        .frame(width: 25)
                    Text("앱 정보")
                    Spacer()
                }
                .foregroundColor(.primary)
            }
            
            NavigationLink(destination: PrivacyPolicyView()) {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundColor(.green)
                        .frame(width: 25)
                    Text("개인정보 처리방침")
                }
            }
        }
    }
    
    private var logoutButton: some View {
        Button(action: {
            authManager.logout()
        }) {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .foregroundColor(.red)
                    .frame(width: 25)
                Text("로그아웃")
                    .foregroundColor(.red)
            }
        }
    }
}

struct ProfileEditView: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var displayName = ""
    @State private var bio = ""
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Spacer()
                        Button(action: {
                            showingImagePicker = true
                        }) {
                            if let selectedImage = selectedImage {
                                Image(uiImage: selectedImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else {
                                AsyncImage(url: URL(string: authManager.currentUser?.profilePicture ?? "")) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Circle()
                                        .fill(Color(.systemGray5))
                                        .overlay(
                                            Image(systemName: "camera")
                                                .foregroundColor(.secondary)
                                        )
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            }
                        }
                        Spacer()
                    }
                    .padding(.vertical)
                } header: {
                    Text("프로필 사진")
                }
                
                Section {
                    TextField("표시 이름", text: $displayName)
                    TextField("소개", text: $bio, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text("기본 정보")
                }
            }
            .navigationTitle("프로필 편집")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("저장") {
                        saveProfile()
                    }
                }
            }
        }
        .sheet(isPresented: $showingImagePicker) {
            // TODO: 이미지 피커 구현
        }
        .onAppear {
            displayName = authManager.currentUser?.displayName ?? ""
            // bio는 사용자 프로필 확장 정보에서 가져와야 함
        }
    }
    
    private func saveProfile() {
        // TODO: 프로필 업데이트 API 호출
        presentationMode.wrappedValue.dismiss()
    }
}

// MARK: - 설정 상세 뷰들
struct NotificationSettingsView: View {
    @EnvironmentObject var pushNotificationManager: PushNotificationManager
    @State private var pushEnabled = true
    @State private var soundEnabled = true
    @State private var badgeEnabled = true
    @State private var vibrationEnabled = true
    
    var body: some View {
        Form {
            Section {
                Toggle("푸시 알림", isOn: $pushEnabled)
                Toggle("알림음", isOn: $soundEnabled)
                Toggle("뱃지", isOn: $badgeEnabled)
                Toggle("진동", isOn: $vibrationEnabled)
            } header: {
                Text("기본 설정")
            } footer: {
                Text("알림 설정을 변경하려면 시스템 설정에서 앱 알림을 허용해주세요.")
            }
        }
        .navigationTitle("푸시 알림")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ChatSettingsView: View {
    @State private var enterToSend = false
    @State private var readReceipts = true
    @State private var typingIndicator = true
    
    var body: some View {
        Form {
            Section {
                Toggle("엔터키로 전송", isOn: $enterToSend)
                Toggle("읽음 표시", isOn: $readReceipts)
                Toggle("입력 중 표시", isOn: $typingIndicator)
            } header: {
                Text("메시지")
            }
        }
        .navigationTitle("메시지 설정")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "message.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Text("Dovie Messenger")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("버전 1.0.0")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("안전하고 빠른 메신저")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .padding()
                
                Spacer()
                
                Text("© 2025 Dovie Team. All rights reserved.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("닫기") {
                        // TODO: 닫기 액션
                    }
                }
            }
        }
    }
}

// 더미 뷰들 (실제로는 각각 구현해야 함)
struct SoundSettingsView: View { var body: some View { Text("알림음 설정") } }
struct VoiceSettingsView: View { var body: some View { Text("음성 메시지 설정") } }
struct PrivacySettingsView: View { var body: some View { Text("개인정보 설정") } }
struct SecuritySettingsView: View { var body: some View { Text("보안 설정") } }
struct BlockedContactsView: View { var body: some View { Text("차단된 연락처") } }
struct StorageSettingsView: View { var body: some View { Text("저장공간 설정") } }
struct LanguageSettingsView: View { var body: some View { Text("언어 설정") } }
struct HelpView: View { var body: some View { Text("도움말") } }
struct PrivacyPolicyView: View { var body: some View { Text("개인정보 처리방침") } }

#Preview {
    SettingsView()
        .environmentObject(AuthenticationManager())
        .environmentObject(PushNotificationManager())
}