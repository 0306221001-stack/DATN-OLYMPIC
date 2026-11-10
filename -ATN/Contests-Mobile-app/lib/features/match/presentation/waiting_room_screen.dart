import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/widgets/status_views.dart';
import '../../rescue/presentation/rescue_screen.dart';
import '../domain/match_models.dart';
import 'match_controller.dart';
import 'match_screen.dart';
import 'student_dashboard_controller.dart';

/// Màn hình của một trận đấu: phòng chờ, làm bài và kết thúc trong cùng một
/// route để việc quay lại đơn giản.
class WaitingRoomScreen extends ConsumerStatefulWidget {
  const WaitingRoomScreen({super.key, required this.matchSlug});

  final String matchSlug;

  @override
  ConsumerState<WaitingRoomScreen> createState() => _WaitingRoomScreenState();
}

class _WaitingRoomScreenState extends ConsumerState<WaitingRoomScreen>
    with WidgetsBindingObserver {
  String get matchSlug => widget.matchSlug;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Chống gian lận: rời khỏi ứng dụng (ra nền, đổi tab trên web) là một lần
  /// vi phạm. `inactive` bị bỏ qua vì nó cũng xảy ra khi chỉ kéo thanh thông
  /// báo hoặc hiện hộp thoại hệ thống.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final MatchController controller =
        ref.read(matchControllerProvider(matchSlug).notifier);
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        controller.onAppLeft();
      case AppLifecycleState.resumed:
        controller.onAppResumed();
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final MatchLiveState state = ref.watch(matchControllerProvider(matchSlug));
    final MatchController controller =
        ref.read(matchControllerProvider(matchSlug).notifier);

    ref.listen<String?>(
      matchControllerProvider(matchSlug).select((MatchLiveState s) => s.notice),
      (String? previous, String? next) {
        if (next == null) {
          return;
        }
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(next)));
        controller.dismissNotice();
      },
    );

    // Trận đang diễn ra thì thí sinh không được rời phòng: ẩn nút quay lại và
    // chặn nút Back của hệ thống. Màn hoàn thành bài thi có nút "Về trang chủ".
    final bool canLeave = !state.mustStay;
    final bool showBack = canLeave && state.phase != MatchPhase.ended;

    return PopScope(
      canPop: canLeave,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (didPop) {
          return;
        }
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(
              content:
                  Text('Trận đấu đang diễn ra, bạn không thể rời phòng thi.'),
            ),
          );
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: showBack
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  tooltip: 'Quay lại',
                  onPressed: () => _leave(context),
                )
              : null,
          title: Text(state.matchName.isEmpty ? 'Phòng thi' : state.matchName),
        ),
        body: SafeArea(
          child: Column(
            children: <Widget>[
              ConnectionBanner(
                  state: state.connection, onRetry: controller.retry),
              Expanded(child: _buildBody(context, state, controller)),
            ],
          ),
        ),
      ),
    );
  }

  void _leave(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.studentDashboard);
    }
  }

  void _goHome(BuildContext context) {
    // Trang chủ còn trong ngăn xếp thì làm mới để thẻ trận vừa thi hiện đúng
    // trạng thái; chưa có thì trang chủ tự tải khi mở.
    if (ref.exists(studentDashboardControllerProvider)) {
      unawaited(
        ref.read(studentDashboardControllerProvider.notifier).refresh(),
      );
    }
    context.go(AppRoutes.studentDashboard);
  }

  Widget _buildBody(
    BuildContext context,
    MatchLiveState state,
    MatchController controller,
  ) {
    if (state.isLoading) {
      return const LoadingView(message: 'Đang vào phòng thi...');
    }

    if (state.loadError != null) {
      return ErrorView(message: state.loadError!, onRetry: controller.retry);
    }

    switch (state.phase) {
      case MatchPhase.running:
        return MatchScreen(matchSlug: matchSlug);
      case MatchPhase.ended:
        return _EndedView(state: state, onGoHome: () => _goHome(context));
      case MatchPhase.waiting:
        return _WaitingView(state: state);
    }
  }
}

class _WaitingView extends StatelessWidget {
  const _WaitingView({required this.state});

  final MatchLiveState state;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool eliminated = state.status == ContestantPlayStatus.eliminated;
    final bool banned = state.status == ContestantPlayStatus.banned;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        const SizedBox(height: 24),
        Icon(
          banned
              ? Icons.block
              : eliminated
                  ? Icons.sentiment_dissatisfied_outlined
                  : Icons.hourglass_top_rounded,
          size: 72,
          color: banned || eliminated
              ? theme.colorScheme.error
              : theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          banned
              ? 'Bạn đã bị cấm thi'
              : eliminated
                  ? 'Bạn đã bị loại'
                  : 'Đang chờ câu hỏi',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          banned || eliminated
              ? 'Hãy ở lại phòng để theo dõi trận đấu, Ban tổ chức có thể cứu '
                  'trợ bạn.'
              : 'Giữ nguyên màn hình này. Câu hỏi sẽ tự hiện khi Ban tổ chức chiếu.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge,
        ),
        if (state.status != ContestantPlayStatus.playing) ...<Widget>[
          const SizedBox(height: 16),
          RescuePanel(status: state.status),
        ],
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Quy định phòng thi',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                const Text('• Trả lời sai sẽ bị loại ngay khỏi trận đấu.'),
                const Text('• Kết quả chỉ hiển thị sau khi hết giờ.'),
                const Text('• Không rời ứng dụng trong lúc thi.'),
                if (state.registrationNumber != null) ...<Widget>[
                  const SizedBox(height: 12),
                  Text(
                    'Số báo danh của bạn: ${state.registrationNumber}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Màn hình hoàn thành bài thi, hiện khi Ban tổ chức kết thúc trận.
class _EndedView extends StatelessWidget {
  const _EndedView({required this.state, required this.onGoHome});

  final MatchLiveState state;
  final VoidCallback onGoHome;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool banned = state.status == ContestantPlayStatus.banned;
    final bool eliminated = state.status == ContestantPlayStatus.eliminated;

    final String message;
    if (banned) {
      message = 'Bạn đã bị cấm thi trong trận này do rời khỏi ứng dụng quá '
          '$maxViolations lần.';
    } else if (eliminated) {
      message = 'Bạn đã dừng bước trong trận này. Cảm ơn bạn đã tham gia!';
    } else {
      message = 'Chúc mừng bạn đã trụ vững tới cuối trận đấu!';
    }

    final List<Widget> summary = <Widget>[
      if (state.matchName.isNotEmpty)
        _SummaryRow(
          icon: Icons.sports_esports_outlined,
          label: 'Trận đấu',
          value: state.matchName,
        ),
      if (state.registrationNumber != null)
        _SummaryRow(
          icon: Icons.badge_outlined,
          label: 'Số báo danh',
          value: '${state.registrationNumber}',
        ),
      if (state.answeredCount != null)
        _SummaryRow(
          icon: Icons.edit_note_outlined,
          label: 'Số câu đã trả lời',
          value: '${state.answeredCount}',
        ),
      if (state.correctCount != null)
        _SummaryRow(
          icon: Icons.check_circle_outline,
          label: 'Số câu trả lời đúng',
          value: '${state.correctCount}',
        ),
    ];

    return ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        const SizedBox(height: 24),
        Icon(
          banned || eliminated
              ? Icons.flag_outlined
              : Icons.emoji_events_outlined,
          size: 80,
          color: banned ? theme.colorScheme.error : theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Hoàn thành bài thi',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Trận đấu đã kết thúc. $message',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge,
        ),
        if (summary.isNotEmpty) ...<Widget>[
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(children: summary),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: onGoHome,
          icon: const Icon(Icons.home_outlined),
          label: const Text('Về trang chủ'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return ListTile(
      dense: true,
      leading: Icon(icon, color: theme.colorScheme.primary),
      title: Text(label),
      trailing: Text(
        value,
        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
