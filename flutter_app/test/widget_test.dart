import 'package:flutter_test/flutter_test.dart';
import 'package:mi_salud_pro/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MiSaludProApp());
    expect(find.byType(MiSaludProApp), findsOneWidget);
  });
}
