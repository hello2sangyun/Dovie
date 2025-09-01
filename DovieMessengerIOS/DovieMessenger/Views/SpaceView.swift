//
//  SpaceView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct SpaceView: View {
    @State private var posts: [BusinessPost] = []
    @State private var isLoading = false
    @State private var showingCreatePost = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(posts) { post in
                        BusinessPostView(post: post)
                    }
                    
                    if isLoading {
                        ProgressView()
                            .frame(height: 100)
                    }
                }
                .padding(.horizontal)
            }
            .refreshable {
                await loadPosts()
            }
            .navigationTitle("비즈니스 스페이스")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingCreatePost = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreatePost) {
                CreatePostView()
            }
        }
        .onAppear {
            Task {
                await loadPosts()
            }
        }
    }
    
    private func loadPosts() async {
        isLoading = true
        // TODO: API에서 게시물 로드
        await Task.sleep(1_000_000_000) // 1초 시뮬레이션
        isLoading = false
    }
}

struct BusinessPostView: View {
    let post: BusinessPost
    @State private var isExpanded = false
    @State private var showingComments = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 작성자 정보
            HStack {
                AsyncImage(url: URL(string: post.author?.profilePicture ?? "")) { image in
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
                            Text(post.author?.displayName.prefix(1) ?? "?")
                                .foregroundColor(.purple)
                        )
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(post.author?.displayName ?? "Unknown")
                        .font(.headline)
                    
                    if let businessName = post.author?.businessName {
                        Text(businessName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Text(formatPostDate(post.createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: {
                    // TODO: 더보기 메뉴
                }) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.secondary)
                }
            }
            
            // 게시물 내용
            Text(post.content)
                .font(.body)
                .lineLimit(isExpanded ? nil : 3)
                .onTapGesture {
                    withAnimation {
                        isExpanded.toggle()
                    }
                }
            
            // 이미지
            if let imageUrl = post.imageUrl {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .cornerRadius(12)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray5))
                        .frame(height: 200)
                        .overlay(
                            ProgressView()
                        )
                }
            }
            
            // 링크 미리보기
            if let linkUrl = post.linkUrl,
               let linkTitle = post.linkTitle {
                LinkPreviewView(
                    url: linkUrl,
                    title: linkTitle,
                    description: post.linkDescription
                )
            }
            
            // 좋아요, 댓글, 공유 버튼
            HStack {
                Button(action: {
                    // TODO: 좋아요 토글
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: post.isLiked ? "heart.fill" : "heart")
                            .foregroundColor(post.isLiked ? .red : .secondary)
                        
                        if post.likesCount > 0 {
                            Text("\(post.likesCount)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Button(action: {
                    showingComments = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left")
                            .foregroundColor(.secondary)
                        
                        if post.commentsCount > 0 {
                            Text("\(post.commentsCount)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Button(action: {
                    // TODO: 공유 기능
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.secondary)
                        
                        if post.sharesCount > 0 {
                            Text("\(post.sharesCount)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        .sheet(isPresented: $showingComments) {
            CommentsView(post: post)
        }
    }
    
    private func formatPostDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct LinkPreviewView: View {
    let url: String
    let title: String
    let description: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "link")
                    .foregroundColor(.blue)
                
                Text(URL(string: url)?.host ?? url)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(title)
                .font(.headline)
                .lineLimit(2)
            
            if let description = description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
        .onTapGesture {
            if let url = URL(string: url) {
                UIApplication.shared.open(url)
            }
        }
    }
}

struct CreatePostView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var postContent = ""
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var isPosting = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                // 텍스트 입력
                TextEditor(text: $postContent)
                    .font(.body)
                    .frame(minHeight: 200)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                
                // 선택된 이미지
                if let selectedImage = selectedImage {
                    Image(uiImage: selectedImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 200)
                        .cornerRadius(8)
                        .overlay(
                            Button(action: {
                                self.selectedImage = nil
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white)
                                    .background(Color.black.opacity(0.6))
                                    .clipShape(Circle())
                            }
                            .padding(8),
                            alignment: .topTrailing
                        )
                }
                
                // 도구 바
                HStack {
                    Button(action: {
                        showingImagePicker = true
                    }) {
                        Image(systemName: "photo")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                    
                    Spacer()
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("새 게시물")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("취소") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("게시") {
                        createPost()
                    }
                    .disabled(postContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPosting)
                }
            }
        }
        .sheet(isPresented: $showingImagePicker) {
            // TODO: 이미지 피커 구현
        }
    }
    
    private func createPost() {
        isPosting = true
        // TODO: 게시물 생성 API 호출
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isPosting = false
            presentationMode.wrappedValue.dismiss()
        }
    }
}

struct CommentsView: View {
    let post: BusinessPost
    @Environment(\.presentationMode) var presentationMode
    @State private var comments: [BusinessPostComment] = []
    @State private var newComment = ""
    
    var body: some View {
        NavigationView {
            VStack {
                // 댓글 목록
                List(comments) { comment in
                    CommentRowView(comment: comment)
                }
                
                Divider()
                
                // 댓글 입력
                HStack {
                    TextField("댓글을 입력하세요...", text: $newComment)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button("게시") {
                        postComment()
                    }
                    .disabled(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding()
            }
            .navigationTitle("댓글")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("닫기") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
        .onAppear {
            loadComments()
        }
    }
    
    private func loadComments() {
        // TODO: 댓글 로드
    }
    
    private func postComment() {
        // TODO: 댓글 게시
        newComment = ""
    }
}

struct CommentRowView: View {
    let comment: BusinessPostComment
    
    var body: some View {
        HStack(alignment: .top) {
            AsyncImage(url: URL(string: comment.author?.profilePicture ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color(.systemGray5))
                    .overlay(
                        Text(comment.author?.displayName.prefix(1) ?? "?")
                            .foregroundColor(.secondary)
                    )
            }
            .frame(width: 30, height: 30)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(comment.author?.displayName ?? "Unknown")
                        .font(.headline)
                    
                    Spacer()
                    
                    Text(formatCommentDate(comment.createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(comment.content)
                    .font(.body)
            }
        }
    }
    
    private func formatCommentDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

#Preview {
    SpaceView()
}