import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_guard.dart';
import '../domain/class_option.dart';

/// Các endpoint công khai về tài khoản: đăng ký thí sinh và quên mật khẩu
/// bằng OTP. Không cần đăng nhập nên mọi lời gọi dùng `requiresAuth: false`.
///
/// Mọi phương thức ném `ApiException` với thông điệp tiếng Việt khi thất bại.
class AccountApi {
  AccountApi(this._client);

  final ApiClient _client;

  static const String _classesPath = '/class/list-with-school';
  static const String _registerStudentPath = '/auth/register-student';
  static const String _forgotPasswordPath = '/auth/forgot-password';
  static const String _verifyOtpPath = '/auth/verify-otp';
  static const String _resetPasswordPath = '/auth/reset-password';

  /// `GET /api/class/list-with-school`: các lớp còn hoạt động kèm tên trường.
  Future<List<ClassOption>> fetchClasses() {
    return guardApi<List<ClassOption>>(
      failureMessage: 'Không thể tải danh sách lớp.',
      action: () async {
        final ApiResult result = await _client.get(
          _classesPath,
          requiresAuth: false,
        );
        final List<ClassOption> classes = <ClassOption>[];
        for (final dynamic item in result.dataAsList) {
          final ClassOption? option = ClassOption.tryFromJson(item);
          if (option != null) {
            classes.add(option);
          }
        }
        return classes;
      },
    );
  }

  /// `POST /api/auth/register-student`.
  Future<String> registerStudent({
    required String username,
    required String fullName,
    required String email,
    required String password,
    required String confirmPassword,
    required int classId,
  }) {
    return guardApi<String>(
      failureMessage: 'Đăng ký thất bại. Vui lòng thử lại.',
      action: () async {
        final ApiResult result = await _client.post(
          _registerStudentPath,
          data: <String, dynamic>{
            'username': username,
            'fullName': fullName,
            'email': email,
            'password': password,
            'confirmPassword': confirmPassword,
            'classId': classId,
          },
          requiresAuth: false,
        );
        return result.message.isNotEmpty
            ? result.message
            : 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.';
      },
    );
  }

  /// `POST /api/auth/forgot-password`: gửi mã OTP 6 số về email.
  Future<String> sendOtp({required String email}) {
    return guardApi<String>(
      failureMessage: 'Không thể gửi mã OTP. Vui lòng thử lại.',
      action: () async {
        final ApiResult result = await _client.post(
          _forgotPasswordPath,
          data: <String, dynamic>{'email': email},
          requiresAuth: false,
        );
        return result.message.isNotEmpty
            ? result.message
            : 'Đã gửi mã OTP đến email của bạn.';
      },
    );
  }

  /// `POST /api/auth/verify-otp`: kiểm tra mã OTP.
  Future<void> verifyOtp({required String email, required String otp}) {
    return guardApi<void>(
      failureMessage: 'Không thể xác thực mã OTP. Vui lòng thử lại.',
      action: () async {
        await _client.post(
          _verifyOtpPath,
          data: <String, dynamic>{'email': email, 'otp': otp},
          requiresAuth: false,
        );
      },
    );
  }

  /// `POST /api/auth/reset-password`: đặt mật khẩu mới.
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
    required String confirmNewPassword,
  }) {
    return guardApi<void>(
      failureMessage: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
      action: () async {
        await _client.post(
          _resetPasswordPath,
          data: <String, dynamic>{
            'email': email,
            'otp': otp,
            'newPassword': newPassword,
            'confirmNewPassword': confirmNewPassword,
          },
          requiresAuth: false,
        );
      },
    );
  }
}

/// Provider `AccountApi`.
final Provider<AccountApi> accountApiProvider = Provider<AccountApi>(
  (ref) => AccountApi(ref.watch(apiClientProvider)),
);
