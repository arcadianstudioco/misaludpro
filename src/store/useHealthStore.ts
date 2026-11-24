import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDefaultDailyNotes,
  buildDefaultHistoricalHabits,
  buildDefaultHistoricalMeals,
  createDemoState,
  createFreshUserState,
  getTodayIso,
} from '../data/seedData';
import {
  AllHabitStreaks,
  computeAllHabitStreaks,
} from '../utils/habitStreaks';
import {
  AppState,
  BodyMeasurement,
  DailyHabits,
  FitnessGoal,
  FitnessLevel,
  MealEntry,
  MealSlot,
  ProgressPhoto,
  ReminderSettings,
  UserProfile,
  WorkoutLocation,
  WorkoutSessionLog,
} from '../types/health';
import {
  AuthProvider,
  AuthResponsePayload,
  AuthUser,
  changePasswordOnServer,
  deleteAccountOnServer,
  fetchServerSession,
  loginWithPassword,
  logoutFromServer,
  registerWithPassword,
  saveLoginEmailPreference,
  setInMemoryBearerToken,
  syncStateToServer,
} from '../services/authClient';
import {
  isSupabaseConfigured,
  supabaseGetCurrentUser,
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignOut,
  fetchAppStateFromSupabase,
  syncAppStateToSupabase,
} from '../services/supabaseClient';
import {
  clearAllLocalPersistence,
  getSimulatedOffline,
  getSyncMetadata,
  isAppOnline,
  loadCachedAuthUser,
  loadLocalState,
  saveCachedAuthUser,
  saveLocalState,
  setSimulatedOffline,
  SyncMetadata,
  SyncStatus,
  updateSyncMetadata,
} from '../services/localPersistence';

const DEMO_STORAGE_KEY = 'mi_salud_pro_state_v1';
const LOCAL_FALLBACK_STATE_KEY = 'msp_offline_state_backup';

function hydrateDemoState(parsed: AppState): AppState {
  if (parsed.profile.id === 'user-local-1') {
    const today = getTodayIso();
    let updated = parsed;
    if (Object.keys(parsed.habitsByDate || {}).length <= 1) {
      updated = {
        ...updated,
        habitsByDate: {
          ...buildDefaultHistoricalHabits(),
          ...(parsed.habitsByDate || {}),
        },
      };
    }
    if (!parsed.meals?.some((m) => m.date < today)) {
      updated = {
        ...updated,
        meals: [...buildDefaultHistoricalMeals(), ...(parsed.meals || [])],
      };
    }
    if (!parsed.dailyNotes) {
      updated = {
        ...updated,
        dailyNotes: buildDefaultDailyNotes(),
      };
    }
    return updated;
  }
  return parsed;
}

function loadInitialFastState(): AppState | null {
  try {
    // 1. Try robust offline fallback cache first
    const offlineRaw = localStorage.getItem(LOCAL_FALLBACK_STATE_KEY);
    if (offlineRaw) {
      const parsed = JSON.parse(offlineRaw) as AppState;
      if (parsed && parsed.profile) {
        return hydrateDemoState(parsed);
      }
    }
    // 2. Try demo storage key
    const demoRaw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (demoRaw) {
      const parsed = JSON.parse(demoRaw) as AppState;
      if (parsed && parsed.profile) {
        return hydrateDemoState(parsed);
      }
    }
  } catch {
    // Ignore initial storage access errors
  }
  return null;
}

export function useHealthStore() {
  const [state, setState] = useState<AppState | null>(() => loadInitialFastState());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => isAppOnline());
  const [isSimulatedOfflineState, setIsSimulatedOfflineState] = useState<boolean>(() => getSimulatedOffline());

  const syncTimerRef = useRef<number | null>(null);
  const skipNextSyncRef = useRef<boolean>(false);
  const isBootingRef = useRef<boolean>(true);
  const stateRef = useRef<AppState | null>(state);
  stateRef.current = state;

  // Manual sync trigger
  const manualSync = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;
    if (!currentState || !currentState.isAuthenticated) return true;
    if (!isAppOnline()) {
      setSyncStatus('offline');
      return false;
    }

    setSyncStatus('syncing');
    try {
      const ok = await syncStateToServer(currentState);
      if (ok) {
        const nowIso = new Date().toISOString();
        await updateSyncMetadata({
          status: 'synced',
          pendingChangesCount: 0,
          lastSyncedAt: nowIso,
        });
        setSyncStatus('synced');
        setPendingSyncCount(0);
        setLastSyncedAt(nowIso);
        return true;
      } else {
        await updateSyncMetadata({ status: 'pending' });
        setSyncStatus('pending');
        return false;
      }
    } catch {
      await updateSyncMetadata({ status: 'pending' });
      setSyncStatus('pending');
      return false;
    }
  }, []);

  // Toggle simulated offline mode
  const toggleSimulatedOffline = useCallback(() => {
    const nextVal = !isSimulatedOfflineState;
    setSimulatedOffline(nextVal);
    setIsSimulatedOfflineState(nextVal);
    const online = !nextVal && (typeof navigator !== 'undefined' ? navigator.onLine : true);
    setIsOnline(online);
    setSyncStatus(online ? 'synced' : 'offline');
    if (online) {
      void manualSync();
    }
  }, [isSimulatedOfflineState, manualSync]);

  // Network event listeners & initial hydration from IndexedDB / Server
  useEffect(() => {
    let active = true;

    const handleConnectivity = () => {
      const online = isAppOnline();
      setIsOnline(online);
      setIsSimulatedOfflineState(getSimulatedOffline());
      if (!online) {
        setSyncStatus('offline');
      } else {
        void manualSync();
      }
    };

    const handleSyncStatusChange = (e: Event) => {
      const custom = e as CustomEvent<SyncMetadata>;
      if (custom.detail) {
        setSyncStatus(custom.detail.status);
        setPendingSyncCount(custom.detail.pendingChangesCount);
        setLastSyncedAt(custom.detail.lastSyncedAt);
      }
    };

    window.addEventListener('online', handleConnectivity);
    window.addEventListener('offline', handleConnectivity);
    window.addEventListener('connectivity-change', handleConnectivity);
    window.addEventListener('sync-status-change', handleSyncStatusChange);

    (async () => {
      // 1. Hydrate from robust local persistence (IndexedDB / localStorage)
      const cachedState = await loadLocalState();
      const cachedUser = await loadCachedAuthUser();
      const initialMeta = await getSyncMetadata();

      if (!active) return;

      if (initialMeta) {
        setSyncStatus(initialMeta.status);
        setPendingSyncCount(initialMeta.pendingChangesCount);
        setLastSyncedAt(initialMeta.lastSyncedAt);
      }

      if (cachedState && cachedState.profile) {
        setState(hydrateDemoState(cachedState));
      }
      if (cachedUser) {
        setAuthUser(cachedUser);
      }

      // 2. Check Supabase session first if online
      if (isAppOnline() && isSupabaseConfigured()) {
        try {
          const sbUser = await supabaseGetCurrentUser();
          if (sbUser && active) {
            const authUsr: AuthUser = {
              id: sbUser.id,
              email: sbUser.email || '',
              name: (sbUser.user_metadata?.name as string) || sbUser.email?.split('@')[0] || 'Usuario',
              provider: 'supabase',
              verified: Boolean(sbUser.email_confirmed_at),
            };
            setAuthUser(authUsr);
            await saveCachedAuthUser(authUsr);

            const fetched = await fetchAppStateFromSupabase();
            if (fetched.ok && fetched.state && fetched.state.profile && active) {
              const full: AppState = {
                ...createFreshUserState({
                  name: authUsr.name,
                  email: authUsr.email,
                  age: 30,
                  heightCm: 175,
                  weightKg: 78,
                  targetWeightKg: 73,
                  waistCm: 86,
                  goal: 'Reducir grasa y ganar salud',
                  level: 'Intermedio',
                  location: 'Mixto',
                }),
                ...fetched.state,
                isAuthenticated: true,
              };
              setState(full);
              await saveLocalState(full, false);
            }
          }
        } catch {
          // Keep local state on background Supabase restore failure
        }
      }

      // 3. Check server session in the background without blocking offline viewing
      if (isAppOnline()) {
        try {
          const session = await fetchServerSession();
          if (!active) return;

          if (session.authenticated && session.user) {
            setAuthUser(session.user);
            await saveCachedAuthUser(session.user);
            skipNextSyncRef.current = true;

            if (session.appState && session.appState.profile) {
              // If local state had pending modifications, prioritize them and push to server
              if (initialMeta.pendingChangesCount > 0 && cachedState) {
                void syncStateToServer(cachedState);
              } else {
                setState({ ...session.appState, isAuthenticated: true });
                await saveLocalState({ ...session.appState, isAuthenticated: true }, false);
              }
            } else if (cachedState) {
              void syncStateToServer(cachedState);
            } else {
              const fresh = createFreshUserState({
                name: session.user.name,
                email: session.user.email,
                age: 30,
                heightCm: 175,
                weightKg: 78,
                targetWeightKg: 73,
                waistCm: 86,
                goal: 'Reducir grasa y ganar salud',
                level: 'Intermedio',
                location: 'Mixto',
              });
              setState(fresh);
              await saveLocalState(fresh, false);
              void syncStateToServer(fresh);
            }
          }
        } catch {
          // Keep offline state on server fetch failure
        }
      }

      if (active) {
        setAuthChecking(false);
        isBootingRef.current = false;
      }
    })();

    return () => {
      active = false;
      window.removeEventListener('online', handleConnectivity);
      window.removeEventListener('offline', handleConnectivity);
      window.removeEventListener('connectivity-change', handleConnectivity);
      window.removeEventListener('sync-status-change', handleSyncStatusChange);
    };
  }, [manualSync]);

  // Persist any state mutation to local persistence (IndexedDB + fallback) AND sync to server
  useEffect(() => {
    if (state === null) {
      void clearAllLocalPersistence();
      return;
    }

    // Persist locally immediately on every change so offline viewing is always 100% up-to-date
    const markPending = !isBootingRef.current && !skipNextSyncRef.current && state.isAuthenticated;
    void saveLocalState(state, markPending);

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    if (!state.isAuthenticated) {
      return;
    }

    // Server background sync debounce
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    if (!isAppOnline()) {
      setSyncStatus('offline');
      return;
    }

    syncTimerRef.current = window.setTimeout(async () => {
      setSyncStatus('syncing');
      const ok = await syncStateToServer(state);
      if (ok) {
        const nowIso = new Date().toISOString();
        await updateSyncMetadata({
          status: 'synced',
          pendingChangesCount: 0,
          lastSyncedAt: nowIso,
        });
        setSyncStatus('synced');
        setPendingSyncCount(0);
        setLastSyncedAt(nowIso);
      } else {
        const statusNow: SyncStatus = isAppOnline() ? 'pending' : 'offline';
        await updateSyncMetadata({ status: statusNow });
        setSyncStatus(statusNow);
      }
    }, 450);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [state]);

  const today = getTodayIso();

  const todayHabits: DailyHabits = useMemo(() => {
    if (!state) {
      return {
        date: today,
        workoutDone: false,
        healthyEatingDone: false,
        waterLiters: 0,
        sleepHours: 0,
        kegelDone: false,
      };
    }
    return (
      state.habitsByDate[today] || {
        date: today,
        workoutDone: false,
        healthyEatingDone: false,
        waterLiters: 0,
        sleepHours: 0,
        kegelDone: false,
      }
    );
  }, [state, today]);

  const todayMeals = useMemo(() => {
    if (!state) return [];
    return state.meals.filter((m) => m.date === today);
  }, [state, today]);

  const nutritionTotals = useMemo(() => {
    const completed = todayMeals.filter((m) => m.completed);
    return completed.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
  }, [todayMeals]);

  const dailyGoalPercent = useMemo(() => {
    if (!state || !state.profile) return 0;
    const waterTarget = Math.max(0.5, Number(state.profile.waterTargetLiters) || 3);
    const sleepTarget = Math.max(4, Number(state.profile.sleepTargetHours) || 8);
    const calorieTarget = Math.max(800, Number(state.profile.calorieTargetMin) || 1700);
    const waterLiters = Math.max(0, Number(todayHabits?.waterLiters) || 0);
    const sleepHours = Math.max(0, Number(todayHabits?.sleepHours) || 0);
    const calories = Math.max(0, Number(nutritionTotals?.calories) || 0);

    const waterRatio = Math.min(1, waterLiters / waterTarget);
    const sleepRatio = Math.min(1, sleepHours / sleepTarget);
    const calorieRatio = Math.min(1, calories / calorieTarget);
    const workoutScore = todayHabits?.workoutDone ? 1 : 0;
    const eatingScore = todayHabits?.healthyEatingDone ? 1 : calorieRatio * 0.8;
    const score =
      workoutScore * 0.35 +
      eatingScore * 0.25 +
      waterRatio * 0.2 +
      sleepRatio * 0.2;
    const pct = Math.min(100, Math.round(score * 100));
    return Number.isFinite(pct) ? pct : 0;
  }, [state, todayHabits, nutritionTotals]);

  const habitStreaks: AllHabitStreaks = useMemo(() => {
    const empty = { days: 0, completedToday: false };
    if (!state) {
      return {
        overall: empty,
        workout: empty,
        eating: empty,
        water: empty,
        sleep: empty,
        kegel: empty,
      };
    }
    return computeAllHabitStreaks(state.habitsByDate, state.profile, today);
  }, [state, today]);

  const latestMeasurement = useMemo(() => {
    if (!state || state.measurements.length === 0) return null;
    const sorted = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1];
  }, [state]);

  const firstMeasurement = useMemo(() => {
    if (!state || state.measurements.length === 0) return null;
    const sorted = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0];
  }, [state]);

  const previousMeasurement = useMemo(() => {
    if (!state || state.measurements.length < 2) return null;
    const sorted = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 2];
  }, [state]);

  const startDemoAccount = useCallback(() => {
    setInMemoryBearerToken(null);
    setAuthUser(null);
    setState(createDemoState());
  }, []);

  const createAccount = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      rememberMe: boolean;
      acceptedTerms: boolean;
      age: number;
      heightCm: number;
      weightKg: number;
      targetWeightKg: number;
      waistCm: number;
      goal: FitnessGoal;
      level: FitnessLevel;
      location: WorkoutLocation;
    }): Promise<{ ok: boolean; error?: string }> => {
      // 1. Wipe all existing persistence so no other user's data leaks into this new account
      await clearAllLocalPersistence();

      // 2. Register with Supabase Auth to ensure strict tenant isolation in the cloud
      let supabaseUserId = '';
      if (isSupabaseConfigured()) {
        const sbRes = await supabaseSignUp(input.email, input.password, input.name);
        if (!sbRes.ok) {
          const errLower = (sbRes.error || '').toLowerCase();
          if (errLower.includes('already registered')) {
            return { ok: false, error: 'Este correo ya está registrado. Por favor pulsa en Iniciar sesión.' };
          }
          if (errLower.includes('rate limit')) {
            return {
              ok: false,
              error: 'Límite de envío de correos alcanzado en Supabase (Free Tier: máx 3 por hora). Desactiva "Confirm email" en tu panel de Supabase (Authentication > Providers > Email) para permitir registros instantáneos sin límite.',
            };
          }
          return { ok: false, error: sbRes.error || 'Error al registrar en Supabase' };
        }
        supabaseUserId = sbRes.user?.id || '';
      }

      // 3. Create fresh, clean state for this new user
      const freshState = createFreshUserState({
        name: input.name,
        email: input.email,
        age: input.age,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        targetWeightKg: input.targetWeightKg,
        waistCm: input.waistCm,
        goal: input.goal,
        level: input.level,
        location: input.location,
      });

      if (supabaseUserId) {
        freshState.profile.id = supabaseUserId;
      }

      // 3b. Try to register with backend server (web) — skip gracefully in mobile standalone mode
      let serverUser: AuthUser | null = null;
      const result = await registerWithPassword({
        name: input.name,
        email: input.email,
        password: input.password,
        rememberMe: input.rememberMe,
        acceptedTerms: input.acceptedTerms,
        appState: freshState,
      });
      if (result.ok) {
        serverUser = result.data.user;
      } else if (!result.backendUnavailable) {
        return { ok: false, error: result.error };
      }

      if (!serverUser) {
        saveLoginEmailPreference(input.email, input.rememberMe);
      }

      // 4. Build the auth user (from server if available, else from Supabase)
      const authUsr: AuthUser = serverUser ?? {
        id: supabaseUserId || input.email,
        email: input.email,
        name: input.name,
        provider: 'supabase' as AuthProvider,
        acceptedTermsAt: new Date().toISOString(),
      };

      skipNextSyncRef.current = true;
      setAuthUser(authUsr);
      const finalState: AppState = { ...freshState, isAuthenticated: true };
      setState(finalState);

      // 5. Save state locally and sync directly to this user's isolated row in Supabase
      await saveLocalState(finalState);
      if (isSupabaseConfigured()) {
        void syncAppStateToSupabase(finalState);
      }
      await saveCachedAuthUser(authUsr);

      return { ok: true };
    },
    []
  );

  const signInExisting = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean
    ): Promise<{ ok: boolean; error?: string }> => {
      // 1. Wipe previous local data before loading the logging-in user's data
      await clearAllLocalPersistence();

      // 2. Sign in to Supabase Auth
      if (isSupabaseConfigured()) {
        const sbRes = await supabaseSignIn(email, password);
        if (!sbRes.ok) {
          return { ok: false, error: sbRes.error || 'Error al iniciar sesión en Supabase' };
        }
      }

      // 3. Authenticate with server (web mode) — in mobile standalone mode this may not be available
      const serverLoginResult = await loginWithPassword({ email, password, rememberMe });

      if (!serverLoginResult.ok && !serverLoginResult.backendUnavailable) {
        // Server responded with a real auth error
        return { ok: false, error: serverLoginResult.error };
      }

      // 4. Build auth user (from server if available, else from Supabase session)
      let signedInUser: AuthUser | null = serverLoginResult.ok ? serverLoginResult.data.user : null;
      if (!signedInUser && isSupabaseConfigured()) {
        // Mobile mode: reconstruct AuthUser from Supabase session
        const { supabaseGetCurrentUser } = await import('../services/supabaseClient');
        const sbUser = await supabaseGetCurrentUser();
        if (sbUser) {
          saveLoginEmailPreference(email, rememberMe);
          signedInUser = {
            id: sbUser.id,
            email: sbUser.email || email,
            name: (sbUser.user_metadata?.name as string) || sbUser.email?.split('@')[0] || 'Usuario',
            provider: 'supabase' as AuthProvider,
            acceptedTermsAt: new Date().toISOString(),
          };
        }
      }

      if (!signedInUser) {
        return { ok: false, error: 'No se pudo verificar la sesión. Intenta de nuevo.' };
      }

      skipNextSyncRef.current = true;
      setAuthUser(signedInUser);
      await saveCachedAuthUser(signedInUser);

      // 5. Load the user's isolated state from Supabase (Row Level Security protected)
      let remoteState: Partial<AppState> | null = null;
      if (isSupabaseConfigured()) {
        const fetched = await fetchAppStateFromSupabase();
        if (fetched.ok && fetched.state) {
          remoteState = fetched.state;
        }
      }

      if (remoteState && remoteState.profile) {
        const full: AppState = {
          ...createFreshUserState({
            name: signedInUser.name,
            email: signedInUser.email,
            age: 30,
            heightCm: 175,
            weightKg: 78,
            targetWeightKg: 73,
            waistCm: 86,
            goal: 'Reducir grasa y ganar salud',
            level: 'Intermedio',
            location: 'Mixto',
          }),
          ...remoteState,
          isAuthenticated: true,
        };
        setState(full);
        await saveLocalState(full);
      } else if (serverLoginResult.ok && serverLoginResult.data.appState && serverLoginResult.data.appState.profile) {
        setState({ ...serverLoginResult.data.appState, isAuthenticated: true });
        await saveLocalState(serverLoginResult.data.appState);
      } else {
        const fresh = createFreshUserState({
          name: signedInUser.name,
          email: signedInUser.email,
          age: 30,
          heightCm: 175,
          weightKg: 78,
          targetWeightKg: 73,
          waistCm: 86,
          goal: 'Reducir grasa y ganar salud',
          level: 'Intermedio',
          location: 'Mixto',
        });
        setState(fresh);
        await saveLocalState(fresh);
        void syncStateToServer(fresh);
        if (isSupabaseConfigured()) {
          void syncAppStateToSupabase(fresh);
        }
      }
      return { ok: true };
    },
    []
  );

  const completeOAuthLogin = useCallback(
    (payload: { token: string; user: AuthUser; appState: AppState | null }) => {
      setInMemoryBearerToken(payload.token);
      skipNextSyncRef.current = true;
      setAuthUser(payload.user);
      if (payload.appState && payload.appState.profile) {
        setState({ ...payload.appState, isAuthenticated: true });
      } else {
        const fresh = createFreshUserState({
          name: payload.user.name,
          email: payload.user.email,
          age: 30,
          heightCm: 175,
          weightKg: 78,
          targetWeightKg: 73,
          waistCm: 86,
          goal: 'Reducir grasa y ganar salud',
          level: 'Intermedio',
          location: 'Mixto',
        });
        setState(fresh);
        void syncStateToServer(fresh);
      }
    },
    []
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      return changePasswordOnServer(currentPassword, newPassword);
    },
    []
  );

  const signOut = useCallback(() => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    void supabaseSignOut();
    void logoutFromServer();
    void clearAllLocalPersistence();
    void saveCachedAuthUser(null);
    setAuthUser(null);
    setState(null);
  }, []);

  const updateHabit = useCallback(
    (patch: Partial<DailyHabits>) => {
      setState((prev) => {
        if (!prev) return prev;
        const current = prev.habitsByDate[today] || {
          date: today,
          workoutDone: false,
          healthyEatingDone: false,
          waterLiters: 0,
          sleepHours: 0,
          kegelDone: false,
        };
        return {
          ...prev,
          habitsByDate: {
            ...prev.habitsByDate,
            [today]: { ...current, ...patch, date: today },
          },
        };
      });
    },
    [today]
  );

  const dailyNotes = useMemo(() => state?.dailyNotes ?? {}, [state]);

  const saveDailyNote = useCallback(
    (text: string, dateIso = today) => {
      const cleaned = text.trim();
      setState((prev) => {
        if (!prev) return prev;
        const nextNotes = { ...(prev.dailyNotes || {}) };
        if (cleaned) {
          nextNotes[dateIso] = cleaned;
        } else {
          delete nextNotes[dateIso];
        }
        return {
          ...prev,
          dailyNotes: nextNotes,
        };
      });
    },
    [today]
  );

  const completeWorkoutSession = useCallback(
    (
      routineId: string,
      routineTitle: string,
      durationSec: number,
      caloriesBurned: number,
      extra?: Partial<WorkoutSessionLog>
    ) => {
      const newSession: WorkoutSessionLog = {
        id: `ws-${Date.now()}`,
        routineId,
        routineTitle,
        durationSec,
        caloriesBurned,
        completedAt: today,
        ...extra,
      };
      setState((prev) => {
        if (!prev) return prev;
        const current = prev.habitsByDate[today] || {
          date: today,
          workoutDone: false,
          healthyEatingDone: false,
          waterLiters: 0,
          sleepHours: 0,
          kegelDone: false,
        };
        return {
          ...prev,
          workoutSessions: [newSession, ...prev.workoutSessions],
          habitsByDate: {
            ...prev.habitsByDate,
            [today]: {
              ...current,
              workoutDone: true,
              kegelDone: routineId.includes('kegel') ? true : current.kegelDone,
            },
          },
        };
      });
      return newSession;
    },
    [today]
  );

  const toggleRoutineInMyList = useCallback((routineId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        routines: prev.routines.map((r) =>
          r.id === routineId ? { ...r, inMyRoutines: !r.inMyRoutines } : r
        ),
      };
    });
  }, []);

  const addMeal = useCallback(
    (meal: {
      slot: MealSlot;
      name: string;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }) => {
      setState((prev) => {
        if (!prev) return prev;
        const entry: MealEntry = {
          id: `meal-${Date.now()}`,
          date: today,
          ...meal,
          completed: true,
        };
        return {
          ...prev,
          meals: [...prev.meals, entry],
        };
      });
    },
    [today]
  );

  const toggleMealCompleted = useCallback((mealId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        meals: prev.meals.map((m) =>
          m.id === mealId ? { ...m, completed: !m.completed } : m
        ),
      };
    });
  }, []);

  const deleteMeal = useCallback((mealId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        meals: prev.meals.filter((m) => m.id !== mealId),
      };
    });
  }, []);

  const toggleShoppingItem = useCallback((itemId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shoppingList: prev.shoppingList.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        ),
      };
    });
  }, []);

  const addShoppingItem = useCallback((name: string, quantity: string, category = 'Otros') => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shoppingList: [
          ...prev.shoppingList,
          {
            id: `shop-${Date.now()}`,
            name,
            quantity: quantity || '1 ud',
            category,
            checked: false,
          },
        ],
      };
    });
  }, []);

  const addBodyMeasurement = useCallback(
    (entry: Omit<BodyMeasurement, 'id' | 'date'> & { date?: string }) => {
      setState((prev) => {
        if (!prev) return prev;
        const targetDate = entry.date || today;
        const filtered = prev.measurements.filter((m) => m.date !== targetDate);
        return {
          ...prev,
          measurements: [
            ...filtered,
            {
              id: `m-${Date.now()}`,
              date: targetDate,
              weightKg: entry.weightKg,
              waistCm: entry.waistCm,
              abdomenCm: entry.abdomenCm,
              chestCm: entry.chestCm,
              armsCm: entry.armsCm,
              note: entry.note,
            },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        };
      });
    },
    [today]
  );

  const addProgressPhoto = useCallback(
    (label: string, dataUrl: string) => {
      setState((prev) => {
        if (!prev) return prev;
        const photo: ProgressPhoto = {
          id: `ph-${Date.now()}`,
          date: today,
          label: label || 'Progreso',
          dataUrl,
        };
        return {
          ...prev,
          progressPhotos: [photo, ...prev.progressPhotos],
        };
      });
    },
    [today]
  );

  const deleteProgressPhoto = useCallback((photoId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        progressPhotos: prev.progressPhotos.filter((p) => p.id !== photoId),
      };
    });
  }, []);

  const recordKegelSession = useCallback(
    (cyclesCompleted: number, holdSeconds: number, relaxSeconds: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const current = prev.habitsByDate[today] || {
          date: today,
          workoutDone: false,
          healthyEatingDone: false,
          waterLiters: 0,
          sleepHours: 0,
          kegelDone: false,
        };
        return {
          ...prev,
          kegelSessions: [
            {
              id: `kg-${Date.now()}`,
              date: today,
              cyclesCompleted,
              holdSeconds,
              relaxSeconds,
            },
            ...prev.kegelSessions,
          ],
          habitsByDate: {
            ...prev.habitsByDate,
            [today]: { ...current, kegelDone: true },
          },
        };
      });
    },
    [today]
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: { ...prev.profile, ...patch },
      };
    });
  }, []);

  const updateReminders = useCallback((patch: Partial<ReminderSettings>) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reminders: { ...prev.reminders, ...patch },
      };
    });
  }, []);

  const exportAllDataJson = useCallback(() => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-salud-pro-respaldo-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state, today]);

  const deleteAccountAndData = useCallback(async () => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (authUser && isAppOnline()) {
      await deleteAccountOnServer();
    }
    setAuthUser(null);
    await clearAllLocalPersistence();
    setState(null);
  }, [authUser]);

  return {
    state,
    authUser,
    authChecking,
    syncStatus,
    pendingSyncCount,
    lastSyncedAt,
    isOnline,
    isSimulatedOffline: isSimulatedOfflineState,
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
    previousMeasurement,
    startDemoAccount,
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
  };
}
