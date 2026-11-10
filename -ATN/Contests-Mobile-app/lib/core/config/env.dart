import 'package:flutter/foundation.dart';

/// Môi trường chạy của ứng dụng.
enum AppEnvironment { development, production }

/// Cấu hình môi trường tập trung cho toàn bộ app.
///
/// Cách truyền cấu hình khi chạy / build:
///
/// ```bash
/// # Máy ảo Android (mặc định http://10.0.2.2:3000) hoặc iOS Simulator
/// flutter run
///
/// # Thiết bị thật trong cùng mạng LAN với Backend
/// flutter run --dart-define=SERVER_URL=http://192.168.1.10:3000
///
/// # Production (bắt buộc truyền SERVER_URL)
/// flutter build apk --dart-define=APP_ENV=production --dart-define=SERVER_URL=https://api.example.com
/// ```
///
/// Lưu ý: `SERVER_URL` là địa chỉ gốc của Backend, KHÔNG có hậu tố `/api`.
class Env {
  Env._();

  static const String _appEnvRaw =
      String.fromEnvironment('APP_ENV', defaultValue: 'development');
  static const String _serverUrlRaw =
      String.fromEnvironment('SERVER_URL', defaultValue: '');

  // ---------------------------------------------------------------------------
  // Môi trường
  // ---------------------------------------------------------------------------

  static AppEnvironment get environment =>
      _appEnvRaw.trim().toLowerCase() == 'production'
          ? AppEnvironment.production
          : AppEnvironment.development;

  static bool get isProduction => environment == AppEnvironment.production;

  static bool get isDevelopment => environment == AppEnvironment.development;

  // ---------------------------------------------------------------------------
  // URL máy chủ
  // ---------------------------------------------------------------------------

  /// Địa chỉ Backend do người dùng đặt trong app (xem `ServerSettings`), được
  /// nạp lúc khởi động. Rỗng nghĩa là chưa đặt.
  static String _savedServerUrl = '';

  /// Dùng địa chỉ này thay cho `SERVER_URL` đã nhúng lúc build.
  static void useSavedServerUrl(String value) {
    _savedServerUrl = _normalizeUrl(value);
  }

  /// Địa chỉ người dùng đã lưu (rỗng nếu chưa đặt).
  static String get savedServerUrl => _savedServerUrl;

  /// Địa chỉ nhúng lúc build qua `--dart-define=SERVER_URL=...` (có thể rỗng).
  static String get buildTimeServerUrl => _normalizeUrl(_serverUrlRaw);

  /// Địa chỉ gốc của Backend, ví dụ `http://192.168.1.10:3000`.
  ///
  /// Thứ tự ưu tiên: địa chỉ người dùng đã lưu, rồi `SERVER_URL` lúc build, rồi
  /// địa chỉ mặc định của máy phát triển. Không ném lỗi khi thiếu cấu hình để
  /// app vẫn mở được và người dùng đổi địa chỉ ngay trên màn hình đăng nhập.
  static String get serverUrl {
    for (final String candidate in <String>[
      _savedServerUrl,
      buildTimeServerUrl,
    ]) {
      if (candidate.isNotEmpty) {
        _assertValidUrl(candidate);
        return candidate;
      }
    }

    return _defaultDevelopmentServerUrl;
  }

  /// Base URL cho toàn bộ REST API (đã gồm `/api`).
  static String get apiBaseUrl => '$serverUrl/api';

  /// URL gốc để kết nối Socket.IO.
  static String get socketUrl => serverUrl;

  /// Namespace Socket.IO dành cho thí sinh (Student).
  static String get studentNamespaceUrl => '$serverUrl/student';

  /// Namespace Socket.IO dành cho điều khiển trận đấu (Judge/Admin).
  static String get matchControlNamespaceUrl => '$serverUrl/match-control';

  /// Địa chỉ mặc định khi phát triển:
  /// - Android Emulator truy cập máy host qua 10.0.2.2
  /// - iOS Simulator và các nền tảng khác dùng localhost
  static String get _defaultDevelopmentServerUrl {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // ---------------------------------------------------------------------------
  // Đường dẫn API dùng chung ở tầng core
  // ---------------------------------------------------------------------------

  /// Endpoint lấy lại access token (Backend đọc refreshToken từ cookie).
  static const String refreshTokenPath = '/auth/refresh-token';

  // ---------------------------------------------------------------------------
  // Tên cookie mà Backend sử dụng để xác thực
  // ---------------------------------------------------------------------------

  static const String accessTokenCookieName = 'accessToken';
  static const String refreshTokenCookieName = 'refreshToken';

  // ---------------------------------------------------------------------------
  // Timeout mạng
  // ---------------------------------------------------------------------------

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  // ---------------------------------------------------------------------------
  // Hàm hỗ trợ
  // ---------------------------------------------------------------------------

  static String _normalizeUrl(String value) {
    String result = value.trim();
    while (result.endsWith('/')) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }

  static void _assertValidUrl(String value) {
    final Uri? uri = Uri.tryParse(value);
    final bool isValid = uri != null &&
        (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.host.isNotEmpty;

    if (!isValid) {
      throw StateError(
        'SERVER_URL không hợp lệ: "$value". '
        'Ví dụ đúng: http://192.168.1.10:3000 hoặc https://api.example.com',
      );
    }
  }
}
