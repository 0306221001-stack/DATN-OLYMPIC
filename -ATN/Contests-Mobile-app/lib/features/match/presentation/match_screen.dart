import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../rescue/presentation/rescue_screen.dart';
import '../domain/match_models.dart';
import 'match_controller.dart';
import 'widgets/answer_input.dart';
import 'widgets/countdown_ring.dart';

/// Nội dung làm bài: câu hỏi, đồng hồ, ô trả lời và kết quả.
class MatchScreen extends ConsumerWidget {
  const MatchScreen({super.key, required this.matchSlug});

  final String matchSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final MatchLiveState state = ref.watch(matchControllerProvider(matchSlug));
    final MatchController controller =
        ref.read(matchControllerProvider(matchSlug).notifier);
    final QuestionPayload? question = state.question;

    if (question == null) {
      return const SizedBox.shrink();
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        _QuestionHeader(state: state, question: question),
        const SizedBox(height: 12),
        _StatusBanner(state: state),
        _QuestionCard(question: question),
        const SizedBox(height: 16),
        if (question.isEssay)
          EssayInput(
            key: ValueKey<String>('essay-${question.id}-${question.order}'),
            initialValue: state.selectedAnswer,
            enabled: state.canAnswer,
            onChanged: controller.selectAnswer,
            onSubmitted: state.canAnswer ? controller.submit : null,
          )
        else
          AnswerOptions(
            options: question.options,
            selected: state.selectedAnswer,
            enabled: state.canAnswer,
            onSelected: controller.selectAnswer,
          ),
        if (state.submitError != null) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            state.submitError!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 12),
        _SubmitArea(state: state, onSubmit: controller.submit),
        if (state.timeIsUp) ...<Widget>[
          const SizedBox(height: 16),
          _ResultPanel(state: state),
        ],
        // Bị loại/cấm thì hiện khối chờ cứu trợ; được cứu thì khối này đổi
        // ngay thành thông báo hồi sinh tại chỗ, không cần rời phòng thi.
        if (state.status != ContestantPlayStatus.playing) ...<Widget>[
          const SizedBox(height: 16),
          RescuePanel(status: state.status),
        ],
        const SizedBox(height: 24),
      ],
    );
  }
}

class _QuestionHeader extends StatelessWidget {
  const _QuestionHeader({required this.state, required this.question});

  final MatchLiveState state;
  final QuestionPayload question;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Câu ${question.order}',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: <Widget>[
                  if (state.registrationNumber != null)
                    Chip(
                      avatar: const Icon(Icons.badge_outlined, size: 18),
                      label: Text('SBD ${state.registrationNumber}'),
                      visualDensity: VisualDensity.compact,
                    ),
                  Chip(
                    avatar: const Icon(Icons.star_outline, size: 18),
                    label: Text('${question.score} điểm'),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ],
          ),
        ),
        CountdownRing(
          remaining: state.remainingTime,
          total: question.defaultTime,
          isPaused: state.isTimerPaused,
        ),
      ],
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.state});

  final MatchLiveState state;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // Bị loại, bị cấm thi hay được cứu trợ đều hiển thị bằng `RescuePanel` ở
    // cuối màn hình; banner này chỉ còn cảnh báo rời khỏi ứng dụng.
    if (state.violationCount == 0 ||
        state.status != ContestantPlayStatus.playing) {
      return const SizedBox.shrink();
    }

    final Color foreground = theme.colorScheme.onErrorContainer;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: <Widget>[
            Icon(Icons.warning_amber_rounded, color: foreground),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Cảnh báo: bạn đã rời khỏi ứng dụng ${state.violationCount}/'
                '$maxViolations lần. Đủ $maxViolations lần sẽ bị cấm thi.',
                style: theme.textTheme.bodyMedium?.copyWith(color: foreground),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.question});

  final QuestionPayload question;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String? intro = question.intro;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (intro != null && intro.trim().isNotEmpty) ...<Widget>[
              Text(
                intro,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 12),
            ],
            Text(question.content, style: theme.textTheme.titleMedium),
            for (final QuestionMedia media in question.media) ...<Widget>[
              const SizedBox(height: 12),
              _MediaView(media: media),
            ],
          ],
        ),
      ),
    );
  }
}

class _MediaView extends StatelessWidget {
  const _MediaView({required this.media});

  final QuestionMedia media;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    if (!media.isImage) {
      return Row(
        children: <Widget>[
          Icon(
            media.type == 'video'
                ? Icons.movie_outlined
                : Icons.audiotrack_outlined,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              media.type == 'video'
                  ? 'Câu hỏi có video, vui lòng xem trên màn hình chiếu.'
                  : 'Câu hỏi có âm thanh, vui lòng nghe trên màn hình chiếu.',
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        media.url,
        fit: BoxFit.contain,
        loadingBuilder:
            (BuildContext context, Widget child, ImageChunkEvent? progress) {
          if (progress == null) {
            return child;
          }
          return const SizedBox(
            height: 160,
            child: Center(child: CircularProgressIndicator()),
          );
        },
        errorBuilder: (BuildContext context, Object error, StackTrace? stack) {
          return SizedBox(
            height: 80,
            child: Center(
              child: Text(
                'Không tải được hình ảnh.',
                style: theme.textTheme.bodyMedium,
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SubmitArea extends StatelessWidget {
  const _SubmitArea({required this.state, required this.onSubmit});

  final MatchLiveState state;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    if (state.hasSubmitted && !state.timeIsUp) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: <Widget>[
            Icon(
              Icons.check_circle_outline,
              color: theme.colorScheme.onPrimaryContainer,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Đã gửi đáp án. Kết quả sẽ hiển thị khi hết giờ.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (state.timeIsUp) {
      return const SizedBox.shrink();
    }

    return FilledButton.icon(
      onPressed: state.canAnswer && state.selectedAnswer.trim().isNotEmpty
          ? onSubmit
          : null,
      icon: state.isSubmitting
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.send_rounded),
      label: Text(state.isSubmitting ? 'Đang gửi...' : 'Gửi đáp án'),
      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
    );
  }
}

class _ResultPanel extends StatelessWidget {
  const _ResultPanel({required this.state});

  final MatchLiveState state;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AnswerResult? result = state.result;

    if (result == null) {
      final bool failed = state.submitError != null && !state.isSubmitting;
      // Chỉ quay vòng khi đang gửi thật. Đáp án đã gửi trước khi vào lại phòng
      // không còn kết quả trên máy; thí sinh bị loại/cấm thì không tự nộp.
      final String text;
      if (failed) {
        text = 'Không chấm được đáp án của bạn.';
      } else if (state.isSubmitting) {
        text = 'Hết giờ. Đang chấm điểm...';
      } else if (state.hasSubmitted) {
        text = 'Hết giờ. Đáp án của bạn đã được ghi nhận.';
      } else {
        text = 'Hết giờ.';
      }
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: <Widget>[
              if (state.isSubmitting)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              if (state.isSubmitting) const SizedBox(width: 12),
              Expanded(
                child: Text(text, style: theme.textTheme.bodyLarge),
              ),
            ],
          ),
        ),
      );
    }

    final bool correct = result.isCorrect;
    final Color color =
        correct ? Colors.green.shade700 : theme.colorScheme.error;

    return Card(
      color: correct
          ? Colors.green.withValues(alpha: 0.12)
          : theme.colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(
                  correct ? Icons.check_circle : Icons.cancel,
                  color: color,
                ),
                const SizedBox(width: 8),
                Text(
                  correct ? 'Chính xác!' : 'Chưa chính xác',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                if (correct)
                  Text(
                    '+${result.score} điểm',
                    style: theme.textTheme.titleSmall?.copyWith(color: color),
                  ),
              ],
            ),
            if (result.correctAnswer != null &&
                result.correctAnswer!.trim().isNotEmpty) ...<Widget>[
              const SizedBox(height: 8),
              Text('Đáp án đúng: ${result.correctAnswer}'),
            ],
            if (result.explanation != null &&
                result.explanation!.trim().isNotEmpty) ...<Widget>[
              const SizedBox(height: 8),
              Text('Giải thích: ${result.explanation}'),
            ],
            if (result.eliminated) ...<Widget>[
              const SizedBox(height: 12),
              Text(
                state.status == ContestantPlayStatus.rescued
                    ? 'Bạn đã được cứu trợ và tiếp tục thi ở câu sau.'
                    : 'Bạn đã bị loại khỏi trận đấu.',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: state.status == ContestantPlayStatus.rescued
                      ? Colors.green.shade700
                      : theme.colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
