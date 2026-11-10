import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/app_routes.dart';
import '../data/account_api.dart';
import 'auth_validators.dart';

enum _ResetStep { email, otp, newPassword, success }

/// Quên mật khẩu bằng OTP: nhập email, nhập mã 6 số, đặt mật khẩu mới.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  static const int _otpLifetimeSeconds = 120;

  final GlobalKey<FormState> _emailFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _otpFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _passwordFormKey = GlobalKey<FormState>();

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();

  _ResetStep _step = _ResetStep.email;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  String? _errorMessage;
  String? _infoMessage;
  Map<String, String> _fieldErrors = <String, String>{};

  /// Email và OTP đã được máy chủ chấp nhận, dùng cho bước đặt mật khẩu.
  String _confirmedEmail = '';
  String _confirmedOtp = '';

  Timer? _countdownTimer;
  int _secondsLeft = 0;

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _emailController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Đếm ngược OTP
  // ---------------------------------------------------------------------------

  void _startCountdown() {
    _countdownTimer?.cancel();
    setState(() => _secondsLeft = _otpLifetimeSeconds);

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsLeft <= 1) {
        timer.cancel();
        setState(() => _secondsLeft = 0);
        return;
      }
      setState(() => _secondsLeft -= 1);
    });
  }

  String get _countdownText {
    final int minutes = _secondsLeft ~/ 60;
    final int seconds = _secondsLeft % 60;
    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  // ---------------------------------------------------------------------------
  // Các bước gọi API
  // ---------------------------------------------------------------------------

  void _resetMessages() {
    _errorMessage = null;
    _infoMessage = null;
    _fieldErrors = <String, String>{};
  }

  Future<void> _sendOtp({required bool isResend}) async {
    if (_isLoading) {
      return;
    }
    FocusScope.of(context).unfocus();

    if (!isResend && !(_emailFormKey.currentState?.validate() ?? false)) {
      return;
    }

    final String email =
        isResend ? _confirmedEmail : _emailController.text.trim();

    setState(() {
      _resetMessages();
      _isLoading = true;
    });

    try {
      final String message =
          await ref.read(accountApiProvider).sendOtp(email: email);
      if (!mounted) {
        return;
      }
      _confirmedEmail = email;
      _otpController.clear();
      setState(() {
        _step = _ResetStep.otp;
        _infoMessage = message;
      });
      _startCountdown();
    } on ApiException catch (error) {
      _showApiError(error, fields: const <String>['email']);
    } catch (_) {
      _showApiError(
        const ApiException(message: 'Không thể gửi mã OTP. Vui lòng thử lại.'),
        fields: const <String>['email'],
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _verifyOtp() async {
    if (_isLoading) {
      return;
    }
    FocusScope.of(context).unfocus();

    if (!(_otpFormKey.currentState?.validate() ?? false)) {
      return;
    }

    if (_secondsLeft == 0) {
      setState(() {
        _resetMessages();
        _errorMessage = 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.';
      });
      return;
    }

    final String otp = _otpController.text.trim();

    setState(() {
      _resetMessages();
      _isLoading = true;
    });

    try {
      await ref
          .read(accountApiProvider)
          .verifyOtp(email: _confirmedEmail, otp: otp);
      if (!mounted) {
        return;
      }
      _confirmedOtp = otp;
      setState(() => _step = _ResetStep.newPassword);
    } on ApiException catch (error) {
      _showApiError(error, fields: const <String>['otp']);
    } catch (_) {
      _showApiError(
        const ApiException(
          message: 'Không thể xác thực mã OTP. Vui lòng thử lại.',
        ),
        fields: const <String>['otp'],
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resetPassword() async {
    if (_isLoading) {
      return;
    }
    FocusScope.of(context).unfocus();

    if (!(_passwordFormKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _resetMessages();
      _isLoading = true;
    });

    try {
      await ref.read(accountApiProvider).resetPassword(
            email: _confirmedEmail,
            otp: _confirmedOtp,
            newPassword: _passwordController.text,
            confirmNewPassword: _confirmController.text,
          );
      if (!mounted) {
        return;
      }
      _countdownTimer?.cancel();
      setState(() => _step = _ResetStep.success);
    } on ApiException catch (error) {
      _showApiError(
        error,
        fields: const <String>['newPassword', 'confirmNewPassword'],
      );
    } catch (_) {
      _showApiError(
        const ApiException(
          message: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
        ),
        fields: const <String>['newPassword', 'confirmNewPassword'],
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showApiError(ApiException error, {required List<String> fields}) {
    if (!mounted) {
      return;
    }

    final Map<String, String> fieldErrors = <String, String>{};
    for (final String field in fields) {
      final String? message = error.fieldErrors[field];
      if (message != null && message.isNotEmpty) {
        fieldErrors[field] = message;
      }
    }

    setState(() {
      _infoMessage = null;
      _fieldErrors = fieldErrors;
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

  void _backToEmail() {
    if (_isLoading) {
      return;
    }
    _countdownTimer?.cancel();
    setState(() {
      _resetMessages();
      _secondsLeft = 0;
      _step = _ResetStep.email;
    });
  }

  void _backToOtp() {
    if (_isLoading) {
      return;
    }
    setState(() {
      _resetMessages();
      _step = _ResetStep.otp;
    });
  }

  void _goToLogin() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.login);
    }
  }

  // ---------------------------------------------------------------------------
  // Giao diện
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.primaryContainer,
      appBar: AppBar(
        title: const Text('Quên mật khẩu'),
        backgroundColor: Colors.transparent,
        leading: BackButton(onPressed: _isLoading ? null : _goToLogin),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      if (_step != _ResetStep.success) ...<Widget>[
                        _buildProgress(theme),
                        const SizedBox(height: 20),
                      ],
                      if (_errorMessage != null) ...<Widget>[
                        _buildBanner(
                          theme,
                          message: _errorMessage!,
                          isError: true,
                        ),
                        const SizedBox(height: 16),
                      ] else if (_infoMessage != null) ...<Widget>[
                        _buildBanner(
                          theme,
                          message: _infoMessage!,
                          isError: false,
                        ),
                        const SizedBox(height: 16),
                      ],
                      _buildStepContent(theme),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProgress(ThemeData theme) {
    const List<String> labels = <String>[
      'Email',
      'Mã OTP',
      'Mật khẩu mới',
    ];
    final int current = _step.index;

    return Row(
      children: List<Widget>.generate(labels.length, (int index) {
        final bool done = index < current;
        final bool active = index == current;
        final Color color = (done || active)
            ? theme.colorScheme.primary
            : theme.colorScheme.outlineVariant;

        return Expanded(
          child: Column(
            children: <Widget>[
              Container(
                height: 4,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                labels[index],
                style: theme.textTheme.labelSmall?.copyWith(
                  color: active
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurfaceVariant,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildBanner(
    ThemeData theme, {
    required String message,
    required bool isError,
  }) {
    final ColorScheme colors = theme.colorScheme;
    final Color background =
        isError ? colors.errorContainer : colors.secondaryContainer;
    final Color foreground =
        isError ? colors.onErrorContainer : colors.onSecondaryContainer;

    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(
              isError ? Icons.error_outline : Icons.info_outline,
              color: foreground,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium?.copyWith(color: foreground),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent(ThemeData theme) {
    switch (_step) {
      case _ResetStep.email:
        return _buildEmailStep(theme);
      case _ResetStep.otp:
        return _buildOtpStep(theme);
      case _ResetStep.newPassword:
        return _buildPasswordStep(theme);
      case _ResetStep.success:
        return _buildSuccessStep(theme);
    }
  }

  Widget _buildEmailStep(ThemeData theme) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Nhập email của tài khoản',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Chúng tôi sẽ gửi mã OTP gồm 6 chữ số đến email này.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _emailController,
            enabled: !_isLoading,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            decoration: InputDecoration(
              labelText: 'Email',
              prefixIcon: const Icon(Icons.email_outlined),
              border: const OutlineInputBorder(),
              errorText: _fieldErrors['email'],
            ),
            validator: AuthValidators.email,
            onChanged: (_) => _clearFieldError('email'),
            onFieldSubmitted: (_) => _sendOtp(isResend: false),
          ),
          const SizedBox(height: 20),
          _primaryButton(
            label: 'Gửi mã OTP',
            onPressed: () => _sendOtp(isResend: false),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpStep(ThemeData theme) {
    final bool expired = _secondsLeft == 0;

    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Nhập mã xác thực',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Mã OTP đã được gửi đến $_confirmedEmail.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _otpController,
            enabled: !_isLoading,
            keyboardType: TextInputType.number,
            textInputAction: TextInputAction.done,
            textAlign: TextAlign.center,
            maxLength: 6,
            inputFormatters: <TextInputFormatter>[
              FilteringTextInputFormatter.digitsOnly,
            ],
            style: theme.textTheme.headlineSmall?.copyWith(
              letterSpacing: 8,
              fontWeight: FontWeight.w700,
            ),
            decoration: InputDecoration(
              labelText: 'Mã OTP (6 chữ số)',
              counterText: '',
              border: const OutlineInputBorder(),
              errorText: _fieldErrors['otp'],
            ),
            validator: AuthValidators.otp,
            onChanged: (_) => _clearFieldError('otp'),
            onFieldSubmitted: (_) => _verifyOtp(),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                expired ? 'Mã đã hết hạn' : 'Hết hạn sau $_countdownText',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: expired
                      ? theme.colorScheme.error
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),
              TextButton(
                onPressed: (_isLoading || !expired)
                    ? null
                    : () => _sendOtp(isResend: true),
                child: const Text('Gửi lại mã'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _primaryButton(label: 'Xác thực', onPressed: _verifyOtp),
          TextButton(
            onPressed: _isLoading ? null : _backToEmail,
            child: const Text('Đổi email khác'),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordStep(ThemeData theme) {
    return Form(
      key: _passwordFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Đặt mật khẩu mới',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Mật khẩu ít nhất 8 ký tự, gồm chữ hoa và chữ thường.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _passwordController,
            enabled: !_isLoading,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            enableSuggestions: false,
            decoration: InputDecoration(
              labelText: 'Mật khẩu mới',
              prefixIcon: const Icon(Icons.lock_outline),
              border: const OutlineInputBorder(),
              errorText: _fieldErrors['newPassword'],
              errorMaxLines: 2,
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
            validator: AuthValidators.password,
            onChanged: (_) => _clearFieldError('newPassword'),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmController,
            enabled: !_isLoading,
            obscureText: _obscureConfirm,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            decoration: InputDecoration(
              labelText: 'Xác nhận mật khẩu mới',
              prefixIcon: const Icon(Icons.lock_reset_outlined),
              border: const OutlineInputBorder(),
              errorText: _fieldErrors['confirmNewPassword'],
              errorMaxLines: 2,
              suffixIcon: IconButton(
                tooltip: _obscureConfirm ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                icon: Icon(
                  _obscureConfirm
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
                onPressed: () {
                  setState(() => _obscureConfirm = !_obscureConfirm);
                },
              ),
            ),
            validator: (String? value) => AuthValidators.confirmPassword(
              value,
              _passwordController.text,
            ),
            onChanged: (_) => _clearFieldError('confirmNewPassword'),
            onFieldSubmitted: (_) => _resetPassword(),
          ),
          const SizedBox(height: 20),
          _primaryButton(label: 'Đặt lại mật khẩu', onPressed: _resetPassword),
          TextButton(
            onPressed: _isLoading ? null : _backToOtp,
            child: const Text('Quay lại bước nhập OTP'),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Icon(
          Icons.check_circle_rounded,
          size: 64,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Đặt lại mật khẩu thành công',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Bạn có thể đăng nhập bằng mật khẩu mới.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => context.go(AppRoutes.login),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Về trang đăng nhập',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _primaryButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return FilledButton(
      onPressed: _isLoading ? null : onPressed,
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
          : Text(
              label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
    );
  }
}
