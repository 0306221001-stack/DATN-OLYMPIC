import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/api_guard.dart';
import '../../../core/utils/json_read.dart';
import '../domain/judge_models.dart';

/// Gọi REST dành cho Trọng tài. Mọi lỗi đều là `ApiException`.
class JudgeRepository {
  JudgeRepository(this._client);

  final ApiClient _client;

  /// `GET /contest/list-contest/judge`.
  Future<List<JudgeContest>> fetchContests() {
    return guardApi<List<JudgeContest>>(
      failureMessage: 'Không thể tải danh sách cuộc thi.',
      action: () async {
        final ApiResult result = await _client.get(ApiEndpoints.judgeContests);
        return _parseList<JudgeContest>(result, JudgeContest.fromJson);
      },
    );
  }

  /// `GET /match/judge/:contestId`.
  Future<List<JudgeMatch>> fetchMatches(int contestId) {
    return guardApi<List<JudgeMatch>>(
      failureMessage: 'Không thể tải danh sách trận đấu.',
      action: () async {
        final ApiResult result =
            await _client.get(ApiEndpoints.judgeMatches(contestId));
        return _parseList<JudgeMatch>(result, JudgeMatch.fromJson);
      },
    );
  }

  /// `GET /match/:slug/matchInfo`.
  Future<JudgeMatchInfo> fetchMatchInfo(String slug) {
    return guardApi<JudgeMatchInfo>(
      failureMessage: 'Không thể tải thông tin trận đấu.',
      action: () async {
        final ApiResult result =
            await _client.get(ApiEndpoints.matchInfo(slug));
        return JudgeMatchInfo.fromJson(result.dataAsMap);
      },
    );
  }

  /// `GET /group-divisions/contestant/judge/:slug`.
  Future<List<JudgeContestant>> fetchContestants(String slug) {
    return guardApi<List<JudgeContestant>>(
      failureMessage: 'Không thể tải danh sách thí sinh.',
      action: () async {
        final ApiResult result =
            await _client.get(ApiEndpoints.judgeContestants(slug));
        return JudgeContestant.listFrom(result.data);
      },
    );
  }

  /// `GET /group/match/:slug`.
  Future<JudgeGroup> fetchGroup(String slug) {
    return guardApi<JudgeGroup>(
      failureMessage: 'Không thể tải thông tin nhóm thi.',
      action: () async {
        final ApiResult result =
            await _client.get(ApiEndpoints.matchGroups(slug));
        final Object? data = result.data;
        if (data is List && data.isNotEmpty) {
          final Map<String, dynamic>? first = JsonRead.asMap(data.first);
          if (first != null) {
            return JudgeGroup.fromJson(first);
          }
        }
        return JudgeGroup.fromJson(result.dataAsMap);
      },
    );
  }

  /// `GET /match/:slug/CurrentQuestion` (kèm đáp án đúng, chỉ trọng tài xem).
  Future<JudgeQuestion> fetchCurrentQuestion(String slug) {
    return guardApi<JudgeQuestion>(
      failureMessage: 'Không thể tải câu hỏi hiện tại.',
      action: () async {
        final ApiResult result =
            await _client.get(ApiEndpoints.matchCurrentQuestion(slug));
        return JudgeQuestion.fromJson(result.dataAsMap);
      },
    );
  }

  List<T> _parseList<T>(
    ApiResult result,
    T Function(Map<String, dynamic> json) parse,
  ) {
    final List<T> items = <T>[];
    for (final dynamic item in result.dataAsList) {
      final Map<String, dynamic>? json = JsonRead.asMap(item);
      if (json != null) {
        items.add(parse(json));
      }
    }
    return List<T>.unmodifiable(items);
  }
}

/// Provider `JudgeRepository`.
final Provider<JudgeRepository> judgeRepositoryProvider =
    Provider<JudgeRepository>(
  (ref) => JudgeRepository(ref.watch(apiClientProvider)),
);
