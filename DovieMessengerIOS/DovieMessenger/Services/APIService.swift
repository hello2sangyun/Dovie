//
//  APIService.swift
//  DovieMessenger
//
//  Created by Dovie Team
//

import Foundation
import Combine

class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://dovie-hello2sangyun.replit.app"
    private let session = URLSession.shared
    private let keychain = KeychainManager()
    
    private init() {}
    
    enum HTTPMethod: String {
        case GET = "GET"
        case POST = "POST"
        case PUT = "PUT"
        case DELETE = "DELETE"
        case PATCH = "PATCH"
    }
    
    enum APIError: LocalizedError {
        case invalidURL
        case noData
        case decodingError(Error)
        case httpError(Int, String)
        case networkError(Error)
        
        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "잘못된 URL입니다"
            case .noData:
                return "데이터가 없습니다"
            case .decodingError(let error):
                return "데이터 파싱 오류: \(error.localizedDescription)"
            case .httpError(let code, let message):
                return "서버 오류 (\(code)): \(message)"
            case .networkError(let error):
                return "네트워크 오류: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - 기본 요청
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: [String: Any]? = nil,
        headers: [String: String]? = nil
    ) -> AnyPublisher<T, APIError> {
        
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        
        // 기본 헤더 설정
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // 인증 토큰 추가
        if let token = keychain.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // 추가 헤더
        headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // 요청 본문
        if let body = body {
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                return Fail(error: APIError.networkError(error))
                    .eraseToAnyPublisher()
            }
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .tryMap { data in
                // 응답이 비어있는 경우 처리
                if data.isEmpty {
                    if T.self == [String: Any].self {
                        return [:] as! T
                    } else {
                        throw APIError.noData
                    }
                }
                
                do {
                    return try JSONDecoder().decode(T.self, from: data)
                } catch {
                    // JSON 디코딩 실패 시 에러 정보 출력
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("JSON Decoding Error - Data: \(jsonString)")
                    }
                    throw APIError.decodingError(error)
                }
            }
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return APIError.networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - 파일 업로드
    func uploadFile(
        fileData: Data,
        fileName: String,
        fileType: String,
        chatRoomId: Int
    ) -> AnyPublisher<FileUploadResponse, APIError> {
        
        guard let url = URL(string: baseURL + "/api/upload") else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        // 인증 토큰 추가
        if let token = keychain.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Multipart form data 생성
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // 파일 데이터 추가
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(fileType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)
        
        // 채팅방 ID 추가
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"chatRoomId\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(chatRoomId)".data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .tryMap { data in
                do {
                    return try JSONDecoder().decode(FileUploadResponse.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
            }
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return APIError.networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - 이미지 다운로드
    func downloadImage(from urlString: String) -> AnyPublisher<Data, APIError> {
        guard let url = URL(string: urlString) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        return session.dataTaskPublisher(for: url)
            .map(\.data)
            .mapError { APIError.networkError($0) }
            .eraseToAnyPublisher()
    }
}