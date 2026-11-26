import React, { useMemo, useState } from 'react';
import { ChevronRight, Dumbbell, Footprints, Plus, Route } from 'lucide-react';
import { WorkoutSessionLog } from '../types/health';
import { estimateStepsFromSessions, SessionsModal } from './SessionsModal';

interface ActivitySummaryCardsProps {
  sessions: WorkoutSessionLog[];
  todayDate: string;
  onAddManualSession: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
}

export function ActivitySummaryCards({
  sessions,
  todayDate,
  onAddManualSession,
}: ActivitySummaryCardsProps) {
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const { todaySteps, todayMiles, latestSession, todayBarHeights } = useMemo(() => {
    const todayList = sessions.filter((s) => s.completedAt === todayDate);
    const steps = estimateStepsFromSessions(todayList);
    const miles = todayList.reduce((acc, s) => acc + (Number(s.distanceMiles) || 0), 0);
    const sorted = [...sessions].sort((a, b) =>
      (b.completedAt || '').localeCompare(a.completedAt || '')
    );
    const latest = sorted[0] || null;

    // Visual hourly-style mini bars reflecting today's activity
    const bars = [14, 14, 14, 14, 14, 14, 14, 14, 14, 14];
    if (todayList.length > 0) {
      bars[3] = 85;
      bars[4] = 42;
      bars[6] = todayList.length > 1 ? 72 : 28;
      bars[7] = 34;
    }

    return {
      todaySteps: steps,
      todayMiles: miles,
      latestSession: latest,
      todayBarHeights: bars,
    };
  }, [sessions, todayDate]);

  return (
    <>
      <div className="space-y-2.5">
        {/* Top Row: Pasos + Distancia */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowSessionsModal(true)}
            className="rounded-3xl bg-[#131A16] border border-white/8 hover:border-[#74D834]/35 p-3.5 text-left space-y-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white inline-flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Pasos</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7C73]" />
            </div>
            <div>
              <span className="text-[10px] text-[#8E9D93] block">Hoy</span>
              <span className="font-mono-nums text-xl font-extrabold text-[#A78BFA] tracking-tight">
                {todaySteps.toLocaleString('es-ES')}
              </span>
            </div>
            <div className="flex items-end gap-1 h-6 pt-1">
              {todayBarHeights.map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-full bg-[#A78BFA]/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowSessionsModal(true)}
            className="rounded-3xl bg-[#131A16] border border-white/8 hover:border-[#3FC8FF]/35 p-3.5 text-left space-y-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white inline-flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-[#3FC8FF]" />
                <span>Distancia</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#6E7C73]" />
            </div>
            <div>
              <span className="text-[10px] text-[#8E9D93] block">Hoy</span>
              <span className="font-mono-nums text-xl font-extrabold text-[#3FC8FF] tracking-tight">
                {todayMiles.toFixed(2)} <span className="text-xs font-bold">MI</span>
              </span>
            </div>
            <div className="flex items-end gap-1 h-6 pt-1">
              {todayBarHeights.map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-full bg-[#3FC8FF]/75"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Bottom Card: Sesiones */}
        <button
          type="button"
          onClick={() => setShowSessionsModal(true)}
          className="w-full rounded-3xl bg-[#131A16] border border-white/8 hover:border-[#74D834]/40 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-bold text-white">
                Sesiones
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#74D834]/15 text-[#74D834] text-[10px] font-semibold">
                {sessions.length}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#74D834]">
              <Plus className="w-3.5 h-3.5" />
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {latestSession ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834] shrink-0">
                {latestSession.isOutdoor ? (
                  <Footprints className="w-4.5 h-4.5" />
                ) : (
                  <Dumbbell className="w-4.5 h-4.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {latestSession.activityType || latestSession.routineTitle}
                </p>
                <p className="font-mono-nums text-base font-extrabold text-[#74D834]">
                  {typeof latestSession.distanceMiles === 'number' && latestSession.distanceMiles > 0
                    ? `${latestSession.distanceMiles.toFixed(2)} MI`
                    : `${Math.round(latestSession.durationSec / 60)} MIN · ${latestSession.caloriesBurned} CAL`}
                </p>
              </div>
              <span className="text-[11px] text-[#8E9D93] shrink-0">
                {latestSession.completedAt === todayDate ? 'hoy' : latestSession.completedAt}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#8E9D93]">
              Toca para ver tus sesiones o registrar tu carrera/entrenamiento de hoy.
            </p>
          )}
        </button>
      </div>

      {showSessionsModal && (
        <SessionsModal
          sessions={sessions}
          todayDate={todayDate}
          onClose={() => setShowSessionsModal(false)}
          onAddManualSession={onAddManualSession}
        />
      )}
    </>
  );
}
