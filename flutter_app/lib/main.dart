import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0D0B),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const MiSaludProApp());
}

class MiSaludProApp extends StatelessWidget {
  const MiSaludProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mi Salud Pro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0D0B),
      ),
      home: const MiSaludProWebView(),
    );
  }
}

class MiSaludProWebView extends StatefulWidget {
  const MiSaludProWebView({super.key});

  @override
  State<MiSaludProWebView> createState() => _MiSaludProWebViewState();
}

class _MiSaludProWebViewState extends State<MiSaludProWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0D0B))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (_) {
            _controller.loadFlutterAsset('assets/dist/index.html');
          },
        ),
      );

    _initAppContent();
  }

  Future<void> _initAppContent() async {
    try {
      await _controller.loadFlutterAsset('assets/dist/index.html');
    } catch (_) {
      await _controller.loadRequest(Uri.parse('http://10.0.2.2:3000'));
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0D0B),
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF74D834),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
