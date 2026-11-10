import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/server_settings.dart';
import 'core/router/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Nạp địa chỉ Backend người dùng đã lưu trước khi dựng bất kỳ provider mạng nào.
  await ServerSettings.load();
  runApp(const ProviderScope(child: RungChuongVangApp()));
}

class RungChuongVangApp extends ConsumerWidget {
  const RungChuongVangApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Olympic Tin học',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF9A825)),
      ),
      routerConfig: router,
    );
  }
}
