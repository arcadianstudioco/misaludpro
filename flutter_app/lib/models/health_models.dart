import 'dart:convert';

class UserProfile {
  final String name;
  final String email;
  final int age;
  final double heightCm;
  final double initialWeightKg;
  final double targetWeightKg;
  final String goal;
  final String level;
  final int calorieTargetMin;
  final int calorieTargetMax;
  final int proteinTargetG;
  final int carbsTargetG;
  final int fatTargetG;
  final double waterTargetLiters;
  final double sleepTargetHours;

  const UserProfile({
    required this.name,
    required this.email,
    required this.age,
    required this.heightCm,
    required this.initialWeightKg,
    required this.targetWeightKg,
    required this.goal,
    required this.level,
    required this.calorieTargetMin,
    required this.calorieTargetMax,
    required this.proteinTargetG,
    required this.carbsTargetG,
    required this.fatTargetG,
    this.waterTargetLiters = 3.0,
    this.sleepTargetHours = 8.0,
  });

  double get bmi {
    final hM = heightCm / 100.0;
    if (hM <= 0) return 0;
    return double.parse((initialWeightKg / (hM * hM)).toStringAsFixed(1));
  }

  UserProfile copyWith({
    String? name,
    String? email,
    int? age,
    double? heightCm,
    double? initialWeightKg,
    double? targetWeightKg,
    String? goal,
    String? level,
    int? calorieTargetMin,
    int? calorieTargetMax,
    int? proteinTargetG,
    int? carbsTargetG,
    int? fatTargetG,
  }) {
    return UserProfile(
      name: name ?? this.name,
      email: email ?? this.email,
      age: age ?? this.age,
      heightCm: heightCm ?? this.heightCm,
      initialWeightKg: initialWeightKg ?? this.initialWeightKg,
      targetWeightKg: targetWeightKg ?? this.targetWeightKg,
      goal: goal ?? this.goal,
      level: level ?? this.level,
      calorieTargetMin: calorieTargetMin ?? this.calorieTargetMin,
      calorieTargetMax: calorieTargetMax ?? this.calorieTargetMax,
      proteinTargetG: proteinTargetG ?? this.proteinTargetG,
      carbsTargetG: carbsTargetG ?? this.carbsTargetG,
      fatTargetG: fatTargetG ?? this.fatTargetG,
      waterTargetLiters: waterTargetLiters,
      sleepTargetHours: sleepTargetHours,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'age': age,
        'heightCm': heightCm,
        'initialWeightKg': initialWeightKg,
        'targetWeightKg': targetWeightKg,
        'goal': goal,
        'level': level,
        'calorieTargetMin': calorieTargetMin,
        'calorieTargetMax': calorieTargetMax,
        'proteinTargetG': proteinTargetG,
        'carbsTargetG': carbsTargetG,
        'fatTargetG': fatTargetG,
        'waterTargetLiters': waterTargetLiters,
        'sleepTargetHours': sleepTargetHours,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        name: json['name'] as String? ?? 'Usuario',
        email: json['email'] as String? ?? 'usuario@misaludpro.app',
        age: json['age'] as int? ?? 33,
        heightCm: (json['heightCm'] as num?)?.toDouble() ?? 182.88,
        initialWeightKg: (json['initialWeightKg'] as num?)?.toDouble() ?? 100.0,
        targetWeightKg: (json['targetWeightKg'] as num?)?.toDouble() ?? 90.0,
        goal: json['goal'] as String? ?? 'Reducir grasa y ganar salud',
        level: json['level'] as String? ?? 'Intermedio',
        calorieTargetMin: json['calorieTargetMin'] as int? ?? 2200,
        calorieTargetMax: json['calorieTargetMax'] as int? ?? 2400,
        proteinTargetG: json['proteinTargetG'] as int? ?? 150,
        carbsTargetG: json['carbsTargetG'] as int? ?? 300,
        fatTargetG: json['fatTargetG'] as int? ?? 80,
        waterTargetLiters:
            (json['waterTargetLiters'] as num?)?.toDouble() ?? 3.0,
        sleepTargetHours:
            (json['sleepTargetHours'] as num?)?.toDouble() ?? 8.0,
      );
}

class ExerciseStep {
  final String name;
  final String sets;
  final int durationSec;
  final String instructions;

  const ExerciseStep({
    required this.name,
    required this.sets,
    required this.durationSec,
    required this.instructions,
  });
}

class WorkoutRoutine {
  final String id;
  final String title;
  final String subtitle;
  final String level;
  final int durationMin;
  final String category;
  final bool isFeatured;
  final bool inMyRoutines;
  final int caloriesEstimate;
  final List<ExerciseStep> exercises;

  const WorkoutRoutine({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.level,
    required this.durationMin,
    required this.category,
    this.isFeatured = false,
    this.inMyRoutines = true,
    required this.caloriesEstimate,
    required this.exercises,
  });
}

class MealEntry {
  final String id;
  final String slot;
  final String name;
  final int calories;
  final int proteinG;
  final int carbsG;
  final int fatG;
  final bool completed;

  const MealEntry({
    required this.id,
    required this.slot,
    required this.name,
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    this.completed = true,
  });

  MealEntry copyWith({bool? completed}) => MealEntry(
        id: id,
        slot: slot,
        name: name,
        calories: calories,
        proteinG: proteinG,
        carbsG: carbsG,
        fatG: fatG,
        completed: completed ?? this.completed,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'slot': slot,
        'name': name,
        'calories': calories,
        'proteinG': proteinG,
        'carbsG': carbsG,
        'fatG': fatG,
        'completed': completed,
      };

  factory MealEntry.fromJson(Map<String, dynamic> json) => MealEntry(
        id: json['id'] as String,
        slot: json['slot'] as String,
        name: json['name'] as String,
        calories: json['calories'] as int,
        proteinG: json['proteinG'] as int,
        carbsG: json['carbsG'] as int,
        fatG: json['fatG'] as int,
        completed: json['completed'] as bool? ?? true,
      );
}

class BodyMeasurement {
  final String date;
  final double weightKg;
  final double waistCm;
  final double abdomenCm;
  final double chestCm;
  final double armsCm;

  const BodyMeasurement({
    required this.date,
    required this.weightKg,
    required this.waistCm,
    required this.abdomenCm,
    required this.chestCm,
    required this.armsCm,
  });

  Map<String, dynamic> toJson() => {
        'date': date,
        'weightKg': weightKg,
        'waistCm': waistCm,
        'abdomenCm': abdomenCm,
        'chestCm': chestCm,
        'armsCm': armsCm,
      };

  factory BodyMeasurement.fromJson(Map<String, dynamic> json) =>
      BodyMeasurement(
        date: json['date'] as String,
        weightKg: (json['weightKg'] as num).toDouble(),
        waistCm: (json['waistCm'] as num).toDouble(),
        abdomenCm: (json['abdomenCm'] as num).toDouble(),
        chestCm: (json['chestCm'] as num).toDouble(),
        armsCm: (json['armsCm'] as num).toDouble(),
      );
}

class ShoppingItem {
  final String id;
  final String name;
  final String quantity;
  final bool checked;

  const ShoppingItem({
    required this.id,
    required this.name,
    required this.quantity,
    this.checked = false,
  });

  ShoppingItem copyWith({bool? checked}) => ShoppingItem(
        id: id,
        name: name,
        quantity: quantity,
        checked: checked ?? this.checked,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'quantity': quantity,
        'checked': checked,
      };

  factory ShoppingItem.fromJson(Map<String, dynamic> json) => ShoppingItem(
        id: json['id'] as String,
        name: json['name'] as String,
        quantity: json['quantity'] as String,
        checked: json['checked'] as bool? ?? false,
      );
}

// ─── Workout Session Log ──────────────────────────────────────────────────────
class WorkoutSessionLog {
  final String id;
  final String routineId;
  final String title;
  final int durationSec;
  final int caloriesBurned;
  final String completedAt;

  const WorkoutSessionLog({
    required this.id,
    required this.routineId,
    required this.title,
    required this.durationSec,
    required this.caloriesBurned,
    required this.completedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'routineId': routineId,
        'title': title,
        'durationSec': durationSec,
        'caloriesBurned': caloriesBurned,
        'completedAt': completedAt,
      };
}

// ─── Kegel Session Log ────────────────────────────────────────────────────────
class KegelSessionLog {
  final String id;
  final String completedAt;
  final int cycles;
  final int holdSec;
  final int relaxSec;

  const KegelSessionLog({
    required this.id,
    required this.completedAt,
    required this.cycles,
    required this.holdSec,
    required this.relaxSec,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'completedAt': completedAt,
        'cycles': cycles,
        'holdSec': holdSec,
        'relaxSec': relaxSec,
      };
}

// ─── Progress Photo ───────────────────────────────────────────────────────────
class ProgressPhoto {
  final String id;
  final String label;
  final String dataUrl; // base64 or file path on mobile
  final String date;

  const ProgressPhoto({
    required this.id,
    required this.label,
    required this.dataUrl,
    required this.date,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'dataUrl': dataUrl,
        'date': date,
      };
}

String encodePrettyJson(Map<String, dynamic> map) =>
    const JsonEncoder.withIndent('  ').convert(map);
