import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.wrapWithElement",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return; // No open text editor
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) {
        vscode.window.showInformationMessage(
          "Please select some text to wrap."
        );
        return;
      }

      const tagName = await vscode.window.showInputBox({
        placeHolder: "Enter the tag name (e.g., div, span, section)",
      });

      if (!tagName) {
        return; // Input canceled
      }

      const openingTag = `<${tagName}>`;
      const closingTag = `</${tagName}>`;

      editor.edit((editBuilder) => {
        editBuilder.replace(
          selection,
          `${openingTag}${selectedText}${closingTag}`
        );
      });
    }
  );

  context.subscriptions.push(disposable);
}
