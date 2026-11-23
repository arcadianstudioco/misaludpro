import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Database,
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { SyncStatus } from '../services/localPersistence';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onManualSync: () => Promise<boolean>;
  compact?: boolean;
}

export function SyncStatusIndicator({
  syncStatus,
  pendingSyncCount,
  lastSyncedAt,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onManualSync,
  compact = false,
}: SyncStatusIndicatorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOnline) {
      setSyncFeedback('No hay conexión a internet para sincronizar con la nube.');
      window.setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }
    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      const ok = await onManualSync();
      if (ok) {
        setSyncFeedback('¡Sincronización completada con éxito!');
      } else {
        setSyncFeedback('Los cambios siguen seguros localmente. Se reintentará al conectar.');
      }
    } catch {
      setSyncFeedback('No se pudo contactar al servidor. Los datos siguen guardados localmente.');
    } finally {
      setIsSyncingNow(false);
      window.setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Pendiente de sincronizar';
    try {
      const dt = new Date(iso);
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recientemente';
    }
  };

  return (
    <>
      {/* Clickable Status Pill Badge */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="Ver estado de conexión y persistencia local"
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
          !isOnline
            ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50'
            : syncStatus === 'syncing' || isSyncingNow
            ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
            : syncStatus === 'pending'
            ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50'
            : 'bg-[#131A16] text-[#A6C4AE] border-white/8 hover:text-white hover:border-[#74D834]/40'
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {compact ? 'Offline' : 'Sin conexión'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[10px]">
                {pendingSyncCount}
              </span>
            )}
          </>
        ) : syncStatus === 'syncing' || isSyncingNow ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
            <span>Sincronizando</span>
          </>
        ) : syncStatus === 'pending' ? (
          <>
            <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {compact ? `Pendiente (${pendingSyncCount})` : `Pendiente (${pendingSyncCount})`}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-[#74D834] animate-pulse shrink-0" />
            <span className="text-white/80 group-hover:text-white">
              {compact ? 'Guardado' : 'Sincronizado'}
            </span>
          </>
        )}
      </button>

      {/* Detail & Control Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#111713] border border-white/12 p-5 text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#74D834]" />
                <h3 className="font-display font-bold text-base text-white">
                  Persistencia y Conexión
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 py-4 text-xs">
              {/* Local Persistence Status */}
              <div className="rounded-2xl bg-[#17211B] border border-white/8 p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#74D834]/15 text-[#74D834] flex items-center justify-center shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    Persistencia Local Activa
                    <span className="inline-block w-2 h-2 rounded-full bg-[#74D834]" />
                  </div>
                  <p className="text-[#9AA89E] text-[11px] mt-0.5 leading-relaxed">
                    Tus rutinas, entrenamientos, comidas y progreso están respaldados localmente en{' '}
                    <strong className="text-white font-medium">IndexedDB / Almacenamiento Local</strong>. Puedes
                    cerrar la app, reiniciar o quedarte sin señal: tus datos no se pierden.
                  </p>
                </div>
              </div>

              {/* Network Connectivity */}
              <div className="rounded-2xl bg-[#17211B] border border-white/8 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#9AA89E] flex items-center gap-1.5">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-[#74D834]" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-amber-400" />
                    )}
                    Conexión de red:
                  </span>
                  <span
                    className={`font-semibold ${
                      isOnline ? 'text-[#74D834]' : 'text-amber-400'
                    }`}
                  >
                    {isOnline ? 'En línea' : 'Sin conexión (Offline)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/6">
                  <span className="text-[#9AA89E]">Estado de la nube:</span>
                  <span className="font-semibold text-white">
                    {syncStatus === 'synced' && isOnline
                      ? 'Todo sincronizado'
                      : syncStatus === 'syncing' || isSyncingNow
                      ? 'Sincronizando ahora...'
                      : `${pendingSyncCount} cambio(s) pendiente(s)`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/6">
                  <span className="text-[#9AA89E]">Último guardado en nube:</span>
                  <span className="text-[#D8E2D9] font-mono text-[11px]">
                    {formatLastSync(lastSyncedAt)}
                  </span>
                </div>
              </div>

              {/* Feedback Alert if any */}
              {syncFeedback && (
                <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 text-[11px] text-[#E0E8E2] flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#74D834] shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Action: Manual Sync Button */}
              <button
                type="button"
                onClick={() => void handleSyncClick()}
                disabled={isSyncingNow || !isOnline}
                className="w-full min-h-[42px] rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#74D834] text-black hover:bg-[#62BE2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`}
                />
                {isSyncingNow
                  ? 'Sincronizando...'
                  : isOnline
                  ? 'Sincronizar con la nube ahora'
                  : 'Sincronización deshabilitada (Sin internet)'}
              </button>

              {/* Simulation Mode Toggle (for testing offline behavior) */}
              <div className="pt-2 border-t border-white/8 flex items-center justify-between">
                <div>
                  <span className="text-white font-medium block">Simular modo sin conexión</span>
                  <span className="text-[#9AA89E] text-[10px] block">
                    Prueba el funcionamiento offline sin desconectar tu Wi-Fi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleSimulatedOffline}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isSimulatedOffline ? 'bg-amber-500' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isSimulatedOffline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
