//
//  SpaceView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI
import Combine

struct SpaceView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var posts: [SpacePost] = []
    @State private var showingCreatePost = false
    @State private var isLoading = false
    @State private var cancellables = Set<AnyCancellable>()
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    // 게시물 작성 카드
                    createPostCard
                    
                    // 게시물 목록
                    ForEach(posts) { post in
                        SpacePostView(post: post, currentUser: authManager.currentUser) { action, post in
                            handlePostAction(action, post: post)
                        }
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("비즈니스 스페이스")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingCreatePost = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.purple)
                    }
                }
            }
            .sheet(isPresented: $showingCreatePost) {
                CreatePostView { newPost in
                    createPost(newPost)
                }
            }
            .refreshable {
                loadPosts()
            }
            .onAppear {
                loadPosts()
            }
        }
    }
    
    private var createPostCard: some View {
        HStack(spacing: 12) {
            // 사용자 프로필 이미지
            AsyncImage(url: URL(string: authManager.currentUser?.profileImageURL ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color.purple.gradient)
                    .overlay(
                        Text(authManager.currentUser?.computedInitials ?? "??")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                    )
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())
            
            Button(action: {
                showingCreatePost = true
            }) {
                HStack {
                    Text("무엇을 공유하고 싶으신가요?")
                        .foregroundColor(.secondary)
                        .font(.system(size: 16))
                    Spacer()
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(20)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private func loadPosts() {
        isLoading = true
        
        APIService.shared.request<[SpacePost]>(
            endpoint: "/api/space/posts",
            method: .GET,
            body: nil,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                self.isLoading = false
                if case .failure(let error) = completion {
                    print("게시물 로드 실패: \(error)")
                }
            },
            receiveValue: { (posts: [SpacePost]) in
                self.posts = posts
            }
        )
        .store(in: &cancellables)
    }
    
    private func createPost(_ newPost: CreatePostRequest) {
        let body = [
            "content": newPost.content,
            "imageUrl": newPost.imageUrl ?? "",
            "type": newPost.type
        ]
        
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }
        
        APIService.shared.request<SpacePost>(
            endpoint: "/api/space/posts",
            method: .POST,
            body: bodyData,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("게시물 작성 실패: \(error)")
                }
            },
            receiveValue: { (post: SpacePost) in
                self.posts.insert(post, at: 0)
            }
        )
        .store(in: &cancellables)
    }
    
    private func handlePostAction(_ action: PostAction, post: SpacePost) {
        switch action {
        case .like:
            toggleLike(post)
        case .comment:
            // 댓글 기능 구현
            break
        case .share:
            // 공유 기능 구현
            break
        }
    }
    
    private func toggleLike(_ post: SpacePost) {
        let endpoint = post.isLiked ? "/api/space/posts/\(post.id)/unlike" : "/api/space/posts/\(post.id)/like"
        
        APIService.shared.request<LikeResponse>(
            endpoint: endpoint,
            method: .POST,
            body: nil,
            headers: [:]
        )
        .sink(
            receiveCompletion: { (completion: Subscribers.Completion<Error>) in
                if case .failure(let error) = completion {
                    print("좋아요 변경 실패: \(error)")
                }
            },
            receiveValue: { (response: LikeResponse) in
                if let index = self.posts.firstIndex(where: { $0.id == post.id }) {
                    self.posts[index].isLiked.toggle()
                    self.posts[index].likesCount = response.likesCount
                }
            }
        )
        .store(in: &cancellables)
    }
}

struct SpacePostView: View {
    let post: SpacePost
    let currentUser: User?
    let onAction: (PostAction, SpacePost) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 사용자 정보 헤더
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: post.author.profileImageURL ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.purple.gradient)
                        .overlay(
                            Text(post.author.computedInitials)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 50, height: 50)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(post.author.displayName)
                        .font(.system(size: 16, weight: .semibold))
                    
                    if let businessAddress = post.author.businessAddress {
                        Text(businessAddress)
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    
                    Text(formatDate(post.createdAt))
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: {}) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.secondary)
                }
            }
            
            // 게시물 내용
            Text(post.content)
                .font(.system(size: 16))
                .lineLimit(nil)
            
            // 이미지 (있는 경우)
            if let imageUrl = post.imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray5))
                        .frame(height: 200)
                        .overlay(
                            ProgressView()
                        )
                }
                .cornerRadius(12)
            }
            
            // 액션 버튼들
            HStack(spacing: 20) {
                Button(action: {
                    onAction(.like, post)
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: post.isLiked ? "heart.fill" : "heart")
                            .foregroundColor(post.isLiked ? .red : .secondary)
                        Text("\(post.likesCount)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
                
                Button(action: {
                    onAction(.comment, post)
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left")
                            .foregroundColor(.secondary)
                        Text("\(post.commentsCount)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
                
                Button(action: {
                    onAction(.share, post)
                }) {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct CreatePostView: View {
    let onCreatePost: (CreatePostRequest) -> Void
    @Environment(\.dismiss) private var dismiss
    
    @State private var content = ""
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var isUploading = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 텍스트 입력
                    TextEditor(text: $content)
                        .font(.system(size: 16))
                        .frame(minHeight: 150)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    
                    // 이미지 선택
                    if let selectedImage = selectedImage {
                        Image(uiImage: selectedImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 200)
                            .cornerRadius(12)
                            .overlay(
                                Button(action: {
                                    self.selectedImage = nil
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.red)
                                        .background(Color.white)
                                        .clipShape(Circle())
                                }
                                .offset(x: 10, y: -10),
                                alignment: .topTrailing
                            )
                    }
                    
                    // 이미지 추가 버튼
                    Button(action: {
                        showingImagePicker = true
                    }) {
                        HStack {
                            Image(systemName: "photo")
                            Text("이미지 추가")
                        }
                        .foregroundColor(.purple)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(12)
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("새 게시물")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("게시") {
                        createPost()
                    }
                    .disabled(content.isEmpty || isUploading)
                }
            }
            .sheet(isPresented: $showingImagePicker) {
                DovieImagePicker(selectedImage: $selectedImage)
            }
        }
    }
    
    private func createPost() {
        if let image = selectedImage {
            uploadImageAndCreatePost(image)
        } else {
            let postRequest = CreatePostRequest(
                content: content,
                imageUrl: nil,
                type: "text"
            )
            onCreatePost(postRequest)
            dismiss()
        }
    }
    
    private func uploadImageAndCreatePost(_ image: UIImage) {
        isUploading = true
        // 이미지 업로드 로직 구현 후 게시물 생성
        // 현재는 임시로 이미지 없이 생성
        let postRequest = CreatePostRequest(
            content: content,
            imageUrl: nil,
            type: "text"
        )
        onCreatePost(postRequest)
        dismiss()
    }
}

// MARK: - Models
struct SpacePost: Codable, Identifiable {
    let id: String
    let content: String
    let imageUrl: String?
    let author: User
    var likesCount: Int
    var commentsCount: Int
    var isLiked: Bool
    let createdAt: Date
    let type: String
}

struct CreatePostRequest {
    let content: String
    let imageUrl: String?
    let type: String
}

struct LikeResponse: Codable {
    let success: Bool
    let likesCount: Int
}

enum PostAction {
    case like
    case comment
    case share
}