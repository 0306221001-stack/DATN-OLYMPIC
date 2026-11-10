import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import '../storage/token_storage.dart';

// =============================================================================
// Kiểu dữ liệu dùng chung
// =============================================================================

/// Lý do phiên đăng nhập kết thúc, để tầng UI/Router quyết định thông báo.
enum SessionExpiredReason {
  /// Access token và refresh token đều không còn dùng được.
  tokenExpired,

  /// Tài khoản đã đăng nhập ở thiết bị khác (Backend chỉ cho một phiên).
  loggedInElsewhere,

  /// Tài khoản bị khóa hoặc không còn tồn tại.
  accountLocked,
}

/// Lỗi chuẩn hóa mà mọi Service sẽ nhận được từ `ApiClient`.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.fieldErrors = const <String, String>{},
    this.isNetworkError = false,
    this.isTimeout = false,
    this.isCancelled = false,
  });

  /// Thông điệp tiếng Việt có thể hiển thị trực tiếp cho người dùng.
  final String message;
  final int? statusCode;

  /// Mã lỗi của Backend (ví dụ `INVALID_OR_EXPIRED_TOKEN`) nếu có.
  final String? code;

  /// Lỗi theo từng trường của form, key là tên trường.
  final Map<String, String> fieldErrors;

  final bool isNetworkError;
  final bool isTimeout;
  final bool isCancelled;

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() =>
      'ApiException(status: $statusCode, code: $code, message: $message)';
}

/// Kết quả thành công của một lời gọi API theo envelope của Backend:
/// `{ success, message, data, timestamp }`.
class ApiResult {
  const ApiResult({
    required this.success,
    required this.message,
    required this.data,
    required this.raw,
    this.statusCode,
  });

  final bool success;
  final String message;
  final dynamic data;
  final Map<String, dynamic> raw;
  final int? statusCode;

  /// `data` dưới dạng Map; trả về Map rỗng nếu `data` không phải object.
  Map<String, dynamic> get dataAsMap {
    final dynamic value = data;
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }

  /// `data` dưới dạng List; trả về List rỗng nếu `data` không phải mảng.
  List<dynamic> get dataAsList {
    final dynamic value = data;
    if (value is List) {
      return value;
    }
    return <dynamic>[];
  }
}

enum _RefreshOutcome { success, rejected, networkError }

// =============================================================================
// ApiClient
// =============================================================================

/// HTTP client duy nhất của app, xây dựng trên Dio.
///
/// Backend xác thực bằng cookie httpOnly (middleware `authenticate` chỉ đọc
/// `req.cookies.accessToken`, KHÔNG đọc header `Authorization`), nên:
///
///  * Mobile / Desktop: tự gắn header `Cookie: accessToken=...; refreshToken=...`
///    lấy từ `TokenStorage`, và đọc header `Set-Cookie` của response để lưu token.
///  * Web: trình duyệt cấm JavaScript tự đặt header `Cookie` và cấm đọc
///    `Set-Cookie`. Vì vậy bật `withCredentials` để TRÌNH DUYỆT tự gửi và tự
///    lưu cookie; app không đụng đến header `Cookie` trên nền tảng này.
///
/// Khi gặp 401, gọi `GET /api/auth/refresh-token` rồi gửi lại request gốc đúng
/// một lần. Nhiều request cùng lỗi 401 chỉ kích hoạt MỘT lần refresh.
class ApiClient {
  ApiClient({
    required TokenStorage tokenStorage,
    Dio? dio,
    Dio? refreshDio,
  })  : _tokenStorage = tokenStorage,
        _dio = dio ?? Dio(_buildBaseOptions()),
        _refreshDio = refreshDio ?? Dio(_buildBaseOptions()) {
    _dio.interceptors.add(_AuthInterceptor(this));
    if (kDebugMode) {
      _dio.interceptors.add(_DebugLogInterceptor());
    }
  }

  /// Khóa trong `Options.extra`: đặt `true` để bỏ qua việc gắn cookie và bỏ
  /// qua cơ chế auto refresh (dùng cho đăng nhập, quên mật khẩu...).
  static const String skipAuthKey = 'skipAuth';

  static const String _retriedKey = '_authRetried';

  /// Khóa mà adapter trình duyệt của Dio đọc để bật gửi/nhận cookie chéo
  /// origin. Trên mobile/desktop khóa này bị bỏ qua.
  static const String _withCredentialsKey = 'withCredentials';

  final TokenStorage _tokenStorage;
  final Dio _dio;

  /// Dio riêng, không gắn interceptor, chỉ dùng để gọi refresh-token nhằm
  /// tránh vòng lặp vô hạn.
  final Dio _refreshDio;

  final StreamController<SessionExpiredReason> _sessionController =
      StreamController<SessionExpiredReason>.broadcast();

  Future<_RefreshOutcome>? _refreshInFlight;
  bool _sessionExpiredNotified = false;

  static BaseOptions _buildBaseOptions() {
    return BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: Env.connectTimeout,
      receiveTimeout: Env.receiveTimeout,
      sendTimeout: Env.sendTimeout,
      responseType: ResponseType.json,
      extra: <String, dynamic>{_withCredentialsKey: true},
      headers: <String, dynamic>{
        Headers.acceptHeader: Headers.jsonContentType,
      },
    );
  }

  /// Dio gốc, dành cho các trường hợp đặc biệt (tải file...).
  Dio get dio => _dio;

  TokenStorage get tokenStorage => _tokenStorage;

  /// Phát sự kiện khi phiên đăng nhập không thể khôi phục. Auth guard của
  /// `go_router` lắng nghe luồng này để đưa người dùng về màn hình đăng nhập.
  Stream<SessionExpiredReason> get onSessionExpired =>
      _sessionController.stream;

  void dispose() {
    _dio.close(force: true);
    _refreshDio.close(force: true);
    _sessionController.close();
  }

  // ---------------------------------------------------------------------------
  // API công khai
  // ---------------------------------------------------------------------------

  Future<ApiResult> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    CancelToken? cancelToken,
  }) {
    return _send(
      'GET',
      path,
      queryParameters: queryParameters,
      requiresAuth: requiresAuth,
      cancelToken: cancelToken,
    );
  }

  Future<ApiResult> post(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    CancelToken? cancelToken,
  }) {
    return _send(
      'POST',
      path,
      data: data,
      queryParameters: queryParameters,
      requiresAuth: requiresAuth,
      cancelToken: cancelToken,
    );
  }

  Future<ApiResult> put(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    CancelToken? cancelToken,
  }) {
    return _send(
      'PUT',
      path,
      data: data,
      queryParameters: queryParameters,
      requiresAuth: requiresAuth,
      cancelToken: cancelToken,
    );
  }

  Future<ApiResult> patch(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    CancelToken? cancelToken,
  }) {
    return _send(
      'PATCH',
      path,
      data: data,
      queryParameters: queryParameters,
      requiresAuth: requiresAuth,
      cancelToken: cancelToken,
    );
  }

  Future<ApiResult> delete(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool requiresAuth = true,
    CancelToken? cancelToken,
  }) {
    return _send(
      'DELETE',
      path,
      data: data,
      queryParameters: queryParameters,
      requiresAuth: requiresAuth,
      cancelToken: cancelToken,
    );
  }

  /// Thử đăng nhập lại bằng refreshToken hiện có (dùng khi mở app).
  /// Trả về `true` nếu đã lấy được accessToken mới.
  Future<bool> tryRestoreSession() async {
    // Trên web refreshToken nằm trong cookie của trình duyệt, không có trong
    // storage nên không thể kiểm tra trước.
    if (!kIsWeb) {
      final String? refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }
    }
    final _RefreshOutcome outcome = await _refreshAccessToken();
    return outcome == _RefreshOutcome.success;
  }

  /// Xóa token cục bộ và thông báo phiên đã kết thúc.
  Future<void> endSession(SessionExpiredReason reason) async {
    try {
      await _tokenStorage.clear();
    } catch (error) {
      debugPrint('[ApiClient] Không thể xóa token khi kết thúc phiên: $error');
    }

    if (_sessionExpiredNotified || _sessionController.isClosed) {
      return;
    }
    _sessionExpiredNotified = true;
    _sessionController.add(reason);
  }

  /// Gọi sau khi đăng nhập thành công để cho phép thông báo phiên hết hạn lần
  /// tiếp theo.
  void markSessionActive() {
    _sessionExpiredNotified = false;
  }

  // ---------------------------------------------------------------------------
  // Gửi request và chuẩn hóa kết quả
  // ---------------------------------------------------------------------------

  Future<ApiResult> _send(
    String method,
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    required bool requiresAuth,
    CancelToken? cancelToken,
  }) async {
    try {
      final Response<dynamic> response = await _dio.request<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        cancelToken: cancelToken,
        options: Options(
          method: method,
          extra: <String, dynamic>{
            skipAuthKey: !requiresAuth,
            _withCredentialsKey: true,
          },
        ),
      );
      return _toResult(response);
    } on ApiException {
      rethrow;
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (error) {
      throw ApiException(
        message: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
        code: error.runtimeType.toString(),
      );
    }
  }

  ApiResult _toResult(Response<dynamic> response) {
    final dynamic body = response.data;

    if (body is Map) {
      final Map<String, dynamic> map = Map<String, dynamic>.from(body);
      final bool success = map['success'] != false;
      final String message = _readString(map['message']) ?? '';

      if (!success) {
        throw ApiException(
          message: message.isNotEmpty ? message : 'Yêu cầu không thành công.',
          statusCode: response.statusCode,
          code: _readCode(map),
          fieldErrors: _readFieldErrors(map),
        );
      }

      return ApiResult(
        success: true,
        message: message,
        data: map['data'],
        raw: map,
        statusCode: response.statusCode,
      );
    }

    return ApiResult(
      success: true,
      message: '',
      data: body,
      raw: <String, dynamic>{'data': body},
      statusCode: response.statusCode,
    );
  }

  ApiException _mapDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const ApiException(
          message: 'Kết nối đến máy chủ quá thời gian. Vui lòng thử lại.',
          isTimeout: true,
          isNetworkError: true,
        );

      case DioExceptionType.cancel:
        return const ApiException(
          message: 'Yêu cầu đã bị hủy.',
          isCancelled: true,
        );

      case DioExceptionType.connectionError:
        return const ApiException(
          message: 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng.',
          isNetworkError: true,
        );

      case DioExceptionType.badCertificate:
        return const ApiException(
          message: 'Chứng chỉ bảo mật của máy chủ không hợp lệ.',
          isNetworkError: true,
        );

      case DioExceptionType.badResponse:
        return _mapBadResponse(error);

      case DioExceptionType.unknown:
        // Không có phản hồi nào từ máy chủ nghĩa là không liên lạc được.
        final bool noResponse = error.response == null;
        return ApiException(
          message: noResponse
              ? 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng.'
              : 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
          statusCode: error.response?.statusCode,
          isNetworkError: noResponse,
        );
    }
  }

  ApiException _mapBadResponse(DioException error) {
    final Response<dynamic>? response = error.response;
    final int? status = response?.statusCode;
    final dynamic body = response?.data;

    String? message;
    String? code;
    Map<String, String> fieldErrors = const <String, String>{};

    if (body is Map) {
      final Map<String, dynamic> map = Map<String, dynamic>.from(body);
      message = _readString(map['message']);
      code = _readCode(map);
      fieldErrors = _readFieldErrors(map);
    }

    message ??= _defaultMessageForStatus(status);

    return ApiException(
      message: message,
      statusCode: status,
      code: code,
      fieldErrors: fieldErrors,
    );
  }

  String _defaultMessageForStatus(int? status) {
    switch (status) {
      case 400:
        return 'Yêu cầu không hợp lệ.';
      case 401:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      case 403:
        return 'Bạn không có quyền thực hiện thao tác này.';
      case 404:
        return 'Không tìm thấy dữ liệu yêu cầu.';
      case 429:
        return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
      default:
        if (status != null && status >= 500) {
          return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
        }
        return 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  }

  // ---------------------------------------------------------------------------
  // Cookie <-> Token (mobile / desktop)
  // ---------------------------------------------------------------------------

  /// Đọc các header `Set-Cookie` và đồng bộ vào `TokenStorage`.
  /// Trả về `true` nếu accessToken được cập nhật bằng giá trị mới.
  ///
  /// Trên web trình duyệt không cho JavaScript đọc `Set-Cookie`, nên hàm này
  /// luôn trả về `false` và cookie do trình duyệt tự quản lý.
  Future<bool> _persistCookiesFrom(Headers headers) async {
    final List<String>? setCookies = headers.map['set-cookie'];
    if (setCookies == null || setCookies.isEmpty) {
      return false;
    }

    bool accessUpdated = false;

    for (final String rawCookie in setCookies) {
      final MapEntry<String, String>? cookie = _parseSetCookie(rawCookie);
      if (cookie == null) {
        continue;
      }

      try {
        if (cookie.key == Env.accessTokenCookieName) {
          if (cookie.value.isEmpty) {
            await _tokenStorage.clearAccessToken();
          } else {
            await _tokenStorage.saveTokens(accessToken: cookie.value);
            accessUpdated = true;
          }
        } else if (cookie.key == Env.refreshTokenCookieName) {
          if (cookie.value.isEmpty) {
            await _tokenStorage.clearRefreshToken();
          } else {
            await _tokenStorage.saveTokens(refreshToken: cookie.value);
          }
        }
      } catch (error) {
        debugPrint('[ApiClient] Không thể lưu cookie "${cookie.key}": $error');
      }
    }

    if (accessUpdated) {
      markSessionActive();
    }
    return accessUpdated;
  }

  /// Tách cặp `name=value` đầu tiên của một header `Set-Cookie`.
  MapEntry<String, String>? _parseSetCookie(String rawCookie) {
    final String firstPart = rawCookie.split(';').first.trim();
    final int separator = firstPart.indexOf('=');
    if (separator <= 0) {
      return null;
    }

    final String name = firstPart.substring(0, separator).trim();
    String value = firstPart.substring(separator + 1).trim();

    try {
      value = Uri.decodeComponent(value);
    } catch (_) {
      // Giữ nguyên giá trị gốc nếu không giải mã được.
    }

    return MapEntry<String, String>(name, value);
  }

  String? _accessTokenFromCookieHeader(Object? cookieHeader) {
    if (cookieHeader is! String || cookieHeader.isEmpty) {
      return null;
    }

    const String prefix = '${Env.accessTokenCookieName}=';
    for (final String part in cookieHeader.split(';')) {
      final String trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return trimmed.substring(prefix.length);
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Refresh token
  // ---------------------------------------------------------------------------

  /// Chia sẻ một lần refresh duy nhất cho mọi request đang chờ.
  Future<_RefreshOutcome> _refreshAccessToken() {
    final Future<_RefreshOutcome>? existing = _refreshInFlight;
    if (existing != null) {
      return existing;
    }

    final Future<_RefreshOutcome> future =
        _performRefresh().whenComplete(() => _refreshInFlight = null);
    _refreshInFlight = future;
    return future;
  }

  Future<_RefreshOutcome> _performRefresh() async {
    String? refreshToken;

    if (!kIsWeb) {
      refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return _RefreshOutcome.rejected;
      }
    }

    try {
      final Response<dynamic> response = await _refreshDio.get<dynamic>(
        Env.refreshTokenPath,
        options: Options(
          extra: const <String, dynamic>{_withCredentialsKey: true},
          // Web: trình duyệt tự gửi cookie refreshToken, không được tự đặt.
          headers: kIsWeb
              ? null
              : <String, dynamic>{
                  'Cookie': '${Env.refreshTokenCookieName}=$refreshToken',
                },
        ),
      );

      final dynamic body = response.data;
      if (body is Map && body['success'] == false) {
        return _RefreshOutcome.rejected;
      }

      if (kIsWeb) {
        // Backend đặt accessToken mới qua Set-Cookie (JavaScript không đọc
        // được); trình duyệt đã tự lưu nên chỉ cần coi là thành công.
        return _RefreshOutcome.success;
      }

      bool accessUpdated = await _persistCookiesFrom(response.headers);

      // Dự phòng: nếu Backend trả accessToken trong body thay vì cookie.
      if (!accessUpdated && body is Map) {
        final dynamic data = body['data'];
        if (data is Map && data['accessToken'] is String) {
          final String token = data['accessToken'] as String;
          if (token.isNotEmpty) {
            await _tokenStorage.saveTokens(accessToken: token);
            markSessionActive();
            accessUpdated = true;
          }
        }
      }

      if (!accessUpdated) {
        debugPrint(
          '[ApiClient] Refresh thành công nhưng không nhận được accessToken mới.',
        );
        return _RefreshOutcome.rejected;
      }

      return _RefreshOutcome.success;
    } on DioException catch (error) {
      final int? status = error.response?.statusCode;
      // Backend trả 400 khi refreshToken thiếu/hết hạn/không khớp.
      if (status == 400 || status == 401 || status == 403) {
        return _RefreshOutcome.rejected;
      }
      return _RefreshOutcome.networkError;
    } catch (error) {
      debugPrint('[ApiClient] Lỗi không xác định khi refresh token: $error');
      return _RefreshOutcome.networkError;
    }
  }

  // ---------------------------------------------------------------------------
  // Đọc dữ liệu lỗi từ body của Backend
  // ---------------------------------------------------------------------------

  String? _readString(dynamic value) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return null;
  }

  /// Backend dùng khi `code` (middleware auth) hoặc `error` (chuỗi mã lỗi).
  String? _readCode(Map<String, dynamic> body) {
    final dynamic code = body['code'];
    if (code is String && code.isNotEmpty) {
      return code;
    }
    final dynamic error = body['error'];
    if (error is String && error.isNotEmpty) {
      return error;
    }
    if (error is Map && error['type'] is String) {
      return error['type'] as String;
    }
    return null;
  }

  /// Đọc `error.details: [{ field, message }]` do `validateBody` trả về.
  Map<String, String> _readFieldErrors(Map<String, dynamic> body) {
    final dynamic error = body['error'];
    if (error is! Map) {
      return const <String, String>{};
    }

    final dynamic details = error['details'];
    if (details is! List) {
      return const <String, String>{};
    }

    final Map<String, String> result = <String, String>{};
    for (final dynamic item in details) {
      if (item is Map && item['field'] is String && item['message'] is String) {
        result.putIfAbsent(
          item['field'] as String,
          () => item['message'] as String,
        );
      }
    }
    return result;
  }
}

// =============================================================================
// Interceptor xác thực + auto refresh
// =============================================================================

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._client);

  final ApiClient _client;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Backend chỉ đọc cookie, không đọc `Authorization`. Trên web trình duyệt
    // cấm tự đặt header `Cookie` (cookie được gửi nhờ `withCredentials`).
    if (options.extra[ApiClient.skipAuthKey] != true && !kIsWeb) {
      try {
        final String? cookie = await _client._tokenStorage.buildCookieHeader();
        if (cookie != null && cookie.isNotEmpty) {
          options.headers['Cookie'] = cookie;
        }
      } catch (error) {
        debugPrint(
            '[ApiClient] Không thể đọc token để gắn vào request: $error');
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) async {
    // Đăng nhập, refresh, đăng xuất đều trả token qua Set-Cookie (mobile).
    await _client._persistCookiesFrom(response.headers);
    handler.next(response);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final RequestOptions request = err.requestOptions;

    final bool shouldHandle = err.response?.statusCode == 401 &&
        request.extra[ApiClient.skipAuthKey] != true &&
        request.extra[ApiClient._retriedKey] != true &&
        !request.path.contains(Env.refreshTokenPath);

    if (!shouldHandle) {
      handler.next(err);
      return;
    }

    final String? code = _readErrorCode(err.response?.data);

    // 1) Tài khoản bị khóa hoặc không còn tồn tại.
    if (code == 'USER_NOT_FOUND_OR_INACTIVE') {
      await _client.endSession(SessionExpiredReason.accountLocked);
      handler.next(err);
      return;
    }

    // 2) Request này mang token cũ trong khi token mới đã được refresh xong
    //    (Backend lưu token mới nhất của user, token cũ sẽ bị báo
    //    INVALID_OR_EXPIRED_TOKEN). Chỉ cần gửi lại với token hiện tại.
    //    Chỉ áp dụng cho mobile/desktop vì web không tự gắn header Cookie.
    final String? sentToken =
        _client._accessTokenFromCookieHeader(request.headers['Cookie']);
    final String? currentToken = await _client._tokenStorage.readAccessToken();

    if (sentToken != null &&
        currentToken != null &&
        currentToken.isNotEmpty &&
        sentToken != currentToken) {
      await _retry(request, err, handler);
      return;
    }

    // 3) Token đang dùng không phải token mới nhất của user ở Backend:
    //    tài khoản đã đăng nhập ở thiết bị khác. Không refresh để tránh
    //    đá phiên của thiết bị kia.
    if (code == 'INVALID_OR_EXPIRED_TOKEN') {
      await _client.endSession(SessionExpiredReason.loggedInElsewhere);
      handler.next(err);
      return;
    }

    // 4) Access token hết hạn: refresh rồi gửi lại.
    final _RefreshOutcome outcome = await _client._refreshAccessToken();

    switch (outcome) {
      case _RefreshOutcome.success:
        await _retry(request, err, handler);
        return;
      case _RefreshOutcome.rejected:
        await _client.endSession(SessionExpiredReason.tokenExpired);
        handler.next(err);
        return;
      case _RefreshOutcome.networkError:
        // Mất mạng khi refresh: giữ nguyên phiên để người dùng thử lại.
        handler.next(err);
        return;
    }
  }

  Future<void> _retry(
    RequestOptions request,
    DioException originalError,
    ErrorInterceptorHandler handler,
  ) async {
    try {
      dynamic data = request.data;
      // FormData chỉ đọc được một lần, phải nhân bản trước khi gửi lại.
      if (data is FormData) {
        data = data.clone();
      }

      // Gắn lại cookie mới nhất (mobile/desktop); web để trình duyệt tự gửi.
      final Map<String, dynamic> headers =
          Map<String, dynamic>.from(request.headers);
      if (!kIsWeb) {
        final String? cookie = await _client._tokenStorage.buildCookieHeader();
        if (cookie != null && cookie.isNotEmpty) {
          headers['Cookie'] = cookie;
        }
      }

      final RequestOptions retryRequest = request.copyWith(
        data: data,
        headers: headers,
        extra: <String, dynamic>{
          ...request.extra,
          ApiClient._retriedKey: true,
        },
      );

      final Response<dynamic> response = await _client._dio.fetch<dynamic>(
        retryRequest,
      );
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    } catch (_) {
      handler.next(originalError);
    }
  }

  String? _readErrorCode(dynamic body) {
    if (body is! Map) {
      return null;
    }
    final dynamic code = body['code'];
    if (code is String && code.isNotEmpty) {
      return code;
    }
    return null;
  }
}

/// Ghi log gọn trong chế độ debug. Cố ý KHÔNG in header/cookie/body để tránh
/// làm lộ token.
class _DebugLogInterceptor extends Interceptor {
  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    debugPrint(
      '[API] ${response.requestOptions.method} '
      '${response.requestOptions.uri} -> ${response.statusCode}',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint(
      '[API] ${err.requestOptions.method} ${err.requestOptions.uri} '
      '-> ${err.response?.statusCode ?? err.type.name}',
    );
    handler.next(err);
  }
}

// =============================================================================
// Riverpod
// =============================================================================

/// Provider `ApiClient` dùng chung toàn app.
final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final ApiClient client = ApiClient(
    tokenStorage: ref.watch(tokenStorageProvider),
  );
  ref.onDispose(client.dispose);
  return client;
});
