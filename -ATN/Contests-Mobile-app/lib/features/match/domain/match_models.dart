import '../../../core/network/socket_service.dart';
import '../../../core/utils/html_text.dart';
import '../../../core/utils/json_read.dart';
import '../../../core/utils/media_url.dart';

/// Giai đoạn của trận đấu nhìn từ phía thí sinh.
enum MatchPhase {
  /// Đã vào phòng chờ, trận chưa bắt đầu hoặc chưa có câu hỏi.
  waiting,

  /// Trận đang diễn ra và đã có câu hỏi hiện tại.
  running,

  /// Trận đã kết thúc.
  ended,
}

/// Tình trạng của thí sinh trong trận.
enum ContestantPlayStatus {
  playing,
  eliminated,
  rescued,
  banned,
}

/// Tệp đa phương tiện đính kèm câu hỏi.
class QuestionMedia {
  const QuestionMedia({required this.type, required this.url});

  /// `image`, `video` hoặc `audio`.
  final String type;
  final String url;

  bool get isImage => type == 'image';

  static QuestionMedia? tryFromJson(Object? raw) {
    if (raw is String && raw.trim().isNotEmpty) {
      return QuestionMedia(type: _guessType(raw), url: resolveMediaUrl(raw)!);
    }
    final Map<String, dynamic>? json = JsonRead.asMap(raw);
    if (json == null) {
      return null;
    }
    final String? url = resolveMediaUrl(JsonRead.asString(json['url']));
    if (url == null) {
      return null;
    }
    return QuestionMedia(
      type: JsonRead.asString(json['type']) ?? _guessType(url),
      url: url,
    );
  }

  static String _guessType(String url) {
    final String lower = url.toLowerCase();
    if (lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mov')) {
      return 'video';
    }
    if (lower.endsWith('.mp3') ||
        lower.endsWith('.wav') ||
        lower.endsWith('.ogg')) {
      return 'audio';
    }
    return 'image';
  }
}

/// Câu hỏi do server gửi cho thí sinh (không bao giờ có đáp án đúng).
class QuestionPayload {
  const QuestionPayload({
    required this.id,
    required this.order,
    required this.content,
    required this.questionType,
    required this.options,
    required this.defaultTime,
    required this.score,
    this.intro,
    this.difficulty,
    this.media = const <QuestionMedia>[],
  });

  final int id;

  /// Thứ tự câu trong trận (1, 2, 3...).
  final int order;
  final String content;
  final String? intro;
  final String questionType;
  final String? difficulty;
  final List<String> options;
  final int defaultTime;
  final int score;
  final List<QuestionMedia> media;

  /// Câu tự luận: nhập chữ thay vì chọn phương án.
  bool get isEssay => questionType == 'essay' || options.isEmpty;

  /// Đọc từ `currentQuestionData` của `match:questionShown`:
  /// `{ order, question: { id, content, ... } }`.
  factory QuestionPayload.fromQuestionData(Map<String, dynamic> data) {
    final Map<String, dynamic>? question = JsonRead.asMap(data['question']);
    if (question == null) {
      throw const FormatException('Thiếu nội dung câu hỏi.');
    }
    final int order = JsonRead.asInt(data['order']) ?? 0;
    return QuestionPayload.fromQuestionJson(question, order: order);
  }

  /// Đọc từ bản ghi câu hỏi; [order] là thứ tự câu trong trận.
  factory QuestionPayload.fromQuestionJson(
    Map<String, dynamic> question, {
    required int order,
  }) {
    final int? id = JsonRead.asInt(question['id']);
    if (id == null) {
      throw const FormatException('Câu hỏi thiếu id.');
    }

    final List<QuestionMedia> media = <QuestionMedia>[];
    for (final dynamic item in JsonRead.asList(question['media'])) {
      final QuestionMedia? parsed = QuestionMedia.tryFromJson(item);
      if (parsed != null) {
        media.add(parsed);
      }
    }
    for (final dynamic item in JsonRead.asList(question['questionMedia'])) {
      final QuestionMedia? parsed = QuestionMedia.tryFromJson(item);
      if (parsed != null) {
        media.add(parsed);
      }
    }

    return QuestionPayload(
      id: id,
      order: order,
      content: HtmlText.toPlain(JsonRead.asString(question['content'])),
      intro: HtmlText.toPlain(JsonRead.asString(question['intro'])),
      questionType:
          JsonRead.asString(question['questionType']) ?? 'multiple_choice',
      difficulty: JsonRead.asString(question['difficulty']),
      options: JsonRead.asStringList(question['options'])
          .map(HtmlText.toPlain)
          .toList(growable: false),
      defaultTime: JsonRead.asInt(question['defaultTime']) ?? 0,
      score: JsonRead.asInt(question['score']) ?? 1,
      media: List<QuestionMedia>.unmodifiable(media),
    );
  }
}

/// Kết quả chấm điểm của câu vừa nộp (`data.result` của `submit-answer`).
class AnswerResult {
  const AnswerResult({
    required this.isCorrect,
    required this.eliminated,
    required this.score,
    required this.questionOrder,
    this.correctAnswer,
    this.explanation,
    this.alreadyAnswered = false,
  });

  final bool isCorrect;
  final bool eliminated;
  final int score;
  final int questionOrder;
  final String? correctAnswer;
  final String? explanation;

  /// Server báo thí sinh đã nộp câu này trước đó.
  final bool alreadyAnswered;

  factory AnswerResult.fromJson(Map<String, dynamic> json) {
    final Object? correct = json['correctAnswer'];
    String? correctText;
    if (correct is List) {
      correctText = correct.map((dynamic e) => e.toString()).join(', ');
    } else {
      correctText = JsonRead.asString(correct);
    }

    return AnswerResult(
      isCorrect: JsonRead.asBool(json['isCorrect']) ?? false,
      eliminated: JsonRead.asBool(json['eliminated']) ?? false,
      score: JsonRead.asInt(json['score']) ?? 0,
      questionOrder: JsonRead.asInt(json['questionOrder']) ?? 0,
      correctAnswer: correctText,
      explanation: JsonRead.asString(json['explanation']),
    );
  }
}

/// Trạng thái trực tiếp của trận đấu trên màn hình thí sinh.
class MatchLiveState {
  const MatchLiveState({
    this.isLoading = true,
    this.loadError,
    this.connection = SocketConnectionState.disconnected,
    this.matchName = '',
    this.registrationNumber,
    this.phase = MatchPhase.waiting,
    this.question,
    this.remainingTime = 0,
    this.isTimerActive = false,
    this.isTimerPaused = false,
    this.timeIsUp = false,
    this.status = ContestantPlayStatus.playing,
    this.selectedAnswer = '',
    this.isSubmitting = false,
    this.hasSubmitted = false,
    this.result,
    this.submitError,
    this.notice,
    this.violationCount = 0,
    this.answeredCount,
    this.correctCount,
    this.matchInProgress = false,
  });

  /// Đang vào phòng thi lần đầu.
  final bool isLoading;

  /// Lỗi khi vào phòng thi (kết nối, vào room, đồng bộ).
  final String? loadError;
  final SocketConnectionState connection;
  final String matchName;
  final int? registrationNumber;

  final MatchPhase phase;
  final QuestionPayload? question;

  /// Số giây còn lại (do server gửi, được app giảm dần giữa hai lần cập nhật).
  final int remainingTime;
  final bool isTimerActive;
  final bool isTimerPaused;

  /// Đã hết giờ ở câu hiện tại.
  final bool timeIsUp;
  final ContestantPlayStatus status;
  final String selectedAnswer;
  final bool isSubmitting;
  final bool hasSubmitted;
  final AnswerResult? result;
  final String? submitError;

  /// Thông báo ngắn hiển thị cho thí sinh (được cứu, sắp hết giờ...).
  final String? notice;

  /// Số lần thí sinh rời ứng dụng trong lúc thi (chống gian lận).
  final int violationCount;

  /// Tổng kết hiện ở màn hình hoàn thành bài thi; `null` khi chưa lấy được
  /// từ server.
  final int? answeredCount;
  final int? correctCount;

  /// Trận đã bắt đầu và chưa kết thúc.
  final bool matchInProgress;

  /// Thí sinh của trận đang diễn ra không được rời phòng thi: không có nút
  /// quay lại, chỉ ra bằng nút "Về trang chủ" khi trận kết thúc. Không có số
  /// báo danh (không thi trận này) thì vẫn rời được.
  bool get mustStay => matchInProgress && registrationNumber != null;

  bool get canAnswer =>
      phase == MatchPhase.running &&
      question != null &&
      status != ContestantPlayStatus.eliminated &&
      status != ContestantPlayStatus.banned &&
      !hasSubmitted &&
      !isSubmitting &&
      !timeIsUp;

  /// Chỉ hiện kết quả sau khi hết giờ, giống web.
  bool get canShowResult => timeIsUp && result != null;

  MatchLiveState copyWith({
    bool? isLoading,
    String? loadError,
    bool clearLoadError = false,
    SocketConnectionState? connection,
    String? matchName,
    int? registrationNumber,
    MatchPhase? phase,
    QuestionPayload? question,
    bool clearQuestion = false,
    int? remainingTime,
    bool? isTimerActive,
    bool? isTimerPaused,
    bool? timeIsUp,
    ContestantPlayStatus? status,
    String? selectedAnswer,
    bool? isSubmitting,
    bool? hasSubmitted,
    AnswerResult? result,
    bool clearResult = false,
    String? submitError,
    bool clearSubmitError = false,
    String? notice,
    bool clearNotice = false,
    int? violationCount,
    int? answeredCount,
    int? correctCount,
    bool? matchInProgress,
  }) {
    return MatchLiveState(
      isLoading: isLoading ?? this.isLoading,
      loadError: clearLoadError ? null : (loadError ?? this.loadError),
      connection: connection ?? this.connection,
      matchName: matchName ?? this.matchName,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      phase: phase ?? this.phase,
      question: clearQuestion ? null : (question ?? this.question),
      remainingTime: remainingTime ?? this.remainingTime,
      isTimerActive: isTimerActive ?? this.isTimerActive,
      isTimerPaused: isTimerPaused ?? this.isTimerPaused,
      timeIsUp: timeIsUp ?? this.timeIsUp,
      status: status ?? this.status,
      selectedAnswer: selectedAnswer ?? this.selectedAnswer,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      hasSubmitted: hasSubmitted ?? this.hasSubmitted,
      result: clearResult ? null : (result ?? this.result),
      submitError: clearSubmitError ? null : (submitError ?? this.submitError),
      notice: clearNotice ? null : (notice ?? this.notice),
      violationCount: violationCount ?? this.violationCount,
      answeredCount: answeredCount ?? this.answeredCount,
      correctCount: correctCount ?? this.correctCount,
      matchInProgress: matchInProgress ?? this.matchInProgress,
    );
  }
}

/// Số lần rời ứng dụng tối đa trước khi bị cấm thi (khớp với bản web).
const int maxViolations = 3;
