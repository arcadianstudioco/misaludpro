import 'package:flutter/material.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  final HealthController controller;
  const ProfileScreen({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    final p = controller.profile;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Perfil',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),
        // ── Profile Card ───────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      backgroundImage: AssetImage('assets/images/user_profile_avatar.jpg'),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.name,
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold)),
                          Text(p.email,
                              style: const TextStyle(color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('Edad: ${p.age} años · Estatura: ${p.heightCm.toStringAsFixed(0)} cm'),
                Text('Objetivo: ${p.goal}'),
                Text('Nivel: ${p.level}'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _ProfileStat(
                        label: 'IMC', value: p.bmi.toStringAsFixed(1)),
                    const SizedBox(width: 16),
                    _ProfileStat(
                        label: 'Grasa est.',
                        value: '${controller.bodyFatPercent.toStringAsFixed(1)}%'),
                    const SizedBox(width: 16),
                    _ProfileStat(
                        label: 'Peso obj.',
                        value: '${p.targetWeightKg.toStringAsFixed(0)} kg'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Sync / Offline Card ────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.storage_rounded, color: AppColors.lime, size: 18),
                    SizedBox(width: 8),
                    Text('Persistencia local y nube',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                _SyncRow(
                    icon: Icons.phone_android_rounded,
                    label: 'Almacenamiento local',
                    value: 'SharedPreferences activo'),
                _SyncRow(
                    icon: Icons.wifi_rounded,
                    label: 'Estado de conexión',
                    value: controller.isOnline ? 'En línea' : 'Sin conexión'),
                _SyncRow(
                    icon: controller.syncStatus == SyncStatus.synced
                        ? Icons.cloud_done_rounded
                        : Icons.cloud_upload_outlined,
                    label: 'Estado de sync',
                    value: _syncLabel(controller.syncStatus)),
                if (controller.pendingChanges > 0)
                  _SyncRow(
                      icon: Icons.pending_rounded,
                      label: 'Cambios pendientes',
                      value: '${controller.pendingChanges}'),
                const SizedBox(height: 10),
                SwitchListTile(
                  value: controller.isSimulatedOffline,
                  activeThumbColor: Colors.amber,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Simular modo sin conexión'),
                  onChanged: (_) => controller.toggleSimulatedOffline(),
                ),
                if (controller.pendingChanges > 0 &&
                    controller.isOnline &&
                    !controller.isSimulatedOffline)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.lime,
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(44)),
                    onPressed: controller.manualSync,
                    icon: const Icon(Icons.sync_rounded, size: 18),
                    label: const Text('Sincronizar ahora'),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Reminders ─────────────────────────────────────────────────────
        Card(
          child: Column(
            children: [
              SwitchListTile(
                value: controller.remindWorkout,
                activeThumbColor: AppColors.lime,
                title: const Text('Recordatorio de entrenamiento'),
                onChanged: (v) => controller.setReminder(workout: v),
              ),
              SwitchListTile(
                value: controller.remindWater,
                activeThumbColor: AppColors.lime,
                title: const Text('Recordatorio de hidratación'),
                onChanged: (v) => controller.setReminder(water: v),
              ),
              SwitchListTile(
                value: controller.remindKegel,
                activeThumbColor: AppColors.lime,
                title: const Text('Recordatorio de suelo pélvico'),
                onChanged: (v) => controller.setReminder(kegel: v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ── Targets ────────────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Objetivos nutricionales',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                _TargetRow(label: 'Calorías',
                    value: '${p.calorieTargetMin}–${p.calorieTargetMax} kcal'),
                _TargetRow(label: 'Proteínas', value: '${p.proteinTargetG} g'),
                _TargetRow(label: 'Carbohidratos', value: '${p.carbsTargetG} g'),
                _TargetRow(label: 'Grasas', value: '${p.fatTargetG} g'),
                _TargetRow(label: 'Agua', value: '${p.waterTargetLiters} L'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Actions ────────────────────────────────────────────────────────
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.download_rounded, color: AppColors.lime),
                title: const Text('Exportar datos (JSON)'),
                onTap: () {
                  final json = controller.exportJson();
                  showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      backgroundColor: AppColors.surface,
                      title: const Text('Respaldo JSON'),
                      content: SingleChildScrollView(
                        child: SelectableText(json,
                            style: const TextStyle(fontSize: 11)),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cerrar'),
                        ),
                      ],
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_forever_rounded,
                    color: AppColors.negativeCoral),
                title: const Text(
                  'Eliminar cuenta y datos',
                  style: TextStyle(color: AppColors.negativeCoral),
                ),
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      backgroundColor: AppColors.surface,
                      title: const Text('¿Eliminar cuenta?'),
                      content: const Text(
                          'Se eliminarán todos tus datos locales.'),
                      actions: [
                        TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Cancelar')),
                        TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Eliminar',
                                style: TextStyle(
                                    color: AppColors.negativeCoral))),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await controller.deleteAccount();
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _syncLabel(SyncStatus s) {
    switch (s) {
      case SyncStatus.synced:
        return 'Sincronizado ✓';
      case SyncStatus.syncing:
        return 'Sincronizando…';
      case SyncStatus.pending:
        return 'Pendiente de sync';
      case SyncStatus.offline:
        return 'Sin conexión';
    }
  }
}

class _ProfileStat extends StatelessWidget {
  final String label;
  final String value;
  const _ProfileStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(
                fontWeight: FontWeight.bold, color: AppColors.lime)),
        Text(label,
            style: const TextStyle(
                fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}

class _SyncRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _SyncRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 15, color: AppColors.lime),
          const SizedBox(width: 8),
          Expanded(
              child: Text(label,
                  style:
                      const TextStyle(color: AppColors.textSecondary, fontSize: 13))),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

class _TargetRow extends StatelessWidget {
  final String label;
  final String value;
  const _TargetRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
