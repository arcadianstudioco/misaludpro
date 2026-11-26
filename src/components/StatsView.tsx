import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Camera,
  Flame,
  Footprints,
  Loader2,
  Plus,
  Route,
  Ruler,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  analyzeProgressDiagnosis,
  ProgressDiagnosis,
} from '../services/aiClient';
import { ActivitySummaryCards } from './ActivitySummaryCards';
import { estimateStepsFromSessions } from './SessionsModal';
import {
  BodyMeasurement,
  DailyHabits,
  MealEntry,
  ProgressPhoto,
  WorkoutSessionLog,
} from '../types/health';
import { daysAgoIso } from '../data/seedData';

interface StatsViewProps {
  todayDate: string;
  measurements: BodyMeasurement[];
  progressPhotos: ProgressPhoto[];
  meals: MealEntry[];
  workoutSessions: WorkoutSessionLog[];
  habitsByDate: Record<string, DailyHabits>;
  dailyNotes: Record<string, string>;
  heightCm?: number;
  age?: number;
  goal?: string;
  targetWeightKg?: number;
  calorieTargetMin?: number;
  calorieTargetMax?: number;
  onAddMeasurement: (entry: Omit<BodyMeasurement, 'id' | 'date'>) => void;
  onAddPhoto: (label: string, dataUrl: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onSaveDailyNote: (text: string, dateIso?: string) => void;
  onAddManualSession?: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
  onDeleteSession?: (sessionId: string) => void;
}

type RangeKey = '7d' | '14d' | '30d';

function formatShortDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${Number(parts[2])}/${Number(parts[1])}`;
}

export function StatsView({
  todayDate,
  measurements,
  progressPhotos,
  meals,
  workoutSessions,
  habitsByDate,
  goal = 'Mejorar rendimiento y composición',
  targetWeightKg,
  calorieTargetMin = 1700,
  calorieTargetMax = 2100,
  onAddMeasurement,
  onAddPhoto,
  onDeletePhoto,
  onAddManualSession,
  onDeleteSession,
}: StatsViewProps) {
  const [range, setRange] = useState<RangeKey>('7d');
  const [chartMetric, setChartMetric] = useState<'calories' | 'minutes' | 'miles'>('calories');
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [showAddMeasForm, setShowAddMeasForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<ProgressDiagnosis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => a.date.localeCompare(b.date)),
    [measurements]
  );
  const latestMeas = sortedMeasurements[sortedMeasurements.length - 1];
  const firstMeas = sortedMeasurements[0];

  const [weight, setWeight] = useState(String(latestMeas?.weightKg ?? 80));
  const [waist, setWaist] = useState(String(latestMeas?.waistCm ?? 90));
  const [abdomen, setAbdomen] = useState(String(latestMeas?.abdomenCm ?? 92));
  const [chest, setChest] = useState(String(latestMeas?.chestCm ?? 100));
  const [arms, setArms] = useState(String(latestMeas?.armsCm ?? 36));

  useEffect(() => {
    const onBack = () => {
      if (selectedPhoto) setSelectedPhoto(null);
      else if (showAddMeasForm) setShowAddMeasForm(false);
      else if (showBodyModal) setShowBodyModal(false);
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [selectedPhoto, showAddMeasForm, showBodyModal]);

  // Daily activity series for selected range (7d / 14d / 30d)
  const activitySeries = useMemo(() => {
    const daysCount = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const rows: Array<{
      iso: string;
      label: string;
      calories: number;
      minutes: number;
      miles: number;
      steps: number;
      sessions: number;
    }> = [];

    for (let i = daysCount - 1; i >= 0; i -= 1) {
      const iso = daysAgoIso(i);
      const daySessions = workoutSessions.filter((s) => (s.completedAt || '').slice(0, 10) === iso);
      const calories = daySessions.reduce(
        (acc, s) => acc + (Number(s.activeCalories ?? s.caloriesBurned) || 0),
        0
      );
      const minutes = Math.round(
        daySessions.reduce((acc, s) => acc + (Number(s.durationSec) || 0), 0) / 60
      );
      const miles = Number(
        daySessions.reduce((acc, s) => acc + (Number(s.distanceMiles) || 0), 0).toFixed(2)
      );
      const steps = estimateStepsFromSessions(daySessions);

      rows.push({
        iso,
        label: formatShortDate(iso),
        calories,
        minutes,
        miles,
        steps,
        sessions: daySessions.length,
      });
    }
    return rows;
  }, [workoutSessions, range]);

  // Trends: Last 7 days vs Previous 7 days
  const trends = useMemo(() => {
    const summarizeWindow = (startDaysAgo: number, endDaysAgo: number) => {
      const startIso = daysAgoIso(startDaysAgo);
      const endIso = daysAgoIso(endDaysAgo);
      const list = workoutSessions.filter((s) => {
        const d = (s.completedAt || '').slice(0, 10);
        return d >= startIso && d <= endIso;
      });
      const calories = list.reduce(
        (a, s) => a + (Number(s.activeCalories ?? s.caloriesBurned) || 0),
        0
      );
      const minutes = Math.round(
        list.reduce((a, s) => a + (Number(s.durationSec) || 0), 0) / 60
      );
      const miles = list.reduce((a, s) => a + (Number(s.distanceMiles) || 0), 0);
      const steps = estimateStepsFromSessions(list);
      return { calories, minutes, miles, steps, count: list.length };
    };

    const current = summarizeWindow(6, 0);
    const previous = summarizeWindow(13, 7);

    const calcTrend = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      calories: {
        value: current.calories,
        pct: calcTrend(current.calories, previous.calories),
      },
      miles: {
        value: Number(current.miles.toFixed(2)),
        pct: calcTrend(current.miles, previous.miles),
      },
      minutes: {
        value: current.minutes,
        pct: calcTrend(current.minutes, previous.minutes),
      },
      stepsPerDay: {
        value: Math.round(current.steps / 7),
        pct: calcTrend(current.steps, previous.steps),
      },
    };
  }, [workoutSessions]);

  // Apple Fitness-style Awards
  const awards = useMemo(() => {
    const hasOutdoorRun = workoutSessions.some(
      (s) => s.isOutdoor && (s.distanceMiles ?? 0) > 0
    );
    const maxRunMiles = Math.max(0, ...workoutSessions.map((s) => s.distanceMiles ?? 0));
    const totalWorkouts = workoutSessions.length;

    // Max daily steps across any date
    const stepsByDate = new Map<string, number>();
    for (const s of workoutSessions) {
      const d = (s.completedAt || '').slice(0, 10);
      if (!d) continue;
      stepsByDate.set(d, (stepsByDate.get(d) || 0) + estimateStepsFromSessions([s]));
    }
    const maxDailySteps = Math.max(0, ...Array.from(stepsByDate.values()));

    return [
      {
        id: 'first-workout',
        title: 'Primer entreno',
        desc: 'Completa tu primera sesión',
        unlocked: totalWorkouts >= 1,
        accent: '#74D834',
      },
      {
        id: 'first-run',
        title: 'Primera carrera',
        desc: 'Registra una ruta GPS',
        unlocked: hasOutdoorRun,
        accent: '#3FC8FF',
      },
      {
        id: 'distance-5k',
        title: 'Meta 5K (3.1 MI)',
        desc: 'Corre 3.1+ millas en una sesión',
        unlocked: maxRunMiles >= 3.1,
        accent: '#A78BFA',
      },
      {
        id: 'steps-10k',
        title: '10,000 pasos',
        desc: 'Alcanza 10k pasos en un día',
        unlocked: maxDailySteps >= 10000,
        accent: '#FB5262',
      },
    ];
  }, [workoutSessions]);

  const handleRunAiDiagnosis = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const cutoff14 = daysAgoIso(13);
      const recentMeals = meals.filter((m) => m.date >= cutoff14);
      const mealDays = new Set(recentMeals.map((m) => m.date)).size || 1;
      const totalCals = recentMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
      const recentWorkouts = workoutSessions.filter(
        (w) => (w.completedAt || '').slice(0, 10) >= cutoff14
      ).length;

      const habitEntries = Object.values(habitsByDate).filter((h) => h.date >= cutoff14);
      const avgSleep =
        habitEntries.length > 0
          ? Number(
              (
                habitEntries.reduce((a, h) => a + (Number(h.sleepHours) || 0), 0) /
                habitEntries.length
              ).toFixed(1)
            )
          : 0;
      const avgWater =
        habitEntries.length > 0
          ? Number(
              (
                habitEntries.reduce((a, h) => a + (Number(h.waterLiters) || 0), 0) /
                habitEntries.length
              ).toFixed(1)
            )
          : 0;

      const currentW = latestMeas?.weightKg ?? 0;
      const deltaW =
        latestMeas && firstMeas ? Number((latestMeas.weightKg - firstMeas.weightKg).toFixed(1)) : 0;

      const result = await analyzeProgressDiagnosis({
        goal,
        currentWeightKg: currentW,
        targetWeightKg: targetWeightKg ?? currentW,
        weightDeltaKg: deltaW,
        waistLatestCm: latestMeas?.waistCm ?? 0,
        avgDailyCalories: Math.round(totalCals / mealDays),
        calorieTargetRange: `${calorieTargetMin}-${calorieTargetMax} kcal`,
        workoutsLast14d: recentWorkouts,
        avgSleepHours: avgSleep,
        avgWaterLiters: avgWater,
        measurementsCount: measurements.length,
      });
      setAiDiagnosis(result);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'No se pudo generar el diagnóstico.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMeasurement({
      weightKg: Number(weight) || latestMeas?.weightKg || 80,
      waistCm: Number(waist) || latestMeas?.waistCm || 90,
      abdomenCm: Number(abdomen) || latestMeas?.abdomenCm || 92,
      chestCm: Number(chest) || latestMeas?.chestCm || 100,
      armsCm: Number(arms) || latestMeas?.armsCm || 36,
    });
    setShowAddMeasForm(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onAddPhoto(file.name.replace(/\.[^.]+$/, ''), reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Estadísticas</h1>
          <p className="text-[11px] text-[#8E9D93]">Actividad, tendencias y premios</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBodyModal(true)}
          className="min-h-[36px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-xs font-semibold text-[#C5D0C8] hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Ruler className="w-3.5 h-3.5 text-[#74D834]" />
          <span>Medidas</span>
        </button>
      </div>

      {/* Pasos, Distancia y Sesiones */}
      {onAddManualSession && (
        <ActivitySummaryCards
          sessions={workoutSessions}
          todayDate={todayDate}
          onAddManualSession={onAddManualSession}
          onDeleteSession={onDeleteSession}
        />
      )}

      {/* Tendencias (Últimos 7 días vs 7 días anteriores) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-sm font-bold text-white">Tendencias (7 días)</h2>
          <span className="text-[11px] text-[#8E9D93]">vs. semana anterior</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              label: 'Calorías activas',
              value: `${trends.calories.value.toLocaleString('es-ES')} CAL`,
              pct: trends.calories.pct,
              color: '#FB5262',
              Icon: Flame,
            },
            {
              label: 'Distancia',
              value: `${trends.miles.value.toFixed(2)} MI`,
              pct: trends.miles.pct,
              color: '#3FC8FF',
              Icon: Route,
            },
            {
              label: 'Entrenamiento',
              value: `${trends.minutes.value} MIN`,
              pct: trends.minutes.pct,
              color: '#74D834',
              Icon: Timer,
            },
            {
              label: 'Pasos / día',
              value: trends.stepsPerDay.value.toLocaleString('es-ES'),
              pct: trends.stepsPerDay.pct,
              color: '#A78BFA',
              Icon: Footprints,
            },
          ].map((item) => {
            const up = item.pct >= 0;
            const Icon = item.Icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl bg-[#131A16] border border-white/8 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9AA89E] flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span>{item.label}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono-nums font-bold px-1.5 py-0.5 rounded-full ${
                      up
                        ? 'bg-[#74D834]/15 text-[#74D834]'
                        : 'bg-[#FB5262]/15 text-[#FB5262]'
                    }`}
                  >
                    {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                    {Math.abs(item.pct)}%
                  </span>
                </div>
                <p className="font-mono-nums text-lg font-extrabold text-white">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfica de Actividad Real (Barras por día) */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-bold text-white">Actividad diaria</h2>
            <p className="text-[11px] text-[#8E9D93]">
              {chartMetric === 'calories'
                ? 'Calorías activas por día'
                : chartMetric === 'minutes'
                  ? 'Minutos entrenados por día'
                  : 'Millas recorridas por día'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#0D120F] p-1 rounded-xl border border-white/8">
            {(['7d', '14d', '30d'] as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  range === key ? 'bg-[#74D834] text-[#081007]' : 'text-[#8E9D93]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Metric selector */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'calories', label: 'Calorías', color: '#FB5262' },
              { id: 'minutes', label: 'Minutos', color: '#74D834' },
              { id: 'miles', label: 'Distancia', color: '#3FC8FF' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setChartMetric(m.id)}
              className={`py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                chartMetric === m.id
                  ? 'bg-[#18211C] border-white/20 text-white'
                  : 'bg-[#0D120F] border-white/6 text-[#8E9D93]'
              }`}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: m.color }}
              />
              {m.label}
            </button>
          ))}
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activitySeries} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8E9D93', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={range === '30d' ? 4 : range === '14d' ? 1 : 0}
              />
              <YAxis
                tick={{ fill: '#8E9D93', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#0D120F',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Bar
                dataKey={chartMetric}
                radius={[6, 6, 0, 0]}
                fill={
                  chartMetric === 'calories'
                    ? '#FB5262'
                    : chartMetric === 'minutes'
                      ? '#74D834'
                      : '#3FC8FF'
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premios y Logros (Apple Fitness style) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#D6A63A]" />
            <span>Premios</span>
          </h2>
          <span className="text-[11px] text-[#8E9D93]">
            {awards.filter((a) => a.unlocked).length} / {awards.length} logrados
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {awards.map((award) => (
            <div
              key={award.id}
              className={`rounded-2xl border p-3.5 flex items-center gap-3 ${
                award.unlocked
                  ? 'bg-[#131A16] border-white/12'
                  : 'bg-[#0E1310] border-white/5 opacity-55'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: award.unlocked ? `${award.accent}20` : 'rgba(255,255,255,0.04)',
                  borderColor: award.unlocked ? `${award.accent}55` : 'rgba(255,255,255,0.08)',
                  color: award.unlocked ? award.accent : '#6E7C73',
                }}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{award.title}</p>
                <p className="text-[10px] text-[#8E9D93] leading-snug">{award.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnóstico IA Semanal */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#74D834]" />
            <div>
              <h2 className="font-display text-sm font-bold text-white">Resumen inteligente</h2>
              <p className="text-[11px] text-[#8E9D93]">Análisis rápido de tu última semana</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunAiDiagnosis}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded-xl bg-[#74D834]/15 border border-[#74D834]/35 text-[11px] font-semibold text-[#74D834] inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{aiLoading ? 'Analizando...' : 'Analizar'}</span>
          </button>
        </div>

        {aiError && <p className="text-xs text-[#FB5262]">{aiError}</p>}

        {aiDiagnosis && (
          <div className="rounded-2xl bg-[#0D120F] border border-white/8 p-3 space-y-2 text-xs">
            <p className="font-semibold text-white">{aiDiagnosis.headline}</p>
            <p className="text-[#9AA89E] leading-relaxed">{aiDiagnosis.diagnosis}</p>
            {aiDiagnosis.actionStep && (
              <p className="text-[#74D834] text-[11px] font-medium">
                • {aiDiagnosis.actionStep}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal opcional: Medidas corporales & Fotos de progreso */}
      {showBodyModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0D0B] text-white flex flex-col overflow-y-auto keep-dark">
          <div
            className="px-4 pb-3 flex items-center justify-between bg-[#0A0D0B]/95 border-b border-white/8 sticky top-0 z-20"
            style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 14px))' }}
          >
            <h2 className="font-display text-lg font-bold text-white">Medidas y Fotos</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMeasForm(true)}
                className="px-3 py-1.5 rounded-xl bg-[#74D834] text-[#081007] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBodyModal(false)}
                className="w-9 h-9 rounded-full bg-[#18211C] flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Latest Measurements Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Peso actual', val: `${latestMeas?.weightKg ?? '—'} kg` },
                { label: 'Cintura', val: `${latestMeas?.waistCm ?? '—'} cm` },
                { label: 'Abdomen', val: `${latestMeas?.abdomenCm ?? '—'} cm` },
                { label: 'Pecho / Brazos', val: `${latestMeas?.chestCm ?? '—'} / ${latestMeas?.armsCm ?? '—'} cm` },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl bg-[#131A16] border border-white/8 p-3.5">
                  <p className="text-[11px] text-[#8E9D93]">{m.label}</p>
                  <p className="font-mono-nums text-lg font-bold text-white mt-0.5">{m.val}</p>
                </div>
              ))}
            </div>

            {/* Progress Photos */}
            <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Fotos de progreso</span>
                <label className="px-3 py-1.5 rounded-xl bg-[#1A231D] border border-white/10 text-xs text-[#74D834] font-semibold inline-flex items-center gap-1 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Subir foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              {progressPhotos.length === 0 ? (
                <p className="text-xs text-[#8E9D93]">Sin fotos guardadas aún.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {progressPhotos.map((p) => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square bg-black/40">
                      <img
                        src={p.dataUrl}
                        alt={p.label}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedPhoto(p)}
                      />
                      <button
                        type="button"
                        onClick={() => onDeletePhoto(p.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showAddMeasForm && (
            <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-4">
              <form
                onSubmit={handleSaveMeasurement}
                className="w-full max-w-md rounded-3xl bg-[#131A16] border border-white/12 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-white">Nueva medición</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddMeasForm(false)}
                    className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[#8E9D93]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Peso (kg)', val: weight, set: setWeight },
                    { label: 'Cintura (cm)', val: waist, set: setWaist },
                    { label: 'Abdomen (cm)', val: abdomen, set: setAbdomen },
                    { label: 'Pecho (cm)', val: chest, set: setChest },
                    { label: 'Brazos (cm)', val: arms, set: setArms },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-[11px] text-[#8E9D93] block mb-1">{f.label}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#74D834] text-[#081007] font-bold text-sm cursor-pointer"
                >
                  Guardar
                </button>
              </form>
            </div>
          )}

          {selectedPhoto && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <img src={selectedPhoto.dataUrl} alt={selectedPhoto.label} className="max-h-[75vh] rounded-2xl" />
              <p className="text-xs text-white/80 mt-2">{selectedPhoto.label} · {selectedPhoto.date}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
