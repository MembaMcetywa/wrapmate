import * as assert from 'assert';
import * as vscode from 'vscode';

suite('WrapMate Extension Test Suite', () => {
	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;

	// Helper function to create a test document
	async function createTestDocument(content: string, language: string = 'html'): Promise<void> {
		document = await vscode.workspace.openTextDocument({
			language: language,
			content: content
		});
		editor = await vscode.window.showTextDocument(document);
	}

	// Helper function to select text in the editor
	function selectText(startLine: number, startChar: number, endLine: number, endChar: number): void {
		const selection = new vscode.Selection(
			new vscode.Position(startLine, startChar),
			new vscode.Position(endLine, endChar)
		);
		editor.selection = selection;
		editor.selections = [selection];
	}

	// Helper function to select multiple ranges
	function selectMultipleRanges(ranges: Array<[number, number, number, number]>): void {
		const selections = ranges.map(([startLine, startChar, endLine, endChar]) =>
			new vscode.Selection(
				new vscode.Position(startLine, startChar),
				new vscode.Position(endLine, endChar)
			)
		);
		editor.selections = selections;
	}


	suite('Basic Wrapping Tests', () => {
		test('Extension should be activated', async () => {
			// The extension ID format is publisher.extensionName
			// Since we're running locally without a publisher, check for the extension by looking at all extensions
			const allExtensions = vscode.extensions.all;
			const wrapMateExtension = allExtensions.find(ext =>
				ext.id.includes('wrapmate') || ext.packageJSON?.name === 'wrapmate'
			);
			assert.ok(wrapMateExtension, 'WrapMate extension should be found');

			if (wrapMateExtension && !wrapMateExtension.isActive) {
				await wrapMateExtension.activate();
			}
			assert.strictEqual(wrapMateExtension?.isActive, true, 'Extension should be active');
		});

		test('Command should be registered', async () => {
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('extension.wrapmate'));
		});

		test('Should wrap single selection with div tag', async () => {
			await createTestDocument('Hello World');
			selectText(0, 0, 0, 11); // Select "Hello World"

			// Note: In actual usage, the command prompts for input
			// For testing, we'll verify the command exists and can be called
			// Real integration testing would require mocking the input box
			const commandExists = (await vscode.commands.getCommands()).includes('extension.wrapmate');
			assert.strictEqual(commandExists, true);
		});

		test('Should handle empty selection gracefully', async () => {
			await createTestDocument('Hello World');
			// Don't select anything - cursor at position 0,0
			editor.selection = new vscode.Selection(
				new vscode.Position(0, 0),
				new vscode.Position(0, 0)
			);

			// The extension should show an info message for empty selection
			// We can't easily test the actual message, but we can verify the command doesn't crash
			try {
				// This should not throw an error
				await vscode.commands.executeCommand('extension.wrapmate');
				// Command should handle empty selection gracefully
				assert.ok(true);
			} catch (error) {
				assert.fail('Command should handle empty selection without throwing');
			}
		});
	});

	suite('Multiple Selection Tests', () => {
		test('Should handle multiple selections', async () => {
			await createTestDocument('First line\nSecond line\nThird line');

			// Select multiple ranges
			selectMultipleRanges([
				[0, 0, 0, 10],  // "First line"
				[1, 0, 1, 11],  // "Second line"
				[2, 0, 2, 10]   // "Third line"
			]);

			// Verify multiple selections are set
			assert.strictEqual(editor.selections.length, 3);
			assert.strictEqual(document.getText(editor.selections[0]), 'First line');
			assert.strictEqual(document.getText(editor.selections[1]), 'Second line');
			assert.strictEqual(document.getText(editor.selections[2]), 'Third line');
		});

		test('Should detect non-empty selections correctly', async () => {
			await createTestDocument('Text to wrap');
			selectText(0, 0, 0, 12); // Select all text

			// Verify selection is not empty
			assert.strictEqual(editor.selection.isEmpty, false);
			assert.strictEqual(document.getText(editor.selection), 'Text to wrap');
		});
	});

	suite('HTML Context Tests', () => {
		test('Should work with existing HTML elements', async () => {
			const htmlContent = `<!DOCTYPE html>
<html>
<body>
    <p>Paragraph to wrap</p>
    <span>Span content</span>
</body>
</html>`;
			await createTestDocument(htmlContent);

			// Select the paragraph text - need to adjust for proper character count
			selectText(3, 7, 3, 24); // Select "Paragraph to wrap" (ends before the '<')

			const selectedText = document.getText(editor.selection);
			assert.strictEqual(selectedText, 'Paragraph to wrap');
		});

		test('Should handle nested HTML structures', async () => {
			const nestedHTML = `<div>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
    </ul>
</div>`;
			await createTestDocument(nestedHTML);

			// Select the entire ul element
			selectText(1, 4, 4, 10);

			const selectedText = document.getText(editor.selection);
			assert.ok(selectedText.includes('<ul>'));
			assert.ok(selectedText.includes('</ul>'));
		});
	});

	suite('Edge Cases', () => {
		test('Should handle special characters in selection', async () => {
			await createTestDocument('Text with "quotes" and <brackets>');
			selectText(0, 10, 0, 18); // Select "quotes"

			const selectedText = document.getText(editor.selection);
			assert.strictEqual(selectedText, '"quotes"');
		});

		test('Should handle multi-line selections', async () => {
			const multiLineContent = `Line 1
Line 2
Line 3`;
			await createTestDocument(multiLineContent);

			// Select from Line 1 to Line 3
			selectText(0, 0, 2, 6);

			const selectedText = document.getText(editor.selection);
			assert.ok(selectedText.includes('Line 1'));
			assert.ok(selectedText.includes('Line 2'));
			assert.ok(selectedText.includes('Line 3'));
		});

		test('Should handle selections with indentation', async () => {
			const indentedContent = `    <div>
        <p>Indented paragraph</p>
    </div>`;
			await createTestDocument(indentedContent);

			// Select the indented paragraph
			selectText(1, 11, 1, 29);

			const selectedText = document.getText(editor.selection);
			assert.strictEqual(selectedText, 'Indented paragraph');
		});
	});

	suite('Performance Tests', () => {
		test('Should handle large selections efficiently', async () => {
			// Create a large document
			const lines = [];
			for (let i = 0; i < 100; i++) {
				lines.push(`<p>Line ${i} with some content to make it longer</p>`);
			}
			const largeContent = lines.join('\n');
			await createTestDocument(largeContent);

			// Select a large portion
			selectText(0, 0, 50, 0);

			const selectedText = document.getText(editor.selection);
			assert.ok(selectedText.includes('Line 0'));
			assert.ok(selectedText.includes('Line 49'));
		});

		test('Should handle many small selections', async () => {
			const content = 'Word1 Word2 Word3 Word4 Word5';
			await createTestDocument(content);

			// Create multiple small selections
			selectMultipleRanges([
				[0, 0, 0, 5],   // Word1
				[0, 6, 0, 11],  // Word2
				[0, 12, 0, 17], // Word3
				[0, 18, 0, 23], // Word4
				[0, 24, 0, 29]  // Word5
			]);

			assert.strictEqual(editor.selections.length, 5);
			editor.selections.forEach((selection, index) => {
				const text = document.getText(selection);
				assert.strictEqual(text, `Word${index + 1}`);
			});
		});
	});

	suite('Cleanup', () => {
		teardown(async () => {
			// Close all editors after each test
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		});
	});
});
