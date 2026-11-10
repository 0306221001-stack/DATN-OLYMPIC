import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/router/auth_guard.dart';
import '../../auth/domain/auth_user.dart';
import '../data/match_repository.dart';
import '../data/match_socket_gateway.dart';
import '../domain/match_event.dart';
import '../domain/match_models.dart';
import '../domain/match_snapshot.dart';

/// Quản lý toàn bộ vòng đời một trận đấu phía thí sinh: vào phòng, nhận sự
/// kiện, đếm ngược, nộp đáp án. Tham số family là `slug` của trận.
class MatchController
    extends AutoDisposeFamilyNotifier<MatchLiveState, String> {
  late String _slug;
  int? _matchId;
  int? _contestantId;

  StreamSubscription<MatchEvent>? _eventSubscription;
  StreamSubscription<SocketConnectionState>? _connectionSubscription;
  Timer? _ticker;
  bool _disposed = false;
  bool _hasConnectedOnce = false;
  int _autoSubmittedOrder = -1;
  bool _awayCounted = false;
  bool _banning = false;

  /// Giữ sẵn từ lúc khởi tạo vì `_cleanup` chạy khi provider đã bị hủy, lúc đó
  /// không đọc được provider khác nữa.
  late MatchSocketGateway _gateway;
  MatchRepository get _repository => ref.read(matchRepositoryProvider);

  @override
  MatchLiveState build(String arg) {
    _slug = arg;
    _disposed = false;
    _gateway = ref.read(matchSocketGatewayProvider);
    ref.onDispose(_cleanup);
    Future<void>.microtask(_start);
    return const MatchLiveState();
  }

  // ---------------------------------------------------------------------------
  // Thao tác từ giao diện
  // ---------------------------------------------------------------------------

  /// Thử lại sau khi vào phòng thất bại.
  Future<void> retry() {
    return _start();
  }

  /// Chọn phương án hoặc gõ đáp án tự luận.
  void selectAnswer(String answer) {
    if (!state.canAnswer) {
      return;
    }
    _update(state.copyWith(selectedAnswer: answer, clearSubmitError: true));
  }

  /// Nộp đáp án đang chọn.
  Future<void> submit() async {
    final String answer = state.selectedAnswer.trim();
    if (answer.isEmpty) {
      _update(state.copyWith(submitError: 'Vui lòng chọn hoặc nhập đáp án.'));
      return;
    }
    await _submit(answer);
  }

  void dismissNotice() {
    _update(state.copyWith(clearNotice: true));
  }

  // ---------------------------------------------------------------------------
  // Chống gian lận
  // ---------------------------------------------------------------------------

  /// Giao diện gọi khi ứng dụng bị đưa ra nền hoặc ẩn đi (`paused`/`hidden`).
  ///
  /// Mỗi lần rời đi tính một vi phạm (chỉ tính một lần cho tới khi quay lại).
  /// Đủ [maxViolations] lần thì bị cấm thi.
  void onAppLeft() {
    if (_awayCounted || !_isMonitored) {
      return;
    }
    _awayCounted = true;

    final int count = state.violationCount + 1;
    if (count >= maxViolations) {
      _update(state.copyWith(violationCount: count));
      unawaited(_ban(count));
      return;
    }

    _update(state.copyWith(
      violationCount: count,
      notice: 'Cảnh báo: bạn vừa rời khỏi ứng dụng ($count/$maxViolations). '
          'Vi phạm $maxViolations lần sẽ bị cấm thi.',
    ));
  }

  /// Giao diện gọi khi ứng dụng quay lại màn hình.
  void onAppResumed() {
    _awayCounted = false;
    if (_matchId != null && !_disposed) {
      // Kết nối thường đã bị cắt lúc ở nền. Khi nối lại xong, bộ lắng nghe
      // trạng thái kết nối sẽ vào lại room và đồng bộ trận.
      unawaited(_gateway.reconnectIfNeeded());
    }
  }

  /// Chỉ giám sát khi thí sinh đang làm bài: có câu hỏi, chưa hết giờ, chưa
  /// bị loại hay bị cấm.
  bool get _isMonitored =>
      state.phase == MatchPhase.running &&
      state.question != null &&
      !state.timeIsUp &&
      !_banning &&
      (state.status == ContestantPlayStatus.playing ||
          state.status == ContestantPlayStatus.rescued);

  Future<void> _ban(int violationCount) async {
    final int? matchId = _matchId;
    if (matchId == null || _banning) {
      return;
    }
    _banning = true;

    // Khóa thao tác ngay, không chờ Backend phản hồi.
    _update(state.copyWith(
      status: ContestantPlayStatus.banned,
      notice: 'Bạn đã bị cấm thi do rời khỏi ứng dụng $violationCount lần.',
    ));

    try {
      await _repository.banContestant(
        matchId: matchId,
        violationCount: violationCount,
      );
    } on ApiException catch (error) {
      _update(state.copyWith(
        notice: 'Bạn bị cấm thi nhưng chưa gửi được báo cáo: ${error.message}',
      ));
    } catch (_) {
      _update(state.copyWith(
        notice: 'Bạn bị cấm thi nhưng chưa gửi được báo cáo lên máy chủ.',
      ));
    }
  }

  // ---------------------------------------------------------------------------
  // Khởi động
  // ---------------------------------------------------------------------------

  Future<void> _start() async {
    _update(state.copyWith(isLoading: true, clearLoadError: true));
    try {
      final MatchSummary match = await _resolveMatch();
      _matchId = match.id;
      _update(state.copyWith(matchName: match.name));

      unawaited(_loadRegistrationNumber(match.id));

      await _gateway.ensureConnected();
      await _gateway.joinRooms(matchSlug: _slug, matchId: match.id);
      _listenToSocket(match.id);
      await _sync();

      _hasConnectedOnce = true;
      _update(state.copyWith(
        isLoading: false,
        connection: _gateway.connection.state,
      ));
    } on ApiException catch (error) {
      _update(state.copyWith(isLoading: false, loadError: error.message));
    } catch (_) {
      _update(state.copyWith(
        isLoading: false,
        loadError: 'Không thể vào phòng thi. Vui lòng thử lại.',
      ));
    }
  }

  Future<MatchSummary> _resolveMatch() async {
    final AuthUser? user = ref.read(authSessionControllerProvider).user;
    final StudentProfile? profile = user?.student;
    if (profile == null) {
      throw const ApiException(
        message: 'Không tìm thấy thông tin thí sinh trong cuộc thi.',
        code: 'CONTESTANT_NOT_FOUND',
      );
    }
    _contestantId = profile.contestant.id;

    MatchSummary? found = _findMatch(profile.matches);
    if (found == null) {
      final List<MatchSummary> refreshed = await _repository.refreshMatches();
      found = _findMatch(refreshed);
    }
    if (found == null) {
      throw const ApiException(
        message: 'Không tìm thấy trận đấu này trong cuộc thi của bạn.',
        code: 'MATCH_NOT_FOUND',
      );
    }
    return found;
  }

  MatchSummary? _findMatch(List<MatchSummary> matches) {
    for (final MatchSummary match in matches) {
      if (match.slug == _slug || match.id.toString() == _slug) {
        return match;
      }
    }
    return null;
  }

  Future<void> _loadRegistrationNumber(int matchId) async {
    final int? contestantId = _contestantId;
    if (contestantId == null) {
      return;
    }
    try {
      final int? number = await _repository.fetchRegistrationNumber(
        contestantId: contestantId,
        matchId: matchId,
      );
      if (number != null) {
        _update(state.copyWith(registrationNumber: number));
      }
    } on ApiException {
      // Số báo danh chỉ để hiển thị; thiếu thì vẫn thi được.
    }
  }

  void _listenToSocket(int matchId) {
    _eventSubscription?.cancel();
    _eventSubscription =
        _gateway.watch(matchSlug: _slug, matchId: matchId).listen(_handleEvent);

    _connectionSubscription?.cancel();
    _connectionSubscription =
        _gateway.connection.stateStream.listen(_handleConnectionState);
  }

  // ---------------------------------------------------------------------------
  // Đồng bộ và kết nối lại
  // ---------------------------------------------------------------------------

  Future<void> _handleConnectionState(SocketConnectionState next) async {
    _update(state.copyWith(connection: next));
    if (next != SocketConnectionState.connected || !_hasConnectedOnce) {
      return;
    }
    // Kết nối lại: vào lại room (server đã quên) rồi lấy lại trạng thái trận.
    final int? matchId = _matchId;
    if (matchId == null) {
      return;
    }
    try {
      await _gateway.joinRooms(matchSlug: _slug, matchId: matchId);
      await _sync();
      // Số báo danh còn dùng để biết thí sinh có phải ở lại phòng thi không.
      if (state.registrationNumber == null) {
        unawaited(_loadRegistrationNumber(matchId));
      }
    } on ApiException catch (error) {
      _update(state.copyWith(
        notice: 'Chưa đồng bộ lại được trận đấu: ${error.message}',
      ));
    }
  }

  /// Lấy trạng thái trận từ server và khôi phục câu hỏi đang diễn ra nếu có.
  Future<void> _sync() async {
    final int? matchId = _matchId;
    if (matchId == null) {
      return;
    }

    final MatchSnapshot snapshot = await _gateway.fetchSnapshot();
    final bool alreadyAnswered =
        snapshot.answeredOrders.contains(snapshot.currentQuestion);

    if (snapshot.isFinished) {
      _stopTicker();
      _update(state.copyWith(
        phase: MatchPhase.ended,
        isTimerActive: false,
        matchInProgress: false,
        status: snapshot.contestantStatus,
        answeredCount: snapshot.answeredOrders.length,
        correctCount: snapshot.correctCount,
      ));
      return;
    }

    if (!snapshot.isOngoing) {
      _update(state.copyWith(
        status: snapshot.contestantStatus,
        matchInProgress: false,
      ));
      return;
    }

    // Vào muộn khi trận đã chạy: tự xác nhận để Backend nhận đáp án. Chỉ làm
    // với `not_started`, vì `student:confirmStart` ghi đè trạng thái vô điều
    // kiện và sẽ "hồi sinh" thí sinh đã bị loại nếu gọi lại.
    final int? contestantId = _contestantId;
    if (snapshot.contestantNotStarted && contestantId != null) {
      _gateway.confirmStart(contestantId: contestantId, matchId: matchId);
    }

    // Trận đang diễn ra. Chỉ khôi phục câu hỏi khi đồng hồ còn chạy, để không
    // lộ câu hỏi trước khi Admin chiếu (match:start đặt currentQuestion = 1).
    final bool questionIsLive =
        snapshot.currentQuestion > 0 && snapshot.remainingTime > 0;
    final QuestionPayload? current = state.question;
    if (questionIsLive && current?.order != snapshot.currentQuestion) {
      final QuestionPayload question = await _gateway.fetchQuestion(
        matchId: matchId,
        questionOrder: snapshot.currentQuestion,
        fallbackTime: snapshot.remainingTime,
      );
      // Câu không có phương án chỉ được dựng khi Backend xác nhận loại câu
      // (câu tự luận). Backend cũ không gửi loại câu nên không phân biệt được
      // với câu bị mất phương án: khi đó chờ Admin chiếu lại để nhận
      // `match:questionShown` đầy đủ.
      final bool typeKnown = question.questionType.isNotEmpty;
      final bool canRender = question.options.isNotEmpty ||
          (typeKnown && question.questionType != 'multiple_choice');
      if (canRender) {
        _applyQuestion(
          question,
          snapshot.remainingTime,
          alreadyAnswered: alreadyAnswered,
        );
      }
    } else if (questionIsLive) {
      _update(state.copyWith(
        remainingTime: snapshot.remainingTime,
        hasSubmitted: state.hasSubmitted || alreadyAnswered,
      ));
    } else if (state.phase != MatchPhase.running) {
      _update(state.copyWith(phase: MatchPhase.waiting));
    }

    _update(state.copyWith(
      status: _mergeStatus(snapshot.contestantStatus),
      matchInProgress: true,
    ));
  }

  /// Giữ trạng thái "được cứu" nếu server chưa cập nhật kịp.
  ContestantPlayStatus _mergeStatus(ContestantPlayStatus fromServer) {
    if (fromServer == ContestantPlayStatus.playing &&
        state.status == ContestantPlayStatus.rescued) {
      return ContestantPlayStatus.rescued;
    }
    return fromServer;
  }

  // ---------------------------------------------------------------------------
  // Xử lý sự kiện realtime
  // ---------------------------------------------------------------------------

  void _handleEvent(MatchEvent event) {
    // Trận đã kết thúc: bỏ qua nhịp đồng hồ còn sót lại để không tự nộp bài
    // hay báo sắp hết giờ trên màn hình hoàn thành.
    if (state.phase == MatchPhase.ended &&
        (event is TimerTickEvent ||
            event is TimerWarningEvent ||
            event is TimeUpEvent)) {
      return;
    }

    switch (event) {
      case MatchStartedEvent():
        _onMatchStarted();
      case QuestionShownEvent():
        _applyQuestion(event.question, event.remainingTime);
        // Có thể đã lỡ sự kiện cứu trợ (mất kết nối lúc được cứu): hỏi lại
        // server trước khi giữ thí sinh ở trạng thái bị loại sang câu mới.
        if (state.status == ContestantPlayStatus.eliminated) {
          unawaited(_refreshStatus());
        }
      case TimerTickEvent():
        _onTimerTick(event);
      case TimerWarningEvent():
        _update(state.copyWith(
          notice: event.message ??
              'Còn ${event.remainingTime} giây. Hãy nộp đáp án!',
        ));
      case TimeUpEvent():
        _onTimeUp();
      case MatchEndedEvent():
        _stopTicker();
        _update(state.copyWith(
          phase: MatchPhase.ended,
          isTimerActive: false,
          matchInProgress: false,
          notice: 'Trận đấu đã kết thúc.',
        ));
        unawaited(_loadSummary());
      case RescuedEvent():
        _onRescued(event);
    }
  }

  /// Lấy số câu đã trả lời và số câu đúng cho màn hình hoàn thành bài thi.
  /// Không đổi giai đoạn trận như `_sync`.
  Future<void> _loadSummary() async {
    try {
      final MatchSnapshot snapshot = await _gateway.fetchSnapshot();
      _update(state.copyWith(
        answeredCount: snapshot.answeredOrders.length,
        correctCount: snapshot.correctCount,
      ));
    } catch (_) {
      // Thiếu tổng kết thì màn hình hoàn thành vẫn hiện, chỉ không có số liệu.
    }
  }

  void _onMatchStarted() {
    final int? matchId = _matchId;
    final int? contestantId = _contestantId;
    if (matchId != null && contestantId != null) {
      _gateway.confirmStart(contestantId: contestantId, matchId: matchId);
    }
    _update(state.copyWith(
      matchInProgress: true,
      notice: 'Trận đấu đã bắt đầu. Chờ câu hỏi đầu tiên.',
    ));
  }

  void _applyQuestion(
    QuestionPayload question,
    int remainingTime, {
    bool alreadyAnswered = false,
  }) {
    final QuestionPayload? previous = state.question;
    final bool sameQuestion = previous != null &&
        previous.id == question.id &&
        previous.order == question.order;

    // Chiếu lại đúng câu đang làm thì giữ nguyên bài làm.
    if (sameQuestion) {
      _update(state.copyWith(
        remainingTime: remainingTime,
        phase: MatchPhase.running,
        matchInProgress: true,
        hasSubmitted: state.hasSubmitted || alreadyAnswered,
      ));
      return;
    }

    final ContestantPlayStatus nextStatus =
        state.status == ContestantPlayStatus.rescued
            ? ContestantPlayStatus.playing
            : state.status;

    _update(MatchLiveState(
      isLoading: state.isLoading,
      connection: state.connection,
      matchName: state.matchName,
      registrationNumber: state.registrationNumber,
      phase: MatchPhase.running,
      // Câu hỏi chỉ được chiếu khi trận đã bắt đầu.
      matchInProgress: true,
      question: question,
      remainingTime: remainingTime,
      // Đồng hồ chỉ chạy khi server báo `timer:update` đang active; hiện câu
      // hỏi không có nghĩa là Admin đã bấm Play.
      isTimerActive: false,
      status: nextStatus,
      hasSubmitted: alreadyAnswered,
      violationCount: state.violationCount,
    ));
  }

  void _onTimerTick(TimerTickEvent event) {
    final bool reopened = event.remainingTime > 0 && !state.hasSubmitted;
    _update(state.copyWith(
      remainingTime: event.remainingTime,
      isTimerActive: event.isActive,
      isTimerPaused: event.isPaused,
      timeIsUp: reopened ? false : null,
    ));
    if (event.isActive && !event.isPaused) {
      _startTicker();
    }
  }

  void _onTimeUp() {
    if (state.timeIsUp) {
      return;
    }
    _stopTicker();
    _update(state.copyWith(
      remainingTime: 0,
      isTimerActive: false,
      timeIsUp: true,
    ));
    _applyResultToStatus();
    _autoSubmitIfNeeded();
    // Đã trả lời trước khi vào lại phòng nên máy không có kết quả chấm: hỏi
    // lại server để biết thí sinh còn thi hay đã bị loại.
    if (state.hasSubmitted && state.result == null && !state.isSubmitting) {
      unawaited(_sync().catchError((Object _) {}));
    }
  }

  void _onRescued(RescuedEvent event) {
    // Backend mới gửi id thí sinh nên đối chiếu theo id. Backend cũ chỉ gửi
    // số báo danh; không trộn hai loại vì chúng cùng khoảng giá trị.
    final int? contestantId = _contestantId;
    final int? registrationNumber = state.registrationNumber;
    final bool hasIds = event.contestantIds.isNotEmpty;
    final bool mine = hasIds
        ? contestantId != null && event.contestantIds.contains(contestantId)
        : registrationNumber != null &&
            event.registrationNumbers.contains(registrationNumber);

    if (mine) {
      _markRescued(event.message);
    } else if (!hasIds && registrationNumber == null && _isOut) {
      // Chưa tải được số báo danh nên không đối chiếu được: hỏi lại server.
      unawaited(_refreshStatus());
    }
  }

  void _markRescued(String? message) {
    // Được cứu trợ thì gỡ cả lệnh cấm lẫn số lần vi phạm đã tích lũy.
    _banning = false;
    _update(state.copyWith(
      status: ContestantPlayStatus.rescued,
      violationCount: 0,
      clearSubmitError: true,
      notice: message ?? 'Bạn đã được cứu trợ!',
    ));
  }

  bool get _isOut =>
      state.status == ContestantPlayStatus.eliminated ||
      state.status == ContestantPlayStatus.banned;

  /// Hỏi lại server khi có thể đã lỡ sự kiện cứu trợ. Thí sinh bị loại mà
  /// server báo còn thi (được cứu rồi sang câu mới) cũng tính là được cứu;
  /// lệnh cấm thi chỉ được gỡ khi server báo đúng `rescued`.
  Future<void> _refreshStatus() async {
    try {
      final MatchSnapshot snapshot = await _gateway.fetchSnapshot();
      final ContestantPlayStatus fromServer = snapshot.contestantStatus;
      final bool revived = fromServer == ContestantPlayStatus.rescued ||
          (fromServer == ContestantPlayStatus.playing &&
              state.status == ContestantPlayStatus.eliminated);
      if (_isOut && revived) {
        _markRescued(null);
      }
    } catch (_) {
      // Không hỏi được lúc này; lần đồng bộ sau sẽ bù lại.
    }
  }

  // ---------------------------------------------------------------------------
  // Đồng hồ cục bộ
  // ---------------------------------------------------------------------------

  void _startTicker() {
    if (_ticker?.isActive ?? false) {
      return;
    }
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!state.isTimerActive || state.isTimerPaused) {
        return;
      }
      final int next = state.remainingTime - 1;
      if (next <= 0) {
        _onTimeUp();
        return;
      }
      _update(state.copyWith(remainingTime: next));
    });
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }

  // ---------------------------------------------------------------------------
  // Nộp đáp án
  // ---------------------------------------------------------------------------

  void _autoSubmitIfNeeded() {
    final QuestionPayload? question = state.question;
    if (question == null ||
        state.hasSubmitted ||
        state.isSubmitting ||
        state.status == ContestantPlayStatus.eliminated ||
        state.status == ContestantPlayStatus.banned ||
        _autoSubmittedOrder == question.order) {
      return;
    }
    _autoSubmittedOrder = question.order;
    final String answer = state.selectedAnswer.trim().isEmpty
        ? noAnswerPlaceholder
        : state.selectedAnswer;
    unawaited(_submit(answer, force: true));
  }

  Future<void> _submit(String answer, {bool force = false}) async {
    final QuestionPayload? question = state.question;
    final int? matchId = _matchId;
    if (question == null || matchId == null) {
      return;
    }
    if (!force && !state.canAnswer) {
      return;
    }

    _update(state.copyWith(isSubmitting: true, clearSubmitError: true));
    try {
      final AnswerResult result = await _repository.submitAnswer(
        matchId: matchId,
        questionOrder: question.order,
        answer: answer,
      );
      if (state.question?.order != question.order) {
        return;
      }
      _update(state.copyWith(
        isSubmitting: false,
        hasSubmitted: true,
        result: result,
      ));
      _applyResultToStatus();
    } on ApiException catch (error) {
      _update(state.copyWith(isSubmitting: false, submitError: error.message));
    } catch (_) {
      _update(state.copyWith(
        isSubmitting: false,
        submitError: 'Không thể gửi đáp án. Vui lòng thử lại.',
      ));
    }
  }

  /// Chỉ công bố "bị loại" khi đã hết giờ (kết quả được ẩn cho tới lúc đó).
  /// Đã được cứu trợ sau câu trả lời sai thì giữ nguyên trạng thái được cứu.
  void _applyResultToStatus() {
    final AnswerResult? result = state.result;
    if (result == null || !state.timeIsUp) {
      return;
    }
    if (result.eliminated && state.status != ContestantPlayStatus.rescued) {
      _update(state.copyWith(status: ContestantPlayStatus.eliminated));
    }
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  void _update(MatchLiveState next) {
    if (_disposed) {
      return;
    }
    state = next;
  }

  void _cleanup() {
    _disposed = true;
    _stopTicker();
    _eventSubscription?.cancel();
    _connectionSubscription?.cancel();
    final int? matchId = _matchId;
    if (matchId != null) {
      _gateway.leaveRooms(matchSlug: _slug, matchId: matchId);
    }
  }
}

/// Provider điều khiển một trận (tham số là slug của trận).
final AutoDisposeNotifierProviderFamily<MatchController, MatchLiveState, String>
    matchControllerProvider = NotifierProvider.autoDispose
        .family<MatchController, MatchLiveState, String>(MatchController.new);
