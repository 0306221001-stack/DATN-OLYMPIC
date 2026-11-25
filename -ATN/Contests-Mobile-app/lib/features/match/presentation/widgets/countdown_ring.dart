import 'package:flutter/material.dart';

/// Vòng đếm ngược hiển thị số giây còn lại.
class CountdownRing extends StatelessWidget {
  const CountdownRing({
    super.key,
    required this.remaining,
    required this.total,
    this.isPaused = false,
    this.size = 72,
  });

  final int remaining;

  /// Tổng thời gian của câu; nếu không rõ (<= 0) vòng luôn đầy.
  final int total;
  final bool isPaused;
  final double size;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final int safeRemaining = remaining < 0 ? 0 : remaining;
    final double progress =
        total <= 0 ? 1 : (safeRemaining / total).clamp(0.0, 1.0).toDouble();
    final bool urgent = safeRemaining <= 5;

    final Color color = isPaused
        ? theme.colorScheme.outline
        : urgent
            ? theme.colorScheme.error
            : theme.colorScheme.primary;

    return Semantics(
      label: 'Còn $safeRemaining giây',
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          alignment: Alignment.center,
          children: <Widget>[
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                value: progress,
                strokeWidth: 6,
                color: color,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  '$safeRemaining',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
                if (isPaused)
                  Text('Tạm dừng', style: theme.textTheme.labelSmall),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
