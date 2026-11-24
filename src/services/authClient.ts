import { AppState } from '../types/health';
import { isAppOnline } from './localPersistence';
import { syncAppStateToSupabase, isSupabaseConfigured } from './supabaseClient';

export type AuthProvider = 'password' | 'google' | 'apple' | 'supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
  acceptedTermsAt: string;
}

export interface AuthResponsePayload {
  token: string;
  user: AuthUser;
  appState: AppState | null;
}

export interface OAuthUrlResponse {
  configured: boolean;
  provider?: 'google' | 'apple';
  callbackUrl?: string;
  url?: string;
}

const SAVED_EMAIL_KEY = 'mi_salud_pro_saved_email';
const SAVED_REMEMBER_KEY = 'mi_salud_pro_remember_pref';

// Security: Keep bearer token strictly in JavaScript memory (never localStorage/sessionStorage).
// Persistent login across reloads relies on the server-issued HttpOnly; Secure; SameSite=None cookie.
let inMemoryBearerToken: string | null = null;

export function setInMemoryBearerToken(token: string | null): void {
  inMemoryBearerToken = token;
}

export function getInMemoryBearerToken(): string | null {
  return inMemoryBearerToken;
}

export function getSavedLoginPreferences(): { email: string; rememberMe: boolean } {
  try {
    const email = localStorage.getItem(SAVED_EMAIL_KEY) || '';
    const rememberPref = localStorage.getItem(SAVED_REMEMBER_KEY);
    return {
      email,
      rememberMe: rememberPref === null ? true : rememberPref === '1',
    };
  } catch {
    return { email: '', rememberMe: true };
  }
}

export function saveLoginEmailPreference(email: string, rememberMe: boolean): void {
  try {
    localStorage.setItem(SAVED_REMEMBER_KEY, rememberMe ? '1' : '0');
    if (rememberMe && email.trim()) {
      localStorage.setItem(SAVED_EMAIL_KEY, email.trim().toLowerCase());
    } else if (!rememberMe) {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  } catch {
    // Ignore restricted storage contexts
  }
}

export async function storeBrowserPasswordCredential(
  email: string,
  password: string,
  name?: string
): Promise<void> {
  try {
    const nav = navigator as Navigator & {
      credentials?: { store?: (cred: unknown) => Promise<unknown> };
    };
    const Win = window as unknown as {
      PasswordCredential?: new (data: {
        id: string;
        password: string;
        name?: string;
      }) => unknown;
    };
    if (nav.credentials?.store && Win.PasswordCredential) {
      const cred = new Win.PasswordCredential({
        id: email.trim().toLowerCase(),
        password,
        name: name?.trim() || email.trim(),
      });
      await nav.credentials.store(cred);
    }
  } catch {
    // PasswordCredential may be unavailable in non-supporting browsers or nested frames
  }
}

function buildAuthHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'MiSaludPro',
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (inMemoryBearerToken) {
    headers.Authorization = `Bearer ${inMemoryBearerToken}`;
  }
  return headers;
}

async function parseJsonSafe<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return {} as T & { error?: string };
  }
}

export async function fetchServerSession(): Promise<{
  authenticated: boolean;
  token?: string;
  user?: AuthUser;
  appState?: AppState | null;
}> {
  if (!isAppOnline()) {
    return { authenticated: false };
  }
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers: buildAuthHeaders(false),
    });
    if (!res.ok) return { authenticated: false };
    const data = await parseJsonSafe<{
      authenticated: boolean;
      token?: string;
      user?: AuthUser;
      appState?: AppState | null;
    }>(res);
    if (data.authenticated && data.token) {
      setInMemoryBearerToken(data.token);
    }
    return data;
  } catch {
    return { authenticated: false };
  }
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
  acceptedTerms: boolean;
  appState: AppState;
}): Promise<{ ok: true; data: AuthResponsePayload } | { ok: false; error: string; backendUnavailable?: boolean }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(input),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 404 || !contentType.includes('application/json')) {
      return { ok: false, error: 'Servidor local no disponible.', backendUnavailable: true };
    }
    const data = await parseJsonSafe<AuthResponsePayload>(res);
    if (!res.ok || !data.token || !data.user) {
      return { ok: false, error: data.error || 'No se pudo crear la cuenta.' };
    }
    setInMemoryBearerToken(data.token);
    saveLoginEmailPreference(input.email, input.rememberMe);
    if (input.rememberMe) {
      void storeBrowserPasswordCredential(input.email, input.password, input.name);
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Error de conexión con el servidor.', backendUnavailable: true };
  }
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<{ ok: true; data: AuthResponsePayload } | { ok: false; error: string; backendUnavailable?: boolean }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(input),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 404 || !contentType.includes('application/json')) {
      return { ok: false, error: 'Servidor local no disponible.', backendUnavailable: true };
    }
    const data = await parseJsonSafe<AuthResponsePayload>(res);
    if (!res.ok || !data.token || !data.user) {
      return { ok: false, error: data.error || 'Correo o contraseña incorrectos.' };
    }
    setInMemoryBearerToken(data.token);
    saveLoginEmailPreference(input.email, input.rememberMe);
    if (input.rememberMe) {
      void storeBrowserPasswordCredential(input.email, input.password, data.user.name);
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor de acceso.', backendUnavailable: true };
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
    });
  } catch {
    // Ignore network failures on logout
  } finally {
    setInMemoryBearerToken(null);
  }
}

export async function changePasswordOnServer(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await parseJsonSafe<{ ok?: boolean }>(res);
    if (!res.ok) {
      return { ok: false, error: data.error || 'No se pudo cambiar la contraseña.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error de red al cambiar la contraseña.' };
  }
}

export async function syncStateToServer(appState: AppState): Promise<boolean> {
  if (!isAppOnline()) {
    return false;
  }

  // Cloud sync directly to Supabase project
  if (isSupabaseConfigured()) {
    try {
      void syncAppStateToSupabase(appState);
    } catch {
      // Ignore background supabase sync errors
    }
  }

  try {
    const res = await fetch('/api/user/state', {
      method: 'PUT',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ appState }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAccountOnServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      credentials: 'include',
      headers: buildAuthHeaders(false),
    });
    setInMemoryBearerToken(null);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOAuthUrl(
  provider: 'google' | 'apple',
  rememberMe: boolean
): Promise<OAuthUrlResponse> {
  const res = await fetch(
    `/api/auth/oauth/${provider}/url?remember=${rememberMe ? '1' : '0'}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: buildAuthHeaders(false),
    }
  );
  if (!res.ok) {
    throw new Error('No se pudo consultar la configuración OAuth');
  }
  return (await res.json()) as OAuthUrlResponse;
}
