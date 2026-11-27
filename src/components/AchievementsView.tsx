import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import {
  Achievement,
  computeAchievements,
  computeUserLevel,
  formatAchievementDate,
} from '../utils/achievements';
import { DailyHabits, MealEntry, UserProfile, WorkoutSessionLog } from '../types/health';
import { UserAvatarImage } from './BrandLogo';

interface AchievementsViewProps {
  profile: UserProfile;
  currentStreak: number;
  sessions: WorkoutSessionLog[];
  habitsByDate: Record<string, DailyHabits>;
  measurements: { date: string }[];
  meals: MealEntry[];
  onClose: () => void;
}

/** Ventana modal individual que se abre al tocar cada premio/logro */
export function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const isUnlocked = Boolean(achievement.unlockedAt);
  const progressPct = Math.round((achievement.progress ?? 0) * 100);

  useEffect(() => {
    const onBack = () => onClose();
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[32px] bg-[#111914] border border-white/12 p-6 text-center relative overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: isUnlocked ? achievement.color : '#6B7280' }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana de logro"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#A8B6AB] cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Etiqueta superior */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5 border"
          style={{
            backgroundColor: isUnlocked ? `${achievement.color}20` : 'rgba(255,255,255,0.06)',
            borderColor: isUnlocked ? `${achievement.color}55` : 'rgba(255,255,255,0.12)',
            color: isUnlocked ? achievement.color : '#9AA89E',
          }}
        >
          {isUnlocked ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>¡Logro cumplido!</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>En progreso · {progressPct}%</span>
            </>
          )}
        </div>

        {/* Medalla grande */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center mb-5">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-xl"
            style={{
              background: isUnlocked
                ? `radial-gradient(circle at 30% 30%, ${achievement.color}55, #141C17 75%)`
                : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), #141C17 75%)',
              borderColor: isUnlocked ? achievement.color : 'rgba(255,255,255,0.15)',
              boxShadow: isUnlocked ? `0 0 36px ${achievement.color}40` : 'none',
            }}
          >
            <span className={`text-5xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
              {achievement.emoji}
            </span>
          </div>
          {isUnlocked && (
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#74D834] text-black flex items-center justify-center border-2 border-[#111914] shadow-md">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
          )}
        </div>

        <h3 className="font-display text-2xl font-extrabold text-white leading-tight">
          {achievement.title}
        </h3>
        <p className="text-xs font-semibold text-[#74D834] mt-1">
          +{achievement.points} puntos de recompensa
        </p>

        <p className="text-sm text-[#C2CFC5] mt-3 leading-relaxed">
          {achievement.longDescription}
        </p>

        {/* Detalle de fecha o progreso */}
        <div className="mt-5 rounded-2xl bg-black/35 border border-white/8 p-3.5 text-left">
          {isUnlocked ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9AA89E]">Cumplido el</span>
              <span className="font-semibold text-white">
                {formatAchievementDate(achievement.unlockedAt) || 'Hoy'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9AA89E]">Meta requerida</span>
                <span className="font-semibold text-white">
                  {achievement.requiredValue} {achievement.unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(6, progressPct)}%`,
                    backgroundColor: achievement.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[48px] rounded-2xl bg-[#74D834] text-black font-display font-bold text-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          {isUnlocked ? '¡Seguir sumando!' : 'Entendido'}
        </button>
      </div>
    </div>
  );
}

export function AchievementsView({
  profile,
  currentStreak,
  sessions,
  habitsByDate,
  measurements,
  meals,
  onClose,
}: AchievementsViewProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAllMedals, setShowAllMedals] = useState(false);
  const [showAllChallenges, setShowAllChallenges] = useState(false);

  const achievements = useMemo(
    () =>
      computeAchievements({
        currentStreak,
        sessions,
        habitsByDate,
        measurements,
        meals,
      }),
    [currentStreak, sessions, habitsByDate, measurements, meals]
  );

  const userLevel = useMemo(() => computeUserLevel(achievements), [achievements]);

  const unlockedList = useMemo(
    () => achievements.filter((a) => Boolean(a.unlockedAt)),
    [achievements]
  );
  const lockedList = useMemo(
    () => achievements.filter((a) => !a.unlockedAt),
    [achievements]
  );

  // Ordenar medallas: primero las desbloqueadas, luego las bloqueadas
  const orderedMedals = useMemo(
    () => [...unlockedList, ...lockedList],
    [unlockedList, lockedList]
  );

  const visibleMedals = showAllMedals ? orderedMedals : orderedMedals.slice(0, 4);
  const visibleChallenges = showAllChallenges ? orderedMedals : orderedMedals.slice(0, 4);

  const levelPct =
    userLevel.xpToNext > 0
      ? Math.min(100, Math.round((userLevel.currentXp / userLevel.xpToNext) * 100))
      : 100;

  useEffect(() => {
    const onBack = () => {
      if (selectedAchievement) {
        setSelectedAchievement(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [selectedAchievement, onClose]);

  return (
    <div className="fixed inset-0 z-[65] bg-[#0A0D0B] text-[#F4F7F4] flex flex-col overflow-hidden">
      {/* Header con safe area */}
      <header
        className="px-4 pb-3 flex items-center justify-between border-b border-white/8 bg-[#0A0D0B] shrink-0"
        style={{ paddingTop: 'max(14px, var(--safe-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg font-bold tracking-tight">Premios y logros</h1>
        <div className="w-9 h-9 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834]">
          <Trophy className="w-4.5 h-4.5" />
        </div>
      </header>

      {/* Contenido scrollable */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 space-y-4"
        style={{ paddingBottom: 'max(2rem, var(--safe-bottom))' }}
      >
        {/* Tarjeta de Usuario y Nivel */}
        <div className="liquid-glass-card rounded-3xl p-4 flex items-center gap-3.5">
          <UserAvatarImage
            src={profile.avatarUrl}
            name={profile.name}
            className="w-13 h-13 rounded-full object-cover border-2 border-[#74D834]/50 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-bold text-base truncate">{profile.name}</p>
              <span className="text-xs font-bold text-[#74D834] shrink-0">
                Nivel {userLevel.level}
              </span>
            </div>
            <p className="text-xs text-[#9AA89E]">Nivel: {userLevel.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#74D834] transition-all"
                  style={{ width: `${Math.max(8, levelPct)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-nums text-[#C2CFC5] shrink-0">
                {userLevel.totalXp} pts
              </span>
            </div>
          </div>
        </div>

        {/* Racha Activa */}
        <button
          type="button"
          onClick={() => {
            const streakReward =
              achievements.find((a) => a.id === 'streak_3') ?? achievements[0];
            if (streakReward) setSelectedAchievement(streakReward);
          }}
          className="w-full liquid-glass-card rounded-3xl p-4 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FF6B35]/15 border border-[#FF6B35]/30 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-[#FF6B35]" />
            </div>
            <div>
              <p className="text-xs text-[#9AA89E]">Racha activa</p>
              <p className="font-display text-xl font-extrabold text-white">
                {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
              </p>
              <p className="text-[11px] text-[#9AA89E]">
                {currentStreak > 0
                  ? '¡Vas muy bien! Mantén la constancia.'
                  : 'Completa tus hábitos hoy para iniciar tu racha.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#74D834]/15 text-[#74D834] text-xs font-bold inline-flex items-center gap-0.5 shrink-0">
            +{currentStreak * 15} pts
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Tus medallas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Tus medallas</h2>
            <button
              type="button"
              onClick={() => setShowAllMedals((v) => !v)}
              className="text-xs font-semibold text-[#74D834] inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAllMedals ? 'Ver menos' : 'Ver todas'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {visibleMedals.map((ach) => {
              const unlocked = Boolean(ach.unlockedAt);
              return (
                <button
                  key={ach.id}
                  type="button"
                  onClick={() => setSelectedAchievement(ach)}
                  className="flex flex-col items-center text-center group cursor-pointer active:scale-95 transition-transform"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center border-2 relative transition-transform"
                    style={{
                      background: unlocked
                        ? `radial-gradient(circle at 30% 30%, ${ach.color}55, #161F1A 78%)`
                        : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), #121815 78%)',
                      borderColor: unlocked ? ach.color : 'rgba(255,255,255,0.12)',
                      boxShadow: unlocked ? `0 0 18px ${ach.color}30` : 'none',
                    }}
                  >
                    <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
                      {ach.emoji}
                    </span>
                    {!unlocked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1C2420] border border-white/15 flex items-center justify-center">
                        <Lock className="w-2.5 h-2.5 text-[#9AA89E]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-white mt-1.5 leading-tight line-clamp-1">
                    {ach.title}
                  </p>
                  <p className="text-[10px] text-[#9AA89E]">
                    {unlocked
                      ? formatAchievementDate(ach.unlockedAt)
                      : `${Math.round((ach.progress ?? 0) * 100)}%`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Retos completados y disponibles */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Retos y logros</h2>
            <button
              type="button"
              onClick={() => setShowAllChallenges((v) => !v)}
              className="text-xs font-semibold text-[#74D834] inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAllChallenges ? 'Ver menos' : 'Ver todos'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {visibleChallenges.map((ach) => {
              const unlocked = Boolean(ach.unlockedAt);
              const pct = Math.round((ach.progress ?? 0) * 100);
              return (
                <button
                  key={ach.id}
                  type="button"
                  onClick={() => setSelectedAchievement(ach)}
                  className="w-full liquid-glass-card rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        unlocked
                          ? 'bg-[#74D834] text-black'
                          : 'bg-white/8 text-[#9AA89E] border border-white/10'
                      }`}
                    >
                      {unlocked ? (
                        <Check className="w-4.5 h-4.5 stroke-[2.75]" />
                      ) : (
                        <span className="text-base grayscale opacity-75">{ach.emoji}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{ach.title}</p>
                      <p className="text-[11px] text-[#9AA89E]">
                        {unlocked
                          ? `Completado · ${ach.points} pts`
                          : `En progreso (${pct}%) · ${ach.points} pts`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9AA89E] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Tu progreso */}
        <section className="space-y-2.5 pb-2">
          <h2 className="font-display text-base font-bold">Tu progreso</h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="liquid-glass-card rounded-2xl p-2.5 text-center">
              <Flame className="w-4.5 h-4.5 text-[#FF6B35] mx-auto" />
              <p className="font-mono-nums text-base font-bold mt-1">{currentStreak}</p>
              <p className="text-[10px] text-[#9AA89E] leading-tight">Días de racha</p>
            </div>
            <div className="liquid-glass-card rounded-2xl p-2.5 text-center">
              <Star className="w-4.5 h-4.5 text-[#FFD700] mx-auto" />
              <p className="font-mono-nums text-base font-bold mt-1">{unlockedList.length}</p>
              <p className="text-[10px] text-[#9AA89E] leading-tight">Medallas</p>
            </div>
            <div className="liquid-glass-card rounded-2xl p-2.5 text-center">
              <Target className="w-4.5 h-4.5 text-[#0A95FF] mx-auto" />
              <p className="font-mono-nums text-base font-bold mt-1">{lockedList.length}</p>
              <p className="text-[10px] text-[#9AA89E] leading-tight">Retos activos</p>
            </div>
            <div className="liquid-glass-card rounded-2xl p-2.5 text-center">
              <Gift className="w-4.5 h-4.5 text-[#74D834] mx-auto" />
              <p className="font-mono-nums text-base font-bold mt-1">{userLevel.totalXp}</p>
              <p className="text-[10px] text-[#9AA89E] leading-tight">Puntos totales</p>
            </div>
          </div>
        </section>
      </div>

      {/* Ventana modal por cada logro cumplido o seleccionado */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}
