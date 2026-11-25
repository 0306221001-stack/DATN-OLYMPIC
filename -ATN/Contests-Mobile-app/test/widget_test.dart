import 'package:contests_mobile_app/core/router/auth_guard.dart';
import 'package:contests_mobile_app/core/router/app_routes.dart';
import 'package:contests_mobile_app/features/auth/domain/auth_user.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('resolveAuthRedirect', () {
    test('khách chưa đăng nhập bị đưa về màn đăng nhập', () {
      final String? target = resolveAuthRedirect(
        status: SessionStatus.unauthenticated,
        user: null,
        location: AppRoutes.studentDashboard,
      );
      expect(target, AppRoutes.login);
    });

    test('đang khôi phục phiên thì ở lại splash', () {
      final String? target = resolveAuthRedirect(
        status: SessionStatus.restoring,
        user: null,
        location: AppRoutes.login,
      );
      expect(target, AppRoutes.splash);
    });

    test('homeRouteFor trả về trang đúng theo vai trò', () {
      expect(homeRouteFor(UserRole.student), AppRoutes.studentDashboard);
      expect(homeRouteFor(UserRole.judge), AppRoutes.judgeContests);
    });
  });
}
