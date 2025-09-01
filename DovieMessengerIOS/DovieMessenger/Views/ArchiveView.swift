//
//  ArchiveView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct ArchiveView: View {
    @State private var archives: [ArchiveItem] = []
    @State private var searchText = ""
    @State private var selectedCategory: ArchiveCategory = .all
    
    var filteredArchives: [ArchiveItem] {
        var filtered = archives
        
        // 카테고리 필터
        if selectedCategory != .all {
            filtered = filtered.filter { $0.category == selectedCategory }
        }
        
        // 검색 필터
        if !searchText.isEmpty {
            filtered = filtered.filter { archive in
                archive.title.localizedCaseInsensitiveContains(searchText) ||
                archive.content.localizedCaseInsensitiveContains(searchText) ||
                archive.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 검색 바
                HStack {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("아카이브 검색", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                .padding(.horizontal)
                .padding(.top, 8)
                
                // 카테고리 필터
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(ArchiveCategory.allCases, id: \.self) { category in
                            Button(action: {
                                selectedCategory = category
                            }) {
                                Text(category.displayName)
                                    .font(.subheadline)
                                    .foregroundColor(selectedCategory == category ? .white : .primary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(
                                        Capsule().fill(
                                            selectedCategory == category ?
                                            LinearGradient(colors: [.purple, .blue], startPoint: .leading, endPoint: .trailing) :
                                            Color(.systemGray6)
                                        )
                                    )
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)
                
                // 아카이브 목록
                List {
                    ForEach(filteredArchives) { archive in
                        NavigationLink(destination: ArchiveDetailView(archive: archive)) {
                            ArchiveRowView(archive: archive)
                        }
                    }
                    .onDelete(perform: deleteArchives)
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("아카이브")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // TODO: 아카이브 추가
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .onAppear {
            loadArchives()
        }
    }
    
    private func loadArchives() {
        // TODO: API에서 아카이브 로드
        // 샘플 데이터
        archives = [
            ArchiveItem(
                id: 1,
                title: "회의록 - 프로젝트 킥오프",
                content: "새 프로젝트에 대한 킥오프 미팅 내용...",
                category: .documents,
                tags: ["회의록", "프로젝트"],
                createdAt: Date()
            ),
            ArchiveItem(
                id: 2,
                title: "팀 사진",
                content: "팀 빌딩 이벤트에서 찍은 사진",
                category: .images,
                tags: ["팀", "사진"],
                createdAt: Date().addingTimeInterval(-86400)
            )
        ]
    }
    
    private func deleteArchives(offsets: IndexSet) {
        archives.remove(atOffsets: offsets)
    }
}

struct ArchiveRowView: View {
    let archive: ArchiveItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // 카테고리 아이콘
                Image(systemName: archive.category.iconName)
                    .foregroundColor(archive.category.color)
                    .font(.title2)
                    .frame(width: 30)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(archive.title)
                        .font(.headline)
                        .lineLimit(1)
                    
                    Text(archive.content)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                Text(formatDate(archive.createdAt))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // 태그들
            if !archive.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(archive.tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.caption)
                                .foregroundColor(.purple)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.purple.opacity(0.1))
                                .cornerRadius(12)
                        }
                    }
                    .padding(.leading, 30) // 아이콘 너비만큼 들여쓰기
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if Calendar.current.isToday(date) {
            formatter.dateFormat = "HH:mm"
        } else if Calendar.current.isYesterday(date) {
            return "어제"
        } else {
            formatter.dateFormat = "MM/dd"
        }
        return formatter.string(from: date)
    }
}

struct ArchiveDetailView: View {
    let archive: ArchiveItem
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // 헤더 정보
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: archive.category.iconName)
                            .foregroundColor(archive.category.color)
                            .font(.title)
                        
                        VStack(alignment: .leading) {
                            Text(archive.title)
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            Text(formatDetailDate(archive.createdAt))
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    
                    // 태그들
                    if !archive.tags.isEmpty {
                        FlowLayout(spacing: 8) {
                            ForEach(archive.tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.caption)
                                    .foregroundColor(.purple)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.purple.opacity(0.1))
                                    .cornerRadius(16)
                            }
                        }
                    }
                }
                .padding()
                
                Divider()
                
                // 내용
                Text(archive.content)
                    .font(.body)
                    .padding()
                
                Spacer()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button(action: {
                        // TODO: 공유 기능
                    }) {
                        Label("공유", systemImage: "square.and.arrow.up")
                    }
                    
                    Button(action: {
                        // TODO: 편집 기능
                    }) {
                        Label("편집", systemImage: "pencil")
                    }
                    
                    Button(action: {
                        // TODO: 삭제 기능
                    }) {
                        Label("삭제", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }
    
    private func formatDetailDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// 플로우 레이아웃 헬퍼
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.bounds
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (offset, subview) in zip(result.offsets, subviews) {
            subview.place(at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y), proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var bounds = CGSize.zero
        var offsets: [CGPoint] = []
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var offset = CGPoint.zero
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let subviewSize = subview.sizeThatFits(.unspecified)
                
                if offset.x + subviewSize.width > maxWidth && offset.x > 0 {
                    offset.x = 0
                    offset.y += lineHeight + spacing
                    lineHeight = 0
                }
                
                offsets.append(offset)
                offset.x += subviewSize.width + spacing
                lineHeight = max(lineHeight, subviewSize.height)
                
                bounds.width = max(bounds.width, offset.x - spacing)
            }
            
            bounds.height = offset.y + lineHeight
        }
    }
}

// MARK: - 모델 정의
struct ArchiveItem: Identifiable {
    let id: Int
    let title: String
    let content: String
    let category: ArchiveCategory
    let tags: [String]
    let createdAt: Date
}

enum ArchiveCategory: String, CaseIterable {
    case all = "all"
    case documents = "documents"
    case images = "images"
    case videos = "videos"
    case voice = "voice"
    case links = "links"
    
    var displayName: String {
        switch self {
        case .all: return "전체"
        case .documents: return "문서"
        case .images: return "이미지"
        case .videos: return "동영상"
        case .voice: return "음성"
        case .links: return "링크"
        }
    }
    
    var iconName: String {
        switch self {
        case .all: return "tray.full"
        case .documents: return "doc.text"
        case .images: return "photo"
        case .videos: return "video"
        case .voice: return "mic"
        case .links: return "link"
        }
    }
    
    var color: Color {
        switch self {
        case .all: return .primary
        case .documents: return .blue
        case .images: return .green
        case .videos: return .red
        case .voice: return .orange
        case .links: return .purple
        }
    }
}

#Preview {
    ArchiveView()
}