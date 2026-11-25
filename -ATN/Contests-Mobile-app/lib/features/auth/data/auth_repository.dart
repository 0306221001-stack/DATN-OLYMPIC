import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/auth_user.dart';
import 'auth_api.dart';

/// Quản lý phiên đăng nhập: đăng nhập, khôi phục phiên khi mở app, đăng xuất.
///
/// Token do `ApiClient` + `TokenStorage` giữ (cơ chế cookie của Backend).
/// Repository chỉ giữ thông tin người dùng hiện tại ở `userListenable`, để
/// `go_router` dùng làm `refreshListenable` cho Auth Guard.
class AuthRepository {
  AuthRepository({
    required AuthApi api,
    required ApiClient apiClient,
  })  : _api = api,
        _apiClient = apiClient {
    _sessionSubscription =
        _apiClient.onSessionExpired.listen(_handleSessionExpired);
  }

  final AuthApi _api;
  final ApiClient _apiClient;
  final ValueNotifier<AuthUser?> _userNotifier = ValueNotifier<AuthUser?>(null);

  late final StreamSubscription<SessionExpiredReason> _sessionSubscription;

  /// Lý do phiên gần nhất bị kết thúc (để màn hình đăng nhập hiển thị).
  SessionExpiredReason? lastSessionExpiredReason;

  ValueListenable<AuthUser?> get userListenable => _userNotifier;

  AuthUser? get currentUser => _userNotifier.value;

  bool get isAuthenticated => _userNotifier.value != null;

  // ---------------------------------------------------------------------------
  // Đăng nhập
  // ---------------------------------------------------------------------------

  /// Đăng nhập theo vai trò (`student` hoặc `judge`).
  ///
  /// Thí sinh: `student-login` -> `profile` -> `profile-student`.
  /// Trọng tài: `login` -> `profile`.
  /// Nếu bước nào sau khi đăng nhập thất bại thì phiên bị hủy hoàn toàn.
  Future<AuthUser> login({
    required UserRole role,
    required String identifier,
    required String password,
  }) async {
    if (role != UserRole.student && role != UserRole.judge) {
      throw const ApiException(
        message: 'Ứng dụng chỉ hỗ trợ tài khoản Thí sinh và Trọng tài.',
      );
    }

    final String trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.isEmpty) {
      throw const ApiException(
        message: 'Vui lòng nhập tên đăng nhập hoặc email.',
        fieldErrors: <String, String>{
          'identifier': 'Vui lòng nhập tên đăng nhập hoặc email',
        },
      );
    }
    if (password.isEmpty) {
      throw const ApiException(
        message: 'Vui lòng nhập mật khẩu.',
        fieldErrors: <String, String>{'password': 'Vui lòng nhập mật khẩu'},
      );
    }

    lastSessionExpiredReason = null;
    await _clearLocalTokens();

    // Bước 1: gọi đăng nhập. Nếu lỗi ở đây thì chưa có phiên nào trên server.
    final LoginResponse loginResponse = role == UserRole.student
        ? await _api.studentLogin(
            identifier: trimmedIdentifier,
            password: password,
          )
        : await _api.login(identifier: trimmedIdentifier, password: password);

    // Bước 2: từ đây server đã có phiên, mọi lỗi phải hủy phiên đó.
    try {
      await _ensureAccessToken(loginResponse.accessToken);
      _apiClient.markSessionActive();

      final AuthUser user = await _loadUser(expectedRole: role);
      _userNotifier.value = user;
      return user;
    } on ApiException {
      await _discardServerSession();
      rethrow;
    } catch (_) {
      await _discardServerSession();
      throw const ApiException(
        message: 'Đăng nhập thất bại. Vui lòng thử lại.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Khôi phục phiên khi mở app
  // ---------------------------------------------------------------------------

  /// Trả về người dùng nếu phiên còn hiệu lực, `null` nếu cần đăng nhập lại.
  /// Gặp lỗi mạng thì ném `ApiException` (không xóa token) để UI cho thử lại.
  ///
  /// `ApiClient` tự refresh accessToken khi gặp 401 trong lúc gọi profile.
  Future<AuthUser?> restoreSession() async {
    final bool hasSession = await _apiClient.tokenStorage.hasSession();
    if (!hasSession) {
      return null;
    }

    try {
      final AuthUser user = await _loadUser();
      _userNotifier.value = user;
      return user;
    } on ApiException catch (error) {
      if (error.isNetworkError) {
        rethrow;
      }
      debugPrint('[AuthRepository] Không thể khôi phục phiên: $error');
      await _clearLocalTokens();
      _userNotifier.value = null;
      return null;
    }
  }

  /// Tải lại thông tin người dùng (ví dụ sau khi Admin đổi trận đấu).
  Future<AuthUser> refreshUser() async {
    final AuthUser user = await _loadUser();
    _userNotifier.value = user;
    return user;
  }

  // ---------------------------------------------------------------------------
  // Đăng xuất
  // ---------------------------------------------------------------------------

  /// Đăng xuất. Luôn xóa token cục bộ dù gọi server thất bại.
  Future<void> logout() async {
    try {
      final bool hasSession = await _apiClient.tokenStorage.hasSession();
      if (hasSession) {
        await _api.logout();
      }
    } on ApiException catch (error) {
      debugPrint('[AuthRepository] Đăng xuất phía server thất bại: $error');
    } finally {
      await _clearLocalTokens();
      _userNotifier.value = null;
    }
  }

  void dispose() {
    _sessionSubscription.cancel();
    _userNotifier.dispose();
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  /// Lấy thông tin tài khoản. Với Student gọi thêm `profile-student`.
  Future<AuthUser> _loadUser({UserRole? expectedRole}) async {
    final AuthUser base = await _api.getProfile();

    if (!base.isActive) {
      throw const ApiException(message: 'Tài khoản đã bị vô hiệu hóa.');
    }

    if (base.role != UserRole.student && base.role != UserRole.judge) {
      throw const ApiException(
        message: 'Ứng dụng chỉ hỗ trợ tài khoản Thí sinh và Trọng tài. '
            'Vui lòng dùng trang web để quản trị.',
      );
    }

    if (expectedRole != null && base.role != expectedRole) {
      throw ApiException(
        message:
            'Tài khoản này không phải ${expectedRole.label.toLowerCase()}.',
      );
    }

    if (base.role == UserRole.student) {
      final StudentProfile student = await _api.getStudentProfile();
      return base.copyWith(student: student);
    }

    return base;
  }

  /// Bảo đảm đã có accessToken sau khi đăng nhập. Ưu tiên token từ cookie;
  /// nếu không có thì dùng bản sao trong body.
  ///
  /// Trên web trình duyệt không cho đọc `Set-Cookie`, nên bản sao trong body là
  /// thứ duy nhất được lưu vào storage; cookie thật do trình duyệt tự giữ.
  /// Tuyệt đối không đặt header `Authorization`: Backend không đọc header này.
  Future<void> _ensureAccessToken(String? bodyToken) async {
    final storage = _apiClient.tokenStorage;
    final String? current = await storage.readAccessToken();

    if (current == null || current.isEmpty) {
      if (bodyToken == null || bodyToken.isEmpty) {
        throw const ApiException(
          message: 'Không nhận được phiên đăng nhập từ máy chủ.',
        );
      }
      await storage.saveTokens(accessToken: bodyToken);
    }

    final String? refreshToken = await storage.readRefreshToken();
    if (!kIsWeb && (refreshToken == null || refreshToken.isEmpty)) {
      debugPrint(
        '[AuthRepository] Không nhận được refreshToken từ Set-Cookie; '
        'phiên sẽ không tự gia hạn được.',
      );
    }
  }

  /// Hủy phiên vừa tạo trên server, rồi xóa token cục bộ.
  Future<void> _discardServerSession() async {
    try {
      await _api.logout();
    } on ApiException catch (error) {
      debugPrint('[AuthRepository] Không thể hủy phiên vừa tạo: $error');
    } finally {
      await _clearLocalTokens();
      _userNotifier.value = null;
    }
  }

  Future<void> _clearLocalTokens() async {
    try {
      await _apiClient.tokenStorage.clear();
    } catch (error) {
      debugPrint('[AuthRepository] Không thể xóa token cục bộ: $error');
    }
  }

  void _handleSessionExpired(SessionExpiredReason reason) {
    lastSessionExpiredReason = reason;
    _userNotifier.value = null;
  }
}

/// Provider `AuthRepository`.
final Provider<AuthRepository> authRepositoryProvider =
    Provider<AuthRepository>((ref) {
  final AuthRepository repository = AuthRepository(
    api: ref.watch(authApiProvider),
    apiClient: ref.watch(apiClientProvider),
  );
  ref.onDispose(repository.dispose);
  return repository;
});

/// Thông báo tiếng Việt cho từng lý do phiên bị kết thúc.
String sessionExpiredMessage(SessionExpiredReason reason) {
  switch (reason) {
    case SessionExpiredReason.tokenExpired:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case SessionExpiredReason.loggedInElsewhere:
      return 'Tài khoản đã được đăng nhập trên thiết bị khác.';
    case SessionExpiredReason.accountLocked:
      return 'Tài khoản đã bị khóa hoặc không còn tồn tại.';
  }
}
