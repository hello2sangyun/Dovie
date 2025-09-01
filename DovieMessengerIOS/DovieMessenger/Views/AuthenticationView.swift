//
//  AuthenticationView.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 헤더
                VStack(spacing: 16) {
                    Image(systemName: "message.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    VStack(spacing: 4) {
                        Text("Dovie Messenger")
                            .font(.title.weight(.bold))
                        
                        Text("안전하고 빠른 메신저")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 50)
                .padding(.bottom, 30)
                
                // 탭 선택
                Picker("로그인 방법", selection: $selectedTab) {
                    Text("이메일").tag(0)
                    Text("전화번호").tag(1)
                    Text("회원가입").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
                
                // 콘텐츠
                TabView(selection: $selectedTab) {
                    EmailLoginView()
                        .tag(0)
                    
                    PhoneLoginView()
                        .tag(1)
                    
                    SignupView()
                        .tag(2)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                
                Spacer()
            }
            .background(Color(.systemBackground))
            .navigationBarHidden(true)
        }
    }
}

struct EmailLoginView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    
    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 16) {
                // 이메일 입력
                VStack(alignment: .leading, spacing: 8) {
                    Text("이메일")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.secondary)
                            .frame(width: 20)
                        
                        TextField("이메일을 입력해주세요", text: $email)
                            .textFieldStyle(PlainTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                // 비밀번호 입력
                VStack(alignment: .leading, spacing: 8) {
                    Text("비밀번호")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Image(systemName: "lock")
                            .foregroundColor(.secondary)
                            .frame(width: 20)
                        
                        Group {
                            if showPassword {
                                TextField("비밀번호를 입력해주세요", text: $password)
                            } else {
                                SecureField("비밀번호를 입력해주세요", text: $password)
                            }
                        }
                        .textFieldStyle(PlainTextFieldStyle())
                        
                        Button(action: {
                            showPassword.toggle()
                        }) {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
            }
            
            // 로그인 버튼
            Button(action: {
                authManager.loginWithEmail(email: email, password: password)
            }) {
                HStack {
                    if authManager.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Text("로그인")
                            .font(.headline)
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
            .disabled(email.isEmpty || password.isEmpty || authManager.isLoading)
            
            // 소셜 로그인
            socialLoginButtons
            
            // 에러 메시지
            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
        }
        .padding(.horizontal, 20)
    }
    
    private var socialLoginButtons: some View {
        VStack(spacing: 16) {
            HStack {
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.secondary.opacity(0.3))
                
                Text("또는")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
                
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.secondary.opacity(0.3))
            }
            
            VStack(spacing: 12) {
                Button(action: {
                    authManager.signInWithGoogle()
                }) {
                    HStack {
                        Image(systemName: "globe")
                            .foregroundColor(.red)
                        Text("Google로 계속하기")
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                Button(action: {
                    authManager.signInWithFacebook()
                }) {
                    HStack {
                        Image(systemName: "f.circle.fill")
                            .foregroundColor(.blue)
                        Text("Facebook으로 계속하기")
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
            }
        }
    }
}

struct PhoneLoginView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var phoneNumber = ""
    @State private var countryCode = "+82"
    @State private var verificationCode = ""
    @State private var showVerificationField = false
    
    var body: some View {
        VStack(spacing: 24) {
            if !showVerificationField {
                phoneNumberInput
            } else {
                verificationCodeInput
            }
            
            // 에러 메시지
            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
        }
        .padding(.horizontal, 20)
    }
    
    private var phoneNumberInput: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("전화번호")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack {
                    Text(countryCode)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray5))
                        .cornerRadius(8)
                    
                    TextField("전화번호를 입력해주세요", text: $phoneNumber)
                        .keyboardType(.phonePad)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                }
            }
            
            Button(action: {
                authManager.sendPhoneVerification(phoneNumber: phoneNumber, countryCode: countryCode)
                showVerificationField = true
            }) {
                HStack {
                    if authManager.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Text("인증번호 받기")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    LinearGradient(
                        colors: [.green, .teal],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(phoneNumber.isEmpty || authManager.isLoading)
        }
    }
    
    private var verificationCodeInput: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("인증번호")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("SMS로 전송된 6자리 인증번호를 입력해주세요")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextField("인증번호 입력", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            }
            
            Button(action: {
                authManager.verifyPhoneCode(phoneNumber: phoneNumber, verificationCode: verificationCode)
            }) {
                HStack {
                    if authManager.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Text("인증 확인")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    LinearGradient(
                        colors: [.green, .teal],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(verificationCode.count != 6 || authManager.isLoading)
            
            Button("다른 번호로 시도하기") {
                showVerificationField = false
                phoneNumber = ""
                verificationCode = ""
            }
            .foregroundColor(.secondary)
        }
    }
}

struct SignupView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var username = ""
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var showConfirmPassword = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 사용자명
                VStack(alignment: .leading, spacing: 8) {
                    Text("사용자명")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    TextField("사용자명 입력", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                }
                
                // 표시 이름
                VStack(alignment: .leading, spacing: 8) {
                    Text("표시 이름")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    TextField("표시할 이름 입력", text: $displayName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                
                // 이메일
                VStack(alignment: .leading, spacing: 8) {
                    Text("이메일")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    TextField("이메일 입력", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                
                // 비밀번호
                VStack(alignment: .leading, spacing: 8) {
                    Text("비밀번호")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Group {
                            if showPassword {
                                TextField("비밀번호 입력", text: $password)
                            } else {
                                SecureField("비밀번호 입력", text: $password)
                            }
                        }
                        
                        Button(action: {
                            showPassword.toggle()
                        }) {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                // 비밀번호 확인
                VStack(alignment: .leading, spacing: 8) {
                    Text("비밀번호 확인")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Group {
                            if showConfirmPassword {
                                TextField("비밀번호 다시 입력", text: $confirmPassword)
                            } else {
                                SecureField("비밀번호 다시 입력", text: $confirmPassword)
                            }
                        }
                        
                        Button(action: {
                            showConfirmPassword.toggle()
                        }) {
                            Image(systemName: showConfirmPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                // 회원가입 버튼
                Button(action: {
                    authManager.signupWithEmail(
                        username: username,
                        displayName: displayName,
                        email: email,
                        password: password
                    )
                }) {
                    HStack {
                        if authManager.isLoading {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text("회원가입")
                                .font(.headline)
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
                .disabled(!isFormValid || authManager.isLoading)
                
                // 에러 메시지
                if let errorMessage = authManager.errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    private var isFormValid: Bool {
        !username.isEmpty &&
        !displayName.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 6
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AuthenticationManager())
}