import Foundation
import Capacitor
import CallKit
import PushKit
import AVFoundation

@objc(CallKitVoipPlugin)
public class CallKitVoipPlugin: CAPPlugin, CAPBridgedPlugin {
    
    public let identifier = "CallKitVoipPlugin"
    public let jsName = "CallKitVoip"
    
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportIncomingCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "answerCall", returnType: CAPPluginReturnPromise)
    ]
    
    private var voipRegistry: PKPushRegistry?
    private var callController: CXCallController?
    private var provider: CXProvider?
    private var currentCallUUID: UUID?
    
    override public func load() {
        print("📞 [CallKit] Plugin loaded")
        
        // Initialize CallKit provider
        let configuration = CXProviderConfiguration(localizedName: "Dovie Messenger")
        configuration.supportsVideo = false
        configuration.maximumCallsPerCallGroup = 1
        configuration.maximumCallGroups = 1
        configuration.supportedHandleTypes = [.generic]
        
        // Configure ringtone
        if let soundURL = Bundle.main.url(forResource: "ringtone", withExtension: "caf") {
            configuration.ringtoneSound = "ringtone.caf"
        }
        
        provider = CXProvider(configuration: configuration)
        provider?.setDelegate(self, queue: nil)
        
        callController = CXCallController()
        
        // Initialize PushKit for VoIP
        voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
        voipRegistry?.delegate = self
        voipRegistry?.desiredPushTypes = [.voIP]
        
        print("📞 [CallKit] CallKit and PushKit initialized")
    }
    
    @objc func register(_ call: CAPPluginCall) {
        print("📞 [CallKit] Registering for VoIP notifications")
        call.resolve(["success": true])
    }
    
    @objc func reportIncomingCall(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"),
              let callerName = call.getString("callerName") else {
            call.reject("Missing required parameters: callId or callerName")
            return
        }
        
        let hasVideo = call.getBool("hasVideo") ?? false
        let uuid = UUID(uuidString: callId) ?? UUID()
        
        print("📞 [CallKit] Reporting incoming call: \(callerName)")
        
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.hasVideo = hasVideo
        update.localizedCallerName = callerName
        
        provider?.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error {
                print("❌ [CallKit] Failed to report call: \(error.localizedDescription)")
                call.reject("Failed to report incoming call: \(error.localizedDescription)")
            } else {
                print("✅ [CallKit] Incoming call reported successfully")
                self.currentCallUUID = uuid
                call.resolve(["success": true])
            }
        }
    }
    
    @objc func startCall(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"),
              let handleValue = call.getString("handle") else {
            call.reject("Missing required parameters")
            return
        }
        
        let uuid = UUID(uuidString: callId) ?? UUID()
        let handle = CXHandle(type: .generic, value: handleValue)
        
        let startCallAction = CXStartCallAction(call: uuid, handle: handle)
        startCallAction.isVideo = false
        
        let transaction = CXTransaction(action: startCallAction)
        
        callController?.request(transaction) { error in
            if let error = error {
                print("❌ [CallKit] Failed to start call: \(error.localizedDescription)")
                call.reject("Failed to start call: \(error.localizedDescription)")
            } else {
                print("✅ [CallKit] Call started successfully")
                self.currentCallUUID = uuid
                call.resolve(["success": true])
            }
        }
    }
    
    @objc func endCall(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId") else {
            call.reject("Missing callId")
            return
        }
        
        let uuid = UUID(uuidString: callId) ?? currentCallUUID ?? UUID()
        
        let endCallAction = CXEndCallAction(call: uuid)
        let transaction = CXTransaction(action: endCallAction)
        
        callController?.request(transaction) { error in
            if let error = error {
                print("❌ [CallKit] Failed to end call: \(error.localizedDescription)")
                call.reject("Failed to end call: \(error.localizedDescription)")
            } else {
                print("✅ [CallKit] Call ended successfully")
                self.currentCallUUID = nil
                call.resolve(["success": true])
            }
        }
    }
    
    @objc func answerCall(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId") else {
            call.reject("Missing callId")
            return
        }
        
        let uuid = UUID(uuidString: callId) ?? currentCallUUID ?? UUID()
        
        let answerAction = CXAnswerCallAction(call: uuid)
        let transaction = CXTransaction(action: answerAction)
        
        callController?.request(transaction) { error in
            if let error = error {
                print("❌ [CallKit] Failed to answer call: \(error.localizedDescription)")
                call.reject("Failed to answer call: \(error.localizedDescription)")
            } else {
                print("✅ [CallKit] Call answered successfully")
                call.resolve(["success": true])
            }
        }
    }
}

// MARK: - PKPushRegistryDelegate
extension CallKitVoipPlugin: PKPushRegistryDelegate {
    
    public func pushRegistry(_ registry: PKPushRegistry,
                           didUpdate pushCredentials: PKPushCredentials,
                           for type: PKPushType) {
        guard type == .voIP else { return }
        
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        print("📞 [CallKit] VoIP token received: \(token.prefix(20))...")
        
        // Notify JavaScript
        notifyListeners("voipToken", data: ["token": token])
    }
    
    public func pushRegistry(_ registry: PKPushRegistry,
                           didReceiveIncomingPushWith payload: PKPushPayload,
                           for type: PKPushType,
                           completion: @escaping () -> Void) {
        
        guard type == .voIP else {
            completion()
            return
        }
        
        print("📞 [CallKit] VoIP push received")
        
        let payloadDict = payload.dictionaryPayload
        let callId = payloadDict["callId"] as? String ?? UUID().uuidString
        let callerName = payloadDict["callerName"] as? String ?? "Unknown Caller"
        let callerId = payloadDict["callerId"] as? Int ?? 0
        let chatRoomId = payloadDict["chatRoomId"] as? Int ?? 0
        
        // CRITICAL: iOS 13+ requires immediate CallKit report
        let uuid = UUID(uuidString: callId) ?? UUID()
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.hasVideo = false
        update.localizedCallerName = callerName
        
        provider?.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error {
                print("❌ [CallKit] Failed to report VoIP call: \(error.localizedDescription)")
            } else {
                print("✅ [CallKit] VoIP call reported to CallKit")
                self.currentCallUUID = uuid
                
                // Notify JavaScript of incoming call
                self.notifyListeners("incomingCall", data: [
                    "callId": callId,
                    "callerName": callerName,
                    "callerId": callerId,
                    "chatRoomId": chatRoomId
                ])
            }
            completion()
        }
    }
    
    public func pushRegistry(_ registry: PKPushRegistry,
                           didInvalidatePushTokenFor type: PKPushType) {
        print("⚠️ [CallKit] VoIP token invalidated")
        notifyListeners("voipTokenInvalidated", data: [:])
    }
}

// MARK: - CXProviderDelegate
extension CallKitVoipPlugin: CXProviderDelegate {
    
    public func providerDidReset(_ provider: CXProvider) {
        print("📞 [CallKit] Provider reset")
        currentCallUUID = nil
        notifyListeners("providerReset", data: [:])
    }
    
    public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        print("📞 [CallKit] User answered call")
        
        // Configure audio session
        configureAudioSession()
        
        notifyListeners("callAnswered", data: [
            "callId": action.callUUID.uuidString
        ])
        
        action.fulfill()
    }
    
    public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        print("📞 [CallKit] Call ended")
        
        notifyListeners("callEnded", data: [
            "callId": action.callUUID.uuidString
        ])
        
        currentCallUUID = nil
        action.fulfill()
    }
    
    public func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        print("📞 [CallKit] Starting outgoing call")
        
        configureAudioSession()
        
        notifyListeners("callStarted", data: [
            "callId": action.callUUID.uuidString,
            "handle": action.handle.value
        ])
        
        action.fulfill()
    }
    
    public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        print("📞 [CallKit] Mute toggled: \(action.isMuted)")
        
        notifyListeners("callMuted", data: [
            "callId": action.callUUID.uuidString,
            "isMuted": action.isMuted
        ])
        
        action.fulfill()
    }
    
    public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        print("📞 [CallKit] Audio session activated")
        notifyListeners("audioSessionActivated", data: [:])
    }
    
    public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        print("📞 [CallKit] Audio session deactivated")
        notifyListeners("audioSessionDeactivated", data: [:])
    }
    
    private func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP])
            try audioSession.setActive(true)
            print("✅ [CallKit] Audio session configured")
        } catch {
            print("❌ [CallKit] Audio session configuration failed: \(error.localizedDescription)")
        }
    }
}
