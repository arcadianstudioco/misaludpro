import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  BedDouble,
  BellRing,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DailyHabits, KegelSessionLog, ReminderSettings, UserProfile } from '../types/health';
import { AllHabitStreaks } from '../utils/habitStreaks';
import { StreakBadge } from './StreakBadge';
import { playPhaseCue } from '../utils/audioCues';
import {
  openNativeClockApp,
  requestNativeAlarmPermission,
  syncNativeAlarms,
} from '../utils/nativeAlarms';

interface HealthHabitsViewProps {
  profile: UserProfile;
  habits: DailyHabits;
  streaks: AllHabitStreaks;
  kegelSessions: KegelSessionLog[];
  reminders: ReminderSettings;
  onBack: () => void;
  onUpdateHabit: (patch: Partial<DailyHabits>) => void;
  onUpdateReminders: (patch: Partial<ReminderSettings>) => void;
  onRecordKegel: (cycles: number, holdSec: number, relaxSec: number) => void;
}

export function HealthHabitsView({
  profile,
  habits,
  streaks,
  kegelSessions,
  reminders,
  onBack,
  onUpdateHabit,
  onUpdateReminders,
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
  const [alarmStatusMsg, setAlarmStatusMsg] = useState<string | null>(null);

  const wakeTime = reminders.wakeUpTime || '06:30';
  const wakeEnabled = reminders.wakeUpEnabled ?? true;
  const sleepTime = reminders.sleepTime || '22:30';

  const sleepCycleInfo = useMemo(() => {
    const [sh, sm] = sleepTime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(wh)) {
      return { hours: 8, cycles: 5 };
    }
    let startMin = sh * 60 + (sm || 0);
    let endMin = wh * 60 + (wm || 0);
    if (endMin <= startMin) endMin += 24 * 60;
    const totalHours = (endMin - startMin) / 60;
    const cycles = Math.round(((endMin - startMin) / 90) * 10) / 10;
    return {
      hours: Number(totalHours.toFixed(1)),
      cycles,
    };
  }, [sleepTime, wakeTime]);

  useEffect(() => {
    const onNativeAlarmStatus = (ev: Event) => {
      const detail = (ev as CustomEvent<{ granted?: boolean }>).detail;
      if (detail?.granted) {
        syncNativeAlarms(reminders);
        setAlarmStatusMsg(`Alarma programada en iPhone a las ${wakeTime} (suena aunque la app esté cerrada).`);
      } else {
        setAlarmStatusMsg('Activa las notificaciones en Ajustes > Mi Salud Pro para que suene la alarma.');
      }
    };
    window.addEventListener('flutter-alarm-status', onNativeAlarmStatus);
    return () => window.removeEventListener('flutter-alarm-status', onNativeAlarmStatus);
  }, [reminders, wakeTime]);

  const handleActivateIphoneAlarm = () => {
    const nextReminders: ReminderSettings = {
      ...reminders,
      sleepEnabled: true,
      sleepTime,
      wakeUpEnabled: true,
      wakeUpTime: wakeTime,
    };
    onUpdateReminders({
      sleepEnabled: true,
      sleepTime,
      wakeUpEnabled: true,
      wakeUpTime: wakeTime,
    });
    const sentNative = requestNativeAlarmPermission();
    syncNativeAlarms(nextReminders);
    if (!sentNative) {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        void Notification.requestPermission();
      }
      setAlarmStatusMsg(`Alarma guardada: dormir ${sleepTime} · despertar ${wakeTime}.`);
    }
  };

  const handleToggleSleepTracker = () => {
    if (!habits.bedtimeStartedAt) {
      onUpdateHabit({ bedtimeStartedAt: new Date().toISOString() });
      setAlarmStatusMsg('Modo descanso iniciado. Al despertar toca "¡Desperté!" para calcular tus horas.');
    } else {
      const startMs = new Date(habits.bedtimeStartedAt).getTime();
      const diffHours = Math.max(0.5, Math.min(14, (Date.now() - startMs) / 3600000));
      const rounded = Math.round(diffHours * 2) / 2;
      onUpdateHabit({
        sleepHours: rounded,
        bedtimeStartedAt: undefined,
      });
      setAlarmStatusMsg(`¡Buenos días! Se registraron ${rounded} h de sueño.`);
    }
  };

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
      {/* safe-area spacer so back button never hides under status bar */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="min-h-[44px] min-w-[44px] rounded-xl bg-[#131A16] border border-white/8 flex items-center justify-center text-[#B8C4BC] hover:text-white cursor-pointer"
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

      {/* Sleep & iPhone Alarm Card */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D6A63A]/15 text-[#D6A63A] flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">Sueño y Alarma</h2>
              <p className="text-[11px] text-[#9AA89E]">
                Recuperación física · Meta: 7–9 h
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={streaks.sleep} compact />
            <span className="font-mono-nums text-lg font-bold text-white">
              {habits.sleepHours} h
            </span>
          </div>
        </div>

        {/* Bedtime & Wake-up Alarm Schedule */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-[#0D120F] border border-white/8 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9AA89E] flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Dormir</span>
              </span>
              <input
                type="checkbox"
                checked={reminders.sleepEnabled}
                onChange={(e) => onUpdateReminders({ sleepEnabled: e.target.checked })}
                className="accent-[#74D834] w-4 h-4 cursor-pointer"
                aria-label="Activar aviso para dormir"
              />
            </div>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => onUpdateReminders({ sleepTime: e.target.value })}
              className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
            />
          </div>

          <div className="rounded-2xl bg-[#0D120F] border border-white/8 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9AA89E] flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-[#D6A63A]" />
                <span>Alarma</span>
              </span>
              <input
                type="checkbox"
                checked={wakeEnabled}
                onChange={(e) => onUpdateReminders({ wakeUpEnabled: e.target.checked })}
                className="accent-[#74D834] w-4 h-4 cursor-pointer"
                aria-label="Activar alarma de despertar"
              />
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => onUpdateReminders({ wakeUpTime: e.target.value })}
              className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
            />
          </div>
        </div>

        {/* REM Sleep Cycle Preview */}
        <div className="rounded-xl bg-[#0D120F]/80 border border-white/6 px-3 py-2 flex items-center justify-between text-[11px]">
          <span className="text-[#9AA89E]">Descanso estimado</span>
          <span className="font-mono-nums font-semibold text-[#74D834]">
            {sleepCycleInfo.hours} h · {sleepCycleInfo.cycles} ciclos REM
          </span>
        </div>

        {/* iPhone Alarm Activation & Live Sleep Tracker */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleActivateIphoneAlarm}
            className="min-h-[40px] px-2.5 rounded-xl bg-[#D6A63A]/18 border border-[#D6A63A]/40 text-[11px] font-semibold text-[#F6D377] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 shrink-0" />
            <span>Programar iPhone</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSleepTracker}
            className={`min-h-[40px] px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              habits.bedtimeStartedAt
                ? 'bg-[#74D834] text-[#081007]'
                : 'bg-[#1A231D] border border-white/10 text-white'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5 shrink-0" />
            <span>{habits.bedtimeStartedAt ? '¡Desperté!' : 'Ir a dormir'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => openNativeClockApp()}
          className="w-full min-h-[34px] rounded-xl bg-[#0D120F] border border-white/8 text-[11px] text-[#9AA89E] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Abrir app Reloj / Alarma de iPhone</span>
        </button>

        {alarmStatusMsg && (
          <p className="text-[11px] text-[#74D834] bg-[#74D834]/10 border border-[#74D834]/25 rounded-xl px-3 py-2 leading-relaxed">
            {alarmStatusMsg}
          </p>
        )}

        {/* Manual Hours Slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-[#8E9D93] mb-1">
            <span>Ajuste manual de horas dormidas</span>
            <span className="font-mono-nums text-white font-semibold">{habits.sleepHours} h</span>
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
