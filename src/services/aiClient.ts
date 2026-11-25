import { getSavedSupabaseConfig, getSupabaseClient } from './supabaseClient';
import { isAppOnline } from './localPersistence';

export interface MealPhotoAnalysis {
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidenceNote: string;
}

export interface ProgressDiagnosis {
  status: 'on_track' | 'plateau' | 'attention';
  headline: string;
  diagnosis: string;
  actionStep: string;
}

export interface ProgressSummaryInput {
  goal: string;
  currentWeightKg: number;
  targetWeightKg: number;
  weightDeltaKg: number;
  waistLatestCm: number;
  avgDailyCalories: number;
  calorieTargetRange: string;
  workoutsLast14d: number;
  avgSleepHours: number;
  avgWaterLiters: number;
  measurementsCount: number;
}

/**
 * Compresses an image File on an offscreen canvas to a compact JPEG base64 string
 * so mobile camera photos upload quickly to the Edge Function.
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = 1024,
  quality = 0.82
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('No se pudo leer la imagen.'));
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Formato de imagen no compatible.'));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');

  ctx.drawImage(img, 0, 0, width, height);
  const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = compressedDataUrl.split(',')[1] || '';
  return { base64, mimeType: 'image/jpeg' };
}

async function invokeAiHealth<T>(
  action: string,
  payload: Record<string, unknown>
): Promise<T> {
  if (!isAppOnline()) {
    throw new Error('Necesitas conexión a internet para usar el análisis con IA.');
  }

  const { url, anonKey } = getSavedSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error('Servicio en la nube no configurado.');
  }

  const client = getSupabaseClient();
  let token = anonKey;
  if (client) {
    try {
      const { data } = await client.auth.getSession();
      if (data.session?.access_token) {
        token = data.session.access_token;
      }
    } catch {
      // Fallback to anonKey
    }
  }

  const res = await fetch(`${url}/functions/v1/ai-health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
  };

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || `Error al consultar IA (${res.status})`);
  }

  return json.data;
}

export async function analyzeMealPhoto(file: File): Promise<MealPhotoAnalysis> {
  const { base64, mimeType } = await compressImageToBase64(file);
  const raw = await invokeAiHealth<Partial<MealPhotoAnalysis>>('meal_photo', {
    imageBase64: base64,
    mimeType,
  });

  return {
    name: String(raw.name || 'Comida analizada'),
    portion: String(raw.portion || '1 porción'),
    calories: Math.max(0, Math.round(Number(raw.calories) || 0)),
    proteinG: Math.max(0, Math.round(Number(raw.proteinG) || 0)),
    carbsG: Math.max(0, Math.round(Number(raw.carbsG) || 0)),
    fatG: Math.max(0, Math.round(Number(raw.fatG) || 0)),
    confidenceNote: String(raw.confidenceNote || 'Estimación visual automática'),
  };
}

export async function analyzeProgressDiagnosis(
  summary: ProgressSummaryInput
): Promise<ProgressDiagnosis> {
  const raw = await invokeAiHealth<Partial<ProgressDiagnosis>>(
    'progress_diagnosis',
    summary as unknown as Record<string, unknown>
  );

  const status =
    raw.status === 'plateau' || raw.status === 'attention' ? raw.status : 'on_track';

  return {
    status,
    headline: String(raw.headline || 'Resumen de progreso'),
    diagnosis: String(raw.diagnosis || 'Análisis completado con tus registros recientes.'),
    actionStep: String(raw.actionStep || 'Mantén tu constancia esta semana.'),
  };
}
