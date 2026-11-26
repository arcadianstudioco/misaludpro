import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Dumbbell,
  Footprints,
  Plus,
  SquarePen,
  X,
} from 'lucide-react';
import { OutdoorActivityType, WorkoutSessionLog } from '../types/health';
import { formatPacePerMile, formatStopwatchDuration } from '../utils/gpsMath';
import { WorkoutSummaryAppleCard } from './WorkoutSummaryAppleCard';

export type SessionFilter = 'todos' | 'entrenamiento' | 'caminar' | 'correr';

interface SessionsModalProps {
  sessions: WorkoutSessionLog[];
  todayDate: string;
  onClose: () => void;
  onAddManualSession: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function getMonthHeader(iso: string): string {
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  if (!y || !m) return 'Sesiones recientes';
  return `${MONTHS_ES[m - 1] || 'Mes'} de ${y}`;
}

function getShortDayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'hoy';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return WEEKDAYS_ES[d.getDay()] || iso.slice(0, 10);
}

function classifySession(s: WorkoutSessionLog): 'correr' | 'caminar' | 'entrenamiento' {
  const label = `${s.activityType || ''} ${s.routineTitle || ''} ${s.routineId || ''}`.toLowerCase();
  if (label.includes('correr') || label.includes('carrera') || label.includes('run')) {
    return 'correr';
  }
  if (label.includes('caminar') || label.includes('caminata') || label.includes('walk')) {
    return 'caminar';
  }
  return 'entrenamiento';
}

export function estimateStepsFromSessions(sessions: WorkoutSessionLog[]): number {
  return sessions.reduce((acc, s) => {
    const miles = Number(s.distanceMiles) || 0;
    if (miles > 0) {
      return acc + Math.round(miles * 2100);
    }
    const mins = Math.round((Number(s.durationSec) || 0) / 60);
    return acc + mins * 65;
  }, 0);
}

export function SessionsModal({
  sessions,
  todayDate,
  onClose,
  onAddManualSession,
}: SessionsModalProps) {
  const [filter, setFilter] = useState<SessionFilter>('todos');
  const [selectedSession, setSelectedSession] = useState<WorkoutSessionLog | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual form fields
  const [manualType, setManualType] = useState<'Carrera al aire libre' | 'Caminata al aire libre' | 'Entrenamiento'>('Carrera al aire libre');
  const [manualMiles, setManualMiles] = useState('2.50');
  const [manualMinutes, setManualMinutes] = useState('32');
  const [manualSeconds, setManualSeconds] = useState('43');
  const [manualCalories, setManualCalories] = useState('515');
  const [manualDate, setManualDate] = useState(todayDate);

  // Listen for flutter-back (iOS back swipe / Android back button)
  useEffect(() => {
    const handler = () => {
      if (selectedSession) {
        setSelectedSession(null);
      } else if (showManualForm) {
        setShowManualForm(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('flutter-back', handler);
    return () => window.removeEventListener('flutter-back', handler);
  }, [onClose, selectedSession, showManualForm]);

  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) =>
      (b.completedAt || '').localeCompare(a.completedAt || '')
    );
    if (filter === 'todos') return sorted;
    return sorted.filter((s) => classifySession(s) === filter);
  }, [sessions, filter]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, WorkoutSessionLog[]>();
    for (const s of filteredSessions) {
      const monthKey = (s.completedAt || todayDate).slice(0, 7);
      const list = map.get(monthKey) || [];
      list.push(s);
      map.set(monthKey, list);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const count = items.length;
      const totalSec = items.reduce((a, b) => a + (Number(b.durationSec) || 0), 0);
      const totalCal = items.reduce((a, b) => a + (Number(b.caloriesBurned) || 0), 0);
      const totalMiles = items.reduce((a, b) => a + (Number(b.distanceMiles) || 0), 0);
      const avgSec = count > 0 ? Math.round(totalSec / count) : 0;
      const avgCal = count > 0 ? Math.round(totalCal / count) : 0;
      const avgMiles = count > 0 ? totalMiles / count : 0;
      const avgPace = formatPacePerMile(totalSec, totalMiles);

      return {
        key,
        title: getMonthHeader(key),
        items,
        count,
        totalSec,
        avgSec,
        totalCal,
        avgCal,
        totalMiles,
        avgMiles,
        avgPace,
      };
    });
  }, [filteredSessions, todayDate]);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(0, Number(manualMinutes) || 0);
    const secs = Math.max(0, Math.min(59, Number(manualSeconds) || 0));
    const totalSec = Math.max(60, mins * 60 + secs);
    const miles = manualType === 'Entrenamiento' ? 0 : Math.max(0, Number(manualMiles) || 0);
    const totalCal = Math.max(20, Math.round(Number(manualCalories) || 250));
    const activeCal = Math.round(totalCal * 0.86);
    const isOutdoor = manualType !== 'Entrenamiento';
    const pace = miles > 0 ? formatPacePerMile(totalSec, miles) : undefined;

    const saved = onAddManualSession(
      manualType === 'Carrera al aire libre'
        ? 'outdoor-run'
        : manualType === 'Caminata al aire libre'
          ? 'outdoor-walk'
          : 'manual-strength',
      manualType,
      totalSec,
      totalCal,
      {
        completedAt: manualDate || todayDate,
        isOutdoor,
        activityType: isOutdoor ? (manualType as OutdoorActivityType) : undefined,
        distanceMiles: miles > 0 ? Number(miles.toFixed(2)) : undefined,
        activeCalories: activeCal,
        totalCalories: totalCal,
        avgPaceText: pace,
        dateTimeLabel: `${manualDate || todayDate} · Registro manual`,
        deviceLabel: 'Registro manual',
      }
    );

    setShowManualForm(false);
    setSelectedSession(saved);
  };

  if (selectedSession) {
    return (
      <WorkoutSummaryAppleCard
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0D0B] text-white flex flex-col overflow-y-auto keep-dark">
      {/* Top Safe-Area Header */}
      <div
        className="px-4 pb-3 flex items-center justify-between bg-[#0A0D0B]/95 backdrop-blur-md sticky top-0 z-20"
        style={{ paddingTop: 'max(3.25rem, env(safe-area-inset-top, 14px))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-[#18211C] border border-white/10 flex items-center justify-center text-white hover:bg-[#212D26] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          aria-label="Registrar sesión manual"
          className="w-10 h-10 rounded-full bg-[#18211C] border border-[#74D834]/35 flex items-center justify-center text-[#74D834] hover:bg-[#74D834] hover:text-[#081007] transition-colors cursor-pointer"
        >
          <SquarePen className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="px-4 pb-8 space-y-5">
        <div className="flex items-end justify-between gap-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Sesiones
          </h1>
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="px-3 py-1.5 rounded-xl bg-[#74D834]/15 border border-[#74D834]/35 text-[11px] font-semibold text-[#74D834] inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar manual</span>
          </button>
        </div>

        {/* Filter Pills (Todos | Entrenamiento | Caminar | Correr) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'entrenamiento', label: 'Entrenamiento' },
              { id: 'caminar', label: 'Caminar' },
              { id: 'correr', label: 'Correr' },
            ] as const
          ).map((pill) => {
            const active = filter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilter(pill.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#74D834] text-[#081007]'
                    : 'bg-[#18211C] text-[#C5D0C8] border border-white/8 hover:border-white/20'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Monthly Groups with Total / Promedio + Session List */}
        {groupedByMonth.length === 0 ? (
          <div className="rounded-3xl bg-[#131A16] border border-white/8 p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-white">
              Sin sesiones registradas en esta categoría
            </p>
            <p className="text-xs text-[#8E9D93]">
              Inicia una carrera GPS desde Rutinas o registra manualmente tu entrenamiento de hoy.
            </p>
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#74D834] text-[#081007] text-xs font-bold cursor-pointer"
            >
              + Registrar sesión manual
            </button>
          </div>
        ) : (
          groupedByMonth.map((group) => {
            const countLabel =
              filter === 'correr'
                ? 'Carreras'
                : filter === 'caminar'
                  ? 'Caminatas'
                  : 'Entrenamientos';
            const showDistance = filter === 'correr' || filter === 'caminar' || group.totalMiles > 0;

            return (
              <div key={group.key} className="space-y-3">
                <h2 className="font-display text-lg font-bold text-white">
                  {group.title}
                </h2>

                {/* Total / Promedio summary grid */}
                {filter !== 'todos' && (
                  <div className="rounded-2xl bg-[#131A16] border border-white/8 p-3.5 text-xs space-y-1.5">
                    <div className="grid grid-cols-3 text-[#8E9D93] text-[11px] pb-1">
                      <span />
                      <span>Total</span>
                      <span>Promedio</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-white/90 font-medium">{countLabel}</span>
                      <span className="font-mono-nums text-white font-semibold">{group.count}</span>
                      <span />
                    </div>
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-white/90 font-medium">Tiempo</span>
                      <span className="font-mono-nums text-[#FFE620] font-semibold">
                        {formatStopwatchDuration(group.totalSec)}
                      </span>
                      <span className="font-mono-nums text-[#FFE620] font-semibold">
                        {formatStopwatchDuration(group.avgSec)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-white/90 font-medium">Calorías</span>
                      <span className="font-mono-nums text-[#FB5262] font-semibold">
                        CAL: {group.totalCal}
                      </span>
                      <span className="font-mono-nums text-[#FB5262] font-semibold">
                        CAL: {group.avgCal}
                      </span>
                    </div>
                    {showDistance && (
                      <>
                        <div className="grid grid-cols-3 items-center">
                          <span className="text-white/90 font-medium">Distancia</span>
                          <span className="font-mono-nums text-[#3FC8FF] font-semibold">
                            MI: {group.totalMiles.toFixed(2)}
                          </span>
                          <span className="font-mono-nums text-[#3FC8FF] font-semibold">
                            MI: {group.avgMiles.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center">
                          <span className="text-white/90 font-medium">Ritmo</span>
                          <span />
                          <span className="font-mono-nums text-[#3FC8FF] font-semibold">
                            {group.avgPace.replace(' /MI', ' MI')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Sessions List */}
                <div className="space-y-2.5">
                  {group.items.map((s) => {
                    const kind = classifySession(s);
                    const hasMiles = typeof s.distanceMiles === 'number' && s.distanceMiles > 0;
                    const primaryMetric = hasMiles
                      ? `${s.distanceMiles!.toFixed(2)} MI`
                      : `${Math.round(s.durationSec / 60)} MIN · ${s.caloriesBurned} CAL`;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSession(s)}
                        className="w-full rounded-2xl bg-[#131A16] border border-white/8 hover:border-[#74D834]/35 p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834] shrink-0">
                          {kind === 'entrenamiento' ? (
                            <Dumbbell className="w-5 h-5" />
                          ) : (
                            <Footprints className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {s.activityType || s.routineTitle}
                          </p>
                          <p className="font-mono-nums text-lg font-extrabold text-[#74D834] leading-tight">
                            {primaryMetric}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-[11px] text-[#8E9D93]">
                            {getShortDayLabel(s.completedAt, todayDate)}
                          </p>
                          <p className="font-mono-nums text-[10px] text-[#6E7C73]">
                            {formatStopwatchDuration(s.durationSec)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Session Entry Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleSaveManual}
            className="w-full max-w-md rounded-3xl bg-[#131A16] border border-white/12 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                Registrar sesión manual
              </h3>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[#8E9D93] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  'Carrera al aire libre',
                  'Caminata al aire libre',
                  'Entrenamiento',
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManualType(t)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                    manualType === t
                      ? 'bg-[#74D834]/18 border-[#74D834] text-[#74D834]'
                      : 'bg-[#0D120F] border-white/8 text-[#C5D0C8]'
                  }`}
                >
                  {t === 'Carrera al aire libre'
                    ? 'Correr'
                    : t === 'Caminata al aire libre'
                      ? 'Caminar'
                      : 'Fuerza'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {manualType !== 'Entrenamiento' && (
                <div>
                  <label className="text-[11px] text-[#8E9D93] block mb-1">
                    Distancia (MI)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualMiles}
                    onChange={(e) => setManualMiles(e.target.value)}
                    className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] text-[#8E9D93] block mb-1">
                  Calorías totales
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8E9D93] block mb-1">
                  Minutos
                </label>
                <input
                  type="number"
                  min="0"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8E9D93] block mb-1">
                  Segundos
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={manualSeconds}
                  onChange={(e) => setManualSeconds(e.target.value)}
                  className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#8E9D93] block mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full rounded-xl bg-[#0D120F] border border-white/10 px-3 py-2 text-sm font-mono-nums text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#74D834] text-[#081007] font-display font-bold text-sm cursor-pointer"
            >
              Guardar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
