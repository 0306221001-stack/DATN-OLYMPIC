import 'package:flutter/material.dart';

import '../../../core/config/env.dart';
import '../../../core/config/server_settings.dart';

/// Hộp thoại đổi địa chỉ Backend. Địa chỉ mới có hiệu lực sau khi đóng hẳn và
/// mở lại ứng dụng.
Future<void> showServerSettingsDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (BuildContext context) => const _ServerSettingsDialog(),
  );
}

class _ServerSettingsDialog extends StatefulWidget {
  const _ServerSettingsDialog();

  @override
  State<_ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<_ServerSettingsDialog> {
  late final TextEditingController _controller =
      TextEditingController(text: Env.serverUrl);

  bool _isBusy = false;
  bool _saved = false;
  String? _message;
  bool _messageIsError = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _test() async {
    final String? url = _readUrl();
    if (url == null) {
      return;
    }
    setState(() {
      _isBusy = true;
      _message = null;
    });
    final bool ok = await ServerSettings.testConnection(url);
    if (!mounted) {
      return;
    }
    setState(() {
      _isBusy = false;
      _messageIsError = !ok;
      _message = ok
          ? 'Kết nối được tới máy chủ.'
          : 'Không kết nối được. Kiểm tra máy chủ đã chạy, cùng Wi-Fi và '
              'tường lửa đã mở cổng.';
    });
  }

  Future<void> _save() async {
    final String? url = _readUrl();
    if (url == null) {
      return;
    }
    setState(() {
      _isBusy = true;
      _message = null;
    });
    try {
      await ServerSettings.save(url);
      if (!mounted) {
        return;
      }
      setState(() {
        _isBusy = false;
        _saved = true;
        _messageIsError = false;
        _controller.text = url;
        _message = 'Đã lưu. Hãy đóng hẳn ứng dụng rồi mở lại để áp dụng.';
      });
    } on FormatException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isBusy = false;
        _messageIsError = true;
        _message = error.message;
      });
    }
  }

  Future<void> _reset() async {
    setState(() => _isBusy = true);
    await ServerSettings.clear();
    if (!mounted) {
      return;
    }
    setState(() {
      _isBusy = false;
      _saved = true;
      _messageIsError = false;
      _message = 'Đã xóa địa chỉ đã lưu. Hãy đóng hẳn ứng dụng rồi mở lại.';
    });
  }

  String? _readUrl() {
    try {
      final String url = ServerSettings.normalize(_controller.text);
      _controller.text = url;
      return url;
    } on FormatException catch (error) {
      setState(() {
        _messageIsError = true;
        _message = error.message;
      });
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Địa chỉ máy chủ'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              'Nhập địa chỉ máy chạy Backend, ví dụ http://192.168.1.12:3000. '
              'Điện thoại phải cùng mạng Wi-Fi với máy đó.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              enabled: !_isBusy,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Địa chỉ máy chủ',
                border: OutlineInputBorder(),
              ),
            ),
            if (_message != null) ...<Widget>[
              const SizedBox(height: 12),
              Text(
                _message!,
                style: TextStyle(
                  color: _messageIsError
                      ? theme.colorScheme.error
                      : Colors.green.shade700,
                ),
              ),
            ],
            if (_isBusy) ...<Widget>[
              const SizedBox(height: 12),
              const LinearProgressIndicator(),
            ],
          ],
        ),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: _isBusy ? null : _reset,
          child: const Text('Đặt lại'),
        ),
        TextButton(
          onPressed: _isBusy ? null : _test,
          child: const Text('Kiểm tra'),
        ),
        FilledButton(
          onPressed:
              _isBusy ? null : (_saved ? () => Navigator.pop(context) : _save),
          child: Text(_saved ? 'Đóng' : 'Lưu'),
        ),
      ],
    );
  }
}
