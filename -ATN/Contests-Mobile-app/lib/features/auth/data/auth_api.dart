import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_guard.dart';
import '../domain/auth_user.dart';

/// Kết quả của `POST /auth/login` và `POST /auth/student-login`.
///
/// Backend chỉ trả `{ role, accessToken }` trong body. Token chính thức
/// (accessToken + refreshToken) nằm ở header `Set-Cookie` và đã được
/// `ApiClient` tự lưu vào `TokenStorage`.
class LoginResponse {
  const LoginResponse({required this.role, this.accessToken});

  final UserRole role;

  /// Bản sao accessToken trong body, chỉ dùng làm phương án dự phòng.
  final String? accessToken;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final UserRole? role = UserRole.tryParse(json['role']);
    if (role == null) {
      throw const FormatException('Phản hồi đăng nhập thiếu vai trò.');
    }

    final Object? token = json['accessToken'];
    return LoginResponse(
      role: role,
      accessToken: token is String && token.isNotEmpty ? token : null,
    );
  }
}

/// Gọi các endpoint xác thực của Backend (`/api/auth/...`).
///
/// Mọi phương thức ném `ApiException` với thông điệp tiếng Việt khi thất bại.
class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;

  static const String _loginPath = '/auth/login';
  static const String _studentLoginPath = '/auth/student-login';
  static const String _profilePath = '/auth/profile';
  static const String _studentProfilePath = '/auth/profile-student';
  static const String _logoutPath = '/auth/logout';

  /// Đăng nhập Trọng tài (Backend từ chối tài khoản Student ở endpoint này).
  Future<LoginResponse> login({
    required String identifier,
    required String password,
  }) {
    return _loginRequest(
      path: _loginPath,
      identifier: identifier,
      password: password,
    );
  }

  /// Đăng nhập Thí sinh (Backend từ chối tài khoản không phải Student).
  Future<LoginResponse> studentLogin({
    required String identifier,
    required String password,
  }) {
    return _loginRequest(
      path: _studentLoginPath,
      identifier: identifier,
      password: password,
    );
  }

  /// `GET /auth/profile` cho mọi vai trò.
  Future<AuthUser> getProfile() {
    return guardApi<AuthUser>(
      failureMessage: 'Không thể tải thông tin tài khoản.',
      action: () async {
        final ApiResult result = await _client.get(_profilePath);
        return AuthUser.fromProfileJson(result.dataAsMap);
      },
    );
  }

  /// `GET /auth/profile-student` chỉ dành cho Student: thông tin thí sinh,
  /// cuộc thi và danh sách trận đấu.
  Future<StudentProfile> getStudentProfile() {
    return guardApi<StudentProfile>(
      failureMessage: 'Không thể tải thông tin thí sinh.',
      action: () async {
        final ApiResult result = await _client.get(_studentProfilePath);
        return StudentProfile.fromJson(result.dataAsMap);
      },
    );
  }

  /// `POST /auth/logout`: Backend xóa token trong DB và xóa cookie.
  Future<void> logout() {
    return guardApi<void>(
      failureMessage: 'Không thể đăng xuất khỏi máy chủ.',
      action: () async {
        await _client.post(_logoutPath);
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  Future<LoginResponse> _loginRequest({
    required String path,
    required String identifier,
    required String password,
  }) {
    return guardApi<LoginResponse>(
      failureMessage: 'Đăng nhập thất bại. Vui lòng thử lại.',
      action: () async {
        final ApiResult result = await _client.post(
          path,
          data: <String, dynamic>{
            'identifier': identifier,
            'password': password,
          },
          // Đăng nhập là endpoint công khai: không gắn cookie cũ và không
          // kích hoạt auto refresh khi sai mật khẩu.
          requiresAuth: false,
        );
        return LoginResponse.fromJson(result.dataAsMap);
      },
    );
  }
}

/// Provider `AuthApi`.
final Provider<AuthApi> authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);
