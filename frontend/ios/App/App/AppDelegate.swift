import UIKit
import Capacitor
#if canImport(AppIntents)
import AppIntents
#endif

private let pendingVoiceRouteKey = "PendingVoiceShortcutRoute"
private let voiceRouteNotification = Notification.Name("PendingVoiceShortcutRouteChanged")

private enum VoiceRoute: String {
    case dashboard = "/"
    case record = "/record"
    case stop = "/stop"
    case assistant = "/assistant"
}

private func storePendingVoiceRoute(_ route: VoiceRoute) {
    UserDefaults.standard.set(route.rawValue, forKey: pendingVoiceRouteKey)
    NotificationCenter.default.post(
        name: voiceRouteNotification,
        object: nil,
        userInfo: ["route": route.rawValue]
    )
}

private func consumePendingVoiceRoute() -> String? {
    let defaults = UserDefaults.standard
    let route = defaults.string(forKey: pendingVoiceRouteKey)
    defaults.removeObject(forKey: pendingVoiceRouteKey)
    return route
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
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

}

@objc(VoiceShortcutsPlugin)
public class VoiceShortcutsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoiceShortcutsPlugin"
    public let jsName = "VoiceShortcuts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consumePendingRoute", returnType: CAPPluginReturnPromise)
    ]

    private var observer: NSObjectProtocol?

    @objc override public func load() {
        observer = NotificationCenter.default.addObserver(
            forName: voiceRouteNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let route = notification.userInfo?["route"] as? String else {
                return
            }

            self?.notifyListeners("voiceRoute", data: ["route": route], retainUntilConsumed: true)
        }
    }

    deinit {
        if let observer {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    @objc func consumePendingRoute(_ call: CAPPluginCall) {
        var payload = JSObject()
        payload["route"] = consumePendingVoiceRoute()
        call.resolve(payload)
    }
}

#if canImport(AppIntents)
@available(iOS 16.0, *)
private protocol VoiceRouteIntent: AppIntent {
    static var route: VoiceRoute { get }
}

@available(iOS 16.0, *)
extension VoiceRouteIntent {
    static var openAppWhenRun: Bool { true }

    func perform() async throws -> some IntentResult {
        storePendingVoiceRoute(Self.route)
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenDashboardIntent: VoiceRouteIntent {
    static let route: VoiceRoute = .dashboard
    static let title: LocalizedStringResource = "Open Dashboard"
    static let description = IntentDescription("Open the Lab Assistant dashboard.")
}

@available(iOS 16.0, *)
struct StartRecordingIntent: VoiceRouteIntent {
    static let route: VoiceRoute = .record
    static let title: LocalizedStringResource = "Start Recording"
    static let description = IntentDescription("Open Lab Assistant and start a new hands-free recording.")
}

@available(iOS 16.0, *)
struct StopRecordingIntent: VoiceRouteIntent {
    static let route: VoiceRoute = .stop
    static let title: LocalizedStringResource = "Stop Recording"
    static let description = IntentDescription("Open Lab Assistant and stop the active hands-free recording.")
}

@available(iOS 16.0, *)
struct OpenHandsFreeSetupIntent: VoiceRouteIntent {
    static let route: VoiceRoute = .assistant
    static let title: LocalizedStringResource = "Open Hands-Free Setup"
    static let description = IntentDescription("Open the Lab Assistant setup screen for Siri, headsets, and mobile assistants.")
}

@available(iOS 16.0, *)
struct LabAssistantAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        [
            AppShortcut(
                intent: StartRecordingIntent(),
                phrases: [
                    "Start recording in \(.applicationName)",
                    "Record measurements in \(.applicationName)"
                ],
                shortTitle: "Start",
                systemImageName: "record.circle"
            ),
            AppShortcut(
                intent: StopRecordingIntent(),
                phrases: [
                    "Stop recording in \(.applicationName)",
                    "Finish recording in \(.applicationName)"
                ],
                shortTitle: "Stop",
                systemImageName: "stop.circle"
            ),
            AppShortcut(
                intent: OpenDashboardIntent(),
                phrases: [
                    "Open dashboard in \(.applicationName)",
                    "Open \(.applicationName)"
                ],
                shortTitle: "Dashboard",
                systemImageName: "rectangle.stack"
            ),
            AppShortcut(
                intent: OpenHandsFreeSetupIntent(),
                phrases: [
                    "Open hands free setup in \(.applicationName)",
                    "Open assistant setup in \(.applicationName)"
                ],
                shortTitle: "Setup",
                systemImageName: "airpodspro"
            )
        ]
    }
}
#endif
