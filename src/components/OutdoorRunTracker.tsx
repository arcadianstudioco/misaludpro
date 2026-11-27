import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LocateFixed,
  Navigation,
  Pause,
  Play,
  Square,
  X,
} from 'lucide-react';
import { GpsRoutePoint, OutdoorActivityType, WorkoutSessionLog } from '../types/health';
import { RouteMapView } from './RouteMapView';
import {
  computeAltitudeGainFeet,
  estimateCalories,
  formatPacePerKm,
  formatPacePerMile,
  formatSpanishDateRange,
  formatStopwatchDuration,
  metersToKm,
  metersToMiles,
  totalRouteDistanceMeters,
} from '../utils/gpsMath';

interface OutdoorRunTrackerProps {
  userWeightKg: number;
  initialActivity?: OutdoorActivityType;
  onClose: () => void;
  onSaveSession: (
    routineId: string,
    routineTitle: string,
    durationSec: number,
    caloriesBurned: number,
    extra: Partial<WorkoutSessionLog>
  ) => WorkoutSessionLog;
  onSavedAndView: (saved: WorkoutSessionLog) => void;
}

export function OutdoorRunTracker({
  userWeightKg,
  initialActivity = 'Carrera al aire libre',
  onClose,
  onSaveSession,
  onSavedAndView,
}: OutdoorRunTrackerProps) {
  const [activity, setActivity] = useState<OutdoorActivityType>(initialActivity);
  const [unit, setUnit] = useState<'MI' | 'KM'>('MI');
  const [status, setStatus] = useState<'ready' | 'running' | 'paused'>('ready');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [routePoints, setRoutePoints] = useState<GpsRoutePoint[]>([]);
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | undefined>(
    undefined
  );
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [gpsState, setGpsState] = useState<'locating' | 'active' | 'denied' | 'unsupported'>(
    'locating'
  );
  const [simulatingMove, setSimulatingMove] = useState(false);

  const startTimestampRef = useRef<number | null>(null);
  const simAngleRef = useRef(0);
  const simAnchorRef = useRef<{ lat: number; lng: number }>({
    lat: 19.4326,
    lng: -99.1332,
  });

  const requestInitialLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsState('unsupported');
      return;
    }
    setGpsState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: GpsRoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitudeM: pos.coords.altitude,
          timestamp: pos.timestamp || Date.now(),
          speedMps: pos.coords.speed,
        };
        setCurrentCoord({ lat: pt.lat, lng: pt.lng });
        simAnchorRef.current = { lat: pt.lat, lng: pt.lng };
        setAccuracyM(Math.round(pos.coords.accuracy));
        setGpsState('active');
        setRoutePoints((prev) => (prev.length === 0 ? [pt] : prev));
      },
      () => {
        setGpsState('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, []);

  useEffect(() => {
    requestInitialLocation();
  }, [requestInitialLocation]);

  // Listen for flutter-back (iOS back swipe / Android back button) → close tracker
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('flutter-back', handler);
    return () => window.removeEventListener('flutter-back', handler);
  }, [onClose]);

  // Real mobile GPS watchPosition while running
  useEffect(() => {
    if (status !== 'running' || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GpsRoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitudeM: pos.coords.altitude,
          timestamp: pos.timestamp || Date.now(),
          speedMps: pos.coords.speed,
        };
        setCurrentCoord({ lat: pt.lat, lng: pt.lng });
        simAnchorRef.current = { lat: pt.lat, lng: pt.lng };
        setAccuracyM(Math.round(pos.coords.accuracy));
        setGpsState('active');
        if (!simulatingMove) {
          setRoutePoints((prev) => [...prev, pt]);
        }
      },
      () => {
        setGpsState((g) => (g === 'active' ? g : 'denied'));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [status, simulatingMove]);

  // Stopwatch timer + optional indoor GPS loop simulator anchored to user's location
  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);

      if (simulatingMove) {
        const stepSpeed = activity === 'Carrera al aire libre' ? 3.1 : 1.55;
        simAngleRef.current += activity === 'Carrera al aire libre' ? 0.14 : 0.08;
        const radiusLat = 0.0011;
        const radiusLng = 0.0013;
        const anchor = simAnchorRef.current;
        const nextLat = anchor.lat + Math.sin(simAngleRef.current) * radiusLat;
        const nextLng =
          anchor.lng + (1 - Math.cos(simAngleRef.current)) * radiusLng;
        const pt: GpsRoutePoint = {
          lat: nextLat,
          lng: nextLng,
          altitudeM: 2 + Math.sin(simAngleRef.current * 2) * 1.4,
          timestamp: Date.now(),
          speedMps: stepSpeed + Math.sin(simAngleRef.current * 3) * 0.45,
        };
        setCurrentCoord({ lat: nextLat, lng: nextLng });
        setRoutePoints((prev) => [...prev, pt]);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, simulatingMove, activity]);

  const distanceMeters = useMemo(
    () => totalRouteDistanceMeters(routePoints),
    [routePoints]
  );
  const distanceMiles = metersToMiles(distanceMeters);
  const distanceKm = metersToKm(distanceMeters);

  const calories = useMemo(
    () => estimateCalories(activity, elapsedSec, distanceMiles, userWeightKg),
    [activity, elapsedSec, distanceMiles, userWeightKg]
  );

  const altitudeFeet = useMemo(
    () => computeAltitudeGainFeet(routePoints),
    [routePoints]
  );

  const paceText =
    unit === 'MI'
      ? formatPacePerMile(elapsedSec, distanceMiles)
      : formatPacePerKm(elapsedSec, distanceKm);

  const handleStart = () => {
    if (!startTimestampRef.current) {
      startTimestampRef.current = Date.now();
    }
    setStatus('running');
  };

  const handleFinishAndSave = () => {
    const endMs = Date.now();
    const startMs = startTimestampRef.current || endMs - elapsedSec * 1000;
    const finalDur = Math.max(15, elapsedSec);
    const finalMiles = Number(distanceMiles.toFixed(2));
    const finalCal = estimateCalories(activity, finalDur, finalMiles, userWeightKg);
    const finalAlt = computeAltitudeGainFeet(routePoints);
    const finalPace = formatPacePerMile(finalDur, finalMiles);

    const saved = onSaveSession(
      activity === 'Carrera al aire libre' ? 'outdoor-run' : 'outdoor-walk',
      activity,
      finalDur,
      finalCal.total,
      {
        isOutdoor: true,
        activityType: activity,
        distanceMiles: finalMiles,
        activeCalories: finalCal.active,
        totalCalories: finalCal.total,
        altitudeFeet: finalAlt,
        avgPaceText: finalPace,
        dateTimeLabel: formatSpanishDateRange(startMs, endMs),
        deviceLabel:
          gpsState === 'active'
            ? 'Móvil · GPS activo'
            : 'Móvil · Registro de ruta',
        routePoints,
      }
    );
    onSavedAndView(saved);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col keep-dark">
      {/* Top Bar – padded for status bar */}
      <div
        className="px-4 pb-2 flex items-center justify-between gap-2 bg-black border-b border-white/8 shrink-0"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar cronómetro"
          className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-xl">
          {(['Carrera al aire libre', 'Caminata al aire libre'] as OutdoorActivityType[]).map(
            (type) => (
              <button
                key={type}
                type="button"
                disabled={status !== 'ready'}
                onClick={() => setActivity(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  activity === type
                    ? 'bg-[#9CE819] text-black'
                    : 'text-[#A1A1AA] disabled:opacity-60'
                }`}
              >
                {type === 'Carrera al aire libre' ? 'Correr' : 'Caminar'}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setUnit((u) => (u === 'MI' ? 'KM' : 'MI'))}
          className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1E] text-xs font-semibold text-[#5AC8FA] cursor-pointer"
        >
          {unit}
        </button>
      </div>

      {/* Live Map with Mobile Geolocation */}
      <div className="relative h-40 w-full shrink-0 bg-[#1B2432]">
        <RouteMapView
          points={routePoints}
          center={currentCoord}
          isLive={true}
          className="w-full h-full"
        />
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 text-[11px]">
          <LocateFixed
            className={`w-3.5 h-3.5 ${
              gpsState === 'active'
                ? 'text-[#4CD964]'
                : gpsState === 'locating'
                  ? 'text-[#FFE620] animate-pulse'
                  : 'text-[#FF453A]'
            }`}
          />
          <span>
            {gpsState === 'active'
              ? `GPS activo${accuracyM ? ` · ±${accuracyM}m` : ''}`
              : gpsState === 'locating'
                ? 'Localizando GPS...'
                : 'GPS sin permiso'}
          </span>
        </div>

        {gpsState !== 'active' && (
          <button
            type="button"
            onClick={requestInitialLocation}
            className="absolute top-2.5 right-3 px-2.5 py-1 rounded-full bg-[#0A95FF] text-white text-[11px] font-semibold cursor-pointer"
          >
            Ubicarme
          </button>
        )}
      </div>

      {/* Live Apple Fitness Stopwatch HUD + botón pegado abajo del cuadro */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-3">
        <div className="rounded-3xl bg-[#1C1C1E] border border-white/8 p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-[#D1D1D6]">Duración del entrenamiento</p>
              <p className="font-mono-nums text-4xl font-bold text-[#FFE620] tracking-tight leading-none mt-1">
                {formatStopwatchDuration(elapsedSec)}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                status === 'running'
                  ? 'bg-[#9CE819]/15 text-[#9CE819]'
                  : status === 'paused'
                    ? 'bg-[#FFE620]/15 text-[#FFE620]'
                    : 'bg-white/10 text-[#D1D1D6]'
              }`}
            >
              {status === 'running'
                ? 'En curso'
                : status === 'paused'
                  ? 'En pausa'
                  : 'Listo'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 pt-1 border-t border-white/8">
            <div>
              <p className="text-xs text-[#D1D1D6]">Distancia</p>
              <p className="font-mono-nums text-xl font-bold text-[#0A95FF]">
                {unit === 'MI' ? `${distanceMiles.toFixed(2)} MI` : `${distanceKm.toFixed(2)} KM`}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Calorías activas</p>
              <p className="font-mono-nums text-xl font-bold text-[#FA114F]">
                {calories.active} CAL
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Calorías en total</p>
              <p className="font-mono-nums text-xl font-bold text-[#FA114F]">
                {calories.total} CAL
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Altitud</p>
              <p className="font-mono-nums text-xl font-bold text-[#9CE819]">
                {unit === 'MI'
                  ? `${altitudeFeet} PIES`
                  : `${Math.round(altitudeFeet / 3.28084)} M`}
              </p>
            </div>
          </div>

          <div className="pt-1 border-t border-white/8 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#D1D1D6]">Ritmo prom.</p>
              <p className="font-mono-nums text-lg font-bold text-[#5AC8FA]">
                {paceText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimulatingMove((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                simulatingMove
                  ? 'bg-[#9CE819]/15 border-[#9CE819] text-[#9CE819]'
                  : 'bg-black/40 border-white/10 text-[#A1A1AA]'
              }`}
            >
              <Navigation className="w-3 h-3" />
              <span>{simulatingMove ? 'Simulando ruta GPS' : 'Probar ruta en interior'}</span>
            </button>
          </div>
        </div>

        {/* Botón acción: pegado justo debajo del cuadro de stats */}
        {status === 'ready' ? (
          <button
            type="button"
            onClick={handleStart}
            className="w-full min-h-[56px] rounded-2xl bg-[#9CE819] text-black font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all shadow-lg shadow-[#9CE819]/30"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Iniciar {activity === 'Carrera al aire libre' ? 'carrera' : 'caminata'}</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus(status === 'running' ? 'paused' : 'running')}
              className={`min-h-[52px] rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all ${
                status === 'running' ? 'bg-[#FFE620] text-black' : 'bg-[#9CE819] text-black'
              }`}
            >
              {status === 'running' ? (
                <><Pause className="w-4.5 h-4.5 fill-current" /><span>Pausar</span></>
              ) : (
                <><Play className="w-4.5 h-4.5 fill-current" /><span>Reanudar</span></>
              )}
            </button>
            <button
              type="button"
              onClick={handleFinishAndSave}
              className="min-h-[52px] rounded-2xl bg-[#FA114F] text-white font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
