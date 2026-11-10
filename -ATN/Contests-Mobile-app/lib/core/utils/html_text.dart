/// Chuyển nội dung HTML đơn giản (như `<p>...</p>` do trình soạn thảo của
/// Admin tạo ra) thành văn bản thuần để hiển thị trên app.
class HtmlText {
  const HtmlText._();

  static final RegExp _lineBreak =
      RegExp(r'<\s*(br|/p|/div|/li)\s*/?>', caseSensitive: false);
  static final RegExp _tag = RegExp(r'<[^>]*>');
  static final RegExp _manySpaces = RegExp(r'[ \t]{2,}');
  static final RegExp _manyNewLines = RegExp(r'\n{3,}');

  static String toPlain(String? html) {
    if (html == null || html.isEmpty) {
      return '';
    }
    String text = html.replaceAll(_lineBreak, '\n').replaceAll(_tag, '');
    text = text
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'");
    text = text.replaceAll(_manySpaces, ' ').replaceAll(_manyNewLines, '\n\n');
    return text.trim();
  }
}
