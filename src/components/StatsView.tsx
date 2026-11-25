import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  analyzeProgressDiagnosis,
  ProgressDiagnosis,
} from '../services/aiClient';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
}

type RangeKey = '7d' | '30d' | '90d' | '1a';

function estimateBodyFatPercent(
  weightKg: number,
  waistCm: number,
  heightCm = 182.88,
  age = 33
): number {
  const hM = Math.max(1.2, heightCm / 100);
  const bmi = weightKg / (hM * hM);
  const base = 1.2 * bmi + 0.23 * age - 16.2;
  const waistAdj = (waistCm - 94) * 0.3;
  return Number(Math.min(55, Math.max(5, base + waistAdj)).toFixed(1));
}

function formatShortDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${Number(parts[2])}/${Number(parts[1])}`;
}

function formatDayName(iso: string, daysAgo: number): string {
  if (daysAgo === 0) return 'Hoy';
  if (daysAgo === 1) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const weekday = dt.toLocaleDateString('es-ES', { weekday: 'short' });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
}

export function StatsView({
  todayDate,
  measurements,
  progressPhotos,
  meals,
  workoutSessions,
  habitsByDate,
  dailyNotes,
  heightCm = 182.88,
  age = 33,
  goal = 'Mantener / Mejorar composición',
  targetWeightKg,
  calorieTargetMin = 1700,
  calorieTargetMax = 2100,
  onAddMeasurement,
  onAddPhoto,
  onDeletePhoto,
  onSaveDailyNote,
}: StatsViewProps) {
  const [range, setRange] = useState<RangeKey>('30d');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWeightLine, setShowWeightLine] = useState(true);
  const [showFatLine, setShowFatLine] = useState(true);
  const [showSevenDayHistory, setShowSevenDayHistory] = useState(true);
  const [noteDraft, setNoteDraft] = useState(() => dailyNotes[todayDate] || '');
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<ProgressDiagnosis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const onBack = () => {
      if (selectedPhoto) setSelectedPhoto(null);
      else if (showAddModal) setShowAddModal(false);
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [selectedPhoto, showAddModal]);

  const handleRunAiDiagnosis = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const cutoff14 = daysAgoIso(13);
      const recentMeals = meals.filter((m) => m.date >= cutoff14);
      const mealDays = new Set(recentMeals.map((m) => m.date)).size || 1;
      const totalCals = recentMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
      const recentWorkouts = workoutSessions.filter((w) => w.date >= cutoff14).length;

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

      const currentW = latest?.weightKg ?? 0;
      const result = await analyzeProgressDiagnosis({
        goal,
        currentWeightKg: currentW,
        targetWeightKg: targetWeightKg ?? currentW,
        weightDeltaKg: weightDelta,
        waistLatestCm: latest?.waistCm ?? 0,
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

  const sorted = useMemo(
    () => [...measurements].sort((a, b) => a.date.localeCompare(b.date)),
    [measurements]
  );

  const filtered = useMemo(() => {
    const daysMap: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysMap[range]);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const list = sorted.filter((m) => m.date >= cutoffIso);
    return list.length > 0 ? list : sorted;
  }, [sorted, range]);

  const chartData = useMemo(
    () =>
      filtered.map((m) => ({
        id: m.id,
        date: m.date,
        dateLabel: formatShortDate(m.date),
        weightKg: Number(m.weightKg.toFixed(1)),
        bodyFatPct: estimateBodyFatPercent(m.weightKg, m.waistCm, heightCm, age),
      })),
    [filtered, heightCm, age]
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : sorted[0];

  const latestFat = latest
    ? estimateBodyFatPercent(latest.weightKg, latest.waistCm, heightCm, age)
    : 0;
  const firstItem = chartData[0];
  const lastItem = chartData[chartData.length - 1];
  const weightDelta =
    firstItem && lastItem
      ? Number((lastItem.weightKg - firstItem.weightKg).toFixed(1))
      : 0;
  const fatDelta =
    firstItem && lastItem
      ? Number((lastItem.bodyFatPct - firstItem.bodyFatPct).toFixed(1))
      : 0;

  const [weight, setWeight] = useState(String(latest?.weightKg ?? 100));
  const [waist, setWaist] = useState(String(latest?.waistCm ?? 94));
  const [abdomen, setAbdomen] = useState(String(latest?.abdomenCm ?? 96));
  const [chest, setChest] = useState(String(latest?.chestCm ?? 102));
  const [arms, setArms] = useState(String(latest?.armsCm ?? 36));

  const openLogModal = () => {
    setWeight(String(latest?.weightKg ?? 100));
    setWaist(String(latest?.waistCm ?? 94));
    setAbdomen(String(latest?.abdomenCm ?? 96));
    setChest(String(latest?.chestCm ?? 102));
    setArms(String(latest?.armsCm ?? 36));
    setShowAddModal(true);
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMeasurement({
      weightKg: Number(weight) || latest?.weightKg || 80,
      waistCm: Number(waist) || latest?.waistCm || 90,
      abdomenCm: Number(abdomen) || latest?.abdomenCm || 92,
      chestCm: Number(chest) || latest?.chestCm || 100,
      armsCm: Number(arms) || latest?.armsCm || 36,
    });
    setShowAddModal(false);
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

  const toggleSeries = (series: 'weight' | 'fat') => {
    if (series === 'weight') {
      if (showWeightLine && !showFatLine) return;
      setShowWeightLine((v) => !v);
    } else {
      if (showFatLine && !showWeightLine) return;
      setShowFatLine((v) => !v);
    }
  };

  const sevenDayRows = useMemo(() => {
    const measurementByDate = new Map<string, BodyMeasurement>();
    for (const m of sorted) {
      measurementByDate.set(m.date, m);
    }

    const rowsList: Array<{
      iso: string;
      dayLabel: string;
      shortDate: string;
      weightKg: number | null;
      weightIsExact: boolean;
      calories: number;
      routinesCount: number;
      routineNames: string[];
    }> = [];

    for (let d = 0; d < 7; d += 1) {
      const iso = daysAgoIso(d);
      const exactM = measurementByDate.get(iso);
      let weightKg: number | null = exactM ? Number(exactM.weightKg.toFixed(1)) : null;
      let weightIsExact = Boolean(exactM);

      if (weightKg === null) {
        const prior = [...sorted].reverse().find((m) => m.date < iso);
        if (prior) {
          weightKg = Number(prior.weightKg.toFixed(1));
          weightIsExact = false;
        }
      }

      const dayMeals = meals.filter((m) => m.date === iso && m.completed);
      const calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);

      const daySessions = workoutSessions.filter((s) => s.completedAt === iso);
      const habitDone = Boolean(habitsByDate[iso]?.workoutDone);
      const routinesCount =
        daySessions.length > 0 ? daySessions.length : habitDone ? 1 : 0;
      const routineNames =
        daySessions.length > 0
          ? daySessions.map((s) => s.routineTitle)
          : habitDone
            ? ['Entrenamiento diario']
            : [];

      rowsList.push({
        iso,
        dayLabel: formatDayName(iso, d),
        shortDate: formatShortDate(iso),
        weightKg,
        weightIsExact,
        calories,
        routinesCount,
        routineNames,
      });
    }

    return rowsList;
  }, [sorted, meals, workoutSessions, habitsByDate]);

  const sevenDaySummary = useMemo(() => {
    const daysWithCalories = sevenDayRows.filter((r) => r.calories > 0);
    const avgCalories =
      daysWithCalories.length > 0
        ? Math.round(
            daysWithCalories.reduce((sum, r) => sum + r.calories, 0) /
              daysWithCalories.length
          )
        : 0;
    const totalRoutines = sevenDayRows.reduce((sum, r) => sum + r.routinesCount, 0);
    const newestW = sevenDayRows[0]?.weightKg;
    const oldestW = sevenDayRows[sevenDayRows.length - 1]?.weightKg;
    const weightChange =
      newestW !== null && oldestW !== null
        ? Number((newestW - oldestW).toFixed(1))
        : 0;
    return { avgCalories, totalRoutines, weightChange };
  }, [sevenDayRows]);

  const rows = [
    {
      label: 'Cintura',
      value: latest?.waistCm ?? 0,
      delta: Number(((latest?.waistCm ?? 0) - (previous?.waistCm ?? 0)).toFixed(1)),
    },
    {
      label: 'Abdomen',
      value: latest?.abdomenCm ?? 0,
      delta: Number(((latest?.abdomenCm ?? 0) - (previous?.abdomenCm ?? 0)).toFixed(1)),
    },
    {
      label: 'Pecho',
      value: latest?.chestCm ?? 0,
      delta: Number(((latest?.chestCm ?? 0) - (previous?.chestCm ?? 0)).toFixed(1)),
    },
    {
      label: 'Brazos',
      value: latest?.armsCm ?? 0,
      delta: Number(((latest?.armsCm ?? 0) - (previous?.armsCm ?? 0)).toFixed(1)),
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-display text-2xl font-bold text-white">Estadísticas</h1>
        <button
          type="button"
          onClick={openLogModal}
          className="min-h-[40px] px-3 rounded-xl bg-[#74D834] text-[#081007] text-xs font-display font-semibold inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar</span>
        </button>
      </div>

      {/* 7d | 30d | 90d | 1a */}
      <div className="grid grid-cols-4 p-1 rounded-xl bg-[#131A16] border border-white/7">
        {(['7d', '30d', '90d', '1a'] as RangeKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              range === key
                ? 'bg-[#74D834]/18 text-[#74D834]'
                : 'text-[#8E9D93] hover:text-white'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Recharts Fluid Line Chart: Peso Corporal & Grasa Estimada */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Evolución corporal
            </h2>
            <p className="text-[11px] text-[#8E9D93]">
              Peso (kg) y grasa corporal estimada (%)
            </p>
          </div>
        </div>

        {/* Series Legend & Metric Summary Pills */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleSeries('weight')}
            className={`text-left p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              showWeightLine
                ? 'bg-[#17241B] border-[#74D834]/45'
                : 'bg-[#0D120F] border-white/6 opacity-55'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#B8C4BC]">
                <span className="w-2 h-2 rounded-full bg-[#74D834]" />
                Peso
              </span>
              <span
                className={`text-[10px] font-mono-nums font-medium ${
                  weightDelta <= 0 ? 'text-[#74D834]' : 'text-[#E06A5E]'
                }`}
              >
                {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
              </span>
            </div>
            <p className="font-mono-nums text-base font-bold text-white mt-0.5">
              {latest?.weightKg ?? 100} <span className="text-xs font-normal text-[#9AA89E]">kg</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('fat')}
            className={`text-left p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              showFatLine
                ? 'bg-[#132220] border-[#4CC9B0]/45'
                : 'bg-[#0D120F] border-white/6 opacity-55'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#B8C4BC]">
                <span className="w-2 h-2 rounded-full bg-[#4CC9B0]" />
                Grasa est.
              </span>
              <span
                className={`text-[10px] font-mono-nums font-medium ${
                  fatDelta <= 0 ? 'text-[#4CC9B0]' : 'text-[#E06A5E]'
                }`}
              >
                {fatDelta > 0 ? `+${fatDelta}` : fatDelta}%
              </span>
            </div>
            <p className="font-mono-nums text-base font-bold text-white mt-0.5">
              {latestFat} <span className="text-xs font-normal text-[#9AA89E]">%</span>
            </p>
          </button>
        </div>

        {/* Fluid Recharts LineChart */}
        <div className="w-full h-48 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: showFatLine ? -8 : 10, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--chart-grid, rgba(255,255,255,0.06))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                stroke="#7D8C82"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
              />
              {showWeightLine && (
                <YAxis
                  yAxisId="weight"
                  orientation="left"
                  stroke="#52AD1E"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                  tickFormatter={(v) => `${v}`}
                />
              )}
              {showFatLine && (
                <YAxis
                  yAxisId="fat"
                  orientation="right"
                  stroke="#359E88"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${v}%`}
                />
              )}
              <Tooltip
                cursor={{ stroke: 'var(--chart-cursor, rgba(255,255,255,0.16))', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as {
                    date: string;
                    weightKg: number;
                    bodyFatPct: number;
                  };
                  return (
                    <div className="rounded-xl bg-[#0B100D]/95 border border-white/15 px-3 py-2 shadow-xl space-y-1">
                      <p className="text-[10px] font-mono-nums text-[#9AA89E]">
                        {pt.date}
                      </p>
                      {showWeightLine && (
                        <p className="text-xs font-mono-nums font-semibold text-[#74D834]">
                          Peso: {pt.weightKg} kg
                        </p>
                      )}
                      {showFatLine && (
                        <p className="text-xs font-mono-nums font-semibold text-[#4CC9B0]">
                          Grasa est.: {pt.bodyFatPct}%
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              {showWeightLine && (
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weightKg"
                  name="Peso (kg)"
                  stroke="#74D834"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#74D834', strokeWidth: 0 }}
                  activeDot={{ r: 5.5, fill: '#FFFFFF', stroke: '#74D834', strokeWidth: 2 }}
                  animationDuration={500}
                />
              )}
              {showFatLine && (
                <Line
                  yAxisId="fat"
                  type="monotone"
                  dataKey="bodyFatPct"
                  name="Grasa estimada (%)"
                  stroke="#4CC9B0"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#4CC9B0', strokeWidth: 0 }}
                  activeDot={{ r: 5.5, fill: '#FFFFFF', stroke: '#4CC9B0', strokeWidth: 2 }}
                  animationDuration={500}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Body Measurements Table */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2">
        <h2 className="font-display text-sm font-bold text-white">
          Medidas corporales
        </h2>
        <div className="divide-y divide-white/6">
          {rows.map((r) => {
            const improved = r.delta <= 0;
            return (
              <div
                key={r.label}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <span className="text-[#D2DDD5]">{r.label}</span>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="font-display font-bold text-white">{r.value} cm</span>
                  <span
                    className={`min-w-[54px] text-right font-medium inline-flex items-center justify-end gap-0.5 ${
                      r.label === 'Brazos' && r.delta >= 0
                        ? 'text-[#E06A5E]'
                        : improved
                        ? 'text-[#74D834]'
                        : 'text-[#E06A5E]'
                    }`}
                  >
                    {r.delta <= 0 && r.label !== 'Brazos' ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    )}
                    <span>{r.delta > 0 ? `+${r.delta}` : r.delta} cm</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Progress & Plateau Diagnosis Card */}
      <div className="rounded-3xl bg-[#131A16] border border-[#74D834]/25 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#74D834]/15 text-[#74D834] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Diagnóstico inteligente
              </h2>
              <p className="text-[11px] text-[#8E9D93] truncate">
                Detecta mesetas y ajusta tu semana según tus datos reales
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => void handleRunAiDiagnosis()}
            className="min-h-[34px] px-3 rounded-xl bg-[#74D834]/18 border border-[#74D834]/40 text-[11px] font-semibold text-[#74D834] hover:bg-[#74D834] hover:text-[#081007] transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
          >
            {aiLoading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Analizando...</span></>
            ) : (
              <span>{aiDiagnosis ? 'Actualizar' : 'Analizar'}</span>
            )}
          </button>
        </div>
        {aiError && (
          <p className="text-[11px] text-[#E57368] bg-[#E57368]/10 border border-[#E57368]/25 rounded-xl px-3 py-2">{aiError}</p>
        )}
        {aiDiagnosis && (
          <div className="rounded-2xl bg-[#0D120F] border border-white/8 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white">{aiDiagnosis.headline}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${aiDiagnosis.status === 'on_track' ? 'bg-[#74D834]/18 text-[#74D834]' : aiDiagnosis.status === 'plateau' ? 'bg-[#FBBF24]/18 text-[#FBBF24]' : 'bg-[#E57368]/18 text-[#E57368]'}`}>
                {aiDiagnosis.status === 'on_track' ? 'En ritmo' : aiDiagnosis.status === 'plateau' ? 'Meseta' : 'Atención'}
              </span>
            </div>
            <p className="text-[11px] text-[#C5D0C8] leading-relaxed">{aiDiagnosis.diagnosis}</p>
            <div className="pt-1.5 border-t border-white/6 text-[11px] text-[#74D834] font-medium">
              Ajuste recomendado: {aiDiagnosis.actionStep}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible 7-Day Historical Summary */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSevenDayHistory((open) => !open)}
          aria-expanded={showSevenDayHistory}
          className="w-full p-4 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#74D834]/12 border border-[#74D834]/25 text-[#74D834] flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Resumen últimos 7 días
              </h2>
              <p className="text-[11px] text-[#9AA89E] font-mono-nums truncate">
                Prom. {sevenDaySummary.avgCalories.toLocaleString('es-ES')} kcal ·{' '}
                {sevenDaySummary.totalRoutines}{' '}
                {sevenDaySummary.totalRoutines === 1 ? 'rutina' : 'rutinas'}
              </p>
            </div>
          </div>
          <span className="w-8 h-8 rounded-full bg-[#0D120F] border border-white/8 flex items-center justify-center text-[#9AA89E] shrink-0">
            {showSevenDayHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showSevenDayHistory && (
          <div className="px-4 pb-4 space-y-2 border-t border-white/6 pt-3">
            {/* Table Column Headers */}
            <div className="grid grid-cols-[1.15fr_0.85fr_0.9fr_0.7fr] gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#7D8C82]">
              <span>Día</span>
              <span className="text-right">Peso</span>
              <span className="text-right">Calorías</span>
              <span className="text-right">Rutinas</span>
            </div>

            <div className="divide-y divide-white/6">
              {sevenDayRows.map((day) => (
                <div key={day.iso} className="py-2 px-2 space-y-1">
                  <div className="grid grid-cols-[1.15fr_0.85fr_0.9fr_0.7fr] gap-1.5 items-center text-xs">
                    <div className="min-w-0">
                      <span className="font-medium text-white">{day.dayLabel}</span>
                      <span className="text-[10px] text-[#7D8C82] ml-1.5 font-mono-nums">
                        {day.shortDate}
                      </span>
                    </div>

                    <div className="text-right font-mono-nums">
                      {day.weightKg !== null ? (
                        <span
                          className={
                            day.weightIsExact
                              ? 'font-semibold text-white'
                              : 'text-[#8E9D93]'
                          }
                          title={day.weightIsExact ? 'Peso registrado' : 'Último peso de referencia'}
                        >
                          {day.weightKg} kg
                        </span>
                      ) : (
                        <span className="text-[#5F6E64]">—</span>
                      )}
                    </div>

                    <div className="text-right font-mono-nums">
                      {day.calories > 0 ? (
                        <span className="text-[#D2DDD5]">
                          {day.calories.toLocaleString('es-ES')}
                        </span>
                      ) : (
                        <span className="text-[#5F6E64]">0</span>
                      )}
                      <span className="text-[10px] text-[#7D8C82] ml-0.5">kcal</span>
                    </div>

                    <div className="flex justify-end">
                      {day.routinesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#74D834]/15 border border-[#74D834]/35 text-[10px] font-mono-nums font-semibold text-[#74D834]">
                          <Dumbbell className="w-2.5 h-2.5" />
                          <span>{day.routinesCount}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono-nums text-[#5F6E64]">
                          —
                        </span>
                      )}
                    </div>
                  </div>

                  {day.routineNames.length > 0 && (
                    <p className="text-[10px] text-[#849489] truncate pl-0.5">
                      {day.routineNames.join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* 7-Day Footer Totals */}
            <div className="pt-2 border-t border-white/6 flex items-center justify-between text-[11px] text-[#9AA89E] font-mono-nums px-1">
              <span>
                Balance 7d:{' '}
                <strong
                  className={
                    sevenDaySummary.weightChange <= 0
                      ? 'text-[#74D834]'
                      : 'text-[#E06A5E]'
                  }
                >
                  {sevenDaySummary.weightChange > 0
                    ? `+${sevenDaySummary.weightChange}`
                    : sevenDaySummary.weightChange}{' '}
                  kg
                </strong>
              </span>
              <span>
                Total rutinas:{' '}
                <strong className="text-white">{sevenDaySummary.totalRoutines}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notas Diarias (Reflexiones físicas del día) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSaveDailyNote(noteDraft, todayDate);
          setNoteSavedToast(true);
          window.setTimeout(() => setNoteSavedToast(false), 1800);
        }}
        className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#74D834]/12 border border-[#74D834]/25 text-[#74D834] flex items-center justify-center shrink-0">
              <NotebookPen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Notas diarias
              </h2>
              <p className="text-[11px] text-[#8E9D93] truncate">
                ¿Cómo te sientes físicamente hoy?
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono-nums text-[#7D8C82] shrink-0">
            {formatShortDate(todayDate)}
          </span>
        </div>

        <textarea
          rows={3}
          maxLength={280}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            if (noteDraft.trim() !== (dailyNotes[todayDate] || '').trim()) {
              onSaveDailyNote(noteDraft, todayDate);
            }
          }}
          placeholder="Ej. Buena energía al entrenar, piernas algo cargadas, dormí mejor..."
          className="w-full px-3 py-2.5 rounded-2xl bg-[#0D120F] border border-white/10 text-xs text-white placeholder:text-[#6E7D73] resize-none leading-relaxed focus:outline-none focus:border-[#74D834]/50"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono-nums text-[#7D8C82]">
            {noteDraft.length}/280
          </span>
          <div className="flex items-center gap-2">
            {noteSavedToast && (
              <span className="text-[11px] font-medium text-[#74D834] inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Guardado</span>
              </span>
            )}
            <button
              type="submit"
              className="min-h-[34px] px-3.5 rounded-xl bg-[#74D834] text-[#081007] font-display font-semibold text-xs cursor-pointer"
            >
              Guardar nota
            </button>
          </div>
        </div>

        {Object.entries(dailyNotes).filter(([, v]) => v.trim().length > 0).length > 0 && (
          <div className="pt-2 border-t border-white/6 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D8C82]">
              Reflexiones recientes
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
              {Object.entries(dailyNotes)
                .filter(([, v]) => v.trim().length > 0)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 5)
                .map(([iso, text]) => (
                  <div
                    key={iso}
                    className="rounded-xl bg-[#0D120F] border border-white/6 px-2.5 py-2 text-[11px]"
                  >
                    <span className="font-mono-nums font-semibold text-[#74D834]">
                      {iso === todayDate ? 'Hoy' : formatShortDate(iso)}:
                    </span>{' '}
                    <span className="text-[#D2DDD5]">{text}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </form>

      {/* Optional Progress Photos */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xs font-bold text-white">
              Fotografías de progreso (opcional)
            </h3>
            <p className="text-[11px] text-[#8E9D93]">
              Compara tu cambio físico · Toca una foto para ampliar
            </p>
          </div>
          <label className="min-h-[36px] px-3 rounded-xl bg-[#1B241E] text-xs font-medium text-[#74D834] inline-flex items-center gap-1.5 cursor-pointer">
            <Camera className="w-3.5 h-3.5" />
            <span>Subir</span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        {progressPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {progressPhotos.map((ph) => (
              <div
                key={ph.id}
                onClick={() => setSelectedPhoto(ph)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPhoto(ph);
                }}
                className="relative rounded-xl overflow-hidden bg-[#0D120F] border border-white/8 aspect-[3/4] cursor-pointer"
              >
                <img src={ph.dataUrl} alt={ph.label} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 pointer-events-none">
                  <p className="text-[9px] text-white/90 truncate">{formatShortDate(ph.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(ph.id);
                  }}
                  aria-label="Eliminar foto"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer keep-dark"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Body Measurements Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3">
          <form
            onSubmit={handleSaveMeasurement}
            className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Registrar peso y medidas
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-[#9AA89E]">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full min-h-[40px] mt-1 px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#9AA89E]">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full min-h-[40px] mt-1 px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#9AA89E]">Abdomen (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={abdomen}
                  onChange={(e) => setAbdomen(e.target.value)}
                  className="w-full min-h-[40px] mt-1 px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#9AA89E]">Pecho (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  className="w-full min-h-[40px] mt-1 px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-[#9AA89E]">Brazos (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={arms}
                  onChange={(e) => setArms(e.target.value)}
                  className="w-full min-h-[40px] mt-1 px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] cursor-pointer"
            >
              Guardar en estadísticas
            </button>
          </form>
        </div>
      )}

      {/* Fullscreen Progress Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col keep-dark"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="px-4 pb-3 flex items-center justify-between gap-3 shrink-0"
            style={{ paddingTop: 'max(14px, env(safe-area-inset-top, 14px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-white truncate">
                {selectedPhoto.label || 'Foto de progreso'}
              </p>
              <p className="text-[11px] text-[#9AA89E]">
                {formatShortDate(selectedPhoto.date)} · Privada en tu dispositivo
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onDeletePhoto(selectedPhoto.id);
                  setSelectedPhoto(null);
                }}
                aria-label="Eliminar foto"
                className="w-9 h-9 rounded-full bg-white/10 text-red-400 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Cerrar foto"
                className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.dataUrl}
              alt={selectedPhoto.label}
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
