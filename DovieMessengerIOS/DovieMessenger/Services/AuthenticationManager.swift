//
//  AuthenticationManager.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation
import Combine
import GoogleSignIn
import FBSDKLoginKit
import AuthenticationServices

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private let keychain = KeychainManager()
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        checkAuthenticationStatus()
        setupGoogleSignIn()
    }
    
    // MARK: - 인증 상태 확인
    func checkAuthenticationStatus() {
        if let token = keychain.getAccessToken() {
            fetchCurrentUser()
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }
    
    // MARK: - 이메일/비밀번호 로그인
    func loginWithEmail(email: String, password: String) {
        isLoading = true
        errorMessage = nil
        
        let loginData = ["email": email, "password": password]
        
        apiService.request(
            endpoint: "/api/auth/login",
            method: .POST,
            body: loginData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: AuthResponse) in
                self.handleLoginSuccess(response)
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - 이메일 회원가입
    func signupWithEmail(username: String, displayName: String, email: String, password: String) {
        isLoading = true
        errorMessage = nil
        
        let signupData = [
            "username": username,
            "displayName": displayName,
            "email": email,
            "password": password
        ]
        
        apiService.request(
            endpoint: "/api/auth/signup",
            method: .POST,
            body: signupData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: AuthResponse) in
                self.handleLoginSuccess(response)
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - 전화번호 인증
    func sendPhoneVerification(phoneNumber: String, countryCode: String) {
        isLoading = true
        errorMessage = nil
        
        let phoneData = [
            "phoneNumber": phoneNumber,
            "countryCode": countryCode
        ]
        
        apiService.request(
            endpoint: "/api/auth/phone-verify",
            method: .POST,
            body: phoneData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: [String: Any]) in
                // 인증 코드 전송 성공
                print("인증 코드가 전송되었습니다")
            }
        )
        .store(in: &cancellables)
    }
    
    func verifyPhoneCode(phoneNumber: String, verificationCode: String) {
        isLoading = true
        errorMessage = nil
        
        let verifyData = [
            "phoneNumber": phoneNumber,
            "verificationCode": verificationCode
        ]
        
        apiService.request(
            endpoint: "/api/auth/phone-verify-code",
            method: .POST,
            body: verifyData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: AuthResponse) in
                self.handleLoginSuccess(response)
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - Google 로그인
    private func setupGoogleSignIn() {
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let plist = NSDictionary(contentsOfFile: path),
              let clientId = plist["CLIENT_ID"] as? String else {
            print("Google Service Info 파일을 찾을 수 없습니다")
            return
        }
        
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
    }
    
    func signInWithGoogle() {
        guard let presentingViewController = UIApplication.shared.windows.first?.rootViewController else {
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { [weak self] result, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.isLoading = false
                    self?.errorMessage = error.localizedDescription
                    return
                }
                
                guard let user = result?.user,
                      let idToken = user.idToken?.tokenString else {
                    self?.isLoading = false
                    self?.errorMessage = "Google 로그인 실패"
                    return
                }
                
                // 서버에 Google 토큰 전송
                self?.authenticateWithGoogle(idToken: idToken)
            }
        }
    }
    
    private func authenticateWithGoogle(idToken: String) {
        let googleData = ["idToken": idToken]
        
        apiService.request(
            endpoint: "/api/auth/google",
            method: .POST,
            body: googleData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: AuthResponse) in
                self.handleLoginSuccess(response)
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - Facebook 로그인
    func signInWithFacebook() {
        isLoading = true
        errorMessage = nil
        
        let loginManager = LoginManager()
        loginManager.logIn(permissions: ["public_profile", "email"], from: nil) { [weak self] result, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.isLoading = false
                    self?.errorMessage = error.localizedDescription
                    return
                }
                
                guard let result = result, !result.isCancelled,
                      let token = result.token?.tokenString else {
                    self?.isLoading = false
                    self?.errorMessage = "Facebook 로그인 취소"
                    return
                }
                
                // 서버에 Facebook 토큰 전송
                self?.authenticateWithFacebook(accessToken: token)
            }
        }
    }
    
    private func authenticateWithFacebook(accessToken: String) {
        let facebookData = ["accessToken": accessToken]
        
        apiService.request(
            endpoint: "/api/auth/facebook",
            method: .POST,
            body: facebookData
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                self.isLoading = false
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                }
            },
            receiveValue: { (response: AuthResponse) in
                self.handleLoginSuccess(response)
            }
        )
        .store(in: &cancellables)
    }
    
    // MARK: - 로그아웃
    func logout() {
        // 키체인에서 토큰 삭제
        keychain.deleteAccessToken()
        
        // Google 로그아웃
        GIDSignIn.sharedInstance.signOut()
        
        // Facebook 로그아웃
        LoginManager().logOut()
        
        // 상태 초기화
        isAuthenticated = false
        currentUser = nil
        
        // 서버에 로그아웃 요청
        apiService.request(endpoint: "/api/auth/logout", method: .POST)
            .sink(receiveCompletion: { _ in }, receiveValue: { (_: [String: Any]) in })
            .store(in: &cancellables)
    }
    
    // MARK: - 헬퍼 메서드
    private func handleLoginSuccess(_ response: AuthResponse) {
        keychain.saveAccessToken(response.token)
        currentUser = response.user
        isAuthenticated = true
        errorMessage = nil
    }
    
    private func fetchCurrentUser() {
        apiService.request(endpoint: "/api/auth/user", method: .GET)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure = completion {
                        self.logout()
                    }
                },
                receiveValue: { (user: User) in
                    self.currentUser = user
                    self.isAuthenticated = true
                }
            )
            .store(in: &cancellables)
    }
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}