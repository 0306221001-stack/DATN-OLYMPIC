import 'package:flutter/material.dart';

/// Nhãn tiếng Việt của trạng thái trận (`upcoming`, `ongoing`, `finished`).
String matchStatusLabel(String status) {
  switch (status) {
    case 'ongoing':
      return 'Đang diễn ra';
    case 'finished':
      return 'Đã kết thúc';
    case 'upcoming':
      return 'Sắp diễn ra';
    default:
      return status.isEmpty ? 'Chưa rõ' : status;
  }
}

/// Huy hiệu trạng thái trận.
class MatchStatusChip extends StatelessWidget {
  const MatchStatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    final Color background;
    final Color foreground;
    switch (status) {
      case 'ongoing':
        background = scheme.primaryContainer;
        foreground = scheme.onPrimaryContainer;
      case 'finished':
        background = scheme.surfaceContainerHighest;
        foreground = scheme.onSurfaceVariant;
      default:
        background = scheme.tertiaryContainer;
        foreground = scheme.onTertiaryContainer;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        matchStatusLabel(status),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}
