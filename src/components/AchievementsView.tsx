import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Settings,
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

/* ============================================================
   CONFETTI — partículas ligeras sin dependencias externas
   ============================================================ */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  shape: 'rect' | 'circle';
}

function ConfettiCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;

    const palette = [color, '#74D834', '#FFD700', '#FF6B35', '#fff', '#A8E6CF'];
    const particles: Particle[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H * 0.4,
        vx: (Math.random() - 0.5) * 10,
        vy: -(Math.random() * 12 + 4),
        color: palette[Math.floor(Math.random() * palette.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        maxLife: Math.random() * 60 + 60,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;

      for (const p of particles) {
        p.vy += 0.3;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) continue;
        alive = true;

        ctx.save();
        ctx.globalAlpha = Math.min(p.life * 2, 1);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      frame++;
      if (alive && frame < 180) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ============================================================
   MODAL DETALLE — se abre al tocar cada premio/logro
   ============================================================ */
export function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const isUnlocked = Boolean(achievement.unlockedAt);
  const progressPct = Math.round((achievement.progress ?? 0) * 100);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      const t = setTimeout(() => setShowConfetti(true), 120);
      return () => clearTimeout(t);
    }
  }, [isUnlocked]);

  useEffect(() => {
    const onBack = () => onClose();
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-5"
      style={{ animation: 'fadeIn 180ms ease both' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[32px] bg-[#0F1712] border border-white/10 p-6 text-center relative overflow-hidden shadow-2xl"
        style={{
          boxShadow: isUnlocked
            ? `0 0 0 1px ${achievement.color}30, 0 32px 64px -12px rgba(0,0,0,0.9)`
            : '0 32px 64px -12px rgba(0,0,0,0.9)',
          animation: 'slideUpModal 240ms cubic-bezier(0.34,1.4,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti sobre el modal */}
        {showConfetti && isUnlocked && (
          <ConfettiCanvas color={achievement.color} />
        )}

        {/* Glow de fondo */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{
            background: isUnlocked ? `${achievement.color}` : '#6B7280',
            opacity: isUnlocked ? 0.18 : 0.06,
          }}
        />

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center text-[#A8B6AB] cursor-pointer transition-colors"
          style={{ zIndex: 1 }}
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Badge estado */}
        <div
          className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5 border"
          style={{
            backgroundColor: isUnlocked ? `${achievement.color}18` : 'rgba(255,255,255,0.05)',
            borderColor: isUnlocked ? `${achievement.color}50` : 'rgba(255,255,255,0.1)',
            color: isUnlocked ? achievement.color : '#9AA89E',
            zIndex: 1,
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

        {/* Medalla grande con animación de entrada */}
        <div
          className="relative mx-auto w-32 h-32 flex items-center justify-center mb-5"
          style={{ zIndex: 1 }}
        >
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl"
            style={{
              background: isUnlocked
                ? `radial-gradient(circle at 32% 28%, ${achievement.color}70, ${achievement.color}18 55%, #0F1712 85%)`
                : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.1), #0F1712 75%)',
              borderColor: isUnlocked ? achievement.color : 'rgba(255,255,255,0.12)',
              boxShadow: isUnlocked
                ? `0 0 0 8px ${achievement.color}12, 0 0 48px ${achievement.color}35`
                : 'none',
              animation: isUnlocked ? 'medalPop 400ms cubic-bezier(0.34,1.56,0.64,1) 100ms both' : undefined,
            }}
          >
            <span
              className={`text-6xl select-none ${isUnlocked ? '' : 'grayscale opacity-45'}`}
              style={{ filter: isUnlocked ? `drop-shadow(0 0 12px ${achievement.color}80)` : undefined }}
            >
              {achievement.emoji}
            </span>
          </div>

          {isUnlocked && (
            <div
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#74D834] text-black flex items-center justify-center border-[3px] border-[#0F1712] shadow-lg"
              style={{ animation: 'checkPop 300ms cubic-bezier(0.34,1.56,0.64,1) 300ms both' }}
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Nombre + puntos */}
        <h3
          className="font-display text-2xl font-extrabold text-white leading-tight"
          style={{ zIndex: 1, position: 'relative' }}
        >
          {achievement.title}
        </h3>
        <p
          className="text-xs font-bold mt-1.5"
          style={{ color: achievement.color, zIndex: 1, position: 'relative' }}
        >
          +{achievement.points} puntos de recompensa
        </p>

        <p
          className="text-sm text-[#C2CFC5] mt-3 leading-relaxed"
          style={{ zIndex: 1, position: 'relative' }}
        >
          {achievement.longDescription}
        </p>

        {/* Fecha o barra de progreso */}
        <div
          className="mt-5 rounded-2xl bg-black/40 border border-white/8 p-3.5 text-left"
          style={{ zIndex: 1, position: 'relative' }}
        >
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
                <span className="text-[#9AA89E]">Tu progreso</span>
                <span className="font-semibold text-white">
                  {progressPct}% · {achievement.requiredValue} {achievement.unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(6, progressPct)}%`,
                    backgroundColor: achievement.color,
                    boxShadow: `0 0 8px ${achievement.color}60`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[50px] rounded-2xl font-display font-bold text-sm cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            backgroundColor: isUnlocked ? achievement.color : 'rgba(255,255,255,0.1)',
            color: isUnlocked ? '#000' : '#fff',
            zIndex: 1,
            position: 'relative',
          }}
        >
          {isUnlocked ? '¡Seguir sumando! 🔥' : 'Entendido'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   VISTA PRINCIPAL — Premios y logros
   ============================================================ */
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

  const orderedMedals = useMemo(
    () => [...unlockedList, ...lockedList],
    [unlockedList, lockedList]
  );

  const visibleMedals = showAllMedals ? orderedMedals : orderedMedals.slice(0, 4);
  const visibleChallenges = showAllChallenges ? orderedMedals : orderedMedals.slice(0, 3);

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
    <div className="fixed inset-0 z-[65] bg-[#080C0A] text-[#F4F7F4] flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="px-4 pb-3 flex items-center justify-between border-b border-white/6 bg-[#080C0A] shrink-0"
        style={{ paddingTop: 'max(14px, var(--safe-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white cursor-pointer active:bg-white/14"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg font-bold tracking-tight">Premios y logros</h1>
        <div className="w-9 h-9 rounded-full bg-[#74D834]/12 border border-[#74D834]/25 flex items-center justify-center text-[#74D834]">
          <Trophy className="w-4.5 h-4.5" />
        </div>
      </header>

      {/* Scroll */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 space-y-4"
        style={{ paddingBottom: 'max(2.5rem, var(--safe-bottom))' }}
      >
        {/* ── Tarjeta usuario + nivel ─────────────────────────── */}
        <div className="rounded-3xl bg-[#111814] border border-white/8 p-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <UserAvatarImage
                name={profile.name}
                sizeClass="w-14 h-14"
                customUrl={profile.avatarUrl}
              />
              {/* anillo verde */}
              <div
                className="absolute inset-0 rounded-full border-2 border-[#74D834]/60 pointer-events-none"
                style={{ boxShadow: '0 0 10px #74D83430' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-base truncate">{profile.name}</p>
                <span className="text-xs font-bold text-[#74D834] shrink-0 bg-[#74D834]/12 px-2 py-0.5 rounded-full border border-[#74D834]/25">
                  Nivel {userLevel.level}
                </span>
              </div>
              <p className="text-xs text-[#9AA89E] mt-0.5">Nivel: {userLevel.title}</p>
              {/* XP bar */}
              <div className="mt-2.5 space-y-1">
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(8, levelPct)}%`,
                      background: 'linear-gradient(90deg, #48b824, #74D834)',
                      boxShadow: '0 0 8px #74D83450',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9D93]">{userLevel.currentXp} XP</span>
                  <span className="text-[10px] text-[#8E9D93]">{userLevel.xpToNext} XP siguiente</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Racha activa ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => {
            const streakAch =
              achievements.find((a) => a.id === 'streak_3' || a.id.startsWith('streak')) ??
              achievements[0];
            if (streakAch) setSelectedAchievement(streakAch);
          }}
          className="w-full rounded-3xl bg-[#111814] border border-white/8 p-4 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #FF6B3540, #FF6B3510 70%)',
                border: '1px solid #FF6B3540',
              }}
            >
              <Flame className="w-6 h-6 text-[#FF6B35]" />
            </div>
            <div>
              <p className="text-xs text-[#9AA89E] font-medium">Racha activa</p>
              <p className="font-display text-2xl font-extrabold text-white leading-none mt-0.5">
                {currentStreak}{' '}
                <span className="text-base font-semibold text-[#D2DDD5]">
                  {currentStreak === 1 ? 'día' : 'días'}
                </span>
              </p>
              <p className="text-[11px] text-[#9AA89E] mt-0.5">
                {currentStreak > 0
                  ? '¡Vas muy bien! Mantén la constancia.'
                  : 'Completa tus hábitos hoy para iniciar tu racha.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-0.5"
              style={{
                backgroundColor: '#74D83418',
                color: '#74D834',
                border: '1px solid #74D83435',
              }}
            >
              +{currentStreak * 15} pts
            </span>
            <ChevronRight className="w-4 h-4 text-[#9AA89E]" />
          </div>
        </button>

        {/* ── Tus medallas ─────────────────────────────────────── */}
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
                  className="flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform"
                >
                  <div
                    className="w-[62px] h-[62px] rounded-full flex items-center justify-center border-2 relative"
                    style={{
                      background: unlocked
                        ? `radial-gradient(circle at 30% 28%, ${ach.color}60, ${ach.color}10 60%, #0F1712 85%)`
                        : 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08), #0F1712 75%)',
                      borderColor: unlocked ? ach.color : 'rgba(255,255,255,0.1)',
                      boxShadow: unlocked ? `0 0 16px ${ach.color}30` : 'none',
                    }}
                  >
                    <span
                      className={`text-2xl select-none ${unlocked ? '' : 'grayscale opacity-35'}`}
                      style={unlocked ? { filter: `drop-shadow(0 0 6px ${ach.color}60)` } : undefined}
                    >
                      {ach.emoji}
                    </span>
                    {unlocked && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#74D834] text-black flex items-center justify-center border-2 border-[#080C0A]"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p
                    className="text-[11px] font-semibold mt-1.5 leading-tight truncate w-full px-0.5"
                    style={{ color: unlocked ? '#E8F0EA' : '#9AA89E' }}
                  >
                    {ach.title}
                  </p>
                  <p className="text-[10px] text-[#6B7A70] leading-tight">
                    {unlocked
                      ? formatAchievementDate(ach.unlockedAt)
                      : `${Math.round((ach.progress ?? 0) * 100)}%`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Retos completados ─────────────────────────────────── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Retos completados</h2>
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
            {/* Primero los completados, luego los pendientes */}
            {[...unlockedList, ...lockedList]
              .slice(0, showAllChallenges ? undefined : 4)
              .map((ach) => {
                const unlocked = Boolean(ach.unlockedAt);
                const pct = Math.round((ach.progress ?? 0) * 100);
                return (
                  <button
                    key={ach.id}
                    type="button"
                    onClick={() => setSelectedAchievement(ach)}
                    className="w-full rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform border"
                    style={{
                      backgroundColor: unlocked ? 'rgba(116,216,52,0.06)' : '#111814',
                      borderColor: unlocked ? 'rgba(116,216,52,0.2)' : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: unlocked ? '#74D834' : 'rgba(255,255,255,0.07)',
                          border: unlocked ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {unlocked ? (
                          <Check className="w-4.5 h-4.5 text-black stroke-[2.75]" />
                        ) : (
                          <span className="text-base grayscale opacity-60">{ach.emoji}</span>
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

        {/* ── Tu progreso (resumen) ─────────────────────────────── */}
        <section className="space-y-2.5 pb-2">
          <h2 className="font-display text-base font-bold">Tu progreso</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Flame className="w-4.5 h-4.5 text-[#FF6B35]" />, value: currentStreak, label: 'Días de racha' },
              { icon: <Star className="w-4.5 h-4.5 text-[#FFD700]" />, value: unlockedList.length, label: 'Medallas' },
              { icon: <Target className="w-4.5 h-4.5 text-[#0A95FF]" />, value: lockedList.length, label: 'Retos activos' },
              { icon: <Gift className="w-4.5 h-4.5 text-[#74D834]" />, value: userLevel.totalXp, label: 'Puntos totales' },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#111814] border border-white/7 p-2.5 text-center"
              >
                <div className="flex justify-center">{item.icon}</div>
                <p className="font-mono-nums text-base font-bold mt-1 text-white">{item.value}</p>
                <p className="text-[10px] text-[#9AA89E] leading-tight mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal detalle al tocar un logro */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
}
