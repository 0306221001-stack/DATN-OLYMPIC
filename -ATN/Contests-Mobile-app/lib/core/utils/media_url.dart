import '../config/env.dart';

/// Backend trả đường dẫn tương đối kiểu `/uploads/...`; ghép với địa chỉ máy
/// chủ để tải được ảnh. Giữ nguyên nếu đã là địa chỉ đầy đủ.
String? resolveMediaUrl(String? path) {
  if (path == null || path.trim().isEmpty) {
    return null;
  }
  final String value = path.trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return '${Env.serverUrl}${value.startsWith('/') ? '' : '/'}$value';
}
