import React, { useEffect, useState } from 'react';
import { ChevronRight, Map as MapIcon, Share2, Smartphone, Trash2, X } from 'lucide-react';
import { WorkoutSessionLog } from '../types/health';
import { RouteMapView } from './RouteMapView';
import { formatPacePerKm, formatStopwatchDuration } from '../utils/gpsMath';

interface WorkoutSummaryAppleCardProps {
  session: WorkoutSessionLog;
  onClose: () => void;
  onDelete?: () => void;
}

export function WorkoutSummaryAppleCard({
  session,
  onClose,
  onDelete,
}: WorkoutSummaryAppleCardProps) {
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [unit, setUnit] = useState<'MI' | 'KM'>('MI');
  const [sharedToast, setSharedToast] = useState(false);

  // Listen for flutter-back (iOS back swipe / Android back button)
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('flutter-back', handler);
    return () => window.removeEventListener('flutter-back', handler);
  }, [onClose]);

  const miles = session.distanceMiles ?? 0;
  const km = miles * 1.609344;
  const displayDist = unit === 'MI' ? `${miles.toFixed(2)} MI` : `${km.toFixed(2)} KM`;
  const activeCal = session.activeCalories ?? Math.round(session.caloriesBurned * 0.72);
  const totalCal = session.totalCalories ?? session.caloriesBurned;
  const altFeet = session.altitudeFeet ?? 2;
  const altValue = unit === 'MI' ? `${altFeet} PIES` : `${Math.round(altFeet / 3.28084)} M`;
  const paceText =
    unit === 'MI'
      ? session.avgPaceText || `--'--'' /MI`
      : formatPacePerKm(session.durationSec, km);

  const handleShare = async () => {
    const summaryText = `${session.activityType || session.routineTitle} · ${displayDist} · ${formatStopwatchDuration(
      session.durationSec
    )} · ${totalCal} CAL`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mi Salud Pro — Entrenamiento',
          text: summaryText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
      }
      setSharedToast(true);
      window.setTimeout(() => setSharedToast(false), 1800);
    } catch {
      // User dismissed share sheet
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-y-auto keep-dark">
      {/* Top Map Section with Route & Floating Controls */}
      <div className="relative h-[44%] min-h-[260px] w-full shrink-0 bg-[#1B2432]">
        <RouteMapView
          points={session.routePoints || []}
          mapStyle={mapStyle}
          className="w-full h-full"
        />

        {/* Smooth bottom gradient fade into dark summary area */}
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 70%, #000000 100%)',
          }}
        />

        {/* Floating Apple-style circular buttons – safe-area aware */}
        <div
          className="absolute inset-x-4 flex items-center justify-between z-10"
          style={{ top: 'max(12px, env(safe-area-inset-top, 12px))' }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar resumen"
            className="w-10 h-10 rounded-full bg-[#1C2430]/85 border border-white/15 flex items-center justify-center text-white hover:bg-[#273140] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'))}
              aria-label="Cambiar vista del mapa"
              className="w-10 h-10 rounded-full bg-[#1C2430]/85 border border-white/15 flex items-center justify-center text-white hover:bg-[#273140] cursor-pointer"
            >
              <MapIcon className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartir entrenamiento"
              className="w-10 h-10 rounded-full bg-[#1C2430]/85 border border-white/15 flex items-center justify-center text-white hover:bg-[#273140] cursor-pointer"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Eliminar sesión"
                className="w-10 h-10 rounded-full bg-[#1C2430]/85 border border-[#E53935]/40 flex items-center justify-center text-[#FF6B6B] hover:bg-[#E53935] hover:text-white cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {(!session.routePoints || session.routePoints.length < 2) && (
          <div className="absolute left-4 bottom-5 z-10 px-3 py-1 rounded-full bg-black/70 border border-white/15 text-[11px] text-[#C5D0C8]">
            Sesión sin trazo GPS · Registro manual
          </div>
        )}

        {sharedToast && (
          <div className="absolute right-4 px-3 py-1 rounded-full bg-[#9CE819] text-black text-[11px] font-semibold"
            style={{ top: 'calc(max(12px, env(safe-area-inset-top, 12px)) + 52px)' }}>
            Resumen copiado
          </div>
        )}
      </div>

      {/* Bottom Apple Fitness Summary Area */}
      <div className="flex-1 bg-black px-4 pb-6 -mt-3 relative z-10 space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight leading-tight">
              {session.activityType || session.routineTitle}
            </h2>
            <button
              type="button"
              onClick={() => setUnit((u) => (u === 'MI' ? 'KM' : 'MI'))}
              className="px-2.5 py-1 rounded-lg bg-[#1C1C1E] border border-white/10 text-[11px] font-semibold text-[#C5D0C8] cursor-pointer shrink-0"
            >
              {unit === 'MI' ? 'Ver en KM' : 'Ver en MI'}
            </button>
          </div>

          <p className="font-mono-nums text-2xl font-bold text-[#9CE819] tracking-tight">
            {displayDist}
          </p>

          <p className="text-xs text-[#A1A1AA] pt-0.5">
            {session.dateTimeLabel || session.completedAt}
          </p>

          <p className="text-xs text-[#A1A1AA] inline-flex items-center gap-1 pt-0.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{session.deviceLabel || 'Móvil · GPS activo'}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 text-base font-display font-bold text-white pt-1">
          <span>Detalles del entrenamiento</span>
          <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
        </div>

        {/* Dark Apple Fitness Metrics Card */}
        <div className="rounded-2xl bg-[#1C1C1E] border border-white/6 p-4 space-y-4">
          <div>
            <p className="text-xs text-[#D1D1D6]">Duración del entrenamiento</p>
            <p className="font-mono-nums text-2xl font-semibold text-[#FFE620] mt-0.5">
              {formatStopwatchDuration(session.durationSec)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-3">
            <div>
              <p className="text-xs text-[#D1D1D6]">Distancia</p>
              <p className="font-mono-nums text-xl font-semibold text-[#0A95FF] mt-0.5">
                {displayDist}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Calorías activas</p>
              <p className="font-mono-nums text-xl font-semibold text-[#FA114F] mt-0.5">
                {activeCal} CAL
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Calorías en total</p>
              <p className="font-mono-nums text-xl font-semibold text-[#FA114F] mt-0.5">
                {totalCal} CAL
              </p>
            </div>
            <div>
              <p className="text-xs text-[#D1D1D6]">Altitud</p>
              <p className="font-mono-nums text-xl font-semibold text-[#9CE819] mt-0.5">
                {altValue}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-[#D1D1D6]">Ritmo prom.</p>
            <p className="font-mono-nums text-xl font-semibold text-[#5AC8FA] mt-0.5">
              {paceText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] rounded-2xl bg-[#9CE819] text-black font-display font-bold text-sm cursor-pointer"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
