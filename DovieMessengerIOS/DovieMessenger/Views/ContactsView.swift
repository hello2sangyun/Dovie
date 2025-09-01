//
//  ContactsView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct ContactsView: View {
    @State private var contacts: [Contact] = []
    @State private var searchText = ""
    @State private var showingAddContact = false
    @State private var showingQRScanner = false
    
    private let apiService = APIService.shared
    
    var filteredContacts: [Contact] {
        if searchText.isEmpty {
            return contacts
        } else {
            return contacts.filter { contact in
                contact.contactUser?.displayName.localizedCaseInsensitiveContains(searchText) == true ||
                contact.contactUser?.username.localizedCaseInsensitiveContains(searchText) == true ||
                contact.nickname?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // 검색 바
                HStack {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("연락처 검색", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    
                    Button(action: {
                        showingQRScanner = true
                    }) {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.title2)
                            .foregroundColor(.purple)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                
                // 즐겨찾기 연락처
                if !contacts.filter({ $0.isFavorite }).isEmpty {
                    VStack(alignment: .leading) {
                        HStack {
                            Text("즐겨찾기")
                                .font(.headline)
                                .padding(.horizontal)
                            Spacer()
                        }
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(contacts.filter { $0.isFavorite }) { contact in
                                    FavoriteContactView(contact: contact)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                
                // 연락처 목록
                List {
                    ForEach(filteredContacts) { contact in
                        ContactRowView(contact: contact)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button("삭제") {
                                    deleteContact(contact)
                                }
                                .tint(.red)
                                
                                Button(contact.isFavorite ? "즐겨찾기 해제" : "즐겨찾기") {
                                    toggleFavorite(contact)
                                }
                                .tint(.orange)
                                
                                Button(contact.isBlocked ? "차단 해제" : "차단") {
                                    toggleBlock(contact)
                                }
                                .tint(.gray)
                            }
                    }
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("연락처")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddContact = true
                    }) {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddContact) {
                AddContactView { username in
                    addContact(username: username)
                }
            }
            .sheet(isPresented: $showingQRScanner) {
                QRScannerView { qrCode in
                    handleQRCode(qrCode)
                }
            }
        }
        .onAppear {
            loadContacts()
        }
    }
    
    private func loadContacts() {
        // TODO: API에서 연락처 로드
    }
    
    private func addContact(username: String) {
        // TODO: 연락처 추가 API 호출
    }
    
    private func deleteContact(_ contact: Contact) {
        // TODO: 연락처 삭제 API 호출
    }
    
    private func toggleFavorite(_ contact: Contact) {
        // TODO: 즐겨찾기 토글 API 호출
    }
    
    private func toggleBlock(_ contact: Contact) {
        // TODO: 차단 토글 API 호출
    }
    
    private func handleQRCode(_ qrCode: String) {
        // TODO: QR 코드로 친구 추가
    }
}

struct ContactRowView: View {
    let contact: Contact
    
    var body: some View {
        HStack {
            // 프로필 이미지
            AsyncImage(url: URL(string: contact.contactUser?.profilePicture ?? "")) { image in
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
                        Text(contact.contactUser?.displayName.prefix(1) ?? "?")
                            .font(.title2)
                            .foregroundColor(.purple)
                    )
            }
            .frame(width: 50, height: 50)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(contact.contactUser?.isOnline == true ? Color.green : Color.clear, lineWidth: 2)
            )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(contact.nickname ?? contact.contactUser?.displayName ?? "Unknown")
                    .font(.headline)
                
                Text("@\(contact.contactUser?.username ?? "unknown")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                if contact.contactUser?.isOnline == true {
                    Text("온라인")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if let lastSeen = contact.contactUser?.lastSeen {
                    Text("마지막 접속: \(formatLastSeen(lastSeen))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            VStack {
                if contact.isFavorite {
                    Image(systemName: "star.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                }
                
                if contact.isBlocked {
                    Image(systemName: "hand.raised.fill")
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
        }
        .opacity(contact.isBlocked ? 0.5 : 1.0)
    }
    
    private func formatLastSeen(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct FavoriteContactView: View {
    let contact: Contact
    
    var body: some View {
        VStack(spacing: 8) {
            AsyncImage(url: URL(string: contact.contactUser?.profilePicture ?? "")) { image in
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
                        Text(contact.contactUser?.displayName.prefix(1) ?? "?")
                            .font(.title)
                            .foregroundColor(.purple)
                    )
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(contact.contactUser?.isOnline == true ? Color.green : Color.clear, lineWidth: 2)
            )
            
            Text(contact.nickname ?? contact.contactUser?.displayName ?? "Unknown")
                .font(.caption)
                .lineLimit(1)
                .frame(width: 60)
        }
    }
}

struct AddContactView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var username = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    let onAddContact: (String) -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("사용자명")
                        .font(.headline)
                    
                    TextField("사용자명을 입력하세요", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                }
                .padding(.horizontal)
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.horizontal)
                }
                
                Button(action: {
                    onAddContact(username)
                    presentationMode.wrappedValue.dismiss()
                }) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text("연락처 추가")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(username.isEmpty || isLoading)
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.top)
            .navigationTitle("연락처 추가")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

struct QRScannerView: View {
    @Environment(\.presentationMode) var presentationMode
    let onQRCodeScanned: (String) -> Void
    
    var body: some View {
        NavigationView {
            VStack {
                Text("QR 코드를 스캔하여 친구를 추가하세요")
                    .font(.headline)
                    .padding()
                
                // TODO: 실제 카메라 QR 스캐너 구현
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray5))
                    .frame(width: 300, height: 300)
                    .overlay(
                        VStack {
                            Image(systemName: "qrcode.viewfinder")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                            
                            Text("QR 스캐너")
                                .font(.headline)
                                .foregroundColor(.secondary)
                        }
                    )
                
                Spacer()
            }
            .navigationTitle("QR 스캔")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("닫기") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    ContactsView()
}