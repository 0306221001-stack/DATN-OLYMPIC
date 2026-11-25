import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/auth_guard.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/widgets/status_views.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_user.dart';
import '../../settings/presentation/server_settings_dialog.dart';
import '../data/profile_repository.dart';
import '../domain/profile_models.dart';

String _errorText(Object error) {
  if (error is ApiException) {
    return error.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/// Hồ sơ cá nhân. Thí sinh có thêm hai thẻ Giải thưởng và Nhà tài trợ của
/// cuộc thi mình tham gia.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AuthUser? user = ref.watch(authSessionControllerProvider).user;
    final String? contestSlug = user?.student?.contest.slug;
    final bool hasContest = contestSlug != null && contestSlug.isNotEmpty;

    final Widget body = user == null
        ? const LoadingView(message: 'Đang tải hồ sơ...')
        : _ProfileTab(user: user);

    return DefaultTabController(
      length: hasContest ? 3 : 1,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Quay lại',
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else if (user != null) {
                context.go(homeRouteFor(user.role));
              } else {
                context.go(AppRoutes.login);
              }
            },
          ),
          title: const Text('Hồ sơ cá nhân'),
          bottom: hasContest
              ? const TabBar(
                  tabs: <Widget>[
                    Tab(text: 'Hồ sơ'),
                    Tab(text: 'Giải thưởng'),
                    Tab(text: 'Nhà tài trợ'),
                  ],
                )
              : null,
        ),
        body: SafeArea(
          child: hasContest
              ? TabBarView(
                  children: <Widget>[
                    body,
                    _AwardsTab(contestSlug: contestSlug),
                    _SponsorsTab(contestSlug: contestSlug),
                  ],
                )
              : body,
        ),
      ),
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab({required this.user});

  final AuthUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final StudentProfile? student = user.student;
    final String initial =
        user.displayName.trim().isEmpty ? '?' : user.displayName.trim()[0];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Center(
          child: CircleAvatar(
            radius: 44,
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Text(
              initial.toUpperCase(),
              style: theme.textTheme.headlineLarge?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          user.displayName,
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          user.role.label,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: <Widget>[
              _InfoRow(
                icon: Icons.person_outline,
                label: 'Tên đăng nhập',
                value: user.username,
              ),
              if (user.email.isNotEmpty)
                _InfoRow(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  value: user.email,
                ),
              if (student != null) ...<Widget>[
                _InfoRow(
                  icon: Icons.badge_outlined,
                  label: 'Mã thí sinh',
                  value: student.contestant.studentCode,
                ),
                if (student.contestant.className != null)
                  _InfoRow(
                    icon: Icons.school_outlined,
                    label: 'Lớp',
                    value: student.contestant.className!,
                  ),
                _InfoRow(
                  icon: Icons.emoji_events_outlined,
                  label: 'Cuộc thi',
                  value: student.contest.name,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => showServerSettingsDialog(context),
          icon: const Icon(Icons.dns_outlined),
          label: const Text('Đổi địa chỉ máy chủ'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => ref.read(authRepositoryProvider).logout(),
          icon: const Icon(Icons.logout),
          label: const Text('Đăng xuất'),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
      leading: Icon(icon, color: theme.colorScheme.primary),
      title: Text(label, style: theme.textTheme.labelMedium),
      subtitle: Text(
        value.isEmpty ? '—' : value,
        style: theme.textTheme.bodyLarge,
      ),
    );
  }
}

class _AwardsTab extends ConsumerWidget {
  const _AwardsTab({required this.contestSlug});

  final String contestSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<AwardItem>> awards =
        ref.watch(awardsProvider(contestSlug));

    return awards.when(
      loading: () => const LoadingView(message: 'Đang tải giải thưởng...'),
      error: (Object error, StackTrace stack) => ErrorView(
        message: _errorText(error),
        onRetry: () => ref.invalidate(awardsProvider(contestSlug)),
      ),
      data: (List<AwardItem> items) {
        if (items.isEmpty) {
          return const EmptyView(
            message: 'Cuộc thi chưa có giải thưởng nào.',
            icon: Icons.emoji_events_outlined,
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(awardsProvider(contestSlug));
            await ref.read(awardsProvider(contestSlug).future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (BuildContext context, int index) =>
                const SizedBox(height: 12),
            itemBuilder: (BuildContext context, int index) =>
                _AwardCard(item: items[index]),
          ),
        );
      },
    );
  }
}

class _AwardCard extends StatelessWidget {
  const _AwardCard({required this.item});

  final AwardItem item;

  Color _medalColor() {
    switch (item.type) {
      case AwardType.first:
        return const Color(0xFFFFB300);
      case AwardType.second:
        return const Color(0xFF90A4AE);
      case AwardType.third:
        return const Color(0xFFBF7B3E);
      case AwardType.other:
        return const Color(0xFF7E57C2);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: _medalColor(),
          child: const Icon(Icons.emoji_events, color: Colors.white),
        ),
        title: Text(
          item.name.isEmpty ? item.type.label : item.name,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(
          item.hasWinner ? item.winnerName : 'Chưa có người đạt giải',
        ),
      ),
    );
  }
}

class _SponsorsTab extends ConsumerWidget {
  const _SponsorsTab({required this.contestSlug});

  final String contestSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<SponsorItem>> sponsors =
        ref.watch(sponsorsProvider(contestSlug));

    return sponsors.when(
      loading: () => const LoadingView(message: 'Đang tải nhà tài trợ...'),
      error: (Object error, StackTrace stack) => ErrorView(
        message: _errorText(error),
        onRetry: () => ref.invalidate(sponsorsProvider(contestSlug)),
      ),
      data: (List<SponsorItem> items) {
        if (items.isEmpty) {
          return const EmptyView(
            message: 'Cuộc thi chưa có nhà tài trợ nào.',
            icon: Icons.business_outlined,
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(sponsorsProvider(contestSlug));
            await ref.read(sponsorsProvider(contestSlug).future);
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (BuildContext context, int index) =>
                const SizedBox(height: 12),
            itemBuilder: (BuildContext context, int index) =>
                _SponsorCard(item: items[index]),
          ),
        );
      },
    );
  }
}

class _SponsorCard extends StatelessWidget {
  const _SponsorCard({required this.item});

  final SponsorItem item;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String? logo = item.logoUrl;

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: SizedBox(
          width: 56,
          height: 56,
          child: logo == null
              ? const _SponsorPlaceholder()
              : ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    logo,
                    fit: BoxFit.contain,
                    errorBuilder: (
                      BuildContext context,
                      Object error,
                      StackTrace? stack,
                    ) =>
                        const _SponsorPlaceholder(),
                  ),
                ),
        ),
        title: Text(
          item.name,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _SponsorPlaceholder extends StatelessWidget {
  const _SponsorPlaceholder();

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.business, color: scheme.outline),
    );
  }
}
