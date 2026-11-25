import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_guard.dart';
import '../../../core/utils/json_read.dart';
import '../domain/profile_models.dart';

/// Gọi REST cho hồ sơ, giải thưởng và nhà tài trợ. Mọi lỗi đều là
/// `ApiException`.
class ProfileRepository {
  ProfileRepository(this._client);

  final ApiClient _client;

  static const Map<String, dynamic> _firstPage = <String, dynamic>{
    'page': 1,
    'limit': 50,
  };

  /// `GET /awards/contest/:slug`, sắp xếp giải nhất lên đầu.
  Future<List<AwardItem>> fetchAwards(String contestSlug) {
    return guardApi<List<AwardItem>>(
      failureMessage: 'Không thể tải danh sách giải thưởng.',
      action: () async {
        final ApiResult result = await _client.get(
          '/awards/contest/${Uri.encodeComponent(contestSlug)}',
          queryParameters: _firstPage,
        );
        final List<AwardItem> items = <AwardItem>[];
        for (final dynamic raw in JsonRead.asList(result.dataAsMap['awards'])) {
          final Map<String, dynamic>? json = JsonRead.asMap(raw);
          if (json != null) {
            items.add(AwardItem.fromJson(json));
          }
        }
        return sortAwards(items);
      },
    );
  }

  /// `GET /sponsors/contest/:slug`.
  Future<List<SponsorItem>> fetchSponsors(String contestSlug) {
    return guardApi<List<SponsorItem>>(
      failureMessage: 'Không thể tải danh sách nhà tài trợ.',
      action: () async {
        final ApiResult result = await _client.get(
          '/sponsors/contest/${Uri.encodeComponent(contestSlug)}',
          queryParameters: _firstPage,
        );
        final List<SponsorItem> items = <SponsorItem>[];
        for (final dynamic raw
            in JsonRead.asList(result.dataAsMap['sponsors'])) {
          final Map<String, dynamic>? json = JsonRead.asMap(raw);
          if (json != null) {
            items.add(SponsorItem.fromJson(json));
          }
        }
        return List<SponsorItem>.unmodifiable(items);
      },
    );
  }
}

/// Provider `ProfileRepository`.
final Provider<ProfileRepository> profileRepositoryProvider =
    Provider<ProfileRepository>(
  (ref) => ProfileRepository(ref.watch(apiClientProvider)),
);

/// Giải thưởng của một cuộc thi (tham số là slug cuộc thi).
final AutoDisposeFutureProviderFamily<List<AwardItem>, String> awardsProvider =
    FutureProvider.autoDispose.family<List<AwardItem>, String>(
  (ref, String slug) => ref.watch(profileRepositoryProvider).fetchAwards(slug),
);

/// Nhà tài trợ của một cuộc thi (tham số là slug cuộc thi).
final AutoDisposeFutureProviderFamily<List<SponsorItem>, String>
    sponsorsProvider =
    FutureProvider.autoDispose.family<List<SponsorItem>, String>(
  (ref, String slug) =>
      ref.watch(profileRepositoryProvider).fetchSponsors(slug),
);
