import 'package:contests_mobile_app/core/config/env.dart';
import 'package:contests_mobile_app/core/router/auth_guard.dart';
import 'package:contests_mobile_app/features/auth/data/auth_repository.dart';
import 'package:contests_mobile_app/features/auth/domain/auth_user.dart';
import 'package:contests_mobile_app/features/profile/data/profile_repository.dart';
import 'package:contests_mobile_app/features/profile/domain/profile_models.dart';
import 'package:contests_mobile_app/features/profile/presentation/profile_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

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

class FakeProfileRepository implements ProfileRepository {
  @override
  Future<List<AwardItem>> fetchAwards(String contestSlug) async {
    return const <AwardItem>[
      AwardItem(name: 'Giải Ba', type: AwardType.third, winnerName: ''),
      AwardItem(
        name: 'Giải Nhất',
        type: AwardType.first,
        winnerName: 'Nguyễn Văn A',
      ),
    ];
  }

  @override
  Future<List<SponsorItem>> fetchSponsors(String contestSlug) async {
    return const <SponsorItem>[SponsorItem(name: 'Tập đoàn FPT')];
  }
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
      fullName: 'Học sinh 4 lớp 12A1',
      studentCode: '10104',
      contestId: 1,
      className: '12A1',
    ),
    contest: ContestInfo(id: 1, name: 'Tin học trẻ 2025', slug: 'tin-hoc-tre'),
    matches: <MatchSummary>[],
  ),
);

Future<void> pumpProfile(WidgetTester tester, AuthUser user) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        authSessionControllerProvider.overrideWithValue(
          AuthSessionController(FakeAuthRepository(user)),
        ),
        profileRepositoryProvider.overrideWithValue(FakeProfileRepository()),
      ],
      child: const MaterialApp(home: ProfileScreen()),
    ),
  );
  await tester.pump();
}

void main() {
  group('mô hình', () {
    test('giải thưởng: nhận diện hạng và người đạt giải', () {
      final AwardItem award = AwardItem.fromJson(<String, dynamic>{
        'name': 'Giải Nhất',
        'type': 'firstPrize',
        'fullName': 'Nguyễn Văn A',
      });
      expect(award.type, AwardType.first);
      expect(award.hasWinner, isTrue);

      final AwardItem empty = AwardItem.fromJson(<String, dynamic>{
        'name': 'Giải Ba',
        'type': 'thirdPrize',
        'fullName': 'Không có',
      });
      expect(empty.hasWinner, isFalse);
    });

    test('sắp xếp giải: giải nhất lên đầu, cùng hạng giữ thứ tự gốc', () {
      const AwardItem third = AwardItem(
        name: 'Ba',
        type: AwardType.third,
        winnerName: '',
      );
      const AwardItem firstB = AwardItem(
        name: 'Nhất B',
        type: AwardType.first,
        winnerName: 'B',
      );
      const AwardItem firstA = AwardItem(
        name: 'Nhất A',
        type: AwardType.first,
        winnerName: 'A',
      );
      final List<AwardItem> sorted =
          sortAwards(<AwardItem>[third, firstB, firstA]);
      expect(
        sorted.map((AwardItem a) => a.name),
        <String>['Nhất B', 'Nhất A', 'Ba'],
      );
    });

    test('nhà tài trợ: ghép đường dẫn ảnh với địa chỉ máy chủ', () {
      Env.useSavedServerUrl('http://10.0.0.5:3000');
      final SponsorItem sponsor = SponsorItem.fromJson(<String, dynamic>{
        'name': 'FPT',
        'logo': '/uploads/sponsors/logos/fpt-logo.png',
        'images': 'https://cdn.example.com/a.jpg',
      });
      expect(
        sponsor.logoUrl,
        'http://10.0.0.5:3000/uploads/sponsors/logos/fpt-logo.png',
      );
      expect(sponsor.imageUrl, 'https://cdn.example.com/a.jpg');
      expect(resolveMediaUrl(null), isNull);
      expect(resolveMediaUrl('  '), isNull);
      Env.useSavedServerUrl('');
    });
  });

  group('màn hình hồ sơ', () {
    testWidgets('thí sinh thấy thông tin và ba thẻ', (tester) async {
      await pumpProfile(tester, student);

      expect(find.text('Hồ sơ'), findsOneWidget);
      expect(find.text('Giải thưởng'), findsOneWidget);
      expect(find.text('Nhà tài trợ'), findsOneWidget);
      expect(find.text('Học sinh 4 lớp 12A1'), findsOneWidget);
      expect(find.text('10104'), findsOneWidget);
      expect(find.text('12A1'), findsOneWidget);
      expect(find.text('Tin học trẻ 2025'), findsOneWidget);
    });

    testWidgets('thẻ giải thưởng hiện người đạt giải', (tester) async {
      await pumpProfile(tester, student);

      await tester.tap(find.text('Giải thưởng'));
      await tester.pumpAndSettle();

      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.text('Chưa có người đạt giải'), findsOneWidget);
    });

    testWidgets('thẻ nhà tài trợ hiện tên', (tester) async {
      await pumpProfile(tester, student);

      await tester.tap(find.text('Nhà tài trợ'));
      await tester.pumpAndSettle();

      expect(find.text('Tập đoàn FPT'), findsOneWidget);
    });

    testWidgets('trọng tài chỉ thấy thông tin tài khoản', (tester) async {
      await pumpProfile(
        tester,
        const AuthUser(
          id: 199,
          username: 'judge2',
          email: 'judge2@contest.com',
          role: UserRole.judge,
          isActive: true,
        ),
      );

      expect(find.text('judge2'), findsWidgets);
      expect(find.text('Giải thưởng'), findsNothing);
      expect(find.text('Nhà tài trợ'), findsNothing);
    });
  });
}
