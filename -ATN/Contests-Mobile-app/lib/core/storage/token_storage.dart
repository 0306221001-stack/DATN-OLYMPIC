import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/env.dart';

/// Lỗi phát sinh khi đọc / ghi kho lưu trữ token an toàn.
class TokenStorageException implements Exception {
  const TokenStorageException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => 'TokenStorageException: $message'
      '${cause != null ? ' (nguyên nhân: $cause)' : ''}';
}

/// Lưu trữ AccessToken và RefreshToken bằng `flutter_secure_storage`
/// (Keychain trên iOS, EncryptedSharedPreferences/Keystore trên Android).
///
/// Backend xác thực bằng cookie httpOnly, nên ngoài việc lưu token lớp này còn
/// dựng sẵn giá trị header `Cookie` để `ApiClient` và Socket.IO sử dụng.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? secureStorage})
      : _storage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  static const String _accessTokenKey = 'auth.access_token';
  static const String _refreshTokenKey = 'auth.refresh_token';

  final FlutterSecureStorage _storage;

  // Bộ nhớ đệm để tránh truy cập Keystore/Keychain ở mỗi request.
  String? _accessTokenCache;
  String? _refreshTokenCache;
  bool _isLoaded = false;
  Future<void>? _loading;

  // ---------------------------------------------------------------------------
  // Đọc
  // ---------------------------------------------------------------------------

  /// Nạp token từ kho an toàn vào bộ nhớ đệm (chỉ thực hiện thật sự một lần).
  Future<void> init() => _ensureLoaded();

  Future<String?> readAccessToken() async {
    await _ensureLoaded();
    return _accessTokenCache;
  }

  Future<String?> readRefreshToken() async {
    await _ensureLoaded();
    return _refreshTokenCache;
  }

  /// Có token hợp lệ về mặt hình thức để thử khôi phục phiên đăng nhập.
  /// Chỉ cần còn refreshToken là có thể xin accessToken mới.
  Future<bool> hasSession() async {
    await _ensureLoaded();
    return _isNotBlank(_refreshTokenCache) || _isNotBlank(_accessTokenCache);
  }

  /// Dựng giá trị header `Cookie` theo đúng tên cookie Backend đang đọc
  /// (`accessToken`, `refreshToken`). Trả về `null` nếu chưa có token nào.
  ///
  /// Socket.IO chỉ cần accessToken nên có thể truyền `includeRefresh: false`.
  Future<String?> buildCookieHeader({
    bool includeAccess = true,
    bool includeRefresh = true,
  }) async {
    await _ensureLoaded();

    final List<String> parts = <String>[];

    if (includeAccess && _isNotBlank(_accessTokenCache)) {
      parts.add('${Env.accessTokenCookieName}=$_accessTokenCache');
    }
    if (includeRefresh && _isNotBlank(_refreshTokenCache)) {
      parts.add('${Env.refreshTokenCookieName}=$_refreshTokenCache');
    }

    if (parts.isEmpty) {
      return null;
    }
    return parts.join('; ');
  }

  // ---------------------------------------------------------------------------
  // Ghi
  // ---------------------------------------------------------------------------

  /// Lưu token. Tham số nào là `null` thì giữ nguyên giá trị hiện có.
  Future<void> saveTokens({String? accessToken, String? refreshToken}) async {
    await _ensureLoaded();

    try {
      if (accessToken != null) {
        await _storage.write(key: _accessTokenKey, value: accessToken);
        _accessTokenCache = accessToken;
      }
      if (refreshToken != null) {
        await _storage.write(key: _refreshTokenKey, value: refreshToken);
        _refreshTokenCache = refreshToken;
      }
    } on PlatformException catch (error) {
      throw TokenStorageException('Không thể lưu token an toàn.', cause: error);
    } catch (error) {
      throw TokenStorageException('Lỗi không xác định khi lưu token.',
          cause: error);
    }
  }

  Future<void> clearAccessToken() async {
    await _ensureLoaded();

    try {
      await _storage.delete(key: _accessTokenKey);
      _accessTokenCache = null;
    } on PlatformException catch (error) {
      throw TokenStorageException('Không thể xóa accessToken.', cause: error);
    } catch (error) {
      throw TokenStorageException('Lỗi không xác định khi xóa accessToken.',
          cause: error);
    }
  }

  Future<void> clearRefreshToken() async {
    await _ensureLoaded();

    try {
      await _storage.delete(key: _refreshTokenKey);
      _refreshTokenCache = null;
    } on PlatformException catch (error) {
      throw TokenStorageException('Không thể xóa refreshToken.', cause: error);
    } catch (error) {
      throw TokenStorageException('Lỗi không xác định khi xóa refreshToken.',
          cause: error);
    }
  }

  /// Xóa toàn bộ token (đăng xuất hoặc phiên hết hạn).
  Future<void> clear() async {
    // Dù lưu trữ lỗi, bộ nhớ đệm vẫn phải được dọn để request sau không
    // tiếp tục gửi token cũ.
    _accessTokenCache = null;
    _refreshTokenCache = null;
    _isLoaded = true;

    try {
      await _storage.delete(key: _accessTokenKey);
      await _storage.delete(key: _refreshTokenKey);
    } on PlatformException catch (error) {
      throw TokenStorageException('Không thể xóa token.', cause: error);
    } catch (error) {
      throw TokenStorageException('Lỗi không xác định khi xóa token.',
          cause: error);
    }
  }

  // ---------------------------------------------------------------------------
  // Nội bộ
  // ---------------------------------------------------------------------------

  Future<void> _ensureLoaded() {
    if (_isLoaded) {
      return Future<void>.value();
    }
    return _loading ??= _loadFromStorage().whenComplete(() => _loading = null);
  }

  Future<void> _loadFromStorage() async {
    try {
      _accessTokenCache = await _storage.read(key: _accessTokenKey);
      _refreshTokenCache = await _storage.read(key: _refreshTokenKey);
    } on PlatformException catch (error) {
      // Keystore/Keychain có thể bị hỏng (ví dụ sau khi khôi phục máy).
      // Dữ liệu không đọc được nữa nên xóa sạch để người dùng đăng nhập lại.
      debugPrint('[TokenStorage] Không đọc được kho an toàn: $error');
      _accessTokenCache = null;
      _refreshTokenCache = null;
      try {
        await _storage.deleteAll();
      } catch (deleteError) {
        debugPrint('[TokenStorage] Không thể dọn kho an toàn: $deleteError');
      }
    } catch (error) {
      debugPrint('[TokenStorage] Lỗi không xác định khi đọc token: $error');
      _accessTokenCache = null;
      _refreshTokenCache = null;
    } finally {
      _isLoaded = true;
    }
  }

  static bool _isNotBlank(String? value) =>
      value != null && value.trim().isNotEmpty;
}

/// Provider dùng chung cho toàn app.
final Provider<TokenStorage> tokenStorageProvider =
    Provider<TokenStorage>((ref) => TokenStorage());
