/// Đường dẫn REST của Backend (đã nằm dưới tiền tố `/api` của `ApiClient`).
///
/// Chỉ gom các endpoint dùng cho trận đấu; các endpoint xác thực vẫn nằm
/// trong `AuthApi` / `AccountApi`.
class ApiEndpoints {
  const ApiEndpoints._();

  // --- Thí sinh ---------------------------------------------------------------
  static const String studentProfile = '/auth/profile-student';
  static const String registrationNumber = '/auth/registration-number';
  static const String submitAnswer = '/results/submit-answer';
  static const String banContestant = '/results/ban-contestant';

  // --- Trọng tài --------------------------------------------------------------
  static const String judgeContests = '/contest/list-contest/judge';

  /// `GET /match/judge/:contestId`.
  static String judgeMatches(int contestId) => '/match/judge/$contestId';

  /// `GET /match/:slug/matchInfo`.
  static String matchInfo(String slug) =>
      '/match/${Uri.encodeComponent(slug)}/matchInfo';

  /// `GET /match/:slug/CurrentQuestion`.
  static String matchCurrentQuestion(String slug) =>
      '/match/${Uri.encodeComponent(slug)}/CurrentQuestion';

  /// `GET /group-divisions/contestant/judge/:slug`.
  static String judgeContestants(String slug) =>
      '/group-divisions/contestant/judge/${Uri.encodeComponent(slug)}';

  /// `GET /group/match/:slug`.
  static String matchGroups(String slug) =>
      '/group/match/${Uri.encodeComponent(slug)}';
}
