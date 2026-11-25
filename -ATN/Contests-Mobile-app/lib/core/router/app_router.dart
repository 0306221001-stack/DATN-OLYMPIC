import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/domain/auth_user.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/judge/presentation/judge_lists_screens.dart';
import '../../features/judge/presentation/judge_match_control_screen.dart';
import '../../features/match/presentation/student_dashboard_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/match/presentation/waiting_room_screen.dart';
import 'app_routes.dart';
import 'auth_guard.dart';

/// Provider `GoRouter` của toàn app.
///
/// Auth Guard hoạt động qua `redirect` + `refreshListenable`: mỗi khi trạng
/// thái phiên đổi (đăng nhập, đăng xuất, phiên hết hạn, đăng nhập nơi khác),
/// router tự đánh giá lại và đưa người dùng đến đúng màn hình.
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((ref) {
  final AuthSessionController session =
      ref.watch(authSessionControllerProvider);

  final GoRouter router = GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: kDebugMode,
    refreshListenable: session,
    redirect: (BuildContext context, GoRouterState state) {
      return resolveAuthRedirect(
        status: session.status,
        user: session.user,
        location: state.uri.toString(),
      );
    },
    errorBuilder: (BuildContext context, GoRouterState state) {
      return const _NotFoundScreen();
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/',
        redirect: (BuildContext context, GoRouterState state) =>
            AppRoutes.splash,
      ),
      GoRoute(
        path: AppRoutes.splash,
        builder: (BuildContext context, GoRouterState state) =>
            const SplashScreen(),
      ),

      // --- Công khai -------------------------------------------------------
      GoRoute(
        path: AppRoutes.login,
        builder: (BuildContext context, GoRouterState state) {
          final bool isJudge = state.uri.queryParameters['role'] == 'judge';
          return LoginScreen(
            initialRole: isJudge ? UserRole.judge : UserRole.student,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (BuildContext context, GoRouterState state) =>
            const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (BuildContext context, GoRouterState state) =>
            const ForgotPasswordScreen(),
      ),

      // --- Thí sinh --------------------------------------------------------
      GoRoute(
        path: AppRoutes.studentDashboard,
        builder: (BuildContext context, GoRouterState state) =>
            const StudentDashboardScreen(),
      ),
      GoRoute(
        path: AppRoutes.studentMatch,
        builder: (BuildContext context, GoRouterState state) {
          return WaitingRoomScreen(
            matchSlug: state.pathParameters['matchSlug'] ?? '',
          );
        },
      ),

      // --- Trọng tài -------------------------------------------------------
      GoRoute(
        path: AppRoutes.judgeContests,
        builder: (BuildContext context, GoRouterState state) =>
            const JudgeContestListScreen(),
      ),
      GoRoute(
        path: AppRoutes.judgeMatches,
        builder: (BuildContext context, GoRouterState state) {
          return JudgeMatchListScreen(
            contestId:
                int.tryParse(state.pathParameters['contestId'] ?? '') ?? 0,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.judgeMatchControl,
        builder: (BuildContext context, GoRouterState state) {
          return JudgeMatchControlScreen(
            matchSlug: state.pathParameters['match'] ?? '',
          );
        },
      ),

      // --- Dùng chung ------------------------------------------------------
      GoRoute(
        path: AppRoutes.profile,
        builder: (BuildContext context, GoRouterState state) {
          return const ProfileScreen();
        },
      ),
    ],
  );

  ref.onDispose(router.dispose);
  return router;
});

class _NotFoundScreen extends ConsumerWidget {
  const _NotFoundScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final AuthUser? user = ref.watch(authSessionControllerProvider).user;
    final String home =
        user == null ? AppRoutes.login : homeRouteFor(user.role);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(
                  Icons.search_off_rounded,
                  size: 64,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Không tìm thấy trang',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.go(home),
                  child: const Text('Về trang chính'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
