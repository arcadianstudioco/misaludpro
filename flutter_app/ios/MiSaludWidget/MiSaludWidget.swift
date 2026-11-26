import WidgetKit
import SwiftUI
import Security

struct MiSaludSnapshot: Codable {
    let stepsToday: Int
    let milesToday: Double
    let sessionsToday: Int
    let sleepHours: Double
    let wakeTime: String
    let wakeEnabled: Bool
    let waterLiters: Double
    let waterTargetLiters: Double
    let caloriesToday: Int
    let calorieTargetMax: Int
    let streakDays: Int
    let goalPercent: Int

    static let empty = MiSaludSnapshot(
        stepsToday: 0,
        milesToday: 0.0,
        sessionsToday: 0,
        sleepHours: 7.5,
        wakeTime: "06:30",
        wakeEnabled: true,
        waterLiters: 0.0,
        waterTargetLiters: 2.5,
        caloriesToday: 0,
        calorieTargetMax: 2100,
        streakDays: 0,
        goalPercent: 0
    )
}

struct MiSaludEntry: TimelineEntry {
    let date: Date
    let data: MiSaludSnapshot
}

struct MiSaludStorage {
    static let appGroupId = "group.com.example.miSaludPro"
    static let dataKey = "misalud_widget_snapshot"

    static func load() -> MiSaludSnapshot {
        // 1. App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId),
           let json = defaults.string(forKey: dataKey),
           let raw = json.data(using: .utf8),
           let decoded = try? JSONDecoder().decode(MiSaludSnapshot.self, from: raw) {
            return decoded
        }

        // 2. Keychain fallback (works with Sideloadly free Apple IDs)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: dataKey,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
           let raw = item as? Data,
           let decoded = try? JSONDecoder().decode(MiSaludSnapshot.self, from: raw) {
            return decoded
        }

        return .empty
    }
}

struct MiSaludProvider: TimelineProvider {
    func placeholder(in context: Context) -> MiSaludEntry {
        MiSaludEntry(date: Date(), data: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (MiSaludEntry) -> Void) {
        completion(MiSaludEntry(date: Date(), data: MiSaludStorage.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MiSaludEntry>) -> Void) {
        let entry = MiSaludEntry(date: Date(), data: MiSaludStorage.load())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

extension View {
    @ViewBuilder
    func miSaludWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(Color(red: 0.05, green: 0.07, blue: 0.06), for: .widget)
        } else {
            self.background(Color(red: 0.05, green: 0.07, blue: 0.06))
        }
    }
}

// 1. Resumen Diario
struct MiSaludResumenWidget: Widget {
    let kind: String = "MiSaludResumenWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiSaludProvider()) { entry in
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("MI SALUD PRO")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(red: 0.45, green: 0.85, blue: 0.20))
                    Spacer()
                    Text("\(entry.data.goalPercent)%")
                        .font(.system(size: 12, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
                Spacer()
                Text("\(entry.data.stepsToday)")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text("Pasos hoy · \(entry.data.caloriesToday) kcal")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
                ProgressView(value: min(1.0, Double(entry.data.goalPercent) / 100.0))
                    .tint(Color(red: 0.45, green: 0.85, blue: 0.20))
            }
            .padding(12)
            .miSaludWidgetBackground()
        }
        .configurationDisplayName("Resumen Diario")
        .description("Tu progreso diario, pasos y calorías.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// 2. Pasos y Distancia
struct MiSaludPasosWidget: Widget {
    let kind: String = "MiSaludPasosWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiSaludProvider()) { entry in
            VStack(alignment: .leading, spacing: 6) {
                Text("PASOS Y DISTANCIA")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(red: 0.25, green: 0.78, blue: 1.0))
                Spacer()
                Text("\(entry.data.stepsToday)")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text(String(format: "%.2f MI · %d ses.", entry.data.milesToday, entry.data.sessionsToday))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(red: 0.25, green: 0.78, blue: 1.0))
            }
            .padding(12)
            .miSaludWidgetBackground()
        }
        .configurationDisplayName("Pasos y Distancia")
        .description("Pasos, millas y sesiones de hoy.")
        .supportedFamilies([.systemSmall])
    }
}

// 3. Sueño y Alarma
struct MiSaludSuenoWidget: Widget {
    let kind: String = "MiSaludSuenoWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiSaludProvider()) { entry in
            VStack(alignment: .leading, spacing: 6) {
                Text("SUEÑO Y ALARMA")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(red: 0.84, green: 0.65, blue: 0.23))
                Spacer()
                Text(String(format: "%.1f h", entry.data.sleepHours))
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text(entry.data.wakeEnabled ? "⏰ Alarma \(entry.data.wakeTime)" : "Alarma apagada")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(red: 0.96, green: 0.83, blue: 0.47))
            }
            .padding(12)
            .miSaludWidgetBackground()
        }
        .configurationDisplayName("Sueño y Alarma")
        .description("Horas de descanso y alarma programada.")
        .supportedFamilies([.systemSmall])
    }
}

// 4. Hidratación
struct MiSaludAguaWidget: Widget {
    let kind: String = "MiSaludAguaWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiSaludProvider()) { entry in
            VStack(alignment: .leading, spacing: 6) {
                Text("HIDRATACIÓN")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(red: 0.30, green: 0.79, blue: 0.69))
                Spacer()
                Text(String(format: "%.1f L", entry.data.waterLiters))
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text(String(format: "Meta %.1f L", entry.data.waterTargetLiters))
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
                ProgressView(value: min(1.0, entry.data.waterLiters / max(0.5, entry.data.waterTargetLiters)))
                    .tint(Color(red: 0.30, green: 0.79, blue: 0.69))
            }
            .padding(12)
            .miSaludWidgetBackground()
        }
        .configurationDisplayName("Hidratación")
        .description("Consumo diario de agua.")
        .supportedFamilies([.systemSmall])
    }
}

// 5. Racha Activa
struct MiSaludRachaWidget: Widget {
    let kind: String = "MiSaludRachaWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MiSaludProvider()) { entry in
            VStack(alignment: .leading, spacing: 6) {
                Text("RACHA ACTIVA")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(red: 1.0, green: 0.42, blue: 0.17))
                Spacer()
                Text("🔥 \(entry.data.streakDays)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text(entry.data.streakDays == 1 ? "día consecutivo" : "días consecutivos")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }
            .padding(12)
            .miSaludWidgetBackground()
        }
        .configurationDisplayName("Racha Activa")
        .description("Tu racha diaria de hábitos.")
        .supportedFamilies([.systemSmall])
    }
}
