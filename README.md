# WrapMate - HTML Tag Wrapper for VS Code

WrapMate is a powerful VS Code extension that lets you quickly wrap selected HTML text with custom tags. It features a **live preview** that shows exactly where your tags will be placed as you type!

## Features

- ✨ **Live Preview**: See tags appear in real-time as you type
- 🎯 **Multi-Selection Support**: Wrap multiple text blocks simultaneously
- ⚡ **Fast & Intuitive**: Simple keyboard shortcut for quick access
- 🎨 **Visual Feedback**: Highlighted preview shows exactly what will be wrapped
- 🔄 **Smart Cancellation**: Press ESC to cancel without any changes

## Usage

1. Select the text you want to wrap in an HTML file
2. Press `Ctrl+Shift+W` (Windows/Linux) or `Cmd+Shift+W` (Mac)
3. Type the tag name (e.g., `div`, `span`, `section`)
4. Watch the live preview update as you type
5. Press `Enter` to apply or `ESC` to cancel

### Example

Before:
```html
Hello World
```

After wrapping with `div`:
```html
<div>Hello World</div>
```

## Multiple Selections

WrapMate supports wrapping multiple selections at once:

1. Hold `Alt` (Windows/Linux) or `Option` (Mac) and click to create multiple cursors
2. Select different text blocks
3. Use WrapMate to wrap all selections with the same tag

## Requirements

- VS Code version 1.93.0 or higher
- Works with HTML files

## Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|--------------|-----|
| Wrap with Element | `Ctrl+Shift+W` | `Cmd+Shift+W` |

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P` to open the Quick Open dialog
3. Type `ext install wrapmate` to find the extension
4. Click the Install button

## Known Issues

Please report any issues on our [GitHub repository](https://github.com/MembaMcetywa/wrapmate/issues).

## Release Notes

### 1.0.0

- Initial release
- Live preview feature
- Multi-selection support
- Visual feedback with decorations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoy using WrapMate!** If you find it helpful, please consider rating it on the VS Code Marketplace.
