import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/router/auth_guard.dart';

/// Màn hình chờ khi app khôi phục phiên đăng nhập từ token đã lưu.
///
/// Khi khôi phục xong, Auth Guard tự chuyển sang màn hình chính hoặc đăng nhập.
/// Nếu lỗi mạng, màn hình cho phép thử lại hoặc đăng nhập bằng tài khoản khác.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AuthSessionController controller =
        ref.watch(authSessionControllerProvider);
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.primaryContainer,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ListenableBuilder(
              listenable: controller,
              builder: (BuildContext context, Widget? child) {
                if (controller.status == SessionStatus.failed) {
                  return _SplashError(controller: controller);
                }
                return const _SplashLoading();
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _SplashLoading extends StatelessWidget {
  const _SplashLoading();

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(
          Icons.notifications_active_rounded,
          size: 72,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Olympic Tin học',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 28),
        const CircularProgressIndicator(),
        const SizedBox(height: 16),
        Text(
          'Đang kiểm tra phiên đăng nhập...',
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _SplashError extends StatelessWidget {
  const _SplashError({required this.controller});

  final AuthSessionController controller;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String message = controller.restoreError?.message ??
        'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 360),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Icon(
            Icons.cloud_off_rounded,
            size: 64,
            color: theme.colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Không thể khôi phục phiên',
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: controller.restore,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: controller.discardSession,
            child: const Text('Đăng nhập bằng tài khoản khác'),
          ),
        ],
      ),
    );
  }
}
