import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  FileText,
  Flame,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import {
  MealEntry,
  MealSlot,
  ShoppingItem,
  UserProfile,
} from '../types/health';
import { FOOD_CATALOG } from '../data/seedData';
import { MealBowlArtwork } from './BrandLogo';
import { ProgressRing } from './ProgressRing';

interface NutritionViewProps {
  profile: UserProfile;
  todayMeals: MealEntry[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  shoppingList: ShoppingItem[];
  onAddMeal: (meal: {
    slot: MealSlot;
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => void;
  onToggleMeal: (mealId: string) => void;
  onDeleteMeal: (mealId: string) => void;
  onToggleShoppingItem: (itemId: string) => void;
  onAddShoppingItem: (name: string, quantity: string, category?: string) => void;
  onExportPdf?: () => string | null;
}

const MEAL_SLOTS: MealSlot[] = ['Desayuno', 'Almuerzo', 'Cena', 'Snack'];

export function NutritionView({
  profile,
  todayMeals: rawTodayMeals,
  totals: rawTotals,
  shoppingList: rawShoppingList,
  onAddMeal,
  onToggleMeal,
  onDeleteMeal,
  onToggleShoppingItem,
  onAddShoppingItem,
  onExportPdf,
}: NutritionViewProps) {
  const todayMeals = Array.isArray(rawTodayMeals) ? rawTodayMeals : [];
  const shoppingList = Array.isArray(rawShoppingList) ? rawShoppingList : [];
  const totals = {
    calories: Number(rawTotals?.calories) || 0,
    proteinG: Number(rawTotals?.proteinG) || 0,
    carbsG: Number(rawTotals?.carbsG) || 0,
    fatG: Number(rawTotals?.fatG) || 0,
  };
  const calorieTargetMin = Number(profile?.calorieTargetMin) || 1700;
  const calorieTargetMax = Number(profile?.calorieTargetMax) || 2100;
  const proteinTargetG = Number(profile?.proteinTargetG) || 140;
  const carbsTargetG = Number(profile?.carbsTargetG) || 190;
  const fatTargetG = Number(profile?.fatTargetG) || 65;

  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showShopping, setShowShopping] = useState(false);

  // Manual Calculator State
  const [calcSlot, setCalcSlot] = useState<MealSlot>('Almuerzo');
  const [calcName, setCalcName] = useState('');
  const [calcAutoKcal, setCalcAutoKcal] = useState(true);
  const [calcPro, setCalcPro] = useState('30');
  const [calcCarbs, setCalcCarbs] = useState('40');
  const [calcFat, setCalcFat] = useState('12');
  const [calcCal, setCalcCal] = useState('388');
  const [calcSavedToast, setCalcSavedToast] = useState<string | null>(null);

  // Real-Food Routine Catalog Category State
  const [routineCategory, setRoutineCategory] = useState<MealSlot>('Desayuno');
  const [routineAddedName, setRoutineAddedName] = useState<string | null>(null);

  // Modal Slot State
  const [modalSlot, setModalSlot] = useState<MealSlot>('Almuerzo');

  // Shopping List State
  const [newShopName, setNewShopName] = useState('');
  const [newShopQty, setNewShopQty] = useState('');

  const avgTarget = Math.round(
    (calorieTargetMin + calorieTargetMax) / 2
  );
  const caloriePercent = Math.min(
    100,
    Math.round((totals.calories / Math.max(800, avgTarget)) * 100)
  );

  const proteinPct = Math.min(100, (totals.proteinG / Math.max(1, proteinTargetG)) * 100);
  const carbsPct = Math.min(100, (totals.carbsG / Math.max(1, carbsTargetG)) * 100);
  const fatPct = Math.min(100, (totals.fatG / Math.max(1, fatTargetG)) * 100);

  const numPro = Math.max(0, Number(calcPro) || 0);
  const numCarbs = Math.max(0, Number(calcCarbs) || 0);
  const numFat = Math.max(0, Number(calcFat) || 0);
  const macroComputedKcal = Math.round(numPro * 4 + numCarbs * 4 + numFat * 9);
  const effectiveKcal = calcAutoKcal
    ? macroComputedKcal
    : Math.max(0, Math.round(Number(calcCal) || 0));

  const macroCalTotal = Math.max(1, numPro * 4 + numCarbs * 4 + numFat * 9);
  const proSharePct = Math.round(((numPro * 4) / macroCalTotal) * 100);
  const carbsSharePct = Math.round(((numCarbs * 4) / macroCalTotal) * 100);
  const fatSharePct = Math.max(0, 100 - proSharePct - carbsSharePct);

  const routineFoodsForCategory = useMemo(
    () => FOOD_CATALOG.filter((item) => item.defaultSlot === routineCategory),
    [routineCategory]
  );

  const modalFoodsForSlot = useMemo(
    () => FOOD_CATALOG.filter((item) => item.defaultSlot === modalSlot),
    [modalSlot]
  );

  const handleMacroChange = (
    field: 'pro' | 'carbs' | 'fat',
    rawValue: string
  ) => {
    const nextPro = field === 'pro' ? rawValue : calcPro;
    const nextCarbs = field === 'carbs' ? rawValue : calcCarbs;
    const nextFat = field === 'fat' ? rawValue : calcFat;

    if (field === 'pro') setCalcPro(rawValue);
    if (field === 'carbs') setCalcCarbs(rawValue);
    if (field === 'fat') setCalcFat(rawValue);

    if (calcAutoKcal) {
      const kcal = Math.round(
        (Math.max(0, Number(nextPro) || 0) * 4) +
        (Math.max(0, Number(nextCarbs) || 0) * 4) +
        (Math.max(0, Number(nextFat) || 0) * 9)
      );
      setCalcCal(String(kcal));
    }
  };

  const handleCalculatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveKcal <= 0 && numPro <= 0 && numCarbs <= 0 && numFat <= 0) return;

    const label = calcName.trim() || `Registro rápido · ${calcSlot}`;
    onAddMeal({
      slot: calcSlot,
      name: label,
      calories: effectiveKcal,
      proteinG: Math.round(numPro),
      carbsG: Math.round(numCarbs),
      fatG: Math.round(numFat),
    });

    setCalcName('');
    setCalcSavedToast(`${label} (+${effectiveKcal} kcal)`);
    window.setTimeout(() => setCalcSavedToast(null), 2200);
  };

  const handleQuickAddRoutineFood = (
    item: (typeof FOOD_CATALOG)[number],
    targetSlot: MealSlot
  ) => {
    onAddMeal({
      slot: targetSlot,
      name: item.name,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
    });
    setRoutineAddedName(item.name);
    window.setTimeout(() => setRoutineAddedName(null), 1800);
  };

  const handleAddShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    onAddShoppingItem(newShopName.trim(), newShopQty.trim() || '1 ud');
    setNewShopName('');
    setNewShopQty('');
  };

  const remainingKcal = Math.max(0, avgTarget - totals.calories);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-display text-2xl font-bold text-white">Nutrición</h1>
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf()}
              aria-label="Exportar plan en PDF"
              className="min-h-[40px] px-3 rounded-xl bg-[#131A16] border border-white/8 text-xs font-medium text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer hover:border-[#74D834]/40"
            >
              <FileText className="w-4 h-4 text-[#74D834]" />
              <span>PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowShopping(true)}
            className="min-h-[40px] px-3 rounded-xl bg-[#131A16] border border-white/8 text-xs font-medium text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#74D834]" />
            <span>Compras</span>
          </button>
        </div>
      </div>

      {/* Tu plan de hoy */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-3.5 space-y-3.5">
        <MealBowlArtwork />

        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Tu plan de hoy
            </h2>
            <p className="text-[11px] text-[#9AA89E] mt-1">
              Consumido: <span className="text-white font-semibold tabular-nums">{totals.calories.toLocaleString('es-ES')}</span> kcal · Restan{' '}
              <span className="text-[#74D834] font-semibold tabular-nums">{remainingKcal.toLocaleString('es-ES')}</span>
            </p>
            <p className="font-display text-sm font-bold text-white mt-0.5 tabular-nums">
              Meta: {calorieTargetMin.toLocaleString('es-ES')} –{' '}
              {calorieTargetMax.toLocaleString('es-ES')} kcal
            </p>
          </div>
          <ProgressRing percent={caloriePercent} size={78} strokeWidth={7} />
        </div>
      </div>

      {/* Macro Bars */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">Proteínas</span>
            <span className="font-mono-nums text-[#C5D0C8]">
              {totals.proteinG} / {proteinTargetG} g
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#1E2721] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#74D834] transition-all duration-500"
              style={{ width: `${proteinPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">Carbohidratos</span>
            <span className="font-mono-nums text-[#C5D0C8]">
              {totals.carbsG} / {carbsTargetG} g
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#1E2721] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D6A63A] transition-all duration-500"
              style={{ width: `${carbsPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">Grasas</span>
            <span className="font-mono-nums text-[#C5D0C8]">
              {totals.fatG} / {fatTargetG} g
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#1E2721] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D87236] transition-all duration-500"
              style={{ width: `${fatPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calculadora Manual de Registro Rápido */}
      <form
        onSubmit={handleCalculatorSubmit}
        className="rounded-3xl bg-gradient-to-b from-[#151E19] to-[#111713] border border-[#74D834]/25 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#74D834]/15 text-[#74D834] flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Calculadora manual
              </h2>
              <p className="text-[10px] text-[#9AA89E] truncate">
                Registro rápido de comidas no listadas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !calcAutoKcal;
              setCalcAutoKcal(next);
              if (next) setCalcCal(String(macroComputedKcal));
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer shrink-0 transition-colors ${
              calcAutoKcal
                ? 'bg-[#74D834]/15 border-[#74D834]/40 text-[#74D834]'
                : 'bg-[#0D120F] border-white/10 text-[#9AA89E]'
            }`}
          >
            {calcAutoKcal ? 'Auto kcal: ON' : 'Kcal manual'}
          </button>
        </div>

        {/* Category Selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCalcSlot(s)}
              className={`min-h-[32px] rounded-xl text-[11px] font-semibold cursor-pointer border transition-colors ${
                calcSlot === s
                  ? 'bg-[#74D834] text-[#081007] border-[#74D834]'
                  : 'bg-[#0D120F] text-[#9AA89E] border-white/8 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Optional Food Name */}
        <input
          type="text"
          value={calcName}
          onChange={(e) => setCalcName(e.target.value)}
          placeholder="Nombre (opcional, ej. Tacos de pollo caseros)"
          className="w-full min-h-[38px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white placeholder:text-[#6B7A70]"
        />

        {/* 4 Numeric Inputs: Calorías, Proteínas, Carbohidratos, Grasas */}
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-[#0D120F] border border-white/10 p-2.5 flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[#9AA89E] flex items-center justify-between">
              <span>Calorías (kcal)</span>
              <Flame className="w-3 h-3 text-[#74D834]" />
            </span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={calcAutoKcal ? macroComputedKcal : calcCal}
              onChange={(e) => {
                setCalcAutoKcal(false);
                setCalcCal(e.target.value);
              }}
              className="w-full bg-transparent text-sm font-mono-nums font-bold text-white outline-none"
            />
          </label>

          <label className="rounded-xl bg-[#0D120F] border border-[#74D834]/25 p-2.5 flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[#74D834]">
              Proteínas (g)
            </span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={calcPro}
              onChange={(e) => handleMacroChange('pro', e.target.value)}
              className="w-full bg-transparent text-sm font-mono-nums font-bold text-white outline-none"
            />
          </label>

          <label className="rounded-xl bg-[#0D120F] border border-[#D6A63A]/25 p-2.5 flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[#D6A63A]">
              Carbohidratos (g)
            </span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={calcCarbs}
              onChange={(e) => handleMacroChange('carbs', e.target.value)}
              className="w-full bg-transparent text-sm font-mono-nums font-bold text-white outline-none"
            />
          </label>

          <label className="rounded-xl bg-[#0D120F] border border-[#D87236]/25 p-2.5 flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[#D87236]">
              Grasas (g)
            </span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={calcFat}
              onChange={(e) => handleMacroChange('fat', e.target.value)}
              className="w-full bg-transparent text-sm font-mono-nums font-bold text-white outline-none"
            />
          </label>
        </div>

        {/* Live Macro Breakdown Bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-[#0D120F] overflow-hidden flex">
            <div className="h-full bg-[#74D834]" style={{ width: `${proSharePct}%` }} />
            <div className="h-full bg-[#D6A63A]" style={{ width: `${carbsSharePct}%` }} />
            <div className="h-full bg-[#D87236]" style={{ width: `${fatSharePct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#9AA89E] font-mono-nums">
            <span>P {proSharePct}% · C {carbsSharePct}% · G {fatSharePct}%</span>
            <span>
              4P+4C+9G = <strong className="text-white">{macroComputedKcal}</strong> kcal
            </span>
          </div>
        </div>

        {calcSavedToast && (
          <div className="px-3 py-2 rounded-xl bg-[#74D834]/15 border border-[#74D834]/35 text-[11px] text-[#74D834] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Añadido: {calcSavedToast}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full min-h-[42px] rounded-2xl font-display font-semibold text-xs text-[#081007] bg-gradient-to-r from-[#82E63E] to-[#58C222] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Añadir registro rápido ({effectiveKcal} kcal)</span>
        </button>
      </form>

      {/* Comida Real en Rutina por Categoría */}
      <div className="rounded-3xl bg-[#131A16] border border-white/8 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#74D834] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-white truncate">
                Comida real en rutina
              </h2>
              <p className="text-[10px] text-[#9AA89E]">
                Opciones naturales por categoría · 1 toque para añadir
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_SLOTS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setRoutineCategory(cat)}
              className={`min-h-[34px] rounded-xl text-[11px] font-semibold cursor-pointer border transition-colors ${
                routineCategory === cat
                  ? 'bg-[#74D834] text-[#081007] border-[#74D834]'
                  : 'bg-[#0D120F] text-[#9AA89E] border-white/8 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {routineAddedName && (
          <div className="px-3 py-1.5 rounded-xl bg-[#74D834]/15 border border-[#74D834]/35 text-[11px] text-[#74D834] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Añadido a {routineCategory}: {routineAddedName}</span>
          </div>
        )}

        <div className="space-y-2">
          {routineFoodsForCategory.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded-2xl bg-[#0D120F] border border-white/7 flex items-center justify-between gap-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white leading-snug">
                  {item.name}
                </p>
                <p className="text-[10px] text-[#8E9D93] mt-0.5 truncate">
                  {item.portion}
                </p>
                <p className="text-[10px] text-[#B7C4BB] font-mono-nums mt-1">
                  <span className="text-[#74D834] font-semibold">{item.calories} kcal</span>
                  {' · '}P {item.proteinG}g · C {item.carbsG}g · G {item.fatG}g
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAddRoutineFood(item, routineCategory)}
                aria-label={`Añadir ${item.name}`}
                className="min-h-[36px] px-2.5 rounded-xl bg-[#1A241E] border border-[#74D834]/35 text-[11px] font-semibold text-[#74D834] hover:bg-[#74D834] hover:text-[#081007] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comidas del día */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-bold text-white">
            Comidas del día ({todayMeals.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddMeal(true)}
            aria-label="Registrar alimento"
            className="w-10 h-10 rounded-full bg-[#74D834] text-[#081007] flex items-center justify-center cursor-pointer shadow-md shadow-[#74D834]/20"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {todayMeals.length === 0 ? (
          <div className="rounded-3xl bg-[#131A16] border border-white/7 p-6 text-center space-y-2">
            <Utensils className="w-7 h-7 text-[#74D834] mx-auto opacity-80" />
            <p className="text-xs font-medium text-white">Sin comidas registradas hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayMeals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-2xl bg-[#131A16] border border-white/7 p-3 flex items-center justify-between gap-2.5"
              >
                <button
                  type="button"
                  onClick={() => onToggleMeal(meal.id)}
                  className="flex items-center gap-3 flex-1 text-left cursor-pointer min-w-0"
                >
                  <MealBowlArtwork compact />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-xs font-semibold text-white truncate">
                        {meal.slot}
                      </span>
                      {meal.completed && (
                        <Check className="w-3.5 h-3.5 text-[#74D834] stroke-[3] shrink-0" />
                      )}
                      <span className="text-[11px] text-[#74D834] font-mono-nums shrink-0 ml-auto">
                        {meal.calories} kcal
                      </span>
                    </div>
                    <p className="text-[11px] text-[#D2DDD5] truncate mt-0.5">
                      {meal.name}
                    </p>
                    <p className="text-[10px] text-[#849489] font-mono-nums mt-0.5">
                      P {meal.proteinG}g · C {meal.carbsG}g · G {meal.fatG}g
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteMeal(meal.id)}
                  aria-label="Eliminar comida"
                  className="min-h-[36px] min-w-[36px] rounded-xl text-[#6E7D73] hover:text-[#E06A5E] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Modal (Catalog by Category + Quick Custom) */}
      {showAddMeal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3">
          <div className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-4 max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Registrar comida real
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMeal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setModalSlot(s)}
                  className={`min-h-[36px] rounded-xl text-[11px] font-semibold cursor-pointer border ${
                    modalSlot === s
                      ? 'bg-[#74D834] text-[#081007] border-[#74D834]'
                      : 'bg-[#0D120F] text-[#9AA89E] border-white/8'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {modalFoodsForSlot.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    onAddMeal({
                      slot: modalSlot,
                      name: item.name,
                      calories: item.calories,
                      proteinG: item.proteinG,
                      carbsG: item.carbsG,
                      fatG: item.fatG,
                    });
                    setShowAddMeal(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-[#0D120F] border border-white/6 hover:border-[#74D834]/50 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-[#849489] truncate">{item.portion}</p>
                    <p className="text-[10px] text-[#8E9D93] tabular-nums mt-0.5">
                      P {item.proteinG}g · C {item.carbsG}g · G {item.fatG}g
                    </p>
                  </div>
                  <span className="text-xs font-mono-nums font-semibold text-[#74D834] shrink-0">
                    +{item.calories}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShopping && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3">
          <div className="w-full rounded-3xl bg-[#141C17] border border-white/10 p-5 space-y-3.5 max-h-[82%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Lista de compras
              </h3>
              <button
                type="button"
                onClick={() => setShowShopping(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9AA89E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShopSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                placeholder="Ingrediente..."
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
              />
              <input
                type="text"
                value={newShopQty}
                onChange={(e) => setNewShopQty(e.target.value)}
                placeholder="Cant."
                className="w-16 min-h-[40px] px-2 rounded-xl bg-[#0D120F] border border-white/10 text-xs text-white"
              />
              <button
                type="submit"
                aria-label="Añadir"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-[#74D834] text-[#081007] flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="divide-y divide-white/6">
              {shoppingList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleShoppingItem(item.id)}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        item.checked
                          ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                          : 'border-[#45544A]'
                      }`}
                    >
                      {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span
                      className={`text-xs truncate ${
                        item.checked ? 'line-through text-[#6E7D73]' : 'text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#9AA89E] shrink-0">{item.quantity}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
