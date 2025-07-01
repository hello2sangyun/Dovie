import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // 푸시 알림 델리게이트 설정
        UNUserNotificationCenter.current().delegate = self
        
        // 푸시 알림 권한 요청 (개인 개발자 계정용)
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            print("푸시 알림 권한 요청 결과: granted=\(granted), error=\(String(describing: error))")
            
            if granted {
                DispatchQueue.main.async {
                    print("푸시 알림 권한 허용됨 - 디바이스 토큰 생성 시뮬레이션")
                    // 개인 개발자 계정에서는 실제 APNS 등록 대신 시뮬레이션 토큰 사용
                    let simulatedToken = "sim_ios_token_\(Int(Date().timeIntervalSince1970))_user117"
                    print("시뮬레이션 디바이스 토큰: \(simulatedToken)")
                    
                    // JavaScript로 시뮬레이션 토큰 전달
                    if let webView = self.getCapacitorWebView() {
                        let script = """
                        console.log('🎯 시뮬레이션 디바이스 토큰 수신: \(simulatedToken)');
                        window.dispatchEvent(new CustomEvent('deviceTokenReceived', { detail: { token: '\(simulatedToken)' } }));
                        if (window.registerDeviceTokenToServer) {
                            window.registerDeviceTokenToServer('\(simulatedToken)');
                        }
                        """
                        
                        webView.evaluateJavaScript(script) { result, error in
                            if let error = error {
                                print("JavaScript 토큰 전달 실패: \(error)")
                            } else {
                                print("✅ 시뮬레이션 토큰 JavaScript 전달 완료")
                            }
                        }
                    }
                }
            } else {
                print("푸시 알림 권한이 거부되었습니다")
            }
        }
        
        // 앱 뱃지 초기화
        UIApplication.shared.applicationIconBadgeNumber = 0
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive.
        
        // 앱이 활성화될 때 배지 초기화 (사용자가 앱을 열었으므로)
        UIApplication.shared.applicationIconBadgeNumber = 0
        print("앱 활성화 - 배지 초기화됨")
        
        // 앱이 활성화될 때 뱃지 초기화
        UIApplication.shared.applicationIconBadgeNumber = 0
        print("✅ 앱 활성화 - 뱃지 초기화 완료")
        
        // JavaScript에 앱 활성화 이벤트 전달
        DispatchQueue.main.async {
            if let webView = self.getCapacitorWebView() {
                let script = "window.dispatchEvent(new CustomEvent('appDidBecomeActive'));"
                webView.evaluateJavaScript(script) { result, error in
                    if let error = error {
                        print("앱 활성화 이벤트 전달 실패: \(error)")
                    } else {
                        print("앱 활성화 이벤트 JavaScript 전달 완료")
                    }
                }
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    // MARK: - Push Notifications
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // 디바이스 토큰을 16진수 문자열로 변환
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("APNS 디바이스 토큰 등록 성공: \(token)")
        
        // Capacitor에 토큰 전달
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "CapacitorDidRegisterForRemoteNotifications"), object: deviceToken)
        
        // JavaScript로 토큰 전달 및 뱃지 업데이트 이벤트 리스너 설정
        DispatchQueue.main.async {
            if let webView = self.getCapacitorWebView() {
                let script = """
                window.dispatchEvent(new CustomEvent('deviceTokenReceived', { detail: { token: '\(token)' } }));
                
                // 뱃지 업데이트 이벤트 리스너 설정
                window.addEventListener('updateBadgeCount', function(event) {
                    const count = event.detail.count;
                    console.log('뱃지 업데이트 요청 수신:', count);
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.updateBadge) {
                        window.webkit.messageHandlers.updateBadge.postMessage({ count: count });
                    }
                });
                """
                
                webView.evaluateJavaScript(script) { result, error in
                    if let error = error {
                        print("JavaScript 초기화 실패: \(error)")
                    } else {
                        print("JavaScript 초기화 및 이벤트 리스너 설정 성공")
                    }
                }
            }
        }
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNS 디바이스 토큰 등록 실패: \(error.localizedDescription)")
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "CapacitorDidFailToRegisterForRemoteNotifications"), object: error)
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("앱이 활성 상태에서 푸시 알림 수신: \(notification.request.content.title)")
        
        // 뱃지 카운트 업데이트
        if let badgeCount = notification.request.content.badge?.intValue {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = badgeCount
                print("앱 뱃지 업데이트: \(badgeCount)")
            }
        }
        
        // iOS 14+ 지원
        if #available(iOS 14.0, *) {
            completionHandler([.badge, .sound, .banner, .list])
        } else {
            completionHandler([.badge, .sound, .alert])
        }
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        print("푸시 알림 클릭됨: \(response.notification.request.content.title)")
        
        let userInfo = response.notification.request.content.userInfo
        print("알림 데이터: \(userInfo)")
        
        // Capacitor에 응답 전달
        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "CapacitorDidReceiveNotificationResponse"), object: response)
        
        // JavaScript로 알림 클릭 이벤트 전달
        DispatchQueue.main.async {
            if let webView = self.getCapacitorWebView() {
                let jsonData = try? JSONSerialization.data(withJSONObject: userInfo)
                let jsonString = String(data: jsonData ?? Data(), encoding: .utf8) ?? "{}"
                let script = "window.dispatchEvent(new CustomEvent('notificationClicked', { detail: \(jsonString) }));"
                webView.evaluateJavaScript(script) { result, error in
                    if let error = error {
                        print("JavaScript 알림 클릭 이벤트 전달 실패: \(error)")
                    } else {
                        print("JavaScript로 알림 클릭 이벤트 전달 성공")
                    }
                }
            }
        }
        
        completionHandler()
    }
    
    // MARK: - Helper Methods
    
    private func getCapacitorWebView() -> WKWebView? {
        // Capacitor의 CAPBridgeViewController에서 WKWebView 찾기
        if let rootViewController = window?.rootViewController as? CAPBridgeViewController {
            // Capacitor 3.x 이상에서는 webView 프로퍼티 사용 (WKWebView)
            return rootViewController.webView
        }
        return nil
    }
}