import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/router/auth_guard.dart';
import '../../auth/domain/auth_user.dart';
import '../data/judge_repository.dart';
import '../data/judge_socket_gateway.dart';
import '../domain/judge_models.dart';

/// Trạng thái màn hình điều khiển trận của trọng tài.
class JudgeMatchState {
  const JudgeMatchState({
    this.isLoading = true,
    this.loadError,
    this.connection = SocketConnectionState.disconnected,
    this.info,
    this.group,
    this.contestants = const <JudgeContestant>[],
    this.question,
    this.questionError,
    this.timerRemaining,
    this.timerActive = false,
    this.selected = const <int>{},
    this.isBusy = false,
    this.notice,
    this.noticeIsError = false,
  });

  final bool isLoading;
  final String? loadError;
  final SocketConnectionState connection;
  final JudgeMatchInfo? info;
  final JudgeGroup? group;
  final List<JudgeContestant> contestants;
  final JudgeQuestion? question;
  final String? questionError;
  final int? timerRemaining;
  final bool timerActive;

  /// Số báo danh đang được chọn.
  final Set<int> selected;
  final bool isBusy;
  final String? notice;
  final bool noticeIsError;

  int get currentQuestion => info?.currentQuestion ?? 0;

  /// Giống web: nút Chốt bị khóa khi nhóm đã chốt tới câu hiện tại.
  bool get chotDisabled {
    final JudgeGroup? currentGroup = group;
    if (currentGroup == null || currentQuestion <= 0) {
      return currentGroup == null;
    }
    return currentGroup.confirmCurrentQuestion >= currentQuestion;
  }

  List<JudgeContestant> byStatus(JudgeContestantStatus status) {
    return contestants
        .where((JudgeContestant c) => c.status == status)
        .toList(growable: false);
  }

  JudgeMatchState copyWith({
    bool? isLoading,
    String? loadError,
    bool clearLoadError = false,
    SocketConnectionState? connection,
    JudgeMatchInfo? info,
    JudgeGroup? group,
    List<JudgeContestant>? contestants,
    JudgeQuestion? question,
    bool clearQuestion = false,
    String? questionError,
    bool clearQuestionError = false,
    int? timerRemaining,
    bool? timerActive,
    Set<int>? selected,
    bool? isBusy,
    String? notice,
    bool noticeIsError = false,
    bool clearNotice = false,
  }) {
    return JudgeMatchState(
      isLoading: isLoading ?? this.isLoading,
      loadError: clearLoadError ? null : (loadError ?? this.loadError),
      connection: connection ?? this.connection,
      info: info ?? this.info,
      group: group ?? this.group,
      contestants: contestants ?? this.contestants,
      question: clearQuestion ? null : (question ?? this.question),
      questionError:
          clearQuestionError ? null : (questionError ?? this.questionError),
      timerRemaining: timerRemaining ?? this.timerRemaining,
      timerActive: timerActive ?? this.timerActive,
      selected: selected ?? this.selected,
      isBusy: isBusy ?? this.isBusy,
      notice: clearNotice ? null : (notice ?? this.notice),
      noticeIsError: clearNotice
          ? false
          : (notice != null ? noticeIsError : this.noticeIsError),
    );
  }
}

/// Điều khiển một trận phía trọng tài. Tham số family là `slug` của trận.
class JudgeMatchController
    extends AutoDisposeFamilyNotifier<JudgeMatchState, String> {
  late String _slug;
  StreamSubscription<JudgeEvent>? _eventSubscription;
  StreamSubscription<SocketConnectionState>? _connectionSubscription;
  bool _disposed = false;
  bool _hasConnectedOnce = false;

  /// Giữ sẵn từ lúc khởi tạo vì lúc provider bị hủy không đọc được provider
  /// khác nữa.
  late JudgeSocketGateway _gateway;
  JudgeRepository get _repository => ref.read(judgeRepositoryProvider);

  @override
  JudgeMatchState build(String arg) {
    _slug = arg;
    _disposed = false;
    _gateway = ref.read(judgeSocketGatewayProvider);
    ref.onDispose(() {
      _disposed = true;
      _eventSubscription?.cancel();
      _connectionSubscription?.cancel();
      _gateway.leaveMatch(_slug);
    });
    Future<void>.microtask(load);
    return const JudgeMatchState();
  }

  /// Tải dữ liệu lần đầu hoặc thử lại.
  Future<void> load() async {
    _set(state.copyWith(isLoading: true, clearLoadError: true));
    try {
      final List<Object> results = await Future.wait<Object>(<Future<Object>>[
        _repository.fetchMatchInfo(_slug),
        _repository.fetchContestants(_slug),
        _repository.fetchGroup(_slug),
      ]);
      final JudgeMatchInfo info = results[0] as JudgeMatchInfo;
      _set(state.copyWith(
        info: info,
        contestants: results[1] as List<JudgeContestant>,
        group: results[2] as JudgeGroup,
      ));

      await _gateway.ensureConnected();
      await _gateway.joinMatch(_slug);
      _listen();
      _hasConnectedOnce = true;
      _set(state.copyWith(
        isLoading: false,
        connection: _gateway.connection.state,
      ));

      unawaited(_loadQuestion(info.currentQuestion));
    } on ApiException catch (error) {
      _set(state.copyWith(isLoading: false, loadError: error.message));
    } catch (_) {
      _set(state.copyWith(
        isLoading: false,
        loadError: 'Không thể tải dữ liệu trận đấu.',
      ));
    }
  }

  // ---------------------------------------------------------------------------
  // Chọn thí sinh
  // ---------------------------------------------------------------------------

  void toggle(int registrationNumber) {
    final Set<int> next = Set<int>.of(state.selected);
    if (!next.add(registrationNumber)) {
      next.remove(registrationNumber);
    }
    _set(state.copyWith(selected: next));
  }

  void selectAll(JudgeContestantStatus status) {
    final Set<int> next = Set<int>.of(state.selected)
      ..addAll(state
          .byStatus(status)
          .map((JudgeContestant c) => c.registrationNumber));
    _set(state.copyWith(selected: next));
  }

  void deselectAll(JudgeContestantStatus status) {
    final Set<int> inStatus = state
        .byStatus(status)
        .map((JudgeContestant c) => c.registrationNumber)
        .toSet();
    _set(state.copyWith(selected: state.selected.difference(inStatus)));
  }

  void dismissNotice() {
    _set(state.copyWith(clearNotice: true));
  }

  // ---------------------------------------------------------------------------
  // Hành động của trọng tài
  // ---------------------------------------------------------------------------

  /// Đang thi -> Xác nhận 1.
  Future<void> confirm1() {
    return _changeStatus(
      from: JudgeContestantStatus.inProgress,
      to: JudgeContestantStatus.confirmed1,
      emptyMessage: 'Vui lòng chọn ít nhất một thí sinh đang thi.',
      successMessage: 'Xác nhận 1 thành công!',
    );
  }

  /// Xác nhận 1 -> Xác nhận 2.
  Future<void> confirm2() {
    return _changeStatus(
      from: JudgeContestantStatus.confirmed1,
      to: JudgeContestantStatus.confirmed2,
      emptyMessage: 'Vui lòng chọn ít nhất một thí sinh ở Xác nhận 1.',
      successMessage: 'Xác nhận 2 thành công!',
    );
  }

  /// Xác nhận 1 -> Đang thi (hủy xác nhận).
  Future<void> revoke() {
    return _changeStatus(
      from: JudgeContestantStatus.confirmed1,
      to: JudgeContestantStatus.inProgress,
      emptyMessage: 'Vui lòng chọn ít nhất một thí sinh ở Xác nhận 1.',
      successMessage: 'Hủy xác nhận 1 thành công!',
    );
  }

  /// Chốt câu hiện tại cho nhóm.
  Future<void> chot() async {
    if (state.isBusy) {
      return;
    }
    final JudgeGroup? group = state.group;
    if (group == null) {
      _notify('Chưa có thông tin nhóm thi.', isError: true);
      return;
    }
    if (state.contestants.any(
        (JudgeContestant c) => c.status == JudgeContestantStatus.confirmed1)) {
      _notify('Vẫn còn thí sinh ở trạng thái Xác nhận 1!', isError: true);
      return;
    }
    final int? userId = _userId();
    if (userId == null) {
      _notify('Không xác định được tài khoản trọng tài.', isError: true);
      return;
    }

    _set(state.copyWith(isBusy: true));
    try {
      await _gateway.confirmQuestion(
        matchSlug: _slug,
        userId: userId,
        groupId: group.id,
        questionOrder: state.currentQuestion,
      );
      _set(state.copyWith(
        isBusy: false,
        group: JudgeGroup(
          id: group.id,
          name: group.name,
          confirmCurrentQuestion: state.currentQuestion,
        ),
      ));
      _notify('Chốt thành công!');
    } on ApiException catch (error) {
      _set(state.copyWith(isBusy: false));
      _notify(error.message, isError: true);
    }
  }

  Future<void> reloadQuestion() {
    return _loadQuestion(state.currentQuestion);
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  Future<void> _changeStatus({
    required JudgeContestantStatus from,
    required JudgeContestantStatus to,
    required String emptyMessage,
    required String successMessage,
  }) async {
    if (state.isBusy) {
      return;
    }
    final Set<int> inSource = state
        .byStatus(from)
        .map((JudgeContestant c) => c.registrationNumber)
        .toSet();
    final List<int> ids = state.selected.where(inSource.contains).toList()
      ..sort();
    if (ids.isEmpty) {
      _notify(emptyMessage, isError: true);
      return;
    }
    final int? userId = _userId();
    if (userId == null) {
      _notify('Không xác định được tài khoản trọng tài.', isError: true);
      return;
    }

    _set(state.copyWith(isBusy: true));
    try {
      await _gateway.updateContestants(
        matchSlug: _slug,
        userId: userId,
        status: to,
        registrationNumbers: ids,
      );
      _set(state.copyWith(isBusy: false, selected: <int>{}));
      _notify(successMessage);
    } on ApiException catch (error) {
      _set(state.copyWith(isBusy: false));
      _notify(error.message, isError: true);
    }
  }

  int? _userId() {
    final AuthUser? user = ref.read(authSessionControllerProvider).user;
    return user?.id;
  }

  void _listen() {
    _eventSubscription?.cancel();
    _eventSubscription = _gateway.watch().listen(_handleEvent);

    _connectionSubscription?.cancel();
    _connectionSubscription =
        _gateway.connection.stateStream.listen(_handleConnectionState);
  }

  Future<void> _handleConnectionState(SocketConnectionState next) async {
    _set(state.copyWith(connection: next));
    if (next != SocketConnectionState.connected || !_hasConnectedOnce) {
      return;
    }
    // Kết nối lại: vào lại room rồi tải lại dữ liệu để không bỏ sót thay đổi.
    try {
      await _gateway.joinMatch(_slug);
      final List<Object> results = await Future.wait<Object>(<Future<Object>>[
        _repository.fetchMatchInfo(_slug),
        _repository.fetchContestants(_slug),
        _repository.fetchGroup(_slug),
      ]);
      _set(state.copyWith(
        info: results[0] as JudgeMatchInfo,
        contestants: results[1] as List<JudgeContestant>,
        group: results[2] as JudgeGroup,
      ));
    } on ApiException catch (error) {
      _notify('Chưa đồng bộ lại được: ${error.message}', isError: true);
    }
  }

  void _handleEvent(JudgeEvent event) {
    switch (event) {
      case JudgeMatchInfoEvent():
        final int previous = state.currentQuestion;
        _set(state.copyWith(info: event.info));
        if (event.info.currentQuestion != previous) {
          _set(state.copyWith(selected: <int>{}));
          unawaited(_loadQuestion(event.info.currentQuestion));
        }
      case JudgeContestantsEvent():
        _set(state.copyWith(contestants: event.contestants));
      case JudgeGroupEvent():
        _set(state.copyWith(group: event.group));
      case JudgeTimerEvent():
        _set(state.copyWith(
          timerRemaining: event.remainingTime,
          timerActive: event.isActive,
        ));
    }
  }

  Future<void> _loadQuestion(int order) async {
    if (order <= 0) {
      _set(state.copyWith(clearQuestion: true, clearQuestionError: true));
      return;
    }
    try {
      final JudgeQuestion question =
          await _repository.fetchCurrentQuestion(_slug);
      _set(state.copyWith(question: question, clearQuestionError: true));
    } on ApiException catch (error) {
      _set(state.copyWith(questionError: error.message, clearQuestion: true));
    }
  }

  void _notify(String message, {bool isError = false}) {
    _set(state.copyWith(notice: message, noticeIsError: isError));
  }

  void _set(JudgeMatchState next) {
    if (_disposed) {
      return;
    }
    state = next;
  }
}

/// Provider điều khiển một trận của trọng tài (tham số là slug).
final AutoDisposeNotifierProviderFamily<JudgeMatchController, JudgeMatchState,
        String> judgeMatchControllerProvider =
    NotifierProvider.autoDispose
        .family<JudgeMatchController, JudgeMatchState, String>(
  JudgeMatchController.new,
);

/// Danh sách cuộc thi của trọng tài.
final AutoDisposeFutureProvider<List<JudgeContest>> judgeContestsProvider =
    FutureProvider.autoDispose<List<JudgeContest>>(
  (ref) => ref.watch(judgeRepositoryProvider).fetchContests(),
);

/// Danh sách trận của trọng tài theo cuộc thi.
final AutoDisposeFutureProviderFamily<List<JudgeMatch>, int>
    judgeMatchesProvider =
    FutureProvider.autoDispose.family<List<JudgeMatch>, int>(
  (ref, int contestId) =>
      ref.watch(judgeRepositoryProvider).fetchMatches(contestId),
);
