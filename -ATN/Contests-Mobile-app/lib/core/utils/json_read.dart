import 'dart:convert';

/// Các hàm đọc JSON an toàn: không ném lỗi khi kiểu dữ liệu không như mong đợi.
class JsonRead {
  const JsonRead._();

  static int? asInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value.trim());
    }
    return null;
  }

  static double? asDouble(Object? value) {
    if (value is num) {
      return value.toDouble();
    }
    if (value is String) {
      return double.tryParse(value.trim());
    }
    return null;
  }

  static String? asString(Object? value) {
    if (value == null) {
      return null;
    }
    return value.toString();
  }

  static bool? asBool(Object? value) {
    if (value is bool) {
      return value;
    }
    if (value is num) {
      return value != 0;
    }
    if (value is String) {
      final String lower = value.trim().toLowerCase();
      if (lower == 'true' || lower == '1') {
        return true;
      }
      if (lower == 'false' || lower == '0') {
        return false;
      }
    }
    return null;
  }

  static Map<String, dynamic>? asMap(Object? value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return null;
  }

  /// Đọc danh sách; nếu giá trị là chuỗi JSON thì giải mã trước.
  static List<dynamic> asList(Object? value) {
    if (value is List) {
      return value;
    }
    if (value is String && value.trim().startsWith('[')) {
      try {
        final dynamic decoded = jsonDecode(value);
        if (decoded is List) {
          return decoded;
        }
      } catch (_) {
        return const <dynamic>[];
      }
    }
    return const <dynamic>[];
  }

  /// Đọc danh sách chuỗi, bỏ phần tử rỗng.
  static List<String> asStringList(Object? value) {
    final List<String> result = <String>[];
    for (final dynamic item in asList(value)) {
      final String? text = asString(item);
      if (text != null && text.trim().isNotEmpty) {
        result.add(text);
      }
    }
    return result;
  }
}
