import 'package:contests_mobile_app/core/config/env.dart';
import 'package:contests_mobile_app/core/config/server_settings.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ServerSettings.normalize', () {
    test('giữ nguyên địa chỉ hợp lệ và bỏ dấu / cuối', () {
      expect(
        ServerSettings.normalize('http://192.168.1.12:3000/'),
        'http://192.168.1.12:3000',
      );
    });

    test('tự thêm http:// khi người dùng chỉ nhập IP:cổng', () {
      expect(
        ServerSettings.normalize(' 192.168.1.12:3000 '),
        'http://192.168.1.12:3000',
      );
    });

    test('bỏ hậu tố /api vì app tự thêm', () {
      expect(
        ServerSettings.normalize('http://192.168.1.12:3000/api'),
        'http://192.168.1.12:3000',
      );
    });

    test('từ chối địa chỉ rỗng hoặc sai giao thức', () {
      expect(() => ServerSettings.normalize('  '), throwsFormatException);
      expect(
        () => ServerSettings.normalize('ftp://192.168.1.12'),
        throwsFormatException,
      );
    });
  });

  group('Env.serverUrl', () {
    tearDown(() => Env.useSavedServerUrl(''));

    test('ưu tiên địa chỉ người dùng đã lưu', () {
      Env.useSavedServerUrl('http://10.0.0.5:3000/');
      expect(Env.serverUrl, 'http://10.0.0.5:3000');
      expect(Env.apiBaseUrl, 'http://10.0.0.5:3000/api');
      expect(Env.studentNamespaceUrl, 'http://10.0.0.5:3000/student');
    });

    test('không có cấu hình thì dùng địa chỉ mặc định, không ném lỗi', () {
      expect(Env.serverUrl, isNotEmpty);
    });
  });
}
