import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/health_models.dart';

// ─── Sync Status ───────────────────────────────────────────────────────────────
enum SyncStatus { synced, syncing, pending, offline }

// ─── Habit Streaks ─────────────────────────────────────────────────────────────
class HabitStreaks {
  final int workout;
  final int water;
  final int sleep;
  final int kegel;
  final int healthy;

  const HabitStreaks({
    this.workout = 0,
    this.water = 0,
    this.sleep = 0,
    this.kegel = 0,
    this.healthy = 0,
  });
}

// ─── Health Controller ────────────────────────────────────────────────────────
class HealthController extends ChangeNotifier {
  static const _storageKey = 'mi_salud_pro_flutter_v1';

  // ── Auth ──────────────────────────────────────────────────────────────────
  bool isAuthenticated = false;

  // ── Profile ───────────────────────────────────────────────────────────────
  UserProfile profile = const UserProfile(
    name: 'Carlos Mendoza',
    email: 'carlos@misaludpro.app',
    age: 33,
    heightCm: 182.88,
    initialWeightKg: 102.5,
    targetWeightKg: 90.0,
    goal: 'Reducir grasa y ganar salud',
    level: 'Intermedio',
    calorieTargetMin: 2200,
    calorieTargetMax: 2400,
    proteinTargetG: 150,
    carbsTargetG: 300,
    fatTargetG: 80,
  );

  // ── Today's Habits ────────────────────────────────────────────────────────
  bool workoutDone = true;
  bool healthyEatingDone = false;
  double waterLiters = 2.0;
  double sleepHours = 6.5;
  bool kegelDone = false;

  // ── Habit History (date ISO → habits snapshot) ────────────────────────────
  Map<String, Map<String, dynamic>> habitsByDate = {};

  // ── Reminders ────────────────────────────────────────────────────────────
  bool remindWorkout = true;
  bool remindWater = true;
  bool remindKegel = true;

  // ── Nutrition ─────────────────────────────────────────────────────────────
  List<MealEntry> meals = [];

  // ── Body measurements ─────────────────────────────────────────────────────
  List<BodyMeasurement> measurements = [];

  // ── Shopping List ─────────────────────────────────────────────────────────
  List<ShoppingItem> shoppingList = [];

  // ── Workout sessions ──────────────────────────────────────────────────────
  List<WorkoutSessionLog> completedSessions = [];

  // ── Kegel sessions ────────────────────────────────────────────────────────
  List<KegelSessionLog> kegelSessions = [];

  // ── Daily notes ───────────────────────────────────────────────────────────
  Map<String, String> dailyNotes = {};

  // ── Progress photos ───────────────────────────────────────────────────────
  List<ProgressPhoto> progressPhotos = [];

  // ── Sync / Offline ────────────────────────────────────────────────────────
  SyncStatus syncStatus = SyncStatus.synced;
  bool isOnline = true;
  bool _simulatedOffline = false;
  bool get isSimulatedOffline => _simulatedOffline;
  int pendingChanges = 0;
  DateTime? lastSyncedAt;

  // ── Routines (static seed data) ───────────────────────────────────────────
  final List<WorkoutRoutine> routines = const [
    WorkoutRoutine(
      id: 'fuerza-total',
      title: 'Fuerza Total',
      subtitle: 'Tren superior, core y piernas en circuito controlado',
      level: 'Intermedio',
      durationMin: 45,
      category: 'Fuerza',
      isFeatured: true,
      caloriesEstimate: 380,
      exercises: [
        ExerciseStep(
          name: 'Sentadilla controlada',
          sets: '4 x 12 reps',
          durationSec: 60,
          instructions: 'Pecho erguido y descenso controlado en 3 segundos.',
        ),
        ExerciseStep(
          name: 'Flexiones o Press de pecho',
          sets: '4 x 12 reps',
          durationSec: 55,
          instructions: 'Codos a 45° del torso y abdomen firme.',
        ),
        ExerciseStep(
          name: 'Plancha abdominal',
          sets: '3 x 45 seg',
          durationSec: 45,
          instructions: 'Glúteos y core activos sin arquear la lumbar.',
        ),
      ],
    ),
    WorkoutRoutine(
      id: 'cardio-quemagrasa',
      title: 'Cardio Quemagrasa',
      subtitle: '30 min · HIIT',
      level: 'Intermedio',
      durationMin: 30,
      category: 'HIIT',
      caloriesEstimate: 310,
      exercises: [
        ExerciseStep(
          name: 'Jumping Jacks',
          sets: '4 x 40 seg',
          durationSec: 40,
          instructions: 'Ritmo constante y respiración fluida.',
        ),
        ExerciseStep(
          name: 'Mountain Climbers',
          sets: '4 x 40 seg',
          durationSec: 40,
          instructions: 'Hombros sobre muñecas, rodillas al pecho.',
        ),
      ],
    ),
    WorkoutRoutine(
      id: 'movilidad',
      title: 'Movilidad y Flexibilidad',
      subtitle: '20 min · Recuperación',
      level: 'Principiante',
      durationMin: 20,
      category: 'Movilidad',
      caloriesEstimate: 95,
      exercises: [
        ExerciseStep(
          name: 'Gato - Vaca torácica',
          sets: '3 x 45 seg',
          durationSec: 45,
          instructions: 'Moviliza la columna al ritmo de tu respiración.',
        ),
      ],
    ),
    WorkoutRoutine(
      id: 'kegel',
      title: 'Kegel y Suelo Pélvico',
      subtitle: '15 min · Contracción y relajación',
      level: 'Principiante',
      durationMin: 15,
      category: 'Suelo Pélvico',
      caloriesEstimate: 45,
      exercises: [
        ExerciseStep(
          name: 'Contracción lenta sostenida',
          sets: '10 ciclos · 5s/5s',
          durationSec: 50,
          instructions:
              'Contrae 5s sin tensar glúteos y relaja 5s por completo.',
        ),
      ],
    ),
    WorkoutRoutine(
      id: 'hiit-express',
      title: 'HIIT Express',
      subtitle: '20 min · Alta intensidad',
      level: 'Intermedio',
      durationMin: 20,
      category: 'HIIT',
      caloriesEstimate: 260,
      exercises: [
        ExerciseStep(
          name: 'Burpees',
          sets: '4 x 30 seg',
          durationSec: 30,
          instructions: 'Movimiento explosivo completo.',
        ),
        ExerciseStep(
          name: 'Sprint en el lugar',
          sets: '4 x 30 seg',
          durationSec: 30,
          instructions: 'Rodillas altas, brazos activos.',
        ),
      ],
    ),
    WorkoutRoutine(
      id: 'abdomen-core',
      title: 'Abdomen y Core',
      subtitle: '25 min · Zona media completa',
      level: 'Intermedio',
      durationMin: 25,
      category: 'Core',
      caloriesEstimate: 190,
      exercises: [
        ExerciseStep(
          name: 'Crunch abdominal',
          sets: '3 x 20 reps',
          durationSec: 50,
          instructions: 'Exhala al subir, espalda baja pegada al suelo.',
        ),
        ExerciseStep(
          name: 'Plancha lateral',
          sets: '3 x 30 seg / lado',
          durationSec: 30,
          instructions: 'Caderas alineadas, cuerpo recto.',
        ),
      ],
    ),
  ];

  // ── Init / Load ───────────────────────────────────────────────────────────
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null) return;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      isAuthenticated = data['isAuthenticated'] as bool? ?? false;
      if (data['profile'] != null) {
        profile = UserProfile.fromJson(data['profile'] as Map<String, dynamic>);
      }
      workoutDone = data['workoutDone'] as bool? ?? false;
      healthyEatingDone = data['healthyEatingDone'] as bool? ?? false;
      waterLiters = (data['waterLiters'] as num?)?.toDouble() ?? 0.0;
      sleepHours = (data['sleepHours'] as num?)?.toDouble() ?? 0.0;
      kegelDone = data['kegelDone'] as bool? ?? false;
      meals = (data['meals'] as List<dynamic>? ?? [])
          .map((e) => MealEntry.fromJson(e as Map<String, dynamic>))
          .toList();
      measurements = (data['measurements'] as List<dynamic>? ?? [])
          .map((e) => BodyMeasurement.fromJson(e as Map<String, dynamic>))
          .toList();
      shoppingList = (data['shoppingList'] as List<dynamic>? ?? [])
          .map((e) => ShoppingItem.fromJson(e as Map<String, dynamic>))
          .toList();
      completedSessions =
          (data['completedSessions'] as List<dynamic>? ?? []).map((e) {
        final m = e as Map<String, dynamic>;
        return WorkoutSessionLog(
          id: m['id'] as String? ??
              DateTime.now().millisecondsSinceEpoch.toString(),
          routineId: m['routineId'] as String? ?? '',
          title: m['title'] as String? ?? '',
          durationSec: m['durationSec'] as int? ?? 0,
          caloriesBurned: m['caloriesBurned'] as int? ?? 0,
          completedAt: m['completedAt'] as String? ?? '',
        );
      }).toList();
      kegelSessions = (data['kegelSessions'] as List<dynamic>? ?? []).map((e) {
        final m = e as Map<String, dynamic>;
        return KegelSessionLog(
          id: m['id'] as String? ?? '',
          completedAt: m['completedAt'] as String? ?? '',
          cycles: m['cycles'] as int? ?? 10,
          holdSec: m['holdSec'] as int? ?? 5,
          relaxSec: m['relaxSec'] as int? ?? 5,
        );
      }).toList();
      dailyNotes = Map<String, String>.from(
          (data['dailyNotes'] as Map<String, dynamic>? ?? {}).map(
        (k, v) => MapEntry(k, v as String? ?? ''),
      ));
      progressPhotos =
          (data['progressPhotos'] as List<dynamic>? ?? []).map((e) {
        final m = e as Map<String, dynamic>;
        return ProgressPhoto(
          id: m['id'] as String? ?? '',
          label: m['label'] as String? ?? '',
          dataUrl: m['dataUrl'] as String? ?? '',
          date: m['date'] as String? ?? '',
        );
      }).toList();
      habitsByDate = (data['habitsByDate'] as Map<String, dynamic>? ?? {}).map(
        (k, v) => MapEntry(k, (v as Map<String, dynamic>?) ?? {}),
      );
      if (data['lastSyncedAt'] != null) {
        lastSyncedAt = DateTime.tryParse(data['lastSyncedAt'] as String);
      }
      notifyListeners();
    } catch (_) {}
    _listenConnectivity();
  }

  void _listenConnectivity() {
    Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online != isOnline) {
        isOnline = online;
        if (online && pendingChanges > 0) {
          _flushPendingChanges();
        } else {
          syncStatus = online ? SyncStatus.synced : SyncStatus.offline;
        }
        notifyListeners();
      }
    });
  }

  Future<void> _flushPendingChanges() async {
    // In a real app, sync to server here. For now just mark as synced.
    syncStatus = SyncStatus.syncing;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 800));
    pendingChanges = 0;
    lastSyncedAt = DateTime.now();
    syncStatus = SyncStatus.synced;
    notifyListeners();
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  Future<void> _save() async {
    _snapshotTodayHabits();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode({
        'isAuthenticated': isAuthenticated,
        'profile': profile.toJson(),
        'workoutDone': workoutDone,
        'healthyEatingDone': healthyEatingDone,
        'waterLiters': waterLiters,
        'sleepHours': sleepHours,
        'kegelDone': kegelDone,
        'meals': meals.map((e) => e.toJson()).toList(),
        'measurements': measurements.map((e) => e.toJson()).toList(),
        'shoppingList': shoppingList.map((e) => e.toJson()).toList(),
        'completedSessions': completedSessions.map((e) => e.toJson()).toList(),
        'kegelSessions': kegelSessions.map((e) => e.toJson()).toList(),
        'dailyNotes': dailyNotes,
        'progressPhotos': progressPhotos.map((e) => e.toJson()).toList(),
        'habitsByDate': habitsByDate,
        'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      }),
    );
    // Mark pending if offline or simulated offline
    if (!isOnline || _simulatedOffline) {
      pendingChanges++;
      syncStatus = SyncStatus.pending;
      notifyListeners();
    } else {
      syncStatus = SyncStatus.synced;
      lastSyncedAt = DateTime.now();
      notifyListeners();
    }
  }

  void _snapshotTodayHabits() {
    final today = _todayIso();
    habitsByDate[today] = {
      'workoutDone': workoutDone,
      'healthyEatingDone': healthyEatingDone,
      'waterLiters': waterLiters,
      'sleepHours': sleepHours,
      'kegelDone': kegelDone,
    };
  }

  String _todayIso() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  // ── Demo Account ──────────────────────────────────────────────────────────
  void loadDemoAccount() {
    isAuthenticated = true;
    workoutDone = true;
    healthyEatingDone = false;
    waterLiters = 2.0;
    sleepHours = 6.5;
    meals = const [
      MealEntry(
        id: 'm1',
        slot: 'Desayuno',
        name: 'Tostadas integrales con huevo y aguacate',
        calories: 560,
        proteinG: 42,
        carbsG: 65,
        fatG: 22,
      ),
      MealEntry(
        id: 'm2',
        slot: 'Almuerzo',
        name: 'Bowl de pollo, aguacate y quinoa',
        calories: 740,
        proteinG: 58,
        carbsG: 95,
        fatG: 28,
      ),
      MealEntry(
        id: 'm3',
        slot: 'Snack',
        name: 'Yogur griego y frutos secos',
        calories: 360,
        proteinG: 25,
        carbsG: 60,
        fatG: 20,
      ),
    ];
    measurements = [
      BodyMeasurement(
          date: _daysAgo(21),
          weightKg: 102.5,
          waistCm: 97,
          abdomenCm: 99,
          chestCm: 103,
          armsCm: 36),
      BodyMeasurement(
          date: _daysAgo(14),
          weightKg: 101.4,
          waistCm: 96,
          abdomenCm: 98,
          chestCm: 103,
          armsCm: 36),
      BodyMeasurement(
          date: _daysAgo(7),
          weightKg: 100.8,
          waistCm: 96,
          abdomenCm: 98,
          chestCm: 103,
          armsCm: 36),
      BodyMeasurement(
          date: _todayIso(),
          weightKg: 100.0,
          waistCm: 94,
          abdomenCm: 96,
          chestCm: 102,
          armsCm: 36),
    ];
    shoppingList = const [
      ShoppingItem(id: 's1', name: 'Pechuga de pollo', quantity: '1.2 kg'),
      ShoppingItem(id: 's2', name: 'Aguacates maduros', quantity: '4 uds'),
      ShoppingItem(
          id: 's3', name: 'Avena integral', quantity: '1 kg', checked: true),
      ShoppingItem(id: 's4', name: 'Huevos camperos', quantity: '24 uds'),
    ];
    // Seed historical habits for streaks
    _seedHistoricalHabits();
    lastSyncedAt = DateTime.now();
    syncStatus = SyncStatus.synced;
    _save();
    notifyListeners();
  }

  void _seedHistoricalHabits() {
    for (int i = 7; i >= 1; i--) {
      final dateStr = _daysAgo(i);
      habitsByDate[dateStr] = {
        'workoutDone': i % 3 != 0,
        'healthyEatingDone': true,
        'waterLiters': 2.5 + (i % 2) * 0.5,
        'sleepHours': 6.5 + (i % 3) * 0.5,
        'kegelDone': i % 2 == 0,
      };
    }
  }

  String _daysAgo(int days) {
    final d = DateTime.now().subtract(Duration(days: days));
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  // ── Create Profile ────────────────────────────────────────────────────────
  void createProfile(UserProfile newProfile, double waistCm) {
    profile = newProfile;
    isAuthenticated = true;
    workoutDone = false;
    healthyEatingDone = false;
    waterLiters = 0;
    sleepHours = 7;
    meals = [];
    measurements = [
      BodyMeasurement(
        date: _todayIso(),
        weightKg: newProfile.initialWeightKg,
        waistCm: waistCm,
        abdomenCm: waistCm + 2,
        chestCm: waistCm + 8,
        armsCm: 36,
      ),
    ];
    _save();
    notifyListeners();
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  int get totalCalories =>
      meals.where((m) => m.completed).fold(0, (s, m) => s + m.calories);
  int get totalProtein =>
      meals.where((m) => m.completed).fold(0, (s, m) => s + m.proteinG);
  int get totalCarbs =>
      meals.where((m) => m.completed).fold(0, (s, m) => s + m.carbsG);
  int get totalFat =>
      meals.where((m) => m.completed).fold(0, (s, m) => s + m.fatG);

  int get dailyGoalPercent {
    final waterRatio =
        (waterLiters / profile.waterTargetLiters).clamp(0.0, 1.0);
    final sleepRatio = (sleepHours / profile.sleepTargetHours).clamp(0.0, 1.0);
    final calRatio = (totalCalories / profile.calorieTargetMin).clamp(0.0, 1.0);
    final score = (workoutDone ? 0.35 : 0.0) +
        (healthyEatingDone ? 0.25 : calRatio * 0.2) +
        waterRatio * 0.2 +
        sleepRatio * 0.2;
    return (score * 100).round().clamp(0, 100);
  }

  double get currentWeight => measurements.isNotEmpty
      ? measurements.last.weightKg
      : profile.initialWeightKg;
  double get currentWaist =>
      measurements.isNotEmpty ? measurements.last.waistCm : 94.0;

  double get bodyFatPercent {
    final hM = (profile.heightCm / 100).clamp(1.2, 2.5);
    final bmi = currentWeight / (hM * hM);
    final base = 1.2 * bmi + 0.23 * profile.age - 16.2;
    final waistAdj = (currentWaist - 94) * 0.3;
    return (base + waistAdj).clamp(5.0, 55.0);
  }

  double get weightDelta {
    if (measurements.length < 2) return 0;
    return measurements.last.weightKg - measurements.first.weightKg;
  }

  double get waistDelta {
    if (measurements.length < 2) return 0;
    return measurements.last.waistCm - measurements.first.waistCm;
  }

  // ── Streaks ───────────────────────────────────────────────────────────────
  HabitStreaks get streaks => _computeStreaks();

  HabitStreaks _computeStreaks() {
    // Snapshot today before computing
    _snapshotTodayHabits();
    int workoutStreak = 0;
    int waterStreak = 0;
    int sleepStreak = 0;
    int kegelStreak = 0;
    int healthyStreak = 0;

    for (int i = 0; i < 90; i++) {
      final dateStr = _daysAgo(i);
      final h = habitsByDate[dateStr];
      if (h == null) break;
      if ((h['workoutDone'] as bool?) == true) {
        workoutStreak++;
      } else {
        workoutStreak = 0;
        break;
      }
      if (((h['waterLiters'] as num?)?.toDouble() ?? 0) >=
          profile.waterTargetLiters) {
        waterStreak++;
      } else {
        waterStreak = 0;
      }
      if (((h['sleepHours'] as num?)?.toDouble() ?? 0) >= 7) {
        sleepStreak++;
      } else {
        sleepStreak = 0;
      }
      if ((h['kegelDone'] as bool?) == true) {
        kegelStreak++;
      } else {
        kegelStreak = 0;
      }
      if ((h['healthyEatingDone'] as bool?) == true) {
        healthyStreak++;
      } else {
        healthyStreak = 0;
      }
    }

    return HabitStreaks(
      workout: workoutStreak,
      water: waterStreak,
      sleep: sleepStreak,
      kegel: kegelStreak,
      healthy: healthyStreak,
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  void toggleHabit({bool? workout, bool? eating}) {
    if (workout != null) workoutDone = workout;
    if (eating != null) healthyEatingDone = eating;
    _save();
    notifyListeners();
  }

  void addWater(double delta) {
    waterLiters = (waterLiters + delta).clamp(0.0, 6.0);
    _save();
    notifyListeners();
  }

  void setSleep(double hours) {
    sleepHours = hours;
    _save();
    notifyListeners();
  }

  void completeWorkout(WorkoutRoutine routine, int seconds) {
    workoutDone = true;
    final session = WorkoutSessionLog(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      routineId: routine.id,
      title: routine.title,
      durationSec: seconds,
      caloriesBurned: routine.caloriesEstimate,
      completedAt: DateTime.now().toIso8601String(),
    );
    completedSessions.insert(0, session);
    _save();
    notifyListeners();
  }

  void recordKegel(int cycles, int holdSec, int relaxSec) {
    kegelDone = true;
    kegelSessions.insert(
      0,
      KegelSessionLog(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        completedAt: DateTime.now().toIso8601String(),
        cycles: cycles,
        holdSec: holdSec,
        relaxSec: relaxSec,
      ),
    );
    _save();
    notifyListeners();
  }

  void markKegelDone() {
    kegelDone = true;
    _save();
    notifyListeners();
  }

  void addMeal(MealEntry entry) {
    meals = [...meals, entry];
    _save();
    notifyListeners();
  }

  void deleteMeal(String id) {
    meals = meals.where((m) => m.id != id).toList();
    _save();
    notifyListeners();
  }

  void toggleMealCompleted(String id) {
    meals = meals
        .map((m) => m.id == id ? m.copyWith(completed: !m.completed) : m)
        .toList();
    _save();
    notifyListeners();
  }

  void addShoppingItem(String name, String quantity) {
    shoppingList = [
      ...shoppingList,
      ShoppingItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: name,
        quantity: quantity,
      ),
    ];
    _save();
    notifyListeners();
  }

  void deleteShoppingItem(String id) {
    shoppingList = shoppingList.where((s) => s.id != id).toList();
    _save();
    notifyListeners();
  }

  void addMeasurement(BodyMeasurement entry) {
    measurements = [...measurements, entry];
    _save();
    notifyListeners();
  }

  void toggleShopping(String id) {
    shoppingList = shoppingList
        .map((e) => e.id == id ? e.copyWith(checked: !e.checked) : e)
        .toList();
    _save();
    notifyListeners();
  }

  void setReminder({bool? workout, bool? water, bool? kegel}) {
    if (workout != null) remindWorkout = workout;
    if (water != null) remindWater = water;
    if (kegel != null) remindKegel = kegel;
    _save();
    notifyListeners();
  }

  void saveDailyNote(String text, {String? dateIso}) {
    final key = dateIso ?? _todayIso();
    dailyNotes[key] = text;
    _save();
    notifyListeners();
  }

  void addProgressPhoto(ProgressPhoto photo) {
    progressPhotos.insert(0, photo);
    _save();
    notifyListeners();
  }

  void deleteProgressPhoto(String id) {
    progressPhotos.removeWhere((p) => p.id == id);
    _save();
    notifyListeners();
  }

  void updateProfile(UserProfile updated) {
    profile = updated;
    _save();
    notifyListeners();
  }

  void toggleSimulatedOffline() {
    _simulatedOffline = !_simulatedOffline;
    if (_simulatedOffline) {
      syncStatus = SyncStatus.offline;
    } else {
      if (pendingChanges > 0) {
        _flushPendingChanges();
      } else {
        syncStatus = isOnline ? SyncStatus.synced : SyncStatus.offline;
      }
    }
    notifyListeners();
  }

  Future<void> manualSync() async {
    if (!isOnline || _simulatedOffline) return;
    await _flushPendingChanges();
  }

  // ── Export ────────────────────────────────────────────────────────────────
  String exportJson() => const JsonEncoder.withIndent('  ').convert({
        'profile': profile.toJson(),
        'meals': meals.map((e) => e.toJson()).toList(),
        'measurements': measurements.map((e) => e.toJson()).toList(),
        'completedSessions': completedSessions.map((e) => e.toJson()).toList(),
      });

  // ── Delete Account ────────────────────────────────────────────────────────
  Future<void> deleteAccount() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
    isAuthenticated = false;
    meals = [];
    measurements = [];
    completedSessions = [];
    kegelSessions = [];
    dailyNotes = {};
    progressPhotos = [];
    notifyListeners();
  }
}
