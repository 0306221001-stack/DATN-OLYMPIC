import 'package:contests_mobile_app/core/network/socket_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SocketAck.fromRaw', () {
    test('ack rỗng là thành công', () {
      final SocketAck ack = SocketAck.fromRaw(null);
      expect(ack.success, isTrue);
    });

    test('kiểu cb({success, message, data}) được giữ nguyên', () {
      final SocketAck ack = SocketAck.fromRaw(<String, dynamic>{
        'success': true,
        'message': 'OK',
        'data': <String, dynamic>{'matchData': 1},
      });
      expect(ack.success, isTrue);
      expect(ack.message, 'OK');
      expect(ack.dataAsMap['matchData'], 1);
    });

    test('kiểu cb({success:false}) là thất bại', () {
      final SocketAck ack = SocketAck.fromRaw(<String, dynamic>{
        'success': false,
        'message': 'Không tìm thấy trận đấu',
      });
      expect(ack.success, isFalse);
      expect(ack.message, 'Không tìm thấy trận đấu');
    });

    test('kiểu cb(null, result) là thành công và giữ result', () {
      final SocketAck ack = SocketAck.fromRaw(<dynamic>[
        null,
        <String, dynamic>{'success': true, 'message': 'Cập nhật thành công'},
      ]);
      expect(ack.success, isTrue);
      expect(ack.message, 'Cập nhật thành công');
      expect(ack.dataAsMap['success'], true);
    });

    test('kiểu cb(error, null) là thất bại', () {
      final SocketAck ack = SocketAck.fromRaw(<dynamic>[
        <String, dynamic>{'message': 'Dữ liệu không hợp lệ'},
        null,
      ]);
      expect(ack.success, isFalse);
      expect(ack.message, 'Dữ liệu không hợp lệ');
    });

    test('Error bị serialize thành {} không có cờ success', () {
      final SocketAck ack = SocketAck.fromRaw(<String, dynamic>{});
      expect(ack.dataAsMap['success'], isNull);
    });
  });
}
