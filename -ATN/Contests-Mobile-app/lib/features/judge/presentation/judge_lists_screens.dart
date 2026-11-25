import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/widgets/status_views.dart';
import '../../auth/data/auth_repository.dart';
import '../domain/judge_models.dart';
import 'judge_match_controller.dart';

String _errorText(Object error) {
  if (error is ApiException) {
    return error.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/// Danh sách cuộc thi được phân công cho trọng tài.
class JudgeContestListScreen extends ConsumerWidget {
  const JudgeContestListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<JudgeContest>> contests =
        ref.watch(judgeContestsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cuộc thi'),
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
        child: contests.when(
          loading: () => const LoadingView(message: 'Đang tải cuộc thi...'),
          error: (Object error, StackTrace stack) => ErrorView(
            message: _errorText(error),
            onRetry: () => ref.invalidate(judgeContestsProvider),
          ),
          data: (List<JudgeContest> items) {
            if (items.isEmpty) {
              return const EmptyView(
                message: 'Bạn chưa được phân công cuộc thi nào.',
                icon: Icons.emoji_events_outlined,
              );
            }
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(judgeContestsProvider);
                await ref.read(judgeContestsProvider.future);
              },
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (BuildContext context, int index) =>
                    const SizedBox(height: 12),
                itemBuilder: (BuildContext context, int index) {
                  final JudgeContest contest = items[index];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: const Icon(Icons.emoji_events_outlined),
                      title: Text(
                        contest.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () =>
                          context.push(AppRoutes.judgeMatchesPath(contest.id)),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Danh sách trận của một cuộc thi mà trọng tài phụ trách.
class JudgeMatchListScreen extends ConsumerWidget {
  const JudgeMatchListScreen({super.key, required this.contestId});

  final int contestId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<JudgeMatch>> matches =
        ref.watch(judgeMatchesProvider(contestId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Quay lại',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go(AppRoutes.judgeContests);
            }
          },
        ),
        title: const Text('Trận đấu'),
      ),
      body: SafeArea(
        child: matches.when(
          loading: () => const LoadingView(message: 'Đang tải trận đấu...'),
          error: (Object error, StackTrace stack) => ErrorView(
            message: _errorText(error),
            onRetry: () => ref.invalidate(judgeMatchesProvider(contestId)),
          ),
          data: (List<JudgeMatch> items) {
            if (items.isEmpty) {
              return const EmptyView(
                message: 'Bạn chưa phụ trách trận đấu nào trong cuộc thi này.',
                icon: Icons.sports_esports_outlined,
              );
            }
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(judgeMatchesProvider(contestId));
                await ref.read(judgeMatchesProvider(contestId).future);
              },
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (BuildContext context, int index) =>
                    const SizedBox(height: 12),
                itemBuilder: (BuildContext context, int index) {
                  final JudgeMatch match = items[index];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: const Icon(Icons.sports_esports_outlined),
                      title: Text(
                        match.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: match.slug.isEmpty
                          ? null
                          : () => context.push(
                                AppRoutes.judgeMatchControlPath(match.slug),
                              ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
