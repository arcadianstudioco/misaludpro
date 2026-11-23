import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Footprints,
  History,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  OutdoorActivityType,
  WorkoutRoutine,
  WorkoutSessionLog,
} from '../types/health';
import { RoutineThumbnailArtwork } from './BrandLogo';
import { Exercise3DViewer, inferExerciseAnimKind } from './Exercise3DViewer';
import { OutdoorRunTracker } from './OutdoorRunTracker';
import { WorkoutSummaryAppleCard } from './WorkoutSummaryAppleCard';
import { formatStopwatchDuration } from '../utils/gpsMath';
import { playPhaseCue } from '../utils/audioCues';

interface RoutinesViewProps {
  routines: WorkoutRoutine[];
  sessions: WorkoutSessionLog[];
  userWeightKg: number;
  autoLaunchOutdoor?: OutdoorActivityType | null;
  onClearAutoLaunch?: () => void;
  onCompleteSession: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra?: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
  onToggleMyRoutine: (routineId: string) => void;
  onOpenKegelGuide: () => void;
  onExportPdf?: () => string | null;
}

export function RoutinesView({
  routines,
  sessions,
  userWeightKg,
  autoLaunchOutdoor,
  onClearAutoLaunch,
  onCompleteSession,
  onToggleMyRoutine,
  onOpenKegelGuide,
  onExportPdf,
}: RoutinesViewProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);
  const [previewExerciseIdx, setPreviewExerciseIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const [runningRoutine, setRunningRoutine] = useState<WorkoutRoutine | null>(null);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [totalElapsedSec, setTotalElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  const [outdoorActivity, setOutdoorActivity] = useState<OutdoorActivityType | null>(null);
  const [appleSummarySession, setAppleSummarySession] =
    useState<WorkoutSessionLog | null>(null);

  useEffect(() => {
    if (autoLaunchOutdoor) {
      setOutdoorActivity(autoLaunchOutdoor);
      onClearAutoLaunch?.();
    }
  }, [autoLaunchOutdoor, onClearAutoLaunch]);

  const visibleRoutines =
    activeTab === 'my' ? routines.filter((r) => r.inMyRoutines) : routines;

  const featured =
    visibleRoutines.find((r) => r.isFeatured) || visibleRoutines[0] || routines[0];
  const secondaryList = visibleRoutines.filter((r) => r.id !== featured?.id);

  const openRoutinePreview = (routine: WorkoutRoutine) => {
    setPreviewExerciseIdx(0);
    setSelectedRoutine(routine);
  };

  const startRoutine = (routine: WorkoutRoutine) => {
    if (routine.id === 'kegel-suelo-pelvico') {
      setSelectedRoutine(null);
      onOpenKegelGuide();
      return;
    }
    const first = routine.exercises[0];
    setSelectedRoutine(null);
    setRunningRoutine(routine);
    setExerciseIdx(0);
    setIsResting(false);
    setSecondsLeft(first ? first.durationSec : 45);
    setTotalElapsedSec(0);
    setIsPaused(false);
    playPhaseCue('exercise', muted);
  };

  useEffect(() => {
    if (!runningRoutine || isPaused) return;
    const timer = window.setInterval(() => {
      setTotalElapsedSec((t) => t + 1);
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        const currentEx = runningRoutine.exercises[exerciseIdx];
        if (!isResting && currentEx && currentEx.restSec > 0) {
          setIsResting(true);
          playPhaseCue('rest', muted);
          return currentEx.restSec;
        }
        if (exerciseIdx + 1 < runningRoutine.exercises.length) {
          const nextIdx = exerciseIdx + 1;
          setExerciseIdx(nextIdx);
          setIsResting(false);
          playPhaseCue('exercise', muted);
          return runningRoutine.exercises[nextIdx].durationSec;
        }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningRoutine, isPaused, exerciseIdx, isResting, muted]);

  const handleFinishSession = () => {
    if (!runningRoutine) return;
    playPhaseCue('complete', muted);
    const recordedSec = Math.max(60, totalElapsedSec);
    onCompleteSession(
      runningRoutine.id,
      runningRoutine.title,
      recordedSec,
      runningRoutine.caloriesEstimate
    );
    setRunningRoutine(null);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const previewExercise =
    selectedRoutine?.exercises[previewExerciseIdx] || selectedRoutine?.exercises[0];
  const activeExercise = runningRoutine?.exercises[exerciseIdx];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-display text-2xl font-bold text-white">Rutinas</h1>
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf()}
              aria-label="Exportar plan en PDF"
              className="min-h-[42px] px-3 rounded-xl bg-[#131A16] border border-white/8 text-xs font-medium text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer hover:border-[#74D834]/40"
            >
              <FileText className="w-4 h-4 text-[#74D834]" />
              <span>PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            aria-label="Historial de sesiones"
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#131A16] border border-white/8 flex items-center justify-center text-[#B8C4BC] hover:text-white cursor-pointer"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Segmented Tabs: Mis Rutinas | Explorar */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-[#131A16] border border-white/7">
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'my'
              ? 'bg-[#74D834] text-[#081007]'
              : 'text-[#9AA89E] hover:text-white'
          }`}
        >
          Mis Rutinas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'explore'
              ? 'bg-[#74D834] text-[#081007]'
              : 'text-[#9AA89E] hover:text-white'
          }`}
        >
          Explorar
        </button>
      </div>

      {/* Apple Fitness-style GPS Run & Walk Launcher */}
      <div className="rounded-3xl bg-gradient-to-br from-[#16221B] via-[#121915] to-[#0D120F] border border-[#9CE819]/25 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#9CE819]/15 border border-[#9CE819]/30 flex items-center justify-center text-[#9CE819] shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Carrera y Caminata GPS
              </h2>
              <p className="text-[11px] text-[#9AA89E] truncate">
                Cronómetro estilo Apple Fitness · Mapa en vivo
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#9CE819]/15 text-[#9CE819] text-[10px] font-semibold shrink-0">
            GPS Móvil
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOutdoorActivity('Carrera al aire libre')}
            className="min-h-[42px] px-3 rounded-2xl bg-[#9CE819] text-[#081007] font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Correr</span>
          </button>
          <button
            type="button"
            onClick={() => setOutdoorActivity('Caminata al aire libre')}
            className="min-h-[42px] px-3 rounded-2xl bg-[#1A241E] border border-white/10 text-white font-display font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#9CE819]/40"
          >
            <Footprints className="w-3.5 h-3.5 text-[#9CE819]" />
            <span>Caminar</span>
          </button>
        </div>
      </div>

      {/* Featured Hero Routine Card */}
      {featured && (
        <div className="rounded-3xl bg-[#131A16] border border-white/8 p-3.5 space-y-3.5">
          <RoutineThumbnailArtwork type={featured.thumbnailType} featured />
          <div className="px-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white">
                {featured.title}
              </h2>
              <button
                type="button"
                onClick={() => openRoutinePreview(featured)}
                className="text-xs text-[#74D834] hover:underline cursor-pointer shrink-0 inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Ver 3D y ejercicios</span>
              </button>
            </div>
            <p className="text-xs text-[#9AA89E]">
              Nivel: {featured.level} <span aria-hidden="true">·</span> {featured.durationMin} min
            </p>
          </div>
          <button
            type="button"
            onClick={() => startRoutine(featured)}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] hover:brightness-105 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Iniciar Entrenamiento</span>
            <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}

      {/* Secondary Routines List */}
      <div className="space-y-2.5">
        {secondaryList.map((routine) => (
          <div
            key={routine.id}
            className="rounded-2xl bg-[#131A16] border border-white/7 p-3 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => openRoutinePreview(routine)}
              className="flex items-center gap-3 flex-1 text-left cursor-pointer min-w-0"
            >
              <RoutineThumbnailArtwork type={routine.thumbnailType} />
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-white truncate">
                  {routine.title}
                </h3>
                <p className="text-xs text-[#9AA89E] mt-0.5 truncate">
                  {routine.durationMin} min <span aria-hidden="true">·</span> Guía 3D
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {activeTab === 'explore' && (
                <button
                  type="button"
                  onClick={() => onToggleMyRoutine(routine.id)}
                  aria-label="Guardar en Mis Rutinas"
                  className={`min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center cursor-pointer ${
                    routine.inMyRoutines
                      ? 'text-[#74D834] bg-[#74D834]/12'
                      : 'text-[#8D9C92]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => startRoutine(routine)}
                aria-label={`Iniciar ${routine.title}`}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-[#1B241E] hover:bg-[#74D834] hover:text-[#081007] text-[#C5D0C8] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Routine Preview Modal with Live 3D Animation for Every Exercise */}
      {selectedRoutine && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end justify-center p-2.5">
          <div className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-4 space-y-3.5 max-h-[90%] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {selectedRoutine.title}
                </h3>
                <p className="text-xs text-[#9AA89E] mt-0.5">
                  Nivel: {selectedRoutine.level} · {selectedRoutine.durationMin} min · Toca un ejercicio para verlo en 3D
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoutine(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {previewExercise && (
              <Exercise3DViewer
                exerciseName={previewExercise.name}
                animKind={inferExerciseAnimKind(
                  previewExercise.id,
                  previewExercise.name,
                  previewExercise.animKind
                )}
                heightClass="h-52"
              />
            )}

            <div className="space-y-2">
              {selectedRoutine.exercises.map((ex, idx) => {
                const active = idx === previewExerciseIdx;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setPreviewExerciseIdx(idx)}
                    className={`w-full text-left p-3 rounded-2xl border space-y-1 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#17261C] border-[#74D834]/60'
                        : 'bg-[#0D120F] border-white/6 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-semibold text-white">
                        {idx + 1}. {ex.name}
                      </span>
                      <span className="text-[11px] text-[#74D834] tabular-nums shrink-0">
                        {ex.sets}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9AA89E] leading-relaxed">
                      {ex.instructions}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => startRoutine(selectedRoutine)}
              className="w-full min-h-[46px] rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Comenzar ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Workout Timer Modal with 3D Exercise Coach */}
      {runningRoutine && activeExercise && (
        <div className="fixed inset-0 z-50 bg-[#070A08]/95 flex items-center justify-center p-3">
          <div className="w-full rounded-3xl bg-[#131A16] border border-white/10 p-4 space-y-3.5 max-h-[92%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#74D834] font-medium">
                  {isResting ? 'Tiempo de descanso' : 'Ejercicio en curso'}
                </p>
                <h3 className="font-display text-base font-bold text-white">
                  {runningRoutine.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Activar avisos de audio' : 'Silenciar avisos de audio'}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer"
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#74D834]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRunningRoutine(null)}
                  aria-label="Cerrar entrenamiento"
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Exercise3DViewer
              exerciseName={activeExercise.name}
              animKind={inferExerciseAnimKind(
                activeExercise.id,
                activeExercise.name,
                activeExercise.animKind
              )}
              isResting={isResting}
              heightClass="h-48"
            />

            <div className="py-3 px-3 rounded-2xl bg-[#0C110E] border border-white/6 flex flex-col items-center text-center">
              <span className="text-[11px] text-[#9AA89E] tabular-nums">
                Ejercicio {exerciseIdx + 1} de {runningRoutine.exercises.length}
              </span>
              <span className="font-mono-nums text-4xl font-bold text-white mt-1">
                {formatTimer(secondsLeft)}
              </span>
              <p className="font-display text-sm font-semibold text-[#74D834] mt-1.5">
                {isResting ? 'Respira profundo y prepárate' : activeExercise.name}
              </p>
              <p className="text-[11px] text-[#9AA89E] mt-1 leading-relaxed">
                {activeExercise.instructions}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9AA89E]">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                Total: {formatTimer(totalElapsedSec)}
              </span>
              <span>{activeExercise.sets}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResting(false);
                  setSecondsLeft(activeExercise.durationSec || 45);
                }}
                className="min-h-[42px] rounded-xl bg-[#1A231D] text-xs font-medium text-[#D2DDD5] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="min-h-[42px] rounded-xl bg-[#74D834] text-xs font-display font-semibold text-[#081007] flex items-center justify-center gap-1 cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Seguir' : 'Pausar'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exerciseIdx + 1 < runningRoutine.exercises.length) {
                    const next = exerciseIdx + 1;
                    setExerciseIdx(next);
                    setIsResting(false);
                    setSecondsLeft(runningRoutine.exercises[next].durationSec);
                  } else {
                    handleFinishSession();
                  }
                }}
                className="min-h-[42px] rounded-xl bg-[#1A231D] text-xs font-medium text-[#D2DDD5] flex items-center justify-center gap-1 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Sig.</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinishSession}
              className="w-full min-h-[44px] rounded-2xl bg-white/8 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#74D834]" />
              <span>Finalizar y guardar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-3">
          <div className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-4 max-h-[82%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Sesiones completadas
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#9AA89E] py-6 text-center">
                Aún no has completado sesiones.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-[#0D120F] border border-white/6 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-xs font-semibold text-white truncate">
                        {s.activityType || s.routineTitle}
                      </p>
                      <p className="text-[11px] text-[#9AA89E] mt-0.5 tabular-nums truncate">
                        {s.isOutdoor && typeof s.distanceMiles === 'number'
                          ? `${s.distanceMiles.toFixed(2)} MI · ${formatStopwatchDuration(
                              s.durationSec
                            )} · ${s.avgPaceText || ''}`
                          : `${s.completedAt} · ${Math.round(s.durationSec / 60)} min`}
                      </p>
                    </div>
                    {s.isOutdoor ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowHistory(false);
                          setAppleSummarySession(s);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#9CE819]/15 text-[#9CE819] text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        Ver mapa
                      </button>
                    ) : (
                      <span className="text-xs font-mono-nums font-semibold text-[#74D834] shrink-0">
                        {s.caloriesBurned} kcal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Apple Fitness GPS Stopwatch */}
      {outdoorActivity && (
        <OutdoorRunTracker
          userWeightKg={userWeightKg}
          initialActivity={outdoorActivity}
          onClose={() => setOutdoorActivity(null)}
          onSaveSession={onCompleteSession}
          onSavedAndView={(saved) => {
            setOutdoorActivity(null);
            setAppleSummarySession(saved);
          }}
        />
      )}

      {/* Saved Apple Fitness Workout Detail Card */}
      {appleSummarySession && (
        <WorkoutSummaryAppleCard
          session={appleSummarySession}
          onClose={() => setAppleSummarySession(null)}
        />
      )}
    </div>
  );
}
