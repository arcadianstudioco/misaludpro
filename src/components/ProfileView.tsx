import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Flame,
  Gift,
  Globe,
  HardDrive,
  HeartPulse,
  KeyRound,
  Link2,
  LogOut,
  Moon,
  Pencil,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { SyncStatus } from '../services/localPersistence';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import {
  DailyHabits,
  FitnessGoal,
  FitnessLevel,
  MealEntry,
  ReminderSettings,
  UserProfile,
  WorkoutLocation,
  WorkoutSessionLog,
} from '../types/health';
import { UserAvatarImage } from './BrandLogo';
import { calculateBmi, calculateMacroTargets } from '../data/seedData';
import { ThemeMode } from '../hooks/useTheme';
import { AuthUser } from '../services/authClient';
import { LegalDocTab, LegalDocumentsModal } from './LegalDocumentsModal';
import {
  Achievement,
  computeAchievements,
  computeUserLevel,
  formatAchievementDate,
} from '../utils/achievements';
import { AchievementDetailModal } from './AchievementsView';

interface ProfileViewProps {
  profile: UserProfile;
  authUser: AuthUser | null;
  currentWeightKg: number;
  reminders: ReminderSettings;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUpdateReminders: (patch: Partial<ReminderSettings>) => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  syncStatus?: SyncStatus;
  pendingSyncCount?: number;
  lastSyncedAt?: string | null;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onToggleSimulatedOffline?: () => void;
  onManualSync?: () => Promise<boolean>;
  onExportPlanPdf: () => string | null;
  onExportJson: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  currentStreak?: number;
  sessions?: WorkoutSessionLog[];
  habitsByDate?: Record<string, DailyHabits>;
  measurements?: { date: string }[];
  meals?: MealEntry[];
  onOpenAchievements?: () => void;
  achievementsSummary?: {
    level: number;
    title: string;
    unlockedCount: number;
    totalXp: number;
  };
}

export function ProfileView({
  profile,
  authUser,
  currentWeightKg,
  reminders,
  theme,
  syncStatus,
  pendingSyncCount = 0,
  lastSyncedAt = null,
  isOnline = true,
  isSimulatedOffline = false,
  onToggleSimulatedOffline,
  onManualSync,
  onSetTheme,
  onUpdateProfile,
  onUpdateReminders,
  onChangePassword,
  onExportPlanPdf,
  onExportJson,
  onSignOut,
  onDeleteAccount,
  currentStreak = 0,
  sessions = [],
  habitsByDate = {},
  measurements = [],
  meals = [],
}: ProfileViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAllMedals, setShowAllMedals] = useState(false);
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocTab | null>(null);
  const [notifFeedback, setNotifFeedback] = useState('');
  const [pdfFeedback, setPdfFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const achievements = useMemo(
    () =>
      computeAchievements({
        currentStreak,
        sessions,
        habitsByDate,
        measurements,
        meals,
      }),
    [currentStreak, sessions, habitsByDate, measurements, meals]
  );

  const userLevel = useMemo(() => computeUserLevel(achievements), [achievements]);

  const unlockedList = useMemo(
    () => achievements.filter((a) => Boolean(a.unlockedAt)),
    [achievements]
  );
  const lockedList = useMemo(
    () => achievements.filter((a) => !a.unlockedAt),
    [achievements]
  );
  const orderedMedals = useMemo(
    () => [...unlockedList, ...lockedList],
    [unlockedList, lockedList]
  );
  const visibleMedals = showAllMedals ? orderedMedals : orderedMedals.slice(0, 4);
  const levelPct =
    userLevel.xpToNext > 0
      ? Math.min(100, Math.round((userLevel.currentXp / userLevel.xpToNext) * 100))
      : 100;

  useEffect(() => {
    const onBack = () => {
      if (selectedAchievement) setSelectedAchievement(null);
      else if (cropSrc) setCropSrc(null);
      else if (legalTab) setLegalTab(null);
      else if (showPasswordModal) setShowPasswordModal(false);
      else if (showEditModal) setShowEditModal(false);
      else if (showDeleteConfirm) setShowDeleteConfirm(false);
      else if (showSettings) setShowSettings(false);
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [selectedAchievement, cropSrc, legalTab, showPasswordModal, showEditModal, showDeleteConfirm, showSettings]);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropImgSize, setCropImgSize] = useState<{ w: number; h: number } | null>(null);
  const cropDragRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setCropImgSize(null);
        setCropSrc(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAvatarCrop = () => {
    if (!cropSrc || !cropImgSize) return;
    const img = new Image();
    img.onload = () => {
      const outSize = 320;
      const boxSize = 240;
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const baseScale = Math.max(boxSize / cropImgSize.w, boxSize / cropImgSize.h);
      const totalScale = baseScale * cropZoom;
      const drawW = cropImgSize.w * totalScale;
      const drawH = cropImgSize.h * totalScale;
      const ratio = outSize / boxSize;

      const dx = (boxSize / 2 + cropOffset.x - drawW / 2) * ratio;
      const dy = (boxSize / 2 + cropOffset.y - drawH / 2) * ratio;

      ctx.fillStyle = '#0A0D0B';
      ctx.fillRect(0, 0, outSize, outSize);
      ctx.drawImage(img, dx, dy, drawW * ratio, drawH * ratio);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onUpdateProfile({ avatarUrl: croppedDataUrl });
      setCropSrc(null);
    };
    img.src = cropSrc;
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile.targetWeightKg));
  const [waterL, setWaterL] = useState(String(profile.waterTargetLiters));
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [level, setLevel] = useState<FitnessLevel>(profile.level);
  const [location, setLocation] = useState<WorkoutLocation>(profile.location);

  const bmi = calculateBmi(currentWeightKg, profile.heightCm);

  const providerLabel = authUser
    ? authUser.provider === 'google'
      ? 'Conectado con Google'
      : authUser.provider === 'apple'
      ? 'Conectado con Apple'
      : 'Cuenta con correo y contraseña'
    : 'Cuenta activa · Perfil Real';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword || newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPasswordSubmitting(true);
    const res = await onChangePassword(currentPassword, newPassword);
    setPasswordSubmitting(false);
    if (!res.ok) {
      setPasswordError(res.error || 'No se pudo actualizar la contraseña.');
      return;
    }
    setPasswordSuccess('Contraseña actualizada correctamente.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    window.setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordSuccess('');
    }, 1200);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const nAge = Math.max(14, Number(age) || profile.age);
    const nHeight = Math.max(120, Number(heightCm) || profile.heightCm);
    const macros = calculateMacroTargets(currentWeightKg, nHeight, nAge, goal);
    onUpdateProfile({
      name: name.trim() || profile.name,
      age: nAge,
      heightCm: nHeight,
      targetWeightKg: Number(targetWeightKg) || profile.targetWeightKg,
      waterTargetLiters: Math.max(1, Number(waterL) || profile.waterTargetLiters),
      goal,
      level,
      location,
      ...macros,
    });
    setShowEditModal(false);
  };

  const requestBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotifFeedback('Recordatorios activos dentro de la app.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifFeedback(
        perm === 'granted'
          ? 'Notificaciones del sistema activadas.'
          : 'Recordatorios activos dentro de la app.'
      );
    } catch {
      setNotifFeedback('Recordatorios activos dentro de la app.');
    }
  };

  const handlePdfClick = () => {
    const fileName = onExportPlanPdf();
    if (fileName) {
      setPdfFeedback(`PDF descargado: ${fileName}`);
      window.setTimeout(() => setPdfFeedback(''), 3000);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {!showSettings ? (
        <>
          {/* Header idéntico a la pantalla de referencia */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Premios y logros
            </h1>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Configuración y cuenta"
              className="w-10 h-10 rounded-full bg-[#131A16] border border-white/10 flex items-center justify-center text-[#D2DDD5] hover:text-white cursor-pointer active:scale-95 transition-transform"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Usuario + Nivel + Barra XP */}
          <div className="rounded-3xl bg-[#111814] border border-white/8 p-4">
            <div className="flex items-center gap-3.5">
              <div
                className="relative cursor-pointer group shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Cambiar foto de perfil"
              >
                <UserAvatarImage
                  name={profile.name}
                  sizeClass="w-14 h-14"
                  customUrl={profile.avatarUrl}
                />
                <div
                  className="absolute inset-0 rounded-full border-2 border-[#74D834]/65 pointer-events-none"
                  style={{ boxShadow: '0 0 12px #74D83430' }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#111814] border border-white/15 flex items-center justify-center">
                  <Camera className="w-2.5 h-2.5 text-[#74D834]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-white truncate">
                    {profile.name}
                  </h2>
                  <span className="text-xs font-bold text-[#74D834] shrink-0">
                    Nivel {userLevel.level}
                  </span>
                </div>
                <p className="text-xs text-[#9AA89E] mt-0.5 truncate">
                  Nivel: {userLevel.title}
                </p>

                <div className="mt-2.5 space-y-1">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(8, levelPct)}%`,
                        background: 'linear-gradient(90deg, #48b824, #74D834)',
                        boxShadow: '0 0 8px #74D83450',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-nums text-[#9AA89E]">
                    <span>{userLevel.currentXp} / {userLevel.xpToNext} pts</span>
                    <span className="text-[#74D834]">{userLevel.totalXp} pts totales</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Racha activa */}
          <button
            type="button"
            onClick={() => {
              const streakAch =
                achievements.find((a) => a.id === 'streak_3' || a.id.startsWith('streak')) ??
                achievements[0];
              if (streakAch) setSelectedAchievement(streakAch);
            }}
            className="w-full rounded-3xl bg-[#111814] border border-white/8 p-4 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #FF6B3540, #FF6B3510 70%)',
                  border: '1px solid #FF6B3540',
                }}
              >
                <Flame className="w-6 h-6 text-[#FF6B35]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#9AA89E] font-medium">Racha activa</p>
                <p className="font-display text-2xl font-extrabold text-white leading-none mt-0.5">
                  {currentStreak}{' '}
                  <span className="text-base font-semibold text-[#D2DDD5]">
                    {currentStreak === 1 ? 'día' : 'días'}
                  </span>
                </p>
                <p className="text-[11px] text-[#9AA89E] mt-0.5 truncate">
                  {currentStreak > 0
                    ? '¡Vas muy bien! Mantén la constancia.'
                    : 'Completa tus hábitos hoy para iniciar tu racha.'}
                </p>
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-0.5 shrink-0"
              style={{
                backgroundColor: '#74D83418',
                color: '#74D834',
                border: '1px solid #74D83435',
              }}
            >
              +{currentStreak * 15} pts
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Tus medallas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Tus medallas</h2>
              <button
                type="button"
                onClick={() => setShowAllMedals((v) => !v)}
                className="text-xs font-semibold text-[#74D834] inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showAllMedals ? 'Ver menos' : 'Ver todas'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {visibleMedals.map((ach) => {
                const unlocked = Boolean(ach.unlockedAt);
                return (
                  <button
                    key={ach.id}
                    type="button"
                    onClick={() => setSelectedAchievement(ach)}
                    className="flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform"
                  >
                    <div
                      className="w-[62px] h-[62px] rounded-full flex items-center justify-center border-2 relative"
                      style={{
                        background: unlocked
                          ? `radial-gradient(circle at 30% 28%, ${ach.color}65, ${ach.color}14 60%, #0F1712 85%)`
                          : 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08), #0F1712 75%)',
                        borderColor: unlocked ? ach.color : 'rgba(255,255,255,0.12)',
                        boxShadow: unlocked ? `0 0 18px ${ach.color}35` : 'none',
                      }}
                    >
                      <span
                        className={`text-2xl select-none ${unlocked ? '' : 'grayscale opacity-35'}`}
                        style={unlocked ? { filter: `drop-shadow(0 0 6px ${ach.color}60)` } : undefined}
                      >
                        {ach.emoji}
                      </span>
                      {unlocked && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#74D834] text-black flex items-center justify-center border-2 border-[#0A0D0B]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p
                      className="text-[11px] font-semibold mt-1.5 leading-tight truncate w-full px-0.5"
                      style={{ color: unlocked ? '#E8F0EA' : '#9AA89E' }}
                    >
                      {ach.title}
                    </p>
                    <p className="text-[10px] text-[#6B7A70] leading-tight">
                      {unlocked
                        ? formatAchievementDate(ach.unlockedAt)
                        : `${Math.round((ach.progress ?? 0) * 100)}%`}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Retos completados */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Retos completados</h2>
              <button
                type="button"
                onClick={() => setShowAllChallenges((v) => !v)}
                className="text-xs font-semibold text-[#74D834] inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showAllChallenges ? 'Ver menos' : 'Ver todos'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {[...unlockedList, ...lockedList]
                .slice(0, showAllChallenges ? undefined : 3)
                .map((ach) => {
                  const unlocked = Boolean(ach.unlockedAt);
                  const pct = Math.round((ach.progress ?? 0) * 100);
                  return (
                    <button
                      key={ach.id}
                      type="button"
                      onClick={() => setSelectedAchievement(ach)}
                      className="w-full rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform border"
                      style={{
                        backgroundColor: unlocked ? 'rgba(116,216,52,0.06)' : '#111814',
                        borderColor: unlocked ? 'rgba(116,216,52,0.2)' : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: unlocked ? '#74D834' : 'rgba(255,255,255,0.07)',
                            border: unlocked ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {unlocked ? (
                            <Check className="w-4.5 h-4.5 text-black stroke-[2.75]" />
                          ) : (
                            <span className="text-base grayscale opacity-60">{ach.emoji}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ach.title}</p>
                          <p className="text-[11px] text-[#9AA89E]">
                            {unlocked
                              ? `Completado · ${ach.points} pts`
                              : `En progreso (${pct}%) · ${ach.points} pts`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9AA89E] shrink-0" />
                    </button>
                  );
                })}
            </div>
          </section>

          {/* Tu progreso */}
          <section className="space-y-2.5">
            <h2 className="font-display text-base font-bold text-white">Tu progreso</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  icon: <Flame className="w-4.5 h-4.5 text-[#FF6B35]" />,
                  value: currentStreak,
                  label: 'Días de racha',
                },
                {
                  icon: <Star className="w-4.5 h-4.5 text-[#FFD700]" />,
                  value: unlockedList.length,
                  label: 'Medallas',
                },
                {
                  icon: <Target className="w-4.5 h-4.5 text-[#0A95FF]" />,
                  value: lockedList.length,
                  label: 'Retos activos',
                },
                {
                  icon: <Gift className="w-4.5 h-4.5 text-[#74D834]" />,
                  value: userLevel.totalXp,
                  label: 'Puntos totales',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#111814] border border-white/7 p-2.5 text-center"
                >
                  <div className="flex justify-center">{item.icon}</div>
                  <p className="font-mono-nums text-base font-bold mt-1 text-white">
                    {item.value}
                  </p>
                  <p className="text-[10px] text-[#9AA89E] leading-tight mt-0.5">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Acceso directo a configuración y datos de cuenta */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-full rounded-2xl bg-[#111814] border border-white/8 px-4 py-3.5 flex items-center justify-between text-left cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center text-[#74D834]">
                <Settings className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Configuración y cuenta</p>
                <p className="text-[11px] text-[#9AA89E]">
                  Datos físicos, tema, recordatorios, respaldo y sesión
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9AA89E]" />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Volver a Premios y logros"
                className="w-9 h-9 rounded-full bg-[#131A16] border border-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <h1 className="font-display text-xl font-bold text-white">Configuración y cuenta</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setName(profile.name);
                setAge(String(profile.age));
                setHeightCm(String(profile.heightCm));
                setTargetWeightKg(String(profile.targetWeightKg));
                setWaterL(String(profile.waterTargetLiters));
                setGoal(profile.goal);
                setLevel(profile.level);
                setLocation(profile.location);
                setShowEditModal(true);
              }}
              className="min-h-[38px] px-3 rounded-xl bg-[#131A16] border border-white/8 text-xs font-medium text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#74D834]" />
              <span>Editar</span>
            </button>
          </div>

          {/* User Card */}
          <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3.5">
            <div className="flex items-center gap-3.5">
              <div
                className="relative cursor-pointer group shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Cambiar foto de perfil"
              >
                <UserAvatarImage
                  name={profile.name}
                  sizeClass="w-14 h-14"
                  customUrl={profile.avatarUrl}
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-[#74D834]" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-white truncate">
                    {profile.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-[#74D834] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Cambiar foto</span>
                  </button>
                </div>
                <p className="text-xs text-[#9AA89E] truncate">{profile.email}</p>
                <p className="text-[11px] text-[#74D834] mt-0.5 truncate">
                  {profile.goal} · {profile.level} · {profile.location}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-white/6 text-center">
              <div>
                <p className="text-[10px] text-[#8E9D93]">Edad</p>
                <p className="font-mono-nums text-xs font-bold text-white mt-0.5">{profile.age}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9D93]">Estatura</p>
                <p className="font-mono-nums text-xs font-bold text-white mt-0.5">
                  {Math.round(profile.heightCm)} cm
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9D93]">Peso</p>
                <p className="font-mono-nums text-xs font-bold text-white mt-0.5">
                  {currentWeightKg} kg
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9D93]">IMC</p>
                <p className="font-mono-nums text-xs font-bold text-[#74D834] mt-0.5">{bmi}</p>
              </div>
            </div>
          </div>

          {/* Global Theme Switcher (Oscuro / Claro) */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-white">Apariencia</h3>
            <p className="text-[11px] text-[#9AA89E]">
              Alterna el modo visual de toda la aplicación
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#74D834]">
            {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0D120F] border border-white/8">
          <button
            type="button"
            onClick={() => onSetTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={`min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#74D834] text-[#081007]'
                : 'text-[#9AA89E] hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Oscuro</span>
          </button>
          <button
            type="button"
            onClick={() => onSetTheme('light')}
            aria-pressed={theme === 'light'}
            className={`min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-[#74D834] text-[#081007]'
                : 'text-[#9AA89E] hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Claro</span>
          </button>
        </div>
      </div>

      {/* Reminders */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#74D834]" />
            <span>Recordatorios</span>
          </h3>
          <button
            type="button"
            onClick={requestBrowserNotifications}
            className="text-[11px] text-[#74D834] hover:underline cursor-pointer"
          >
            Activar avisos
          </button>
        </div>

        {notifFeedback && <p className="text-[11px] text-[#74D834]">{notifFeedback}</p>}

        <div className="divide-y divide-white/6">
          {[
            {
              key: 'workoutEnabled' as const,
              timeKey: 'workoutTime' as const,
              label: 'Entrenamiento',
              enabled: reminders.workoutEnabled,
              time: reminders.workoutTime,
            },
            {
              key: 'mealsEnabled' as const,
              timeKey: 'mealsTime' as const,
              label: 'Comidas',
              enabled: reminders.mealsEnabled,
              time: reminders.mealsTime,
            },
            {
              key: 'kegelEnabled' as const,
              timeKey: 'kegelTime' as const,
              label: 'Suelo pélvico',
              enabled: reminders.kegelEnabled,
              time: reminders.kegelTime,
            },
            {
              key: 'sleepEnabled' as const,
              timeKey: 'sleepTime' as const,
              label: 'Hora de dormir',
              enabled: reminders.sleepEnabled,
              time: reminders.sleepTime,
            },
          ].map((item) => (
            <div key={item.key} className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-[#E2EAE3]">{item.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={item.time}
                  onChange={(e) => onUpdateReminders({ [item.timeKey]: e.target.value })}
                  className="px-1.5 py-0.5 rounded-lg bg-[#0D120F] border border-white/10 text-[11px] font-mono-nums text-[#C5D0C8]"
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.enabled}
                  onClick={() => onUpdateReminders({ [item.key]: !item.enabled })}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    item.enabled ? 'bg-[#74D834]' : 'bg-[#253028]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      item.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Robust Local Persistence & Sync Card */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#74D834]/15 text-[#74D834] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                Persistencia Local y Nube
              </h3>
              <p className="text-[11px] text-[#9AA89E]">
                IndexedDB activo · Funciona 100% sin conexión
              </p>
            </div>
          </div>
          {syncStatus && (
            <SyncStatusIndicator
              syncStatus={syncStatus}
              pendingSyncCount={pendingSyncCount}
              lastSyncedAt={lastSyncedAt}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onToggleSimulatedOffline={onToggleSimulatedOffline || (() => {})}
              onManualSync={onManualSync || (async () => false)}
            />
          )}
        </div>

        <div className="rounded-2xl bg-[#0D120F] border border-white/6 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-[#B2C0B6]">
            <span>Almacenamiento en dispositivo:</span>
            <span className="text-[#74D834] font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Protegido en IndexedDB
            </span>
          </div>

          <div className="flex items-center justify-between text-[#B2C0B6] pt-1 border-t border-white/6">
            <span>Estado de conexión:</span>
            <span className={isOnline ? 'text-white font-medium' : 'text-amber-400 font-medium'}>
              {isOnline ? 'En línea' : 'Sin conexión a internet'}
            </span>
          </div>

          {pendingSyncCount > 0 && (
            <div className="flex items-center justify-between text-[#B2C0B6] pt-1 border-t border-white/6">
              <span>Sincronización pendiente:</span>
              <span className="text-amber-300 font-semibold">
                {pendingSyncCount} cambio(s) pendiente(s)
              </span>
            </div>
          )}
        </div>

        {onManualSync && (
          <button
            type="button"
            onClick={() => void onManualSync()}
            disabled={!isOnline}
            className="w-full min-h-[38px] px-3 rounded-2xl bg-[#1C261F] hover:bg-[#253329] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#74D834]" />
            <span>Sincronizar ahora con la nube</span>
          </button>
        )}
      </div>

      {/* Plan PDF & Data Backup Export */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2.5">
        <div>
          <h3 className="font-display text-sm font-bold text-white">
            Exportar Plan y Respaldo
          </h3>
          <p className="text-[11px] text-[#9AA89E] mt-0.5">
            Descarga tu rutina, menú real y objetivos en PDF listo para imprimir
          </p>
        </div>

        <button
          type="button"
          onClick={handlePdfClick}
          className="w-full min-h-[42px] px-3 rounded-2xl bg-gradient-to-r from-[#82E63E] to-[#58C222] text-[#081007] font-display font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Exportar plan de entrenamiento y nutrición (PDF)</span>
        </button>

        {pdfFeedback && (
          <div className="px-3 py-2 rounded-xl bg-[#74D834]/15 border border-[#74D834]/35 text-[11px] text-[#74D834] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{pdfFeedback}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onExportJson}
          className="w-full min-h-[40px] px-3 rounded-2xl bg-[#0D120F] border border-white/10 text-xs font-medium text-[#D2DDD5] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#74D834]" />
          <span>Exportar respaldo completo (JSON)</span>
        </button>
      </div>

      {/* Security & Legal Information */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2">
        <div className="mb-1">
          <h3 className="font-display text-sm font-bold text-white">
            Seguridad e Información Legal
          </h3>
          <p className="text-[11px] text-[#9AA89E]">
            Términos de uso, privacidad de tus datos y seguridad de acceso
          </p>
        </div>

        {authUser?.provider === 'password' && (
          <button
            type="button"
            onClick={() => {
              setPasswordError('');
              setPasswordSuccess('');
              setShowPasswordModal(true);
            }}
            className="w-full min-h-[40px] px-3 rounded-2xl bg-[#0D120F] border border-white/8 text-xs font-medium text-[#E2EAE3] flex items-center justify-between cursor-pointer hover:border-[#74D834]/35"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#74D834]" />
              <span>Cambiar contraseña</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#8E9D93]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setLegalTab('terms')}
          className="w-full min-h-[40px] px-3 rounded-2xl bg-[#0D120F] border border-white/8 text-xs font-medium text-[#E2EAE3] flex items-center justify-between cursor-pointer hover:border-[#74D834]/35"
        >
          <span className="inline-flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#74D834]" />
            <span>Términos y Condiciones</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#8E9D93]" />
        </button>

        <button
          type="button"
          onClick={() => setLegalTab('privacy')}
          className="w-full min-h-[40px] px-3 rounded-2xl bg-[#0D120F] border border-white/8 text-xs font-medium text-[#E2EAE3] flex items-center justify-between cursor-pointer hover:border-[#74D834]/35"
        >
          <span className="inline-flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4CC9B0]" />
            <span>Política de Privacidad</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#8E9D93]" />
        </button>

        <button
          type="button"
          onClick={() => setLegalTab('health')}
          className="w-full min-h-[40px] px-3 rounded-2xl bg-[#0D120F] border border-white/8 text-xs font-medium text-[#E2EAE3] flex items-center justify-between cursor-pointer hover:border-[#74D834]/35"
        >
          <span className="inline-flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#FBBF24]" />
            <span>Aviso de Salud y Descargo Médico</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#8E9D93]" />
        </button>
      </div>

      {/* Account */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-2">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/8 text-xs font-medium text-[#D2DDD5] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full min-h-[40px] px-3 rounded-xl bg-[#E06A5E]/10 border border-[#E06A5E]/30 text-xs font-medium text-[#E06A5E] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Eliminar cuenta y datos</span>
        </button>
      </div>
        </>
      )}

      {/* Modal individual de logro al tocar cualquier medalla, racha o reto */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3">
          <form
            onSubmit={handleSaveProfile}
            className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-3.5 max-h-[85%] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">Editar perfil</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] text-[#9AA89E]">Nombre completo</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Edad</span>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Estatura (cm)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Peso objetivo (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Meta de agua (L)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={waterL}
                    onChange={(e) => setWaterL(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs font-mono-nums text-white"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] text-[#9AA89E]">Objetivo</span>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                >
                  <option value="Reducir grasa y ganar salud">Reducir grasa y ganar salud</option>
                  <option value="Ganar masa muscular">Ganar masa muscular</option>
                  <option value="Mejorar resistencia y hábitos">Mejorar resistencia y hábitos</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Nivel</span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as FitnessLevel)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                  >
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9AA89E]">Entrenamiento</span>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as WorkoutLocation)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                  >
                    <option value="Casa">Casa</option>
                    <option value="Gym">Gym</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-2xl font-display font-semibold text-xs text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] cursor-pointer"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handlePasswordSubmit(e)}
            className="w-full max-w-[360px] rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Cambiar contraseña
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <p className="text-xs text-[#E57368] bg-[#E57368]/10 border border-[#E57368]/25 rounded-xl px-3 py-2">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-[#74D834] bg-[#74D834]/12 border border-[#74D834]/30 rounded-xl px-3 py-2">
                {passwordSuccess}
              </p>
            )}

            <div className="space-y-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] text-[#9AA89E]">Contraseña actual</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-[#9AA89E]">Nueva contraseña (mín. 8)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-[#9AA89E]">Confirmar nueva contraseña</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={passwordSubmitting}
              className="w-full min-h-[42px] rounded-2xl font-display font-semibold text-xs text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] cursor-pointer disabled:opacity-60"
            >
              {passwordSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-3.5">
            <h3 className="font-display text-base font-bold text-white">
              ¿Eliminar cuenta y datos?
            </h3>
            <p className="text-xs text-[#9AA89E] leading-relaxed">
              Esta acción borrará tu cuenta y todos tus registros de forma permanente.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[42px] rounded-xl bg-[#1B241E] text-xs font-semibold text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteAccount();
                }}
                className="min-h-[42px] rounded-xl bg-[#E06A5E] text-xs font-semibold text-white cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {legalTab && (
        <LegalDocumentsModal initialTab={legalTab} onClose={() => setLegalTab(null)} />
      )}

      {cropSrc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#131A16] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Recortar foto de perfil
              </h3>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="text-xs text-[#9AA89E] hover:text-white px-2 py-1 cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <p className="text-[11px] text-[#9AA89E]">
              Arrastra la imagen para encuadrarla y ajusta el zoom.
            </p>

            <div
              className="relative mx-auto w-[240px] h-[240px] rounded-full overflow-hidden bg-[#0A0D0B] border-2 border-[#74D834]/70 select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                cropDragRef.current = {
                  active: true,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: cropOffset.x,
                  origY: cropOffset.y,
                };
              }}
              onPointerMove={(e) => {
                if (!cropDragRef.current.active) return;
                const dx = e.clientX - cropDragRef.current.startX;
                const dy = e.clientY - cropDragRef.current.startY;
                setCropOffset({
                  x: cropDragRef.current.origX + dx,
                  y: cropDragRef.current.origY + dy,
                });
              }}
              onPointerUp={() => {
                cropDragRef.current.active = false;
              }}
              onPointerCancel={() => {
                cropDragRef.current.active = false;
              }}
            >
              <img
                src={cropSrc}
                alt="Vista previa de recorte"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setCropImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: cropImgSize
                    ? `${cropImgSize.w * Math.max(240 / cropImgSize.w, 240 / cropImgSize.h) * cropZoom}px`
                    : '100%',
                  height: cropImgSize
                    ? `${cropImgSize.h * Math.max(240 / cropImgSize.w, 240 / cropImgSize.h) * cropZoom}px`
                    : '100%',
                  maxWidth: 'none',
                  transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
                  pointerEvents: 'none',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#B8C4BC]">
                <span>Zoom</span>
                <span className="tabular-nums">{cropZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={cropZoom}
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="w-full accent-[#74D834]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="min-h-[42px] rounded-xl bg-[#1B241E] text-xs font-semibold text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAvatarCrop}
                disabled={!cropImgSize}
                className="min-h-[42px] rounded-xl bg-gradient-to-r from-[#82E63E] to-[#58C222] text-xs font-semibold text-[#081007] cursor-pointer disabled:opacity-50"
              >
                Guardar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
