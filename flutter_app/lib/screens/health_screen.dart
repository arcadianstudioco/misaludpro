import 'dart:async';
import 'package:flutter/material.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class HealthScreen extends StatefulWidget {
  final HealthController controller;
  const HealthScreen({super.key, required this.controller});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  bool _running = false;
  bool _contract = true;
  int _secLeft = 5;
  int _cycle = 1;
  Timer? _timer;

  void _toggleKegel() {
    if (_running) {
      _timer?.cancel();
      setState(() => _running = false);
      return;
    }
    setState(() => _running = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        if (_secLeft > 1) {
          _secLeft--;
        } else if (_contract) {
          _contract = false;
          _secLeft = 5;
        } else if (_cycle < 10) {
          _cycle++;
          _contract = true;
          _secLeft = 5;
        } else {
          _running = false;
          _timer?.cancel();
          widget.controller.recordKegel(10, 5, 5);
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
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Salud y Hábitos'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hidratación: ${widget.controller.waterLiters.toStringAsFixed(2)} / ${widget.controller.profile.waterTargetLiters} L',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => widget.controller.addWater(0.25),
                          child: const Text('+250 ml'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.hydrationTeal,
                            foregroundColor: Colors.black,
                          ),
                          onPressed: () => widget.controller.addWater(0.5),
                          child: const Text('+500 ml'),
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sueño: ${widget.controller.sleepHours} h (Objetivo 7–9 h)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Slider(
                    value: widget.controller.sleepHours.clamp(4.0, 10.0),
                    min: 4,
                    max: 10,
                    divisions: 12,
                    activeColor: AppColors.lime,
                    onChanged: widget.controller.setSleep,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'Guía de Suelo Pélvico (Kegel)',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  CircleAvatar(
                    radius: 56,
                    backgroundColor: _contract
                        ? AppColors.lime.withOpacity(0.18)
                        : AppColors.hydrationTeal.withOpacity(0.18),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_contract ? 'CONTRAER' : 'RELAJAR',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('${_secLeft}s',
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text('Ciclo $_cycle de 10',
                      style: const TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.lime,
                      foregroundColor: const Color(0xFF081007),
                      minimumSize: const Size.fromHeight(46),
                    ),
                    onPressed: _toggleKegel,
                    icon: Icon(_running ? Icons.pause : Icons.play_arrow),
                    label: Text(_running ? 'Pausar guía' : 'Iniciar guía'),
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
