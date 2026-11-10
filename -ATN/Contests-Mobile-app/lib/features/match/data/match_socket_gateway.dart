import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/utils/html_text.dart';
import '../../../core/utils/json_read.dart';
import '../domain/match_event.dart';
import '../domain/match_models.dart';
import '../domain/match_snapshot.dart';

/// Giao tiếp realtime của thí sinh qua namespace `/student`.
///
/// Mọi phương thức ném `ApiException` (tiếng Việt) khi thất bại.
class MatchSocketGateway {
  MatchSocketGateway(this._socket);

  final SocketConnection _socket;

  SocketConnection get connection => _socket;

  /// Kết nối và chờ tới khi sẵn sàng (tối đa [timeout]).
  Future<void> ensureConnected({
    Duration timeout = const Duration(seconds: 12),
  }) async {
    try {
      await _socket.connect();
      if (_socket.isConnected) {
        return;
      }
      await _socket.stateStream
          .firstWhere(
            (SocketConnectionState state) =>
                state == SocketConnectionState.connected ||
                state == SocketConnectionState.failed,
          )
          .timeout(timeout);
    } on TimeoutException {
      throw const ApiException(
        message: 'Không kết nối được tới máy chủ trận đấu.',
        code: 'SOCKET_CONNECT_TIMEOUT',
        isTimeout: true,
      );
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException(
        message: 'Không kết nối được tới máy chủ trận đấu.',
        code: 'SOCKET_CONNECT_FAILED',
        isNetworkError: true,
      );
    }

    if (!_socket.isConnected) {
      throw const ApiException(
        message:
            'Máy chủ từ chối kết nối. Vui lòng đăng nhập lại hoặc thử lại sau.',
        code: 'SOCKET_CONNECT_FAILED',
      );
    }
  }

  /// Nối lại khi app quay về từ nền (xem `SocketConnection.reconnectIfNeeded`).
  /// Lỗi được bỏ qua: trạng thái kết nối sẽ phản ánh qua `stateStream`.
  Future<void> reconnectIfNeeded() async {
    try {
      await _socket.reconnectIfNeeded();
    } catch (_) {
      // Không nối được lúc này; banner kết nối sẽ cho người dùng thử lại.
    }
  }

  /// Vào cả room theo slug (`match-<slug>`) và theo id (`match-<id>`): Backend
  /// phát các sự kiện khác nhau vào hai room này.
  Future<void> joinRooms({
    required String matchSlug,
    required int matchId,
  }) async {
    try {
      final SocketAck bySlug = await _socket.emitWithAck(
        'student:joinMatch',
        <String, dynamic>{'matchSlug': matchSlug},
      );
      if (!bySlug.success) {
        throw ApiException(
          message: bySlug.message.isEmpty
              ? 'Không thể vào phòng thi.'
              : bySlug.message,
          code: 'JOIN_MATCH_FAILED',
        );
      }

      final SocketAck byId =
          await _socket.emitWithAck('joinMatchRoom', matchId);
      if (!byId.success) {
        throw ApiException(
          message:
              byId.message.isEmpty ? 'Không thể vào phòng thi.' : byId.message,
          code: 'JOIN_MATCH_FAILED',
        );
      }
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException(message: 'Không thể vào phòng thi.');
    }
  }

  /// Rời cả hai room. Lỗi được bỏ qua vì đây chỉ là dọn dẹp.
  void leaveRooms({required String matchSlug, required int matchId}) {
    try {
      if (_socket.isConnected) {
        _socket.emit('leaveMatchRoom', matchSlug);
        _socket.emit('leaveMatchRoom', matchId);
      }
    } catch (_) {
      // Mất kết nối khi rời phòng thì server cũng tự dọn.
    }
  }

  /// `student:getMatchStatus`: yêu cầu đã `joinRooms` trước đó để Backend biết
  /// trận đang xem.
  Future<MatchSnapshot> fetchSnapshot() async {
    try {
      final SocketAck ack = await _socket.emitWithAck('student:getMatchStatus');
      if (!ack.success) {
        throw ApiException(
          message: ack.message.isEmpty
              ? 'Không thể tải trạng thái trận đấu.'
              : ack.message,
          code: 'MATCH_STATUS_FAILED',
        );
      }
      return MatchSnapshot.fromJson(ack.dataAsMap);
    } on ApiException {
      rethrow;
    } on FormatException catch (error) {
      throw ApiException(
        message: 'Dữ liệu trạng thái trận không hợp lệ: ${error.message}',
        code: 'INVALID_RESPONSE',
      );
    } catch (_) {
      throw const ApiException(message: 'Không thể tải trạng thái trận đấu.');
    }
  }

  /// `student:getQuestion`: dùng để khôi phục câu hỏi hiện tại khi vào muộn
  /// hoặc kết nối lại. Dữ liệu ít hơn `match:questionShown` nên thời gian của
  /// câu được lấy từ [fallbackTime].
  Future<QuestionPayload> fetchQuestion({
    required int matchId,
    required int questionOrder,
    required int fallbackTime,
  }) async {
    try {
      final SocketAck ack = await _socket.emitWithAck(
        'student:getQuestion',
        <String, dynamic>{
          'matchId': matchId,
          'questionOrder': questionOrder,
        },
      );
      if (!ack.success) {
        throw ApiException(
          message: ack.message.isEmpty
              ? 'Không thể tải câu hỏi hiện tại.'
              : ack.message,
          code: 'QUESTION_FAILED',
        );
      }

      final Map<String, dynamic> data = ack.dataAsMap;
      final int? id = JsonRead.asInt(data['id']);
      if (id == null) {
        throw const FormatException('Câu hỏi thiếu id.');
      }

      final List<String> options = <String>[];
      for (final dynamic choice in JsonRead.asList(data['choices'])) {
        final Map<String, dynamic>? map = JsonRead.asMap(choice);
        final String? text = map == null
            ? JsonRead.asString(choice)
            : JsonRead.asString(map['text']);
        if (text != null && text.trim().isNotEmpty) {
          options.add(text);
        }
      }

      final List<QuestionMedia> media = <QuestionMedia>[];
      for (final dynamic item in JsonRead.asList(data['media'])) {
        final QuestionMedia? parsed = QuestionMedia.tryFromJson(item);
        if (parsed != null) {
          media.add(parsed);
        }
      }

      return QuestionPayload(
        id: id,
        order: JsonRead.asInt(data['order']) ?? questionOrder,
        content: HtmlText.toPlain(
          JsonRead.asString(data['text']) ?? JsonRead.asString(data['content']),
        ),
        intro: HtmlText.toPlain(JsonRead.asString(data['intro'])),
        // Backend cũ không gửi loại câu: để trống để controller biết là chưa
        // xác định được (không đoán câu tự luận chỉ vì thiếu phương án).
        questionType: JsonRead.asString(data['questionType']) ??
            (options.isEmpty ? '' : 'multiple_choice'),
        options: List<String>.unmodifiable(options),
        defaultTime: JsonRead.asInt(data['defaultTime']) ?? fallbackTime,
        score: JsonRead.asInt(data['score']) ?? 1,
        media: List<QuestionMedia>.unmodifiable(media),
      );
    } on ApiException {
      rethrow;
    } on FormatException catch (error) {
      throw ApiException(
        message: 'Dữ liệu câu hỏi không hợp lệ: ${error.message}',
        code: 'INVALID_RESPONSE',
      );
    } catch (_) {
      throw const ApiException(message: 'Không thể tải câu hỏi hiện tại.');
    }
  }

  /// `student:confirmStart`: báo cho Backend thí sinh đã sẵn sàng
  /// (`contestantMatch.status = in_progress`).
  void confirmStart({required int contestantId, required int matchId}) {
    try {
      _socket.emit('student:confirmStart', <String, dynamic>{
        'contestantId': contestantId,
        'matchId': matchId,
      });
    } catch (_) {
      // Không chặn luồng thi nếu xác nhận không gửi được.
    }
  }

  /// Luồng sự kiện của đúng một trận. Hủy đăng ký khi không còn người nghe.
  Stream<MatchEvent> watch({
    required String matchSlug,
    required int matchId,
  }) {
    late final StreamController<MatchEvent> controller;
    final List<StreamSubscription<dynamic>> subscriptions =
        <StreamSubscription<dynamic>>[];

    void listen(
      String event,
      MatchEvent? Function(Map<String, dynamic> payload) mapper,
    ) {
      subscriptions.add(
        _socket.on(event).listen((dynamic raw) {
          try {
            final Map<String, dynamic> payload =
                JsonRead.asMap(raw) ?? <String, dynamic>{};
            if (!_belongsToMatch(payload, matchSlug, matchId)) {
              return;
            }
            final MatchEvent? mapped = mapper(payload);
            if (mapped != null && !controller.isClosed) {
              controller.add(mapped);
            }
          } catch (_) {
            // Gói tin sai định dạng: bỏ qua, lần đồng bộ kế tiếp sẽ bù lại.
          }
        }),
      );
    }

    controller = StreamController<MatchEvent>(
      onListen: () {
        MatchEvent started(Map<String, dynamic> payload) => MatchStartedEvent(
              matchName: JsonRead.asString(payload['matchName']) ?? '',
            );

        listen('match:started', started);
        listen('match:globalStarted', started);
        listen('match:questionShown', _mapQuestionShown);
        listen('timer:update', (Map<String, dynamic> payload) {
          return TimerTickEvent(
            remainingTime: JsonRead.asInt(payload['timeRemaining']) ?? 0,
            isActive: JsonRead.asBool(payload['isActive']) ?? false,
            isPaused: JsonRead.asBool(payload['isPaused']) ?? false,
          );
        });
        listen('match:timerWarning', (Map<String, dynamic> payload) {
          return TimerWarningEvent(
            remainingTime: JsonRead.asInt(payload['remainingTime']) ?? 0,
            message: JsonRead.asString(payload['message']),
          );
        });
        listen('match:timeUp', (_) => const TimeUpEvent());
        listen('timer:ended', (_) => const TimeUpEvent());
        listen('match:ended', (_) => const MatchEndedEvent());
        listen('student:rescued', (Map<String, dynamic> payload) {
          // `rescuedContestantIds` là tên cũ của danh sách số báo danh.
          final Object? registrationNumbers =
              payload['registrationNumbers'] ?? payload['rescuedContestantIds'];
          return RescuedEvent(
            contestantIds: _readIds(payload['contestantIds']),
            registrationNumbers: _readIds(registrationNumbers),
            message: JsonRead.asString(payload['message']),
          );
        });
      },
      onCancel: () async {
        for (final StreamSubscription<dynamic> subscription in subscriptions) {
          await subscription.cancel();
        }
        subscriptions.clear();
      },
    );
    return controller.stream;
  }

  /// Luồng tín hiệu bắt đầu của mọi trận mà thí sinh đã vào room.
  Stream<MatchStartSignal> watchStarts() {
    late final StreamController<MatchStartSignal> controller;
    final List<StreamSubscription<dynamic>> subscriptions =
        <StreamSubscription<dynamic>>[];

    void forward(dynamic raw) {
      try {
        final Map<String, dynamic>? payload = JsonRead.asMap(raw);
        if (payload == null || controller.isClosed) {
          return;
        }
        final String slug = JsonRead.asString(payload['matchSlug']) ?? '';
        final int? id = JsonRead.asInt(payload['matchId']);
        if (slug.isEmpty && id == null) {
          return;
        }
        controller.add(
          MatchStartSignal(
            matchSlug: slug,
            matchId: id,
            matchName: JsonRead.asString(payload['matchName']) ?? '',
          ),
        );
      } catch (_) {
        // Gói tin sai định dạng: bỏ qua.
      }
    }

    controller = StreamController<MatchStartSignal>(
      onListen: () {
        subscriptions
          ..add(_socket.on('match:started').listen(forward))
          ..add(_socket.on('match:globalStarted').listen(forward));
      },
      onCancel: () async {
        for (final StreamSubscription<dynamic> subscription in subscriptions) {
          await subscription.cancel();
        }
        subscriptions.clear();
      },
    );
    return controller.stream;
  }

  MatchEvent? _mapQuestionShown(Map<String, dynamic> payload) {
    final Map<String, dynamic>? data =
        JsonRead.asMap(payload['currentQuestionData']);
    if (data == null) {
      return null;
    }
    final QuestionPayload question = QuestionPayload.fromQuestionData(data);
    return QuestionShownEvent(
      question: question,
      remainingTime: JsonRead.asInt(payload['remainingTime']) ?? 0,
    );
  }

  static List<int> _readIds(Object? raw) {
    final List<int> ids = <int>[];
    for (final dynamic item in JsonRead.asList(raw)) {
      final int? id = JsonRead.asInt(item);
      if (id != null) {
        ids.add(id);
      }
    }
    return List<int>.unmodifiable(ids);
  }

  /// Gói tin không mang định danh trận (như `timer:update`) luôn được nhận
  /// vì Backend đã giới hạn theo room.
  bool _belongsToMatch(
    Map<String, dynamic> payload,
    String matchSlug,
    int matchId,
  ) {
    final String? slug = JsonRead.asString(payload['matchSlug']);
    final int? id = JsonRead.asInt(payload['matchId']);
    final bool hasSlug = slug != null && slug.isNotEmpty;
    if (!hasSlug && id == null) {
      return true;
    }
    return (hasSlug && slug == matchSlug) || (id != null && id == matchId);
  }
}

/// Provider gateway của thí sinh.
final Provider<MatchSocketGateway> matchSocketGatewayProvider =
    Provider<MatchSocketGateway>(
  (ref) => MatchSocketGateway(ref.watch(studentSocketProvider)),
);
