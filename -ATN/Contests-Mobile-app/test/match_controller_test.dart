import 'dart:async';

import 'package:contests_mobile_app/core/network/api_client.dart';
import 'package:contests_mobile_app/core/network/socket_service.dart';
import 'package:contests_mobile_app/core/router/app_routes.dart';
import 'package:contests_mobile_app/core/router/auth_guard.dart';
import 'package:contests_mobile_app/features/auth/data/auth_repository.dart';
import 'package:contests_mobile_app/features/auth/domain/auth_user.dart';
import 'package:contests_mobile_app/features/match/data/match_repository.dart';
import 'package:contests_mobile_app/features/match/data/match_socket_gateway.dart';
import 'package:contests_mobile_app/features/match/domain/match_event.dart';
import 'package:contests_mobile_app/features/match/domain/match_models.dart';
import 'package:contests_mobile_app/features/match/domain/match_snapshot.dart';
import 'package:contests_mobile_app/features/match/presentation/match_controller.dart';
import 'package:contests_mobile_app/features/match/presentation/waiting_room_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const String slug = 'tran-2';

const QuestionPayload question1 = QuestionPayload(
  id: 16,
  order: 1,
  content: 'Đạo hàm của hàm số y = x² là?',
  questionType: 'multiple_choice',
  options: <String>['x', '2x', 'x²', '2x²'],
  defaultTime: 60,
  score: 20,
);

const QuestionPayload question2 = QuestionPayload(
  id: 17,
  order: 2,
  content: 'Nguyên hàm của 2x là?',
  questionType: 'multiple_choice',
  options: <String>['x²', '2', 'x', '2x²'],
  defaultTime: 60,
  score: 20,
);

class FakeConnection implements SocketConnection {
  final StreamController<SocketConnectionState> states =
      StreamController<SocketConnectionState>.broadcast();

  @override
  SocketConnectionState get state => SocketConnectionState.connected;

  @override
  Stream<SocketConnectionState> get stateStream => states.stream;

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class FakeGateway implements MatchSocketGateway {
  final FakeConnection fakeConnection = FakeConnection();
  final StreamController<MatchEvent> events =
      StreamController<MatchEvent>.broadcast();

  MatchSnapshot snapshot = const MatchSnapshot(
    matchId: 2,
    matchName: 'Vòng loại - Trận 2',
    status: 'ongoing',
    currentQuestion: 0,
    remainingTime: 0,
    contestantStatus: ContestantPlayStatus.playing,
    answeredOrders: <int>{},
  );
  QuestionPayload? questionToRestore;
  int confirmStartCalls = 0;
  int leaveCalls = 0;

  @override
  SocketConnection get connection => fakeConnection;

  @override
  Future<void> ensureConnected({
    Duration timeout = const Duration(seconds: 12),
  }) async {}

  @override
  Future<void> joinRooms({
    required String matchSlug,
    required int matchId,
  }) async {}

  @override
  void leaveRooms({required String matchSlug, required int matchId}) {
    leaveCalls++;
  }

  int reconnectCalls = 0;

  @override
  Future<void> reconnectIfNeeded() async {
    reconnectCalls++;
  }

  @override
  Future<MatchSnapshot> fetchSnapshot() async => snapshot;

  @override
  Future<QuestionPayload> fetchQuestion({
    required int matchId,
    required int questionOrder,
    required int fallbackTime,
  }) async {
    return questionToRestore ?? question1;
  }

  @override
  void confirmStart({required int contestantId, required int matchId}) {
    confirmStartCalls++;
  }

  @override
  Stream<MatchEvent> watch({
    required String matchSlug,
    required int matchId,
  }) {
    return events.stream;
  }

  @override
  Stream<MatchStartSignal> watchStarts() =>
      const Stream<MatchStartSignal>.empty();
}

class FakeRepository implements MatchRepository {
  final List<String> submitted = <String>[];
  final List<int> banCounts = <int>[];
  Object? banError;
  int? registrationNumber = 5;
  AnswerResult result = const AnswerResult(
    isCorrect: true,
    eliminated: false,
    score: 20,
    questionOrder: 1,
  );

  @override
  Future<List<MatchSummary>> refreshMatches() async => <MatchSummary>[];

  @override
  Future<int?> fetchRegistrationNumber({
    required int contestantId,
    required int matchId,
  }) async {
    return registrationNumber;
  }

  @override
  Future<AnswerResult> submitAnswer({
    required int matchId,
    required int questionOrder,
    required String answer,
  }) async {
    submitted.add(answer);
    return result;
  }

  @override
  Future<void> banContestant({
    required int matchId,
    required int violationCount,
  }) async {
    banCounts.add(violationCount);
    final Object? error = banError;
    if (error != null) {
      throw error;
    }
  }
}

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository(this._user);

  final AuthUser _user;
  final ValueNotifier<AuthUser?> notifier = ValueNotifier<AuthUser?>(null);

  @override
  ValueListenable<AuthUser?> get userListenable => notifier;

  @override
  AuthUser? get currentUser => _user;

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

const AuthUser student = AuthUser(
  id: 5,
  username: 'student_10104',
  email: 'student_10104@school.edu.vn',
  role: UserRole.student,
  isActive: true,
  student: StudentProfile(
    contestant: ContestantInfo(
      id: 1,
      fullName: 'Học sinh 4',
      studentCode: '10104',
      contestId: 1,
    ),
    contest: ContestInfo(id: 1, name: 'Tin học trẻ', slug: 'tin-hoc-tre'),
    matches: <MatchSummary>[
      MatchSummary(
        id: 2,
        name: 'Vòng loại - Trận 2',
        slug: slug,
        status: 'ongoing',
        currentQuestion: 1,
      ),
    ],
  ),
);

class Harness {
  Harness({
    FakeGateway? gateway,
    FakeRepository? repository,
  })  : gateway = gateway ?? FakeGateway(),
        repository = repository ?? FakeRepository() {
    container = ProviderContainer(
      overrides: <Override>[
        matchSocketGatewayProvider.overrideWithValue(this.gateway),
        matchRepositoryProvider.overrideWithValue(this.repository),
        authSessionControllerProvider.overrideWithValue(
          AuthSessionController(FakeAuthRepository(student)),
        ),
      ],
    );
    subscription = container.listen<MatchLiveState>(
      matchControllerProvider(slug),
      (MatchLiveState? previous, MatchLiveState next) {},
    );
  }

  final FakeGateway gateway;
  final FakeRepository repository;
  late final ProviderContainer container;
  late final ProviderSubscription<MatchLiveState> subscription;

  MatchLiveState get state => container.read(matchControllerProvider(slug));
  MatchController get controller =>
      container.read(matchControllerProvider(slug).notifier);

  void dispose() {
    container.dispose();
    unawaited(gateway.events.close());
  }
}

Future<void> settle(WidgetTester tester) async {
  for (int i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 1));
  }
}

/// Giả lập nút Back của Android.
Future<void> pressSystemBack(WidgetTester tester) async {
  await tester.binding.defaultBinaryMessenger.handlePlatformMessage(
    'flutter/navigation',
    const JSONMethodCodec().encodeMethodCall(const MethodCall('popRoute')),
    (_) {},
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('vào phòng xong thì sẵn sàng ở trạng thái chờ', (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    expect(harness.state.isLoading, isFalse);
    expect(harness.state.loadError, isNull);
    expect(harness.state.phase, MatchPhase.waiting);
    expect(harness.state.matchName, 'Vòng loại - Trận 2');
    expect(harness.state.registrationNumber, 5);

    harness.dispose();
    expect(harness.gateway.leaveCalls, 1);
  });

  testWidgets('hiện câu hỏi nhưng đồng hồ chưa chạy khi Admin chưa Play',
      (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events.add(
      const QuestionShownEvent(question: question1, remainingTime: 60),
    );
    await settle(tester);

    expect(harness.state.phase, MatchPhase.running);
    expect(harness.state.question?.order, 1);
    expect(harness.state.isTimerActive, isFalse);

    await tester.pump(const Duration(seconds: 5));
    expect(harness.state.remainingTime, 60);
    expect(harness.state.timeIsUp, isFalse);
    expect(harness.repository.submitted, isEmpty);

    harness.dispose();
  });

  testWidgets('đồng hồ giảm dần khi server báo đang chạy', (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(
            remainingTime: 10, isActive: true, isPaused: false),
      );
    await settle(tester);
    expect(harness.state.remainingTime, 10);

    await tester.pump(const Duration(seconds: 3));
    expect(harness.state.remainingTime, 7);

    harness.gateway.events.add(
      const TimerTickEvent(remainingTime: 7, isActive: true, isPaused: true),
    );
    await settle(tester);
    await tester.pump(const Duration(seconds: 3));
    expect(harness.state.remainingTime, 7);

    harness.dispose();
  });

  testWidgets('hết giờ mà chưa chọn thì tự nộp "không chọn đáp án"',
      (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(remainingTime: 2, isActive: true, isPaused: false),
      );
    await settle(tester);

    await tester.pump(const Duration(seconds: 2));
    await settle(tester);

    expect(harness.state.timeIsUp, isTrue);
    expect(harness.repository.submitted, <String>[noAnswerPlaceholder]);

    harness.dispose();
  });

  testWidgets('chọn đáp án và nộp: kết quả bị ẩn cho tới khi hết giờ',
      (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(
            remainingTime: 30, isActive: true, isPaused: false),
      );
    await settle(tester);

    harness.controller.selectAnswer('2x');
    await harness.controller.submit();
    await settle(tester);

    expect(harness.repository.submitted, <String>['2x']);
    expect(harness.state.hasSubmitted, isTrue);
    expect(harness.state.canShowResult, isFalse);

    harness.gateway.events.add(const TimeUpEvent());
    await settle(tester);

    expect(harness.state.canShowResult, isTrue);
    expect(harness.state.result?.isCorrect, isTrue);
    // Đã nộp rồi thì hết giờ không nộp thêm lần nữa.
    expect(harness.repository.submitted.length, 1);

    harness.dispose();
  });

  testWidgets('nộp sai: chỉ công bố bị loại sau khi hết giờ', (tester) async {
    final FakeRepository repository = FakeRepository()
      ..result = const AnswerResult(
        isCorrect: false,
        eliminated: true,
        score: 0,
        questionOrder: 1,
        correctAnswer: '2x',
      );
    final Harness harness = Harness(repository: repository);
    await settle(tester);

    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(
            remainingTime: 30, isActive: true, isPaused: false),
      );
    await settle(tester);

    harness.controller.selectAnswer('x');
    await harness.controller.submit();
    await settle(tester);
    expect(harness.state.status, ContestantPlayStatus.playing);

    harness.gateway.events.add(const TimeUpEvent());
    await settle(tester);
    expect(harness.state.status, ContestantPlayStatus.eliminated);

    harness.dispose();
  });

  testWidgets('không cho nộp khi chưa chọn đáp án', (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(
            remainingTime: 30, isActive: true, isPaused: false),
      );
    await settle(tester);

    await harness.controller.submit();
    expect(harness.repository.submitted, isEmpty);
    expect(harness.state.submitError, isNotNull);

    harness.dispose();
  });

  testWidgets('vào muộn với trạng thái not_started thì tự xác nhận',
      (tester) async {
    final FakeGateway gateway = FakeGateway()
      ..snapshot = const MatchSnapshot(
        matchId: 2,
        matchName: 'Vòng loại - Trận 2',
        status: 'ongoing',
        currentQuestion: 1,
        remainingTime: 0,
        contestantStatus: ContestantPlayStatus.playing,
        answeredOrders: <int>{},
        contestantNotStarted: true,
      );
    final Harness harness = Harness(gateway: gateway);
    await settle(tester);

    expect(gateway.confirmStartCalls, 1);
    // Đồng hồ = 0 nên chưa lộ câu hỏi.
    expect(harness.state.phase, MatchPhase.waiting);

    harness.dispose();
  });

  testWidgets('không gọi lại confirmStart cho thí sinh đã bị loại',
      (tester) async {
    final FakeGateway gateway = FakeGateway()
      ..snapshot = const MatchSnapshot(
        matchId: 2,
        matchName: 'Vòng loại - Trận 2',
        status: 'ongoing',
        currentQuestion: 1,
        remainingTime: 0,
        contestantStatus: ContestantPlayStatus.eliminated,
        answeredOrders: <int>{1},
      );
    final Harness harness = Harness(gateway: gateway);
    await settle(tester);

    expect(gateway.confirmStartCalls, 0);
    expect(harness.state.status, ContestantPlayStatus.eliminated);

    harness.dispose();
  });

  testWidgets('không dựng câu hỏi khôi phục thiếu phương án khi chưa rõ loại câu',
      (tester) async {
    final FakeGateway gateway = FakeGateway()
      ..snapshot = const MatchSnapshot(
        matchId: 2,
        matchName: 'Vòng loại - Trận 2',
        status: 'ongoing',
        currentQuestion: 1,
        remainingTime: 30,
        contestantStatus: ContestantPlayStatus.playing,
        answeredOrders: <int>{},
      )
      // Backend cũ không gửi loại câu.
      ..questionToRestore = const QuestionPayload(
        id: 16,
        order: 1,
        content: 'Thiếu phương án',
        questionType: '',
        options: <String>[],
        defaultTime: 60,
        score: 1,
      );
    final Harness harness = Harness(gateway: gateway);
    await settle(tester);

    expect(harness.state.phase, MatchPhase.waiting);
    expect(harness.state.question, isNull);

    harness.dispose();
  });

  testWidgets('khôi phục câu tự luận khi vào phòng giữa chừng', (tester) async {
    final FakeGateway gateway = FakeGateway()
      ..snapshot = const MatchSnapshot(
        matchId: 2,
        matchName: 'Vòng loại - Trận 2',
        status: 'ongoing',
        currentQuestion: 3,
        remainingTime: 30,
        contestantStatus: ContestantPlayStatus.playing,
        answeredOrders: <int>{},
      )
      ..questionToRestore = const QuestionPayload(
        id: 20,
        order: 3,
        content: 'Tính tích phân của 2x',
        questionType: 'essay',
        options: <String>[],
        defaultTime: 60,
        score: 1,
      );
    final Harness harness = Harness(gateway: gateway);
    await settle(tester);

    expect(harness.state.phase, MatchPhase.running);
    expect(harness.state.question?.order, 3);
    expect(harness.state.question?.isEssay, isTrue);

    harness.dispose();
  });

  testWidgets('khôi phục câu hỏi đầy đủ khi đồng hồ còn chạy', (tester) async {
    final FakeGateway gateway = FakeGateway()
      ..snapshot = const MatchSnapshot(
        matchId: 2,
        matchName: 'Vòng loại - Trận 2',
        status: 'ongoing',
        currentQuestion: 1,
        remainingTime: 30,
        contestantStatus: ContestantPlayStatus.playing,
        answeredOrders: <int>{1},
      );
    final Harness harness = Harness(gateway: gateway);
    await settle(tester);

    expect(harness.state.phase, MatchPhase.running);
    expect(harness.state.question?.order, 1);
    expect(harness.state.hasSubmitted, isTrue);
    expect(harness.state.isTimerActive, isFalse);

    harness.dispose();
  });

  group('cứu trợ ngay trên màn hình câu hỏi', () {
    // Thí sinh trong Harness có id 1 và số báo danh 5.
    Future<Harness> eliminatedAtQuestion1(
      WidgetTester tester, {
      FakeRepository? repository,
    }) async {
      final FakeRepository wrong = (repository ?? FakeRepository())
        ..result = const AnswerResult(
          isCorrect: false,
          eliminated: true,
          score: 0,
          questionOrder: 1,
        );
      final Harness harness = Harness(repository: wrong);
      await settle(tester);
      harness.gateway.events
        ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
        ..add(
          const TimerTickEvent(
              remainingTime: 30, isActive: true, isPaused: false),
        );
      await settle(tester);
      harness.controller.selectAnswer('x');
      await harness.controller.submit();
      harness.gateway.events.add(const TimeUpEvent());
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.eliminated);
      return harness;
    }

    MatchSnapshot serverSays(ContestantPlayStatus status) => MatchSnapshot(
          matchId: 2,
          matchName: 'Vòng loại - Trận 2',
          status: 'ongoing',
          currentQuestion: 2,
          remainingTime: 60,
          contestantStatus: status,
          answeredOrders: const <int>{1},
        );

    testWidgets('được cứu thì đổi trạng thái ngay, câu sau thi tiếp',
        (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      harness.gateway.events.add(
        const RescuedEvent(
          contestantIds: <int>[1],
          registrationNumbers: <int>[5],
          message: 'Bạn đã được cứu trợ!',
        ),
      );
      await settle(tester);
      expect(harness.state.phase, MatchPhase.running);
      expect(harness.state.status, ContestantPlayStatus.rescued);
      expect(harness.state.notice, 'Bạn đã được cứu trợ!');

      harness.gateway.events
          .add(const QuestionShownEvent(question: question2, remainingTime: 60));
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.playing);
      expect(harness.state.canAnswer, isTrue);

      harness.dispose();
    });

    testWidgets('đối chiếu theo id thí sinh, không nhầm với số báo danh',
        (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      // Người được cứu có id 5 (trùng số báo danh của thí sinh này) và số
      // báo danh 1 (trùng id của thí sinh này).
      harness.gateway.events.add(
        const RescuedEvent(
          contestantIds: <int>[5],
          registrationNumbers: <int>[1],
        ),
      );
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.eliminated);

      harness.dispose();
    });

    testWidgets('Backend cũ chỉ gửi số báo danh vẫn nhận ra', (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      harness.gateway.events
          .add(const RescuedEvent(registrationNumbers: <int>[99]));
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.eliminated);

      harness.gateway.events.add(
        const RescuedEvent(
          registrationNumbers: <int>[5],
          message: 'Bạn được cứu',
        ),
      );
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.rescued);
      expect(harness.state.notice, 'Bạn được cứu');

      harness.dispose();
    });

    testWidgets('sự kiện không có ai thì không cứu nhầm', (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      harness.gateway.events.add(const RescuedEvent());
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.eliminated);

      harness.dispose();
    });

    testWidgets('chưa tải được số báo danh thì hỏi lại server', (tester) async {
      final Harness harness = await eliminatedAtQuestion1(
        tester,
        repository: FakeRepository()..registrationNumber = null,
      );
      expect(harness.state.registrationNumber, isNull);

      harness.gateway.snapshot = serverSays(ContestantPlayStatus.rescued);
      harness.gateway.events
          .add(const RescuedEvent(registrationNumbers: <int>[5]));
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.rescued);

      harness.dispose();
    });

    testWidgets('lỡ sự kiện cứu trợ thì sang câu mới vẫn được thi',
        (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      // Server: đã được cứu và đã chuyển sang câu 2 (rescued -> in_progress).
      harness.gateway.snapshot = serverSays(ContestantPlayStatus.playing);
      harness.gateway.events
          .add(const QuestionShownEvent(question: question2, remainingTime: 60));
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.rescued);
      expect(harness.state.canAnswer, isTrue);

      harness.dispose();
    });

    testWidgets('server vẫn báo bị loại thì giữ nguyên ở câu mới',
        (tester) async {
      final Harness harness = await eliminatedAtQuestion1(tester);

      harness.gateway.snapshot = serverSays(ContestantPlayStatus.eliminated);
      harness.gateway.events
          .add(const QuestionShownEvent(question: question2, remainingTime: 60));
      await settle(tester);
      expect(harness.state.status, ContestantPlayStatus.eliminated);
      expect(harness.state.canAnswer, isFalse);

      harness.dispose();
    });
  });

  testWidgets('trận kết thúc thì chuyển sang màn hoàn thành bài thi',
      (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.gateway.events.add(const MatchEndedEvent());
    await settle(tester);

    expect(harness.state.phase, MatchPhase.ended);

    harness.dispose();
  });

  testWidgets('màn hoàn thành bài thi có nút về trang chủ', (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    final GoRouter router = GoRouter(
      initialLocation: AppRoutes.studentMatchPath(slug),
      routes: <RouteBase>[
        GoRoute(
          path: AppRoutes.studentDashboard,
          builder: (BuildContext context, GoRouterState state) =>
              const Scaffold(body: Text('Trang chủ thí sinh')),
        ),
        GoRoute(
          path: AppRoutes.studentMatch,
          builder: (BuildContext context, GoRouterState state) =>
              WaitingRoomScreen(matchSlug: state.pathParameters['matchSlug']!),
        ),
      ],
    );
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: harness.container,
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await settle(tester);
    expect(find.text('Đang chờ câu hỏi'), findsOneWidget);

    harness.gateway.events.add(const MatchEndedEvent());
    await settle(tester);
    expect(find.text('Hoàn thành bài thi'), findsOneWidget);
    expect(find.text('Số báo danh'), findsOneWidget);

    await tester.tap(find.text('Về trang chủ'));
    await tester.pumpAndSettle();
    expect(find.text('Trang chủ thí sinh'), findsOneWidget);

    router.dispose();
    harness.dispose();
  });

  group('không rời phòng thi khi trận đang diễn ra', () {
    MatchSnapshot matchIs(String status) => MatchSnapshot(
          matchId: 2,
          matchName: 'Vòng loại - Trận 2',
          status: status,
          currentQuestion: 0,
          remainingTime: 0,
          contestantStatus: ContestantPlayStatus.playing,
          answeredOrders: const <int>{},
        );

    testWidgets('chưa bắt đầu thì rời được, bắt đầu rồi thì không',
        (tester) async {
      final Harness harness =
          Harness(gateway: FakeGateway()..snapshot = matchIs('upcoming'));
      await settle(tester);
      expect(harness.state.mustStay, isFalse);

      harness.gateway.events
          .add(const MatchStartedEvent(matchName: 'Vòng loại - Trận 2'));
      await settle(tester);
      expect(harness.state.mustStay, isTrue);

      harness.gateway.events.add(const MatchEndedEvent());
      await settle(tester);
      expect(harness.state.mustStay, isFalse);

      harness.dispose();
    });

    testWidgets('vào giữa trận đang diễn ra cũng phải ở lại', (tester) async {
      final Harness harness = Harness();
      await settle(tester);

      expect(harness.state.matchInProgress, isTrue);
      expect(harness.state.mustStay, isTrue);

      harness.dispose();
    });

    testWidgets('không có số báo danh (không thi trận này) thì vẫn rời được',
        (tester) async {
      final Harness harness = Harness(
        repository: FakeRepository()..registrationNumber = null,
      );
      await settle(tester);

      expect(harness.state.matchInProgress, isTrue);
      expect(harness.state.mustStay, isFalse);

      harness.dispose();
    });

    testWidgets('ẩn nút quay lại và chặn nút Back của hệ thống',
        (tester) async {
      final Harness harness =
          Harness(gateway: FakeGateway()..snapshot = matchIs('upcoming'));
      await settle(tester);

      final GoRouter router = GoRouter(
        initialLocation: AppRoutes.studentDashboard,
        routes: <RouteBase>[
          GoRoute(
            path: AppRoutes.studentDashboard,
            builder: (BuildContext context, GoRouterState state) =>
                const Scaffold(body: Text('Trang chủ thí sinh')),
          ),
          GoRoute(
            path: AppRoutes.studentMatch,
            builder: (BuildContext context, GoRouterState state) =>
                WaitingRoomScreen(
                    matchSlug: state.pathParameters['matchSlug']!),
          ),
        ],
      );
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: harness.container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      unawaited(router.push(AppRoutes.studentMatchPath(slug)));
      await tester.pumpAndSettle();
      // Trận chưa bắt đầu: lỡ vào nhầm phòng vẫn quay lại được.
      expect(find.byTooltip('Quay lại'), findsOneWidget);

      harness.gateway.events
          .add(const MatchStartedEvent(matchName: 'Vòng loại - Trận 2'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Quay lại'), findsNothing);

      await pressSystemBack(tester);
      expect(find.text('Đang chờ câu hỏi'), findsOneWidget);
      expect(
        find.text('Trận đấu đang diễn ra, bạn không thể rời phòng thi.'),
        findsOneWidget,
      );

      // Trận kết thúc: lối ra là nút "Về trang chủ", Back của hệ thống mở lại.
      harness.gateway.events.add(const MatchEndedEvent());
      await tester.pumpAndSettle();
      expect(find.text('Hoàn thành bài thi'), findsOneWidget);
      expect(find.byTooltip('Quay lại'), findsNothing);

      await pressSystemBack(tester);
      expect(find.text('Trang chủ thí sinh'), findsOneWidget);

      router.dispose();
      harness.dispose();
    });
  });

  testWidgets('màn hoàn thành có tổng kết, bỏ qua nhịp đồng hồ còn sót',
      (tester) async {
    final Harness harness = Harness();
    await settle(tester);
    harness.gateway.events
      ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
      ..add(
        const TimerTickEvent(remainingTime: 30, isActive: true, isPaused: false),
      );
    await settle(tester);

    harness.gateway.snapshot = const MatchSnapshot(
      matchId: 2,
      matchName: 'Vòng loại - Trận 2',
      status: 'finished',
      currentQuestion: 3,
      remainingTime: 0,
      contestantStatus: ContestantPlayStatus.playing,
      answeredOrders: <int>{1, 2, 3},
      correctCount: 2,
    );
    harness.gateway.events.add(const MatchEndedEvent());
    await settle(tester);
    expect(harness.state.phase, MatchPhase.ended);
    expect(harness.state.answeredCount, 3);
    expect(harness.state.correctCount, 2);

    harness.gateway.events
      ..add(
        const TimerTickEvent(remainingTime: 5, isActive: true, isPaused: false),
      )
      ..add(const TimeUpEvent());
    await settle(tester);
    expect(harness.state.phase, MatchPhase.ended);
    expect(harness.state.timeIsUp, isFalse);
    expect(harness.repository.submitted, isEmpty);

    harness.dispose();
  });

  group('chống gian lận khi rời ứng dụng', () {
    Future<Harness> startQuestion(
      WidgetTester tester, {
      FakeRepository? repository,
    }) async {
      final Harness harness = Harness(repository: repository);
      await settle(tester);
      harness.gateway.events
        ..add(const QuestionShownEvent(question: question1, remainingTime: 60))
        ..add(
          const TimerTickEvent(
              remainingTime: 30, isActive: true, isPaused: false),
        );
      await settle(tester);
      return harness;
    }

    testWidgets('rời app một hai lần: cảnh báo, chưa bị cấm', (tester) async {
      final Harness harness = await startQuestion(tester);

      harness.controller.onAppLeft();
      expect(harness.state.violationCount, 1);
      expect(harness.state.status, ContestantPlayStatus.playing);

      harness.controller.onAppResumed();
      harness.controller.onAppLeft();
      expect(harness.state.violationCount, 2);
      expect(harness.state.status, ContestantPlayStatus.playing);
      expect(harness.repository.banCounts, isEmpty);

      harness.dispose();
    });

    testWidgets('rời liên tiếp mà chưa quay lại chỉ tính một lần',
        (tester) async {
      final Harness harness = await startQuestion(tester);

      harness.controller.onAppLeft();
      harness.controller.onAppLeft();
      harness.controller.onAppLeft();

      expect(harness.state.violationCount, 1);

      harness.dispose();
    });

    testWidgets('đủ 3 lần thì bị cấm thi và báo lên máy chủ', (tester) async {
      final Harness harness = await startQuestion(tester);

      for (int i = 0; i < maxViolations; i++) {
        harness.controller.onAppLeft();
        harness.controller.onAppResumed();
        await settle(tester);
      }

      expect(harness.state.status, ContestantPlayStatus.banned);
      expect(harness.repository.banCounts, <int>[maxViolations]);
      expect(harness.state.canAnswer, isFalse);

      // Đã bị cấm thì không gửi thêm báo cáo nào nữa.
      harness.controller.onAppLeft();
      harness.controller.onAppResumed();
      await settle(tester);
      expect(harness.repository.banCounts.length, 1);

      harness.dispose();
    });

    testWidgets('gửi báo cáo lỗi vẫn khóa thí sinh và báo cho họ',
        (tester) async {
      final FakeRepository repository = FakeRepository()
        ..banError = const ApiException(message: 'Mất mạng');
      final Harness harness =
          await startQuestion(tester, repository: repository);

      for (int i = 0; i < maxViolations; i++) {
        harness.controller.onAppLeft();
        harness.controller.onAppResumed();
        await settle(tester);
      }

      expect(harness.state.status, ContestantPlayStatus.banned);
      expect(harness.state.notice, contains('chưa gửi được báo cáo'));

      harness.dispose();
    });

    testWidgets('không giám sát khi chưa có câu hỏi', (tester) async {
      final Harness harness = Harness();
      await settle(tester);

      harness.controller.onAppLeft();

      expect(harness.state.violationCount, 0);

      harness.dispose();
    });

    testWidgets('không giám sát sau khi hết giờ', (tester) async {
      final Harness harness = await startQuestion(tester);
      harness.gateway.events.add(const TimeUpEvent());
      await settle(tester);

      harness.controller.onAppLeft();

      expect(harness.state.violationCount, 0);

      harness.dispose();
    });

    testWidgets('được cứu trợ thì gỡ lệnh cấm và xóa số lần vi phạm',
        (tester) async {
      final Harness harness = await startQuestion(tester);
      for (int i = 0; i < maxViolations; i++) {
        harness.controller.onAppLeft();
        harness.controller.onAppResumed();
        await settle(tester);
      }
      expect(harness.state.status, ContestantPlayStatus.banned);

      harness.gateway.events
          .add(const RescuedEvent(contestantIds: <int>[1]));
      await settle(tester);

      expect(harness.state.status, ContestantPlayStatus.rescued);
      expect(harness.state.violationCount, 0);

      harness.dispose();
    });
  });

  testWidgets('quay lại từ nền thì nối lại kết nối nếu cần', (tester) async {
    final Harness harness = Harness();
    await settle(tester);

    harness.controller.onAppResumed();
    await settle(tester);

    expect(harness.gateway.reconnectCalls, 1);

    harness.dispose();
  });
}
