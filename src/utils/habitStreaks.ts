import { DailyHabits, UserProfile } from '../types/health';

export interface HabitStreakInfo {
  days: number;
  completedToday: boolean;
}

export interface AllHabitStreaks {
  overall: HabitStreakInfo;
  workout: HabitStreakInfo;
  eating: HabitStreakInfo;
  water: HabitStreakInfo;
  sleep: HabitStreakInfo;
  kegel: HabitStreakInfo;
}

export interface FlameTier {
  id: 'none' | 'amber' | 'orange' | 'crimson' | 'legendary';
  label: string;
  hex: string;
  fillHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowShadow: string;
}

export function getFlameTier(days: number): FlameTier {
  if (days >= 14) {
    return {
      id: 'legendary',
      label: 'Legendaria',
      hex: '#38BDF8',
      fillHex: '#0EA5E9',
      textClass: 'text-[#7DD3FC]',
      bgClass: 'bg-[#38BDF8]/14',
      borderClass: 'border-[#38BDF8]/40',
      glowShadow: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.65))',
    };
  }
  if (days >= 7) {
    return {
      id: 'crimson',
      label: 'Imparable',
      hex: '#FA114F',
      fillHex: '#FA114F',
      textClass: 'text-[#FF5C8A]',
      bgClass: 'bg-[#FA114F]/14',
      borderClass: 'border-[#FA114F]/40',
      glowShadow: 'drop-shadow(0 0 6px rgba(250, 17, 79, 0.55))',
    };
  }
  if (days >= 3) {
    return {
      id: 'orange',
      label: 'En llamas',
      hex: '#FF6B2C',
      fillHex: '#FF6B2C',
      textClass: 'text-[#FF925E]',
      bgClass: 'bg-[#FF6B2C]/14',
      borderClass: 'border-[#FF6B2C]/38',
      glowShadow: 'drop-shadow(0 0 5px rgba(255, 107, 44, 0.5))',
    };
  }
  if (days >= 1) {
    return {
      id: 'amber',
      label: 'Inicio',
      hex: '#F59E0B',
      fillHex: '#F59E0B',
      textClass: 'text-[#FBBF24]',
      bgClass: 'bg-[#F59E0B]/12',
      borderClass: 'border-[#F59E0B]/32',
      glowShadow: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))',
    };
  }
  return {
    id: 'none',
    label: 'Sin racha',
    hex: '#5D6E63',
    fillHex: 'none',
    textClass: 'text-[#87978C]',
    bgClass: 'bg-white/[0.04]',
    borderClass: 'border-white/10',
    glowShadow: 'none',
  };
}

function shiftIsoDate(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() - deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function calculateHabitStreak(
  habitsByDate: Record<string, DailyHabits>,
  predicate: (h: DailyHabits) => boolean,
  todayIso: string,
  maxLookback = 180
): HabitStreakInfo {
  const todayEntry = habitsByDate[todayIso];
  const completedToday = Boolean(todayEntry && predicate(todayEntry));

  const startOffset = completedToday ? 0 : 1;
  let days = 0;

  for (let offset = startOffset; offset < maxLookback; offset += 1) {
    const iso = shiftIsoDate(todayIso, offset);
    const entry = habitsByDate[iso];
    if (entry && predicate(entry)) {
      days += 1;
    } else {
      break;
    }
  }

  return { days, completedToday };
}

export function computeAllHabitStreaks(
  habitsByDate: Record<string, DailyHabits>,
  profile: UserProfile,
  todayIso: string
): AllHabitStreaks {
  const isWorkout = (h: DailyHabits) => Boolean(h.workoutDone);
  const isEating = (h: DailyHabits) => Boolean(h.healthyEatingDone);
  const isWater = (h: DailyHabits) => h.waterLiters >= profile.waterTargetLiters;
  const isSleep = (h: DailyHabits) => h.sleepHours >= 7;
  const isKegel = (h: DailyHabits) => Boolean(h.kegelDone);

  // Un día cuenta para la racha general cuando se completan al menos 2 hábitos clave
  const isOverallDay = (h: DailyHabits) => {
    const doneCount = [isWorkout(h), isEating(h), isWater(h), isSleep(h)].filter(
      Boolean
    ).length;
    return doneCount >= 2;
  };

  return {
    overall: calculateHabitStreak(habitsByDate, isOverallDay, todayIso),
    workout: calculateHabitStreak(habitsByDate, isWorkout, todayIso),
    eating: calculateHabitStreak(habitsByDate, isEating, todayIso),
    water: calculateHabitStreak(habitsByDate, isWater, todayIso),
    sleep: calculateHabitStreak(habitsByDate, isSleep, todayIso),
    kegel: calculateHabitStreak(habitsByDate, isKegel, todayIso),
  };
}
