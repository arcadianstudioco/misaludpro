import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/local_storage_service.dart';
import 'theme/app_theme.dart';
import 'screens/welcome_screen.dart';
import 'screens/home_screen.dart';
import 'screens/routines_screen.dart';
import 'screens/nutrition_screen.dart';
import 'screens/stats_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/health_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0D0B),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final controller = HealthController();
  try {
    await controller.load();
  } catch (e) {
    debugPrint('Error loading controller: $e');
  }

  runApp(MiSaludProApp(controller: controller));
}

class MiSaludProApp extends StatelessWidget {
  final HealthController controller;
  const MiSaludProApp({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        return MaterialApp(
          title: 'Mi Salud Pro',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.darkTheme,
          home: controller.isAuthenticated
              ? MainShell(controller: controller)
              : WelcomeScreen(controller: controller),
        );
      },
    );
  }
}

class MainShell extends StatefulWidget {
  final HealthController controller;
  const MainShell({super.key, required this.controller});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  void _onNavigateTab(int index) {
    setState(() => _currentIndex = index);
  }

  void _openHealth() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HealthScreen(controller: widget.controller),
      ),
    );
  }

  void _openKegel() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HealthScreen(controller: widget.controller),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(
        controller: widget.controller,
        onNavigateTab: _onNavigateTab,
        onOpenHealth: _openHealth,
      ),
      RoutinesScreen(
        controller: widget.controller,
        onOpenKegel: _openKegel,
      ),
      NutritionScreen(
        controller: widget.controller,
      ),
      StatsScreen(
        controller: widget.controller,
      ),
      ProfileScreen(
        controller: widget.controller,
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: screens,
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onNavigateTab,
        backgroundColor: const Color(0xFF0E1410),
        indicatorColor: AppColors.lime.withOpacity(0.16),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppColors.lime),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.fitness_center_outlined),
            selectedIcon: Icon(Icons.fitness_center, color: AppColors.lime),
            label: 'Rutinas',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_outlined),
            selectedIcon: Icon(Icons.restaurant, color: AppColors.lime),
            label: 'Nutrición',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart, color: AppColors.lime),
            label: 'Progreso',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.lime),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
