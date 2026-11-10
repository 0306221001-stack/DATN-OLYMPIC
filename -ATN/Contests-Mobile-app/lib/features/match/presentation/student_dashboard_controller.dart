import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/router/auth_guard.dart';
import '../../auth/domain/auth_user.dart';
import '../data/match_repository.dart';
import '../data/match_socket_gateway.dart';
import '../domain/match_event.dart';

/// Trạng thái màn hình danh sách trận của thí sinh.
class StudentDashboardState {
  const StudentDashboardState({
    this.isLoading = true,
    this.error,
    this.matches = const <MatchSummary>[],
    this.studentName = '',
    this.contestName = '',
    this.connection = SocketConnectionState.disconnected,
    this.startedSlug,
    this.startedMatchName,
  });

  final bool isLoading;
  final String? error;
  final List<MatchSummary> matches;
  final String studentName;
  final String contestName;
  final SocketConnectionState connection;

  /// Slug của trận vừa bắt đầu; giao diện đọc rồi gọi `consumeStart`.
  final String? startedSlug;
  final String? startedMatchName;

  StudentDashboardState copyWith({
    bool? isLoading,
    String? error,
    bool clearError = false,
    List<MatchSummary>? matches,
    String? studentName,
    String? contestName,
    SocketConnectionState? connection,
    String? startedSlug,
    String? startedMatchName,
    bool clearStarted = false,
  }) {
    return StudentDashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      matches: matches ?? this.matches,
      studentName: studentName ?? this.studentName,
      contestName: contestName ?? this.contestName,
      connection: connection ?? this.connection,
      startedSlug: clearStarted ? null : (startedSlug ?? this.startedSlug),
      startedMatchName:
          clearStarted ? null : (startedMatchName ?? this.startedMatchName),
    );
  }
}

/// Tải danh sách trận và lắng nghe tín hiệu "trận bắt đầu" để tự đưa thí sinh
/// vào phòng thi.
class StudentDashboardController
    extends AutoDisposeNotifier<StudentDashboardState> {
  StreamSubscription<MatchStartSignal>? _startSubscription;
  StreamSubscription<SocketConnectionState>? _connectionSubscription;
  int? _contestantId;
  bool _disposed = false;

  MatchSocketGateway get _gateway => ref.read(matchSocketGatewayProvider);
  MatchRepository get _repository => ref.read(matchRepositoryProvider);

  @override
  StudentDashboardState build() {
    _disposed = false;
    ref.onDispose(() {
      _disposed = true;
      _startSubscription?.cancel();
      _connectionSubscription?.cancel();
    });
    Future<void>.microtask(load);
    return const StudentDashboardState();
  }

  /// Tải lần đầu hoặc thử lại.
  Future<void> load() async {
    _set(state.copyWith(isLoading: true, clearError: true));
    try {
      final StudentProfile? profile =
          ref.read(authSessionControllerProvider).user?.student;
      if (profile == null) {
        throw const ApiException(
          message: 'Không tìm thấy thông tin thí sinh trong cuộc thi.',
          code: 'CONTESTANT_NOT_FOUND',
        );
      }
      _contestantId = profile.contestant.id;
      _set(state.copyWith(
        studentName: profile.contestant.fullName,
        contestName: profile.contest.name,
        matches: profile.matches,
      ));

      final List<MatchSummary> matches = await _repository.refreshMatches();
      _set(state.copyWith(matches: matches, isLoading: false));
    } on ApiException catch (error) {
      _set(state.copyWith(isLoading: false, error: error.message));
      return;
    } catch (_) {
      _set(state.copyWith(
        isLoading: false,
        error: 'Không thể tải danh sách trận đấu.',
      ));
      return;
    }

    await _connectRealtime();
  }

  /// Kéo để làm mới.
  Future<void> refresh() async {
    try {
      final List<MatchSummary> matches = await _repository.refreshMatches();
      _set(state.copyWith(matches: matches, clearError: true));
      await _joinRooms();
    } on ApiException catch (error) {
      _set(state.copyWith(error: error.message));
    }
  }

  /// Giao diện gọi sau khi đã điều hướng vào trận vừa bắt đầu.
  void consumeStart() {
    _set(state.copyWith(clearStarted: true));
  }

  // ---------------------------------------------------------------------------
  // Realtime
  // ---------------------------------------------------------------------------

  Future<void> _connectRealtime() async {
    try {
      await _gateway.ensureConnected();
      _set(state.copyWith(connection: _gateway.connection.state));

      await _startSubscription?.cancel();
      _startSubscription = _gateway.watchStarts().listen(_handleStart);

      await _connectionSubscription?.cancel();
      _connectionSubscription =
          _gateway.connection.stateStream.listen((SocketConnectionState next) {
        _set(state.copyWith(connection: next));
        if (next == SocketConnectionState.connected) {
          unawaited(_joinRooms());
        }
      });

      await _joinRooms();
    } on ApiException catch (error) {
      _set(state.copyWith(
        connection: _gateway.connection.state,
        error: error.message,
      ));
    }
  }

  Future<void> _joinRooms() async {
    for (final MatchSummary match in state.matches) {
      if (match.status == 'finished' || match.slug.isEmpty) {
        continue;
      }
      try {
        await _gateway.joinRooms(matchSlug: match.slug, matchId: match.id);
      } on ApiException {
        // Một trận không vào được room không được chặn các trận còn lại.
      }
    }
  }

  void _handleStart(MatchStartSignal signal) {
    final MatchSummary? match = _findMatch(signal);
    if (match == null) {
      return;
    }

    final int? contestantId = _contestantId;
    if (contestantId != null) {
      _gateway.confirmStart(contestantId: contestantId, matchId: match.id);
    }

    final List<MatchSummary> updated = state.matches
        .map(
          (MatchSummary item) => item.id == match.id
              ? MatchSummary(
                  id: item.id,
                  name: item.name,
                  slug: item.slug,
                  status: 'ongoing',
                  currentQuestion: item.currentQuestion,
                  remainingTime: item.remainingTime,
                )
              : item,
        )
        .toList();

    _set(state.copyWith(
      matches: updated,
      startedSlug: match.slug,
      startedMatchName: match.name,
    ));
  }

  MatchSummary? _findMatch(MatchStartSignal signal) {
    for (final MatchSummary match in state.matches) {
      if ((signal.matchId != null && match.id == signal.matchId) ||
          (signal.matchSlug.isNotEmpty && match.slug == signal.matchSlug)) {
        return match;
      }
    }
    return null;
  }

  void _set(StudentDashboardState next) {
    if (_disposed) {
      return;
    }
    state = next;
  }
}

/// Provider điều khiển màn hình danh sách trận của thí sinh.
final AutoDisposeNotifierProvider<StudentDashboardController,
        StudentDashboardState> studentDashboardControllerProvider =
    NotifierProvider.autoDispose<StudentDashboardController,
        StudentDashboardState>(StudentDashboardController.new);
