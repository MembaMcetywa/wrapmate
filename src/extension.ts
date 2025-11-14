import * as vscode from 'vscode';

class LivePreviewController {
  private openTagDecorationType: vscode.TextEditorDecorationType;
  private closeTagDecorationType: vscode.TextEditorDecorationType;
  private highlightDecorationType: vscode.TextEditorDecorationType;
  private editor: vscode.TextEditor;
  private selections: vscode.Selection[];

  constructor(editor: vscode.TextEditor, selections: vscode.Selection[]) {
    this.editor = editor;
    this.selections = selections;

    this.openTagDecorationType = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: '',
        color: 'rgba(100, 150, 200, 0.8)',
        fontWeight: 'bold'
      }
    });

    this.closeTagDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '',
        color: 'rgba(100, 150, 200, 0.8)',
        fontWeight: 'bold'
      }
    });

    this.highlightDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(100, 150, 200, 0.1)',
      borderRadius: '3px'
    });
  }

  async startLivePreview(): Promise<string | undefined> {
  
    this.editor.setDecorations(this.highlightDecorationType, this.selections);

    return new Promise<string | undefined>((resolve) => {
      const inputBox = vscode.window.createInputBox();
      inputBox.placeholder = 'Enter the tag name (e.g., div, span, section)';
      inputBox.prompt = 'Tag name for wrapmate (live preview)';
      inputBox.ignoreFocusOut = false;

      let accepted = false;

      inputBox.onDidChangeValue((value: string) => {
        this.updatePreview(value);
      });


      inputBox.onDidAccept(() => {
        const finalTag = inputBox.value.trim();
        if (finalTag) {
          accepted = true;
          this.cleanup();
          inputBox.hide();
          inputBox.dispose();
          resolve(finalTag);
        }
      });


      inputBox.onDidHide(() => {
        if (!accepted) { 
          this.cleanup();
          resolve(undefined);
        }
        inputBox.dispose();
      });

      inputBox.show();
    });
  }

  private updatePreview(tagName: string): void {
    if (!tagName.trim()) {
     
      this.editor.setDecorations(this.openTagDecorationType, []);
      this.editor.setDecorations(this.closeTagDecorationType, []);
      return;
    }

    const openingTag = `<${tagName}>`;
    const closingTag = `</${tagName}>`;

    const openTagRanges: vscode.DecorationOptions[] = [];
    const closeTagRanges: vscode.DecorationOptions[] = [];

    for (const selection of this.selections) {
      if (!selection.isEmpty) {
        openTagRanges.push({
          range: new vscode.Range(selection.start, selection.start),
          renderOptions: {
            before: {
              contentText: openingTag,
              color: 'rgba(100, 150, 200, 0.8)',
              fontWeight: 'bold'
            }
          }
        });

        closeTagRanges.push({
          range: new vscode.Range(selection.end, selection.end),
          renderOptions: {
            after: {
              contentText: closingTag,
              color: 'rgba(100, 150, 200, 0.8)',
              fontWeight: 'bold'
            }
          }
        });
      }
    }

    this.editor.setDecorations(this.openTagDecorationType, openTagRanges);
    this.editor.setDecorations(this.closeTagDecorationType, closeTagRanges);
  }

  private cleanup(): void {

    this.editor.setDecorations(this.openTagDecorationType, []);
    this.editor.setDecorations(this.closeTagDecorationType, []);
    this.editor.setDecorations(this.highlightDecorationType, []);


    this.openTagDecorationType.dispose();
    this.closeTagDecorationType.dispose();
    this.highlightDecorationType.dispose();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  console.log('✅ WrapMate activated');
  const disposable: vscode.Disposable =
    vscode.commands.registerCommand('extension.wrapmate', async () => {
      const editor: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // !blacklist
      const allowedLanguages = ['html', 'vue', 'javascriptreact', 'typescriptreact'];
      const currentLanguage = editor.document.languageId;

      if (!allowedLanguages.includes(currentLanguage)) {
        vscode.window.showWarningMessage(
          `WrapMate only works in HTML, Vue, JSX, and TSX files. Current file type: ${currentLanguage}`
        );
        return;
      }

      //  selection
      const selections: vscode.Selection[] = Array.from(editor.selections);
      if (selections.every(sel => sel.isEmpty)) {
        vscode.window.showInformationMessage(
          'Please select at least one block of text to wrap.'
        );
        return;
      }

      // live preview controller
      const livePreview = new LivePreviewController(editor, selections);
      const tagName = await livePreview.startLivePreview();

      if (!tagName) {
        return;
      }

      const openingTag: string = `<${tagName}>`;
      const closingTag: string = `</${tagName}>`;

      // apply wrapping
      await editor.edit((editBuilder: vscode.TextEditorEdit) => {
        for (const selection of selections) {
          const text: string = editor.document.getText(selection);
          editBuilder.replace(
            selection,
            `${openingTag}${text}${closingTag}`
          );
        }
      });

  
      await vscode.commands.executeCommand(
        'editor.action.formatDocument'
      );
    });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {

}
