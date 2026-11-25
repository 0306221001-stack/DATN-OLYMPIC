import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Mã định danh ngẫu nhiên của thiết bị, sinh một lần và giữ qua các lần đăng
/// xuất (khác token).
///
/// Gửi kèm khi đăng nhập để Backend phân biệt "cùng thiết bị đăng nhập lại"
/// (được phép) với "thiết bị thứ hai dùng chung tài khoản" (bị từ chối).
class DeviceIdentity {
  DeviceIdentity({FlutterSecureStorage? secureStorage})
      : _storage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  static const String _deviceIdKey = 'device.id';

  final FlutterSecureStorage _storage;
  String? _cache;

  /// Trả về mã thiết bị; lần đầu thì sinh mới và lưu lại.
  ///
  /// Kho an toàn lỗi thì vẫn trả về mã trong bộ nhớ để đăng nhập không bị chặn;
  /// mã đó chỉ sống đến khi đóng app.
  Future<String> read() async {
    final String? cached = _cache;
    if (cached != null) {
      return cached;
    }

    try {
      final String? stored = await _storage.read(key: _deviceIdKey);
      if (stored != null && stored.isNotEmpty) {
        _cache = stored;
        return stored;
      }
    } catch (error) {
      debugPrint('[DeviceIdentity] Không đọc được mã thiết bị: $error');
    }

    final String generated = _generate();
    _cache = generated;
    try {
      await _storage.write(key: _deviceIdKey, value: generated);
    } catch (error) {
      debugPrint('[DeviceIdentity] Không lưu được mã thiết bị: $error');
    }
    return generated;
  }

  static String _generate() {
    final Random random = Random.secure();
    final StringBuffer buffer = StringBuffer();
    for (int i = 0; i < 16; i++) {
      buffer.write(random.nextInt(256).toRadixString(16).padLeft(2, '0'));
    }
    return buffer.toString();
  }
}

/// Provider dùng chung cho toàn app.
final Provider<DeviceIdentity> deviceIdentityProvider =
    Provider<DeviceIdentity>((ref) => DeviceIdentity());
