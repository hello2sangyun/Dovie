//
//  ContactsView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import Combine

struct ContactsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var chatManager: ChatManager
    @State private var searchText = ""
    @State private var contacts: [User] = []
    @State private var favorites: [User] = []
    @State private var isLoading = false
    @State private var showingQRScanner = false
    @State private var showingAddContact = false
    @State private var cancellables = Set<AnyCancellable>()
    
    var filteredContacts: [User] {
        if searchText.isEmpty {
            return contacts
        } else {
            return contacts.filter { contact in
                contact.displayName.localizedCaseInsensitiveContains(searchText) ||
                contact.username.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                searchBar
                
                ScrollView {
                    LazyVStack(spacing: 0) {
                        if !favorites.isEmpty {
                            favoritesSection
                            Divider()
                                .padding(.vertical, 8)
                        }
                        
                        contactsSection
                    }
                    .padding(.horizontal)
                }
                .refreshable {
                    loadContacts()
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("연락처")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddContact = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        showingQRScanner = true
                    }) {
                        Image(systemName: "qrcode.viewfinder")
                    }
                }
            }
            .sheet(isPresented: $showingQRScanner) {
                QRScannerView { qrData in
                    handleQRCode(qrData)
                }
            }
            .sheet(isPresented: $showingAddContact) {
                AddContactView { userId in
                    addContactById(userId)
                }
            }
            .onAppear {
                loadContacts()
                loadFavorites()
            }
        }
    }
    
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("연락처 검색", text: $searchText)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
        .padding(.horizontal)
    }
    
    private var favoritesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("즐겨찾기")
                .font(.headline)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(favorites) { favorite in
                        FavoriteContactView(user: favorite) {
                            startChat(with: favorite)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    private var contactsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("모든 연락처")
                .font(.headline)
                .padding(.horizontal)
                .padding(.bottom, 8)
            
            LazyVStack(spacing: 0) {
                ForEach(filteredContacts) { contact in
                    ContactRowView(
                        user: contact,
                        isFavorite: favorites.contains { $0.id == contact.id },
                        onTap: {
                            startChat(with: contact)
                        },
                        onFavoriteToggle: {
                            toggleFavorite(contact)
                        }
                    )
                    .background(Color(.systemBackground))
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }
    
    private func loadContacts() {
        isLoading = true
        
        APIService.shared.request<[User]>(
            endpoint: "/api/contacts",
            method: .GET,
            body: nil,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                self.isLoading = false
                if case .failure(let error) = completion {
                    print("연락처 로드 실패: \(error)")
                }
            },
            receiveValue: { (contacts: [User]) in
                self.contacts = contacts
            }
        )
        .store(in: &cancellables)
    }
    
    private func loadFavorites() {
        APIService.shared.request<[User]>(
            endpoint: "/api/contacts/favorites",
            method: .GET,
            body: nil,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("즐겨찾기 로드 실패: \(error)")
                }
            },
            receiveValue: { (favorites: [User]) in
                self.favorites = favorites
            }
        )
        .store(in: &cancellables)
    }
    
    private func startChat(with user: User) {
        chatManager.createChatRoom(
            name: user.displayName,
            participantIds: [Int(user.id) ?? 0],
            isGroup: false
        )
    }
    
    private func toggleFavorite(_ user: User) {
        let isFavorite = favorites.contains { $0.id == user.id }
        let endpoint = isFavorite ? "/api/contacts/\(user.id)/unfavorite" : "/api/contacts/\(user.id)/favorite"
        
        APIService.shared.request<EmptyResponse>(
            endpoint: endpoint,
            method: .POST,
            body: nil,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("즐겨찾기 변경 실패: \(error)")
                }
            },
            receiveValue: { (response: EmptyResponse) in
                if isFavorite {
                    self.favorites.removeAll { $0.id == user.id }
                } else {
                    self.favorites.append(user)
                }
            }
        )
        .store(in: &cancellables)
    }
    
    private func handleQRCode(_ qrData: String) {
        // QR 코드에서 사용자 ID 추출
        if let userId = extractUserIdFromQR(qrData) {
            addContactById(userId)
        }
    }
    
    private func extractUserIdFromQR(_ qrData: String) -> String? {
        // QR 코드 형식: "dovie://user/{userId}"
        if qrData.hasPrefix("dovie://user/") {
            return String(qrData.dropFirst("dovie://user/".count))
        }
        return nil
    }
    
    private func addContactById(_ userId: String) {
        let body = ["userId": userId]
        
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }
        
        APIService.shared.request<User>(
            endpoint: "/api/contacts/add",
            method: .POST,
            body: bodyData,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("연락처 추가 실패: \(error)")
                }
            },
            receiveValue: { (user: User) in
                self.contacts.append(user)
            }
        )
        .store(in: &cancellables)
    }
}

struct ContactRowView: View {
    let user: User
    let isFavorite: Bool
    let onTap: () -> Void
    let onFavoriteToggle: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            // 프로필 이미지
            AsyncImage(url: URL(string: user.profileImageURL ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color.purple.gradient)
                    .overlay(
                        Text(user.computedInitials)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                    )
            }
            .frame(width: 50, height: 50)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.primary)
                
                if let businessAddress = user.businessAddress {
                    Text(businessAddress)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                Text("@\(user.username)")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // 온라인 상태
            if user.isOnline {
                Circle()
                    .fill(Color.green)
                    .frame(width: 8, height: 8)
            }
            
            // 즐겨찾기 버튼
            Button(action: onFavoriteToggle) {
                Image(systemName: isFavorite ? "star.fill" : "star")
                    .foregroundColor(isFavorite ? .yellow : .gray)
            }
            .buttonStyle(BorderlessButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .onTapGesture {
            onTap()
        }
    }
}

struct FavoriteContactView: View {
    let user: User
    let onTap: () -> Void
    
    var body: some View {
        VStack(spacing: 8) {
            AsyncImage(url: URL(string: user.profileImageURL ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color.purple.gradient)
                    .overlay(
                        Text(user.computedInitials)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            Text(user.displayName.split(separator: " ").first ?? "")
                .font(.system(size: 12, weight: .medium))
                .lineLimit(1)
                .foregroundColor(.primary)
        }
        .onTapGesture {
            onTap()
        }
    }
}

struct QRScannerView: View {
    let onQRScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("QR 코드를 스캔하여 친구를 추가하세요")
                    .font(.title2)
                    .multilineTextAlignment(.center)
                    .padding()
                
                // QR 스캐너 뷰 (실제 카메라 구현은 추가 작업 필요)
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.purple, lineWidth: 2)
                    .frame(width: 250, height: 250)
                    .overlay(
                        Text("QR 스캐너")
                            .foregroundColor(.purple)
                    )
                
                Spacer()
            }
            .navigationTitle("QR 스캔")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct AddContactView: View {
    let onAddContact: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var userId = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                TextField("사용자 ID 입력", text: $userId)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding()
                
                Button("연락처 추가") {
                    onAddContact(userId)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .disabled(userId.isEmpty)
                
                Spacer()
            }
            .navigationTitle("연락처 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        dismiss()
                    }
                }
            }
        }
    }
}