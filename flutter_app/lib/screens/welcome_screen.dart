import 'package:flutter/material.dart';
import '../models/health_models.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class WelcomeScreen extends StatefulWidget {
  final HealthController controller;
  const WelcomeScreen({super.key, required this.controller});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  bool _showOnboarding = false;
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _ageCtrl = TextEditingController(text: '33');
  final _heightCtrl = TextEditingController(text: '182.88');
  final _weightCtrl = TextEditingController(text: '100');
  final _waistCtrl = TextEditingController(text: '94');
  String _goal = 'Reducir grasa y ganar salud';
  String _level = 'Intermedio';

  @override
  Widget build(BuildContext context) {
    if (_showOnboarding) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: AppColors.background,
          title: const Text('Configura tu perfil'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => setState(() => _showOnboarding = false),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Nombre completo'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                decoration:
                    const InputDecoration(labelText: 'Correo electrónico'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ageCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Edad'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _heightCtrl,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Estatura (cm)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _weightCtrl,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Peso inicial (kg)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _waistCtrl,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Cintura (cm)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _goal,
                decoration: const InputDecoration(labelText: 'Objetivo'),
                items: const [
                  DropdownMenuItem(
                    value: 'Reducir grasa y ganar salud',
                    child: Text('Reducir grasa y ganar salud'),
                  ),
                  DropdownMenuItem(
                    value: 'Ganar masa muscular',
                    child: Text('Ganar masa muscular'),
                  ),
                ],
                onChanged: (v) => setState(() => _goal = v ?? _goal),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _level,
                decoration: const InputDecoration(labelText: 'Nivel'),
                items: const [
                  DropdownMenuItem(
                      value: 'Principiante', child: Text('Principiante')),
                  DropdownMenuItem(
                      value: 'Intermedio', child: Text('Intermedio')),
                  DropdownMenuItem(value: 'Avanzado', child: Text('Avanzado')),
                ],
                onChanged: (v) => setState(() => _level = v ?? _level),
              ),
              const SizedBox(height: 24),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: const Color(0xFF081007),
                  minimumSize: const Size.fromHeight(52),
                ),
                onPressed: () {
                  final weight = double.tryParse(_weightCtrl.text) ?? 100;
                  final waist = double.tryParse(_waistCtrl.text) ?? 94;
                  widget.controller.createProfile(
                    UserProfile(
                      name: _nameCtrl.text.trim().isEmpty
                          ? 'Usuario'
                          : _nameCtrl.text.trim(),
                      email: _emailCtrl.text.trim().isEmpty
                          ? 'usuario@misaludpro.app'
                          : _emailCtrl.text.trim(),
                      age: int.tryParse(_ageCtrl.text) ?? 33,
                      heightCm: double.tryParse(_heightCtrl.text) ?? 182.88,
                      initialWeightKg: weight,
                      targetWeightKg: weight - 8,
                      goal: _goal,
                      level: _level,
                      calorieTargetMin: 2200,
                      calorieTargetMax: 2400,
                      proteinTargetG: (weight * 1.5).round(),
                      carbsTargetG: 260,
                      fatTargetG: 75,
                    ),
                    waist,
                  );
                },
                child: const Text(
                  'Guardar perfil y empezar',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.asset(
                  'assets/images/welcome_athlete_hero.jpg',
                  height: 240,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 240,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Center(
                        child: Icon(Icons.fitness_center,
                            size: 64, color: AppColors.lime),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Mi Salud Pro',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Mejora. Cuida. Avanza.',
                style: TextStyle(
                  fontSize: 15,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: const Color(0xFF081007),
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                onPressed: () => setState(() => _showOnboarding = true),
                child: const Text(
                  'Comenzar',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: widget.controller.loadDemoAccount,
                child: const Text(
                  'Iniciar sesión (Perfil demo MVP)',
                  style: TextStyle(color: AppColors.textPrimary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
