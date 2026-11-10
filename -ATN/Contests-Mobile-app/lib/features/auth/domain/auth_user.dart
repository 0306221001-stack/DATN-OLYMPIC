/// Vai trò người dùng theo Backend (`Role` trong Prisma).
enum UserRole {
  student,
  judge,
  admin;

  /// Đọc từ chuỗi Backend trả về (`"Student"`, `"Judge"`, `"Admin"`).
  static UserRole? tryParse(Object? value) {
    if (value is! String) {
      return null;
    }
    switch (value.trim().toLowerCase()) {
      case 'student':
        return UserRole.student;
      case 'judge':
        return UserRole.judge;
      case 'admin':
        return UserRole.admin;
      default:
        return null;
    }
  }

  String get apiValue {
    switch (this) {
      case UserRole.student:
        return 'Student';
      case UserRole.judge:
        return 'Judge';
      case UserRole.admin:
        return 'Admin';
    }
  }

  String get label {
    switch (this) {
      case UserRole.student:
        return 'Thí sinh';
      case UserRole.judge:
        return 'Trọng tài';
      case UserRole.admin:
        return 'Quản trị viên';
    }
  }
}

/// Trận đấu rút gọn trong thông tin thí sinh.
class MatchSummary {
  const MatchSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.status,
    required this.currentQuestion,
    this.remainingTime,
  });

  final int id;
  final String name;
  final String slug;
  final String status;
  final int currentQuestion;
  final int? remainingTime;

  factory MatchSummary.fromJson(Map<String, dynamic> json) {
    final int? id = _asInt(json['id']);
    if (id == null) {
      throw const FormatException('Trận đấu thiếu id.');
    }
    return MatchSummary(
      id: id,
      name: _asString(json['name']) ?? '',
      slug: _asString(json['slug']) ?? '',
      status: _asString(json['status']) ?? '',
      currentQuestion: _asInt(json['currentQuestion']) ?? 0,
      remainingTime: _asInt(json['remainingTime']),
    );
  }
}

/// Thông tin thí sinh (bản ghi `Contestant` + `Student`).
class ContestantInfo {
  const ContestantInfo({
    required this.id,
    required this.fullName,
    required this.studentCode,
    required this.contestId,
    this.className,
  });

  final int id;
  final String fullName;
  final String studentCode;
  final int contestId;
  final String? className;

  factory ContestantInfo.fromJson(Map<String, dynamic> json) {
    final int? id = _asInt(json['id']);
    if (id == null) {
      throw const FormatException('Thí sinh thiếu id.');
    }
    return ContestantInfo(
      id: id,
      fullName: _asString(json['fullName']) ?? '',
      studentCode: _asString(json['studentCode']) ?? '',
      contestId: _asInt(json['contestId']) ?? 0,
      className: _asString(json['class']),
    );
  }
}

/// Cuộc thi mà thí sinh đang tham gia.
class ContestInfo {
  const ContestInfo({
    required this.id,
    required this.name,
    required this.slug,
  });

  final int id;
  final String name;
  final String slug;

  factory ContestInfo.fromJson(Map<String, dynamic> json) {
    final int? id = _asInt(json['id']);
    if (id == null) {
      throw const FormatException('Cuộc thi thiếu id.');
    }
    return ContestInfo(
      id: id,
      name: _asString(json['name']) ?? '',
      slug: _asString(json['slug']) ?? '',
    );
  }
}

/// Dữ liệu từ `GET /api/auth/profile-student`.
class StudentProfile {
  const StudentProfile({
    required this.contestant,
    required this.contest,
    required this.matches,
    this.registrationNumber,
  });

  final ContestantInfo contestant;
  final ContestInfo contest;
  final List<MatchSummary> matches;

  /// Số báo danh của thí sinh trong trận đầu tiên (nếu Backend trả về).
  final int? registrationNumber;

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? contestantJson = _asMap(json['contestant']);
    final Map<String, dynamic>? contestJson = _asMap(json['contest']);

    if (contestantJson == null || contestJson == null) {
      throw const FormatException('Thiếu thông tin thí sinh hoặc cuộc thi.');
    }

    final dynamic rawMatches = json['matches'];
    final List<MatchSummary> matches = <MatchSummary>[];
    if (rawMatches is List) {
      for (final dynamic item in rawMatches) {
        final Map<String, dynamic>? matchJson = _asMap(item);
        if (matchJson != null) {
          matches.add(MatchSummary.fromJson(matchJson));
        }
      }
    }

    return StudentProfile(
      contestant: ContestantInfo.fromJson(contestantJson),
      contest: ContestInfo.fromJson(contestJson),
      matches: List<MatchSummary>.unmodifiable(matches),
      registrationNumber: _asInt(json['registrationNumber']) ??
          _asInt(contestantJson['registrationNumber']),
    );
  }
}

/// Người dùng đang đăng nhập.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    required this.isActive,
    this.student,
  });

  final int id;
  final String username;
  final String email;
  final UserRole role;
  final bool isActive;

  /// Chỉ có giá trị khi `role == UserRole.student`.
  final StudentProfile? student;

  bool get isStudent => role == UserRole.student;
  bool get isJudge => role == UserRole.judge;

  /// Tên hiển thị: họ tên thí sinh nếu có, ngược lại là username.
  String get displayName {
    final String? fullName = student?.contestant.fullName;
    if (fullName != null && fullName.trim().isNotEmpty) {
      return fullName;
    }
    return username;
  }

  /// Đọc từ `GET /api/auth/profile`:
  /// `{ id, username, email, isActive, role }`.
  factory AuthUser.fromProfileJson(Map<String, dynamic> json) {
    final int? id = _asInt(json['id']);
    final UserRole? role = UserRole.tryParse(json['role']);

    if (id == null || role == null) {
      throw const FormatException('Thông tin tài khoản không đầy đủ.');
    }

    return AuthUser(
      id: id,
      username: _asString(json['username']) ?? '',
      email: _asString(json['email']) ?? '',
      role: role,
      isActive: json['isActive'] != false,
    );
  }

  AuthUser copyWith({StudentProfile? student}) {
    return AuthUser(
      id: id,
      username: username,
      email: email,
      role: role,
      isActive: isActive,
      student: student ?? this.student,
    );
  }
}

// -----------------------------------------------------------------------------
// Hàm đọc dữ liệu an toàn
// -----------------------------------------------------------------------------

int? _asInt(Object? value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value);
  }
  return null;
}

String? _asString(Object? value) {
  if (value == null) {
    return null;
  }
  return value.toString();
}

Map<String, dynamic>? _asMap(Object? value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return null;
}
