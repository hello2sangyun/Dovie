//
//  MessageInputView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct MessageInputView: View {
    @Binding var messageText: String
    @Binding var showingAttachments: Bool
    @Binding var showingVoiceRecorder: Bool
    @Binding var isRecording: Bool
    @FocusState.Binding var isTextFieldFocused: Bool
    
    let onSendMessage: () -> Void
    let onStartRecording: () -> Void
    let onStopRecording: () -> Void
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            // 첨부파일 버튼
            Button(action: {
                showingAttachments = true
            }) {
                Image(systemName: "plus")
                    .font(.title2)
                    .foregroundColor(.purple)
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(Color(.systemGray6)))
            }
            
            // 메시지 입력 필드
            HStack(alignment: .bottom, spacing: 8) {
                TextField("메시지 입력...", text: $messageText, axis: .vertical)
                    .textFieldStyle(PlainTextFieldStyle())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(20)
                    .focused($isTextFieldFocused)
                    .lineLimit(1...5)
                
                // 전송/음성녹음 버튼
                if messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button(action: {
                        if isRecording {
                            onStopRecording()
                        } else {
                            onStartRecording()
                        }
                    }) {
                        Image(systemName: isRecording ? "stop.circle.fill" : "mic")
                            .font(.title2)
                            .foregroundColor(isRecording ? .red : .purple)
                            .frame(width: 36, height: 36)
                            .background(Circle().fill(isRecording ? Color.red.opacity(0.1) : Color(.systemGray6)))
                            .scaleEffect(isRecording ? 1.1 : 1.0)
                            .animation(.easeInOut(duration: 0.1), value: isRecording)
                    }
                } else {
                    Button(action: onSendMessage) {
                        Image(systemName: "paperplane.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(
                                Circle().fill(
                                    LinearGradient(
                                        colors: [.purple, .blue],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            )
                    }
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
}

enum AttachmentType {
    case image
    case document
}

struct AttachmentPickerView: View {
    @Environment(\.presentationMode) var presentationMode
    let onAttachmentSelected: (AttachmentType, Data) -> Void
    
    var body: some View {
        NavigationView {
            List {
                Button(action: {
                    // TODO: 사진 선택 구현
                }) {
                    HStack {
                        Image(systemName: "photo")
                            .foregroundColor(.blue)
                            .frame(width: 30)
                        Text("사진 선택")
                    }
                }
                
                Button(action: {
                    // TODO: 카메라 촬영 구현
                }) {
                    HStack {
                        Image(systemName: "camera")
                            .foregroundColor(.green)
                            .frame(width: 30)
                        Text("사진 촬영")
                    }
                }
                
                Button(action: {
                    // TODO: 문서 선택 구현
                }) {
                    HStack {
                        Image(systemName: "doc")
                            .foregroundColor(.orange)
                            .frame(width: 30)
                        Text("파일 선택")
                    }
                }
                
                Button(action: {
                    // TODO: 위치 공유 구현
                }) {
                    HStack {
                        Image(systemName: "location")
                            .foregroundColor(.red)
                            .frame(width: 30)
                        Text("위치 공유")
                    }
                }
            }
            .navigationTitle("첨부파일")
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

struct VoiceRecorderView: View {
    @Environment(\.presentationMode) var presentationMode
    @Binding var isRecording: Bool
    let onRecordingCompleted: (Data, Int) -> Void
    
    @State private var recordingTime: TimeInterval = 0
    @State private var timer: Timer?
    @State private var audioLevels: [CGFloat] = Array(repeating: 0.3, count: 50)
    
    var body: some View {
        VStack(spacing: 30) {
            Text("음성 메시지 녹음")
                .font(.title2)
                .padding(.top)
            
            // 오디오 레벨 시각화
            HStack(alignment: .center, spacing: 2) {
                ForEach(0..<audioLevels.count, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 1)
                        .fill(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .bottom,
                                endPoint: .top
                            )
                        )
                        .frame(width: 3, height: audioLevels[index] * 100)
                        .animation(.easeInOut(duration: 0.1), value: audioLevels[index])
                }
            }
            .frame(height: 100)
            
            // 녹음 시간
            Text(formatTime(recordingTime))
                .font(.title)
                .monospacedDigit()
            
            // 컨트롤 버튼들
            HStack(spacing: 50) {
                // 취소 버튼
                Button(action: {
                    stopRecording()
                    presentationMode.wrappedValue.dismiss()
                }) {
                    Image(systemName: "xmark")
                        .font(.title)
                        .foregroundColor(.red)
                        .frame(width: 60, height: 60)
                        .background(Circle().fill(Color(.systemGray6)))
                }
                
                // 녹음 버튼
                Button(action: {
                    if isRecording {
                        stopRecording()
                    } else {
                        startRecording()
                    }
                }) {
                    Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                        .font(.largeTitle)
                        .foregroundColor(.white)
                        .frame(width: 80, height: 80)
                        .background(
                            Circle().fill(
                                isRecording ? Color.red : 
                                LinearGradient(
                                    colors: [.purple, .blue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        )
                        .scaleEffect(isRecording ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 0.1), value: isRecording)
                }
                
                // 전송 버튼
                Button(action: {
                    stopRecording()
                    // TODO: 실제 오디오 데이터와 지속시간 전달
                    let dummyAudioData = Data()
                    onRecordingCompleted(dummyAudioData, Int(recordingTime))
                    presentationMode.wrappedValue.dismiss()
                }) {
                    Image(systemName: "paperplane.fill")
                        .font(.title)
                        .foregroundColor(.white)
                        .frame(width: 60, height: 60)
                        .background(
                            Circle().fill(
                                LinearGradient(
                                    colors: [.purple, .blue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        )
                }
                .disabled(!isRecording && recordingTime == 0)
                .opacity(!isRecording && recordingTime == 0 ? 0.5 : 1.0)
            }
            
            Spacer()
        }
        .padding()
        .onAppear {
            if isRecording {
                startRecording()
            }
        }
        .onDisappear {
            stopRecording()
        }
    }
    
    private func startRecording() {
        isRecording = true
        recordingTime = 0
        
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            recordingTime += 0.1
            
            // 오디오 레벨 시뮬레이션 (실제로는 마이크 입력 레벨을 사용)
            for i in 0..<audioLevels.count {
                audioLevels[i] = CGFloat.random(in: 0.1...1.0)
            }
        }
    }
    
    private func stopRecording() {
        isRecording = false
        timer?.invalidate()
        timer = nil
        
        // 오디오 레벨 초기화
        audioLevels = Array(repeating: 0.3, count: 50)
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        let milliseconds = Int((time.truncatingRemainder(dividingBy: 1)) * 10)
        return String(format: "%d:%02d.%d", minutes, seconds, milliseconds)
    }
}