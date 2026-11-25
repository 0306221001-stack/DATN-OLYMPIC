import 'package:contests_mobile_app/core/network/api_client.dart';
import 'package:contests_mobile_app/core/storage/token_storage.dart';
import 'package:contests_mobile_app/features/auth/data/auth_api.dart';
import 'package:contests_mobile_app/features/auth/data/auth_repository.dart';
import 'package:contests_mobile_app/features/auth/domain/auth_user.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAuthApi implements AuthApi {
  FakeAuthApi(this.studentError);

  final ApiException studentError;

  @override
  Future<AuthUser> getProfile() async => AuthUser.fromProfileJson(
        <String, dynamic>{
          'id': 1,
          'username': 'thi_sinh_moi',
          'email': 'moi@example.com',
          'role': 'Student',
          'isActive': true,
        },
      );

  @override
  Future<StudentProfile> getStudentProfile() async => throw studentError;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

AuthRepository buildRepository(ApiException studentError) {
  final ApiClient client = ApiClient(tokenStorage: TokenStorage());
  final AuthRepository repository = AuthRepository(
    api: FakeAuthApi(studentError),
    apiClient: client,
  );
  addTearDown(() {
    repository.dispose();
    client.dispose();
  });
  return repository;
}

void main() {
  group('thí sinh chưa thuộc cuộc thi', () {
    test('vẫn đăng nhập được, không có thông tin cuộc thi', () async {
      final AuthRepository repository = buildRepository(
        const ApiException(
          message: 'Không tìm thấy thông tin thí sinh trong cuộc thi',
          statusCode: 400,
          code: 'STUDENT_NOT_IN_CONTEST',
        ),
      );

      final AuthUser user = await repository.refreshUser();

      expect(user.username, 'thi_sinh_moi');
      expect(user.student, isNull);
      expect(repository.currentUser, isNotNull);
    });

    test('lỗi hồ sơ khác vẫn bị chặn', () async {
      final AuthRepository repository = buildRepository(
        const ApiException(
          message: 'Tài khoản thí sinh đã bị vô hiệu hóa',
          statusCode: 400,
        ),
      );

      await expectLater(repository.refreshUser(), throwsA(isA<ApiException>()));
      expect(repository.currentUser, isNull);
    });
  });
}
