/// Toàn bộ đường dẫn của app. Giữ nguyên cấu trúc đường dẫn của web để dễ đối
/// chiếu với Frontend hiện có.
class AppRoutes {
  const AppRoutes._();

  // Khởi động & xác thực (công khai)
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/student/register';
  static const String forgotPassword = '/forgot-password';

  // Thí sinh
  static const String studentDashboard = '/student/dashboard';
  static const String studentMatch = '/student/match/:matchSlug';

  // Trọng tài
  static const String judgeContests = '/cuoc-thi';
  static const String judgeMatches = '/cuoc-thi/:contestId/tran-dau';
  static const String judgeMatchControl = '/trong-tai/tran-dau/:match';

  // Dùng chung cho mọi tài khoản đã đăng nhập
  static const String profile = '/account/profile';

  // ---------------------------------------------------------------------------
  // Dựng đường dẫn có tham số
  // ---------------------------------------------------------------------------

  static String studentMatchPath(String matchSlug) =>
      '/student/match/${Uri.encodeComponent(matchSlug)}';

  static String judgeMatchesPath(int contestId) =>
      '/cuoc-thi/$contestId/tran-dau';

  static String judgeMatchControlPath(String matchSlug) =>
      '/trong-tai/tran-dau/${Uri.encodeComponent(matchSlug)}';

  // ---------------------------------------------------------------------------
  // Phân loại đường dẫn (dùng cho Auth Guard)
  // ---------------------------------------------------------------------------

  static const List<String> _authPages = <String>[
    login,
    register,
    forgotPassword,
  ];

  /// Màn hình dành cho người CHƯA đăng nhập (đăng nhập, đăng ký, quên mật khẩu).
  static bool isAuthPage(String path) => _authPages.contains(path);

  /// Khu vực chỉ dành cho Thí sinh. Trang đăng ký được loại trừ vì công khai.
  static bool isStudentArea(String path) =>
      !isAuthPage(path) && _hasPrefix(path, '/student');

  /// Khu vực chỉ dành cho Trọng tài.
  static bool isJudgeArea(String path) =>
      _hasPrefix(path, '/cuoc-thi') || _hasPrefix(path, '/trong-tai');

  static bool _hasPrefix(String path, String prefix) =>
      path == prefix || path.startsWith('$prefix/');
}
