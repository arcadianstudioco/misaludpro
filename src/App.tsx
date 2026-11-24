/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Dumbbell,
  Home,
  User,
  Utensils,
  Wifi,
  WifiOff,
  Battery,
  X,
} from 'lucide-react';
import { useHealthStore } from './store/useHealthStore';
import { OutdoorActivityType, TabId } from './types/health';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HomeDashboard } from './components/HomeDashboard';
import { RoutinesView } from './components/RoutinesView';
import { NutritionView } from './components/NutritionView';
import { StatsView } from './components/StatsView';
import { HealthHabitsView } from './components/HealthHabitsView';
import { ProfileView } from './components/ProfileView';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { exportHealthPlanPdf } from './utils/pdfPlanExport';
import { useTheme } from './hooks/useTheme';

const NAV_ITEMS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'rutinas', label: 'Rutinas', icon: Dumbbell },
  { id: 'nutricion', label: 'Nutrición', icon: Utensils },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { id: 'perfil', label: 'Perfil', icon: User },
];

export default function App() {
  const {
    state,
    authUser,
    authChecking,
    syncStatus,
    pendingSyncCount,
    lastSyncedAt,
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    manualSync,
    today,
    todayHabits,
    habitStreaks,
    todayMeals,
    nutritionTotals,
    dailyGoalPercent,
    latestMeasurement,
    firstMeasurement,
    createAccount,
    signInExisting,
    completeOAuthLogin,
    changePassword,
    signOut,
    updateHabit,
    dailyNotes,
    saveDailyNote,
    completeWorkoutSession,
    toggleRoutineInMyList,
    addMeal,
    toggleMealCompleted,
    deleteMeal,
    toggleShoppingItem,
    addShoppingItem,
    addBodyMeasurement,
    addProgressPhoto,
    deleteProgressPhoto,
    recordKegelSession,
    updateProfile,
    updateReminders,
    exportAllDataJson,
    deleteAccountAndData,
  } = useHealthStore();

  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [showHealthSubView, setShowHealthSubView] = useState(false);
  const [autoLaunchOutdoor, setAutoLaunchOutdoor] =
    useState<OutdoorActivityType | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [activeReminderToast, setActiveReminderToast] = useState<string | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Real-time reminder scheduler matching user's configured times
  useEffect(() => {
    if (!state || !state.isAuthenticated) return;

    const checkReminders = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;
      const r = state.reminders;

      const checks: { id: string; enabled: boolean; time: string; message: string }[] = [
        {
          id: 'workout',
          enabled: r.workoutEnabled,
          time: r.workoutTime,
          message: 'Hora de tu entrenamiento diario en Mi Salud Pro.',
        },
        {
          id: 'meals',
          enabled: r.mealsEnabled,
          time: r.mealsTime,
          message: 'Recuerda registrar tu comida y cumplir tus macros.',
        },
        {
          id: 'kegel',
          enabled: r.kegelEnabled,
          time: r.kegelTime,
          message: 'Momento de tu sesión guiada de suelo pélvico (Kegel).',
        },
        {
          id: 'sleep',
          enabled: r.sleepEnabled,
          time: r.sleepTime,
          message: 'Hora recomendada de descanso para recuperar energía (7–9 h).',
        },
      ];

      for (const item of checks) {
        const key = `${today}-${item.id}-${item.time}`;
        if (item.enabled && item.time === currentHHMM && !firedRemindersRef.current.has(key)) {
          firedRemindersRef.current.add(key);
          setActiveReminderToast(item.message);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification('Mi Salud Pro', { body: item.message });
            } catch {
              // Ignore restricted notification context
            }
          }
        }
      }
    };

    checkReminders();
    const intervalId = window.setInterval(checkReminders, 20000);
    return () => window.clearInterval(intervalId);
  }, [state, today]);

  const isAuthenticated = Boolean(state && state.isAuthenticated);
  const currentWeightKg =
    latestMeasurement?.weightKg ?? state?.profile.initialWeightKg ?? 100;

  const handleSelectTab = (tab: TabId) => {
    setShowHealthSubView(false);
    setActiveTab(tab);
  };

  const handleExportPlanPdf = useCallback(() => {
    if (!state) return null;
    return exportHealthPlanPdf({
      state,
      today,
      latestMeasurement,
      nutritionTotals,
    });
  }, [state, today, latestMeasurement, nutritionTotals]);

  const renderMobileScreenContent = () => {
    if (authChecking && (!state || !state.isAuthenticated)) {
      return (
        <div className="min-h-full flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="w-9 h-9 rounded-full border-2 border-[#74D834]/30 border-t-[#74D834] animate-spin" />
          <p className="text-xs text-[#9AA89E]">Verificando sesión segura...</p>
        </div>
      );
    }

    if (!state || !state.isAuthenticated) {
      return (
        <WelcomeScreen
          onCreateAccount={createAccount}
          onSignIn={signInExisting}
          onCompleteOAuth={completeOAuthLogin}
        />
      );
    }

    if (showHealthSubView) {
      return (
        <HealthHabitsView
          profile={state.profile}
          habits={todayHabits}
          streaks={habitStreaks}
          kegelSessions={state.kegelSessions}
          onBack={() => setShowHealthSubView(false)}
          onUpdateHabit={updateHabit}
          onRecordKegel={recordKegelSession}
        />
      );
    }

    return (
      <>
        {activeReminderToast && (
          <div className="mb-3 rounded-2xl bg-[#16231A] border border-[#74D834]/40 px-3 py-2.5 flex items-center justify-between gap-2 text-xs text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#74D834] shrink-0" />
              <span className="truncate">{activeReminderToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveReminderToast(null)}
              className="text-[#9AA89E] hover:text-white cursor-pointer shrink-0"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab !== 'inicio' && (!isOnline || pendingSyncCount > 0) && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#141B16] border border-white/8 flex items-center justify-between text-[11px] text-[#A6C4AE]">
            <div className="flex items-center gap-1.5 truncate">
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-medium">Modo local sin conexión</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>{pendingSyncCount} cambio(s) pendiente(s)</span>
                </>
              )}
            </div>
            <SyncStatusIndicator
              syncStatus={syncStatus}
              pendingSyncCount={pendingSyncCount}
              lastSyncedAt={lastSyncedAt}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onToggleSimulatedOffline={toggleSimulatedOffline}
              onManualSync={manualSync}
              compact
            />
          </div>
        )}

        {activeTab === 'inicio' && (
          <HomeDashboard
            profile={state.profile}
            habits={todayHabits}
            streaks={habitStreaks}
            goalPercent={dailyGoalPercent}
            latestMeasurement={latestMeasurement}
            firstMeasurement={firstMeasurement}
            syncStatus={syncStatus}
            pendingSyncCount={pendingSyncCount}
            lastSyncedAt={lastSyncedAt}
            isOnline={isOnline}
            isSimulatedOffline={isSimulatedOffline}
            onToggleSimulatedOffline={toggleSimulatedOffline}
            onManualSync={manualSync}
            onUpdateHabit={updateHabit}
            onQuickLogWeightWaist={(weightKg, waistCm) =>
              addBodyMeasurement({
                weightKg,
                waistCm,
                abdomenCm: latestMeasurement?.abdomenCm ?? waistCm + 2,
                chestCm: latestMeasurement?.chestCm ?? 102,
                armsCm: latestMeasurement?.armsCm ?? 36,
              })
            }
            onNavigateTab={handleSelectTab}
            onOpenHealthModule={() => setShowHealthSubView(true)}
            onLaunchOutdoorRun={() => {
              setShowHealthSubView(false);
              setActiveTab('rutinas');
              setAutoLaunchOutdoor('Carrera al aire libre');
            }}
          />
        )}

        {activeTab === 'rutinas' && (
          <RoutinesView
            routines={state.routines}
            sessions={state.workoutSessions}
            userWeightKg={currentWeightKg}
            autoLaunchOutdoor={autoLaunchOutdoor}
            onClearAutoLaunch={() => setAutoLaunchOutdoor(null)}
            onCompleteSession={completeWorkoutSession}
            onToggleMyRoutine={toggleRoutineInMyList}
            onOpenKegelGuide={() => setShowHealthSubView(true)}
            onExportPdf={handleExportPlanPdf}
          />
        )}

        {activeTab === 'nutricion' && (
          <NutritionView
            profile={state.profile}
            todayMeals={todayMeals}
            totals={nutritionTotals}
            shoppingList={state.shoppingList}
            onAddMeal={addMeal}
            onToggleMeal={toggleMealCompleted}
            onDeleteMeal={deleteMeal}
            onToggleShoppingItem={toggleShoppingItem}
            onAddShoppingItem={addShoppingItem}
            onExportPdf={handleExportPlanPdf}
          />
        )}

        {activeTab === 'estadisticas' && (
          <StatsView
            todayDate={today}
            measurements={state.measurements}
            progressPhotos={state.progressPhotos}
            meals={state.meals}
            workoutSessions={state.workoutSessions}
            habitsByDate={state.habitsByDate}
            dailyNotes={dailyNotes}
            heightCm={state.profile.heightCm}
            age={state.profile.age}
            onAddMeasurement={addBodyMeasurement}
            onAddPhoto={addProgressPhoto}
            onDeletePhoto={deleteProgressPhoto}
            onSaveDailyNote={saveDailyNote}
          />
        )}

        {activeTab === 'perfil' && (
          <ProfileView
            profile={state.profile}
            authUser={authUser}
            currentWeightKg={currentWeightKg}
            reminders={state.reminders}
            theme={theme}
            syncStatus={syncStatus}
            pendingSyncCount={pendingSyncCount}
            lastSyncedAt={lastSyncedAt}
            isOnline={isOnline}
            isSimulatedOffline={isSimulatedOffline}
            onToggleSimulatedOffline={toggleSimulatedOffline}
            onManualSync={manualSync}
            onSetTheme={setTheme}
            onUpdateProfile={updateProfile}
            onUpdateReminders={updateReminders}
            onChangePassword={changePassword}
            onExportPlanPdf={handleExportPlanPdf}
            onExportJson={exportAllDataJson}
            onSignOut={signOut}
            onDeleteAccount={() => void deleteAccountAndData()}
          />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#060807] text-[#F4F7F4]">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      {/* MOBILE NATIVE-STYLE FULLSCREEN (< lg) */}
      <div className="lg:hidden min-h-screen bg-[#0A0D0B] flex flex-col">
        <main
          className={`flex-1 ${
            isAuthenticated
              ? 'px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'
              : 'p-0 pb-[env(safe-area-inset-bottom,16px)]'
          }`}
        >
          {renderMobileScreenContent()}
        </main>

        {isAuthenticated && (
          <nav
            aria-label="Barra inferior móvil"
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D130F]/95 backdrop-blur-md border-t border-white/8 pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="grid grid-cols-5 items-center h-16 px-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = !showHealthSubView && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className="min-h-[48px] flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-[#74D834]' : 'text-[#849489]'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium leading-none ${
                        isActive ? 'text-[#74D834]' : 'text-[#849489]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* DESKTOP STANDALONE MOBILE APP FRAME (>= lg) */}
      <div className="hidden lg:flex min-h-screen w-full px-4 py-6 items-center justify-center">
        {/* Interactive Smartphone Frame */}
        <div className="shrink-0 flex flex-col items-center">
          <div
            className="w-[392px] h-[812px] rounded-[48px] bg-[#0A0D0B] border-[8px] border-[#1F2922] shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col"
            style={{ transform: 'translateZ(0)' }}
          >
            {/* Mobile Status Bar 9:41 */}
            <div className="h-10 px-7 pt-2 flex items-center justify-between text-[11px] font-semibold text-white shrink-0 bg-[#0A0D0B] relative z-20">
              <span className="tabular-nums">9:41</span>
              <div className="w-24 h-5 rounded-full bg-black border border-white/10 keep-dark" />
              <div className="flex items-center gap-1.5 text-[#D8E2D9]">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-[#74D834]" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                )}
                <Battery className="w-4 h-4" />
              </div>
            </div>

            {/* Scrollable Mobile Screen Content */}
            <div
              className={`flex-1 overflow-y-auto px-4 pt-2 ${
                isAuthenticated ? 'pb-20' : 'pb-4'
              }`}
            >
              {renderMobileScreenContent()}
            </div>

            {/* Mobile Bottom 5-Tab Navigation Bar pinned inside Phone Frame */}
            {isAuthenticated && (
              <nav
                aria-label="Navegación de la app móvil"
                className="absolute bottom-0 inset-x-0 z-30 bg-[#0D130F]/95 backdrop-blur-md border-t border-white/8"
              >
                <div className="grid grid-cols-5 items-center h-16 px-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = !showHealthSubView && activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className="min-h-[48px] flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            isActive ? 'text-[#74D834]' : 'text-[#849489]'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-medium leading-none whitespace-nowrap ${
                            isActive ? 'text-[#74D834]' : 'text-[#849489]'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
