import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo, WelcomeHeroArtwork } from './BrandLogo';
import { AppState, FitnessGoal, FitnessLevel, WorkoutLocation } from '../types/health';
import { calculateBmi, calculateMacroTargets } from '../data/seedData';
import {
  AuthUser,
  fetchOAuthUrl,
  getSavedLoginPreferences,
} from '../services/authClient';
import {
  isSupabaseConfigured,
  supabaseSignInWithOAuth,
} from '../services/supabaseClient';
import { LegalDocTab, LegalDocumentsModal } from './LegalDocumentsModal';

interface WelcomeScreenProps {
  onCreateAccount: (input: {
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
  }) => Promise<{ ok: boolean; error?: string }>;
  onSignIn: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onCompleteOAuth: (payload: {
    token: string;
    user: AuthUser;
    appState: AppState | null;
  }) => void;
}

function GoogleLogoSvg() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleLogoSvg() {
  return (
    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}

function isAllowedMessageOrigin(origin: string): boolean {
  if (!origin) return false;
  if (origin === window.location.origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      parsed.hostname.endsWith('.run.app') ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

function getPasswordStrength(password: string): {
  label: string;
  pct: number;
  color: string;
} {
  if (!password) return { label: '', pct: 0, color: '#253028' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

  if (score <= 1) return { label: 'Débil', pct: 25, color: '#E57368' };
  if (score === 2) return { label: 'Media', pct: 55, color: '#FBBF24' };
  if (score === 3) return { label: 'Buena', pct: 80, color: '#74D834' };
  return { label: 'Muy segura', pct: 100, color: '#4CC9B0' };
}

export function WelcomeScreen({
  onCreateAccount,
  onSignIn,
  onCompleteOAuth,
}: WelcomeScreenProps) {
  const savedPrefs = getSavedLoginPreferences();

  const [mode, setMode] = useState<'landing' | 'onboarding' | 'login'>('landing');
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    const onBack = () => {
      if (mode === 'login') {
        setMode('landing');
        setError('');
        setOauthSetupNotice(null);
      } else if (mode === 'onboarding') {
        if (step === 2) setStep(1);
        else setMode('landing');
        setError('');
        setOauthSetupNotice(null);
      }
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [mode, step]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState(savedPrefs.email);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(savedPrefs.rememberMe);

  // Registration form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [rememberRegister, setRememberRegister] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Biometric onboarding step 2
  const [age, setAge] = useState('33');
  const [heightCm, setHeightCm] = useState('182.88');
  const [weightKg, setWeightKg] = useState('100');
  const [targetWeightKg, setTargetWeightKg] = useState('90');
  const [waistCm, setWaistCm] = useState('94');
  const [goal, setGoal] = useState<FitnessGoal>('Reducir grasa y ganar salud');
  const [level, setLevel] = useState<FitnessLevel>('Intermedio');
  const [location, setLocation] = useState<WorkoutLocation>('Mixto');

  // UI & OAuth feedback
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [oauthSetupNotice, setOauthSetupNotice] = useState<{
    provider: 'google' | 'apple';
    callbackUrl: string;
  } | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<LegalDocTab | null>(null);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (!isAllowedMessageOrigin(event.origin)) return;
      const data = event.data as {
        type?: string;
        token?: string;
        user?: AuthUser;
        appState?: AppState | null;
        error?: string;
      } | null;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'OAUTH_AUTH_SUCCESS' && data.token && data.user) {
        setOauthLoading(null);
        setError('');
        onCompleteOAuth({
          token: data.token,
          user: data.user,
          appState: data.appState ?? null,
        });
      } else if (data.type === 'OAUTH_AUTH_ERROR') {
        setOauthLoading(null);
        setError(data.error || 'No se pudo completar el inicio de sesión.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onCompleteOAuth]);

  const numericAge = Math.max(14, Math.min(99, Number(age) || 33));
  const numericHeight = Math.max(120, Math.min(230, Number(heightCm) || 175));
  const numericWeight = Math.max(35, Math.min(260, Number(weightKg) || 80));
  const numericTarget = Math.max(35, Math.min(260, Number(targetWeightKg) || 75));
  const numericWaist = Math.max(45, Math.min(200, Number(waistCm) || 90));

  const previewBmi = calculateBmi(numericWeight, numericHeight);
  const previewMacros = calculateMacroTargets(numericWeight, numericHeight, numericAge, goal);
  const passwordStrength = getPasswordStrength(regPassword);

  const handleStartOAuth = async (provider: 'google' | 'apple', remember: boolean) => {
    setError('');
    setOauthSetupNotice(null);
    setOauthLoading(provider);

    // 1. Primary: Use Supabase OAuth
    if (isSupabaseConfigured()) {
      try {
        const sbRes = await supabaseSignInWithOAuth(provider);
        if (sbRes.ok) {
          // Browser is redirected to provider login
          return;
        }
        if (sbRes.error) {
          const errLower = sbRes.error.toLowerCase();
          if (errLower.includes('not enabled') || errLower.includes('disabled') || errLower.includes('unsupported')) {
            setOauthLoading(null);
            setOauthSetupNotice({
              provider,
              callbackUrl: 'https://piyqybeukazjpqiqxeup.supabase.co/auth/v1/callback',
            });
            return;
          }
          setError(sbRes.error);
          setOauthLoading(null);
          return;
        }
      } catch {
        // Fallback to custom oauth server
      }
    }

    try {
      const res = await fetchOAuthUrl(provider, remember);
      if (!res.configured || !res.url) {
        setOauthLoading(null);
        setOauthSetupNotice({
          provider,
          callbackUrl:
            res.callbackUrl ||
            `${window.location.origin}/auth/callback/${provider}`,
        });
        return;
      }
      const popup = window.open(
        res.url,
        `misaludpro_${provider}_oauth`,
        'width=520,height=680,menubar=no,toolbar=no'
      );
      if (!popup) {
        setOauthLoading(null);
        setError('Permite las ventanas emergentes para iniciar sesión con tu cuenta.');
        return;
      }
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          setOauthLoading(null);
        }
      }, 600);
    } catch {
      setOauthLoading(null);
      setError('No se pudo conectar con el proveedor de autenticación.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Ingresa tu correo electrónico y contraseña.');
      return;
    }
    setError('');
    setOauthSetupNotice(null);
    setSubmitting(true);
    const res = await onSignIn(loginEmail.trim(), loginPassword, rememberLogin);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'No se pudo iniciar sesión.');
    }
  };

  const handleNextOnboardingStep = () => {
    const cleanEmail = email.trim();
    if (!name.trim() || name.trim().length < 2) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (regPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y Condiciones y la Política de Privacidad.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y Condiciones y la Política de Privacidad.');
      return;
    }
    setError('');
    setSubmitting(true);
    const res = await onCreateAccount({
      name: name.trim(),
      email: email.trim(),
      password: regPassword,
      rememberMe: rememberRegister,
      acceptedTerms,
      age: numericAge,
      heightCm: numericHeight,
      weightKg: numericWeight,
      targetWeightKg: numericTarget,
      waistCm: numericWaist,
      goal,
      level,
      location,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'No se pudo crear tu cuenta.');
    }
  };

  const renderOAuthButtons = (remember: boolean) => (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-medium text-[#9AA89E]">Puedes iniciar con</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          disabled={oauthLoading !== null}
          onClick={() => void handleStartOAuth('google', remember)}
          className="w-full min-h-[42px] px-3 rounded-2xl bg-white text-[#1F1F1F] border border-black/10 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#F5F7F5] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 keep-dark shadow-sm"
        >
          {oauthLoading === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
          ) : (
            <GoogleLogoSvg />
          )}
          <span>Google</span>
        </button>

        <span aria-hidden="true" className="w-px h-6 bg-white/15 shrink-0" />

        <button
          type="button"
          disabled={oauthLoading !== null}
          onClick={() => void handleStartOAuth('apple', remember)}
          className="w-full min-h-[42px] px-3 rounded-2xl bg-[#000000] text-white border border-white/15 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#141414] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 keep-dark"
        >
          {oauthLoading === 'apple' ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <AppleLogoSvg />
          )}
          <span>Apple</span>
        </button>
      </div>

      {oauthSetupNotice && (
        <div className="rounded-2xl bg-[#131A16] border border-[#FBBF24]/35 p-3 text-[11px] space-y-1.5 text-left">
          <div className="flex items-start gap-2 text-[#FBBF24] font-semibold">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Configura las credenciales de{' '}
              {oauthSetupNotice.provider === 'google' ? 'Google OAuth' : 'Sign in with Apple'} para
              activar este botón en producción
            </span>
          </div>
          <p className="text-[#9AA89E] leading-relaxed">
            {oauthSetupNotice.provider === 'google'
              ? 'Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno y registra la URL de redirección:'
              : 'Define APPLE_CLIENT_ID (Service ID) en las variables de entorno y registra el Return URL:'}
          </p>
          <p className="font-mono-nums text-[10px] text-[#74D834] break-all bg-[#0D120F] px-2 py-1.5 rounded-lg border border-white/8">
            {oauthSetupNotice.callbackUrl}
          </p>
        </div>
      )}
    </div>
  );

  const renderLegalFooterLinks = () => (
    <div className="pt-0.5 text-center text-[11px] text-[#8E9D93] leading-relaxed">
      <span>Al continuar aceptas nuestros </span>
      <button
        type="button"
        onClick={() => setLegalModalTab('terms')}
        className="text-[#74D834] hover:underline font-medium cursor-pointer"
      >
        Términos y Condiciones
      </button>
      <span>, </span>
      <button
        type="button"
        onClick={() => setLegalModalTab('privacy')}
        className="text-[#74D834] hover:underline font-medium cursor-pointer"
      >
        Política de Privacidad
      </button>
      <span> y </span>
      <button
        type="button"
        onClick={() => setLegalModalTab('health')}
        className="text-[#74D834] hover:underline font-medium cursor-pointer"
      >
        Aviso de Salud
      </button>
      <span>.</span>
    </div>
  );

  return (
    <div className="min-h-full bg-[#0A0D0B] text-[#F4F7F4] flex flex-col relative">

      {mode === 'landing' && (
        <div className="flex-1 flex flex-col justify-between pb-9">
          <WelcomeHeroArtwork />

          <div className="px-6 flex flex-col items-center text-center -mt-8 relative z-10">
            <div className="mb-2.5">
              <BrandLogo size={54} />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              Mi Salud <span className="text-[#74D834]">Pro</span>
            </h1>
            <p className="text-sm text-[#9AA89E] mt-1">
              Mejora. Cuida. Avanza.
            </p>

            <div className="w-full space-y-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setOauthSetupNotice(null);
                }}
                className="w-full min-h-[48px] py-3 px-6 rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#74D834]/15"
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('onboarding');
                  setStep(1);
                  setError('');
                  setOauthSetupNotice(null);
                }}
                className="w-full min-h-[44px] py-2.5 px-6 rounded-2xl font-medium text-sm bg-[#131A16] border border-white/10 text-[#E5ECE6] hover:text-white hover:border-[#74D834]/40 transition-colors cursor-pointer"
              >
                Crear cuenta nueva
              </button>
            </div>

            <div className="w-full border-t border-white/8 mt-5 pt-4">
              {renderLegalFooterLinks()}
            </div>
          </div>
        </div>
      )}

      {mode === 'login' && (
        <form
          onSubmit={(e) => void handleLoginSubmit(e)}
          className="px-5 pb-4 pt-[max(3.5rem,env(safe-area-inset-top))] space-y-4 flex-1 flex flex-col"
        >
          <button
            type="button"
            onClick={() => {
              setMode('landing');
              setError('');
              setOauthSetupNotice(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#9AA89E] hover:text-white min-h-[36px] cursor-pointer self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div>
            <h2 className="font-display text-2xl font-bold text-white">Iniciar sesión</h2>
            <p className="text-xs text-[#9AA89E] mt-1">
              Accede con tu correo electrónico y contraseña o con tu cuenta vinculada.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-[#E57368] bg-[#E57368]/10 border border-[#E57368]/25 rounded-xl px-3.5 py-2.5"
            >
              {error}
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#B8C4BC]" htmlFor="login-email">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7D8C82] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white placeholder-[#66756B] focus:outline-none focus:border-[#74D834]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#B8C4BC]" htmlFor="login-password">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7D8C82] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white placeholder-[#66756B] focus:outline-none focus:border-[#74D834]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8E9D93] hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember / Save Password Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                className="sr-only"
              />
              <span
                className={`w-4.5 h-4.5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  rememberLogin
                    ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                    : 'bg-[#131A16] border-white/20 text-transparent'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="text-xs text-[#C5D0C8] leading-snug">
                Guardar contraseña
                <span className="block text-[10px] text-[#8E9D93]">
                  Recordar mi correo y mantener la sesión iniciada de forma segura
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] py-3 px-6 rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] hover:brightness-105 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'Verificando...' : 'Entrar a Mi Salud Pro'}</span>
          </button>

          {renderOAuthButtons(rememberLogin)}

          <div className="text-center text-xs text-[#9AA89E]">
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('onboarding');
                setStep(1);
                setError('');
                setOauthSetupNotice(null);
              }}
              className="text-[#74D834] font-semibold hover:underline cursor-pointer"
            >
              Crear cuenta
            </button>
          </div>

          <div className="pt-1 pb-4">{renderLegalFooterLinks()}</div>
        </form>
      )}

      {mode === 'onboarding' && (
        <form
          onSubmit={(e) => void handleOnboardingSubmit(e)}
          className="px-5 pb-4 pt-[max(3.5rem,env(safe-area-inset-top))] space-y-3.5 flex-1 flex flex-col"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === 2) setStep(1);
                else setMode('landing');
                setError('');
                setOauthSetupNotice(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#9AA89E] hover:text-white min-h-[36px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 2 ? 'Anterior' : 'Volver'}</span>
            </button>
            <span className="text-xs text-[#9AA89E] tabular-nums">Paso {step} de 2</span>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-white">
              {step === 1 ? 'Crea tu cuenta' : 'Tu plan inicial'}
            </h2>
            <p className="text-xs text-[#9AA89E] mt-0.5">
              {step === 1
                ? 'Regístrate con Google, Apple o correo y contraseña.'
                : 'Personaliza tus medidas, objetivo, nivel y lugar.'}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-[#E57368] bg-[#E57368]/10 border border-[#E57368]/25 rounded-xl px-3 py-2"
            >
              {error}
            </p>
          )}

          {step === 1 ? (
            <div className="space-y-3">

              <div className="space-y-1">
                <label className="text-xs text-[#B8C4BC]" htmlFor="ob-name">
                  Nombre completo
                </label>
                <input
                  id="ob-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white focus:outline-none focus:border-[#74D834]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#B8C4BC]" htmlFor="ob-email">
                  Correo electrónico
                </label>
                <input
                  id="ob-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@correo.com"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white focus:outline-none focus:border-[#74D834]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#B8C4BC]" htmlFor="ob-pass">
                    Contraseña
                  </label>
                  {regPassword && (
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="ob-pass"
                    name="new-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full min-h-[42px] pl-3 pr-10 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white focus:outline-none focus:border-[#74D834]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((s) => !s)}
                    aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8E9D93] hover:text-white cursor-pointer"
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {regPassword && (
                  <div className="h-1 rounded-full bg-[#1C2620] overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${passwordStrength.pct}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#B8C4BC]" htmlFor="ob-pass-confirm">
                  Confirmar contraseña
                </label>
                <input
                  id="ob-pass-confirm"
                  type={showRegPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white focus:outline-none focus:border-[#74D834]"
                />
              </div>

              {/* Save Password Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberRegister}
                  onChange={(e) => setRememberRegister(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    rememberRegister
                      ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                      : 'bg-[#131A16] border-white/20 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span className="text-xs text-[#C5D0C8]">
                  Guardar contraseña y recordar cuenta
                </span>
              </label>

              {/* Mandatory Terms & Privacy Acceptance Checkbox */}
              <div className="flex items-start gap-2.5 pt-0.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={acceptedTerms}
                  onClick={() => setAcceptedTerms((v) => !v)}
                  className={`w-4.5 h-4.5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    acceptedTerms
                      ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                      : 'bg-[#131A16] border-white/25 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
                <p className="text-[11px] text-[#B8C4BC] leading-relaxed">
                  He leído y acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModalTab('terms')}
                    className="text-[#74D834] font-semibold hover:underline cursor-pointer"
                  >
                    Términos y Condiciones
                  </button>
                  , la{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModalTab('privacy')}
                    className="text-[#74D834] font-semibold hover:underline cursor-pointer"
                  >
                    Política de Privacidad
                  </button>{' '}
                  y el{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModalTab('health')}
                    className="text-[#74D834] font-semibold hover:underline cursor-pointer"
                  >
                    Aviso de Salud
                  </button>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextOnboardingStep}
                className="w-full min-h-[46px] mt-1 rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siguiente: Medidas y Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {renderOAuthButtons(rememberRegister)}

              <div className="text-center text-xs text-[#9AA89E] pb-2">
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setOauthSetupNotice(null);
                  }}
                  className="text-[#74D834] font-semibold hover:underline cursor-pointer"
                >
                  Inicia sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#B8C4BC]" htmlFor="ob-age">
                    Edad
                  </label>
                  <input
                    id="ob-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#B8C4BC]" htmlFor="ob-height">
                    Est. (cm)
                  </label>
                  <input
                    id="ob-height"
                    type="number"
                    step="0.01"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#B8C4BC]" htmlFor="ob-weight">
                    Peso (kg)
                  </label>
                  <input
                    id="ob-weight"
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#B8C4BC]" htmlFor="ob-target">
                    Objetivo (kg)
                  </label>
                  <input
                    id="ob-target"
                    type="number"
                    step="0.1"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#B8C4BC]" htmlFor="ob-waist">
                    Cintura (cm)
                  </label>
                  <input
                    id="ob-waist"
                    type="number"
                    step="0.5"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#131A16] border border-white/10 text-sm text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-[#B8C4BC]">Objetivo principal</span>
                <div className="space-y-1.5">
                  {(
                    [
                      'Reducir grasa y ganar salud',
                      'Ganar masa muscular',
                      'Mejorar resistencia y hábitos',
                    ] as FitnessGoal[]
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setGoal(item)}
                      className={`w-full min-h-[40px] px-3.5 rounded-xl text-left text-xs flex items-center justify-between border cursor-pointer ${
                        goal === item
                          ? 'bg-[#74D834]/12 border-[#74D834] text-white'
                          : 'bg-[#131A16] border-white/8 text-[#B8C4BC]'
                      }`}
                    >
                      <span>{item}</span>
                      {goal === item && <Check className="w-4 h-4 text-[#74D834]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#B8C4BC]">Nivel</span>
                  {(['Principiante', 'Intermedio', 'Avanzado'] as FitnessLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`w-full min-h-[34px] px-2.5 rounded-xl text-xs font-medium border cursor-pointer ${
                        level === lvl
                          ? 'bg-[#74D834]/15 border-[#74D834] text-white'
                          : 'bg-[#131A16] border-white/8 text-[#9AA89E]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-[#B8C4BC]">Lugar</span>
                  {(['Casa', 'Gym', 'Mixto'] as WorkoutLocation[]).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={`w-full min-h-[34px] px-2.5 rounded-xl text-xs font-medium border cursor-pointer ${
                        location === loc
                          ? 'bg-[#74D834]/15 border-[#74D834] text-white'
                          : 'bg-[#131A16] border-white/8 text-[#9AA89E]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#131A16] border border-white/8 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA89E]">IMC calculado</span>
                  <span className="font-mono-nums font-semibold text-white">{previewBmi}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA89E]">Calorías objetivo</span>
                  <span className="font-mono-nums font-semibold text-[#74D834]">
                    {previewMacros.calorieTargetMin} – {previewMacros.calorieTargetMax} kcal
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-2xl font-display font-semibold text-sm text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{submitting ? 'Creando cuenta...' : 'Crear cuenta y empezar'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {legalModalTab && (
        <LegalDocumentsModal
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
          onAcceptAll={
            mode === 'onboarding' && step === 1 ? () => setAcceptedTerms(true) : undefined
          }
        />
      )}
    </div>
  );
}
