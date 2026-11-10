import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/router/auth_guard.dart';
import '../../settings/presentation/server_settings_dialog.dart';
import '../data/auth_repository.dart';
import '../domain/auth_user.dart';

/// Màn hình đăng nhập dùng chung cho Thí sinh (Student) và Trọng tài (Judge).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({
    super.key,
    this.initialRole = UserRole.student,
    this.initialMessage,
  });

  /// Vai trò được chọn sẵn khi mở màn hình.
  final UserRole initialRole;

  /// Thông báo hiển thị phía trên form (ví dụ lý do phiên hết hạn).
  final String? initialMessage;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final FocusNode _passwordFocusNode = FocusNode();

  late UserRole _role;
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  Map<String, String> _fieldErrors = <String, String>{};

  @override
  void initState() {
    super.initState();
    _role = widget.initialRole == UserRole.judge
        ? UserRole.judge
        : UserRole.student;
    _errorMessage = widget.initialMessage ?? _pendingSessionMessage();
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  /// Nếu vừa bị đá khỏi phiên (hết hạn, đăng nhập nơi khác...) thì báo lý do.
  String? _pendingSessionMessage() {
    final SessionExpiredReason? reason =
        ref.read(authRepositoryProvider).lastSessionExpiredReason;
    if (reason == null) {
      return null;
    }
    return sessionExpiredMessage(reason);
  }

  // ---------------------------------------------------------------------------
  // Xử lý đăng nhập
  // ---------------------------------------------------------------------------

  Future<void> _submit() async {
    if (_isLoading) {
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      _errorMessage = null;
      _fieldErrors = <String, String>{};
    });

    final bool isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final AuthUser user = await ref.read(authRepositoryProvider).login(
            role: _role,
            identifier: _identifierController.text,
            password: _passwordController.text,
          );

      if (!mounted) {
        return;
      }

      TextInput.finishAutofillContext();
      context.go(homeRouteFor(user.role));
    } on ApiException catch (error) {
      _showApiError(error);
    } catch (_) {
      _showApiError(
        const ApiException(message: 'Đăng nhập thất bại. Vui lòng thử lại.'),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showApiError(ApiException error) {
    if (!mounted) {
      return;
    }

    // Lỗi theo từng trường hiển thị ngay dưới ô nhập tương ứng.
    final Map<String, String> fieldErrors = <String, String>{};
    for (final String field in <String>['identifier', 'password']) {
      final String? message = error.fieldErrors[field];
      if (message != null && message.isNotEmpty) {
        fieldErrors[field] = message;
      }
    }

    setState(() {
      _fieldErrors = fieldErrors;
      // Chỉ hiện banner khi lỗi không gắn được vào ô nhập nào.
      _errorMessage = fieldErrors.isEmpty ? error.message : null;
    });
  }

  void _clearFieldError(String field) {
    if (_fieldErrors.containsKey(field) || _errorMessage != null) {
      setState(() {
        _fieldErrors = Map<String, String>.from(_fieldErrors)..remove(field);
        _errorMessage = null;
      });
    }
  }

  void _onRoleChanged(Set<UserRole> selection) {
    if (_isLoading || selection.isEmpty) {
      return;
    }
    setState(() {
      _role = selection.first;
      _errorMessage = null;
      _fieldErrors = <String, String>{};
    });
  }

  // ---------------------------------------------------------------------------
  // Giao diện
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final ColorScheme colors = theme.colorScheme;

    return Scaffold(
      backgroundColor: colors.primaryContainer,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                  child: Form(
                    key: _formKey,
                    child: AutofillGroup(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          _buildHeader(theme),
                          const SizedBox(height: 24),
                          _buildRoleSelector(),
                          const SizedBox(height: 20),
                          if (_errorMessage != null) ...<Widget>[
                            _buildErrorBanner(theme),
                            const SizedBox(height: 16),
                          ],
                          _buildIdentifierField(),
                          const SizedBox(height: 16),
                          _buildPasswordField(),
                          const SizedBox(height: 8),
                          _buildForgotPasswordLink(),
                          const SizedBox(height: 12),
                          _buildSubmitButton(),
                          if (_role == UserRole.student)
                            _buildRegisterLink(theme),
                          _buildServerFooter(theme),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Column(
      children: <Widget>[
        Icon(
          Icons.notifications_active_rounded,
          size: 56,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 12),
        Text(
          'Olympic Tin học',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Đăng nhập để tiếp tục',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildRoleSelector() {
    return SegmentedButton<UserRole>(
      showSelectedIcon: false,
      segments: const <ButtonSegment<UserRole>>[
        ButtonSegment<UserRole>(
          value: UserRole.student,
          label: Text('Thí sinh'),
          icon: Icon(Icons.school_outlined),
        ),
        ButtonSegment<UserRole>(
          value: UserRole.judge,
          label: Text('Trọng tài'),
          icon: Icon(Icons.gavel_outlined),
        ),
      ],
      selected: <UserRole>{_role},
      onSelectionChanged: _isLoading ? null : _onRoleChanged,
    );
  }

  Widget _buildErrorBanner(ThemeData theme) {
    final ColorScheme colors = theme.colorScheme;

    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: colors.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(Icons.error_outline, color: colors.onErrorContainer),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _errorMessage ?? '',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.onErrorContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIdentifierField() {
    return TextFormField(
      controller: _identifierController,
      enabled: !_isLoading,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      autofillHints: const <String>[
        AutofillHints.username,
        AutofillHints.email,
      ],
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: 'Tên đăng nhập hoặc email',
        prefixIcon: const Icon(Icons.person_outline),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['identifier'],
      ),
      validator: (String? value) {
        if (value == null || value.trim().isEmpty) {
          return 'Vui lòng nhập tên đăng nhập hoặc email';
        }
        return null;
      },
      onChanged: (_) => _clearFieldError('identifier'),
      onFieldSubmitted: (_) => _passwordFocusNode.requestFocus(),
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: _passwordController,
      focusNode: _passwordFocusNode,
      enabled: !_isLoading,
      obscureText: _obscurePassword,
      keyboardType: TextInputType.visiblePassword,
      textInputAction: TextInputAction.done,
      autofillHints: const <String>[AutofillHints.password],
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: 'Mật khẩu',
        prefixIcon: const Icon(Icons.lock_outline),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['password'],
        suffixIcon: IconButton(
          tooltip: _obscurePassword ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
          icon: Icon(
            _obscurePassword
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
          ),
          onPressed: () {
            setState(() => _obscurePassword = !_obscurePassword);
          },
        ),
      ),
      validator: (String? value) {
        if (value == null || value.isEmpty) {
          return 'Vui lòng nhập mật khẩu';
        }
        return null;
      },
      onChanged: (_) => _clearFieldError('password'),
      onFieldSubmitted: (_) => _submit(),
    );
  }

  Widget _buildForgotPasswordLink() {
    return Align(
      alignment: Alignment.centerRight,
      child: TextButton(
        onPressed:
            _isLoading ? null : () => context.push(AppRoutes.forgotPassword),
        child: const Text('Quên mật khẩu?'),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return FilledButton(
      onPressed: _isLoading ? null : _submit,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: _isLoading
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            )
          : const Text(
              'Đăng nhập',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
    );
  }

  Widget _buildRegisterLink(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text('Chưa có tài khoản?', style: theme.textTheme.bodyMedium),
          TextButton(
            onPressed:
                _isLoading ? null : () => context.push(AppRoutes.register),
            child: const Text('Đăng ký'),
          ),
        ],
      ),
    );
  }

  /// Hiển thị địa chỉ Backend đang dùng và cho phép đổi, để dùng được khi IP
  /// máy chủ thay đổi mà không phải build lại ứng dụng.
  Widget _buildServerFooter(ThemeData theme) {
    String serverText;
    try {
      serverText = Env.serverUrl;
    } on StateError catch (error) {
      serverText = error.message.toString();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Flexible(
            child: Text(
              'Máy chủ: $serverText',
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          TextButton(
            onPressed:
                _isLoading ? null : () => showServerSettingsDialog(context),
            child: const Text('Đổi'),
          ),
        ],
      ),
    );
  }
}
