import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AppState, UserProfile } from '../types/health';
import { isAppOnline } from './localPersistence';

const SUPABASE_CONFIG_STORAGE_KEY = 'msp_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  // Fallback to Vite env variables or project defaults
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || 'https://piyqybeukazjpqiqxeup.supabase.co';
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I5lTABKXkc2XXoHOHPB_Iw_hGs6rJXL';

  return {
    url: envUrl.trim(),
    anonKey: envKey.trim(),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(
      SUPABASE_CONFIG_STORAGE_KEY,
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
    );
    _cachedClient = null; // Reset cached client on config change
  } catch {
    // Ignore storage errors
  }
}

export function isSupabaseConfigured(): boolean {
  const config = getSavedSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const { url, anonKey } = getSavedSupabaseConfig();
  if (!url || !anonKey) return null;

  try {
    _cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return _cachedClient;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

// ── Authentication Helpers ──────────────────────────────────────────────────
export async function supabaseSignUp(email: string, password: string, name: string): Promise<{ ok: boolean; user?: User | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al registrar con Supabase' };
  }
}

export async function supabaseSignIn(email: string, password: string): Promise<{ ok: boolean; user?: User | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no está configurado.' };

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al iniciar sesión con Supabase' };
  }
}

export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // Ignore
  }
}

export async function supabaseGetCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    if (data.user) return data.user;
    const sessionRes = await client.auth.getSession();
    return sessionRes.data.session?.user || null;
  } catch {
    try {
      const sessionRes = await client.auth.getSession();
      return sessionRes.data.session?.user || null;
    } catch {
      return null;
    }
  }
}

export async function supabaseSignInWithOAuth(
  provider: 'google' | 'apple',
  redirectTo?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no está configurado.' };

  try {
    const redirect = redirectTo || window.location.origin;
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirect,
        skipBrowserRedirect: false,
      },
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, url: data.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al iniciar OAuth con Supabase' };
  }
}

export function supabaseOnAuthStateChange(
  callback: (user: User | null) => void
): { unsubscribe: () => void } {
  const client = getSupabaseClient();
  if (!client) return { unsubscribe: () => {} };

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return {
    unsubscribe: () => {
      data.subscription.unsubscribe();
    },
  };
}

// ── Cloud Sync with Supabase Database ───────────────────────────────────────
export async function syncAppStateToSupabase(state: AppState): Promise<{ ok: boolean; error?: string }> {
  if (!isAppOnline()) return { ok: false, error: 'Sin conexión a internet' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no configurado' };

  try {
    const user = await supabaseGetCurrentUser();
    if (!user) return { ok: false, error: 'Usuario no autenticado en Supabase' };

    // With Row Level Security (RLS), user_id must strictly match auth.uid()
    const { error } = await client.from('user_app_states').upsert(
      {
        user_id: user.id,
        email: user.email,
        profile: state.profile,
        habits_by_date: state.habitsByDate,
        meals: state.meals,
        measurements: state.measurements,
        workout_sessions: state.workoutSessions,
        kegel_sessions: state.kegelSessions,
        daily_notes: state.dailyNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de sincronización con Supabase' };
  }
}

export async function fetchAppStateFromSupabase(): Promise<{ ok: boolean; state?: Partial<AppState> | null; error?: string }> {
  if (!isAppOnline()) return { ok: false, error: 'Sin conexión a internet' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no configurado' };

  try {
    const user = await supabaseGetCurrentUser();
    if (!user) return { ok: false, error: 'No hay usuario autenticado en Supabase' };

    const { data, error } = await client
      .from('user_app_states')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, state: null };

    const state: Partial<AppState> = {
      profile: data.profile as UserProfile,
      habitsByDate: data.habits_by_date,
      meals: data.meals,
      measurements: data.measurements,
      workoutSessions: data.workout_sessions,
      kegelSessions: data.kegel_sessions,
      dailyNotes: data.daily_notes,
    };

    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al obtener datos de Supabase' };
  }
}
