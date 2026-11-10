import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/api_guard.dart';
import '../../../core/utils/json_read.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_user.dart';
import '../domain/match_models.dart';

/// Giá trị đáp án khi hết giờ mà thí sinh chưa chọn (khớp với web và Backend).
const String noAnswerPlaceholder = '[KHÔNG CHỌN ĐÁP ÁN]';

/// Gọi REST cho trận đấu của thí sinh. Mọi lỗi đều là `ApiException`.
class MatchRepository {
  MatchRepository({
    required ApiClient apiClient,
    required AuthRepository authRepository,
  })  : _client = apiClient,
        _authRepository = authRepository;

  final ApiClient _client;
  final AuthRepository _authRepository;

  /// Tải lại danh sách trận của thí sinh (`GET /auth/profile-student`).
  Future<List<MatchSummary>> refreshMatches() {
    return guardApi<List<MatchSummary>>(
      failureMessage: 'Không thể tải danh sách trận đấu.',
      action: () async {
        final AuthUser user = await _authRepository.refreshUser();
        final StudentProfile? profile = user.student;
        if (profile == null) {
          throw const ApiException(
            message: 'Không tìm thấy thông tin thí sinh trong cuộc thi.',
            code: 'CONTESTANT_NOT_FOUND',
          );
        }
        return profile.matches;
      },
    );
  }

  /// Số báo danh của thí sinh trong trận (`GET /auth/registration-number`).
  Future<int?> fetchRegistrationNumber({
    required int contestantId,
    required int matchId,
  }) {
    return guardApi<int?>(
      failureMessage: 'Không thể tải số báo danh.',
      action: () async {
        final ApiResult result = await _client.get(
          ApiEndpoints.registrationNumber,
          queryParameters: <String, dynamic>{
            'contestantId': contestantId,
            'matchId': matchId,
          },
        );
        return JsonRead.asInt(result.dataAsMap['registrationNumber']);
      },
    );
  }

  /// Báo thí sinh vi phạm quy chế để Backend cấm thi
  /// (`POST /results/ban-contestant`).
  ///
  /// Backend trả `BAN_FAILED` nếu thí sinh đã bị cấm từ trước; trường hợp đó
  /// coi như thành công vì kết quả mong muốn đã đạt được.
  Future<void> banContestant({
    required int matchId,
    required int violationCount,
  }) {
    return guardApi<void>(
      failureMessage: 'Không thể gửi báo cáo vi phạm.',
      action: () async {
        try {
          await _client.post(
            ApiEndpoints.banContestant,
            data: <String, dynamic>{
              'matchId': matchId,
              'violationType': 'anti_cheat_multiple_violations',
              'violationCount': violationCount,
              'reason':
                  'Rời khỏi ứng dụng trong lúc thi $violationCount lần, vi phạm quy chế.',
              'bannedBy': 'ANTI_CHEAT_SYSTEM',
            },
          );
        } on ApiException catch (error) {
          if (error.code == 'BAN_FAILED') {
            return;
          }
          rethrow;
        }
      },
    );
  }

  /// Nộp đáp án (`POST /results/submit-answer`).
  ///
  /// Lưu ý: trả lời sai là bị loại ngay ở Backend, nên giao diện chỉ hiển thị
  /// kết quả sau khi hết giờ.
  Future<AnswerResult> submitAnswer({
    required int matchId,
    required int questionOrder,
    required String answer,
  }) {
    return guardApi<AnswerResult>(
      failureMessage: 'Không thể gửi đáp án. Vui lòng thử lại.',
      action: () async {
        final String trimmed = answer.trim();
        final String body =
            trimmed.length > 500 ? trimmed.substring(0, 500) : trimmed;

        final ApiResult result = await _client.post(
          ApiEndpoints.submitAnswer,
          data: <String, dynamic>{
            'matchId': matchId,
            'questionOrder': questionOrder,
            'answer': body,
          },
        );

        final Map<String, dynamic> data = result.dataAsMap;
        final Map<String, dynamic>? nested = JsonRead.asMap(data['result']);
        if (nested == null) {
          throw const FormatException('Phản hồi thiếu kết quả chấm điểm.');
        }
        return AnswerResult.fromJson(nested);
      },
    );
  }
}

/// Provider `MatchRepository`.
final Provider<MatchRepository> matchRepositoryProvider =
    Provider<MatchRepository>(
  (ref) => MatchRepository(
    apiClient: ref.watch(apiClientProvider),
    authRepository: ref.watch(authRepositoryProvider),
  ),
);
