import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF0A0D0B);
  static const Color surface = Color(0xFF131A16);
  static const Color surfaceDark = Color(0xFF0D120F);
  static const Color border = Color(0x14FFFFFF);

  static const Color lime = Color(0xFF74D834);
  static const Color limeBright = Color(0xFF82E63E);
  static const Color emeraldDark = Color(0xFF52B81E);

  static const Color carbsAmber = Color(0xFFD6A63A);
  static const Color fatOrange = Color(0xFFD87236);
  static const Color hydrationTeal = Color(0xFF4CC9B0);
  static const Color negativeCoral = Color(0xFFE06A5E);

  static const Color textPrimary = Color(0xFFF4F7F4);
  static const Color textSecondary = Color(0xFF9AA89E);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.lime,
        onPrimary: Color(0xFF081007),
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF0E1410),
        indicatorColor: AppColors.lime.withValues(alpha: 0.16),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.lime : AppColors.textSecondary,
          );
        }),
      ),
    );
  }
}
