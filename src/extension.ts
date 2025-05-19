import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  console.log('✅ WrapMate activated');

  const disposable: vscode.Disposable =
    vscode.commands.registerCommand('extension.wrapmate', async () => {
      const editor: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;
      if (!editor) {
        return; // no open editor
      }

      // multi-block selection
      const selections: vscode.Selection[] = Array.from(editor.selections);
      // if *all* selections are empty, prompt for at least one
      if (selections.every(sel => sel.isEmpty)) {
        vscode.window.showInformationMessage(
          'Please select at least one block of text to wrap.'
        );
        return;
      }

      const tagName: string | undefined = await vscode.window.showInputBox({
        placeHolder: 'Enter the tag name (e.g., div, span, section)',
        prompt: 'Tag name for wrapmate',
        validateInput: value =>
          value.trim() === '' ? 'Tag name cannot be empty' : null
      });
      if (!tagName) {
        return; // user canceled
      }

      const openingTag: string = `<${tagName}>`;
      const closingTag: string = `</${tagName}>`;

      // apply all wraps in one edit
      await editor.edit((editBuilder: vscode.TextEditorEdit) => {
        for (const selection of selections) {
          const text: string = editor.document.getText(selection);
          editBuilder.replace(
            selection,
            `${openingTag}${text}${closingTag}`
          );
        }
      });

      // auto-indent / format the file
      await vscode.commands.executeCommand(
        'editor.action.formatDocument'
      );
    });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // nothing to clean up
}
