import 'package:flutter_test/flutter_test.dart';
import 'package:contests_mobile_app/core/utils/html_text.dart';

void main() {
  test('giải mã đúng dữ liệu câu hỏi thật', () {
    expect(
      HtmlText.toPlain('<p>Thiết bị n&agrave;o sau đ&acirc;y l&agrave; thiết bị nhập (input device) của m&aacute;y t&iacute;nh?</p>'),
      'Thiết bị nào sau đây là thiết bị nhập (input device) của máy tính?',
    );
    expect(HtmlText.toPlain('<p>1 Byte bằng bao nhi&ecirc;u bit?</p>'), '1 Byte bằng bao nhiêu bit?');
    expect(HtmlText.toPlain('a&nbsp;&nbsp;b &lt;c&gt; &amp; &quot;d&quot; &#39;e&#39;'), 'a b <c> & "d" \'e\'');
    expect(HtmlText.toPlain('&#7921; &#x1EF1;'), 'ự ự');
    expect(HtmlText.toPlain('&amp;agrave;'), '&agrave;'); // không giải mã hai lần
    expect(HtmlText.toPlain('&khongco; &#0;'), '&khongco; &#0;'); // lạ thì giữ nguyên
    expect(HtmlText.toPlain('<p>Dòng 1</p><p>Dòng 2</p>'), 'Dòng 1\nDòng 2');
  });
}
