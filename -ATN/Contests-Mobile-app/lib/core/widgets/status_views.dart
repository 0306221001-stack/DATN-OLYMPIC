import 'package:flutter/material.dart';

import '../network/socket_service.dart';

/// Màn hình/khối đang tải dữ liệu.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message = 'Đang tải...'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

/// Màn hình/khối báo lỗi kèm nút thử lại.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    this.onRetry,
    this.retryLabel = 'Thử lại',
  });

  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.error_outline_rounded,
              size: 56,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            if (onRetry != null) ...<Widget>[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(retryLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Màn hình/khối không có dữ liệu.
class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.message, this.icon});

  final String message;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              icon ?? Icons.inbox_outlined,
              size: 56,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
}

/// Dải thông báo trạng thái kết nối realtime; ẩn khi đã kết nối.
class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({super.key, required this.state, this.onRetry});

  final SocketConnectionState state;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (state == SocketConnectionState.connected) {
      return const SizedBox.shrink();
    }

    final ThemeData theme = Theme.of(context);
    final bool failed = state == SocketConnectionState.failed;
    final bool busy = state == SocketConnectionState.connecting ||
        state == SocketConnectionState.reconnecting;

    final String text = switch (state) {
      SocketConnectionState.connecting => 'Đang kết nối tới máy chủ...',
      SocketConnectionState.reconnecting => 'Mất kết nối, đang kết nối lại...',
      SocketConnectionState.failed => 'Không thể kết nối tới máy chủ.',
      _ => 'Chưa kết nối tới máy chủ.',
    };

    return Material(
      color: failed
          ? theme.colorScheme.errorContainer
          : theme.colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: <Widget>[
            if (busy)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              Icon(
                Icons.wifi_off_rounded,
                size: 18,
                color: theme.colorScheme.onErrorContainer,
              ),
            const SizedBox(width: 12),
            Expanded(child: Text(text, style: theme.textTheme.bodyMedium)),
            if (!busy && onRetry != null)
              TextButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}
