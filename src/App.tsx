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
import { exportHealthPlanPdf, GeneratedPdfResult } from './utils/pdfPlanExport';
import { PdfExportModal } from './components/PdfExportModal';
import {
  AchievementDetailModal,
  AchievementsView,
} from './components/AchievementsView';
import {
  Achievement,
  computeAchievements,
  computeUserLevel,
} from './utils/achievements';
import { syncNativeAlarms, syncNativeWidgets } from './utils/nativeAlarms';
import { estimateStepsFromSessions } from './components/SessionsModal';
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
    deleteWorkoutSession,
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
  const [showAchievementsView, setShowAchievementsView] = useState(false);
  const [celebratingAchievement, setCelebratingAchievement] =
    useState<Achievement | null>(null);
  const [autoLaunchOutdoor, setAutoLaunchOutdoor] =
    useState<OutdoorActivityType | null>(null);
  const [activeReminderToast, setActiveReminderToast] = useState<string | null>(null);
  const [pdfModalResult, setPdfModalResult] = useState<GeneratedPdfResult | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const { theme, setTheme } = useTheme();

  // Handle Flutter back-button / iOS swipe-back — close open sub-views
  useEffect(() => {
    const onFlutterBack = () => {
      if (celebratingAchievement) {
        setCelebratingAchievement(null);
      } else if (showAchievementsView) {
        setShowAchievementsView(false);
      } else if (pdfModalResult) {
        setPdfModalResult(null);
      } else if (showHealthSubView) {
        setShowHealthSubView(false);
      } else if (activeReminderToast) {
        setActiveReminderToast(null);
      }
    };
    window.addEventListener('flutter-back', onFlutterBack);
    return () => window.removeEventListener('flutter-back', onFlutterBack);
  }, [
    celebratingAchievement,
    showAchievementsView,
    pdfModalResult,
    showHealthSubView,
    activeReminderToast,
  ]);

  // Detectar logros recién cumplidos para abrir automáticamente la ventana de premio
  useEffect(() => {
    if (!state) return;
    const all = computeAchievements({
      currentStreak: habitStreaks.currentStreak,
      sessions: state.workoutSessions,
      habitsByDate: state.habitsByDate,
      measurements: state.measurements,
      meals: state.meals,
    });
    const unlockedIds = all.filter((a) => Boolean(a.unlockedAt)).map((a) => a.id);
    const storageKey = 'misaludpro_celebrated_achievements_v1';
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      localStorage.setItem(storageKey, JSON.stringify(unlockedIds));
      return;
    }
    try {
      const seen = new Set<string>(JSON.parse(raw) as string[]);
      const newlyUnlocked = all.find((a) => a.unlockedAt && !seen.has(a.id));
      if (newlyUnlocked) {
        seen.add(newlyUnlocked.id);
        localStorage.setItem(storageKey, JSON.stringify([...seen]));
        setCelebratingAchievement(newlyUnlocked);
      }
    } catch {
      localStorage.setItem(storageKey, JSON.stringify(unlockedIds));
    }
  }, [state, habitStreaks.currentStreak]);

  // Global left-edge swipe-right gesture (iOS-style back swipe everywhere)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX <= 30) {
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      } else {
        tracking = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking || e.changedTouches.length !== 1) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= 65 && dy < 55) {
        window.dispatchEvent(new CustomEvent('flutter-back'));
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Real-time reminder scheduler matching user's configured times
  useEffect(() => {
    if (!state || !state.isAuthenticated) return;

    /** Play a short double-beep using Web Audio API */
    const playReminderSound = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const beep = (startTime: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.6, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
          osc.start(startTime);
          osc.stop(startTime + 0.18);
        };
        beep(ctx.currentTime);
        beep(ctx.currentTime + 0.25);
      } catch {
        // Audio not available
      }
    };

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
          message: '💪 Hora de tu entrenamiento diario en Mi Salud Pro.',
        },
        {
          id: 'meals',
          enabled: r.mealsEnabled,
          time: r.mealsTime,
          message: '🥗 Recuerda registrar tu comida y cumplir tus macros.',
        },
        {
          id: 'kegel',
          enabled: r.kegelEnabled,
          time: r.kegelTime,
          message: '🧘 Momento de tu sesión guiada de suelo pélvico (Kegel).',
        },
        {
          id: 'sleep',
          enabled: r.sleepEnabled,
          time: r.sleepTime,
          message: '🌙 Hora recomendada de descanso para recuperar energía (7–9 h).',
        },
        {
          id: 'wakeup',
          enabled: r.wakeUpEnabled ?? true,
          time: r.wakeUpTime || '06:30',
          message: '⏰ ¡Buenos días! Hora de despertar y registrar tu descanso.',
        },
      ];

      for (const item of checks) {
        const key = `${today}-${item.id}-${item.time}`;
        if (item.enabled && item.time === currentHHMM && !firedRemindersRef.current.has(key)) {
          firedRemindersRef.current.add(key);
          setActiveReminderToast(item.message);
          playReminderSound();
          // Vibrate if supported (Android WebView)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          // Native system notification if permission granted
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification('Mi Salud Pro', {
                body: item.message,
                icon: '/icon-192.png',
              });
            } catch {
              // Ignore restricted notification context
            }
          }
          // Auto-dismiss banner after 12 seconds
          window.setTimeout(() => setActiveReminderToast(null), 12000);
        }
      }
    };

    checkReminders();
    const intervalId = window.setInterval(checkReminders, 10000);
    return () => window.clearInterval(intervalId);
  }, [state, today]);

  // Keep native iOS UNUserNotificationCenter alarms synced with reminders
  useEffect(() => {
    if (!state || !state.isAuthenticated) return;
    syncNativeAlarms(state.reminders);
  }, [state?.isAuthenticated, state?.reminders]);

  // Keep native iOS WidgetKit widgets synced with live health metrics
  useEffect(() => {
    if (!state || !state.isAuthenticated) return;
    const todaySessions = state.workoutSessions.filter((s) => s.completedAt === today);
    const stepsToday = estimateStepsFromSessions(todaySessions);
    const milesToday = Number(
      todaySessions.reduce((acc, s) => acc + (Number(s.distanceMiles) || 0), 0).toFixed(2)
    );
    syncNativeWidgets({
      stepsToday,
      milesToday,
      sessionsToday: todaySessions.length,
      sleepHours: todayHabits.sleepHours,
      wakeTime: state.reminders.wakeUpTime || '06:30',
      wakeEnabled: state.reminders.wakeUpEnabled ?? true,
      waterLiters: todayHabits.waterLiters,
      waterTargetLiters: state.profile.waterTargetLiters,
      caloriesToday: Math.round(nutritionTotals.calories),
      calorieTargetMax: state.profile.calorieTargetMax,
      streakDays: habitStreaks.overall.days,
      goalPercent: dailyGoalPercent,
    });
  }, [state, today, todayHabits, habitStreaks.overall.days, nutritionTotals.calories, dailyGoalPercent]);

  const isAuthenticated = Boolean(state && state.isAuthenticated);
  const currentWeightKg =
    latestMeasurement?.weightKg ?? state?.profile.initialWeightKg ?? 100;

  const handleSelectTab = (tab: TabId) => {
    setShowHealthSubView(false);
    setActiveTab(tab);
  };

  const handleExportPlanPdf = useCallback(() => {
    if (!state) return null;
    const res = exportHealthPlanPdf({
      state,
      today,
      latestMeasurement,
      nutritionTotals,
    });
    setPdfModalResult(res);
    return res.fileName;
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
          reminders={state.reminders}
          onBack={() => setShowHealthSubView(false)}
          onUpdateHabit={updateHabit}
          onUpdateReminders={updateReminders}
          onRecordKegel={recordKegelSession}
        />
      );
    }

    return (
      <>
        {activeReminderToast && (
          <div className="mb-3 rounded-2xl bg-[#16231A] border border-[#74D834]/60 px-3 py-3 flex items-center justify-between gap-2 text-xs text-white shadow-lg shadow-[#74D834]/10">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#74D834] shrink-0 animate-bounce" />
              <span className="truncate font-medium">{activeReminderToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveReminderToast(null)}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[#9AA89E] hover:text-white cursor-pointer shrink-0"
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
          <div key="tab-inicio" className="tab-enter">
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
            onQuickLogWeightWaist={(weightKg: number, waistCm: number) =>
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
            onOpenAchievements={() => setShowAchievementsView(true)}
            onLaunchOutdoorRun={() => {
              setShowHealthSubView(false);
              setActiveTab('rutinas');
              setAutoLaunchOutdoor('Carrera al aire libre');
            }}
            todayDate={today}
            workoutSessions={state.workoutSessions}
            nutritionTotals={nutritionTotals}
            kegelCount={state.kegelSessions.length}
            reminders={state.reminders}
            onAddManualSession={completeWorkoutSession}
            onDeleteSession={deleteWorkoutSession}
          />
          </div>
        )}

        {activeTab === 'rutinas' && (
          <div key="tab-rutinas" className="tab-enter">
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
          </div>
        )}

        {activeTab === 'nutricion' && (
          <div key="tab-nutricion" className="tab-enter">
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
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div key="tab-estadisticas" className="tab-enter">
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
              goal={state.profile.goal}
              targetWeightKg={state.profile.targetWeightKg}
              calorieTargetMin={state.profile.calorieTargetMin}
              calorieTargetMax={state.profile.calorieTargetMax}
              onAddManualSession={completeWorkoutSession}
              onDeleteSession={deleteWorkoutSession}
            />
          </div>
        )}

        {activeTab === 'perfil' && (
          <div key="tab-perfil" className="tab-enter">
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
              currentStreak={habitStreaks.currentStreak}
              sessions={state.workoutSessions}
              habitsByDate={state.habitsByDate}
              measurements={state.measurements}
              meals={state.meals}
              onOpenAchievements={() => setShowAchievementsView(true)}
              achievementsSummary={(() => {
                const list = computeAchievements({
                  currentStreak: habitStreaks.currentStreak,
                  sessions: state.workoutSessions,
                  habitsByDate: state.habitsByDate,
                  measurements: state.measurements,
                  meals: state.meals,
                });
                const lvl = computeUserLevel(list);
                return {
                  level: lvl.level,
                  title: lvl.title,
                  unlockedCount: list.filter((a) => Boolean(a.unlockedAt)).length,
                  totalXp: lvl.totalXp,
                };
              })()}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#060807] text-[#F4F7F4]">
      {/* MOBILE NATIVE-STYLE FULLSCREEN (< lg) */}
      <div className="lg:hidden min-h-screen bg-[#0A0D0B] flex flex-col">
        <main
          className={`flex-1 ${
            isAuthenticated
              ? 'px-4 pt-[calc(var(--safe-top)+0.75rem)] pb-[calc(6.5rem+var(--safe-bottom))]'
              : 'pt-[var(--safe-top)] pb-[max(1rem,var(--safe-bottom))]'
          }`}
        >
          {renderMobileScreenContent()}
        </main>

        {isAuthenticated && (
          <nav
            aria-label="Barra inferior móvil"
            className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,var(--safe-bottom))] pointer-events-none"
          >
            <div className="liquid-glass-nav rounded-[28px] grid grid-cols-5 items-center h-16 px-1.5 pointer-events-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = !showHealthSubView && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`min-h-[48px] rounded-[22px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all apple-press ${
                      isActive ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : ''
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-[#74D834]' : 'text-[#9AA89E]'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold leading-none ${
                        isActive ? 'text-[#74D834]' : 'text-[#9AA89E]'
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
                className="absolute bottom-2.5 inset-x-3 z-30"
              >
                <div className="liquid-glass-nav rounded-[28px] grid grid-cols-5 items-center h-16 px-1.5">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = !showHealthSubView && activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`min-h-[48px] rounded-[22px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all apple-press ${
                          isActive ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : ''
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            isActive ? 'text-[#74D834]' : 'text-[#9AA89E]'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold leading-none whitespace-nowrap ${
                            isActive ? 'text-[#74D834]' : 'text-[#9AA89E]'
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

      {/* Unified Apple Glass PDF Modal with Share & Safe Download */}
      {pdfModalResult && state && (
        <PdfExportModal
          result={pdfModalResult}
          userName={state.profile.name}
          onClose={() => setPdfModalResult(null)}
        />
      )}

      {/* Ventana de Premios y Logros */}
      {showAchievementsView && state && (
        <AchievementsView
          profile={state.profile}
          currentStreak={habitStreaks.currentStreak}
          sessions={state.workoutSessions}
          habitsByDate={state.habitsByDate}
          measurements={state.measurements}
          meals={state.meals}
          onClose={() => setShowAchievementsView(false)}
        />
      )}

      {/* Ventana celebratoria automática al cumplir un logro nuevo */}
      {celebratingAchievement && (
        <AchievementDetailModal
          achievement={celebratingAchievement}
          onClose={() => setCelebratingAchievement(null)}
        />
      )}
    </div>
  );
}
