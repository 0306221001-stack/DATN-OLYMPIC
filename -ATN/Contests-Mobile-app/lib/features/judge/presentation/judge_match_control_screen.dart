import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/widgets/status_views.dart';
import '../domain/judge_models.dart';
import 'judge_match_controller.dart';

/// Màn hình điều khiển trận của trọng tài: theo dõi câu hỏi và đồng hồ, đổi
/// trạng thái thí sinh (Đang thi / Xác nhận 1 / Xác nhận 2) và chốt câu.
class JudgeMatchControlScreen extends ConsumerStatefulWidget {
  const JudgeMatchControlScreen({super.key, required this.matchSlug});

  final String matchSlug;

  @override
  ConsumerState<JudgeMatchControlScreen> createState() =>
      _JudgeMatchControlScreenState();
}

class _JudgeMatchControlScreenState
    extends ConsumerState<JudgeMatchControlScreen> {
  JudgeContestantStatus _tab = JudgeContestantStatus.inProgress;

  static const List<JudgeContestantStatus> _tabs = <JudgeContestantStatus>[
    JudgeContestantStatus.inProgress,
    JudgeContestantStatus.confirmed1,
    JudgeContestantStatus.confirmed2,
  ];

  static String _tabLabel(JudgeContestantStatus status) {
    switch (status) {
      case JudgeContestantStatus.inProgress:
        return 'Đang thi';
      case JudgeContestantStatus.confirmed1:
        return 'Xác nhận 1';
      case JudgeContestantStatus.confirmed2:
        return 'Xác nhận 2';
      case JudgeContestantStatus.other:
        return 'Khác';
    }
  }

  @override
  Widget build(BuildContext context) {
    final JudgeMatchState state =
        ref.watch(judgeMatchControllerProvider(widget.matchSlug));
    final JudgeMatchController controller =
        ref.read(judgeMatchControllerProvider(widget.matchSlug).notifier);

    ref.listen<String?>(
      judgeMatchControllerProvider(widget.matchSlug)
          .select((JudgeMatchState s) => s.notice),
      (String? previous, String? next) {
        if (next == null) {
          return;
        }
        final bool isError = ref
            .read(judgeMatchControllerProvider(widget.matchSlug))
            .noticeIsError;
        final ThemeData theme = Theme.of(context);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(next),
              backgroundColor: isError ? theme.colorScheme.error : null,
            ),
          );
        controller.dismissNotice();
      },
    );

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
        title: Text(state.info?.name ?? 'Điều khiển trận đấu'),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            ConnectionBanner(state: state.connection, onRetry: controller.load),
            Expanded(child: _buildBody(context, state, controller)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    JudgeMatchState state,
    JudgeMatchController controller,
  ) {
    if (state.isLoading) {
      return const LoadingView(message: 'Đang tải dữ liệu trận đấu...');
    }
    if (state.loadError != null) {
      return ErrorView(message: state.loadError!, onRetry: controller.load);
    }

    final List<JudgeContestant> visible = state.byStatus(_tab);

    return Column(
      children: <Widget>[
        _SummaryCard(state: state, onReloadQuestion: controller.reloadQuestion),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SegmentedButton<JudgeContestantStatus>(
            showSelectedIcon: false,
            segments: <ButtonSegment<JudgeContestantStatus>>[
              for (final JudgeContestantStatus tab in _tabs)
                ButtonSegment<JudgeContestantStatus>(
                  value: tab,
                  label:
                      Text('${_tabLabel(tab)} (${state.byStatus(tab).length})'),
                ),
            ],
            selected: <JudgeContestantStatus>{_tab},
            onSelectionChanged: (Set<JudgeContestantStatus> value) {
              setState(() => _tab = value.first);
            },
          ),
        ),
        _SelectionBar(
          tab: _tab,
          state: state,
          onSelectAll: () => controller.selectAll(_tab),
          onDeselectAll: () => controller.deselectAll(_tab),
        ),
        Expanded(
          child: visible.isEmpty
              ? const EmptyView(message: 'Chưa có thí sinh ở mục này.')
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 72,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                  ),
                  itemCount: visible.length,
                  itemBuilder: (BuildContext context, int index) {
                    final JudgeContestant contestant = visible[index];
                    return _ContestantTile(
                      contestant: contestant,
                      selected: state.selected
                          .contains(contestant.registrationNumber),
                      onTap: () =>
                          controller.toggle(contestant.registrationNumber),
                    );
                  },
                ),
        ),
        _ActionBar(tab: _tab, state: state, controller: controller),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.state, required this.onReloadQuestion});

  final JudgeMatchState state;
  final VoidCallback onReloadQuestion;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final JudgeQuestion? question = state.question;
    final int? timer = state.timerRemaining;

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Text(
                  state.currentQuestion > 0
                      ? 'Câu ${state.currentQuestion}'
                      : 'Chưa có câu hỏi',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                if (timer != null)
                  Chip(
                    avatar: Icon(
                      state.timerActive
                          ? Icons.timer
                          : Icons.timer_off_outlined,
                      size: 18,
                    ),
                    label: Text('$timer giây'),
                    visualDensity: VisualDensity.compact,
                  ),
                Chip(
                  label: Text('${state.contestants.length} thí sinh'),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (question != null) ...<Widget>[
              const SizedBox(height: 8),
              Text(question.content,
                  maxLines: 4, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 6),
              Text(
                'Đáp án: ${question.correctAnswer}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ] else if (state.questionError != null) ...<Widget>[
              const SizedBox(height: 8),
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      state.questionError!,
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ),
                  TextButton(
                    onPressed: onReloadQuestion,
                    child: const Text('Tải lại'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SelectionBar extends StatelessWidget {
  const _SelectionBar({
    required this.tab,
    required this.state,
    required this.onSelectAll,
    required this.onDeselectAll,
  });

  final JudgeContestantStatus tab;
  final JudgeMatchState state;
  final VoidCallback onSelectAll;
  final VoidCallback onDeselectAll;

  @override
  Widget build(BuildContext context) {
    // Chỉ "Đang thi" và "Xác nhận 1" có thể thao tác tiếp.
    if (tab == JudgeContestantStatus.confirmed2) {
      return const SizedBox(height: 8);
    }
    final int selectedHere = state
        .byStatus(tab)
        .where((JudgeContestant c) =>
            state.selected.contains(c.registrationNumber))
        .length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: <Widget>[
          Text('Đã chọn $selectedHere'),
          const Spacer(),
          TextButton(onPressed: onSelectAll, child: const Text('Chọn tất cả')),
          TextButton(onPressed: onDeselectAll, child: const Text('Bỏ chọn')),
        ],
      ),
    );
  }
}

class _ContestantTile extends StatelessWidget {
  const _ContestantTile({
    required this.contestant,
    required this.selected,
    required this.onTap,
  });

  final JudgeContestant contestant;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Semantics(
      selected: selected,
      label: 'Thí sinh số ${contestant.registrationNumber}',
      child: Material(
        color: selected ? scheme.primary : scheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Center(
            child: Text(
              '${contestant.registrationNumber}',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
                color: selected ? scheme.onPrimary : scheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.tab,
    required this.state,
    required this.controller,
  });

  final JudgeContestantStatus tab;
  final JudgeMatchState state;
  final JudgeMatchController controller;

  @override
  Widget build(BuildContext context) {
    final bool busy = state.isBusy;

    final List<Widget> actions = <Widget>[];
    if (tab == JudgeContestantStatus.inProgress) {
      actions.add(
        Expanded(
          child: FilledButton(
            onPressed: busy ? null : controller.confirm1,
            child: const Text('Xác nhận 1'),
          ),
        ),
      );
    } else if (tab == JudgeContestantStatus.confirmed1) {
      actions
        ..add(
          Expanded(
            child: OutlinedButton(
              onPressed: busy ? null : controller.revoke,
              child: const Text('Hủy xác nhận 1'),
            ),
          ),
        )
        ..add(const SizedBox(width: 12))
        ..add(
          Expanded(
            child: FilledButton(
              onPressed: busy ? null : controller.confirm2,
              child: const Text('Xác nhận 2'),
            ),
          ),
        );
    }

    return Material(
      elevation: 8,
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            if (actions.isNotEmpty) ...<Widget>[
              Row(children: actions),
              const SizedBox(height: 8),
            ],
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonalIcon(
                onPressed: busy || state.chotDisabled ? null : controller.chot,
                icon: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.lock_outline),
                label: Text(
                  state.chotDisabled && state.currentQuestion > 0
                      ? 'Đã chốt câu ${state.currentQuestion}'
                      : 'Chốt câu ${state.currentQuestion}',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
