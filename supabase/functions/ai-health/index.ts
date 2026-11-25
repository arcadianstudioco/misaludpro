// Supabase Edge Function: ai-health
// Handles non-chat AI features for Mi Salud Pro via Gemini 2.5 Flash.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function callGemini(
  apiKey: string,
  parts: Array<Record<string, unknown>>,
  systemInstruction: string
): Promise<unknown> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini error (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('La IA no devolvió una respuesta válida.');
  }

  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!geminiKey) {
    return jsonResponse(
      {
        error:
          'Falta configurar GEMINI_API_KEY en los Secrets de Supabase para activar las funciones de IA.',
      },
      503
    );
  }

  try {
    const body = (await req.json()) as {
      action?: string;
      payload?: Record<string, unknown>;
    };

    const action = body?.action;
    const payload = body?.payload || {};

    if (action === 'meal_photo') {
      const imageBase64 = String(payload.imageBase64 || '');
      const mimeType = String(payload.mimeType || 'image/jpeg');
      if (!imageBase64) {
        return jsonResponse({ error: 'Falta la imagen del plato.' }, 400);
      }

      const result = await callGemini(
        geminiKey,
        [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: 'Analiza este plato de comida. Identifica los alimentos visibles, estima la porción total y devuelve un JSON exacto con: {"name": string (nombre corto en español), "portion": string (ej. "1 plato mediano (~380 g)"), "calories": number, "proteinG": number, "carbsG": number, "fatG": number, "confidenceNote": string (máximo 12 palabras)}.',
          },
        ],
        'Eres un nutricionista deportivo preciso. Responde siempre en español y únicamente en JSON válido con números enteros.'
      );

      return jsonResponse({ ok: true, data: result });
    }

    if (action === 'progress_diagnosis') {
      const result = await callGemini(
        geminiKey,
        [
          {
            text: `Analiza estos datos reales de los últimos 14-30 días y devuelve un diagnóstico corto y accionable en JSON exacto: {"status": "on_track" | "plateau" | "attention", "headline": string (máximo 7 palabras), "diagnosis": string (máximo 28 palabras explicando el porqué según los números), "actionStep": string (1 acción concreta para esta semana, máximo 20 palabras)}.\n\nDatos:\n${JSON.stringify(
              payload
            )}`,
          },
        ],
        'Eres un entrenador y analista de composición corporal directo y objetivo. Cero saludos, cero relleno, solo análisis basado en los datos reales.'
      );

      return jsonResponse({ ok: true, data: result });
    }

    return jsonResponse({ error: `Acción no soportada: ${String(action)}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno en ai-health';
    return jsonResponse({ error: message }, 500);
  }
});
