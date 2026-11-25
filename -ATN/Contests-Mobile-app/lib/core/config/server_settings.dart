import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'env.dart';

/// Lưu và kiểm tra địa chỉ Backend do người dùng nhập trong app.
///
/// Nhờ đó khi IP máy chủ đổi (đổi Wi-Fi, đổi máy) chỉ cần nhập lại địa chỉ,
/// không phải build lại ứng dụng.
class ServerSettings {
  ServerSettings._();

  static const String _storageKey = 'settings.server_url';

  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  /// Nạp địa chỉ đã lưu vào `Env`. Gọi một lần trước `runApp`; lỗi đọc bộ nhớ
  /// được bỏ qua (app vẫn chạy với địa chỉ mặc định).
  static Future<void> load() async {
    try {
      final String? saved = await _storage.read(key: _storageKey);
      if (saved != null && saved.trim().isNotEmpty) {
        Env.useSavedServerUrl(saved);
      }
    } catch (error) {
      debugPrint('[ServerSettings] Không đọc được địa chỉ máy chủ: $error');
    }
  }

  /// Chuẩn hóa và kiểm tra cú pháp địa chỉ. Ném `FormatException` với thông
  /// điệp tiếng Việt khi không hợp lệ.
  static String normalize(String input) {
    String value = input.trim();
    while (value.endsWith('/')) {
      value = value.substring(0, value.length - 1);
    }
    if (value.toLowerCase().endsWith('/api')) {
      value = value.substring(0, value.length - 4);
    }
    if (value.isEmpty) {
      throw const FormatException('Vui lòng nhập địa chỉ máy chủ.');
    }
    if (!value.contains('://')) {
      value = 'http://$value';
    }

    final Uri? uri = Uri.tryParse(value);
    final bool valid = uri != null &&
        (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.host.isNotEmpty;
    if (!valid) {
      throw const FormatException(
        'Địa chỉ không hợp lệ. Ví dụ: http://192.168.1.12:3000',
      );
    }
    return value;
  }

  /// Gọi thử Backend. Chỉ cần nhận được phản hồi HTTP (kể cả 401) là máy chủ
  /// đang chạy và điện thoại tới được nó.
  static Future<bool> testConnection(String url) async {
    final Dio dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
        validateStatus: (int? status) => true,
      ),
    );
    try {
      final Response<dynamic> response =
          await dio.get<dynamic>('$url/api/auth/profile');
      return response.statusCode != null;
    } catch (_) {
      return false;
    } finally {
      dio.close();
    }
  }

  /// Lưu địa chỉ (đã chuẩn hóa). Có hiệu lực sau khi mở lại app.
  static Future<void> save(String normalizedUrl) async {
    try {
      await _storage.write(key: _storageKey, value: normalizedUrl);
    } catch (error) {
      debugPrint('[ServerSettings] Không lưu được địa chỉ máy chủ: $error');
      throw const FormatException('Không lưu được địa chỉ máy chủ.');
    }
  }

  /// Xóa địa chỉ đã lưu để quay lại địa chỉ nhúng lúc build.
  static Future<void> clear() async {
    try {
      await _storage.delete(key: _storageKey);
    } catch (error) {
      debugPrint('[ServerSettings] Không xóa được địa chỉ máy chủ: $error');
    }
  }
}
