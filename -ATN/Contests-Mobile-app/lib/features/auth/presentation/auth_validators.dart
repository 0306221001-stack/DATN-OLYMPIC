/// Các hàm kiểm tra dữ liệu nhập, khớp với luật của Backend
/// (`auth.schema.ts`): tên tài khoản 3-20 ký tự, mật khẩu từ 8 ký tự có cả
/// chữ hoa và chữ thường.
class AuthValidators {
  const AuthValidators._();

  static final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _lowerCase = RegExp(r'[a-z]');
  static final RegExp _upperCase = RegExp(r'[A-Z]');
  static final RegExp _otpPattern = RegExp(r'^\d{6}$');

  static String? username(String? value) {
    final String text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập tên tài khoản';
    }
    if (text.length < 3) {
      return 'Tên tài khoản ít nhất 3 ký tự';
    }
    if (text.length > 20) {
      return 'Tên tài khoản tối đa 20 ký tự';
    }
    return null;
  }

  static String? fullName(String? value) {
    final String text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập họ và tên';
    }
    if (text.length > 255) {
      return 'Họ và tên tối đa 255 ký tự';
    }
    return null;
  }

  static String? email(String? value) {
    final String text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập email';
    }
    if (!_emailPattern.hasMatch(text)) {
      return 'Vui lòng nhập đúng định dạng email';
    }
    return null;
  }

  static String? password(String? value) {
    final String text = value ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập mật khẩu';
    }
    if (text.length < 8 ||
        !_lowerCase.hasMatch(text) ||
        !_upperCase.hasMatch(text)) {
      return 'Mật khẩu ít nhất 8 ký tự, gồm chữ hoa và chữ thường';
    }
    return null;
  }

  static String? confirmPassword(String? value, String password) {
    final String text = value ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập lại mật khẩu';
    }
    if (text != password) {
      return 'Mật khẩu xác nhận không khớp';
    }
    return null;
  }

  static String? otp(String? value) {
    final String text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Vui lòng nhập mã OTP';
    }
    if (!_otpPattern.hasMatch(text)) {
      return 'Mã OTP gồm đúng 6 chữ số';
    }
    return null;
  }
}
