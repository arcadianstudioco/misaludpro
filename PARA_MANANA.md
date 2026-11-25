# Plan de Integración de IA — Para Mañana (Mi Salud Pro)

> **Principio clave:** Cero chatbots. La IA debe ser **invisible, directa y accionable** dentro de las pantallas actuales de la app, respetando el diseño existente y funcionando igual en iOS y Android.

---

## Arquitectura Segura (Backend en Supabase)
- **No guardar API Keys en el frontend/IPA/APK.**
- Crear una **Supabase Edge Function** (`supabase/functions/ai-health/index.ts`) usando **Gemini** (visión + JSON estructurado).
- La app envía únicamente el payload necesario (foto comprimida en base64 o resumen numérico del progreso) con el token de sesión del usuario autenticado.
- Crear un cliente ligero en `src/services/aiClient.ts` para consumir la Edge Function con manejo de errores y fallback offline.

---

## Funcionalidades a Implementar (en orden de prioridad)

### 1. Escáner de Comidas por Foto (`src/components/NutritionView.tsx`)
- **Objetivo:** Tomar o subir foto de un plato para estimar alimento, porción, calorías, proteína, carbohidratos y grasas, y agregarlo con 1 toque.
- **Extra:** Foto de nevera/despensa para sugerir ingredientes faltantes en la lista de compras.
- **UI:** Botón **"Foto del plato"** junto al formulario de agregar comida.

### 2. Diagnóstico de Progreso y Mesetas (`src/components/StatsView.tsx`)
- **Objetivo:** Analizar los últimos 14–30 días reales (peso, cintura, calorías, agua, sueño y entrenamientos) y mostrar **1 tarjeta corta con diagnóstico y ajuste concreto** (sin texto largo).
- **Extra:** Comparador de **2 fotografías de progreso** (ej. Día 1 vs Día 30) mostrando diferencias reales de medidas + observaciones objetivas.

### 3. Generador y Ajustador Automático de Rutinas (`src/components/RoutinesView.tsx`)
- **Objetivo:** Adaptar la rutina del día según objetivo, lugar (casa/gym), historial reciente de entrenamientos y horas de sueño registradas.
- **Extra:** Botón **"Cambiar ejercicio"** en 1 toque para sustituir un ejercicio por otro equivalente del mismo grupo muscular (útil si una máquina está ocupada).

### 4. Briefing Matutino en 1 Línea (`src/components/HomeDashboard.tsx`)
- **Objetivo:** Tarjeta compacta dinámica arriba del tablero que resume el enfoque del día según sueño/hidratación/macros pendientes (ej. sugerencias exactas si faltan gramos de proteína para cerrar la meta).

### 5. Coach de Voz en Tiempo Real al Correr (`src/components/OutdoorRunTracker.tsx`)
- **Objetivo:** Avisos cortos por voz/síntesis (`window.speechSynthesis` / audio nativo) cada kilómetro o al variar el ritmo usando los datos reales del GPS, sin necesidad de mirar la pantalla.

---

## Checklist Previo para Mañana
1. [ ] Definir la variable `GEMINI_API_KEY` en los **Secrets** de Supabase (`piyqybeukazjpqiqxeup`).
2. [ ] Desplegar la Edge Function `ai-health` en Supabase.
3. [ ] Implementar `src/services/aiClient.ts`.
4. [ ] Integrar **#1 Escáner de comidas** y **#2 Diagnóstico en Estadísticas** primero, probar en iPhone y compilar nuevo `.ipa`.
