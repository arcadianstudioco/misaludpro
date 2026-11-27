import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Flame,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { analyzeMealPhoto } from '../services/aiClient';
import {
  MealEntry,
  MealSlot,
  ShoppingItem,
  UserProfile,
} from '../types/health';
import { FOOD_CATALOG, FoodCatalogItem } from '../data/seedData';
import { ProgressRing } from './ProgressRing';
import { estimateNutritionFromFoodName, FoodEstimate } from '../utils/foodIntelligence';

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

type ModalTab = 'catalogo' | 'manual' | 'escanear';

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

  const avgTarget = Math.round((calorieTargetMin + calorieTargetMax) / 2);
  const remainingKcal = Math.max(0, avgTarget - totals.calories);
  const caloriePercent = Math.min(
    100,
    Math.round((totals.calories / Math.max(800, avgTarget)) * 100)
  );

  const proteinPct = Math.min(100, Math.round((totals.proteinG / Math.max(1, proteinTargetG)) * 100));
  const carbsPct = Math.min(100, Math.round((totals.carbsG / Math.max(1, carbsTargetG)) * 100));
  const fatPct = Math.min(100, Math.round((totals.fatG / Math.max(1, fatTargetG)) * 100));

  // Modal Sheet State
  const [showMealModal, setShowMealModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>('catalogo');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('Almuerzo');
  const [showShopping, setShowShopping] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Catalog search & filter
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSlotFilter, setCatalogSlotFilter] = useState<MealSlot>('Almuerzo');

  // Manual Calculator state
  const [calcName, setCalcName] = useState('');
  const [calcPro, setCalcPro] = useState('30');
  const [calcCarbs, setCalcCarbs] = useState('40');
  const [calcFat, setCalcFat] = useState('12');
  const [calcCal, setCalcCal] = useState('388');
  const [calcAutoKcal, setCalcAutoKcal] = useState(true);
  const [smartSuggestion, setSmartSuggestion] = useState<FoodEstimate | null>(null);

  // Auto-detect macros and calories when user types a food name
  const handleFoodNameChange = (name: string) => {
    setCalcName(name);
    const estimate = estimateNutritionFromFoodName(name);
    if (estimate) {
      setSmartSuggestion(estimate);
      setCalcPro(String(estimate.proteinG));
      setCalcCarbs(String(estimate.carbsG));
      setCalcFat(String(estimate.fatG));
      setCalcCal(String(estimate.calories));
      setCalcAutoKcal(true);
    } else {
      setSmartSuggestion(null);
    }
  };

  // AI Photo Scanner state
  const [photoScanning, setPhotoScanning] = useState(false);
  const [photoScanNote, setPhotoScanNote] = useState<string | null>(null);
  const [photoScanError, setPhotoScanError] = useState<string | null>(null);

  // Shopping state
  const [newShopName, setNewShopName] = useState('');
  const [newShopQty, setNewShopQty] = useState('');

  // Handle Flutter / iOS swipe-back
  useEffect(() => {
    const onBack = () => {
      if (showMealModal) setShowMealModal(false);
      else if (showShopping) setShowShopping(false);
    };
    window.addEventListener('flutter-back', onBack);
    return () => window.removeEventListener('flutter-back', onBack);
  }, [showMealModal, showShopping]);

  const numPro = Math.max(0, Number(calcPro) || 0);
  const numCarbs = Math.max(0, Number(calcCarbs) || 0);
  const numFat = Math.max(0, Number(calcFat) || 0);
  const macroComputedKcal = Math.round(numPro * 4 + numCarbs * 4 + numFat * 9);
  const effectiveKcal = calcAutoKcal
    ? macroComputedKcal
    : Math.max(0, Math.round(Number(calcCal) || 0));

  const handleMacroChange = (field: 'pro' | 'carbs' | 'fat', rawValue: string) => {
    const nextPro = field === 'pro' ? rawValue : calcPro;
    const nextCarbs = field === 'carbs' ? rawValue : calcCarbs;
    const nextFat = field === 'fat' ? rawValue : calcFat;

    if (field === 'pro') setCalcPro(rawValue);
    if (field === 'carbs') setCalcCarbs(rawValue);
    if (field === 'fat') setCalcFat(rawValue);

    if (calcAutoKcal) {
      const kcal = Math.round(
        Math.max(0, Number(nextPro) || 0) * 4 +
          Math.max(0, Number(nextCarbs) || 0) * 4 +
          Math.max(0, Number(nextFat) || 0) * 9
      );
      setCalcCal(String(kcal));
    }
  };

  const handleOpenAddForSlot = (slot: MealSlot, tab: ModalTab = 'catalogo') => {
    setSelectedSlot(slot);
    setCatalogSlotFilter(slot);
    setActiveModalTab(tab);
    setShowMealModal(true);
  };

  const handleQuickAddFood = (item: FoodCatalogItem, slot: MealSlot) => {
    onAddMeal({
      slot,
      name: item.name,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
    });
    setAddedToast(`${item.name} (+${item.calories} kcal)`);
    window.setTimeout(() => setAddedToast(null), 2000);
    setShowMealModal(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveKcal <= 0 && numPro <= 0 && numCarbs <= 0 && numFat <= 0) return;

    const label = calcName.trim() || `Registro manual · ${selectedSlot}`;
    onAddMeal({
      slot: selectedSlot,
      name: label,
      calories: effectiveKcal,
      proteinG: Math.round(numPro),
      carbsG: Math.round(numCarbs),
      fatG: Math.round(numFat),
    });

    setCalcName('');
    setAddedToast(`${label} (+${effectiveKcal} kcal)`);
    window.setTimeout(() => setAddedToast(null), 2000);
    setShowMealModal(false);
  };

  const handleMealPhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoScanning(true);
    setPhotoScanError(null);
    setPhotoScanNote(null);
    try {
      const result = await analyzeMealPhoto(file);
      setCalcName(result.name);
      setCalcPro(String(result.proteinG));
      setCalcCarbs(String(result.carbsG));
      setCalcFat(String(result.fatG));
      setCalcCal(String(result.calories));
      setCalcAutoKcal(false);
      setPhotoScanNote(`${result.portion} · ${result.confidenceNote}`);
      setActiveModalTab('manual');
    } catch (err) {
      setPhotoScanError(
        err instanceof Error ? err.message : 'No se pudo analizar la foto del plato.'
      );
    } finally {
      setPhotoScanning(false);
    }
  };

  const handleAddShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    onAddShoppingItem(newShopName.trim(), newShopQty.trim() || '1 ud');
    setNewShopName('');
    setNewShopQty('');
  };

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return FOOD_CATALOG.filter((item) => {
      const matchSlot = item.defaultSlot === catalogSlotFilter;
      if (!catalogQuery.trim()) return matchSlot;
      const q = catalogQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.portion.toLowerCase().includes(q)
      );
    });
  }, [catalogSlotFilter, catalogQuery]);

  // Meals grouped by slot
  const mealsBySlot = useMemo(() => {
    const map = new Map<MealSlot, MealEntry[]>();
    for (const slot of MEAL_SLOTS) {
      map.set(slot, []);
    }
    for (const meal of todayMeals) {
      const list = map.get(meal.slot) || [];
      list.push(meal);
      map.set(meal.slot, list);
    }
    return map;
  }, [todayMeals]);

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            Nutrición
          </h1>
          <p className="text-[11px] text-[#8E9D93] font-medium">
            Balance de calorías y macros
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf()}
              aria-label="Exportar PDF"
              className="apple-glass-pill min-h-[38px] px-3 rounded-2xl text-xs font-semibold text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-[#74D834]" />
              <span>PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowShopping(true)}
            aria-label="Lista de compras"
            className="apple-glass-pill min-h-[38px] px-3.5 rounded-2xl text-xs font-semibold text-[#D2DDD5] inline-flex items-center gap-1.5 cursor-pointer transition-all relative"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#74D834]" />
            <span>Compras</span>
            {shoppingList.filter((i) => !i.checked).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#74D834] text-[#081007] text-[10px] font-bold flex items-center justify-center -ml-0.5">
                {shoppingList.filter((i) => !i.checked).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {addedToast && (
        <div className="rounded-2xl bg-[#74D834]/15 border border-[#74D834]/35 px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#74D834] font-medium animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span className="truncate">{addedToast}</span>
        </div>
      )}

      {/* Hero Apple Glass Calorie Card */}
      <div className="apple-glass-card rounded-[28px] p-4.5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#8E9D93]">
              Calorías activas
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-nums text-3xl font-extrabold text-white tracking-tight">
                {totals.calories.toLocaleString('es-ES')}
              </span>
              <span className="text-xs font-medium text-[#8E9D93]">
                / {avgTarget.toLocaleString('es-ES')} kcal
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#74D834]/12 border border-[#74D834]/25">
              <Flame className="w-3 h-3 text-[#74D834]" />
              <span className="text-[11px] font-bold text-[#74D834] font-mono-nums">
                {remainingKcal > 0 ? `${remainingKcal.toLocaleString('es-ES')} kcal restantes` : '¡Meta alcanzada!'}
              </span>
            </div>
          </div>

          <div className="shrink-0 relative">
            <ProgressRing percent={caloriePercent} size={82} strokeWidth={8} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-mono-nums text-xs font-extrabold text-white">
                {caloriePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* 3 Macro Apple Glass Mini-Cards */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Proteína */}
          <div className="apple-glass-pill rounded-2xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#74D834]">Proteína</span>
              <span className="text-[9px] font-mono-nums text-[#8E9D93]">{proteinPct}%</span>
            </div>
            <p className="font-mono-nums text-sm font-extrabold text-white">
              {totals.proteinG} <span className="text-[10px] font-normal text-[#8E9D93]">/ {proteinTargetG}g</span>
            </p>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#74D834] transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>

          {/* Carbos */}
          <div className="apple-glass-pill rounded-2xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#FF9F0A]">Carbos</span>
              <span className="text-[9px] font-mono-nums text-[#8E9D93]">{carbsPct}%</span>
            </div>
            <p className="font-mono-nums text-sm font-extrabold text-white">
              {totals.carbsG} <span className="text-[10px] font-normal text-[#8E9D93]">/ {carbsTargetG}g</span>
            </p>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF9F0A] transition-all duration-500"
                style={{ width: `${carbsPct}%` }}
              />
            </div>
          </div>

          {/* Grasas */}
          <div className="apple-glass-pill rounded-2xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#FF453A]">Grasas</span>
              <span className="text-[9px] font-mono-nums text-[#8E9D93]">{fatPct}%</span>
            </div>
            <p className="font-mono-nums text-sm font-extrabold text-white">
              {totals.fatG} <span className="text-[10px] font-normal text-[#8E9D93]">/ {fatTargetG}g</span>
            </p>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF453A] transition-all duration-500"
                style={{ width: `${fatPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Glass Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleOpenAddForSlot('Almuerzo', 'catalogo')}
          className="apple-glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-center text-[#74D834] group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold text-white">Registrar</span>
        </button>

        <label className="apple-glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group transition-all">
          <div className="w-8 h-8 rounded-full bg-[#3FC8FF]/15 border border-[#3FC8FF]/30 flex items-center justify-center text-[#3FC8FF] group-hover:scale-105 transition-transform">
            {photoScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-semibold text-white">
            {photoScanning ? 'Analizando...' : 'Escanear IA'}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={photoScanning}
            onChange={(e) => void handleMealPhotoScan(e)}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={() => handleOpenAddForSlot('Almuerzo', 'manual')}
          className="apple-glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA] group-hover:scale-105 transition-transform">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-white">Manual</span>
        </button>
      </div>

      {/* Comidas del Día (Agrupadas estilo Apple Health) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-bold text-white">
            Comidas registradas ({todayMeals.length})
          </h2>
          <span className="text-[11px] font-mono-nums text-[#8E9D93]">
            {totals.calories} kcal totales
          </span>
        </div>

        <div className="space-y-3">
          {MEAL_SLOTS.map((slot) => {
            const meals = mealsBySlot.get(slot) || [];
            const slotCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

            return (
              <div key={slot} className="apple-glass-card rounded-3xl p-3.5 space-y-2.5">
                {/* Slot Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-white">
                      {slot}
                    </span>
                    {slotCalories > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-white/6 text-[10px] font-mono-nums font-semibold text-[#74D834]">
                        {slotCalories} kcal
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddForSlot(slot, 'catalogo')}
                    aria-label={`Añadir a ${slot}`}
                    className="w-7 h-7 rounded-full bg-white/8 hover:bg-[#74D834] hover:text-[#081007] text-[#C5D0C8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Meals in this slot */}
                {meals.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenAddForSlot(slot, 'catalogo')}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-white/10 hover:border-white/20 text-center text-[11px] text-[#6E7C73] hover:text-[#C5D0C8] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#74D834]" />
                    <span>Sin registrar · Toca para agregar</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="apple-glass-pill rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleMeal(meal.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                              meal.completed
                                ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                                : 'border-white/20 bg-white/5'
                            }`}
                          >
                            {meal.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-semibold truncate ${
                                meal.completed ? 'line-through text-[#6E7C73]' : 'text-white'
                              }`}
                            >
                              {meal.name}
                            </p>
                            <p className="text-[10px] text-[#8E9D93] font-mono-nums mt-0.5">
                              <span className="text-[#74D834]">P {meal.proteinG}g</span> ·{' '}
                              <span className="text-[#FF9F0A]">C {meal.carbsG}g</span> ·{' '}
                              <span className="text-[#FF453A]">G {meal.fatG}g</span>
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono-nums text-xs font-bold text-[#74D834]">
                            {meal.calories} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteMeal(meal.id)}
                            aria-label="Eliminar comida"
                            className="w-7 h-7 rounded-xl text-[#6E7C73] hover:text-[#FF453A] hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Apple Glass Modal: Registrar Comida */}
      {showMealModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Registrar en {selectedSlot}
                </h3>
                <p className="text-[11px] text-[#8E9D93]">
                  Selecciona del catálogo, cálculo manual o IA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMealModal(false)}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#C5D0C8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Apple Segmented Control for Tabs */}
            <div className="p-1 rounded-2xl bg-black/40 border border-white/8 grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'catalogo', label: 'Catálogo' },
                  { id: 'manual', label: 'Manual' },
                  { id: 'escanear', label: 'Escanear IA' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeModalTab === tab.id
                      ? 'bg-[#74D834] text-[#081007] shadow-sm'
                      : 'text-[#8E9D93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Slot Picker inside Modal */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(s);
                    setCatalogSlotFilter(s);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                    selectedSlot === s
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-white/4 border-white/6 text-[#8E9D93]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* TAB 1: CATÁLOGO */}
            {activeModalTab === 'catalogo' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8E9D93] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Buscar comida real (ej. avena, salmón, huevos)..."
                    className="w-full min-h-[40px] pl-9 pr-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-[#6E7C73] outline-none focus:border-[#74D834]/50"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredCatalog.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8E9D93]">
                      No se encontraron alimentos en esta categoría
                    </div>
                  ) : (
                    filteredCatalog.map((item) => (
                      <div
                        key={item.name}
                        onClick={() => handleQuickAddFood(item, selectedSlot)}
                        className="apple-glass-pill p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-[#74D834]/40 cursor-pointer transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white leading-snug">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#8E9D93] truncate mt-0.5">
                            {item.portion}
                          </p>
                          <p className="text-[10px] font-mono-nums text-[#8E9D93] mt-1">
                            <span className="text-[#74D834]">P {item.proteinG}g</span> ·{' '}
                            <span className="text-[#FF9F0A]">C {item.carbsG}g</span> ·{' '}
                            <span className="text-[#FF453A]">G {item.fatG}g</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono-nums text-sm font-bold text-[#74D834] block">
                            +{item.calories}
                          </span>
                          <span className="text-[9px] text-[#8E9D93]">kcal</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL */}
            {activeModalTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    value={calcName}
                    onChange={(e) => handleFoodNameChange(e.target.value)}
                    placeholder="Nombre (ej. Pollo, Arroz, 2 Huevos, Avena, Salmón...)"
                    className="w-full min-h-[42px] px-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-[#6E7C73] outline-none focus:border-[#74D834]/50"
                  />
                  {smartSuggestion && (
                    <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-[#74D834]/15 border border-[#74D834]/30 flex items-center justify-between text-[11px] text-[#74D834] animate-fadeIn">
                      <span className="flex items-center gap-1 font-medium truncate">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Autodetectado: <strong>{smartSuggestion.matchedKeyword}</strong></span>
                      </span>
                      <span className="font-mono-nums font-bold shrink-0 ml-2">
                        {smartSuggestion.calories} kcal
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="apple-glass-pill rounded-2xl p-3 space-y-1">
                    <span className="text-[10px] font-semibold text-[#74D834]">
                      Proteínas (g)
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={calcPro}
                      onChange={(e) => handleMacroChange('pro', e.target.value)}
                      className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
                    />
                  </div>

                  <div className="apple-glass-pill rounded-2xl p-3 space-y-1">
                    <span className="text-[10px] font-semibold text-[#FF9F0A]">
                      Carbohidratos (g)
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={calcCarbs}
                      onChange={(e) => handleMacroChange('carbs', e.target.value)}
                      className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
                    />
                  </div>

                  <div className="apple-glass-pill rounded-2xl p-3 space-y-1">
                    <span className="text-[10px] font-semibold text-[#FF453A]">
                      Grasas (g)
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={calcFat}
                      onChange={(e) => handleMacroChange('fat', e.target.value)}
                      className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
                    />
                  </div>

                  <div className="apple-glass-pill rounded-2xl p-3 space-y-1">
                    <span className="text-[10px] font-semibold text-white/80">
                      Calorías (kcal)
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
                      className="w-full bg-transparent font-mono-nums text-base font-bold text-white outline-none"
                    />
                  </div>
                </div>

                {photoScanNote && (
                  <div className="p-3 rounded-2xl bg-[#74D834]/12 border border-[#74D834]/30 text-[11px] text-[#D2DDD5] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#74D834] shrink-0" />
                    <span>{photoScanNote}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[46px] rounded-2xl bg-[#74D834] text-[#081007] font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#82E63E] transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Agregar {effectiveKcal} kcal</span>
                </button>
              </form>
            )}

            {/* TAB 3: ESCANEAR IA */}
            {activeModalTab === 'escanear' && (
              <div className="space-y-4 py-2 text-center">
                <div className="w-16 h-16 rounded-full bg-[#74D834]/15 border border-[#74D834]/30 text-[#74D834] flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-sm font-bold text-white">
                    Escaneo inteligente de plato
                  </h4>
                  <p className="text-xs text-[#8E9D93] max-w-xs mx-auto">
                    Apunta con la cámara o selecciona una imagen de tu comida para desglosar calorías y macronutrientes al instante.
                  </p>
                </div>

                {photoScanError && (
                  <div className="p-3 rounded-2xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF453A]">
                    {photoScanError}
                  </div>
                )}

                <label className="w-full min-h-[46px] rounded-2xl bg-[#74D834] text-[#081007] font-display font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-[#82E63E] transition-all">
                  {photoScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando comida...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Tomar foto del plato</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={photoScanning}
                    onChange={(e) => void handleMealPhotoScan(e)}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shopping List Apple Glass Modal */}
      {showShopping && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Lista de compras
                </h3>
                <p className="text-[11px] text-[#8E9D93]">
                  Ingredientes saludables y compras pendientes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShopping(false)}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#C5D0C8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShopSubmit} className="flex gap-2">
              <input
                type="text"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                placeholder="Ingrediente (ej. Aguacate, Avena)..."
                className="flex-1 min-h-[42px] px-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-[#6E7C73] outline-none focus:border-[#74D834]/50"
              />
              <input
                type="text"
                value={newShopQty}
                onChange={(e) => setNewShopQty(e.target.value)}
                placeholder="Cant."
                className="w-18 min-h-[42px] px-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white text-center placeholder:text-[#6E7C73] outline-none focus:border-[#74D834]/50"
              />
              <button
                type="submit"
                aria-label="Añadir a lista"
                className="w-11 min-h-[42px] rounded-2xl bg-[#74D834] text-[#081007] flex items-center justify-center cursor-pointer hover:bg-[#82E63E] transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            <div className="divide-y divide-white/6 pt-1 max-h-72 overflow-y-auto pr-1">
              {shoppingList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8E9D93]">
                  No hay artículos en tu lista de compras
                </div>
              ) : (
                shoppingList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleShoppingItem(item.id)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-white/2 rounded-xl px-2 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          item.checked
                            ? 'bg-[#74D834] border-[#74D834] text-[#081007]'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`text-xs font-medium truncate ${
                          item.checked ? 'line-through text-[#6E7C73]' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-nums text-[#8E9D93] shrink-0">
                      {item.quantity}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
