import 'package:flutter/material.dart';

import '../../match/domain/match_models.dart';

/// Khối hiển thị cho thí sinh đã bị loại hoặc bị cấm thi trong lúc chờ Ban tổ
/// chức cứu trợ.
///
/// Cứu trợ do Admin thực hiện; khi có `student:rescued` gửi tới, controller
/// trận đổi trạng thái sang `rescued` và khối này tự biến mất. Ở trạng thái
/// `rescued` khối này hiện thông báo thành công ngắn.
class RescuePanel extends StatelessWidget {
  const RescuePanel({super.key, required this.status});

  final ContestantPlayStatus status;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    switch (status) {
      case ContestantPlayStatus.playing:
        return const SizedBox.shrink();
      case ContestantPlayStatus.rescued:
        return _PanelCard(
          icon: Icons.favorite_rounded,
          iconColor: Colors.green.shade700,
          background: Colors.green.withValues(alpha: 0.12),
          title: 'Bạn đã được cứu trợ',
          message: 'Hãy sẵn sàng cho câu hỏi tiếp theo.',
          theme: theme,
        );
      case ContestantPlayStatus.eliminated:
        return _PanelCard(
          icon: Icons.hourglass_top_rounded,
          iconColor: theme.colorScheme.primary,
          background: theme.colorScheme.surfaceContainerHigh,
          title: 'Bạn đã bị loại',
          message: 'Nếu Ban tổ chức mở cứu trợ và chọn bạn, trạng thái sẽ tự '
              'cập nhật tại đây. Hãy ở lại để theo dõi trận đấu.',
          theme: theme,
          showProgress: true,
        );
      case ContestantPlayStatus.banned:
        return _PanelCard(
          icon: Icons.block_rounded,
          iconColor: theme.colorScheme.error,
          background: theme.colorScheme.errorContainer,
          title: 'Bạn đã bị cấm thi',
          message: 'Bạn đã rời khỏi ứng dụng quá $maxViolations lần trong lúc '
              'thi. Chỉ Ban tổ chức mới có thể cứu trợ bạn trở lại.',
          theme: theme,
        );
    }
  }
}

class _PanelCard extends StatelessWidget {
  const _PanelCard({
    required this.icon,
    required this.iconColor,
    required this.background,
    required this.title,
    required this.message,
    required this.theme,
    this.showProgress = false,
  });

  final IconData icon;
  final Color iconColor;
  final Color background;
  final String title;
  final String message;
  final ThemeData theme;
  final bool showProgress;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: <Widget>[
          Icon(icon, size: 40, color: iconColor),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          if (showProgress) ...<Widget>[
            const SizedBox(height: 12),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ],
      ),
    );
  }
}
