import '../../../core/utils/html_text.dart';
import '../../../core/utils/json_read.dart';

/// Trạng thái thí sinh trong trận mà trọng tài thao tác được.
enum JudgeContestantStatus {
  inProgress,
  confirmed1,
  confirmed2,
  other;

  /// Giá trị gửi/nhận qua socket (`ContestantMatchStatus` của Backend).
  String get apiValue {
    switch (this) {
      case JudgeContestantStatus.inProgress:
        return 'in_progress';
      case JudgeContestantStatus.confirmed1:
        return 'confirmed1';
      case JudgeContestantStatus.confirmed2:
        return 'confirmed2';
      case JudgeContestantStatus.other:
        return 'other';
    }
  }

  static JudgeContestantStatus parse(String? value) {
    switch (value) {
      case 'in_progress':
        return JudgeContestantStatus.inProgress;
      case 'confirmed1':
        return JudgeContestantStatus.confirmed1;
      case 'confirmed2':
        return JudgeContestantStatus.confirmed2;
      default:
        return JudgeContestantStatus.other;
    }
  }
}

/// Cuộc thi trọng tài được phân công.
class JudgeContest {
  const JudgeContest({
    required this.id,
    required this.name,
    required this.slug,
  });

  final int id;
  final String name;
  final String slug;

  factory JudgeContest.fromJson(Map<String, dynamic> json) {
    final int? id = JsonRead.asInt(json['id']);
    if (id == null) {
      throw const FormatException('Cuộc thi thiếu id.');
    }
    return JudgeContest(
      id: id,
      name: JsonRead.asString(json['name']) ?? '',
      slug: JsonRead.asString(json['slug']) ?? '',
    );
  }
}

/// Trận đấu trọng tài được phân công.
class JudgeMatch {
  const JudgeMatch({
    required this.id,
    required this.name,
    required this.slug,
  });

  final int id;
  final String name;
  final String slug;

  factory JudgeMatch.fromJson(Map<String, dynamic> json) {
    final int? id = JsonRead.asInt(json['id']);
    if (id == null) {
      throw const FormatException('Trận đấu thiếu id.');
    }
    return JudgeMatch(
      id: id,
      name: JsonRead.asString(json['name']) ?? '',
      slug: JsonRead.asString(json['slug']) ?? '',
    );
  }
}

/// Thông tin trận (`GET /match/:slug/matchInfo`).
class JudgeMatchInfo {
  const JudgeMatchInfo({
    required this.id,
    required this.slug,
    required this.name,
    required this.currentQuestion,
    required this.remainingTime,
    required this.status,
  });

  final int id;
  final String slug;
  final String name;
  final int currentQuestion;
  final int remainingTime;
  final String status;

  factory JudgeMatchInfo.fromJson(Map<String, dynamic> json) {
    return JudgeMatchInfo(
      id: JsonRead.asInt(json['id']) ?? 0,
      slug: JsonRead.asString(json['slug']) ?? '',
      name: JsonRead.asString(json['name']) ?? '',
      currentQuestion: JsonRead.asInt(json['currentQuestion']) ?? 0,
      remainingTime: JsonRead.asInt(json['remainingTime']) ?? 0,
      status: JsonRead.asString(json['status']) ?? '',
    );
  }
}

/// Thí sinh thuộc nhóm của trọng tài.
class JudgeContestant {
  const JudgeContestant({
    required this.registrationNumber,
    required this.status,
    required this.rawStatus,
  });

  final int registrationNumber;
  final JudgeContestantStatus status;

  /// Trạng thái gốc từ Backend (kể cả `eliminated`, `banned`...).
  final String rawStatus;

  static JudgeContestant? tryFromJson(Object? raw) {
    final Map<String, dynamic>? json = JsonRead.asMap(raw);
    if (json == null) {
      return null;
    }
    final int? number = JsonRead.asInt(json['registrationNumber']);
    if (number == null) {
      return null;
    }
    final String rawStatus = JsonRead.asString(json['status']) ?? '';
    return JudgeContestant(
      registrationNumber: number,
      status: JudgeContestantStatus.parse(rawStatus),
      rawStatus: rawStatus,
    );
  }

  static List<JudgeContestant> listFrom(Object? raw) {
    final List<JudgeContestant> result = <JudgeContestant>[];
    for (final dynamic item in JsonRead.asList(raw)) {
      final JudgeContestant? parsed = tryFromJson(item);
      if (parsed != null) {
        result.add(parsed);
      }
    }
    result.sort(
      (JudgeContestant a, JudgeContestant b) =>
          a.registrationNumber.compareTo(b.registrationNumber),
    );
    return List<JudgeContestant>.unmodifiable(result);
  }
}

/// Nhóm thí sinh của trọng tài trong trận (`GET /group/match/:slug`).
class JudgeGroup {
  const JudgeGroup({
    required this.id,
    required this.name,
    required this.confirmCurrentQuestion,
  });

  final int id;
  final String name;

  /// Số câu cao nhất trọng tài đã chốt.
  final int confirmCurrentQuestion;

  factory JudgeGroup.fromJson(Map<String, dynamic> json) {
    final int? id = JsonRead.asInt(json['id']);
    if (id == null) {
      throw const FormatException('Nhóm thiếu id.');
    }
    return JudgeGroup(
      id: id,
      name: JsonRead.asString(json['name']) ?? '',
      confirmCurrentQuestion:
          JsonRead.asInt(json['confirmCurrentQuestion']) ?? 0,
    );
  }
}

/// Câu hỏi hiện tại kèm đáp án, chỉ trọng tài/Admin được xem.
class JudgeQuestion {
  const JudgeQuestion({
    required this.order,
    required this.content,
    required this.options,
    required this.correctAnswer,
    this.explanation,
    this.questionType = '',
  });

  final int order;
  final String content;
  final List<String> options;
  final String correctAnswer;
  final String? explanation;
  final String questionType;

  factory JudgeQuestion.fromJson(Map<String, dynamic> json) {
    return JudgeQuestion(
      order: JsonRead.asInt(json['questionOrder']) ?? 0,
      content: HtmlText.toPlain(JsonRead.asString(json['content'])),
      options: JsonRead.asStringList(json['options']),
      correctAnswer: HtmlText.toPlain(JsonRead.asString(json['correctAnswer'])),
      explanation: HtmlText.toPlain(JsonRead.asString(json['explanation'])),
      questionType: JsonRead.asString(json['questionType']) ?? '',
    );
  }
}
