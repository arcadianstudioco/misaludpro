import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Droplets,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DailyHabits, KegelSessionLog, UserProfile } from '../types/health';
import { AllHabitStreaks } from '../utils/habitStreaks';
import { StreakBadge } from './StreakBadge';
import { playPhaseCue } from '../utils/audioCues';

interface HealthHabitsViewProps {
  profile: UserProfile;
  habits: DailyHabits;
  streaks: AllHabitStreaks;
  kegelSessions: KegelSessionLog[];
  onBack: () => void;
  onUpdateHabit: (patch: Partial<DailyHabits>) => void;
  onRecordKegel: (cycles: number, holdSec: number, relaxSec: number) => void;
}

export function HealthHabitsView({
  profile,
  habits,
  streaks,
  kegelSessions,
  onBack,
  onUpdateHabit,
  onRecordKegel,
}: HealthHabitsViewProps) {
  const holdSeconds = 5;
  const relaxSeconds = 5;
  const targetCycles = 10;

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'contract' | 'relax'>('contract');
  const [secondsLeft, setSecondsLeft] = useState(holdSeconds);
  const [cycle, setCycle] = useState(1);
  const [completedBanner, setCompletedBanner] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (phase === 'contract') {
          setPhase('relax');
          playPhaseCue('relax', muted);
          return relaxSeconds;
        }
        if (cycle >= targetCycles) {
          setIsRunning(false);
          setCompletedBanner(true);
          playPhaseCue('complete', muted);
          onRecordKegel(targetCycles, holdSeconds, relaxSeconds);
          return 0;
        }
        setCycle((c) => c + 1);
        setPhase('contract');
        playPhaseCue('contract', muted);
        return holdSeconds;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, phase, cycle, muted, onRecordKegel]);

  const resetKegel = () => {
    setIsRunning(false);
    setPhase('contract');
    setSecondsLeft(holdSeconds);
    setCycle(1);
    setCompletedBanner(false);
  };

  const waterPct = Math.min(
    100,
    (habits.waterLiters / Math.max(0.5, profile.waterTargetLiters)) * 100
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="min-h-[40px] min-w-[40px] rounded-xl bg-[#131A16] border border-white/8 flex items-center justify-center text-[#B8C4BC] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Salud y Hábitos</h1>
          <p className="text-[11px] text-[#9AA89E]">Hidratación, sueño y suelo pélvico</p>
        </div>
      </div>

      {/* Hydration Card */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4CC9B0]/15 text-[#4CC9B0] flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">Hidratación</h2>
              <p className="text-[11px] text-[#9AA89E] tabular-nums">
                Meta: {profile.waterTargetLiters} L
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={streaks.water} compact />
            <span className="font-mono-nums text-lg font-bold text-white">
              {habits.waterLiters.toFixed(2)} L
            </span>
          </div>
        </div>

        <div className="h-2.5 rounded-full bg-[#1C2620] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#4CC9B0] transition-all duration-300"
            style={{ width: `${waterPct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateHabit({
                waterLiters: Number(Math.max(0, habits.waterLiters - 0.25).toFixed(2)),
              })
            }
            className="min-h-[40px] rounded-xl bg-[#0D120F] border border-white/8 text-[11px] font-medium text-[#C5D0C8] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Minus className="w-3 h-3" />
            <span>250 ml</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateHabit({
                waterLiters: Number(Math.min(6, habits.waterLiters + 0.25).toFixed(2)),
              })
            }
            className="min-h-[40px] rounded-xl bg-[#4CC9B0]/15 border border-[#4CC9B0]/40 text-[11px] font-semibold text-[#4CC9B0] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>250 ml</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateHabit({
                waterLiters: Number(Math.min(6, habits.waterLiters + 0.5).toFixed(2)),
              })
            }
            className="min-h-[40px] rounded-xl bg-[#4CC9B0] text-[11px] font-display font-semibold text-[#061311] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>500 ml</span>
          </button>
        </div>
      </div>

      {/* Sleep Card */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D6A63A]/15 text-[#D6A63A] flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">Sueño</h2>
              <p className="text-[11px] text-[#9AA89E]">Objetivo: 7–9 h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={streaks.sleep} compact />
            <span className="font-mono-nums text-lg font-bold text-white">
              {habits.sleepHours} h
            </span>
          </div>
        </div>

        <input
          type="range"
          min="4"
          max="10"
          step="0.5"
          value={habits.sleepHours || 7}
          onChange={(e) => onUpdateHabit({ sleepHours: Number(e.target.value) })}
          className="w-full accent-[#74D834] cursor-pointer"
        />
      </div>

      {/* Kegel Trainer */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-white">
              Guía de Suelo Pélvico (Kegel)
            </h2>
            <p className="text-[11px] text-[#9AA89E]">
              Contracción y relajación · {targetCycles} ciclos
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Activar sonido guía' : 'Silenciar sonido guía'}
              className="w-7 h-7 rounded-lg bg-[#0D120F] border border-white/10 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#74D834]" />}
            </button>
            <StreakBadge streak={streaks.kegel} compact />
            <span className="text-[11px] font-mono-nums text-[#74D834]">
              {kegelSessions.length} ses.
            </span>
          </div>
        </div>

        <div className="py-5 rounded-2xl bg-[#0D120F] border border-white/6 flex flex-col items-center text-center">
          <div
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500 ${
              phase === 'contract'
                ? 'border-[#74D834] bg-[#74D834]/12 scale-105'
                : 'border-[#4CC9B0] bg-[#4CC9B0]/10 scale-95'
            }`}
          >
            <span className="text-[11px] font-semibold text-[#C5D0C8]">
              {phase === 'contract' ? 'CONTRAER' : 'RELAJAR'}
            </span>
            <span className="font-mono-nums text-3xl font-bold text-white mt-0.5">
              {secondsLeft}s
            </span>
          </div>

          <p className="text-xs font-medium text-[#D2DDD5] mt-3 tabular-nums">
            Ciclo {cycle} de {targetCycles}
          </p>
          <p className="text-[11px] text-[#8E9D93] mt-1 px-4 leading-relaxed">
            {phase === 'contract'
              ? 'Eleva suavemente el suelo pélvico sin aguantar la respiración.'
              : 'Suelta por completo y exhala lento.'}
          </p>
        </div>

        {completedBanner && (
          <div className="p-2.5 rounded-xl bg-[#74D834]/15 border border-[#74D834]/40 text-[11px] text-[#74D834] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>¡Sesión de suelo pélvico completada!</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={resetKegel}
            className="min-h-[42px] rounded-2xl bg-[#1A231D] text-xs font-semibold text-[#D2DDD5] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCompletedBanner(false);
              setIsRunning((r) => !r);
            }}
            className="min-h-[42px] rounded-2xl bg-gradient-to-r from-[#82E63E] to-[#58C222] text-xs font-display font-semibold text-[#081007] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pausar' : 'Iniciar guía'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
