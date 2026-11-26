import { ReminderSettings } from '../types/health';

export interface NativeAlarmPayload {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

function parseTime(hhmm: string | undefined, fallbackHour: number, fallbackMin: number) {
  if (!hhmm || !hhmm.includes(':')) return { hour: fallbackHour, minute: fallbackMin };
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return { hour: fallbackHour, minute: fallbackMin };
  }
  return {
    hour: Math.max(0, Math.min(23, h)),
    minute: Math.max(0, Math.min(59, m)),
  };
}

export function buildAlarmPayloads(r: ReminderSettings): NativeAlarmPayload[] {
  const workout = parseTime(r.workoutTime, 7, 30);
  const meals = parseTime(r.mealsTime, 13, 0);
  const kegel = parseTime(r.kegelTime, 20, 0);
  const sleep = parseTime(r.sleepTime, 22, 30);
  const wake = parseTime(r.wakeUpTime, 6, 30);

  return [
    {
      id: 'misalud-workout',
      title: 'Mi Salud Pro · Entrenamiento',
      body: '💪 Hora de tu entrenamiento diario.',
      hour: workout.hour,
      minute: workout.minute,
      enabled: Boolean(r.workoutEnabled),
    },
    {
      id: 'misalud-meals',
      title: 'Mi Salud Pro · Nutrición',
      body: '🥗 Recuerda registrar tu comida y cumplir tus macros.',
      hour: meals.hour,
      minute: meals.minute,
      enabled: Boolean(r.mealsEnabled),
    },
    {
      id: 'misalud-kegel',
      title: 'Mi Salud Pro · Suelo Pélvico',
      body: '🧘 Momento de tu sesión guiada de Kegel.',
      hour: kegel.hour,
      minute: kegel.minute,
      enabled: Boolean(r.kegelEnabled),
    },
    {
      id: 'misalud-sleep',
      title: 'Mi Salud Pro · Hora de dormir',
      body: '🌙 Es hora de descansar para lograr 7–9 h de sueño reparador.',
      hour: sleep.hour,
      minute: sleep.minute,
      enabled: Boolean(r.sleepEnabled),
    },
    {
      id: 'misalud-wakeup',
      title: '⏰ Alarma · Mi Salud Pro',
      body: '☀️ ¡Buenos días! Toca para registrar tu sueño y comenzar tu día.',
      hour: wake.hour,
      minute: wake.minute,
      enabled: r.wakeUpEnabled ?? true,
    },
  ];
}

function postToFlutter(payload: Record<string, unknown>): boolean {
  const w = window as unknown as { FlutterChannel?: { postMessage: (msg: string) => void } };
  if (w.FlutterChannel && typeof w.FlutterChannel.postMessage === 'function') {
    w.FlutterChannel.postMessage(JSON.stringify(payload));
    return true;
  }
  return false;
}

export function requestNativeAlarmPermission(): boolean {
  return postToFlutter({ action: 'requestAlarmPermission' });
}

export function syncNativeAlarms(reminders: ReminderSettings): boolean {
  const alarms = buildAlarmPayloads(reminders);
  return postToFlutter({ action: 'syncAlarms', alarms });
}

export function openNativeClockApp(): boolean {
  return postToFlutter({ action: 'openClock' });
}

export interface NativeWidgetSnapshot {
  stepsToday: number;
  milesToday: number;
  sessionsToday: number;
  sleepHours: number;
  wakeTime: string;
  wakeEnabled: boolean;
  waterLiters: number;
  waterTargetLiters: number;
  caloriesToday: number;
  calorieTargetMax: number;
  streakDays: number;
  goalPercent: number;
}

export function syncNativeWidgets(snapshot: NativeWidgetSnapshot): boolean {
  return postToFlutter({ action: 'syncWidgets', widgetData: snapshot });
}
