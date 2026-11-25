import '../../../core/utils/json_read.dart';
import '../../../core/utils/media_url.dart';

export '../../../core/utils/media_url.dart' show resolveMediaUrl;

/// Hạng giải thưởng của cuộc thi.
enum AwardType {
  first,
  second,
  third,
  other;

  static AwardType parse(String? value) {
    switch (value) {
      case 'firstPrize':
        return AwardType.first;
      case 'secondPrize':
        return AwardType.second;
      case 'thirdPrize':
        return AwardType.third;
      default:
        return AwardType.other;
    }
  }

  String get label {
    switch (this) {
      case AwardType.first:
        return 'Giải nhất';
      case AwardType.second:
        return 'Giải nhì';
      case AwardType.third:
        return 'Giải ba';
      case AwardType.other:
        return 'Giải thưởng';
    }
  }

  /// Thứ tự hiển thị: giải nhất lên đầu.
  int get rank => index;
}

/// Một giải thưởng và người đạt giải (`GET /awards/contest/:slug`).
class AwardItem {
  const AwardItem({
    required this.name,
    required this.type,
    required this.winnerName,
  });

  final String name;
  final AwardType type;

  /// Tên thí sinh đạt giải; rỗng nếu giải chưa có chủ.
  final String winnerName;

  bool get hasWinner => winnerName.trim().isNotEmpty;

  factory AwardItem.fromJson(Map<String, dynamic> json) {
    final String winner = JsonRead.asString(json['fullName']) ?? '';
    return AwardItem(
      name: JsonRead.asString(json['name']) ?? '',
      type: AwardType.parse(JsonRead.asString(json['type'])),
      // Backend trả "Không có" khi giải chưa có người đạt.
      winnerName: winner == 'Không có' ? '' : winner,
    );
  }
}

/// Nhà tài trợ (`GET /sponsors/contest/:slug`).
class SponsorItem {
  const SponsorItem({required this.name, this.logoUrl, this.imageUrl});

  final String name;
  final String? logoUrl;
  final String? imageUrl;

  factory SponsorItem.fromJson(Map<String, dynamic> json) {
    return SponsorItem(
      name: JsonRead.asString(json['name']) ?? '',
      logoUrl: resolveMediaUrl(JsonRead.asString(json['logo'])),
      imageUrl: resolveMediaUrl(JsonRead.asString(json['images'])),
    );
  }
}

/// Sắp xếp giải thưởng: giải nhất lên đầu, cùng hạng thì giữ thứ tự gốc.
List<AwardItem> sortAwards(List<AwardItem> awards) {
  final List<AwardItem> sorted = List<AwardItem>.of(awards);
  // `List.sort` không ổn định, nên so sánh kèm chỉ số gốc.
  final Map<AwardItem, int> original = <AwardItem, int>{
    for (int i = 0; i < awards.length; i++) awards[i]: i,
  };
  sorted.sort((AwardItem a, AwardItem b) {
    final int byRank = a.type.rank.compareTo(b.type.rank);
    return byRank != 0 ? byRank : original[a]!.compareTo(original[b]!);
  });
  return List<AwardItem>.unmodifiable(sorted);
}
