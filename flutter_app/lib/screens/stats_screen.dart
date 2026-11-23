import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/health_models.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class StatsScreen extends StatefulWidget {
  final HealthController controller;
  const StatsScreen({super.key, required this.controller});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen>
    with SingleTickerProviderStateMixin {
  String _range = '30d';
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Estadísticas',
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white),
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: const Color(0xFF081007),
                ),
                onPressed: () => _showLogDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Registrar'),
              ),
            ],
          ),
        ),
        // Tabs
        TabBar(
          controller: _tab,
          indicatorColor: AppColors.lime,
          labelColor: AppColors.lime,
          unselectedLabelColor: AppColors.textSecondary,
          tabs: const [
            Tab(text: 'Cuerpo'),
            Tab(text: 'Sesiones'),
            Tab(text: 'Fotos'),
            Tab(text: 'Notas'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: [
              _BodyTab(controller: widget.controller, range: _range,
                  onRangeChange: (r) => setState(() => _range = r)),
              _SessionsTab(controller: widget.controller),
              _PhotosTab(controller: widget.controller),
              _NotesTab(controller: widget.controller),
            ],
          ),
        ),
      ],
    );
  }

  void _showLogDialog(BuildContext context) {
    final wCtrl = TextEditingController(
        text: '${widget.controller.currentWeight}');
    final cCtrl = TextEditingController(
        text: '${widget.controller.currentWaist}');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Registrar peso y cintura'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: wCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Peso (kg)'),
            ),
            TextField(
              controller: cCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Cintura (cm)'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () {
              final w = double.tryParse(wCtrl.text) ??
                  widget.controller.currentWeight;
              final c = double.tryParse(cCtrl.text) ??
                  widget.controller.currentWaist;
              final now = DateTime.now();
              widget.controller.addMeasurement(BodyMeasurement(
                date:
                    '${now.year}-${now.month.toString().padLeft(2,'0')}-${now.day.toString().padLeft(2,'0')}',
                weightKg: w,
                waistCm: c,
                abdomenCm: c + 2,
                chestCm: 102,
                armsCm: 36,
              ));
              Navigator.pop(context);
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }
}

// ─── Body Tab ─────────────────────────────────────────────────────────────────
class _BodyTab extends StatelessWidget {
  final HealthController controller;
  final String range;
  final ValueChanged<String> onRangeChange;
  const _BodyTab(
      {required this.controller,
      required this.range,
      required this.onRangeChange});

  @override
  Widget build(BuildContext context) {
    final list = controller.measurements;
    final latest = list.isNotEmpty ? list.last : null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: '7d', label: Text('7d')),
            ButtonSegment(value: '30d', label: Text('30d')),
            ButtonSegment(value: '90d', label: Text('90d')),
            ButtonSegment(value: '1a', label: Text('1a')),
          ],
          selected: {range},
          onSelectionChanged: (s) => onRangeChange(s.first),
        ),
        const SizedBox(height: 14),
        // Body fat card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Composición corporal estimada',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _BigStat(
                        label: 'Grasa corporal',
                        value: '${controller.bodyFatPercent.toStringAsFixed(1)}%',
                        color: AppColors.carbsAmber,
                      ),
                    ),
                    Expanded(
                      child: _BigStat(
                        label: 'IMC',
                        value: controller.profile.bmi.toStringAsFixed(1),
                        color: AppColors.lime,
                      ),
                    ),
                    Expanded(
                      child: _BigStat(
                        label: 'Peso',
                        value: '${controller.currentWeight.toStringAsFixed(1)} kg',
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        // Weight Chart
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Peso (kg)',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(
                      '${controller.currentWeight.toStringAsFixed(1)} kg',
                      style: const TextStyle(
                          color: AppColors.lime,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 140,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: _WeightChartPainter(
                      list.map((e) => e.weightKg).toList(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        // Measurements
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Medidas corporales',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                _MeasureRow(
                    label: 'Cintura',
                    cm: latest?.waistCm ?? 94,
                    delta: controller.waistDelta),
                _MeasureRow(
                    label: 'Abdomen',
                    cm: latest?.abdomenCm ?? 96,
                    delta: 0),
                _MeasureRow(
                    label: 'Pecho', cm: latest?.chestCm ?? 102, delta: 0),
                _MeasureRow(
                    label: 'Brazos', cm: latest?.armsCm ?? 36, delta: 0),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _BigStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _BigStat(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(
                fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
class _SessionsTab extends StatelessWidget {
  final HealthController controller;
  const _SessionsTab({required this.controller});

  @override
  Widget build(BuildContext context) {
    final sessions = controller.completedSessions;
    final kegelSessions = controller.kegelSessions;

    if (sessions.isEmpty && kegelSessions.isEmpty) {
      return const Center(
        child: Text('Aún no hay sesiones registradas.',
            style: TextStyle(color: AppColors.textSecondary)),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (sessions.isNotEmpty) ...[
          const Text('Entrenamientos',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          ...sessions.map((s) => Card(
                child: ListTile(
                  leading: const Icon(Icons.fitness_center_rounded,
                      color: AppColors.lime),
                  title: Text(s.title,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                      '${(s.durationSec / 60).ceil()} min · ${s.caloriesBurned} kcal'),
                  trailing: Text(
                    _formatDate(s.completedAt),
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ),
              )),
          const SizedBox(height: 14),
        ],
        if (kegelSessions.isNotEmpty) ...[
          const Text('Sesiones Kegel',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          ...kegelSessions.map((s) => Card(
                child: ListTile(
                  leading: const Icon(Icons.spa_rounded, color: AppColors.lime),
                  title: Text('${s.cycles} ciclos · ${s.holdSec}s / ${s.relaxSec}s',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  trailing: Text(
                    _formatDate(s.completedAt),
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ),
              )),
        ],
      ],
    );
  }

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
    } catch (_) {
      return isoDate;
    }
  }
}

// ─── Photos Tab ───────────────────────────────────────────────────────────────
class _PhotosTab extends StatelessWidget {
  final HealthController controller;
  const _PhotosTab({required this.controller});

  @override
  Widget build(BuildContext context) {
    final photos = controller.progressPhotos;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Fotos de progreso',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.lime,
                    foregroundColor: Colors.black),
                onPressed: () => _pickPhoto(context),
                icon: const Icon(Icons.camera_alt_rounded, size: 18),
                label: const Text('Añadir'),
              ),
            ],
          ),
        ),
        if (photos.isEmpty)
          const Expanded(
            child: Center(
              child: Text('Añade tu primera foto de progreso.',
                  style: TextStyle(color: AppColors.textSecondary)),
            ),
          )
        else
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: photos.length,
              itemBuilder: (context, i) {
                final p = photos[i];
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: p.dataUrl.startsWith('/')
                          ? Image.file(File(p.dataUrl), fit: BoxFit.cover)
                          : Image.network(p.dataUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                    color: AppColors.surface,
                                    child: const Icon(Icons.image_rounded,
                                        color: AppColors.lime),
                                  )),
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(
                              bottom: Radius.circular(16)),
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withOpacity(0.7)
                            ],
                          ),
                        ),
                        padding: const EdgeInsets.all(8),
                        child: Text(p.label,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () => controller.deleteProgressPhoto(p.id),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: const Icon(Icons.close,
                              size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
      ],
    );
  }

  Future<void> _pickPhoto(BuildContext context) async {
    final labelCtrl = TextEditingController(text: 'Progreso');
    String? pickedPath;

    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(source: ImageSource.gallery);
      if (xfile != null) pickedPath = xfile.path;
    } catch (_) {
      // Image picker not available on all emulators; use placeholder
    }

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Etiquetar foto'),
        content: TextField(
          controller: labelCtrl,
          decoration: const InputDecoration(labelText: 'Etiqueta (ej. Semana 1)'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () {
              final now = DateTime.now();
              controller.addProgressPhoto(ProgressPhoto(
                id: now.millisecondsSinceEpoch.toString(),
                label: labelCtrl.text.trim().isEmpty ? 'Progreso' : labelCtrl.text.trim(),
                dataUrl: pickedPath ?? 'https://picsum.photos/seed/${now.millisecondsSinceEpoch}/400/400',
                date:
                    '${now.year}-${now.month.toString().padLeft(2,'0')}-${now.day.toString().padLeft(2,'0')}',
              ));
              Navigator.pop(context);
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
class _NotesTab extends StatefulWidget {
  final HealthController controller;
  const _NotesTab({required this.controller});

  @override
  State<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<_NotesTab> {
  late TextEditingController _noteCtrl;
  String _selectedDate = '';

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    _noteCtrl = TextEditingController(
        text: widget.controller.dailyNotes[_selectedDate] ?? '');
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allDates = widget.controller.dailyNotes.keys.toList()
      ..sort((a, b) => b.compareTo(a));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Nota de hoy',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 10),
                TextField(
                  controller: _noteCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: '¿Cómo te sientes hoy? Anota tus notas de salud…',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.lime,
                        foregroundColor: Colors.black),
                    onPressed: () {
                      widget.controller.saveDailyNote(_noteCtrl.text,
                          dateIso: _selectedDate);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Nota guardada')));
                    },
                    icon: const Icon(Icons.save_rounded, size: 16),
                    label: const Text('Guardar nota'),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (allDates.isNotEmpty) ...[
          const SizedBox(height: 14),
          const Text('Notas anteriores',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          ...allDates.take(10).map((date) {
            final note = widget.controller.dailyNotes[date] ?? '';
            if (note.trim().isEmpty) return const SizedBox.shrink();
            return Card(
              child: ListTile(
                leading: const Icon(Icons.edit_note_rounded,
                    color: AppColors.lime),
                title: Text(note,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13)),
                subtitle: Text(date,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () {
                    widget.controller.saveDailyNote('', dateIso: date);
                    setState(() {});
                  },
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
class _MeasureRow extends StatelessWidget {
  final String label;
  final double cm;
  final double delta;
  const _MeasureRow(
      {required this.label, required this.cm, required this.delta});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Row(
            children: [
              Text('${cm.round()} cm',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(width: 20),
              Text(
                delta == 0
                    ? '—'
                    : '${delta > 0 ? '+' : ''}${delta.toStringAsFixed(1)} cm',
                style: TextStyle(
                  fontSize: 12,
                  color: delta < 0 ? AppColors.lime : Colors.red.shade300,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WeightChartPainter extends CustomPainter {
  final List<double> weights;
  _WeightChartPainter(this.weights);

  @override
  void paint(Canvas canvas, Size size) {
    if (weights.isEmpty) return;
    final minVal = weights.reduce((a, b) => a < b ? a : b) - 2;
    final maxVal = weights.reduce((a, b) => a > b ? a : b) + 2;
    final span = (maxVal - minVal).clamp(1.0, 200.0);

    final paint = Paint()
      ..color = AppColors.lime
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [AppColors.lime.withOpacity(0.3), Colors.transparent],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    final fillPath = Path();
    for (int i = 0; i < weights.length; i++) {
      final x = weights.length == 1
          ? size.width / 2
          : (i / (weights.length - 1)) * size.width;
      final y =
          size.height - ((weights[i] - minVal) / span) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 4, Paint()..color = AppColors.lime);
    }
    fillPath.lineTo(size.width, size.height);
    fillPath.close();
    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
