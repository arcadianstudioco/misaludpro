import React, { useState } from 'react';
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
  Utensils,
  WifiOff,
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
import { ActivitySummaryCards } from './ActivitySummaryCards';
import { BrandLogo, IMAGE_ASSETS, UserAvatarImage } from './BrandLogo';
import { ProgressRing } from './ProgressRing';
import { StreakBadge } from './StreakBadge';
import { AllHabitStreaks } from '../utils/habitStreaks';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncStatus } from '../services/localPersistence';

interface HomeDashboardProps {
  profile: UserProfile;
  habits: DailyHabits;
  streaks: AllHabitStreaks;
  goalPercent: number;
  latestMeasurement: BodyMeasurement | null;
  firstMeasurement: BodyMeasurement | null;
  syncStatus?: SyncStatus;
  pendingSyncCount?: number;
  lastSyncedAt?: string | null;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onToggleSimulatedOffline?: () => void;
  onManualSync?: () => Promise<boolean>;
  onUpdateHabit: (patch: Partial<DailyHabits>) => void;
  onQuickLogWeightWaist: (weightKg: number, waistCm: number) => void;
  onNavigateTab: (tab: TabId) => void;
  onOpenHealthModule: () => void;
  onLaunchOutdoorRun: () => void;
  todayDate?: string;
  workoutSessions?: WorkoutSessionLog[];
  nutritionTotals?: { calories: number; proteinG: number; carbsG: number; fatG: number };
  kegelCount?: number;
  reminders?: ReminderSettings;
  onAddManualSession?: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
  onDeleteSession?: (sessionId: string) => void;
}

export function HomeDashboard({
  profile,
  habits,
  streaks,
  goalPercent,
  latestMeasurement,
  firstMeasurement,
  syncStatus,
  pendingSyncCount = 0,
  lastSyncedAt = null,
  isOnline = true,
  isSimulatedOffline = false,
  onToggleSimulatedOffline,
  onManualSync,
  onUpdateHabit,
  onQuickLogWeightWaist,
  onNavigateTab,
  onOpenHealthModule,
  onLaunchOutdoorRun,
  todayDate,
  workoutSessions = [],
  nutritionTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  kegelCount = 0,
  reminders,
  onAddManualSession,
  onDeleteSession,
}: HomeDashboardProps) {
  const [quickModal, setQuickModal] = useState<'weight' | 'waist' | null>(null);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);

  const ALL_WIDGET_OPTIONS = [
    { id: 'sleep', label: 'Sueño y Alarma', desc: 'Horas dormidas y alarma iPhone' },
    { id: 'water', label: 'Hidratación (+250ml)', desc: 'Progreso y suma rápida' },
    { id: 'calories', label: 'Calorías y Macros', desc: 'Kcal, P / C / G del día' },
    { id: 'streak', label: 'Racha Activa', desc: 'Días consecutivos cumplidos' },
    { id: 'gps', label: 'Carrera GPS', desc: 'Inicio directo de ruta GPS' },
    { id: 'kegel', label: 'Suelo Pélvico (Kegel)', desc: 'Sesiones y guía de audio' },
  ] as const;

  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('misalud_home_widgets_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return ['sleep', 'water', 'calories', 'streak', 'gps', 'kegel'];
  });

  const toggleHomeWidget = (id: string) => {
    setEnabledWidgets((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('misalud_home_widgets_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const currentWeight = latestMeasurement?.weightKg ?? profile.initialWeightKg;
  const currentWaist = latestMeasurement?.waistCm ?? 94;

  const weightDelta = firstMeasurement
    ? Number((currentWeight - firstMeasurement.weightKg).toFixed(1))
    : 0;
  const waistDelta = firstMeasurement
    ? Number((currentWaist - firstMeasurement.waistCm).toFixed(1))
    : 0;

  const [inputValue, setInputValue] = useState('');

  const openModal = (type: 'weight' | 'waist') => {
    setInputValue(type === 'weight' ? String(currentWeight) : String(currentWaist));
    setQuickModal(type);
  };

  const handleSaveQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(inputValue);
    if (!Number.isFinite(num) || num <= 0) return;
    if (quickModal === 'weight') {
      onQuickLogWeightWaist(Number(num.toFixed(1)), currentWaist);
    } else if (quickModal === 'waist') {
      onQuickLogWeightWaist(currentWeight, Number(num.toFixed(1)));
    }
    setQuickModal(null);
  };

  const sleepDone = habits.sleepHours >= 7;
  const waterDone = habits.waterLiters >= profile.waterTargetLiters;

  const firstName = profile.name.split(' ')[0] || 'Atleta';

  return (
    <div className="space-y-4 pb-4">
      {/* Top Header matching reference Photo 2 */}
      <div className="flex items-center justify-between pt-1">
        <div
          onClick={() => onNavigateTab('perfil')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <UserAvatarImage
            name={profile.name}
            sizeClass="w-10 h-10"
            customUrl={profile.avatarUrl}
          />
          <div>
            <span className="text-xs text-[#9AA89E] font-medium block">
              Hola, {firstName} 👋
            </span>
            <span className="font-display font-bold text-xs text-white tracking-tight flex items-center gap-1">
              Mi Salud <span className="text-[#74D834]">Pro</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus && (
            <SyncStatusIndicator
              syncStatus={syncStatus}
              pendingSyncCount={pendingSyncCount}
              lastSyncedAt={lastSyncedAt}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onToggleSimulatedOffline={onToggleSimulatedOffline || (() => {})}
              onManualSync={onManualSync || (async () => false)}
            />
          )}
        </div>
      </div>

      {/* Bold Banner Headline matching reference Photo 2 */}
      <div className="pt-0.5 pb-0.5">
        <h1 className="font-display text-2xl font-black tracking-tight text-white uppercase leading-none">
          Tu viaje fitness
        </h1>
        <h2 className="font-display text-2xl font-black tracking-tight text-[#74D834] uppercase leading-tight mt-0.5">
          comienza ahora
        </h2>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 p-3 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="font-medium text-white block">Modo sin conexión activo</span>
              <span className="text-[11px] text-amber-300/80 block">
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} cambio(s) guardado(s) en este dispositivo. Se sincronizarán al volver la red.`
                  : 'Tus rutinas y progreso están respaldados localmente y disponibles.'}
              </span>
            </div>
          </div>
          {onToggleSimulatedOffline && isSimulatedOffline && (
            <button
              type="button"
              onClick={onToggleSimulatedOffline}
              className="text-[11px] font-semibold text-amber-300 underline shrink-0 hover:text-white px-2 py-1"
            >
              Reconectar
            </button>
          )}
        </div>
      )}

      {/* Hero Progress Card with Ring + 3 Metric Rows matching reference Photo 2 */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4.5 relative overflow-hidden">
        <div
          className="absolute -top-20 inset-x-0 h-36 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(116, 216, 52, 0.12), transparent 70%)',
          }}
        />

        <div className="flex items-center justify-between mb-3.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Progreso de tu día
            </span>
            <StreakBadge streak={streaks.overall} />
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('estadisticas')}
            className="text-[11px] text-[#74D834] font-semibold hover:underline cursor-pointer"
          >
            Ver todo
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: Circular Progress Ring */}
          <div className="shrink-0 flex items-center justify-center">
            <ProgressRing
              percent={goalPercent}
              size={120}
              strokeWidth={10}
              sublabel="Completado"
            />
          </div>

          {/* Right: 3 organized metric rows matching photo */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Row 1: Workouts */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1C2620] border border-[#74D834]/30 flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-[#74D834]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#8E9D93] block">Entrenamiento</span>
                <span className="font-mono-nums text-xs font-bold text-white block truncate">
                  {habits.workoutDone ? '1 / 1 realizado' : '0 / 1 pendiente'}
                </span>
              </div>
            </div>

            {/* Row 2: Calories */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1C2620] border border-amber-500/30 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#8E9D93] block">Calorías meta</span>
                <span className="font-mono-nums text-xs font-bold text-white block truncate">
                  {profile.calorieTargetMin}–{profile.calorieTargetMax} kcal
                </span>
              </div>
            </div>

            {/* Row 3: Hydration */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1C2620] border border-[#4CC9B0]/30 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-[#4CC9B0]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#8E9D93] block">Hidratación</span>
                <span className="font-mono-nums text-xs font-bold text-white block truncate">
                  {habits.waterLiters.toFixed(1)} / {profile.waterTargetLiters} L
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (3 buttons in a row matching reference Photo 2) */}
      <div>
        <h3 className="text-xs font-bold text-white mb-2">Acciones rápidas</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTab('rutinas')}
            className="rounded-2xl bg-[#131A16] border border-white/8 p-3 flex flex-col items-center text-center hover:border-[#74D834]/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1C2620] flex items-center justify-center mb-1.5">
              <Dumbbell className="w-4 h-4 text-[#74D834]" />
            </div>
            <span className="text-xs font-bold text-white leading-tight">Rutinas</span>
            <span className="text-[10px] text-[#8E9D93] mt-0.5">Explorar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('nutricion')}
            className="rounded-2xl bg-[#131A16] border border-white/8 p-3 flex flex-col items-center text-center hover:border-[#74D834]/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1C2620] flex items-center justify-center mb-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-bold text-white leading-tight">Mi Plan</span>
            <span className="text-[10px] text-[#8E9D93] mt-0.5">Nutrición</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('estadisticas')}
            className="rounded-2xl bg-[#131A16] border border-white/8 p-3 flex flex-col items-center text-center hover:border-[#74D834]/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1C2620] flex items-center justify-center mb-1.5">
              <TrendingUp className="w-4 h-4 text-[#4CC9B0]" />
            </div>
            <span className="text-xs font-bold text-white leading-tight">Progreso</span>
            <span className="text-[10px] text-[#8E9D93] mt-0.5">Métricas</span>
          </button>
        </div>
      </div>

      {/* Pasos, Distancia y Sesiones (Resumen tipo Fitness ajustado a Mi Salud Pro) */}
      {onAddManualSession && todayDate && (
        <ActivitySummaryCards
          sessions={workoutSessions}
          todayDate={todayDate}
          onAddManualSession={onAddManualSession}
          onDeleteSession={onDeleteSession}
        />
      )}

      {/* Today's Workout Card matching reference Photo 2 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-white">Entrenamiento de hoy</h3>
          <button
            type="button"
            onClick={() => onNavigateTab('rutinas')}
            className="text-[11px] text-[#74D834] font-semibold hover:underline cursor-pointer"
          >
            Ver todo
          </button>
        </div>

        <div
          onClick={() => onNavigateTab('rutinas')}
          className="rounded-2xl bg-[#131A16] border border-white/8 p-3 flex items-center gap-3 hover:border-[#74D834]/40 transition-colors cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#0C120E] border border-white/5">
            <img
              src={IMAGE_ASSETS.strengthHero}
              alt="Fuerza Total"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">Fuerza Total</h4>
            <p className="text-[11px] text-[#8E9D93] mt-0.5">
              45 min · Intermedio · Guía 3D
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#74D834] text-[#081007] flex items-center justify-center shrink-0 shadow-md shadow-[#74D834]/20 group-hover:brightness-110 transition-all">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2-Column Stat Cards: Peso actual & Cintura */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openModal('weight')}
          className="text-left rounded-2xl bg-[#131A16] border border-white/7 p-3.5 hover:border-[#74D834]/40 transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#9AA89E]">Peso actual</p>
          <p className="font-display text-xl font-bold text-white mt-1 tabular-nums">
            {currentWeight} <span className="text-sm font-medium text-[#C5D0C8]">kg</span>
          </p>
          <p
            className={`text-xs font-medium mt-1 inline-flex items-center gap-1 tabular-nums ${
              weightDelta <= 0 ? 'text-[#74D834]' : 'text-[#E06A5E]'
            }`}
          >
            {weightDelta <= 0 ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}
            <span>{weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg</span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => openModal('waist')}
          className="text-left rounded-2xl bg-[#131A16] border border-white/7 p-3.5 hover:border-[#74D834]/40 transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#9AA89E]">Cintura</p>
          <p className="font-display text-xl font-bold text-white mt-1 tabular-nums">
            {currentWaist} <span className="text-sm font-medium text-[#C5D0C8]">cm</span>
          </p>
          <p
            className={`text-xs font-medium mt-1 inline-flex items-center gap-1 tabular-nums ${
              waistDelta <= 0 ? 'text-[#74D834]' : 'text-[#E06A5E]'
            }`}
          >
            {waistDelta <= 0 ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}
            <span>{waistDelta > 0 ? `+${waistDelta}` : waistDelta} cm</span>
          </p>
        </button>
      </div>

      {/* Tu día Checklist */}
      <div className="rounded-3xl bg-[#131A16] border border-white/7 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h2 className="font-display text-sm font-bold text-white">Tu día</h2>
            <p className="text-[10px] text-[#849489]">
              {streaks.overall.completedToday
                ? 'Racha diaria asegurada hoy'
                : streaks.overall.days > 0
                  ? 'Completa 2 hábitos hoy para sumar +1 día'
                  : 'Completa 2 hábitos para iniciar racha'}
            </p>
          </div>
          <StreakBadge streak={streaks.overall} />
        </div>

        <div className="divide-y divide-white/6">
          <div className="flex items-center justify-between gap-2 py-2.5 min-h-[46px]">
            <button
              type="button"
              onClick={() => onUpdateHabit({ workoutDone: !habits.workoutDone })}
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                  habits.workoutDone
                    ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                    : 'border-[#45544A]'
                }`}
              >
                {habits.workoutDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="text-sm text-[#EDF2ED] truncate">Entrenamiento</span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <StreakBadge streak={streaks.workout} compact />
              <button
                type="button"
                onClick={() => onNavigateTab('rutinas')}
                className="p-1 text-[#7D8C82] hover:text-white cursor-pointer"
                aria-label="Ir a entrenamiento"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-2.5 min-h-[46px]">
            <button
              type="button"
              onClick={() =>
                onUpdateHabit({ healthyEatingDone: !habits.healthyEatingDone })
              }
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                  habits.healthyEatingDone
                    ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                    : 'border-[#45544A]'
                }`}
              >
                {habits.healthyEatingDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="text-sm text-[#EDF2ED] truncate">Comer saludable</span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <StreakBadge streak={streaks.eating} compact />
              <button
                type="button"
                onClick={() => onNavigateTab('nutricion')}
                className="p-1 text-[#7D8C82] hover:text-white cursor-pointer"
                aria-label="Ir a nutrición"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-2.5 min-h-[46px]">
            <button
              type="button"
              onClick={onOpenHealthModule}
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                  waterDone
                    ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                    : 'border-[#45544A]'
                }`}
              >
                {waterDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="text-sm text-[#EDF2ED] tabular-nums truncate">
                Hidratarte ({habits.waterLiters.toFixed(1)}/{profile.waterTargetLiters} L)
              </span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <StreakBadge streak={streaks.water} compact />
              <button
                type="button"
                onClick={() =>
                  onUpdateHabit({
                    waterLiters: Number(Math.min(5, habits.waterLiters + 0.25).toFixed(2)),
                  })
                }
                className="min-h-[32px] px-2 rounded-lg bg-[#1D2821] text-[11px] font-medium text-[#74D834] inline-flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>250ml</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-2.5 min-h-[46px]">
            <button
              type="button"
              onClick={() => onUpdateHabit({ sleepHours: sleepDone ? 6.5 : 8 })}
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                  sleepDone
                    ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                    : 'border-[#45544A]'
                }`}
              >
                {sleepDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="text-sm text-[#EDF2ED] tabular-nums truncate">
                Dormir 7-9 h
              </span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <StreakBadge streak={streaks.sleep} compact />
              <button
                type="button"
                onClick={onOpenHealthModule}
                className="p-1 text-[#7D8C82] hover:text-white cursor-pointer"
                aria-label="Registrar sueño"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Flame Tier Legend */}
        <div className="mt-2 pt-2.5 border-t border-white/6 flex items-center justify-between text-[10px] text-[#849489]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            1–2d
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF6B2C]" />
            3–6d
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FA114F]" />
            7–13d
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
            14+d
          </span>
        </div>
      </div>

      {/* Customizable Interactive Widgets Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-sm font-bold text-white">Tus Widgets</h2>
          <button
            type="button"
            onClick={() => setShowWidgetEditor(true)}
            className="text-[11px] font-semibold text-[#74D834] inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Editar / Agregar</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Widget 1: Sueño y Alarma */}
          {enabledWidgets.includes('sleep') && (
          <button
            type="button"
            onClick={onOpenHealthModule}
            className="text-left rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#D6A63A]/45 p-3.5 space-y-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#D6A63A] flex items-center gap-1">
                <Moon className="w-3.5 h-3.5" />
                <span>Sueño</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#D6A63A]/15 text-[#F6D377] font-mono-nums">
                {reminders?.wakeUpTime || '06:30'}
              </span>
            </div>
            <p className="font-mono-nums text-xl font-bold text-white">
              {habits.sleepHours} <span className="text-xs font-normal text-[#9AA89E]">h</span>
            </p>
            <p className="text-[10px] text-[#8E9D93] flex items-center gap-1 truncate">
              <AlarmClock className="w-3 h-3 text-[#D6A63A] shrink-0" />
              <span>
                {(reminders?.wakeUpEnabled ?? true) ? 'Alarma iPhone activa' : 'Alarma apagada'}
              </span>
            </p>
          </button>
          )}

          {/* Widget 2: Hidratación rápida */}
          {enabledWidgets.includes('water') && (
          <div className="rounded-2xl bg-[#131A16] border border-white/8 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onOpenHealthModule}
                className="text-[11px] font-semibold text-[#4CC9B0] flex items-center gap-1 cursor-pointer"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Agua</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateHabit({
                    waterLiters: Number(Math.min(6, habits.waterLiters + 0.25).toFixed(2)),
                  })
                }
                className="px-1.5 py-0.5 rounded-md bg-[#4CC9B0]/18 text-[#4CC9B0] text-[10px] font-bold cursor-pointer"
              >
                +250ml
              </button>
            </div>
            <p className="font-mono-nums text-xl font-bold text-white">
              {habits.waterLiters.toFixed(1)}{' '}
              <span className="text-xs font-normal text-[#9AA89E]">
                / {profile.waterTargetLiters}L
              </span>
            </p>
            <div className="h-1.5 rounded-full bg-[#1C2620] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4CC9B0] transition-all"
                style={{
                  width: `${Math.min(100, (habits.waterLiters / Math.max(0.5, profile.waterTargetLiters)) * 100)}%`,
                }}
              />
            </div>
          </div>
          )}

          {/* Widget 3: Calorías y Macros */}
          {enabledWidgets.includes('calories') && (
          <button
            type="button"
            onClick={() => onNavigateTab('nutricion')}
            className="text-left rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#FB5262]/45 p-3.5 space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#FB5262] flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" />
                <span>Calorías</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7C73]" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-white">
              {Math.round(nutritionTotals.calories)}{' '}
              <span className="text-xs font-normal text-[#9AA89E]">kcal</span>
            </p>
            <p className="text-[10px] font-mono-nums text-[#8E9D93] truncate">
              P {Math.round(nutritionTotals.proteinG)}g · C {Math.round(nutritionTotals.carbsG)}g · G{' '}
              {Math.round(nutritionTotals.fatG)}g
            </p>
          </button>
          )}

          {/* Widget 4: Racha Activa */}
          {enabledWidgets.includes('streak') && (
          <button
            type="button"
            onClick={() => onNavigateTab('estadisticas')}
            className="text-left rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#FF6B2C]/45 p-3.5 space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#FF6B2C] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Racha</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7C73]" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-white">
              {streaks.overall.days}{' '}
              <span className="text-xs font-normal text-[#9AA89E]">
                {streaks.overall.days === 1 ? 'día' : 'días'}
              </span>
            </p>
            <p className="text-[10px] text-[#8E9D93] truncate">
              {streaks.overall.completedToday ? 'Meta diaria cumplida hoy' : '2 hábitos = +1 día'}
            </p>
          </button>
          )}

          {/* Widget 5: Carrera GPS */}
          {enabledWidgets.includes('gps') && (
          <button
            type="button"
            onClick={onLaunchOutdoorRun}
            className="text-left rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#74D834]/45 p-3.5 space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#74D834] flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5" />
                <span>Carrera GPS</span>
              </span>
              <Play className="w-3.5 h-3.5 text-[#74D834] fill-current" />
            </div>
            <p className="font-display text-sm font-bold text-white">Iniciar ruta</p>
            <p className="text-[10px] text-[#8E9D93] truncate">Mapa, distancia y ritmo</p>
          </button>
          )}

          {/* Widget 6: Suelo Pélvico (Kegel) */}
          {enabledWidgets.includes('kegel') && (
          <button
            type="button"
            onClick={onOpenHealthModule}
            className="text-left rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#3FC8FF]/45 p-3.5 space-y-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#3FC8FF] flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Kegel</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7C73]" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-white">
              {kegelCount} <span className="text-xs font-normal text-[#9AA89E]">ses.</span>
            </p>
            <p className="text-[10px] text-[#8E9D93] truncate">Guía 10 ciclos · Audio</p>
          </button>
          )}
        </div>
      </div>

      {/* Modal: Agregar o quitar Widgets en Inicio */}
      {showWidgetEditor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Personalizar Widgets
                </h3>
                <p className="text-[11px] text-[#8E9D93]">
                  Activa o desactiva widgets en tu pantalla de Inicio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWidgetEditor(false)}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {ALL_WIDGET_OPTIONS.map((opt) => {
                const active = enabledWidgets.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleHomeWidget(opt.id)}
                    className={`w-full rounded-2xl border p-3 flex items-center justify-between text-left cursor-pointer ${
                      active
                        ? 'bg-[#17241B] border-[#74D834]/45'
                        : 'bg-[#0D120F] border-white/8 opacity-70'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{opt.label}</p>
                      <p className="text-[10px] text-[#8E9D93]">{opt.desc}</p>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        active
                          ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                          : 'border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowWidgetEditor(false)}
              className="w-full py-3 rounded-2xl bg-[#74D834] text-[#081007] font-bold text-sm cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Quick Module Card: Salud y Suelo Pélvico */}
      <button
        type="button"
        onClick={onOpenHealthModule}
        className="w-full text-left rounded-2xl bg-[#131A16] border border-white/7 p-3.5 hover:border-[#74D834]/35 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#74D834]/12 border border-[#74D834]/25 flex items-center justify-center text-[#74D834] shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-white truncate">
              Salud y Suelo Pélvico
            </h3>
            <p className="text-[11px] text-[#9AA89E] mt-0.5 flex items-center gap-1.5 truncate">
              <span className="inline-flex items-center gap-1">
                <Droplets className="w-3 h-3 text-[#4CC9B0]" />
                {habits.waterLiters.toFixed(1)}L
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Moon className="w-3 h-3 text-[#D6A63A]" />
                {habits.sleepHours}h
              </span>
              <span aria-hidden="true">·</span>
              <span>Guía Kegel</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StreakBadge streak={streaks.kegel} compact />
          <ChevronRight className="w-4 h-4 text-[#7D8C82]" />
        </div>
      </button>

      {/* Quick Log Weight / Waist Modal */}
      {quickModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-4">
          <form
            onSubmit={handleSaveQuick}
            className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                {quickModal === 'weight' ? 'Registrar peso actual' : 'Registrar cintura'}
              </h3>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="number"
              step="0.1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#0D120F] border border-white/10 text-lg font-mono-nums text-white"
            />
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] cursor-pointer"
            >
              Guardar registro
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
