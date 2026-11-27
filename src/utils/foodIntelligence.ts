/**
 * Food Intelligence Engine
 * Instant heuristic & semantic analysis of food names for automatic calorie
 * and macronutrient estimation (Proteins, Carbs, Fats, Calories).
 */

export interface FoodEstimate {
  name: string;
  matchedKeyword: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  portionDesc: string;
  confidence: 'high' | 'medium' | 'estimate';
}

interface FoodKnowledgeEntry {
  patterns: RegExp[];
  keyword: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  portion: string;
}

// Extensive dictionary of Latin & international fitness foods
const FOOD_DICTIONARY: FoodKnowledgeEntry[] = [
  // Proteínas principales
  {
    patterns: [/pechuga/i, /pollo/i, /chicken/i],
    keyword: 'Pechuga de pollo',
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 4,
    portion: '150g a la plancha',
  },
  {
    patterns: [/carne/i, /res/i, /lomo/i, /bife/i, /beef/i, /steak/i],
    keyword: 'Carne magra de res',
    calories: 220,
    proteinG: 28,
    carbsG: 0,
    fatG: 12,
    portion: '150g magra',
  },
  {
    patterns: [/atun/i, /atún/i, /tuna/i],
    keyword: 'Atún al natural',
    calories: 130,
    proteinG: 28,
    carbsG: 0,
    fatG: 2,
    portion: '1 lata escurrida (120g)',
  },
  {
    patterns: [/salmon/i, /salmón/i],
    keyword: 'Salmón fresco',
    calories: 240,
    proteinG: 25,
    carbsG: 0,
    fatG: 15,
    portion: '150g a la plancha',
  },
  {
    patterns: [/huevo(s)?\s*cocido(s)?/i, /huevo(s)?\s*duro(s)?/i, /huevos\s*hervidos/i],
    keyword: 'Huevos duros (2 uds)',
    calories: 145,
    proteinG: 13,
    carbsG: 1,
    fatG: 10,
    portion: '2 huevos enteros cocidos',
  },
  {
    patterns: [/huevo(s)?\s*frito(s)?/i],
    keyword: 'Huevos fritos (2 uds)',
    calories: 185,
    proteinG: 13,
    carbsG: 1,
    fatG: 14,
    portion: '2 huevos fritos con poco aceite',
  },
  {
    patterns: [/huevo(s)?/i, /omelet/i, /revuelto(s)?/i],
    keyword: 'Huevos revueltos (2 uds)',
    calories: 170,
    proteinG: 13,
    carbsG: 2,
    fatG: 12,
    portion: '2 huevos revueltos',
  },
  {
    patterns: [/clara(s)?/i],
    keyword: 'Claras de huevo (4 uds)',
    calories: 68,
    proteinG: 14,
    carbsG: 1,
    fatG: 0,
    portion: '4 claras (130g)',
  },
  {
    patterns: [/proteina/i, /proteína/i, /whey/i, /batido/i, /shake/i, /scoop/i],
    keyword: 'Batido Whey Protein',
    calories: 135,
    proteinG: 25,
    carbsG: 3,
    fatG: 2,
    portion: '1 scoop (30g) con agua',
  },
  {
    patterns: [/tofu/i],
    keyword: 'Tofu firme',
    calories: 120,
    proteinG: 12,
    carbsG: 3,
    fatG: 6,
    portion: '150g',
  },

  // Carbohidratos & Granos
  {
    patterns: [/arroz\s*con\s*pollo/i],
    keyword: 'Arroz con pollo',
    calories: 420,
    proteinG: 28,
    carbsG: 55,
    fatG: 9,
    portion: '1 plato mediano (300g)',
  },
  {
    patterns: [/arroz\s*integral/i],
    keyword: 'Arroz integral cocido',
    calories: 215,
    proteinG: 5,
    carbsG: 45,
    fatG: 2,
    portion: '1 taza cocida (180g)',
  },
  {
    patterns: [/arroz/i, /rice/i],
    keyword: 'Arroz blanco cocido',
    calories: 205,
    proteinG: 4,
    carbsG: 45,
    fatG: 1,
    portion: '1 taza cocida (160g)',
  },
  {
    patterns: [/avena/i, /oats/i, /porridge/i],
    keyword: 'Avena en copos',
    calories: 190,
    proteinG: 7,
    carbsG: 32,
    fatG: 3,
    portion: '50g crudos / tazón preparado',
  },
  {
    patterns: [/pasta/i, /espagueti/i, /fideos/i, /macarrones/i],
    keyword: 'Pasta hervida',
    calories: 220,
    proteinG: 8,
    carbsG: 43,
    fatG: 2,
    portion: '1 taza cocida (150g)',
  },
  {
    patterns: [/papa(s)?\s*cocida(s)?/i, /patata(s)?\s*cocida(s)?/i, /papa(s)?\s*hervida(s)?/i],
    keyword: 'Papa / Patata cocida',
    calories: 135,
    proteinG: 3,
    carbsG: 30,
    fatG: 0,
    portion: '1 papa mediana (160g)',
  },
  {
    patterns: [/papa(s)?\s*frita(s)?/i, /patatas\s*fritas/i, /french\s*fries/i],
    keyword: 'Papas fritas',
    calories: 365,
    proteinG: 4,
    carbsG: 48,
    fatG: 17,
    portion: 'Porción regular (120g)',
  },
  {
    patterns: [/papa(s)?/i, /patata(s)?/i, /batata(s)?/i, /camote/i],
    keyword: 'Camote / Batata asada',
    calories: 140,
    proteinG: 3,
    carbsG: 33,
    fatG: 0,
    portion: '1 unidad mediana (160g)',
  },
  {
    patterns: [/arepa/i],
    keyword: 'Arepa de maíz',
    calories: 180,
    proteinG: 3,
    carbsG: 38,
    fatG: 1,
    portion: '1 arepa mediana (110g)',
  },
  {
    patterns: [/pan\s*integral/i],
    keyword: 'Pan integral (2 rebanadas)',
    calories: 140,
    proteinG: 7,
    carbsG: 24,
    fatG: 2,
    portion: '2 rebanadas (60g)',
  },
  {
    patterns: [/pan/i, /tostada(s)?/i, /bread/i],
    keyword: 'Pan blanco / tostada',
    calories: 150,
    proteinG: 5,
    carbsG: 28,
    fatG: 2,
    portion: '2 rebanadas (60g)',
  },
  {
    patterns: [/frijol(es)?/i, /caraotas/i, /judias/i, /alubias/i, /beans/i],
    keyword: 'Frijoles cocidos',
    calories: 180,
    proteinG: 11,
    carbsG: 30,
    fatG: 1,
    portion: '1 taza cocida (170g)',
  },
  {
    patterns: [/lenteja(s)?/i],
    keyword: 'Lentejas cocidas',
    calories: 185,
    proteinG: 13,
    carbsG: 31,
    fatG: 1,
    portion: '1 taza cocida (180g)',
  },
  {
    patterns: [/quinoa/i, /quinua/i],
    keyword: 'Quinoa cocida',
    calories: 190,
    proteinG: 7,
    carbsG: 34,
    fatG: 3,
    portion: '1 taza (160g)',
  },

  // Grasas & Frutos Secos
  {
    patterns: [/aguacate/i, /palta/i, /avocado/i],
    keyword: 'Aguacate / Palta',
    calories: 160,
    proteinG: 2,
    carbsG: 8,
    fatG: 15,
    portion: 'Medio aguacate mediano (100g)',
  },
  {
    patterns: [/aceite\s*(de\s*oliva)?/i, /olive\s*oil/i],
    keyword: 'Aceite de oliva (1 cda)',
    calories: 120,
    proteinG: 0,
    carbsG: 0,
    fatG: 14,
    portion: '1 cucharada sopera (14ml)',
  },
  {
    patterns: [/mantequilla\s*de\s*(mani|maní|cacahuate)/i, /peanut\s*butter/i],
    keyword: 'Mantequilla de maní (1 cda)',
    calories: 188,
    proteinG: 8,
    carbsG: 6,
    fatG: 16,
    portion: '1 cucharada colmada (32g)',
  },
  {
    patterns: [/frutos\s*secos/i, /nueces/i, /almendra(s)?/i, /mani/i, /cacahuate/i],
    keyword: 'Almendras / Frutos secos',
    calories: 170,
    proteinG: 6,
    carbsG: 5,
    fatG: 15,
    portion: '1 puñado (30g)',
  },
  {
    patterns: [/queso/i, /cheese/i],
    keyword: 'Queso semi-curado / blanco',
    calories: 125,
    proteinG: 9,
    carbsG: 1,
    fatG: 10,
    portion: '1 rebanada gruesa (40g)',
  },
  {
    patterns: [/yogur(t)?\s*griego/i, /greek\s*yogurt/i],
    keyword: 'Yogur griego natural',
    calories: 120,
    proteinG: 15,
    carbsG: 6,
    fatG: 3,
    portion: '1 vaso (170g)',
  },
  {
    patterns: [/yogur(t)?/i],
    keyword: 'Yogur natural',
    calories: 110,
    proteinG: 6,
    carbsG: 12,
    fatG: 4,
    portion: '1 vaso (150g)',
  },
  {
    patterns: [/leche/i, /milk/i],
    keyword: 'Vaso de leche (250ml)',
    calories: 125,
    proteinG: 8,
    carbsG: 12,
    fatG: 5,
    portion: '1 vaso mediano',
  },

  // Frutas & Verduras
  {
    patterns: [/platano/i, /plátano/i, /banana/i, /guineo/i],
    keyword: 'Plátano / Banana',
    calories: 105,
    proteinG: 1,
    carbsG: 27,
    fatG: 0,
    portion: '1 unidad mediana (118g)',
  },
  {
    patterns: [/manzana/i, /apple/i],
    keyword: 'Manzana fresca',
    calories: 80,
    proteinG: 0,
    carbsG: 21,
    fatG: 0,
    portion: '1 unidad mediana (150g)',
  },
  {
    patterns: [/ensalada/i, /salad/i, /lechuga/i],
    keyword: 'Ensalada mixta fresca',
    calories: 75,
    proteinG: 3,
    carbsG: 9,
    fatG: 3,
    portion: '1 bol mediano aliñado ligero',
  },

  // Platos combinados comunes
  {
    patterns: [/pizza/i],
    keyword: 'Porción de Pizza',
    calories: 275,
    proteinG: 12,
    carbsG: 32,
    fatG: 11,
    portion: '1 rebanada grande',
  },
  {
    patterns: [/hamburguesa/i, /burger/i],
    keyword: 'Hamburguesa casera',
    calories: 520,
    proteinG: 30,
    carbsG: 40,
    fatG: 26,
    portion: '1 unidad con pan y carne',
  },
  {
    patterns: [/tacos/i, /taco/i],
    keyword: 'Tacos de carne o pollo (2 uds)',
    calories: 340,
    proteinG: 22,
    carbsG: 32,
    fatG: 14,
    portion: '2 tacos con tortilla de maíz',
  },
  {
    patterns: [/sushi/i, /makis/i, /roll(s)?/i],
    keyword: 'Rolls de Sushi (8 piezas)',
    calories: 350,
    proteinG: 14,
    carbsG: 58,
    fatG: 6,
    portion: '8 piezas',
  },
  {
    patterns: [/cafe/i, /café/i, /coffee/i],
    keyword: 'Café solo o con un toque de leche',
    calories: 25,
    proteinG: 1,
    carbsG: 3,
    fatG: 1,
    portion: '1 taza',
  },
];

/**
 * Intelligent parser that inspects a raw user string (e.g. "Pechuga con arroz", "3 huevos y avena")
 * and extracts matching nutrition components, summing them or finding the best match.
 */
export function estimateNutritionFromFoodName(input: string): FoodEstimate | null {
  const text = input.trim();
  if (text.length < 2) return null;

  // 1. Direct single match
  for (const item of FOOD_DICTIONARY) {
    for (const pat of item.patterns) {
      if (pat.test(text)) {
        // Multiplier detection: e.g. "2 pechugas", "3 huevos", "200g pollo"
        let multiplier = 1;
        const countMatch = text.match(/\b([1-9]|10)\s*(uds|unidades|piezas|huevos|tacos|rebanadas)?\b/i);
        if (countMatch && !item.patterns.some((p) => p.test('2 uds') || p.test('2 huevos'))) {
          const val = Number(countMatch[1]);
          if (val > 1 && val <= 6) {
            multiplier = val;
          }
        }

        const proteinG = Math.round(item.proteinG * multiplier);
        const carbsG = Math.round(item.carbsG * multiplier);
        const fatG = Math.round(item.fatG * multiplier);
        const calories = Math.round(item.calories * multiplier);

        return {
          name: text,
          matchedKeyword: item.keyword + (multiplier > 1 ? ` (x${multiplier})` : ''),
          calories,
          proteinG,
          carbsG,
          fatG,
          portionDesc: item.portion,
          confidence: 'high',
        };
      }
    }
  }

  // 2. Fallback heuristic based on common words
  const lower = text.toLowerCase();
  let basePro = 15;
  let baseCarbs = 25;
  let baseFat = 8;
  let matched = false;

  if (/carne|pollo|pescado|proteina|lomo|cerdo|pavo/i.test(lower)) {
    basePro += 20;
    matched = true;
  }
  if (/arroz|pasta|pan|avena|papa|platano|maiz|harina/i.test(lower)) {
    baseCarbs += 30;
    matched = true;
  }
  if (/aceite|queso|frito|mantequilla|crema|aguacate/i.test(lower)) {
    baseFat += 12;
    matched = true;
  }

  if (matched) {
    const calories = basePro * 4 + baseCarbs * 4 + baseFat * 9;
    return {
      name: text,
      matchedKeyword: 'Estimación combinada',
      calories,
      proteinG: basePro,
      carbsG: baseCarbs,
      fatG: baseFat,
      portionDesc: 'Porción estándar estimada',
      confidence: 'medium',
    };
  }

  return null;
}
