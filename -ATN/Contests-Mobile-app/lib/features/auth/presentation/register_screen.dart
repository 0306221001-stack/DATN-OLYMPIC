import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/app_routes.dart';
import '../data/account_api.dart';
import '../domain/class_option.dart';
import 'auth_validators.dart';

/// Màn hình đăng ký tài khoản Thí sinh.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();

  List<ClassOption> _classes = <ClassOption>[];
  int? _selectedClassId;

  bool _isLoadingClasses = true;
  String? _classesError;

  bool _isSubmitting = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  String? _errorMessage;
  Map<String, String> _fieldErrors = <String, String>{};

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Dữ liệu
  // ---------------------------------------------------------------------------

  Future<void> _loadClasses() async {
    setState(() {
      _isLoadingClasses = true;
      _classesError = null;
    });

    try {
      final List<ClassOption> classes =
          await ref.read(accountApiProvider).fetchClasses();
      if (!mounted) {
        return;
      }
      setState(() {
        _classes = classes;
        if (_selectedClassId != null &&
            !classes.any((ClassOption c) => c.id == _selectedClassId)) {
          _selectedClassId = null;
        }
        _classesError = classes.isEmpty
            ? 'Hiện chưa có lớp nào để đăng ký. Vui lòng liên hệ ban tổ chức.'
            : null;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _classesError = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _classesError = 'Không thể tải danh sách lớp.');
    } finally {
      if (mounted) {
        setState(() => _isLoadingClasses = false);
      }
    }
  }

  Future<void> _submit() async {
    if (_isSubmitting) {
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

    setState(() => _isSubmitting = true);

    try {
      final String message = await ref.read(accountApiProvider).registerStudent(
            username: _usernameController.text.trim(),
            fullName: _fullNameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            confirmPassword: _confirmController.text,
            classId: _selectedClassId!,
          );

      if (!mounted) {
        return;
      }
      await _showSuccessDialog(message);
      if (!mounted) {
        return;
      }
      context.go(AppRoutes.login);
    } on ApiException catch (error) {
      _showApiError(error);
    } catch (_) {
      _showApiError(
        const ApiException(message: 'Đăng ký thất bại. Vui lòng thử lại.'),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _showSuccessDialog(String message) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          icon: Icon(
            Icons.check_circle_rounded,
            size: 48,
            color: Theme.of(dialogContext).colorScheme.primary,
          ),
          title: const Text('Đăng ký thành công'),
          content: Text(message),
          actions: <Widget>[
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Đến trang đăng nhập'),
            ),
          ],
        );
      },
    );
  }

  void _showApiError(ApiException error) {
    if (!mounted) {
      return;
    }

    const List<String> knownFields = <String>[
      'username',
      'fullName',
      'email',
      'password',
      'confirmPassword',
      'classId',
    ];

    final Map<String, String> fieldErrors = <String, String>{};
    for (final String field in knownFields) {
      final String? message = error.fieldErrors[field];
      if (message != null && message.isNotEmpty) {
        fieldErrors[field] = message;
      }
    }

    setState(() {
      _fieldErrors = fieldErrors;
      // Backend báo trùng tên tài khoản hoặc email qua message chung; gắn
      // vào ô nhập tương ứng để người dùng thấy ngay chỗ cần sửa.
      final String lower = error.message.toLowerCase();
      if (fieldErrors.isEmpty && lower.contains('email')) {
        _fieldErrors = <String, String>{'email': error.message};
        _errorMessage = null;
      } else if (fieldErrors.isEmpty &&
          (lower.contains('tên tài khoản') ||
              lower.contains('username') ||
              lower.contains('tên đăng nhập'))) {
        _fieldErrors = <String, String>{'username': error.message};
        _errorMessage = null;
      } else {
        _errorMessage = fieldErrors.isEmpty ? error.message : null;
      }
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

  // ---------------------------------------------------------------------------
  // Giao diện
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.primaryContainer,
      appBar: AppBar(
        title: const Text('Đăng ký thí sinh'),
        backgroundColor: Colors.transparent,
        leading: BackButton(
          onPressed: _isSubmitting
              ? null
              : () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go(AppRoutes.login);
                  }
                },
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          'Tạo tài khoản thí sinh',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Điền đầy đủ thông tin bên dưới để đăng ký.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 20),
                        if (_errorMessage != null) ...<Widget>[
                          _buildErrorBanner(theme),
                          const SizedBox(height: 16),
                        ],
                        _buildFullNameField(),
                        const SizedBox(height: 16),
                        _buildUsernameField(),
                        const SizedBox(height: 16),
                        _buildEmailField(),
                        const SizedBox(height: 16),
                        _buildClassField(theme),
                        const SizedBox(height: 16),
                        _buildPasswordField(),
                        const SizedBox(height: 16),
                        _buildConfirmField(),
                        const SizedBox(height: 24),
                        _buildSubmitButton(),
                        _buildLoginLink(theme),
                      ],
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

  Widget _buildFullNameField() {
    return TextFormField(
      controller: _fullNameController,
      enabled: !_isSubmitting,
      textInputAction: TextInputAction.next,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: 'Họ và tên',
        prefixIcon: const Icon(Icons.badge_outlined),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['fullName'],
      ),
      validator: AuthValidators.fullName,
      onChanged: (_) => _clearFieldError('fullName'),
    );
  }

  Widget _buildUsernameField() {
    return TextFormField(
      controller: _usernameController,
      enabled: !_isSubmitting,
      textInputAction: TextInputAction.next,
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: 'Tên tài khoản',
        helperText: 'Từ 3 đến 20 ký tự',
        prefixIcon: const Icon(Icons.person_outline),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['username'],
      ),
      validator: AuthValidators.username,
      onChanged: (_) => _clearFieldError('username'),
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: _emailController,
      enabled: !_isSubmitting,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
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
    );
  }

  Widget _buildClassField(ThemeData theme) {
    if (_isLoadingClasses) {
      return const InputDecorator(
        decoration: InputDecoration(
          labelText: 'Lớp',
          prefixIcon: Icon(Icons.school_outlined),
          border: OutlineInputBorder(),
        ),
        child: Row(
          children: <Widget>[
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Đang tải danh sách lớp...'),
          ],
        ),
      );
    }

    if (_classes.isEmpty) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: 'Lớp',
          prefixIcon: const Icon(Icons.school_outlined),
          border: const OutlineInputBorder(),
          errorText: _classesError,
          errorMaxLines: 3,
        ),
        child: Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _loadClasses,
            icon: const Icon(Icons.refresh),
            label: const Text('Tải lại'),
          ),
        ),
      );
    }

    return DropdownButtonFormField<int>(
      initialValue: _selectedClassId,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: 'Lớp - Trường',
        prefixIcon: const Icon(Icons.school_outlined),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['classId'],
        errorMaxLines: 2,
      ),
      items: _classes
          .map(
            (ClassOption option) => DropdownMenuItem<int>(
              value: option.id,
              child: Text(option.label, overflow: TextOverflow.ellipsis),
            ),
          )
          .toList(),
      onChanged: _isSubmitting
          ? null
          : (int? value) {
              setState(() => _selectedClassId = value);
              _clearFieldError('classId');
            },
      validator: (int? value) => value == null ? 'Vui lòng chọn lớp' : null,
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: _passwordController,
      enabled: !_isSubmitting,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.next,
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: 'Mật khẩu',
        helperText: 'Ít nhất 8 ký tự, gồm chữ hoa và chữ thường',
        prefixIcon: const Icon(Icons.lock_outline),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['password'],
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
      onChanged: (_) => _clearFieldError('password'),
    );
  }

  Widget _buildConfirmField() {
    return TextFormField(
      controller: _confirmController,
      enabled: !_isSubmitting,
      obscureText: _obscureConfirm,
      textInputAction: TextInputAction.done,
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: 'Xác nhận mật khẩu',
        prefixIcon: const Icon(Icons.lock_reset_outlined),
        border: const OutlineInputBorder(),
        errorText: _fieldErrors['confirmPassword'],
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
      validator: (String? value) =>
          AuthValidators.confirmPassword(value, _passwordController.text),
      onChanged: (_) => _clearFieldError('confirmPassword'),
      onFieldSubmitted: (_) => _submit(),
    );
  }

  Widget _buildSubmitButton() {
    final bool canSubmit =
        !_isSubmitting && !_isLoadingClasses && _classes.isNotEmpty;

    return FilledButton(
      onPressed: canSubmit ? _submit : null,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: _isSubmitting
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            )
          : const Text(
              'Đăng ký',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
    );
  }

  Widget _buildLoginLink(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text('Đã có tài khoản?', style: theme.textTheme.bodyMedium),
          TextButton(
            onPressed: _isSubmitting ? null : () => context.go(AppRoutes.login),
            child: const Text('Đăng nhập'),
          ),
        ],
      ),
    );
  }
}
