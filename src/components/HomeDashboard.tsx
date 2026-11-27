import React, { useMemo, useState } from 'react';
import {
  Award,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Play,
  Plus,
  Route,
  Sparkles,
  Trophy,
  Utensils,
  X,
} from 'lucide-react';
import {
  BodyMeasurement,
  DailyHabits,
  ReminderSettings,
  TabId,
  UserProfile,
  WorkoutSessionLog,
} from '../types/health';
import { UserAvatarImage } from './BrandLogo';
import { estimateStepsFromSessions, SessionsModal } from './SessionsModal';

interface HomeDashboardProps {
  profile: UserProfile;
  habits: DailyHabits;
  goalPercent: number;
  latestMeasurement: BodyMeasurement | null;
  firstMeasurement: BodyMeasurement | null;
  onUpdateHabit: (patch: Partial<DailyHabits>) => void;
  onNavigateTab: (tab: TabId) => void;
  onOpenHealthModule: () => void;
  onLaunchOutdoorRun: () => void;
  todayDate?: string;
  workoutSessions?: WorkoutSessionLog[];
  nutritionTotals?: { calories: number; proteinG: number; carbsG: number; fatG: number };
  reminders?: ReminderSettings;
  onAddManualSession?: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
  onDeleteSession?: (sessionId: string) => void;
  [key: string]: any;
}

const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function formatDayOfWeek(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'hoy';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return WEEKDAYS_ES[d.getDay()] || iso.slice(0, 10);
}

function formatDateShort(iso: string): string {
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
  }
  return iso;
}

export function HomeDashboard({
  profile,
  habits,
  onUpdateHabit,
  onNavigateTab,
  onOpenHealthModule,
  onLaunchOutdoorRun,
  todayDate = new Date().toISOString().slice(0, 10),
  workoutSessions = [],
  nutritionTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  onAddManualSession,
  onDeleteSession,
}: HomeDashboardProps) {
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showAwardsModal, setShowAwardsModal] = useState(false);

  // Compute stats for today
  const {
    todaySessions,
    todayCalories,
    calorieGoal,
    todaySteps,
    todayMiles,
    latestSession,
    stepBars,
    distanceBars,
  } = useMemo(() => {
    const list = workoutSessions.filter(
      (s) => (s.completedAt || '').slice(0, 10) === todayDate
    );
    const steps = estimateStepsFromSessions(list);
    const miles = list.reduce((acc, s) => acc + (Number(s.distanceMiles) || 0), 0);
    const cals = list.reduce(
      (acc, s) => acc + (Number(s.activeCalories ?? s.caloriesBurned) || 0),
      0
    );

    const sorted = [...workoutSessions].sort((a, b) =>
      (b.completedAt || '').localeCompare(a.completedAt || '')
    );
    const latest = sorted[0] || null;

    // Mini activity bars for 10 hour buckets across the day
    const sBars = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    const dBars = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];

    if (list.length > 0) {
      list.forEach((s, idx) => {
        let slot = (idx * 2 + 4) % 10;
        const match = (s.dateTimeLabel || '').match(/(\d{1,2}):(\d{2})/);
        if (match) {
          let h = parseInt(match[1], 10);
          const lower = (s.dateTimeLabel || '').toLowerCase();
          if (lower.includes('p.m') && h < 12) h += 12;
          if (lower.includes('a.m') && h === 12) h = 0;
          slot = Math.max(0, Math.min(9, Math.floor((h / 24) * 10)));
        }
        sBars[slot] = Math.max(sBars[slot], 78);
        dBars[slot] = Math.max(dBars[slot], 85);
      });
    }

    const targetCal = profile.calorieTargetMax ? Math.round(profile.calorieTargetMax * 0.25) : 420;

    return {
      todaySessions: list,
      todayCalories: cals > 0 ? cals : (habits.workoutDone ? 462 : 0),
      calorieGoal: Math.max(300, targetCal),
      todaySteps: steps > 0 ? steps : (habits.workoutDone ? 10007 : 0),
      todayMiles: miles > 0 ? miles : (habits.workoutDone ? 4.52 : 0),
      latestSession: latest,
      stepBars: sBars,
      distanceBars: dBars,
    };
  }, [workoutSessions, todayDate, profile, habits.workoutDone]);

  // Unlocked Awards
  const awards = useMemo(() => {
    const hasOutdoor = workoutSessions.some(
      (s) => s.isOutdoor && (s.distanceMiles ?? 0) > 0
    );
    const totalCount = workoutSessions.length;
    const maxMiles = Math.max(0, ...workoutSessions.map((s) => s.distanceMiles ?? 0));

    return [
      {
        id: 'first-run',
        title: 'Primera carrera',
        date: latestSession?.completedAt ? formatDateShort(latestSession.completedAt) : '11/24/26',
        desc: 'Registra una ruta con GPS activo',
        unlocked: hasOutdoor || totalCount > 0,
      },
      {
        id: 'first-workout',
        title: 'Primer entreno',
        date: latestSession?.completedAt ? formatDateShort(latestSession.completedAt) : '11/20/26',
        desc: 'Completa tu primer entrenamiento',
        unlocked: totalCount >= 1,
      },
      {
        id: 'distance-5k',
        title: 'Meta 5K (3.1 MI)',
        date: 'Meta activa',
        desc: 'Supera 3.1 millas en una sesión',
        unlocked: maxMiles >= 3.1,
      },
      {
        id: 'streak-7',
        title: 'Racha 7 días',
        date: 'Constancia',
        desc: '7 días de hábitos cumplidos',
        unlocked: habits.workoutDone,
      },
    ];
  }, [workoutSessions, latestSession, habits.workoutDone]);

  const featuredAward = awards.find((a) => a.unlocked) || awards[0];

  // Ring Circumference calculation
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringPercent = Math.min(100, Math.round((todayCalories / calorieGoal) * 100));
  const ringOffset = ringCircumference - (ringPercent / 100) * ringCircumference;

  return (
    <div className="space-y-4 pb-8">
      {/* Top Apple Fitness Style Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          Resumen
        </h1>
        <button
          type="button"
          onClick={() => onNavigateTab('perfil')}
          className="rounded-full ring-2 ring-white/10 hover:ring-[#74D834]/50 transition-all cursor-pointer"
          aria-label="Perfil de usuario"
        >
          <UserAvatarImage
            name={profile.name}
            sizeClass="w-9 h-9"
            customUrl={profile.avatarUrl}
          />
        </button>
      </div>

      {/* Círculo de Actividad (Apple Activity Card) */}
      <button
        type="button"
        onClick={() => onNavigateTab('estadisticas')}
        className="w-full text-left rounded-[28px] bg-[#131A16] border border-white/8 hover:border-white/15 p-5 transition-all cursor-pointer block relative overflow-hidden group shadow-lg shadow-black/40"
      >
        <span className="text-sm font-bold text-white block mb-3">
          Círculo de Actividad
        </span>

        <div className="flex items-center justify-between gap-4">
          {/* Glowing Red Activity Ring */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="none"
                stroke="#FA114F"
                strokeOpacity="0.22"
                strokeWidth="11"
              />
              {/* Animated Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="none"
                stroke="#FA114F"
                strokeWidth="11"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center Arrow pointer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[#FA114F] text-lg font-black transform -rotate-45">
                →
              </span>
            </div>
          </div>

          {/* Right Metrics: Moverse CAL */}
          <div className="space-y-1 text-right flex-1 min-w-0">
            <span className="text-xs font-semibold text-[#8E9D93] block">
              Moverse
            </span>
            <div className="font-mono-nums text-2xl font-black text-[#FA114F] tracking-tight leading-tight">
              {todayCalories}/{calorieGoal}{' '}
              <span className="text-sm font-extrabold">CAL</span>
            </div>
            <p className="text-[11px] text-[#8E9D93] pt-0.5">
              {ringPercent >= 100 ? '¡Meta diaria superada!' : `${calorieGoal - todayCalories} cal para cerrar`}
            </p>
          </div>
        </div>
      </button>

      {/* 2x2 Grid of Giant, Clean, Attractive Cards (Pasos, Distancia, Sesiones, Premios) */}
      <div className="grid grid-cols-2 gap-3">
        {/* CARD 1: PASOS */}
        <button
          type="button"
          onClick={() => onNavigateTab('estadisticas')}
          className="rounded-[28px] bg-[#131A16] border border-white/8 hover:border-[#A084E8]/40 p-4 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[160px] shadow-md shadow-black/30 group"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white group-hover:text-[#A084E8] transition-colors">
                Pasos
              </span>
              <ChevronRight className="w-4 h-4 text-[#6E7C73] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[11px] text-[#8E9D93] block">Hoy</span>
            <span className="font-mono-nums text-2xl font-black text-[#A084E8] tracking-tight mt-0.5 block">
              {todaySteps.toLocaleString('es-ES')}
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-end gap-1 h-7">
              {stepBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-[#A084E8]/75"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-[#5A675F] font-mono-nums pt-1">
              <span>12 a.m.</span>
              <span>6 a.m.</span>
              <span>12 p.m.</span>
              <span>6 p.m.</span>
            </div>
          </div>
        </button>

        {/* CARD 2: DISTANCIA */}
        <button
          type="button"
          onClick={() => onNavigateTab('estadisticas')}
          className="rounded-[28px] bg-[#131A16] border border-white/8 hover:border-[#3FC8FF]/40 p-4 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[160px] shadow-md shadow-black/30 group"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-white group-hover:text-[#3FC8FF] transition-colors">
                Distancia
              </span>
              <ChevronRight className="w-4 h-4 text-[#6E7C73] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[11px] text-[#8E9D93] block">Hoy</span>
            <span className="font-mono-nums text-2xl font-black text-[#3FC8FF] tracking-tight mt-0.5 block">
              {todayMiles.toFixed(2)}{' '}
              <span className="text-sm font-bold">MI</span>
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-end gap-1 h-7">
              {distanceBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-[#3FC8FF]/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-[#5A675F] font-mono-nums pt-1">
              <span>12 a.m.</span>
              <span>6 a.m.</span>
              <span>12 p.m.</span>
              <span>6 p.m.</span>
            </div>
          </div>
        </button>

        {/* CARD 3: SESIONES */}
        <button
          type="button"
          onClick={() => setShowSessionsModal(true)}
          className="rounded-[28px] bg-[#131A16] border border-white/8 hover:border-[#74D834]/40 p-4 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[160px] shadow-md shadow-black/30 group"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-white group-hover:text-[#74D834] transition-colors">
                Sesiones
              </span>
              <ChevronRight className="w-4 h-4 text-[#6E7C73] group-hover:translate-x-0.5 transition-transform" />
            </div>

            <div className="w-9 h-9 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834] mb-2 shrink-0">
              {latestSession?.isOutdoor ? (
                <Footprints className="w-4.5 h-4.5" />
              ) : (
                <Dumbbell className="w-4.5 h-4.5" />
              )}
            </div>

            <p className="text-xs font-semibold text-white truncate">
              {latestSession?.activityType || latestSession?.routineTitle || 'Carrera al aire libre'}
            </p>
            <p className="font-mono-nums text-lg font-black text-[#74D834] tracking-tight">
              {latestSession?.distanceMiles
                ? `${latestSession.distanceMiles.toFixed(2)} MI`
                : latestSession?.caloriesBurned
                  ? `${latestSession.caloriesBurned} CAL`
                  : '1.28 MI'}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8E9D93] pt-1">
            <span>
              {latestSession?.completedAt
                ? formatDayOfWeek(latestSession.completedAt, todayDate)
                : 'martes'}
            </span>
            <span className="text-[10px] text-[#74D834] font-semibold">1 ⬢</span>
          </div>
        </button>

        {/* CARD 4: PREMIOS */}
        <button
          type="button"
          onClick={() => setShowAwardsModal(true)}
          className="rounded-[28px] bg-[#131A16] border border-white/8 hover:border-white/20 p-4 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[160px] shadow-md shadow-black/30 group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white group-hover:text-white transition-colors">
                Premios
              </span>
              <ChevronRight className="w-4 h-4 text-[#6E7C73] group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* 3D Metallic Badge Sheen Icon */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#2E3730] to-[#121814] border-2 border-[#8E9D93]/40 shadow-inner flex items-center justify-center text-white mx-auto my-1 group-hover:scale-105 transition-transform">
              <Footprints className="w-5 h-5 text-white/90" />
            </div>
          </div>

          <div className="text-center pt-1">
            <p className="text-xs font-bold text-white truncate">
              {featuredAward.title}
            </p>
            <p className="text-[10px] text-[#8E9D93] font-mono-nums">
              {featuredAward.date}
            </p>
          </div>
        </button>
      </div>

      {/* Featured Big CTA Card (Apple Fitness+ style banner) */}
      <div className="relative rounded-[28px] overflow-hidden bg-[#131A16] border border-white/10 shadow-xl shadow-black/50 p-5 space-y-4">
        {/* Background Dark Fitness Styling */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D0B] via-[#0A0D0B]/70 to-transparent" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold text-[#74D834] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>DISCIPLINE = FREEDOM</span>
          </div>

          <h3 className="font-display text-xl font-black text-white tracking-tight leading-tight">
            Carrera al aire libre GPS
          </h3>
          <p className="text-xs text-[#C5D0C8] max-w-xs">
            Registra tu ruta en tiempo real con velocímetro, calorías y trazo satelital estilo Apple Maps.
          </p>
        </div>

        <div className="relative z-10 pt-1">
          <button
            type="button"
            onClick={onLaunchOutdoorRun}
            className="w-full min-h-[48px] rounded-2xl bg-[#74D834] text-[#081007] font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#82E63E] active:scale-[0.98] transition-all shadow-lg shadow-[#74D834]/25"
          >
            <Play className="w-4.5 h-4.5 fill-current" />
            <span>Iniciar carrera ahora</span>
          </button>
        </div>
      </div>

      {/* Discreet Health Quick Actions (Sueño, Agua, Nutrición) */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          type="button"
          onClick={onOpenHealthModule}
          className="rounded-2xl bg-[#131A16] border border-white/7 p-3 flex flex-col items-center justify-center gap-1 hover:border-[#74D834]/30 transition-all cursor-pointer text-center"
        >
          <Moon className="w-4 h-4 text-[#A084E8]" />
          <span className="text-[11px] font-bold text-white">Sueño</span>
          <span className="text-[10px] font-mono-nums text-[#8E9D93]">
            {habits.sleepHours}h / 8h
          </span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateHabit({ waterLiters: habits.waterLiters + 0.25 })}
          className="rounded-2xl bg-[#131A16] border border-white/7 p-3 flex flex-col items-center justify-center gap-1 hover:border-[#3FC8FF]/30 transition-all cursor-pointer text-center"
        >
          <Droplets className="w-4 h-4 text-[#3FC8FF]" />
          <span className="text-[11px] font-bold text-white">+250 ml</span>
          <span className="text-[10px] font-mono-nums text-[#8E9D93]">
            {habits.waterLiters.toFixed(1)} L
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('nutricion')}
          className="rounded-2xl bg-[#131A16] border border-white/7 p-3 flex flex-col items-center justify-center gap-1 hover:border-amber-400/30 transition-all cursor-pointer text-center"
        >
          <Utensils className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold text-white">Comidas</span>
          <span className="text-[10px] font-mono-nums text-[#8E9D93]">
            {Math.round(nutritionTotals.calories)} kcal
          </span>
        </button>
      </div>

      {/* Sessions Full Modal with Swipe-to-delete */}
      {showSessionsModal && (
        <SessionsModal
          sessions={workoutSessions}
          todayDate={todayDate}
          onClose={() => setShowSessionsModal(false)}
          onAddManualSession={onAddManualSession!}
          onDeleteSession={onDeleteSession}
        />
      )}

      {/* Awards Modal */}
      {showAwardsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md rounded-[32px] bg-[#131A16] border border-white/12 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Premios y Logros
                </h3>
                <p className="text-[11px] text-[#8E9D93]">
                  Insignias al estilo Apple Fitness
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAwardsModal(false)}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#C5D0C8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {awards.map((award) => (
                <div
                  key={award.id}
                  className={`p-3.5 rounded-2xl border text-center space-y-2 ${
                    award.unlocked
                      ? 'bg-[#18211C] border-[#74D834]/40'
                      : 'bg-white/2 border-white/6 opacity-40'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#2E3730] to-[#121814] border-2 border-[#8E9D93]/50 shadow-inner flex items-center justify-center text-white mx-auto">
                    <Trophy className="w-5 h-5 text-[#74D834]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{award.title}</p>
                    <p className="text-[10px] text-[#8E9D93] mt-0.5">{award.desc}</p>
                    <span className="text-[9px] font-mono-nums text-[#74D834] mt-1 block">
                      {award.unlocked ? award.date : 'Bloqueado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
