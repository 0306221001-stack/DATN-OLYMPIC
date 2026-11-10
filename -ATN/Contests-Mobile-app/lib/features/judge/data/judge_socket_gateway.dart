import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/utils/json_read.dart';
import '../domain/judge_models.dart';

/// Sự kiện realtime dành cho trọng tài.
sealed class JudgeEvent {
  const JudgeEvent();
}

/// `currentQuestion:get`: Admin chọn câu hỏi mới.
class JudgeMatchInfoEvent extends JudgeEvent {
  const JudgeMatchInfoEvent(this.info);

  final JudgeMatchInfo info;
}

/// `contestant:status-update-judge`: danh sách thí sinh của nhóm đã đổi.
class JudgeContestantsEvent extends JudgeEvent {
  const JudgeContestantsEvent(this.contestants);

  final List<JudgeContestant> contestants;
}

/// `group:confirmCurrentQuestion-update`: nhóm vừa chốt câu.
class JudgeGroupEvent extends JudgeEvent {
  const JudgeGroupEvent(this.group);

  final JudgeGroup group;
}

/// `timer:update`: đồng hồ của trận (chỉ để xem).
class JudgeTimerEvent extends JudgeEvent {
  const JudgeTimerEvent({required this.remainingTime, required this.isActive});

  final int remainingTime;
  final bool isActive;
}

/// Giao tiếp realtime của trọng tài qua namespace `/match-control`.
///
/// Trọng tài không điều khiển đồng hồ hay bắt đầu/kết thúc trận (việc của
/// Admin); chỉ đổi trạng thái thí sinh và chốt câu.
class JudgeSocketGateway {
  JudgeSocketGateway(this._socket);

  final SocketConnection _socket;

  SocketConnection get connection => _socket;

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
        message: 'Không kết nối được tới máy chủ điều khiển trận.',
        code: 'SOCKET_CONNECT_TIMEOUT',
        isTimeout: true,
      );
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException(
        message: 'Không kết nối được tới máy chủ điều khiển trận.',
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

  /// Vào room theo slug: Backend dựng cả room chung `match-<slug>` lẫn room
  /// riêng của trọng tài `match-<slug>-judge-<userId>` từ giá trị này.
  Future<void> joinMatch(String matchSlug) async {
    try {
      final SocketAck ack =
          await _socket.emitWithAck('joinMatchRoom', matchSlug);
      if (!ack.success) {
        throw ApiException(
          message: ack.message.isEmpty
              ? 'Không thể vào phòng điều khiển trận.'
              : ack.message,
          code: 'JOIN_MATCH_FAILED',
        );
      }
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException(message: 'Không thể vào phòng điều khiển trận.');
    }
  }

  void leaveMatch(String matchSlug) {
    try {
      if (_socket.isConnected) {
        _socket.emit('leaveMatchRoom', matchSlug);
      }
    } catch (_) {
      // Mất kết nối khi rời phòng thì server cũng tự dọn.
    }
  }

  /// `contestant:status-update-judge`.
  Future<void> updateContestants({
    required String matchSlug,
    required int userId,
    required JudgeContestantStatus status,
    required List<int> registrationNumbers,
  }) {
    return _emitJudgeAction(
      event: 'contestant:status-update-judge',
      failureMessage: 'Cập nhật trạng thái thí sinh thất bại.',
      payload: <String, dynamic>{
        'match': matchSlug,
        'userId': userId,
        'status': status.apiValue,
        'ids': registrationNumbers,
      },
    );
  }

  /// `group:confirmCurrentQuestion-update` ("Chốt" câu).
  Future<void> confirmQuestion({
    required String matchSlug,
    required int userId,
    required int groupId,
    required int questionOrder,
  }) {
    return _emitJudgeAction(
      event: 'group:confirmCurrentQuestion-update',
      failureMessage: 'Chốt câu thất bại.',
      payload: <String, dynamic>{
        'match': matchSlug,
        'userId': userId,
        'groupId': groupId,
        'confirmCurrentQuestion': questionOrder,
      },
    );
  }

  /// Luồng sự kiện của trận. Hủy đăng ký khi không còn người nghe.
  Stream<JudgeEvent> watch() {
    late final StreamController<JudgeEvent> controller;
    final List<StreamSubscription<dynamic>> subscriptions =
        <StreamSubscription<dynamic>>[];

    void listen(
      String event,
      JudgeEvent? Function(Map<String, dynamic> payload) mapper,
    ) {
      subscriptions.add(
        _socket.on(event).listen((dynamic raw) {
          try {
            final Map<String, dynamic> payload =
                JsonRead.asMap(raw) ?? <String, dynamic>{};
            final JudgeEvent? mapped = mapper(payload);
            if (mapped != null && !controller.isClosed) {
              controller.add(mapped);
            }
          } catch (_) {
            // Gói tin sai định dạng: bỏ qua.
          }
        }),
      );
    }

    controller = StreamController<JudgeEvent>(
      onListen: () {
        listen('currentQuestion:get', (Map<String, dynamic> payload) {
          final Map<String, dynamic>? info =
              JsonRead.asMap(payload['matchInfo']);
          return info == null
              ? null
              : JudgeMatchInfoEvent(JudgeMatchInfo.fromJson(info));
        });
        listen('contestant:status-update-judge',
            (Map<String, dynamic> payload) {
          if (!payload.containsKey('data')) {
            return null;
          }
          return JudgeContestantsEvent(
              JudgeContestant.listFrom(payload['data']));
        });
        listen('group:confirmCurrentQuestion-update',
            (Map<String, dynamic> payload) {
          final Map<String, dynamic>? group =
              JsonRead.asMap(payload['updatedGroup']);
          return group == null
              ? null
              : JudgeGroupEvent(JudgeGroup.fromJson(group));
        });
        listen('timer:update', (Map<String, dynamic> payload) {
          return JudgeTimerEvent(
            remainingTime: JsonRead.asInt(payload['timeRemaining']) ?? 0,
            isActive: JsonRead.asBool(payload['isActive']) ?? false,
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

  /// Handler của Backend trả lỗi bằng `cb(new Error())`, bị serialize thành
  /// `{}` nên chỉ coi là thành công khi ack có `success: true`.
  Future<void> _emitJudgeAction({
    required String event,
    required String failureMessage,
    required Map<String, dynamic> payload,
  }) async {
    try {
      final SocketAck ack = await _socket.emitWithAck(event, payload);
      final bool ok = ack.success && ack.dataAsMap['success'] == true;
      if (!ok) {
        throw ApiException(
          message: ack.message.isEmpty ? failureMessage : ack.message,
          code: 'JUDGE_ACTION_FAILED',
        );
      }
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(message: failureMessage);
    }
  }
}

/// Provider gateway của trọng tài.
final Provider<JudgeSocketGateway> judgeSocketGatewayProvider =
    Provider<JudgeSocketGateway>(
  (ref) => JudgeSocketGateway(ref.watch(matchControlSocketProvider)),
);
