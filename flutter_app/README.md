# Mi Salud Pro · MVP 1.0 (Flutter iOS + Android)

Aplicación móvil completa en Flutter para entrenamiento, nutrición, hábitos, suelo pélvico y seguimiento corporal, diseñada fielmente según el documento de producto MVP 1.0.

## Estructura del proyecto

- `lib/main.dart`: Punto de entrada, tema oscuro esmeralda, puerta de bienvenida y navegación de 5 pestañas (`Inicio`, `Rutinas`, `Nutrición`, `Estadísticas`, `Perfil`).
- `lib/theme/app_theme.dart`: Paleta oficial (`#0A0D0B`, `#131A16`, `#74D834`, `#D6A63A`, `#D87236`) y tipografía Material 3.
- `lib/models/health_models.dart`: Modelos de perfil, hábitos diarios, rutinas, sesiones, comidas, lista de compras, medidas corporales y sesiones Kegel.
- `lib/services/local_storage_service.dart`: Persistencia local sin conexión mediante `shared_preferences`, cálculo de IMC/calorías, exportación JSON y eliminación de cuenta.
- `lib/screens/`:
  - `welcome_screen.dart`: Pantalla inicial (`Comenzar`, `Iniciar sesión`, perfil demo o registro).
  - `home_screen.dart`: Dashboard (`¡Vamos fuerte!`, anillo de objetivo diario, peso/cintura, `Tu día` y acceso a Salud).
  - `routines_screen.dart`: `Mis Rutinas | Explorar`, tarjeta destacada `Fuerza Total`, temporizador activo e historial.
  - `nutrition_screen.dart`: `Tu plan de hoy`, anillo calórico, barras de macros, `Comidas del día` y `Lista de compras`.
  - `stats_screen.dart`: Selector `7d | 30d | 90d | 1a`, gráfica `CustomPainter` de peso real y tabla de medidas corporales.
  - `health_screen.dart`: Hidratación, sueño y guía interactiva de suelo pélvico (contracción/relajación).
  - `profile_screen.dart`: Edición de perfil/IMC, recordatorios, exportación JSON y eliminación segura de datos.

## Cómo ejecutar

```bash
flutter pub get
flutter run
```
