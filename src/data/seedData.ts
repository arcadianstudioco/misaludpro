import {
  AppState,
  BodyMeasurement,
  DailyHabits,
  FitnessGoal,
  FitnessLevel,
  MealEntry,
  ShoppingItem,
  UserProfile,
  WorkoutLocation,
  WorkoutRoutine,
} from '../types/health';

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysAgoIso(days: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  const hM = heightCm / 100;
  return Number((weightKg / (hM * hM)).toFixed(1));
}

export function calculateMacroTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  goal: FitnessGoal
) {
  // Mifflin-St Jeor baseline with moderate activity multiplier
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * 1.45;
  let target = Math.round(tdee);
  if (goal === 'Reducir grasa y ganar salud') {
    target = Math.max(1600, Math.round(tdee - 400));
  } else if (goal === 'Ganar masa muscular') {
    target = Math.round(tdee + 250);
  }
  const min = Math.round((target - 100) / 50) * 50;
  const max = min + 200;
  const proteinG = Math.round(weightKg * 1.5);
  const fatG = Math.round((target * 0.28) / 9);
  const carbsG = Math.max(120, Math.round((target - proteinG * 4 - fatG * 9) / 4));
  return {
    calorieTargetMin: min,
    calorieTargetMax: max,
    proteinTargetG: proteinG,
    carbsTargetG: carbsG,
    fatTargetG: fatG,
  };
}

export const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'fuerza-total',
    title: 'Fuerza Total',
    subtitle: 'Tren superior, core y piernas en circuito controlado',
    level: 'Intermedio',
    durationMin: 45,
    category: 'Fuerza',
    location: 'Mixto',
    isFeatured: true,
    inMyRoutines: true,
    caloriesEstimate: 380,
    thumbnailType: 'strength',
    exercises: [
      {
        id: 'ex-1',
        name: 'Sentadilla controlada',
        sets: '4 series · 12 reps',
        durationSec: 60,
        restSec: 45,
        animKind: 'squat',
        instructions: 'Mantén el pecho erguido, rodillas alineadas con las puntas de los pies y baja 3 segundos.',
      },
      {
        id: 'ex-2',
        name: 'Flexiones o Press de pecho',
        sets: '4 series · 10-12 reps',
        durationSec: 55,
        restSec: 45,
        animKind: 'pushup',
        instructions: 'Codos a 45° del torso, abdomen firme y descenso completo hasta casi tocar el suelo.',
      },
      {
        id: 'ex-3',
        name: 'Remo con mancuerna o banda',
        sets: '4 series · 12 reps',
        durationSec: 60,
        restSec: 45,
        animKind: 'row',
        instructions: 'Lleva el codo hacia la cadera apretando la escápula 1 segundo arriba.',
      },
      {
        id: 'ex-4',
        name: 'Plancha abdominal isométrica',
        sets: '3 series · 45 seg',
        durationSec: 45,
        restSec: 30,
        animKind: 'plank',
        instructions: 'Glúteos y abdomen activos, evita que la zona lumbar caiga.',
      },
    ],
  },
  {
    id: 'cardio-quemagrasa',
    title: 'Cardio Quemagrasa',
    subtitle: 'Intervalos HIIT para elevar el gasto calórico',
    level: 'Intermedio',
    durationMin: 30,
    category: 'Cardio',
    location: 'Casa',
    inMyRoutines: true,
    caloriesEstimate: 310,
    thumbnailType: 'cardio',
    exercises: [
      {
        id: 'ex-c1',
        name: 'Jumping Jacks',
        sets: '4 rondas · 40 seg',
        durationSec: 40,
        restSec: 20,
        animKind: 'jumping_jacks',
        instructions: 'Ritmo constante abriendo y cerrando piernas con brazos arriba.',
      },
      {
        id: 'ex-c2',
        name: 'Mountain Climbers',
        sets: '4 rondas · 40 seg',
        durationSec: 40,
        restSec: 20,
        animKind: 'mountain_climber',
        instructions: 'Hombros sobre las muñecas, lleva las rodillas al pecho alternando con control.',
      },
      {
        id: 'ex-c3',
        name: 'Burpees sin salto (o completos)',
        sets: '4 rondas · 35 seg',
        durationSec: 35,
        restSec: 25,
        animKind: 'burpee',
        instructions: 'Mantén una respiración fluida al subir y protege la espalda baja.',
      },
    ],
  },
  {
    id: 'movilidad-flexibilidad',
    title: 'Movilidad y Flexibilidad',
    subtitle: 'Recuperación articular, cadera y columna torácica',
    level: 'Principiante',
    durationMin: 20,
    category: 'Movilidad',
    location: 'Casa',
    inMyRoutines: true,
    caloriesEstimate: 95,
    thumbnailType: 'mobility',
    exercises: [
      {
        id: 'ex-m1',
        name: 'Gato - Vaca torácica',
        sets: '3 series · 45 seg',
        durationSec: 45,
        restSec: 15,
        animKind: 'cat_cow',
        instructions: 'Inhala arqueando suavemente, exhala redondeando la espalda vértebra a vértebra.',
      },
      {
        id: 'ex-m2',
        name: 'Apertura de cadera 90/90',
        sets: '3 series · 50 seg',
        durationSec: 50,
        restSec: 15,
        animKind: 'hip_90_90',
        instructions: 'Rota ambas rodillas de un lado a otro manteniendo el torso largo.',
      },
      {
        id: 'ex-m3',
        name: 'Estiramiento de flexores e isquios',
        sets: '2 series · 60 seg',
        durationSec: 60,
        restSec: 15,
        animKind: 'stretch',
        instructions: 'Sostén la posición sin rebotes mientras exhalas lento.',
      },
    ],
  },
  {
    id: 'kegel-suelo-pelvico',
    title: 'Kegel y Suelo Pélvico',
    subtitle: 'Control neuromuscular: contracción y relajación guiada',
    level: 'Principiante',
    durationMin: 15,
    category: 'Suelo Pélvico',
    location: 'Casa',
    inMyRoutines: true,
    caloriesEstimate: 45,
    thumbnailType: 'kegel',
    exercises: [
      {
        id: 'ex-k1',
        name: 'Contracción lenta sostenida',
        sets: '10 ciclos · 5s contraer / 5s relajar',
        durationSec: 50,
        restSec: 20,
        animKind: 'kegel_breath',
        instructions: 'Eleva suavemente el suelo pélvico sin tensar glúteos ni muslos. Relaja por completo al soltar.',
      },
      {
        id: 'ex-k2',
        name: 'Respiración diafragmática + descarga',
        sets: '2 series · 60 seg',
        durationSec: 60,
        restSec: 15,
        animKind: 'kegel_breath',
        instructions: 'Inhala expandiendo costillas y siente cómo desciende el suelo pélvico.',
      },
      {
        id: 'ex-k3',
        name: 'Pulsos rápidos de control',
        sets: '2 series · 10 pulsos',
        durationSec: 30,
        restSec: 25,
        animKind: 'kegel_pulse',
        instructions: 'Contrae 1 segundo y suelta 2 segundos manteniendo la postura neutra.',
      },
    ],
  },
  {
    id: 'hipertrofia-gym',
    title: 'Base Muscular Gym',
    subtitle: 'Progresión en máquinas y peso libre para tren superior e inferior',
    level: 'Avanzado',
    durationMin: 50,
    category: 'Fuerza',
    location: 'Gym',
    inMyRoutines: false,
    caloriesEstimate: 430,
    thumbnailType: 'strength',
    exercises: [
      {
        id: 'ex-g1',
        name: 'Prensa inclinada',
        sets: '4 series · 10 reps',
        durationSec: 60,
        restSec: 60,
        animKind: 'squat',
        instructions: 'Empuja con toda la planta del pie sin bloquear las rodillas arriba.',
      },
      {
        id: 'ex-g2',
        name: 'Jalón al pecho',
        sets: '4 series · 10 reps',
        durationSec: 55,
        restSec: 60,
        animKind: 'pulldown',
        instructions: 'Deprime los hombros antes de tirar la barra hacia la clavícula.',
      },
      {
        id: 'ex-g3',
        name: 'Press militar con mancuernas',
        sets: '3 series · 10 reps',
        durationSec: 50,
        restSec: 50,
        animKind: 'press',
        instructions: 'Core firme y trayectoria vertical controlada.',
      },
    ],
  },
];

export interface FoodCatalogItem {
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  defaultSlot: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
}

export const FOOD_CATALOG: FoodCatalogItem[] = [
  // Desayuno - Comida real en rutina
  {
    name: 'Huevos revueltos con aguacate y masa madre',
    portion: '3 huevos · ½ aguacate · 2 rebanadas de pan integral',
    calories: 485,
    proteinG: 26,
    carbsG: 34,
    fatG: 26,
    defaultSlot: 'Desayuno',
  },
  {
    name: 'Bowl de avena cocida, claras y frutos rojos',
    portion: '60 g avena · 4 claras · 80 g arándanos y chía',
    calories: 420,
    proteinG: 32,
    carbsG: 54,
    fatG: 8,
    defaultSlot: 'Desayuno',
  },
  {
    name: 'Omelette de espinacas, champiñones y panela',
    portion: '3 huevos · 60 g queso panela · 1 manzana verde',
    calories: 390,
    proteinG: 29,
    carbsG: 22,
    fatG: 20,
    defaultSlot: 'Desayuno',
  },
  {
    name: 'Tostadas integrales con salmón y huevo pochado',
    portion: '80 g salmón ahumado · 2 huevos · 2 tostadas integrales',
    calories: 460,
    proteinG: 28,
    carbsG: 36,
    fatG: 22,
    defaultSlot: 'Desayuno',
  },
  {
    name: 'Yogur griego natural con nueces y plátano',
    portion: '200 g yogur sin azúcar · 20 g nueces · 1 plátano',
    calories: 410,
    proteinG: 22,
    carbsG: 48,
    fatG: 14,
    defaultSlot: 'Desayuno',
  },

  // Almuerzo - Comida real en rutina
  {
    name: 'Pechuga a la plancha con arroz integral y aguacate',
    portion: '180 g pechuga · 150 g arroz cocido · ½ aguacate',
    calories: 640,
    proteinG: 52,
    carbsG: 68,
    fatG: 18,
    defaultSlot: 'Almuerzo',
  },
  {
    name: 'Salmón al horno con batata asada y brócoli',
    portion: '170 g salmón · 180 g batata · 150 g brócoli al vapor',
    calories: 610,
    proteinG: 44,
    carbsG: 52,
    fatG: 24,
    defaultSlot: 'Almuerzo',
  },
  {
    name: 'Carne magra a la parrilla con papa y espárragos',
    portion: '180 g solomillo/res magra · 200 g papa · ensalada verde',
    calories: 650,
    proteinG: 49,
    carbsG: 58,
    fatG: 22,
    defaultSlot: 'Almuerzo',
  },
  {
    name: 'Bowl de pollo, quinoa, garbanzos y oliva',
    portion: '160 g pollo · 120 g quinoa · 80 g garbanzos · 1 cda AOVE',
    calories: 590,
    proteinG: 46,
    carbsG: 60,
    fatG: 17,
    defaultSlot: 'Almuerzo',
  },
  {
    name: 'Filete de pescado blanco con lentejas y verduras',
    portion: '180 g merluza/tilapia · 160 g lentejas · verduras salteadas',
    calories: 540,
    proteinG: 42,
    carbsG: 56,
    fatG: 14,
    defaultSlot: 'Almuerzo',
  },

  // Cena - Comida real en rutina
  {
    name: 'Ensalada de atún, huevo cocido y garbanzos',
    portion: '2 latas atún al natural · 1 huevo · 80 g garbanzos · AOVE',
    calories: 470,
    proteinG: 38,
    carbsG: 36,
    fatG: 18,
    defaultSlot: 'Cena',
  },
  {
    name: 'Tortilla de 3 huevos con espinacas y queso fresco',
    portion: '3 huevos · 80 g espinacas · 50 g queso fresco',
    calories: 380,
    proteinG: 30,
    carbsG: 8,
    fatG: 24,
    defaultSlot: 'Cena',
  },
  {
    name: 'Pechuga de pavo a la plancha con calabacín y camote',
    portion: '170 g pavo · 120 g camote asado · calabacín a la plancha',
    calories: 430,
    proteinG: 42,
    carbsG: 38,
    fatG: 10,
    defaultSlot: 'Cena',
  },
  {
    name: 'Salmón a la plancha con espárragos y ensalada',
    portion: '160 g salmón · 150 g espárragos · mix de hojas verdes',
    calories: 495,
    proteinG: 39,
    carbsG: 12,
    fatG: 30,
    defaultSlot: 'Cena',
  },
  {
    name: 'Tacos de carne molida magra en maíz y pico de gallo',
    portion: '150 g res magra 95/5 · 3 tortillas maíz · tomate y cebolla',
    calories: 445,
    proteinG: 36,
    carbsG: 34,
    fatG: 16,
    defaultSlot: 'Cena',
  },

  // Snack - Comida real en rutina
  {
    name: 'Yogur griego natural con nueces y almendras',
    portion: '170 g yogur griego · 20 g frutos secos',
    calories: 230,
    proteinG: 18,
    carbsG: 12,
    fatG: 12,
    defaultSlot: 'Snack',
  },
  {
    name: 'Batido proteico con plátano y crema de cacahuate',
    portion: '1 scoop whey · 1 plátano · 1 cdta crema de cacahuate',
    calories: 310,
    proteinG: 30,
    carbsG: 34,
    fatG: 7,
    defaultSlot: 'Snack',
  },
  {
    name: 'Manzana verde con mantequilla de almendra',
    portion: '1 manzana grande · 20 g mantequilla de almendra natural',
    calories: 240,
    proteinG: 6,
    carbsG: 26,
    fatG: 13,
    defaultSlot: 'Snack',
  },
  {
    name: 'Queso cottage con frutos rojos y semillas',
    portion: '150 g queso cottage · 70 g fresas · 10 g chía/calabaza',
    calories: 210,
    proteinG: 22,
    carbsG: 14,
    fatG: 6,
    defaultSlot: 'Snack',
  },
];

export const DEFAULT_SHOPPING_LIST: ShoppingItem[] = [
  { id: 'shop-1', name: 'Pechuga de pollo', category: 'Proteínas', quantity: '1.2 kg', checked: false },
  { id: 'shop-2', name: 'Huevos camperos', category: 'Proteínas', quantity: '24 uds', checked: true },
  { id: 'shop-3', name: 'Salmón fresco', category: 'Proteínas', quantity: '500 g', checked: false },
  { id: 'shop-4', name: 'Aguacates maduros', category: 'Grasas saludables', quantity: '4 uds', checked: false },
  { id: 'shop-5', name: 'Avena integral', category: 'Carbohidratos', quantity: '1 kg', checked: true },
  { id: 'shop-6', name: 'Arroz integral y batata', category: 'Carbohidratos', quantity: '1.5 kg', checked: false },
  { id: 'shop-7', name: 'Brócoli, espinacas y rúcula', category: 'Vegetales', quantity: '3 bolsas', checked: false },
  { id: 'shop-8', name: 'Yogur griego sin azúcar', category: 'Lácteos', quantity: '4 uds', checked: false },
];

export function buildDefaultHistoricalHabits(): Record<string, DailyHabits> {
  const history: Record<string, DailyHabits> = {};
  for (let d = 1; d <= 14; d += 1) {
    const iso = daysAgoIso(d);
    history[iso] = {
      date: iso,
      workoutDone: d <= 6,
      healthyEatingDone: d <= 2 || (d >= 4 && d <= 6),
      waterLiters: d <= 4 ? 3.25 : 2.25,
      sleepHours: d % 2 === 0 ? 8 : 7.5,
      kegelDone: d === 1,
    };
  }
  return history;
}

export function buildDefaultHistoricalMeals(): MealEntry[] {
  const templates: Array<Array<{ slot: MealEntry['slot']; name: string; calories: number; proteinG: number; carbsG: number; fatG: number }>> = [
    [
      { slot: 'Desayuno', name: 'Huevos revueltos con aguacate y masa madre', calories: 485, proteinG: 26, carbsG: 34, fatG: 26 },
      { slot: 'Almuerzo', name: 'Pechuga a la plancha con arroz integral y aguacate', calories: 640, proteinG: 52, carbsG: 68, fatG: 18 },
      { slot: 'Snack', name: 'Yogur griego natural con nueces y almendras', calories: 230, proteinG: 18, carbsG: 12, fatG: 12 },
      { slot: 'Cena', name: 'Ensalada de atún, huevo cocido y garbanzos', calories: 470, proteinG: 38, carbsG: 36, fatG: 18 },
    ],
    [
      { slot: 'Desayuno', name: 'Bowl de avena cocida, claras y frutos rojos', calories: 420, proteinG: 32, carbsG: 54, fatG: 8 },
      { slot: 'Almuerzo', name: 'Salmón al horno con batata asada y brócoli', calories: 610, proteinG: 44, carbsG: 52, fatG: 24 },
      { slot: 'Snack', name: 'Batido proteico con plátano y crema de cacahuate', calories: 310, proteinG: 30, carbsG: 34, fatG: 7 },
      { slot: 'Cena', name: 'Pechuga de pavo a la plancha con calabacín y camote', calories: 430, proteinG: 42, carbsG: 38, fatG: 10 },
    ],
    [
      { slot: 'Desayuno', name: 'Tostadas integrales con salmón y huevo pochado', calories: 460, proteinG: 28, carbsG: 36, fatG: 22 },
      { slot: 'Almuerzo', name: 'Carne magra a la parrilla con papa y espárragos', calories: 650, proteinG: 49, carbsG: 58, fatG: 22 },
      { slot: 'Cena', name: 'Tortilla de 3 huevos con espinacas y queso fresco', calories: 380, proteinG: 30, carbsG: 8, fatG: 24 },
      { slot: 'Snack', name: 'Queso cottage con frutos rojos y semillas', calories: 210, proteinG: 22, carbsG: 14, fatG: 6 },
    ],
  ];

  const entries: MealEntry[] = [];
  for (let d = 1; d <= 6; d += 1) {
    const iso = daysAgoIso(d);
    const tpl = templates[(d - 1) % templates.length];
    tpl.forEach((m, idx) => {
      entries.push({
        id: `hist-meal-${d}-${idx}`,
        date: iso,
        slot: m.slot,
        name: m.name,
        calories: m.calories,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        completed: true,
      });
    });
  }
  return entries;
}

export function buildDefaultDailyNotes(): Record<string, string> {
  return {
    [daysAgoIso(1)]: 'Buena energía durante el cardio HIIT, ligera tensión en gemelos al terminar.',
    [daysAgoIso(2)]: 'Me sentí fuerte en sentadillas y con mejor postura lumbar; descanso sólido.',
  };
}

export function createDemoState(customProfile?: Partial<UserProfile>): AppState {
  const today = getTodayIso();
  const profile: UserProfile = {
    id: 'user-local-1',
    name: customProfile?.name || 'Carlos Mendoza',
    email: customProfile?.email || 'carlos@misaludpro.app',
    age: customProfile?.age ?? 33,
    heightCm: customProfile?.heightCm ?? 182.88,
    initialWeightKg: customProfile?.initialWeightKg ?? 102.5,
    targetWeightKg: customProfile?.targetWeightKg ?? 90,
    goal: customProfile?.goal || 'Reducir grasa y ganar salud',
    level: customProfile?.level || 'Intermedio',
    location: customProfile?.location || 'Mixto',
    calorieTargetMin: customProfile?.calorieTargetMin ?? 2200,
    calorieTargetMax: customProfile?.calorieTargetMax ?? 2400,
    proteinTargetG: customProfile?.proteinTargetG ?? 150,
    carbsTargetG: customProfile?.carbsTargetG ?? 300,
    fatTargetG: customProfile?.fatTargetG ?? 80,
    waterTargetLiters: 3,
    sleepTargetHours: 8,
    createdAt: daysAgoIso(21),
  };

  const measurements: BodyMeasurement[] = [
    { id: 'm-1', date: daysAgoIso(21), weightKg: 102.5, waistCm: 97, abdomenCm: 99, chestCm: 103, armsCm: 36 },
    { id: 'm-2', date: daysAgoIso(14), weightKg: 101.4, waistCm: 96, abdomenCm: 98, chestCm: 103, armsCm: 36 },
    { id: 'm-3', date: daysAgoIso(7), weightKg: 100.8, waistCm: 96, abdomenCm: 98, chestCm: 103, armsCm: 36 },
    { id: 'm-3b', date: daysAgoIso(5), weightKg: 100.6, waistCm: 95.5, abdomenCm: 97.5, chestCm: 103, armsCm: 36 },
    { id: 'm-3c', date: daysAgoIso(3), weightKg: 100.4, waistCm: 95, abdomenCm: 97, chestCm: 102.5, armsCm: 36 },
    { id: 'm-3d', date: daysAgoIso(1), weightKg: 100.1, waistCm: 94.5, abdomenCm: 96.5, chestCm: 102, armsCm: 36 },
    { id: 'm-4', date: today, weightKg: 100.0, waistCm: 94, abdomenCm: 96, chestCm: 102, armsCm: 36 },
  ];

  const meals: MealEntry[] = [
    {
      id: 'meal-1',
      date: today,
      slot: 'Desayuno',
      name: 'Bowl de pollo, huevo pochado, aguacate y quinoa',
      calories: 626,
      proteinG: 48,
      carbsG: 75,
      fatG: 24,
      completed: true,
    },
    {
      id: 'meal-2',
      date: today,
      slot: 'Almuerzo',
      name: 'Pechuga a la plancha con arroz integral y vegetales',
      calories: 680,
      proteinG: 52,
      carbsG: 95,
      fatG: 26,
      completed: true,
    },
    {
      id: 'meal-3',
      date: today,
      slot: 'Snack',
      name: 'Yogur griego natural con nueces y avena',
      calories: 350,
      proteinG: 25,
      carbsG: 50,
      fatG: 20,
      completed: true,
    },
    {
      id: 'meal-4',
      date: today,
      slot: 'Cena',
      name: 'Salmón al horno con espárragos y ensalada verde',
      calories: 540,
      proteinG: 38,
      carbsG: 35,
      fatG: 18,
      completed: false,
    },
  ];

  return {
    isAuthenticated: true,
    profile,
    habitsByDate: {
      ...buildDefaultHistoricalHabits(),
      [today]: {
        date: today,
        workoutDone: true,
        healthyEatingDone: false,
        waterLiters: 2.0,
        sleepHours: 6.5,
        kegelDone: false,
      },
    },
    dailyNotes: buildDefaultDailyNotes(),
    routines: DEFAULT_ROUTINES,
    workoutSessions: [
      {
        id: 'ws-outdoor-1',
        routineId: 'outdoor-walk',
        routineTitle: 'Caminata al aire libre',
        durationSec: 1172,
        caloriesBurned: 125,
        completedAt: daysAgoIso(0),
        isOutdoor: true,
        activityType: 'Caminata al aire libre',
        distanceMiles: 0.89,
        activeCalories: 87,
        totalCalories: 125,
        altitudeFeet: 2,
        avgPaceText: '21\'44" /MI',
        dateTimeLabel: '21 de noviembre de 2026, 8:51–9:11 a.m.',
        deviceLabel: 'Móvil · GPS activo',
        routePoints: [
          { lat: 19.4326, lng: -99.1332, altitudeM: 0.6, timestamp: 1700000000000, speedMps: 1.2 },
          { lat: 19.4337, lng: -99.1342, altitudeM: 0.8, timestamp: 1700000240000, speedMps: 1.4 },
          { lat: 19.4351, lng: -99.1330, altitudeM: 1.1, timestamp: 1700000480000, speedMps: 1.3 },
          { lat: 19.4344, lng: -99.1314, altitudeM: 0.9, timestamp: 1700000720000, speedMps: 1.1 },
          { lat: 19.4331, lng: -99.1322, altitudeM: 0.7, timestamp: 1700000960000, speedMps: 1.0 },
          { lat: 19.4329, lng: -99.1327, altitudeM: 0.6, timestamp: 1700001172000, speedMps: 1.05 },
        ],
      },
      {
        id: 'ws-1',
        routineId: 'fuerza-total',
        routineTitle: 'Fuerza Total',
        durationSec: 2640,
        caloriesBurned: 375,
        completedAt: daysAgoIso(2),
      },
      {
        id: 'ws-2',
        routineId: 'cardio-quemagrasa',
        routineTitle: 'Cardio Quemagrasa',
        durationSec: 1800,
        caloriesBurned: 310,
        completedAt: daysAgoIso(1),
      },
    ],
    meals: [...buildDefaultHistoricalMeals(), ...meals],
    shoppingList: DEFAULT_SHOPPING_LIST,
    measurements,
    progressPhotos: [],
    kegelSessions: [
      {
        id: 'kg-1',
        date: daysAgoIso(1),
        cyclesCompleted: 10,
        holdSeconds: 5,
        relaxSeconds: 5,
      },
    ],
    reminders: {
      workoutEnabled: true,
      workoutTime: '07:30',
      hydrationEnabled: true,
      hydrationIntervalHours: 2,
      mealsEnabled: true,
      mealsTime: '13:00',
      kegelEnabled: true,
      kegelTime: '20:30',
      sleepEnabled: true,
      sleepTime: '22:30',
    },
  };
}

export function createFreshUserState(input: {
  name: string;
  email: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  waistCm: number;
  goal: FitnessGoal;
  level: FitnessLevel;
  location: WorkoutLocation;
}): AppState {
  const today = getTodayIso();
  const macros = calculateMacroTargets(input.weightKg, input.heightCm, input.age, input.goal);

  const profile: UserProfile = {
    id: `user-${Date.now()}`,
    name: input.name,
    email: input.email,
    age: input.age,
    heightCm: input.heightCm,
    initialWeightKg: input.weightKg,
    targetWeightKg: input.targetWeightKg,
    goal: input.goal,
    level: input.level,
    location: input.location,
    ...macros,
    waterTargetLiters: 3,
    sleepTargetHours: 8,
    createdAt: today,
  };

  return {
    isAuthenticated: true,
    profile,
    habitsByDate: {
      [today]: {
        date: today,
        workoutDone: false,
        healthyEatingDone: false,
        waterLiters: 0,
        sleepHours: 0,
        kegelDone: false,
      },
    },
    dailyNotes: {},
    routines: DEFAULT_ROUTINES,
    workoutSessions: [],
    meals: [],
    shoppingList: DEFAULT_SHOPPING_LIST.map((item) => ({ ...item, checked: false })),
    measurements: [
      {
        id: `m-${Date.now()}`,
        date: today,
        weightKg: input.weightKg,
        waistCm: input.waistCm,
        abdomenCm: Math.round(input.waistCm + 2),
        chestCm: Math.round(input.waistCm + 8),
        armsCm: 36,
      },
    ],
    progressPhotos: [],
    kegelSessions: [],
    reminders: {
      workoutEnabled: true,
      workoutTime: '07:30',
      hydrationEnabled: true,
      hydrationIntervalHours: 2,
      mealsEnabled: true,
      mealsTime: '13:00',
      kegelEnabled: true,
      kegelTime: '20:30',
      sleepEnabled: true,
      sleepTime: '22:30',
    },
  };
}
