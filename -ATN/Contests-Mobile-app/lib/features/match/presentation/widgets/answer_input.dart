import 'package:flutter/material.dart';

/// Danh sách phương án trắc nghiệm.
class AnswerOptions extends StatelessWidget {
  const AnswerOptions({
    super.key,
    required this.options,
    required this.selected,
    required this.enabled,
    required this.onSelected,
  });

  final List<String> options;
  final String selected;
  final bool enabled;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Column(
      children: <Widget>[
        for (final String option in options)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _OptionTile(
              label: option,
              isSelected: option == selected,
              enabled: enabled,
              theme: theme,
              onTap: () => onSelected(option),
            ),
          ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.isSelected,
    required this.enabled,
    required this.theme,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final bool enabled;
  final ThemeData theme;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = theme.colorScheme;
    final Color border = isSelected ? scheme.primary : scheme.outlineVariant;
    final Color background =
        isSelected ? scheme.primaryContainer : scheme.surfaceContainerLow;

    return Opacity(
      opacity: enabled || isSelected ? 1 : 0.6,
      child: Material(
        color: background,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: border, width: isSelected ? 2 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: <Widget>[
                Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: isSelected ? scheme.primary : scheme.outline,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(label, style: theme.textTheme.bodyLarge),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Ô nhập đáp án tự luận. Tạo lại (đổi `key`) khi sang câu mới.
class EssayInput extends StatefulWidget {
  const EssayInput({
    super.key,
    required this.initialValue,
    required this.enabled,
    required this.onChanged,
    this.onSubmitted,
  });

  final String initialValue;
  final bool enabled;
  final ValueChanged<String> onChanged;
  final VoidCallback? onSubmitted;

  @override
  State<EssayInput> createState() => _EssayInputState();
}

class _EssayInputState extends State<EssayInput> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initialValue);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      maxLength: 500,
      minLines: 2,
      maxLines: 5,
      textInputAction: TextInputAction.done,
      decoration: const InputDecoration(
        labelText: 'Đáp án của bạn',
        alignLabelWithHint: true,
        border: OutlineInputBorder(),
      ),
      onChanged: widget.onChanged,
      onSubmitted: (_) => widget.onSubmitted?.call(),
    );
  }
}
