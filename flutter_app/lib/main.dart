import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
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
  static const _alarmChannel = MethodChannel('com.misaludpro/alarms');
  late final WebViewController _controller;
  HttpServer? _localServer;
  bool _isLoading = true;
  String? _errorMessage;

  Future<void> _handleFlutterChannelMessage(String raw) async {
    if (raw == 'back') {
      if (mounted) {
        _controller.runJavaScript(
          "window.dispatchEvent(new CustomEvent('flutter-back'));",
        );
      }
      return;
    }

    if (!raw.startsWith('{')) return;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final action = decoded['action'] as String?;
      if (!Platform.isIOS) return;

      if (action == 'requestAlarmPermission') {
        final granted = await _alarmChannel.invokeMethod<bool>('requestPermission') ?? false;
        if (mounted) {
          _controller.runJavaScript(
            "window.dispatchEvent(new CustomEvent('flutter-alarm-status', { detail: { granted: $granted } }));",
          );
        }
      } else if (action == 'syncAlarms') {
        final alarms = decoded['alarms'];
        if (alarms is List) {
          await _alarmChannel.invokeMethod('syncAlarms', alarms);
        }
      } else if (action == 'openClock') {
        await _alarmChannel.invokeMethod('openClockApp');
      }
    } catch (e) {
      debugPrint('FlutterChannel JSON error: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0D0B))
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage msg) {
          _handleFlutterChannelMessage(msg.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
            // Inject safe-area-inset-top via meta viewport so CSS env() works
            // Also disable iOS back-swipe navigation inside the webview
            _controller.runJavaScript('''
              (function() {
                // Prevent WKWebView history swipe from navigating away
                document.addEventListener('touchstart', function(){}, {passive: true});
              })();
            ''');
          },
          onWebResourceError: (error) {
            debugPrint('WebResourceError: \${error.description}');
          },
        ),
      );

    _startServerAndLoad();
  }

  ContentType _getContentType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.html')) return ContentType.html;
    if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
      return ContentType('application', 'javascript', charset: 'utf-8');
    }
    if (lower.endsWith('.css')) {
      return ContentType('text', 'css', charset: 'utf-8');
    }
    if (lower.endsWith('.png')) return ContentType('image', 'png');
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return ContentType('image', 'jpeg');
    }
    if (lower.endsWith('.svg')) return ContentType('image', 'svg+xml');
    if (lower.endsWith('.json')) return ContentType.json;
    if (lower.endsWith('.woff2')) return ContentType('font', 'woff2');
    if (lower.endsWith('.woff')) return ContentType('font', 'woff');
    if (lower.endsWith('.ttf')) return ContentType('font', 'ttf');
    return ContentType.binary;
  }

  Future<HttpServer> _bindFixedPortServer() async {
    const preferredPorts = [48123, 48124, 48125];
    for (final port in preferredPorts) {
      try {
        return await HttpServer.bind(InternetAddress.loopbackIPv4, port);
      } catch (_) {
        // Port busy, try next
      }
    }
    return HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  }

  Future<void> _startServerAndLoad() async {
    try {
      final server = await _bindFixedPortServer();
      _localServer = server;

      server.listen((HttpRequest request) async {
        String reqPath = request.uri.path;
        if (reqPath == '/' || reqPath.isEmpty) {
          reqPath = '/index.html';
        }

        reqPath = Uri.decodeComponent(reqPath);
        final assetPath = 'assets/dist$reqPath';
        try {
          final data = await rootBundle.load(assetPath);
          final bytes = data.buffer.asUint8List();
          request.response.headers.contentType = _getContentType(reqPath);
          request.response.headers.add('Access-Control-Allow-Origin', '*');
          request.response.add(bytes);
        } catch (_) {
          // SPA fallback: return index.html for client-side routing
          try {
            final data = await rootBundle.load('assets/dist/index.html');
            request.response.headers.contentType = ContentType.html;
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.add(data.buffer.asUint8List());
          } catch (e) {
            request.response.statusCode = HttpStatus.notFound;
          }
        }
        await request.response.close();
      });

      final url = 'http://127.0.0.1:${server.port}';
      debugPrint('Local server running at $url');
      await _controller.loadRequest(Uri.parse(url));
    } catch (e) {
      debugPrint('Error starting local server: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al cargar la aplicación: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _localServer?.close(force: true);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          await _controller.runJavaScript(
            "window.dispatchEvent(new CustomEvent('flutter-back'));",
          );
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0D0B),
        body: Stack(
          children: [
            if (_errorMessage == null)
              WebViewWidget(controller: _controller)
            else
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            if (_isLoading && _errorMessage == null)
              const Center(
                child: CircularProgressIndicator(
                  color: Color(0xFF74D834),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
