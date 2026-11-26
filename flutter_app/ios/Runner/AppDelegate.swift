import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    let channel = FlutterMethodChannel(
      name: "com.misaludpro/alarms",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )

    channel.setMethodCallHandler { call, result in
      let center = UNUserNotificationCenter.current()
      switch call.method {
      case "requestPermission":
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          DispatchQueue.main.async {
            result(granted)
          }
        }

      case "syncAlarms":
        guard let alarms = call.arguments as? [[String: Any]] else {
          result(false)
          return
        }
        let ids = alarms.compactMap { $0["id"] as? String }
        center.removePendingNotificationRequests(withIdentifiers: ids)

        for item in alarms {
          guard
            let id = item["id"] as? String,
            let enabled = item["enabled"] as? Bool,
            enabled,
            let title = item["title"] as? String,
            let body = item["body"] as? String,
            let hour = item["hour"] as? Int,
            let minute = item["minute"] as? Int
          else { continue }

          let content = UNMutableNotificationContent()
          content.title = title
          content.body = body
          content.sound = UNNotificationSound.default
          if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
          }

          var dateComponents = DateComponents()
          dateComponents.hour = hour
          dateComponents.minute = minute

          let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
          let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
          center.add(request, withCompletionHandler: nil)
        }
        result(true)

      case "openClockApp":
        DispatchQueue.main.async {
          if let url = URL(string: "clock-alarm://"), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            result(true)
          } else if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settingsUrl, options: [:], completionHandler: nil)
            result(false)
          } else {
            result(false)
          }
        }

      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  // Show notification banner + play sound even if the app is open in foreground
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .list])
    } else {
      completionHandler([.alert, .sound])
    }
  }
}
