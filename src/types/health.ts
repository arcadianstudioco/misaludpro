export type TabId = 'inicio' | 'rutinas' | 'nutricion' | 'estadisticas' | 'perfil';

export type FitnessGoal =
  | 'Reducir grasa y ganar salud'
  | 'Ganar masa muscular'
  | 'Mejorar resistencia y hábitos';

export type FitnessLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export type WorkoutLocation = 'Casa' | 'Gym' | 'Mixto';

export type ExerciseAnimKind =
  | 'squat'
  | 'pushup'
  | 'row'
  | 'plank'
  | 'jumping_jacks'
  | 'mountain_climber'
  | 'burpee'
  | 'cat_cow'
  | 'hip_90_90'
  | 'stretch'
  | 'kegel_breath'
  | 'kegel_pulse'
  | 'press'
  | 'pulldown'
  | 'run';

export type OutdoorActivityType =
  | 'Carrera al aire libre'
  | 'Caminata al aire libre';

export interface GpsRoutePoint {
  lat: number;
  lng: number;
  altitudeM?: number | null;
  timestamp: number;
  speedMps?: number | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  age: number;
  heightCm: number;
  initialWeightKg: number;
  targetWeightKg: number;
  goal: FitnessGoal;
  level: FitnessLevel;
  location: WorkoutLocation;
  calorieTargetMin: number;
  calorieTargetMax: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  waterTargetLiters: number;
  sleepTargetHours: number;
  createdAt: string;
}

export interface DailyHabits {
  date: string; // YYYY-MM-DD
  workoutDone: boolean;
  healthyEatingDone: boolean;
  waterLiters: number;
  sleepHours: number;
  kegelDone: boolean;
  bedtimeStartedAt?: string;
}

export interface ExerciseStep {
  id: string;
  name: string;
  sets: string;
  durationSec: number;
  restSec: number;
  instructions: string;
  animKind?: ExerciseAnimKind;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  subtitle: string;
  level: FitnessLevel;
  durationMin: number;
  category: 'Fuerza' | 'Cardio' | 'Movilidad' | 'Suelo Pélvico';
  location: WorkoutLocation;
  isFeatured?: boolean;
  inMyRoutines: boolean;
  caloriesEstimate: number;
  thumbnailType: 'strength' | 'cardio' | 'mobility' | 'kegel';
  exercises: ExerciseStep[];
}

export interface WorkoutSessionLog {
  id: string;
  routineId: string;
  routineTitle: string;
  durationSec: number;
  caloriesBurned: number;
  completedAt: string;
  isOutdoor?: boolean;
  activityType?: OutdoorActivityType;
  distanceMiles?: number;
  activeCalories?: number;
  totalCalories?: number;
  altitudeFeet?: number;
  avgPaceText?: string;
  dateTimeLabel?: string;
  deviceLabel?: string;
  routePoints?: GpsRoutePoint[];
}

export type MealSlot = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';

export interface MealEntry {
  id: string;
  date: string;
  slot: MealSlot;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  completed: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  checked: boolean;
}

export interface BodyMeasurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  waistCm: number;
  abdomenCm: number;
  chestCm: number;
  armsCm: number;
  note?: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  label: string;
  dataUrl: string;
}

export interface KegelSessionLog {
  id: string;
  date: string;
  cyclesCompleted: number;
  holdSeconds: number;
  relaxSeconds: number;
}

export interface ReminderSettings {
  workoutEnabled: boolean;
  workoutTime: string;
  hydrationEnabled: boolean;
  hydrationIntervalHours: number;
  mealsEnabled: boolean;
  mealsTime: string;
  kegelEnabled: boolean;
  kegelTime: string;
  sleepEnabled: boolean;
  sleepTime: string;
  wakeUpEnabled?: boolean;
  wakeUpTime?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  profile: UserProfile;
  habitsByDate: Record<string, DailyHabits>;
  dailyNotes?: Record<string, string>;
  routines: WorkoutRoutine[];
  workoutSessions: WorkoutSessionLog[];
  meals: MealEntry[];
  shoppingList: ShoppingItem[];
  measurements: BodyMeasurement[];
  progressPhotos: ProgressPhoto[];
  kegelSessions: KegelSessionLog[];
  reminders: ReminderSettings;
}
