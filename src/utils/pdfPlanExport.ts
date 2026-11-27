import { jsPDF } from 'jspdf';
import {
  AppState,
  BodyMeasurement,
  MealSlot,
} from '../types/health';
import { calculateBmi, FOOD_CATALOG } from '../data/seedData';

interface ExportPlanParams {
  state: AppState;
  today: string;
  latestMeasurement: BodyMeasurement | null;
  nutritionTotals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

const SLOTS: MealSlot[] = ['Desayuno', 'Almuerzo', 'Cena', 'Snack'];

function sanitizePdfText(text: string): string {
  return text
    .replace(/✓/g, '[OK]')
    .replace(/•/g, '-')
    .replace(/–|—/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

export interface GeneratedPdfResult {
  fileName: string;
  blob: Blob;
  dataUri: string;
  file: File;
  totalPages: number;
  download: () => void;
}

export function exportHealthPlanPdf({
  state,
  today,
  latestMeasurement,
  nutritionTotals,
}: ExportPlanParams): GeneratedPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(16);
    doc.setFillColor(116, 216, 52);
    doc.rect(margin, y, 2.5, 6.5, 'F');
    doc.setTextColor(15, 23, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(sanitizePdfText(title), margin + 5, y + 5);
    y += 8;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 105, 95);
      doc.text(sanitizePdfText(subtitle), margin + 5, y + 1);
      y += 5;
    }
    y += 2;
  };

  // --- HEADER BANNER ---
  doc.setFillColor(12, 18, 14);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(116, 216, 52);
  doc.rect(0, 34, pageWidth, 1.5, 'F');

  doc.setTextColor(116, 216, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MI SALUD PRO · PLAN PERSONAL IMPRIMIBLE', margin, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(sanitizePdfText(state.profile.name), margin, 20);

  doc.setTextColor(195, 208, 200);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    sanitizePdfText(
      `Objetivo: ${state.profile.goal}  |  Nivel: ${state.profile.level}  |  Lugar: ${state.profile.location}`
    ),
    margin,
    27
  );

  doc.setTextColor(160, 175, 165);
  doc.text(`Fecha: ${today}`, pageWidth - margin, 11, { align: 'right' });

  y = 43;

  // --- PERFIL Y METAS DIARIAS ---
  const currentWeight = latestMeasurement?.weightKg ?? state.profile.initialWeightKg;
  const currentWaist = latestMeasurement?.waistCm ?? 0;
  const bmi = calculateBmi(currentWeight, state.profile.heightCm);

  drawSectionHeading(
    'Resumen Corporal y Metas Diarias',
    'Parametros actuales de entrenamiento y requerimientos nutricionales'
  );

  ensureSpace(26);
  doc.setFillColor(244, 247, 244);
  doc.setDrawColor(218, 226, 220);
  doc.roundedRect(margin, y, contentWidth, 23, 2.5, 2.5, 'FD');

  doc.setTextColor(25, 34, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    sanitizePdfText(
      `Peso: ${currentWeight} kg   |   Meta: ${state.profile.targetWeightKg} kg   |   Estatura: ${Math.round(
        state.profile.heightCm
      )} cm   |   IMC: ${bmi}${currentWaist ? `   |   Cintura: ${currentWaist} cm` : ''}`
    ),
    margin + 4,
    y + 7
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 68, 60);
  doc.text(
    sanitizePdfText(
      `Calorias objetivo: ${state.profile.calorieTargetMin} - ${state.profile.calorieTargetMax} kcal/dia   |   Agua: ${state.profile.waterTargetLiters} L/dia   |   Sueno: ${state.profile.sleepTargetHours} h`
    ),
    margin + 4,
    y + 13.5
  );
  doc.text(
    sanitizePdfText(
      `Macros diarios: Proteinas ${state.profile.proteinTargetG} g  |  Carbohidratos ${state.profile.carbsTargetG} g  |  Grasas ${state.profile.fatTargetG} g`
    ),
    margin + 4,
    y + 19.5
  );

  y += 30;

  // --- PLAN DE ENTRENAMIENTO ---
  const activeRoutines = state.routines.filter((r) => r.inMyRoutines);
  const routinesToPrint = activeRoutines.length > 0 ? activeRoutines : state.routines;

  drawSectionHeading(
    'Plan de Entrenamiento Activo',
    `${routinesToPrint.length} rutinas seleccionadas en tu plan semanal`
  );

  for (const routine of routinesToPrint) {
    ensureSpace(24);
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(214, 224, 216);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(18, 28, 22);
    doc.text(sanitizePdfText(routine.title), margin + 3.5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 120, 40);
    doc.text(
      sanitizePdfText(
        `${routine.category} · ${routine.level} · ${routine.durationMin} min · ~${routine.caloriesEstimate} kcal · ${routine.location}`
      ),
      margin + 3.5,
      y + 10
    );

    y += 14.5;

    for (let idx = 0; idx < routine.exercises.length; idx += 1) {
      const ex = routine.exercises[idx];
      const cueLines = doc.splitTextToSize(
        sanitizePdfText(`Tecnica: ${ex.instructions}`),
        contentWidth - 8
      );
      ensureSpace(9 + cueLines.length * 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(30, 40, 34);
      doc.text(
        sanitizePdfText(`${idx + 1}. ${ex.name}`),
        margin + 3,
        y + 3.5
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 95, 86);
      doc.text(
        sanitizePdfText(`${ex.sets}  |  Descanso ${ex.restSec}s`),
        pageWidth - margin - 3,
        y + 3.5,
        { align: 'right' }
      );

      y += 5;
      doc.setFontSize(7.8);
      doc.setTextColor(98, 110, 102);
      doc.text(cueLines, margin + 6, y + 2.5);
      y += cueLines.length * 3.8 + 2.5;
    }

    y += 3;
  }

  // --- SESIONES RECIENTES ---
  if (state.workoutSessions.length > 0) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(25, 34, 28);
    doc.text('Ultimas sesiones registradas', margin, y + 4);
    y += 7;

    for (const session of state.workoutSessions.slice(0, 4)) {
      ensureSpace(7);
      const mins = Math.max(1, Math.round(session.durationSec / 60));
      const extra = session.distanceMiles
        ? ` | ${session.distanceMiles.toFixed(2)} mi (${session.avgPaceText || ''})`
        : '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(65, 78, 70);
      doc.text(
        sanitizePdfText(
          `- ${session.completedAt}: ${session.routineTitle} (${mins} min, ${session.caloriesBurned} kcal${extra})`
        ),
        margin + 2,
        y + 3
      );
      y += 5;
    }
    y += 4;
  }

  // --- PLAN DE NUTRICION ---
  const todayMeals = state.meals.filter((m) => m.date === today);

  drawSectionHeading(
    'Plan de Nutricion del Dia',
    `Registrado hoy: ${nutritionTotals.calories} kcal  |  P ${nutritionTotals.proteinG}g · C ${nutritionTotals.carbsG}g · G ${nutritionTotals.fatG}g`
  );

  if (todayMeals.length > 0) {
    for (const meal of todayMeals) {
      ensureSpace(11);
      doc.setFillColor(248, 250, 248);
      doc.setDrawColor(225, 232, 226);
      doc.roundedRect(margin, y, contentWidth, 9.5, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 30, 24);
      doc.text(
        sanitizePdfText(`${meal.completed ? '[x]' : '[ ]'} ${meal.slot}: ${meal.name}`),
        margin + 3,
        y + 4.3
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(80, 95, 86);
      doc.text(
        sanitizePdfText(
          `${meal.calories} kcal  |  P ${meal.proteinG}g · C ${meal.carbsG}g · G ${meal.fatG}g`
        ),
        margin + 3,
        y + 8
      );
      y += 11;
    }
  } else {
    ensureSpace(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(95, 108, 100);
    doc.text('Aun no hay comidas registradas para el dia de hoy.', margin + 2, y + 4);
    y += 8;
  }

  y += 4;

  // --- MENU DE COMIDA REAL POR CATEGORIA ---
  drawSectionHeading(
    'Menu de Comida Real en Rutina',
    'Opciones recomendadas por categoria para tu semana'
  );

  for (const slot of SLOTS) {
    const items = FOOD_CATALOG.filter((f) => f.defaultSlot === slot);
    if (items.length === 0) continue;

    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(45, 120, 20);
    doc.text(sanitizePdfText(slot.toUpperCase()), margin, y + 4);
    y += 6;

    for (const item of items) {
      ensureSpace(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(25, 34, 28);
      doc.text(sanitizePdfText(`- ${item.name}`), margin + 2, y + 3.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(55, 115, 25);
      doc.text(
        `${item.calories} kcal`,
        pageWidth - margin - 2,
        y + 3.2,
        { align: 'right' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(95, 108, 100);
      doc.text(
        sanitizePdfText(
          `  ${item.portion}  (P ${item.proteinG}g · C ${item.carbsG}g · G ${item.fatG}g)`
        ),
        margin + 2,
        y + 7
      );
      y += 9;
    }
    y += 2.5;
  }

  // --- LISTA DE COMPRAS ---
  if (state.shoppingList.length > 0) {
    drawSectionHeading('Lista de Compras');
    for (const shop of state.shoppingList) {
      ensureSpace(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(35, 46, 39);
      doc.text(
        sanitizePdfText(
          `${shop.checked ? '[x]' : '[ ]'} ${shop.name} (${shop.quantity}) - ${shop.category}`
        ),
        margin + 2,
        y + 3.5
      );
      y += 5.2;
    }
  }

  // --- PAGE NUMBERS FOOTER ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(224, 230, 225);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(115, 128, 120);
    doc.text(
      sanitizePdfText(`Mi Salud Pro · Plan personal generado el ${today}`),
      margin,
      pageHeight - 6.5
    );
    doc.text(`Pagina ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, {
      align: 'right',
    });
  }

  const fileName = `mi-salud-pro-plan-${today}.pdf`;
  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const download = () => doc.save(fileName);

  return {
    fileName,
    blob,
    dataUri,
    file,
    totalPages,
    download,
  };
}
