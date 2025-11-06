import Foundation
import Capacitor
import GoogleSignIn
import FirebaseCore

@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func signIn(_ call: CAPPluginCall) {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            call.reject("Firebase clientID not found")
            return
        }
        
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        DispatchQueue.main.async {
            guard let presentingViewController = self.bridge?.viewController else {
                call.reject("Unable to get presenting view controller")
                return
            }
            
            GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { result, error in
                if let error = error {
                    call.reject("Google Sign-In failed: \(error.localizedDescription)")
                    return
                }
                
                guard let user = result?.user,
                      let idToken = user.idToken?.tokenString else {
                    call.reject("Failed to get ID token")
                    return
                }
                
                call.resolve([
                    "idToken": idToken,
                    "serverAuthCode": user.serverAuthCode ?? ""
                ])
            }
        }
    }
}
