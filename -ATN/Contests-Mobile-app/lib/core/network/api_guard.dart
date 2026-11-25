import 'api_client.dart';

/// Bọc một thao tác gọi API để mọi lỗi đều quy về `ApiException`.
///
/// - `ApiException` được giữ nguyên.
/// - `FormatException` (dữ liệu trả về sai định dạng) thành mã `INVALID_RESPONSE`.
/// - Lỗi khác thành `ApiException` với [failureMessage].
Future<T> guardApi<T>({
  required Future<T> Function() action,
  required String failureMessage,
}) async {
  try {
    return await action();
  } on ApiException {
    rethrow;
  } on FormatException catch (error) {
    throw ApiException(
      message: 'Dữ liệu máy chủ trả về không hợp lệ: ${error.message}',
      code: 'INVALID_RESPONSE',
    );
  } catch (_) {
    throw ApiException(message: failureMessage);
  }
}
