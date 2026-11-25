import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../features/auth/data/auth_repository.dart';
import '../config/env.dart';
import '../storage/token_storage.dart';
import 'api_client.dart';

/// Trạng thái kết nối của một namespace Socket.IO.
enum SocketConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  failed,
}

/// Kết quả ack đã được chuẩn hóa.
///
/// Backend dùng hai kiểu ack: `cb({ success, message, data })` và
/// `cb(error, result)`. Lớp này gom cả hai về cùng một dạng.
class SocketAck {
  const SocketAck({
    required this.success,
    required this.message,
    this.data,
  });

  final bool success;
  final String message;
  final dynamic data;

  /// Chuẩn hóa dữ liệu ack thô nhận từ `socket_io_client`.
  ///
  /// Thư viện gọi callback với một đối số khi server gửi một giá trị, và với
  /// một `List` khi server gửi nhiều giá trị (ví dụ `cb(null, result)`).
  factory SocketAck.fromRaw(dynamic raw) {
    if (raw == null) {
      return const SocketAck(success: true, message: '');
    }

    if (raw is List) {
      if (raw.length == 2) {
        final dynamic error = raw[0];
        final dynamic result = raw[1];
        if (error != null && error != false) {
          return SocketAck(
            success: false,
            message: _readMessage(error) ?? 'Máy chủ từ chối yêu cầu.',
          );
        }
        return SocketAck._fromResult(result);
      }
      if (raw.length == 1) {
        return SocketAck._fromResult(raw.first);
      }
      return SocketAck(success: true, message: '', data: raw);
    }

    return SocketAck._fromResult(raw);
  }

  factory SocketAck._fromResult(dynamic result) {
    if (result == null) {
      return const SocketAck(success: true, message: '');
    }
    if (result is Map) {
      final Map<String, dynamic> map = Map<String, dynamic>.from(result);
      final bool success = map['success'] != false;
      final String message = _readMessage(map) ?? '';
      if (map.containsKey('data')) {
        return SocketAck(success: success, message: message, data: map['data']);
      }
      return SocketAck(success: success, message: message, data: map);
    }
    if (result is String) {
      return SocketAck(success: true, message: result);
    }
    return SocketAck(success: true, message: '', data: result);
  }

  /// `data` dưới dạng `Map`, hoặc rỗng nếu không phải `Map`.
  Map<String, dynamic> get dataAsMap {
    final dynamic value = data;
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }

  static String? _readMessage(dynamic source) {
    if (source is String && source.trim().isNotEmpty) {
      return source;
    }
    if (source is Map) {
      final dynamic message = source['message'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
    }
    return null;
  }
}

/// Một kết nối Socket.IO tới một namespace của Backend.
///
/// - Xác thực bằng cookie `accessToken`: trên mobile gắn header `Cookie` từ
///   `TokenStorage`; trên web trình duyệt tự gửi cookie (`withCredentials`).
/// - Tự kết nối lại khi mất mạng. Khi server từ chối xác thực, thử khôi phục
///   phiên (refresh token) rồi kết nối lại đúng một lần.
/// - Sự kiện được phát qua `Stream`; đăng ký bằng [on] vẫn còn hiệu lực khi
///   socket bên dưới được tạo lại.
class SocketConnection {
  SocketConnection({
    required this.label,
    required this.url,
    required TokenStorage tokenStorage,
    required ApiClient apiClient,
  })  : _tokenStorage = tokenStorage,
        _apiClient = apiClient {
    _sessionSubscription = _apiClient.onSessionExpired.listen((_) {
      disconnect();
    });
  }

  /// Tên dùng khi ghi log.
  final String label;

  /// URL đầy đủ gồm cả namespace, ví dụ `http://localhost:3000/student`.
  final String url;

  static const Duration defaultAckTimeout = Duration(seconds: 10);

  final TokenStorage _tokenStorage;
  final ApiClient _apiClient;

  final StreamController<SocketConnectionState> _stateController =
      StreamController<SocketConnectionState>.broadcast();
  final Map<String, StreamController<dynamic>> _eventControllers =
      <String, StreamController<dynamic>>{};

  late final StreamSubscription<SessionExpiredReason> _sessionSubscription;

  io.Socket? _socket;
  SocketConnectionState _state = SocketConnectionState.disconnected;
  bool _disposed = false;
  bool _authRetried = false;
  int _generation = 0;

  SocketConnectionState get state => _state;
  bool get isConnected => _state == SocketConnectionState.connected;

  Stream<SocketConnectionState> get stateStream => _stateController.stream;

  /// Dựng lại kết nối từ đầu nếu chưa ở trạng thái `connected`. Dùng khi app
  /// quay lại từ nền: hệ điều hành thường đã cắt socket cũ nhưng thư viện chưa
  /// kịp (hoặc không thể) tự nối lại.
  Future<void> reconnectIfNeeded() async {
    if (_disposed || _state == SocketConnectionState.connected) {
      return;
    }
    _authRetried = false;
    await _openSocket();
  }

  /// Kết nối (không làm gì nếu đang kết nối hoặc đã kết nối).
  Future<void> connect() async {
    if (_disposed) {
      return;
    }
    if (_socket != null &&
        (_state == SocketConnectionState.connected ||
            _state == SocketConnectionState.connecting ||
            _state == SocketConnectionState.reconnecting)) {
      return;
    }
    await _openSocket();
  }

  /// Ngắt kết nối. Các đăng ký [on] vẫn được giữ cho lần [connect] sau.
  void disconnect() {
    _generation++;
    _authRetried = false;
    _closeSocket();
    _setState(SocketConnectionState.disconnected);
  }

  /// Luồng sự kiện [event] từ server (broadcast).
  Stream<dynamic> on(String event) {
    final StreamController<dynamic> existing =
        _eventControllers[event] ?? _createEventController(event);
    return existing.stream;
  }

  /// Gửi sự kiện không cần ack.
  void emit(String event, [dynamic payload]) {
    final io.Socket? socket = _socket;
    if (socket == null || !isConnected) {
      throw const ApiException(
        message: 'Chưa kết nối tới máy chủ trận đấu. Vui lòng thử lại.',
        code: 'SOCKET_NOT_CONNECTED',
        isNetworkError: true,
      );
    }
    socket.emit(event, payload);
  }

  /// Gửi sự kiện và chờ ack. Ném `ApiException` khi chưa kết nối hoặc quá hạn.
  Future<SocketAck> emitWithAck(
    String event, [
    dynamic payload,
    Duration timeout = defaultAckTimeout,
  ]) async {
    final io.Socket? socket = _socket;
    if (socket == null || !isConnected) {
      throw const ApiException(
        message: 'Chưa kết nối tới máy chủ trận đấu. Vui lòng thử lại.',
        code: 'SOCKET_NOT_CONNECTED',
        isNetworkError: true,
      );
    }

    final Completer<SocketAck> completer = Completer<SocketAck>();
    try {
      socket.emitWithAck(
        event,
        payload,
        ack: ([dynamic raw]) {
          if (!completer.isCompleted) {
            completer.complete(SocketAck.fromRaw(raw));
          }
        },
      );
    } catch (_) {
      throw const ApiException(
        message: 'Không thể gửi yêu cầu tới máy chủ trận đấu.',
        code: 'SOCKET_EMIT_FAILED',
        isNetworkError: true,
      );
    }

    return completer.future.timeout(
      timeout,
      onTimeout: () {
        throw const ApiException(
          message: 'Máy chủ không phản hồi. Vui lòng thử lại.',
          code: 'SOCKET_ACK_TIMEOUT',
          isTimeout: true,
        );
      },
    );
  }

  /// Giải phóng toàn bộ tài nguyên.
  void dispose() {
    if (_disposed) {
      return;
    }
    _disposed = true;
    _generation++;
    _sessionSubscription.cancel();
    _closeSocket();
    for (final StreamController<dynamic> controller
        in _eventControllers.values) {
      controller.close();
    }
    _eventControllers.clear();
    _stateController.close();
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  StreamController<dynamic> _createEventController(String event) {
    final StreamController<dynamic> controller =
        StreamController<dynamic>.broadcast();
    _eventControllers[event] = controller;
    _socket?.on(event, (dynamic data) {
      if (!controller.isClosed) {
        controller.add(data);
      }
    });
    return controller;
  }

  Future<void> _openSocket() async {
    _closeSocket();
    _generation++;
    final int generation = _generation;
    _setState(SocketConnectionState.connecting);

    String? cookie;
    if (!kIsWeb) {
      try {
        cookie = await _tokenStorage.buildCookieHeader(includeRefresh: false);
      } catch (_) {
        cookie = null;
      }
    }

    if (_disposed || generation != _generation) {
      return;
    }

    final io.OptionBuilder builder = io.OptionBuilder()
        .setTransports(<String>['websocket', 'polling'])
        .disableAutoConnect()
        .enableForceNew()
        .enableReconnection()
        .setReconnectionAttempts(double.infinity)
        .setReconnectionDelay(1000)
        .setReconnectionDelayMax(5000)
        .setTimeout(10000);
    if (cookie != null && cookie.isNotEmpty) {
      builder.setExtraHeaders(<String, dynamic>{'Cookie': cookie});
    }

    final Map<String, dynamic> options = builder.build();
    options['withCredentials'] = true;

    final io.Socket socket = io.io(url, options);
    _socket = socket;

    socket.onConnect((_) {
      if (generation != _generation) {
        return;
      }
      _authRetried = false;
      _setState(SocketConnectionState.connected);
    });
    socket.onDisconnect((dynamic reason) {
      if (generation != _generation) {
        return;
      }
      final bool byClient = reason == 'io client disconnect';
      _setState(
        byClient
            ? SocketConnectionState.disconnected
            : SocketConnectionState.reconnecting,
      );
    });
    socket.onConnectError((dynamic error) {
      if (generation != _generation) {
        return;
      }
      _handleConnectError(error);
    });
    socket.on('reconnect_attempt', (_) {
      if (generation == _generation) {
        _setState(SocketConnectionState.reconnecting);
      }
    });
    socket.on('reconnect', (_) {
      if (generation == _generation) {
        _setState(SocketConnectionState.connected);
      }
    });
    socket.on('reconnect_failed', (_) {
      if (generation == _generation) {
        _setState(SocketConnectionState.failed);
      }
    });

    for (final MapEntry<String, StreamController<dynamic>> entry
        in _eventControllers.entries) {
      final StreamController<dynamic> controller = entry.value;
      socket.on(entry.key, (dynamic data) {
        if (!controller.isClosed) {
          controller.add(data);
        }
      });
    }

    socket.connect();
  }

  void _handleConnectError(dynamic error) {
    final String text = error.toString();
    final bool authError = text.contains('Authentication') ||
        text.contains('not found') ||
        text.contains('inactive');

    if (authError && !_authRetried) {
      _authRetried = true;
      unawaited(_recoverSession());
      return;
    }

    _setState(
      authError
          ? SocketConnectionState.failed
          : SocketConnectionState.reconnecting,
    );
  }

  Future<void> _recoverSession() async {
    final int generation = _generation;
    _setState(SocketConnectionState.reconnecting);
    bool restored = false;
    try {
      restored = await _apiClient.tryRestoreSession();
    } catch (_) {
      restored = false;
    }

    if (_disposed || generation != _generation) {
      return;
    }
    if (!restored) {
      _closeSocket();
      _setState(SocketConnectionState.failed);
      return;
    }
    await _openSocket();
  }

  void _closeSocket() {
    final io.Socket? socket = _socket;
    _socket = null;
    if (socket == null) {
      return;
    }
    try {
      socket.dispose();
    } catch (_) {
      // Socket đã đóng sẵn; không còn việc gì để làm.
    }
  }

  void _setState(SocketConnectionState next) {
    if (_state == next) {
      return;
    }
    _state = next;
    if (!_stateController.isClosed) {
      _stateController.add(next);
    }
  }
}

SocketConnection _buildConnection(
  Ref ref, {
  required String label,
  required String url,
}) {
  final SocketConnection connection = SocketConnection(
    label: label,
    url: url,
    tokenStorage: ref.watch(tokenStorageProvider),
    apiClient: ref.watch(apiClientProvider),
  );

  // Đăng xuất (hoặc mất phiên) thì ngắt socket để không giữ token cũ.
  final AuthRepository repository = ref.watch(authRepositoryProvider);
  void handleUserChanged() {
    if (repository.currentUser == null) {
      connection.disconnect();
    }
  }

  repository.userListenable.addListener(handleUserChanged);
  ref.onDispose(() {
    repository.userListenable.removeListener(handleUserChanged);
    connection.dispose();
  });
  return connection;
}

/// Kết nối namespace `/student` (Thí sinh).
final Provider<SocketConnection> studentSocketProvider =
    Provider<SocketConnection>(
  (ref) => _buildConnection(
    ref,
    label: 'student',
    url: Env.studentNamespaceUrl,
  ),
);

/// Kết nối namespace `/match-control` (Trọng tài).
final Provider<SocketConnection> matchControlSocketProvider =
    Provider<SocketConnection>(
  (ref) => _buildConnection(
    ref,
    label: 'match-control',
    url: Env.matchControlNamespaceUrl,
  ),
);
