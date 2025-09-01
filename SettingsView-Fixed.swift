//
//  SettingsView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import Combine

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var pushManager: PushNotificationManager
    @State private var isEditingProfile = false
    @State private var showingImagePicker = false
    @State private var showingLogoutAlert = false
    @State private var notificationsEnabled = true
    @State private var darkModeEnabled = false
    @State private var selectedImage: UIImage?
    @State private var cancellables = Set<AnyCancellable>()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    profileSection
                    settingsSection
                    aboutSection
                    logoutSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("설정")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $isEditingProfile) {
                ProfileEditView(user: authManager.currentUser) { updatedUser in
                    updateUserProfile(updatedUser)
                }
            }
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(selectedImage: $selectedImage)
            }
            .alert("로그아웃", isPresented: $showingLogoutAlert) {
                Button("취소", role: .cancel) { }
                Button("로그아웃", role: .destructive) {
                    authManager.logout()
                }
            } message: {
                Text("정말 로그아웃하시겠습니까?")
            }
            .onAppear {
                loadSettings()
            }
            .onChange(of: selectedImage) { image in
                if let image = image {
                    uploadProfileImage(image)
                }
            }
        }
    }
    
    private var profileSection: some View {
        VStack(spacing: 16) {
            // 프로필 이미지
            Button(action: {
                showingImagePicker = true
            }) {
                AsyncImage(url: URL(string: authManager.currentUser?.profileImageURL ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.purple.gradient)
                        .overlay(
                            Text(authManager.currentUser?.computedInitials ?? "??")
                                .font(.system(size: 32, weight: .medium))
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 100, height: 100)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.purple, lineWidth: 3)
                )
                .overlay(
                    Image(systemName: "camera.fill")
                        .foregroundColor(.white)
                        .background(
                            Circle()
                                .fill(Color.black.opacity(0.6))
                                .frame(width: 30, height: 30)
                        )
                        .offset(x: 35, y: 35)
                )
            }
            
            VStack(spacing: 4) {
                Text(authManager.currentUser?.displayName ?? "사용자")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("@\(authManager.currentUser?.username ?? "")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                if let email = authManager.currentUser?.email {
                    Text(email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Button("프로필 편집") {
                isEditingProfile = true
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var settingsSection: some View {
        VStack(spacing: 0) {
            SettingsRow(
                icon: "bell.fill",
                title: "알림 설정",
                subtitle: "푸시 알림 및 소리 설정"
            ) {
                NavigationLink(destination: NotificationSettingsView()) {
                    EmptyView()
                }
            }
            
            Divider()
                .padding(.leading, 44)
            
            SettingsRow(
                icon: "moon.fill",
                title: "다크 모드",
                subtitle: "어두운 테마 사용"
            ) {
                Toggle("", isOn: $darkModeEnabled)
                    .labelsHidden()
            }
            
            Divider()
                .padding(.leading, 44)
            
            SettingsRow(
                icon: "lock.fill",
                title: "개인정보 보호",
                subtitle: "계정 보안 및 개인정보 설정"
            ) {
                NavigationLink(destination: PrivacySettingsView()) {
                    EmptyView()
                }
            }
            
            Divider()
                .padding(.leading, 44)
            
            SettingsRow(
                icon: "square.and.arrow.down.fill",
                title: "데이터 및 저장공간",
                subtitle: "캐시 및 다운로드 관리"
            ) {
                NavigationLink(destination: DataStorageView()) {
                    EmptyView()
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var aboutSection: some View {
        VStack(spacing: 0) {
            SettingsRow(
                icon: "questionmark.circle.fill",
                title: "도움말 및 지원",
                subtitle: "자주 묻는 질문 및 고객 지원"
            ) {
                NavigationLink(destination: HelpSupportView()) {
                    EmptyView()
                }
            }
            
            Divider()
                .padding(.leading, 44)
            
            SettingsRow(
                icon: "info.circle.fill",
                title: "앱 정보",
                subtitle: "버전 1.0.0"
            ) {
                NavigationLink(destination: AppInfoView()) {
                    EmptyView()
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private var logoutSection: some View {
        Button(action: {
            showingLogoutAlert = true
        }) {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right.fill")
                    .foregroundColor(.red)
                    .frame(width: 24, height: 24)
                
                Text("로그아웃")
                    .fontWeight(.medium)
                    .foregroundColor(.red)
                
                Spacer()
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
        }
    }
    
    private func loadSettings() {
        notificationsEnabled = pushManager.isAuthorized
    }
    
    private func updateUserProfile(_ updatedUser: User) {
        let body = [
            "displayName": updatedUser.displayName,
            "businessName": updatedUser.businessAddress ?? "",
            "email": updatedUser.email ?? ""
        ]
        
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }
        
        APIService.shared.request<User>(
            endpoint: "/api/auth/update-profile",
            method: .POST,
            body: bodyData,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("프로필 업데이트 실패: \(error)")
                }
            },
            receiveValue: { (user: User) in
                self.authManager.currentUser = user
            }
        )
        .store(in: &cancellables)
    }
    
    private func uploadProfileImage(_ image: UIImage) {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else { return }
        
        APIService.shared.uploadFile(
            data: imageData,
            filename: "profile.jpg",
            endpoint: "/api/upload/profile-image"
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("프로필 이미지 업로드 실패: \(error)")
                }
            },
            receiveValue: { (response: FileUploadResponse) in
                // 프로필 이미지 URL 업데이트
                self.updateProfileImageURL(response.filePath)
            }
        )
        .store(in: &cancellables)
    }
    
    private func updateProfileImageURL(_ imageURL: String) {
        let body = ["profileImageUrl": imageURL]
        
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }
        
        APIService.shared.request<User>(
            endpoint: "/api/auth/update-profile-image",
            method: .POST,
            body: bodyData,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("프로필 이미지 URL 업데이트 실패: \(error)")
                }
            },
            receiveValue: { (user: User) in
                self.authManager.currentUser = user
            }
        )
        .store(in: &cancellables)
    }
}

struct SettingsRow<Content: View>: View {
    let icon: String
    let title: String
    let subtitle: String?
    let content: () -> Content
    
    init(icon: String, title: String, subtitle: String? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.content = content
    }
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.purple)
                .frame(width: 24, height: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            content()
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
    }
}

struct ProfileEditView: View {
    let user: User?
    let onSave: (User) -> Void
    @Environment(\.dismiss) private var dismiss
    
    @State private var displayName: String
    @State private var businessName: String
    @State private var email: String
    
    init(user: User?, onSave: @escaping (User) -> Void) {
        self.user = user
        self.onSave = onSave
        self._displayName = State(initialValue: user?.displayName ?? "")
        self._businessName = State(initialValue: user?.businessAddress ?? "")
        self._email = State(initialValue: user?.email ?? "")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("기본 정보") {
                    TextField("표시 이름", text: $displayName)
                    TextField("이메일", text: $email)
                        .keyboardType(.emailAddress)
                }
                
                Section("비즈니스 정보") {
                    TextField("회사명/주소", text: $businessName)
                }
            }
            .navigationTitle("프로필 편집")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("저장") {
                        if let user = user {
                            let updatedUser = User(
                                id: user.id,
                                username: user.username,
                                displayName: displayName,
                                email: email.isEmpty ? nil : email,
                                phoneNumber: user.phoneNumber,
                                profileImageUrl: user.profileImageUrl,
                                profilePicture: user.profilePicture,
                                initials: user.initials,
                                businessAddress: businessName.isEmpty ? nil : businessName,
                                isOnline: user.isOnline,
                                lastSeen: user.lastSeen,
                                createdAt: user.createdAt
                            )
                            onSave(updatedUser)
                        }
                        dismiss()
                    }
                    .disabled(displayName.isEmpty)
                }
            }
        }
    }
}

// MARK: - Additional Settings Views (Placeholder)
struct NotificationSettingsView: View {
    var body: some View {
        Text("알림 설정")
            .navigationTitle("알림 설정")
    }
}

struct PrivacySettingsView: View {
    var body: some View {
        Text("개인정보 보호 설정")
            .navigationTitle("개인정보 보호")
    }
}

struct DataStorageView: View {
    var body: some View {
        Text("데이터 및 저장공간")
            .navigationTitle("데이터 및 저장공간")
    }
}

struct HelpSupportView: View {
    var body: some View {
        Text("도움말 및 지원")
            .navigationTitle("도움말 및 지원")
    }
}

struct AppInfoView: View {
    var body: some View {
        Text("앱 정보")
            .navigationTitle("앱 정보")
    }
}

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var selectedImage: UIImage?
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.selectedImage = image
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}