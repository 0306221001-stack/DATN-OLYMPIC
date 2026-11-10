import '../../../core/utils/json_read.dart';
import 'match_models.dart';

/// Ảnh chụp trạng thái trận từ `student:getMatchStatus`, dùng để khôi phục
/// khi thí sinh vào giữa chừng hoặc kết nối lại.
class MatchSnapshot {
  const MatchSnapshot({
    required this.matchId,
    required this.matchName,
    required this.status,
    required this.currentQuestion,
    required this.remainingTime,
    required this.contestantStatus,
    required this.answeredOrders,
    this.correctCount = 0,
    this.contestantNotStarted = false,
  });

  /// Thí sinh vẫn ở `not_started` dù trận đã chạy (vào muộn): Backend từ chối
  /// nhận đáp án cho tới khi thí sinh gửi `student:confirmStart`.
  final bool contestantNotStarted;

  final int matchId;
  final String matchName;

  /// `upcoming`, `ongoing` hoặc `finished`.
  final String status;
  final int currentQuestion;
  final int remainingTime;
  final ContestantPlayStatus contestantStatus;

  /// Các câu thí sinh đã nộp.
  final Set<int> answeredOrders;

  /// Số câu thí sinh trả lời đúng.
  final int correctCount;

  bool get isOngoing => status == 'ongoing';
  bool get isFinished => status == 'finished';

  /// Đọc từ `data` của ack: `{ matchData, contestantStatus, results }`.
  factory MatchSnapshot.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? matchData = JsonRead.asMap(json['matchData']);
    if (matchData == null) {
      throw const FormatException('Thiếu thông tin trận đấu.');
    }

    final Set<int> answered = <int>{};
    int correct = 0;
    for (final dynamic item in JsonRead.asList(json['results'])) {
      final Map<String, dynamic>? result = JsonRead.asMap(item);
      final int? order =
          result == null ? null : JsonRead.asInt(result['questionOrder']);
      if (order != null) {
        answered.add(order);
      }
      if (result != null && (JsonRead.asBool(result['isCorrect']) ?? false)) {
        correct++;
      }
    }

    return MatchSnapshot(
      matchId: JsonRead.asInt(matchData['matchId']) ?? 0,
      matchName: JsonRead.asString(matchData['matchName']) ?? '',
      status: JsonRead.asString(matchData['status']) ?? 'upcoming',
      currentQuestion: JsonRead.asInt(matchData['currentQuestion']) ?? 0,
      remainingTime: JsonRead.asInt(matchData['remainingTime']) ?? 0,
      contestantStatus:
          parseContestantStatus(JsonRead.asString(json['contestantStatus'])),
      contestantNotStarted:
          JsonRead.asString(json['contestantStatus']) == 'not_started',
      answeredOrders: Set<int>.unmodifiable(answered),
      correctCount: correct,
    );
  }

  /// Quy trạng thái `ContestantMatchStatus` của Backend về enum của app.
  static ContestantPlayStatus parseContestantStatus(String? value) {
    switch (value) {
      case 'eliminated':
        return ContestantPlayStatus.eliminated;
      case 'banned':
        return ContestantPlayStatus.banned;
      case 'rescued':
        return ContestantPlayStatus.rescued;
      default:
        return ContestantPlayStatus.playing;
    }
  }
}
