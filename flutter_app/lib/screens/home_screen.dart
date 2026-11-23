import 'package:flutter/material.dart';
import '../services/local_storage_service.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  final HealthController controller;
  final ValueChanged<int> onNavigateTab;
  final VoidCallback onOpenHealth;

  const HomeScreen({
    super.key,
    required this.controller,
    required this.onNavigateTab,
    required this.onOpenHealth,
  });

  @override
  Widget build(BuildContext context) {
    final pct = controller.dailyGoalPercent;
    final streaks = controller.streaks;
    final weightDelta = controller.weightDelta;
    final waistDelta = controller.waistDelta;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Top Bar ──────────────────────────────────────────────────────────
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Icon(Icons.show_chart_rounded, color: AppColors.lime, size: 28),
                SizedBox(width: 8),
                Text(
                  'Mi Salud Pro',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                _SyncPill(controller: controller),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: () => onNavigateTab(4),
                  child: const CircleAvatar(
                    backgroundImage:
                        AssetImage('assets/images/user_profile_avatar.jpg'),
                  ),
                ),
              ],
            ),
          ],
        ),

        // ── Offline Banner ────────────────────────────────────────────────────
        if (!controller.isOnline || controller.isSimulatedOffline)
          Container(
            margin: const EdgeInsets.only(top: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF2A1A00),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.amber.withOpacity(0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.wifi_off_rounded,
                    color: Colors.amber, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    controller.isSimulatedOffline
                        ? 'Modo sin conexión simulado activo'
                        : 'Sin conexión — tus cambios se guardan localmente',
                    style: const TextStyle(fontSize: 12, color: Colors.amber),
                  ),
                ),
                if (controller.pendingChanges > 0)
                  Container(
                    margin: const EdgeInsets.only(left: 6),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      '${controller.pendingChanges} pendientes',
                      style: const TextStyle(fontSize: 10, color: Colors.amber),
                    ),
                  ),
              ],
            ),
          ),

        const SizedBox(height: 16),

        // ── Goal Ring Card ────────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              children: [
                Text(
                  _motivationalMessage(pct),
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Tu constancia hace la diferencia',
                  style:
                      TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: 148,
                  height: 148,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 148,
                        height: 148,
                        child: CircularProgressIndicator(
                          value: pct / 100.0,
                          strokeWidth: 11,
                          backgroundColor: const Color(0xFF212B24),
                          color: AppColors.lime,
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$pct%',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const Text(
                            'de tu objetivo',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── KPI Cards ─────────────────────────────────────────────────────────
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                label: 'Peso actual',
                value: '${controller.currentWeight.toStringAsFixed(1)} kg',
                delta: weightDelta == 0
                    ? '—'
                    : '${weightDelta > 0 ? '+' : ''}${weightDelta.toStringAsFixed(1)} kg',
                deltaPositive: weightDelta < 0,
                onTap: () => onNavigateTab(3),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _KpiCard(
                label: 'Cintura',
                value: '${controller.currentWaist.round()} cm',
                delta: waistDelta == 0
                    ? '—'
                    : '${waistDelta > 0 ? '+' : ''}${waistDelta.toStringAsFixed(1)} cm',
                deltaPositive: waistDelta < 0,
                onTap: () => onNavigateTab(3),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // ── Streaks Row ───────────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Rachas actuales 🔥',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StreakBadge(
                        icon: Icons.fitness_center_rounded,
                        label: 'Entreno',
                        days: streaks.workout),
                    _StreakBadge(
                        icon: Icons.water_drop_rounded,
                        label: 'Agua',
                        days: streaks.water),
                    _StreakBadge(
                        icon: Icons.bedtime_rounded,
                        label: 'Sueño',
                        days: streaks.sleep),
                    _StreakBadge(
                        icon: Icons.spa_rounded,
                        label: 'Kegel',
                        days: streaks.kegel),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Tu Día Card ───────────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tu día',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  value: controller.workoutDone,
                  activeColor: AppColors.lime,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Entrenamiento'),
                  onChanged: (v) => controller.toggleHabit(workout: v ?? false),
                ),
                CheckboxListTile(
                  value: controller.healthyEatingDone,
                  activeColor: AppColors.lime,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Comer saludable'),
                  onChanged: (v) => controller.toggleHabit(eating: v ?? false),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  onTap: onOpenHealth,
                  leading: Icon(
                    controller.waterLiters >=
                            controller.profile.waterTargetLiters
                        ? Icons.check_box
                        : Icons.check_box_outline_blank,
                    color: AppColors.lime,
                  ),
                  title: Text(
                    'Hidratarte (${controller.waterLiters.toStringAsFixed(1)}/${controller.profile.waterTargetLiters.round()} L)',
                  ),
                  trailing: TextButton(
                    onPressed: () => controller.addWater(0.25),
                    child: const Text('+250 ml'),
                  ),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  onTap: onOpenHealth,
                  leading: Icon(
                    controller.sleepHours >= 7
                        ? Icons.check_box
                        : Icons.check_box_outline_blank,
                    color: AppColors.lime,
                  ),
                  title: Text('Dormir 7-9 h (${controller.sleepHours} h)'),
                  trailing: const Icon(Icons.chevron_right),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Body Fat Estimate ─────────────────────────────────────────────────
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Grasa corporal estimada',
                        style: TextStyle(
                            fontSize: 13, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${controller.bodyFatPercent.toStringAsFixed(1)}%',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'IMC',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                    Text(
                      controller.profile.bmi.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lime,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Health Entry ──────────────────────────────────────────────────────
        Card(
          child: ListTile(
            onTap: onOpenHealth,
            leading: const Icon(Icons.favorite_rounded, color: AppColors.lime),
            title: const Text('Salud y Suelo Pélvico'),
            subtitle: const Text('Hidratación, sueño y guía Kegel'),
            trailing: const Icon(Icons.chevron_right),
          ),
        ),
      ],
    );
  }

  String _motivationalMessage(int pct) {
    if (pct >= 80) return '¡Excelente día! 💪';
    if (pct >= 50) return '¡Vamos fuerte!';
    if (pct >= 20) return 'Vas bien, sigue así';
    return 'Empieza hoy 🌱';
  }
}

// ─── Sync Pill ─────────────────────────────────────────────────────────────────
class _SyncPill extends StatelessWidget {
  final HealthController controller;
  const _SyncPill({required this.controller});

  @override
  Widget build(BuildContext context) {
    final status = controller.syncStatus;
    final Color color;
    final IconData icon;
    final String label;

    switch (status) {
      case SyncStatus.synced:
        color = AppColors.lime;
        icon = Icons.cloud_done_rounded;
        label = 'Sincronizado';
        break;
      case SyncStatus.syncing:
        color = Colors.blue;
        icon = Icons.sync_rounded;
        label = 'Sincronizando…';
        break;
      case SyncStatus.pending:
        color = Colors.amber;
        icon = Icons.cloud_upload_outlined;
        label = '${controller.pendingChanges} pendientes';
        break;
      case SyncStatus.offline:
        color = Colors.red.shade300;
        icon = Icons.wifi_off_rounded;
        label = 'Sin conexión';
        break;
    }

    return GestureDetector(
      onTap: () => _showSyncModal(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: color.withOpacity(0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 11, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  void _showSyncModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Estado de sincronización',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const _InfoRow(
                icon: Icons.storage_rounded,
                label: 'Datos locales',
                value: 'SharedPreferences activo'),
            _InfoRow(
                icon: Icons.wifi_rounded,
                label: 'Conexión',
                value: controller.isOnline ? 'En línea' : 'Sin conexión'),
            if (controller.pendingChanges > 0)
              _InfoRow(
                  icon: Icons.pending_rounded,
                  label: 'Cambios pendientes',
                  value: '${controller.pendingChanges}'),
            if (controller.lastSyncedAt != null)
              _InfoRow(
                  icon: Icons.schedule_rounded,
                  label: 'Última sync',
                  value: _formatTime(controller.lastSyncedAt!)),
            const SizedBox(height: 16),
            SwitchListTile(
              value: controller.isSimulatedOffline,
              activeThumbColor: Colors.amber,
              contentPadding: EdgeInsets.zero,
              title: const Text('Simular modo sin conexión'),
              subtitle: const Text('Para pruebas de offline',
                  style: TextStyle(fontSize: 11)),
              onChanged: (_) => controller.toggleSimulatedOffline(),
            ),
            const SizedBox(height: 8),
            if (controller.pendingChanges > 0 &&
                controller.isOnline &&
                !controller.isSimulatedOffline)
              FilledButton.icon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.lime,
                    foregroundColor: Colors.black,
                    minimumSize: const Size.fromHeight(44)),
                onPressed: () {
                  controller.manualSync();
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.sync_rounded, size: 18),
                label: const Text('Sincronizar ahora'),
              ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Ahora mismo';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    return 'Hace ${diff.inHours} h';
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.lime),
          const SizedBox(width: 10),
          Expanded(
              child: Text(label,
                  style: const TextStyle(color: AppColors.textSecondary))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
class _StreakBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final int days;
  const _StreakBadge(
      {required this.icon, required this.label, required this.days});

  @override
  Widget build(BuildContext context) {
    final active = days > 0;
    return Column(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active
                ? AppColors.lime.withOpacity(0.15)
                : Colors.white.withOpacity(0.05),
            border: Border.all(
              color: active ? AppColors.lime.withOpacity(0.5) : Colors.white12,
            ),
          ),
          child: Center(
            child: Icon(icon,
                size: 20, color: active ? AppColors.lime : Colors.white38),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          days > 0 ? '${days}d 🔥' : '0d',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: active ? AppColors.lime : AppColors.textSecondary,
          ),
        ),
        Text(label,
            style:
                const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      ],
    );
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String delta;
  final bool deltaPositive;
  final VoidCallback onTap;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.delta,
    required this.deltaPositive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                delta,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: deltaPositive ? AppColors.lime : Colors.red.shade300,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
