import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/widgets/status_views.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_user.dart';
import 'student_dashboard_controller.dart';
import 'widgets/match_status_chip.dart';

/// Danh sách trận đấu của thí sinh. Khi một trận bắt đầu, tự đưa vào phòng thi.
class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final StudentDashboardState state =
        ref.watch(studentDashboardControllerProvider);
    final StudentDashboardController controller =
        ref.read(studentDashboardControllerProvider.notifier);

    ref.listen<String?>(
      studentDashboardControllerProvider
          .select((StudentDashboardState s) => s.startedSlug),
      (String? previous, String? next) {
        if (next == null) {
          return;
        }
        final String name =
            ref.read(studentDashboardControllerProvider).startedMatchName ??
                'Trận đấu';
        controller.consumeStart();
        // Đã ở sẵn trong phòng thi của trận này (vào chờ từ trước) thì không
        // mở chồng thêm một phòng nữa.
        final String target = AppRoutes.studentMatchPath(next);
        if (GoRouter.of(context).state.uri.path == Uri.parse(target).path) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name đã bắt đầu! Đang vào phòng thi...')),
        );
        context.push(target);
      },
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trận đấu của tôi'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Hồ sơ cá nhân',
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () => context.push(AppRoutes.profile),
          ),
          IconButton(
            tooltip: 'Đăng xuất',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authRepositoryProvider).logout(),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            ConnectionBanner(
              state: state.connection,
              onRetry: controller.load,
            ),
            Expanded(child: _buildBody(context, state, controller)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    StudentDashboardState state,
    StudentDashboardController controller,
  ) {
    if (state.isLoading && state.matches.isEmpty) {
      return const LoadingView(message: 'Đang tải danh sách trận đấu...');
    }

    if (state.error != null && state.matches.isEmpty) {
      return ErrorView(message: state.error!, onRetry: controller.load);
    }

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          _HeaderCard(state: state),
          if (state.error != null) ...<Widget>[
            const SizedBox(height: 12),
            _InlineError(message: state.error!),
          ],
          const SizedBox(height: 16),
          if (state.matches.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: EmptyView(
                message: 'Cuộc thi chưa có trận đấu nào.',
                icon: Icons.sports_esports_outlined,
              ),
            )
          else
            ...state.matches.map(
              (MatchSummary match) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _MatchCard(match: match),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.state});

  final StudentDashboardState state;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: <Widget>[
            CircleAvatar(
              radius: 24,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Icon(
                Icons.person_rounded,
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    state.studentName.isEmpty ? 'Thí sinh' : state.studentName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (state.contestName.isNotEmpty)
                    Text(
                      state.contestName,
                      style: theme.textTheme.bodyMedium,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  const _MatchCard({required this.match});

  final MatchSummary match;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool isOngoing = match.status == 'ongoing';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: match.slug.isEmpty
            ? null
            : () => context.push(AppRoutes.studentMatchPath(match.slug)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      match.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    MatchStatusChip(status: match.status),
                    if (isOngoing && match.currentQuestion > 0) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(
                        'Đang ở câu ${match.currentQuestion}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                isOngoing
                    ? Icons.play_circle_fill_rounded
                    : Icons.chevron_right_rounded,
                color: isOngoing
                    ? theme.colorScheme.primary
                    : theme.colorScheme.outline,
                size: isOngoing ? 36 : 28,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
