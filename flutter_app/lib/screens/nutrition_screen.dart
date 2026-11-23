import 'package:flutter/material.dart';
import '../models/health_models.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class NutritionScreen extends StatefulWidget {
  final HealthController controller;
  const NutritionScreen({super.key, required this.controller});

  @override
  State<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends State<NutritionScreen> {
  String _selectedSlot = 'Todos';

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final avgTarget =
        (controller.profile.calorieTargetMin + controller.profile.calorieTargetMax) / 2;
    final pct = ((controller.totalCalories / avgTarget) * 100).round().clamp(0, 100);

    final filteredMeals = _selectedSlot == 'Todos'
        ? controller.meals
        : controller.meals.where((m) => m.slot == _selectedSlot).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Nutrición',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            TextButton.icon(
              onPressed: () => _showShoppingDialog(context),
              icon: const Icon(Icons.shopping_bag_outlined, color: AppColors.lime),
              label: Text('Lista (${controller.shoppingList.where((i) => !i.checked).length})'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(
                    'assets/images/nutrition_meal_bowl.jpg',
                    height: 130,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tu plan de hoy',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text('Calorías objetivo',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        Text(
                          '${controller.profile.calorieTargetMin} – ${controller.profile.calorieTargetMax} kcal',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    SizedBox(
                      width: 72,
                      height: 72,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CircularProgressIndicator(
                            value: pct / 100.0,
                            strokeWidth: 7,
                            backgroundColor: const Color(0xFF212B24),
                            color: AppColors.lime,
                          ),
                          Text('$pct%', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _MacroBar(
                  label: 'Proteínas',
                  current: controller.totalProtein,
                  target: controller.profile.proteinTargetG,
                  color: AppColors.lime,
                ),
                const SizedBox(height: 12),
                _MacroBar(
                  label: 'Carbohidratos',
                  current: controller.totalCarbs,
                  target: controller.profile.carbsTargetG,
                  color: AppColors.carbsAmber,
                ),
                const SizedBox(height: 12),
                _MacroBar(
                  label: 'Grasas',
                  current: controller.totalFat,
                  target: controller.profile.fatTargetG,
                  color: AppColors.fatOrange,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Slot Selector
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: ['Todos', 'Desayuno', 'Almuerzo', 'Cena', 'Snack'].map((slot) {
              final isSel = _selectedSlot == slot;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(slot),
                  selected: isSel,
                  onSelected: (_) => setState(() => _selectedSlot = slot),
                  selectedColor: AppColors.lime.withValues(alpha: 0.2),
                  checkmarkColor: AppColors.lime,
                  labelStyle: TextStyle(
                    color: isSel ? AppColors.lime : AppColors.textSecondary,
                    fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Comidas (${filteredMeals.length})',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            FloatingActionButton.small(
              backgroundColor: AppColors.lime,
              foregroundColor: const Color(0xFF081007),
              onPressed: () => _showAddMealDialog(context),
              child: const Icon(Icons.add),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (filteredMeals.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(
              child: Text(
                'No hay comidas registradas en esta sección.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
          )
        else
          ...filteredMeals.map(
            (m) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: ListTile(
                  leading: IconButton(
                    icon: Icon(
                      m.completed ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: m.completed ? AppColors.lime : Colors.white38,
                    ),
                    onPressed: () => controller.toggleMealCompleted(m.id),
                  ),
                  title: Text(
                    m.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      decoration: m.completed ? TextDecoration.none : TextDecoration.lineThrough,
                      color: m.completed ? Colors.white : Colors.white38,
                    ),
                  ),
                  subtitle: Text(
                    '${m.slot} · P: ${m.proteinG}g · C: ${m.carbsG}g · G: ${m.fatG}g',
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${m.calories} kcal',
                        style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                        onPressed: () => controller.deleteMeal(m.id),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  void _showAddMealDialog(BuildContext context) {
    String slot = _selectedSlot == 'Todos' ? 'Almuerzo' : _selectedSlot;
    final nameCtrl = TextEditingController();
    final proCtrl = TextEditingController(text: '30');
    final carbsCtrl = TextEditingController(text: '45');
    final fatCtrl = TextEditingController(text: '12');
    final calCtrl = TextEditingController(text: '408');

    void updateCal() {
      final p = int.tryParse(proCtrl.text) ?? 0;
      final c = int.tryParse(carbsCtrl.text) ?? 0;
      final f = int.tryParse(fatCtrl.text) ?? 0;
      calCtrl.text = '${p * 4 + c * 4 + f * 9}';
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Registrar comida'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: slot,
                  decoration: const InputDecoration(labelText: 'Momento'),
                  items: ['Desayuno', 'Almuerzo', 'Cena', 'Snack']
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setDlgState(() => slot = v ?? slot),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nombre del plato',
                    hintText: 'Ej. Pechuga con arroz y verduras',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: proCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Prot (g)'),
                        onChanged: (_) => setDlgState(updateCal),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: carbsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Carb (g)'),
                        onChanged: (_) => setDlgState(updateCal),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: fatCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Grasa (g)'),
                        onChanged: (_) => setDlgState(updateCal),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: calCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Calorías (kcal)',
                    helperText: 'Calculado automáticamente (P×4 + C×4 + G×9)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.lime, foregroundColor: Colors.black),
              onPressed: () {
                widget.controller.addMeal(
                  MealEntry(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    slot: slot,
                    name: nameCtrl.text.trim().isEmpty ? 'Comida saludable' : nameCtrl.text.trim(),
                    calories: int.tryParse(calCtrl.text) ?? 400,
                    proteinG: int.tryParse(proCtrl.text) ?? 30,
                    carbsG: int.tryParse(carbsCtrl.text) ?? 45,
                    fatG: int.tryParse(fatCtrl.text) ?? 12,
                    completed: true,
                  ),
                );
                Navigator.pop(ctx);
              },
              child: const Text('Guardar comida'),
            ),
          ],
        ),
      ),
    );
  }

  void _showShoppingDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1 unidad');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SizedBox(
            height: 480,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Lista de compras',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          hintText: 'Añadir alimento…',
                          isDense: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 1,
                      child: TextField(
                        controller: qtyCtrl,
                        decoration: const InputDecoration(
                          hintText: 'Cant.',
                          isDense: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      style: IconButton.styleFrom(backgroundColor: AppColors.lime, foregroundColor: Colors.black),
                      onPressed: () {
                        if (nameCtrl.text.trim().isNotEmpty) {
                          widget.controller.addShoppingItem(nameCtrl.text.trim(), qtyCtrl.text.trim());
                          nameCtrl.clear();
                          setSheetState(() {});
                        }
                      },
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView(
                    children: widget.controller.shoppingList.map((item) {
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Checkbox(
                          value: item.checked,
                          activeColor: AppColors.lime,
                          onChanged: (_) {
                            widget.controller.toggleShopping(item.id);
                            setSheetState(() {});
                          },
                        ),
                        title: Text(
                          item.name,
                          style: TextStyle(
                            decoration: item.checked ? TextDecoration.lineThrough : null,
                            color: item.checked ? Colors.white38 : Colors.white,
                          ),
                        ),
                        subtitle: Text(item.quantity),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.white38),
                          onPressed: () {
                            widget.controller.deleteShoppingItem(item.id);
                            setSheetState(() {});
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MacroBar extends StatelessWidget {
  final String label;
  final int current;
  final int target;
  final Color color;

  const _MacroBar({
    required this.label,
    required this.current,
    required this.target,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final pct = (current / (target > 0 ? target : 1)).clamp(0.0, 1.0);
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            Text('$current / $target g',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: pct,
          minHeight: 8,
          borderRadius: BorderRadius.circular(99),
          backgroundColor: const Color(0xFF1E2721),
          color: color,
        ),
      ],
    );
  }
}
