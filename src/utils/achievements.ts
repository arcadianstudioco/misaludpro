import { WorkoutSessionLog, DailyHabits, MealEntry } from '../types/health';

export type AchievementCategory = 'constancia' | 'carrera' | 'nutricion' | 'sueno' | 'fuerza' | 'habitos';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: AchievementCategory;
  emoji: string;
  color: string;           // accent color
  bgColor: string;         // ring/bg color
  points: number;
  requiredValue: number;
  unit: string;
  unlockedAt?: string;     // ISO date string when unlocked
  progress?: number;       // 0–1 for locked ones
}

export interface UserLevel {
  level: number;
  title: string;
  currentXp: number;
  xpToNext: number;
  totalXp: number;
}

/** All possible achievements the app tracks */
export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // ── CONSTANCIA ──
  {
    id: 'streak_3',
    title: 'Racha de 3 días',
    description: 'Completaste hábitos 3 días seguidos',
    longDescription: 'Mantuviste tu rutina de salud durante 3 días consecutivos. La constancia es la clave del progreso real.',
    category: 'constancia',
    emoji: '🔥',
    color: '#FF6B35',
    bgColor: '#FF6B35',
    points: 50,
    requiredValue: 3,
    unit: 'días',
  },
  {
    id: 'streak_7',
    title: 'Semana perfecta',
    description: 'Completaste hábitos 7 días seguidos',
    longDescription: 'Una semana completa sin rendirte. Este logro demuestra que ya tienes disciplina. ¡Sigue así!',
    category: 'constancia',
    emoji: '🏆',
    color: '#FFD700',
    bgColor: '#FFD700',
    points: 100,
    requiredValue: 7,
    unit: 'días',
  },
  {
    id: 'streak_14',
    title: 'Dos semanas de fuego',
    description: 'Completaste hábitos 14 días seguidos',
    longDescription: '14 días de constancia pura. Estás construyendo hábitos que duran toda la vida.',
    category: 'constancia',
    emoji: '🔥',
    color: '#FF4500',
    bgColor: '#FF4500',
    points: 200,
    requiredValue: 14,
    unit: 'días',
  },
  {
    id: 'streak_30',
    title: 'Mes imparable',
    description: 'Completaste hábitos 30 días seguidos',
    longDescription: '30 días seguidos. ¡Esto ya no es una racha, es un estilo de vida! Eres oficialmente imparable.',
    category: 'constancia',
    emoji: '💎',
    color: '#5AC8FA',
    bgColor: '#5AC8FA',
    points: 500,
    requiredValue: 30,
    unit: 'días',
  },

  // ── CARRERA / ACTIVIDAD ──
  {
    id: 'run_5k',
    title: 'Primera 5K',
    description: 'Corriste 5 kilómetros en una sesión',
    longDescription: 'Completaste tu primera carrera de 5K. Un hito que marca el inicio de tu vida como corredor.',
    category: 'carrera',
    emoji: '🏃',
    color: '#0A95FF',
    bgColor: '#0A95FF',
    points: 150,
    requiredValue: 5,
    unit: 'km',
  },
  {
    id: 'run_10k',
    title: 'Corredor 10K',
    description: 'Corriste 10 kilómetros en una sesión',
    longDescription: 'Diez kilómetros de una sola vez. Tu resistencia cardiovascular está en otro nivel.',
    category: 'carrera',
    emoji: '🏅',
    color: '#9CE819',
    bgColor: '#9CE819',
    points: 300,
    requiredValue: 10,
    unit: 'km',
  },
  {
    id: 'sessions_5',
    title: '5 sesiones completadas',
    description: 'Completaste 5 sesiones de entrenamiento',
    longDescription: 'Cinco sesiones en el registro. Tu cuerpo ya empieza a notar la diferencia.',
    category: 'fuerza',
    emoji: '💪',
    color: '#BF5AF2',
    bgColor: '#BF5AF2',
    points: 100,
    requiredValue: 5,
    unit: 'sesiones',
  },
  {
    id: 'sessions_20',
    title: 'Atleta en progreso',
    description: 'Completaste 20 sesiones de entrenamiento',
    longDescription: '20 sesiones. Los resultados ya son visibles. Eres un atleta en formación.',
    category: 'fuerza',
    emoji: '🥇',
    color: '#FFD700',
    bgColor: '#FFD700',
    points: 300,
    requiredValue: 20,
    unit: 'sesiones',
  },

  // ── NUTRICIÓN ──
  {
    id: 'nutrition_3days',
    title: 'Control de calorías (3 días)',
    description: 'Registraste tus comidas 3 días seguidos',
    longDescription: 'Tres días de registro nutricional constante. Lo que se mide, se puede mejorar.',
    category: 'nutricion',
    emoji: '🥗',
    color: '#4CD964',
    bgColor: '#4CD964',
    points: 100,
    requiredValue: 3,
    unit: 'días',
  },
  {
    id: 'nutrition_7days',
    title: 'Semana nutricional',
    description: 'Registraste tus comidas 7 días seguidos',
    longDescription: 'Una semana completa controlando tu nutrición. Tu relación con la comida ha cambiado para siempre.',
    category: 'nutricion',
    emoji: '🍎',
    color: '#FA114F',
    bgColor: '#FA114F',
    points: 200,
    requiredValue: 7,
    unit: 'días',
  },

  // ── SUEÑO ──
  {
    id: 'sleep_7nights',
    title: 'Sueño reparador',
    description: 'Dormiste bien 7 noches consecutivas',
    longDescription: 'Siete noches de sueño de calidad. El descanso es donde el cuerpo se reconstruye. ¡Excelente hábito!',
    category: 'sueno',
    emoji: '🌙',
    color: '#5E5CE6',
    bgColor: '#5E5CE6',
    points: 150,
    requiredValue: 7,
    unit: 'noches',
  },

  // ── HÁBITOS ──
  {
    id: 'water_7days',
    title: 'Meta de agua (7 días)',
    description: 'Alcanzaste tu meta de hidratación 7 días',
    longDescription: 'Siete días cumpliendo tu meta de agua. La hidratación es la base de todo rendimiento.',
    category: 'habitos',
    emoji: '💧',
    color: '#5AC8FA',
    bgColor: '#5AC8FA',
    points: 100,
    requiredValue: 7,
    unit: 'días',
  },
  {
    id: 'weight_logged',
    title: 'Primera medida',
    description: 'Registraste tu primer peso y medida',
    longDescription: 'Diste el primer paso: conocerte. Registrar tus medidas es el acto de alguien serio con su salud.',
    category: 'habitos',
    emoji: '📏',
    color: '#FF9500',
    bgColor: '#FF9500',
    points: 50,
    requiredValue: 1,
    unit: 'registro',
  },
];

/** Compute which achievements are unlocked given the user's data */
export function computeAchievements(params: {
  currentStreak: number;
  sessions: WorkoutSessionLog[];
  habitsByDate: Record<string, DailyHabits>;
  measurements: { date: string }[];
  meals: MealEntry[];
}): Achievement[] {
  const { currentStreak, sessions, habitsByDate, measurements, meals } = params;

  const totalSessions = sessions.length;

  // Max single-run distance in km
  const maxRunKm = sessions.reduce((max, s) => {
    if (!s.isOutdoor || !s.distanceMiles) return max;
    return Math.max(max, s.distanceMiles * 1.60934);
  }, 0);

  // Count days with at least one meal logged
  const mealDays = new Set(meals.map((m) => m.date)).size;

  // Count days where water target was met (≥ 2L)
  const waterDays = Object.values(habitsByDate).filter((h) => h.waterLiters >= 2).length;

  // Count good sleep nights (≥ 7h)
  const sleepNights = Object.values(habitsByDate).filter((h) => h.sleepHours >= 7).length;

  // All habit dates sorted for consecutive meal counting
  const sortedMealDates = [...new Set(meals.map((m) => m.date))].sort();
  let maxMealStreak = 0;
  let mealStreak = 0;
  for (let i = 0; i < sortedMealDates.length; i++) {
    if (i === 0) { mealStreak = 1; }
    else {
      const prev = new Date(sortedMealDates[i - 1]);
      const curr = new Date(sortedMealDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      mealStreak = diff === 1 ? mealStreak + 1 : 1;
    }
    maxMealStreak = Math.max(maxMealStreak, mealStreak);
  }

  const getValue = (id: string): number => {
    switch (id) {
      case 'streak_3':
      case 'streak_7':
      case 'streak_14':
      case 'streak_30':
        return currentStreak;
      case 'run_5k':
      case 'run_10k':
        return maxRunKm;
      case 'sessions_5':
      case 'sessions_20':
        return totalSessions;
      case 'nutrition_3days':
      case 'nutrition_7days':
        return maxMealStreak;
      case 'sleep_7nights':
        return sleepNights;
      case 'water_7days':
        return waterDays;
      case 'weight_logged':
        return measurements.length;
      default:
        return 0;
    }
  };

  return ALL_ACHIEVEMENTS.map((def) => {
    const value = getValue(def.id);
    const unlocked = value >= def.requiredValue;

    // Try to find the approximate unlock date
    let unlockedAt: string | undefined;
    if (unlocked) {
      if (def.id.startsWith('streak_')) {
        // find the date when streak first hit the required value
        const habitDates = Object.keys(habitsByDate).sort();
        unlockedAt = habitDates[def.requiredValue - 1] ?? habitDates[habitDates.length - 1];
      } else if (def.id.startsWith('sessions_')) {
        const sorted = [...sessions].sort((a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        unlockedAt = sorted[def.requiredValue - 1]?.completedAt;
      } else {
        unlockedAt = new Date().toISOString().slice(0, 10);
      }
    }

    return {
      ...def,
      unlockedAt,
      progress: unlocked ? 1 : Math.min(0.99, value / def.requiredValue),
    };
  });
}

export function computeUserLevel(achievements: Achievement[]): UserLevel {
  const totalXp = achievements
    .filter((a) => a.unlockedAt)
    .reduce((sum, a) => sum + a.points, 0);

  const levels = [
    { level: 1, title: 'Recién llegado', xpRequired: 0 },
    { level: 2, title: 'Aprendiz de salud', xpRequired: 100 },
    { level: 3, title: 'Guerrero de la salud', xpRequired: 300 },
    { level: 4, title: 'Atleta en forma', xpRequired: 600 },
    { level: 5, title: 'Campeón del bienestar', xpRequired: 1000 },
    { level: 6, title: 'Élite', xpRequired: 1500 },
  ];

  let current = levels[0];
  let next = levels[1];
  for (let i = 0; i < levels.length - 1; i++) {
    if (totalXp >= levels[i].xpRequired) {
      current = levels[i];
      next = levels[i + 1] ?? levels[i];
    }
  }

  return {
    level: current.level,
    title: current.title,
    currentXp: totalXp - current.xpRequired,
    xpToNext: next.xpRequired - current.xpRequired,
    totalXp,
  };
}

export function formatAchievementDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type { MealEntry };
