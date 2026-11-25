/// Một lớp học trong danh sách chọn khi đăng ký, lấy từ
/// `GET /api/class/list-with-school`.
class ClassOption {
  const ClassOption({
    required this.id,
    required this.name,
    required this.schoolName,
  });

  final int id;
  final String name;
  final String schoolName;

  /// Nhãn hiển thị: "Lớp - Trường".
  String get label => schoolName.isEmpty ? name : '$name - $schoolName';

  /// Đọc một phần tử của danh sách lớp. Trả về `null` nếu thiếu `id` hoặc
  /// `name` để bỏ qua dữ liệu hỏng thay vì làm hỏng cả danh sách.
  static ClassOption? tryFromJson(Object? json) {
    if (json is! Map) {
      return null;
    }

    final Object? rawId = json['id'];
    final int? id = rawId is int
        ? rawId
        : rawId is num
            ? rawId.toInt()
            : int.tryParse('$rawId');
    final Object? rawName = json['name'];
    if (id == null || rawName is! String || rawName.trim().isEmpty) {
      return null;
    }

    final Object? school = json['school'];
    String schoolName = '';
    if (school is Map && school['name'] is String) {
      schoolName = (school['name'] as String).trim();
    }

    return ClassOption(
      id: id,
      name: rawName.trim(),
      schoolName: schoolName,
    );
  }
}
