import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  Flame,
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

  // Listen for flutter-back (iOS back swipe)
  useEffect(() => {
    const onBack = () => {
      if (appleSummarySession) setAppleSummarySession(null);
      else if (outdoorActivity) setOutdoorActivity(null);
      else if (runningRoutine) setRunningRoutine(null);
      else if (selectedRoutine) setSelectedRoutine(null);
      else if (showHistory) setShowHistory(false);
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [appleSummarySession, outdoorActivity, runningRoutine, selectedRoutine, showHistory]);

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
    <div className="space-y-4 pb-6 apple-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            Rutinas
          </h1>
          <p className="text-[11px] text-[#8E9D93] font-medium">
            Entrenamientos guiados y fuerza
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf()}
              aria-label="Exportar plan en PDF"
              className="apple-glass-pill min-h-[38px] px-3 rounded-2xl text-xs font-semibold text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer apple-press transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-[#74D834]" />
              <span>PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            aria-label="Historial de sesiones"
            className="apple-glass-pill min-h-[38px] min-w-[38px] rounded-2xl flex items-center justify-center text-[#B8C4BC] hover:text-white cursor-pointer apple-press transition-all relative"
          >
            <History className="w-4 h-4 text-[#74D834]" />
            {sessions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#74D834] text-[#081007] text-[9px] font-bold flex items-center justify-center">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Segmented Pill Tabs: Mis Rutinas | Explorar */}
      <div className="p-1 rounded-2xl bg-black/40 border border-white/8 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer apple-press ${
            activeTab === 'my'
              ? 'bg-[#74D834] text-[#081007] shadow-md shadow-[#74D834]/20'
              : 'text-[#8E9D93] hover:text-white'
          }`}
        >
          Mis Rutinas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer apple-press ${
            activeTab === 'explore'
              ? 'bg-[#74D834] text-[#081007] shadow-md shadow-[#74D834]/20'
              : 'text-[#8E9D93] hover:text-white'
          }`}
        >
          Explorar ({routines.length})
        </button>
      </div>

      {/* Apple Fitness GPS Outdoor Launcher Card */}
      <div className="apple-glass-card rounded-[28px] p-4.5 space-y-3.5 border-l-4 border-l-[#74D834]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834] shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Carrera y Caminata GPS
              </h2>
              <p className="text-[11px] text-[#8E9D93] truncate">
                Velocímetro y mapa satelital en vivo
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#74D834]/15 text-[#74D834] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
            GPS Activo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setOutdoorActivity('Carrera al aire libre')}
            className="min-h-[44px] px-3.5 rounded-2xl bg-[#74D834] text-[#081007] font-display font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#82E63E] apple-press shadow-md shadow-[#74D834]/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar Carrera</span>
          </button>
          <button
            type="button"
            onClick={() => setOutdoorActivity('Caminata al aire libre')}
            className="min-h-[44px] px-3.5 rounded-2xl apple-glass-pill text-white font-display font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/10 apple-press border border-white/10"
          >
            <Footprints className="w-3.5 h-3.5 text-[#74D834]" />
            <span>Caminar</span>
          </button>
        </div>
      </div>

      {/* Featured Apple Hero Routine Card */}
      {featured && (
        <div className="apple-glass-card rounded-[28px] p-4 space-y-3.5">
          <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-black/50">
            <RoutineThumbnailArtwork type={featured.thumbnailType} featured />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-[#74D834] uppercase tracking-wider">
              Destacado
            </div>
          </div>

          <div className="px-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white tracking-tight">
                {featured.title}
              </h2>
              <button
                type="button"
                onClick={() => openRoutinePreview(featured)}
                className="text-xs text-[#74D834] hover:underline cursor-pointer shrink-0 inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Ver 3D</span>
              </button>
            </div>
            <p className="text-xs text-[#8E9D93] font-mono-nums flex items-center gap-1.5">
              <span>{featured.durationMin} min</span>
              <span>·</span>
              <span>Nivel: {featured.level}</span>
              <span>·</span>
              <span className="text-[#FF9F0A] inline-flex items-center gap-0.5">
                <Flame className="w-3 h-3" />
                {featured.caloriesEstimate} kcal
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => startRoutine(featured)}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl font-display font-bold text-sm text-[#081007] bg-[#74D834] hover:bg-[#82E63E] apple-press flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#74D834]/25"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Comenzar Entrenamiento</span>
          </button>
        </div>
      )}

      {/* Secondary Routines List */}
      <div className="space-y-2.5 pt-1">
        <h3 className="font-display text-sm font-bold text-white px-1">
          {activeTab === 'my' ? 'Tus rutinas guardadas' : 'Catálogo de rutinas'}
        </h3>

        {visibleRoutines.length === 0 ? (
          <div className="apple-glass-card rounded-3xl p-8 text-center space-y-2">
            <Dumbbell className="w-8 h-8 text-[#74D834] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-white">Sin rutinas en tu lista</p>
            <p className="text-xs text-[#8E9D93]">
              Toca "Explorar" para descubrir y añadir rutinas personalizadas.
            </p>
          </div>
        ) : (
          secondaryList.map((routine) => (
            <div
              key={routine.id}
              className="apple-glass-card rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-white/15 transition-all group"
            >
              <button
                type="button"
                onClick={() => openRoutinePreview(routine)}
                className="flex items-center gap-3 flex-1 text-left cursor-pointer min-w-0"
              >
                <div className="rounded-xl overflow-hidden shrink-0 group-hover:scale-102 transition-transform">
                  <RoutineThumbnailArtwork type={routine.thumbnailType} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-white truncate">
                    {routine.title}
                  </h3>
                  <p className="text-xs text-[#8E9D93] mt-0.5 truncate font-mono-nums">
                    {routine.durationMin} min · {routine.exercises.length} ejercicios · Guía 3D
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeTab === 'explore' && (
                  <button
                    type="button"
                    onClick={() => onToggleMyRoutine(routine.id)}
                    aria-label="Guardar en Mis Rutinas"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer apple-press transition-colors ${
                      routine.inMyRoutines
                        ? 'text-[#74D834] bg-[#74D834]/15'
                        : 'text-[#8E9D93] hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startRoutine(routine)}
                  aria-label={`Iniciar ${routine.title}`}
                  className="w-9 h-9 rounded-xl bg-[#1B241E] hover:bg-[#74D834] hover:text-[#081007] text-[#C5D0C8] flex items-center justify-center apple-press transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Routine Preview Modal with Live 3D Animation for Every Exercise */}
      {selectedRoutine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
          <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {selectedRoutine.title}
                </h3>
                <p className="text-xs text-[#8E9D93] mt-0.5">
                  Nivel: {selectedRoutine.level} · {selectedRoutine.durationMin} min · Toca un ejercicio para verlo en 3D
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoutine(null)}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {previewExercise && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <Exercise3DViewer
                  exerciseName={previewExercise.name}
                  animKind={inferExerciseAnimKind(
                    previewExercise.id,
                    previewExercise.name,
                    previewExercise.animKind
                  )}
                  heightClass="h-52"
                />
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedRoutine.exercises.map((ex, idx) => {
                const active = idx === previewExerciseIdx;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setPreviewExerciseIdx(idx)}
                    className={`w-full text-left p-3 rounded-2xl border space-y-1 transition-all cursor-pointer apple-press ${
                      active
                        ? 'bg-[#74D834]/15 border-[#74D834]/60'
                        : 'bg-white/3 border-white/6 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-semibold text-white">
                        {idx + 1}. {ex.name}
                      </span>
                      <span className="text-[11px] text-[#74D834] font-mono-nums shrink-0">
                        {ex.sets}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E9D93] leading-relaxed">
                      {ex.instructions}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => startRoutine(selectedRoutine)}
              className="w-full min-h-[48px] rounded-2xl font-display font-bold text-sm text-[#081007] bg-[#74D834] hover:bg-[#82E63E] apple-press cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#74D834]/25"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Comenzar ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Workout Timer Modal with 3D Exercise Coach */}
      {runningRoutine && activeExercise && (
        <div className="fixed inset-0 z-50 bg-[#070A08]/95 backdrop-blur-xl flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#74D834] font-bold uppercase tracking-wider">
                  {isResting ? 'Tiempo de descanso' : 'Ejercicio en curso'}
                </p>
                <h3 className="font-display text-base font-extrabold text-white">
                  {runningRoutine.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer"
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
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
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
            </div>

            <div className="py-3 px-3 rounded-2xl bg-black/40 border border-white/8 flex flex-col items-center text-center">
              <span className="text-[11px] text-[#8E9D93] font-mono-nums">
                Ejercicio {exerciseIdx + 1} de {runningRoutine.exercises.length}
              </span>
              <span className="font-mono-nums text-4xl font-extrabold text-white mt-1">
                {formatTimer(secondsLeft)}
              </span>
              <p className="font-display text-sm font-bold text-[#74D834] mt-1.5">
                {isResting ? 'Respira profundo y prepárate' : activeExercise.name}
              </p>
              <p className="text-[11px] text-[#8E9D93] mt-1 leading-relaxed">
                {activeExercise.instructions}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#8E9D93]">
              <span className="inline-flex items-center gap-1 font-mono-nums">
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
                className="min-h-[44px] rounded-xl apple-glass-pill text-xs font-semibold text-[#D2DDD5] flex items-center justify-center gap-1 cursor-pointer apple-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="min-h-[44px] rounded-xl bg-[#74D834] text-xs font-display font-bold text-[#081007] flex items-center justify-center gap-1 cursor-pointer apple-press shadow-md shadow-[#74D834]/20"
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
                className="min-h-[44px] rounded-xl apple-glass-pill text-xs font-semibold text-[#D2DDD5] flex items-center justify-center gap-1 cursor-pointer apple-press"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Sig.</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinishSession}
              className="w-full min-h-[46px] rounded-2xl bg-white/8 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer apple-press border border-white/10"
            >
              <CheckCircle2 className="w-4 h-4 text-[#74D834]" />
              <span>Finalizar y guardar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Sesiones completadas
                </h3>
                <p className="text-[11px] text-[#8E9D93]">
                  Historial de entrenamientos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#8E9D93] py-6 text-center">
                Aún no has completado sesiones.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl apple-glass-pill flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-xs font-semibold text-white truncate">
                        {s.activityType || s.routineTitle}
                      </p>
                      <p className="text-[11px] text-[#8E9D93] mt-0.5 font-mono-nums truncate">
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
                        className="px-2.5 py-1.5 rounded-xl bg-[#74D834]/15 text-[#74D834] text-[11px] font-semibold shrink-0 cursor-pointer apple-press"
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
