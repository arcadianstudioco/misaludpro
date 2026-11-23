import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/health_models.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class RoutinesScreen extends StatefulWidget {
  final HealthController controller;
  final VoidCallback onOpenKegel;

  const RoutinesScreen({
    super.key,
    required this.controller,
    required this.onOpenKegel,
  });

  @override
  State<RoutinesScreen> createState() => _RoutinesScreenState();
}

class _RoutinesScreenState extends State<RoutinesScreen> {
  bool _explore = false;

  void _startRoutine(WorkoutRoutine routine) {
    if (routine.id == 'kegel') {
      widget.onOpenKegel();
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (_) => _WorkoutTimerSheet(
        routine: routine,
        onFinish: (sec) => widget.controller.completeWorkout(routine, sec),
      ),
    );
  }

  void _openOutdoorRun(String activityType) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _OutdoorRunTrackerScreen(
          activityType: activityType,
          weightKg: widget.controller.profile.initialWeightKg,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final routines = widget.controller.routines;
    final featured = routines.first;
    final rest = routines.skip(1).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Rutinas',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: false, label: Text('Mis Rutinas')),
            ButtonSegment(value: true, label: Text('Explorar')),
          ],
          selected: {_explore},
          onSelectionChanged: (s) => setState(() => _explore = s.first),
        ),
        const SizedBox(height: 14),
        // Apple Fitness-style GPS Running & Walking Card
        Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: const Color(0xFF9CE819).withValues(alpha: 0.35)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.location_on_rounded, color: Color(0xFF9CE819)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Carrera y Caminata GPS',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                    Text('GPS Móvil', style: TextStyle(fontSize: 11, color: Color(0xFF9CE819))),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Cronómetro estilo Apple Fitness · Mapa en vivo',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF9CE819),
                          foregroundColor: Colors.black,
                        ),
                        onPressed: () => _openOutdoorRun('Carrera al aire libre'),
                        icon: const Icon(Icons.directions_run_rounded, size: 18),
                        label: const Text('Correr', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openOutdoorRun('Caminata al aire libre'),
                        icon: const Icon(Icons.directions_walk_rounded, size: 18, color: Color(0xFF9CE819)),
                        label: const Text('Caminar', style: TextStyle(color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(
                    'assets/images/routine_strength_hero.jpg',
                    height: 140,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  featured.title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Nivel: ${featured.level} · ${featured.durationMin} min · Guía 3D',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.lime,
                    foregroundColor: const Color(0xFF081007),
                    minimumSize: const Size.fromHeight(48),
                  ),
                  onPressed: () => _startRoutine(featured),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text(
                    'Iniciar Entrenamiento 3D',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...rest.map(
          (r) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: ListTile(
                onTap: () => _startRoutine(r),
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset(
                    r.id == 'cardio-quemagrasa'
                        ? 'assets/images/routine_cardio_thumb.jpg'
                        : r.id == 'movilidad'
                            ? 'assets/images/routine_mobility_thumb.jpg'
                            : 'assets/images/routine_kegel_thumb.jpg',
                    width: 48,
                    height: 48,
                    fit: BoxFit.cover,
                  ),
                ),
                title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('${r.durationMin} min · ${r.category} · Guía 3D'),
                trailing: const Icon(Icons.chevron_right),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Interactive 3D-projected skeletal exercise guide painted natively in Flutter.
class _Exercise3DPreview extends StatefulWidget {
  final String exerciseName;
  const _Exercise3DPreview({required this.exerciseName});

  @override
  State<_Exercise3DPreview> createState() => _Exercise3DPreviewState();
}

class _Exercise3DPreviewState extends State<_Exercise3DPreview>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  double _yaw = 0.55;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: (d) => setState(() => _yaw += d.delta.dx * 0.012),
      child: Container(
        height: 190,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0C110E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white12),
        ),
        child: AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) => CustomPaint(
            painter: _Skeleton3DPainter(
              phase: _ctrl.value * math.pi * 2,
              yaw: _yaw,
              exerciseName: widget.exerciseName.toLowerCase(),
            ),
          ),
        ),
      ),
    );
  }
}

class _Skeleton3DPainter extends CustomPainter {
  final double phase;
  final double yaw;
  final String exerciseName;

  _Skeleton3DPainter({
    required this.phase,
    required this.yaw,
    required this.exerciseName,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.72;
    const scale = 68.0;

    Offset proj(double x, double y, double z) {
      final rx = x * math.cos(yaw) - z * math.sin(yaw);
      final rz = x * math.sin(yaw) + z * math.cos(yaw);
      final p = 3.2 / (3.2 - rz);
      return Offset(cx + rx * scale * p, cy - y * scale * p);
    }

    final bonePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;
    final accentPaint = Paint()..color = AppColors.lime;

    final s = (1 - math.cos(phase)) * 0.5;
    final hipY = exerciseName.contains('sentadilla') ? 0.9 - s * 0.35 : 0.95;
    final hip = proj(0, hipY, 0);
    final chest = proj(0, hipY + 0.52, exerciseName.contains('sentadilla') ? s * 0.14 : 0);
    final head = proj(0, hipY + 0.76, exerciseName.contains('sentadilla') ? s * 0.2 : 0);
    final armRaise = exerciseName.contains('jumping') ? s * 0.7 : s * 0.35;
    final lHand = proj(-0.36 - armRaise * 0.2, hipY + 0.3 + armRaise * 0.6, 0.2);
    final rHand = proj(0.36 + armRaise * 0.2, hipY + 0.3 + armRaise * 0.6, 0.2);
    final lFoot = proj(-0.18, 0.04, 0);
    final rFoot = proj(0.18, 0.04, 0);

    canvas.drawLine(hip, chest, bonePaint);
    canvas.drawLine(chest, lHand, bonePaint);
    canvas.drawLine(chest, rHand, bonePaint);
    canvas.drawLine(hip, lFoot, bonePaint);
    canvas.drawLine(hip, rFoot, bonePaint);
    canvas.drawCircle(head, 12, accentPaint);
  }

  @override
  bool shouldRepaint(covariant _Skeleton3DPainter oldDelegate) => true;
}

class _WorkoutTimerSheet extends StatefulWidget {
  final WorkoutRoutine routine;
  final ValueChanged<int> onFinish;
  const _WorkoutTimerSheet({required this.routine, required this.onFinish});

  @override
  State<_WorkoutTimerSheet> createState() => _WorkoutTimerSheetState();
}

class _WorkoutTimerSheetState extends State<_WorkoutTimerSheet> {
  int _idx = 0;
  int _sec = 45;
  int _elapsed = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _sec = widget.routine.exercises.first.durationSec;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _elapsed++;
        if (_sec > 1) {
          _sec--;
        } else if (_idx + 1 < widget.routine.exercises.length) {
          _idx++;
          _sec = widget.routine.exercises[_idx].durationSec;
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ex = widget.routine.exercises[_idx];
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(widget.routine.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _Exercise3DPreview(exerciseName: ex.name),
          const SizedBox(height: 14),
          Text('${_sec}s',
              style: const TextStyle(
                  fontSize: 44, fontWeight: FontWeight.bold, color: AppColors.lime)),
          const SizedBox(height: 6),
          Text(ex.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(ex.instructions,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.lime,
              foregroundColor: const Color(0xFF081007),
              minimumSize: const Size.fromHeight(48),
            ),
            onPressed: () {
              widget.onFinish(_elapsed);
              Navigator.of(context).pop();
            },
            child: const Text('Finalizar y guardar sesión'),
          ),
        ],
      ),
    );
  }
}

class _OutdoorRunTrackerScreen extends StatefulWidget {
  final String activityType;
  final double weightKg;

  const _OutdoorRunTrackerScreen({
    required this.activityType,
    required this.weightKg,
  });

  @override
  State<_OutdoorRunTrackerScreen> createState() => _OutdoorRunTrackerScreenState();
}

class _OutdoorRunTrackerScreenState extends State<_OutdoorRunTrackerScreen> {
  final List<LatLng> _route = [];
  StreamSubscription<Position>? _posSub;
  Timer? _timer;
  int _elapsedSec = 0;
  double _distanceMeters = 0;
  double _altitudeGainM = 0.6;
  bool _running = false;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    final perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return;
    }
    final pos = await Geolocator.getCurrentPosition();
    if (!mounted) return;
    setState(() {
      _route.add(LatLng(pos.latitude, pos.longitude));
    });
  }

  void _toggleStart() {
    if (_running) {
      _timer?.cancel();
      _posSub?.cancel();
      setState(() => _running = false);
      return;
    }
    setState(() => _running = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _elapsedSec++);
    });
    _posSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 4,
      ),
    ).listen((pos) {
      final next = LatLng(pos.latitude, pos.longitude);
      setState(() {
        if (_route.isNotEmpty) {
          _distanceMeters += Geolocator.distanceBetween(
            _route.last.latitude,
            _route.last.longitude,
            next.latitude,
            next.longitude,
          );
        }
        if (pos.altitude > 0) _altitudeGainM = math.max(_altitudeGainM, pos.altitude * 0.05);
        _route.add(next);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _posSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final miles = _distanceMeters / 1609.344;
    final activeCal = math.max(1, (miles * widget.weightKg * 0.9).round());
    final totalCal = activeCal + math.max(1, (_elapsedSec / 60 * 1.4).round());
    final altFeet = math.max(2, (_altitudeGainM * 3.28084).round());
    final mm = (_elapsedSec ~/ 60).toString().padLeft(2, '0');
    final ss = (_elapsedSec % 60).toString().padLeft(2, '0');

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(widget.activityType),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 260,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: _route.isNotEmpty ? _route.last : const LatLng(19.4326, -99.1332),
                zoom: 16,
              ),
              myLocationEnabled: true,
              polylines: {
                if (_route.length >= 2)
                  Polyline(
                    polylineId: const PolylineId('run_route'),
                    points: _route,
                    width: 6,
                    color: const Color(0xFF9CE819),
                  ),
              },
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${miles.toStringAsFixed(2)} MI',
                      style: const TextStyle(
                          fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF9CE819))),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1C1C1E),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Duración del entrenamiento', style: TextStyle(color: Colors.white70)),
                        Text('$mm:$ss',
                            style: const TextStyle(
                                fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFFFFE620))),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _Metric('Distancia', '${miles.toStringAsFixed(2)} MI', const Color(0xFF0A95FF)),
                            _Metric('Calorías activas', '$activeCal CAL', const Color(0xFFFA114F)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _Metric('Calorías en total', '$totalCal CAL', const Color(0xFFFA114F)),
                            _Metric('Altitud', '$altFeet PIES', const Color(0xFF9CE819)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: _running ? const Color(0xFFFFE620) : const Color(0xFF9CE819),
                            foregroundColor: Colors.black,
                            minimumSize: const Size.fromHeight(50),
                          ),
                          onPressed: _toggleStart,
                          child: Text(_running ? 'Pausar' : 'Iniciar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFFFA114F),
                            minimumSize: const Size.fromHeight(50),
                          ),
                          onPressed: () {
                            _timer?.cancel();
                            _posSub?.cancel();
                            setState(() {
                              _running = false;
                              _saved = true;
                            });
                          },
                          child: Text(_saved ? 'Guardado ✓' : 'Finalizar'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Metric(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
