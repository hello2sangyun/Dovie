import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            if let imageURLString = bestAttemptContent.userInfo["imageUrl"] as? String,
               let imageURL = URL(string: imageURLString) {
                
                downloadImage(from: imageURL) { attachment in
                    if let attachment = attachment {
                        bestAttemptContent.attachments = [attachment]
                    }
                    contentHandler(bestAttemptContent)
                }
            } else {
                contentHandler(bestAttemptContent)
            }
        }
    }
    
    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL else {
                completion(nil)
                return
            }
            
            let tempDirectory = FileManager.default.temporaryDirectory
            let uniqueName = ProcessInfo.processInfo.globallyUniqueString
            let fileExtension = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let fileURL = tempDirectory.appendingPathComponent("\(uniqueName).\(fileExtension)")
            
            do {
                try FileManager.default.moveItem(at: localURL, to: fileURL)
                let attachment = try UNNotificationAttachment(identifier: uniqueName, url: fileURL, options: nil)
                completion(attachment)
            } catch {
                print("❌ Failed to create notification attachment: \(error)")
                completion(nil)
            }
        }
        task.resume()
    }
    
    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
