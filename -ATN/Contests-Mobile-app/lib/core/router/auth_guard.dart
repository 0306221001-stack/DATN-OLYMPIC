import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/domain/auth_user.dart';
import '../network/api_client.dart';
import 'app_routes.dart';

/// Trạng thái phiên đăng nhập mà router cần biết.
enum SessionStatus {
  /// Đang khôi phục phiên từ token đã lưu (màn hình splash).
  restoring,

  /// Đã đăng nhập.
  authenticated,

  /// Chưa đăng nhập hoặc phiên đã hết hạn.
  unauthenticated,

  /// Không khôi phục được vì lỗi mạng/máy chủ; cho phép người dùng thử lại.
  failed,
}

/// Theo dõi trạng thái phiên và là `refreshListenable` của `GoRouter`.
class AuthSessionController extends ChangeNotifier {
  AuthSessionController(this._repository) {
    _repository.userListenable.addListener(_handleUserChanged);
  }

  final AuthRepository _repository;

  SessionStatus _status = SessionStatus.restoring;
  ApiException? _restoreError;
  bool _isRestoring = false;
  bool _isDisposed = false;

  SessionStatus get status => _status;

  AuthUser? get user => _repository.currentUser;

  /// Lỗi của lần khôi phục phiên gần nhất (khi `status == failed`).
  ApiException? get restoreError => _restoreError;

  /// Khôi phục phiên khi mở app, hoặc thử lại sau lỗi mạng.
  Future<void> restore() async {
    if (_isRestoring) {
      return;
    }

    _isRestoring = true;
    _restoreError = null;
    _setStatus(SessionStatus.restoring);

    try {
      final AuthUser? restored = await _repository.restoreSession();
      _setStatus(
        restored == null
            ? SessionStatus.unauthenticated
            : SessionStatus.authenticated,
      );
    } on ApiException catch (error) {
      _restoreError = error;
      _setStatus(SessionStatus.failed);
    } catch (_) {
      _restoreError = const ApiException(
        message: 'Không thể khôi phục phiên đăng nhập. Vui lòng thử lại.',
      );
      _setStatus(SessionStatus.failed);
    } finally {
      _isRestoring = false;
    }
  }

  /// Bỏ phiên cũ và chuyển sang màn hình đăng nhập (dùng khi khôi phục lỗi).
  Future<void> discardSession() async {
    await _repository.logout();
    _restoreError = null;
    _setStatus(SessionStatus.unauthenticated);
  }

  void _handleUserChanged() {
    // Trong lúc khôi phục, `restore()` sẽ tự đặt trạng thái cuối cùng.
    if (_isRestoring) {
      return;
    }
    _setStatus(
      _repository.currentUser == null
          ? SessionStatus.unauthenticated
          : SessionStatus.authenticated,
    );
  }

  void _setStatus(SessionStatus next) {
    if (_status == next) {
      return;
    }
    _status = next;
    if (!_isDisposed) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _repository.userListenable.removeListener(_handleUserChanged);
    super.dispose();
  }
}

/// Màn hình chính tương ứng với từng vai trò.
String homeRouteFor(UserRole role) {
  switch (role) {
    case UserRole.student:
      return AppRoutes.studentDashboard;
    case UserRole.judge:
      return AppRoutes.judgeContests;
    case UserRole.admin:
      return AppRoutes.login;
  }
}

/// Quy tắc điều hướng của Auth Guard. Hàm thuần, không phụ thuộc Flutter nên
/// dễ viết unit test. Trả về `null` nghĩa là cho phép vào đường dẫn hiện tại.
///
/// - Đang khôi phục/lỗi khôi phục: luôn ở màn hình splash.
/// - Chưa đăng nhập: chỉ vào được đăng nhập, đăng ký, quên mật khẩu.
/// - Đã đăng nhập: không vào lại các trang trên; chỉ vào khu vực đúng vai trò.
String? resolveAuthRedirect({
  required SessionStatus status,
  required AuthUser? user,
  required String location,
}) {
  final String path = Uri.parse(location).path;

  switch (status) {
    case SessionStatus.restoring:
    case SessionStatus.failed:
      return path == AppRoutes.splash ? null : AppRoutes.splash;

    case SessionStatus.unauthenticated:
      return _redirectForGuest(path);

    case SessionStatus.authenticated:
      if (user == null) {
        return _redirectForGuest(path);
      }

      // Ứng dụng chỉ hỗ trợ Thí sinh và Trọng tài.
      if (user.role != UserRole.student && user.role != UserRole.judge) {
        return _redirectForGuest(path);
      }

      final String home = homeRouteFor(user.role);

      if (path == AppRoutes.splash || AppRoutes.isAuthPage(path)) {
        return home;
      }
      if (AppRoutes.isStudentArea(path) && user.role != UserRole.student) {
        return home;
      }
      if (AppRoutes.isJudgeArea(path) && user.role != UserRole.judge) {
        return home;
      }
      return null;
  }
}

String? _redirectForGuest(String path) {
  if (AppRoutes.isAuthPage(path)) {
    return null;
  }
  return AppRoutes.login;
}

/// Provider `AuthSessionController`. Tự bắt đầu khôi phục phiên ngay khi được
/// tạo lần đầu.
final Provider<AuthSessionController> authSessionControllerProvider =
    Provider<AuthSessionController>((ref) {
  final AuthSessionController controller = AuthSessionController(
    ref.watch(authRepositoryProvider),
  );
  ref.onDispose(controller.dispose);
  unawaited(controller.restore());
  return controller;
});
