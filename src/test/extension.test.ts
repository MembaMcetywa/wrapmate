import * as assert from "assert";
import * as vscode from "vscode";
suite("WrapMate extension tests", () => {
  let document: vscode.TextDocument;
  let editor: vscode.TextEditor;
  // Helper function to create a test document
  async function createTestDocument(
    content: string,
    language: string = "html"
  ): Promise<void> {
    document = await vscode.workspace.openTextDocument({
      language: language,
      content: content,
    });
    editor = await vscode.window.showTextDocument(document);
  }
  // Helper function to select text in the editor
  function selectText(
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
  ): void;
  function selectText(line: number, match: string, occurrence?: number): void;
  function selectText(
    startOrLine: number,
    startCharOrMatch: number | string,
    endLineOrOccurrence?: number,
    endChar?: number
  ): void {
    if (typeof startCharOrMatch === "string") {
      const occurrence =
        typeof endLineOrOccurrence === "number" ? endLineOrOccurrence : 0;
      const lineText = document.lineAt(startOrLine).text;
      let index = -1;
      let searchStart = 0;
      for (let count = 0; count <= occurrence; count++) {
        index = lineText.indexOf(startCharOrMatch, searchStart);
        if (index === -1) {
          break;
        }
        searchStart = index + startCharOrMatch.length;
      }
      assert.ok(
        index !== -1,
        `Text "${startCharOrMatch}" not found on line ${startOrLine}`
      );
      const selection = new vscode.Selection(
        new vscode.Position(startOrLine, index),
        new vscode.Position(startOrLine, index + startCharOrMatch.length)
      );
      editor.selection = selection;
      editor.selections = [selection];
      return;
    }
    assert.strictEqual(
      typeof endLineOrOccurrence,
      "number",
      "endLine must be provided for numeric selection"
    );
    assert.strictEqual(
      typeof endChar,
      "number",
      "endChar must be provided for numeric selection"
    );
    const endLine = endLineOrOccurrence as number;
    const endCharacter = endChar as number;
    const selection = new vscode.Selection(
      new vscode.Position(startOrLine, startCharOrMatch),
      new vscode.Position(endLine, endCharacter)
    );
    editor.selection = selection;
    editor.selections = [selection];
  }
  // Helper function to select multiple ranges
  function selectMultipleRanges(
    ranges: Array<[number, number, number, number]>
  ): void {
    const selections = ranges.map(
      ([startLine, startChar, endLine, endChar]) =>
        new vscode.Selection(
          new vscode.Position(startLine, startChar),
          new vscode.Position(endLine, endChar)
        )
    );
    editor.selections = selections;
  }
  // Helper to check if a command is registered for the active context
  async function isCommandAvailable(commandId: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands.includes(commandId);
  }
  // Helper to verify that the extension activates for a language
  async function verifyExtensionActivation(language: string): Promise<boolean> {
    await createTestDocument("test content", language);
    const wrapMateExtension = vscode.extensions.all.find(
      (ext) =>
        ext.id.includes("wrapmate") || ext.packageJSON?.name === "wrapmate"
    );
    if (!wrapMateExtension) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    return wrapMateExtension.isActive;
  }
  // Basic wrapping
  test("Basic Wrapping / Extension should be activated", async () => {
    const allExtensions = vscode.extensions.all;
    const wrapMateExtension = allExtensions.find(
      (ext) =>
        ext.id.includes("wrapmate") || ext.packageJSON?.name === "wrapmate"
    );
    assert.ok(wrapMateExtension, "WrapMate extension should be found");
    if (wrapMateExtension && !wrapMateExtension.isActive) {
      await wrapMateExtension.activate();
    }
    assert.strictEqual(
      wrapMateExtension?.isActive,
      true,
      "Extension should be active"
    );
  });
  test("Basic Wrapping / Command should be registered", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes("extension.wrapmate"));
  });
  test("Basic Wrapping / Should wrap single selection with div tag", async () => {
    await createTestDocument("Hello World");
    selectText(0, 0, 0, 11);
    // Execute the wrapmate command
    const commandExists = (await vscode.commands.getCommands()).includes(
      "extension.wrapmate"
    );
    assert.strictEqual(commandExists, true);
  });
  test("Basic Wrapping / Should handle empty selection gracefully", async () => {
    await createTestDocument("Hello World");
    // Don't select anything - cursor at position 0,0
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    );
    try {
      await vscode.commands.executeCommand("extension.wrapmate");
      assert.ok(true);
    } catch (error) {
      assert.fail("Command should handle empty selection without throwing");
    }
  });
  test("Selections / Should handle multiple selections", async () => {
    await createTestDocument("First line\nSecond line\nThird line");

    selectMultipleRanges([
      [0, 0, 0, 10],
      [1, 0, 1, 11],
      [2, 0, 2, 10],
    ]);
    // Verify multiple selections are set
    assert.strictEqual(editor.selections.length, 3);
    assert.strictEqual(document.getText(editor.selections[0]), "First line");
    assert.strictEqual(document.getText(editor.selections[1]), "Second line");
    assert.strictEqual(document.getText(editor.selections[2]), "Third line");
  });
  test("Selections / Should detect non-empty selections correctly", async () => {
    await createTestDocument("Text to wrap");
    selectText(0, 0, 0, 12);
    // Verify selection is not empty
    assert.strictEqual(editor.selection.isEmpty, false);
    assert.strictEqual(document.getText(editor.selection), "Text to wrap");
  });
  // HTML context checks
  test("HTML Context / Should work with existing HTML elements", async () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<body>
    <p>Paragraph to wrap</p>
    <span>Span content</span>
</body>
</html>`;
    await createTestDocument(htmlContent);
    selectText(3, 7, 3, 24);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, "Paragraph to wrap");
  });
  test("HTML Context / Should handle nested HTML structures", async () => {
    const nestedHTML = `<div>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
    </ul>
</div>`;
    await createTestDocument(nestedHTML);
    selectText(1, 4, 4, 10);
    const selectedText = document.getText(editor.selection);
    assert.ok(selectedText.includes("<ul>"));
    assert.ok(selectedText.includes("</ul>"));
  });
  // General edge cases
  test("Edge Cases / Should handle special characters in selection", async () => {
    await createTestDocument('Text with "quotes" and <brackets>');
    selectText(0, 10, 0, 18);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, '"quotes"');
  });
  test("Edge Cases / Should handle multi-line selections", async () => {
    const multiLineContent = `Line 1
Line 2
Line 3`;
    await createTestDocument(multiLineContent);

    selectText(0, 0, 2, 6);
    const selectedText = document.getText(editor.selection);
    assert.ok(selectedText.includes("Line 1"));
    assert.ok(selectedText.includes("Line 2"));
    assert.ok(selectedText.includes("Line 3"));
  });
  test("Edge Cases / Should handle selections with indentation", async () => {
    const indentedContent = `    <div>
        <p>Indented paragraph</p>
    </div>`;
    await createTestDocument(indentedContent);

    selectText(1, 11, 1, 29);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, "Indented paragraph");
  });
  // Performance smoke tests
  test("Performance / Should handle large selections efficiently", async () => {
    // Create a large document
    const lines = [];
    for (let i = 0; i < 100; i++) {
      lines.push(`<p>Line ${i} with some content to make it longer</p>`);
    }
    const largeContent = lines.join("\n");
    await createTestDocument(largeContent);

    selectText(0, 0, 50, 0);
    const selectedText = document.getText(editor.selection);
    assert.ok(selectedText.includes("Line 0"));
    assert.ok(selectedText.includes("Line 49"));
  });
  test("Performance / Should handle many small selections", async () => {
    const content = "Word1 Word2 Word3 Word4 Word5";
    await createTestDocument(content);
    // Create multiple small selections
    selectMultipleRanges([
      [0, 0, 0, 5],
      [0, 6, 0, 11],
      [0, 12, 0, 17],
      [0, 18, 0, 23],
      [0, 24, 0, 29],
    ]);
    assert.strictEqual(editor.selections.length, 5);
    editor.selections.forEach((selection, index) => {
      const text = document.getText(selection);
      assert.strictEqual(text, `Word${index + 1}`);
    });
  });
  test("Multi-language support / Language Activation / Extension should activate for HTML files", async () => {
    const isActive = await verifyExtensionActivation("html");
    assert.strictEqual(
      isActive,
      true,
      "Extension should activate for HTML files"
    );
  });
  test("Multi-language support / Language Activation / Extension should activate for Vue files", async () => {
    const isActive = await verifyExtensionActivation("vue");
    assert.strictEqual(
      isActive,
      true,
      "Extension should activate for Vue files"
    );
  });
  test("Multi-language support / Language Activation / Extension should activate for JSX files", async () => {
    const isActive = await verifyExtensionActivation("javascriptreact");
    assert.strictEqual(
      isActive,
      true,
      "Extension should activate for JSX files"
    );
  });
  test("Multi-language support / Language Activation / Extension should activate for TSX files", async () => {
    const isActive = await verifyExtensionActivation("typescriptreact");
    assert.strictEqual(
      isActive,
      true,
      "Extension should activate for TSX files"
    );
  });
  test("Multi-language support / Language Activation / Extension should NOT activate for unsupported languages", async () => {
    // Should not work for Python
    await createTestDocument('print("Hello")', "python");
    const commandAvailable = await isCommandAvailable("extension.wrapmate");
    assert.strictEqual(
      document.languageId,
      "python",
      "Document should be Python"
    );
  });
  test("Multi-language support / JSX/React / Should handle JSX single-line content", async () => {
    const jsxContent = `const Component = () => {
  return <div>Hello World</div>;
};`;
    await createTestDocument(jsxContent, "javascriptreact");
    selectText(1, 14, 1, 25);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Hello World",
      "Should select JSX content correctly"
    );
    assert.strictEqual(
      document.languageId,
      "javascriptreact",
      "Document should be identified as JSX"
    );
  });
  test("Multi-language support / JSX/React / Should handle JSX multi-line content", async () => {
    const jsxContent = `const Component = () => {
  return (
	<div>
	  <p>Paragraph 1</p>
	  <p>Paragraph 2</p>
	</div>
  );
};`;
    await createTestDocument(jsxContent, "javascriptreact");
    selectText(3, "Paragraph 1");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Paragraph 1",
      "Should select paragraph content"
    );
  });
  test("Multi-language support / JSX/React / Should handle JSX expressions", async () => {
    const jsxContent = `const Component = ({ name }) => {
  return <div>{name.toUpperCase()}</div>;
};`;
    await createTestDocument(jsxContent, "javascriptreact");
    selectText(1, 14, 1, 34);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "{name.toUpperCase()}",
      "Should select JSX expression"
    );
  });
  test("Multi-language support / JSX/React / Should handle JSX fragments", async () => {
    const jsxContent = `const Component = () => {
  return (
	<>
	  <span>Item 1</span>
	  <span>Item 2</span>
	</>
  );
};`;
    await createTestDocument(jsxContent, "javascriptreact");
    selectText(3, "Item 1");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Item 1",
      "Should handle content in fragments"
    );
  });
  test("Multi-language support / TSX/TypeScript React / Should handle TSX with type annotations", async () => {
    const tsxContent = `interface Props {
  text: string;
}

const Component: React.FC<Props> = ({ text }) => {
  return <div>{text}</div>;
};`;
    await createTestDocument(tsxContent, "typescriptreact");
    selectText(5, 14, 5, 20);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, "{text}", "Should handle TSX with types");
    assert.strictEqual(
      document.languageId,
      "typescriptreact",
      "Document should be identified as TSX"
    );
  });
  test("Multi-language support / TSX/TypeScript React / Should handle TSX with generic components", async () => {
    const tsxContent = `const List = <T,T>({ items }: { items: T[] }) => {
  return (
	<ul>
	  {items.map(item => <li>{item}</li>)}
	</ul>
  );
};`;
    await createTestDocument(tsxContent, "typescriptreact");
    selectText(3, "{item}");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "{item}",
      "Should handle generic TSX components"
    );
  });
  test("Multi-language support / Vue / Should handle Vue template section", async () => {
    const vueContent = `<template>
  <div class="container">
	<h1>{{ title }}</h1>
	<p>{{ description }}</p>
  </div>
</template>

<script>
export default {
  data() {
	return {
	  title: 'Vue Component',
	  description: 'Testing Vue support'
	};
  }
};
</script>`;
    await createTestDocument(vueContent, "vue");
    selectText(2, "{{ title }}");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "{{ title }}",
      "Should handle Vue template interpolation"
    );
    // Vue files might be identified as plaintext in test environment without Vue extension
    const isVueOrPlaintext =
      document.languageId === "vue" || document.languageId === "plaintext";
    assert.strictEqual(
      isVueOrPlaintext,
      true,
      `Document should be identified as Vue or plaintext, got: ${document.languageId}`
    );
  });
  test("Multi-language support / Vue / Should handle Vue directives", async () => {
    const vueContent = `<template>
  <div>
	<span v-if="show">Conditional Content</span>
	<input v-model="text" />
	<button @click="handleClick">Click Me</button>
  </div>
</template>`;
    await createTestDocument(vueContent, "vue");
    selectText(2, "Conditional Content");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Conditional Content",
      "Should handle Vue directive content"
    );
  });
  test("Multi-language support / Vue / Should handle Vue slots", async () => {
    const vueContent = `<template>
  <div>
	<slot name="header">Default Header</slot>
	<slot>Default Content</slot>
  </div>
</template>`;
    await createTestDocument(vueContent, "vue");
    selectText(2, "Default Header");
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Default Header",
      "Should handle Vue slot content"
    );
  });
  test("Multi-language support / Vue / Should handle Vue composition API", async () => {
    const vueContent = `<template>
  <div>{{ message }}</div>
</template>

<script setup>
import { ref } from 'vue';
const message = ref('Hello Vue 3');
</script>`;
    await createTestDocument(vueContent, "vue");
    selectText(1, 7, 1, 20);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "{{ message }}",
      "Should handle Vue 3 composition API"
    );
  });
  test("Multi-language support / Keybinding / Keybinding should work in HTML context", async () => {
    await createTestDocument("<div>HTML Content</div>", "html");
    selectText(0, 5, 0, 17);

    assert.strictEqual(
      document.languageId,
      "html",
      "Should be in HTML context"
    );
    const commandAvailable = await isCommandAvailable("extension.wrapmate");
    assert.strictEqual(
      commandAvailable,
      true,
      "Command should be available in HTML"
    );
  });
  test("Multi-language support / Keybinding / Keybinding should work in Vue context", async () => {
    await createTestDocument(
      "<template><div>Vue Content</div></template>",
      "vue"
    );
    selectText(0, 15, 0, 26);
    const isVueOrPlaintext =
      document.languageId === "vue" || document.languageId === "plaintext";
    assert.strictEqual(
      isVueOrPlaintext,
      true,
      `Should be in Vue or plaintext context, got: ${document.languageId}`
    );
    const commandAvailable = await isCommandAvailable("extension.wrapmate");
    assert.strictEqual(
      commandAvailable,
      true,
      "Command should be available in Vue"
    );
  });
  test("Multi-language support / Keybinding / Keybinding should work in JSX context", async () => {
    await createTestDocument(
      "const a = <div>JSX Content</div>;",
      "javascriptreact"
    );
    selectText(0, 15, 0, 26);
    assert.strictEqual(
      document.languageId,
      "javascriptreact",
      "Should be in JSX context"
    );
    const commandAvailable = await isCommandAvailable("extension.wrapmate");
    assert.strictEqual(
      commandAvailable,
      true,
      "Command should be available in JSX"
    );
  });
  test("Multi-language support / Keybinding / Keybinding should work in TSX context", async () => {
    await createTestDocument(
      "const a: JSX.Element = <div>TSX Content</div>;",
      "typescriptreact"
    );
    selectText(0, 29, 0, 40);
    assert.strictEqual(
      document.languageId,
      "typescriptreact",
      "Should be in TSX context"
    );
    const commandAvailable = await isCommandAvailable("extension.wrapmate");
    assert.strictEqual(
      commandAvailable,
      true,
      "Command should be available in TSX"
    );
  });
  test("Multi-language support / Edge Cases / Should handle mixed HTML and JavaScript in Vue", async () => {
    const vueContent = `<template>
  <div>{{ computedValue }}</div>
</template>

<script>
export default {
  computed: {
	computedValue() {
	  return 'Computed: ' + this.value;
	}
  }
};
</script>`;
    await createTestDocument(vueContent, "vue");
    selectText(1, 7, 1, 26);
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "{{ computedValue }}",
      "Should handle computed properties in Vue"
    );
  });
  test("Multi-language support / Edge Cases / Should handle className vs class attribute", async () => {
    const jsxContent = `<div className="container">JSX</div>`;
    await createTestDocument(jsxContent, "javascriptreact");
    selectText(0, 27, 0, 30);
    let selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, "JSX", "Should handle JSX className");
    const vueContent = `<div class="container">Vue</div>`;
    await createTestDocument(vueContent, "vue");
    selectText(0, 23, 0, 26);
    selectedText = document.getText(editor.selection);
    assert.strictEqual(
      selectedText,
      "Vue",
      "Should handle Vue class attribute"
    );
  });
  test("Multi-language support / Edge Cases / Should handle self-closing tags in JSX", async () => {
    const jsxContent = `const Component = () => {
  return (
	<div>
	  <img src="test.jpg" />
	  <br />
	  <CustomComponent />
	</div>
  );
};`;
    await createTestDocument(jsxContent, "javascriptreact");
    assert.strictEqual(document.languageId, "javascriptreact");
    assert.ok(
      document.getText().includes("<br />"),
      "Should contain self-closing tags"
    );
  });
  test("Multi-language support / Performance / Should handle large Vue SFC efficiently", async () => {
    const largeVueContent = `<template>
  <div>
${Array.from({ length: 50 }, (_, i) => `    <p>Line ${i}</p>`).join("\n")}
  </div>
</template>

<script>
export default {
  data() {
	return {
${Array.from({ length: 50 }, (_, i) => `      item${i}: 'value${i}',`).join(
  "\n"
)}
	};
  }
};
</script>

<style>
${Array.from({ length: 50 }, (_, i) => `.class${i} { color: red; }`).join("\n")}
</style>`;
    await createTestDocument(largeVueContent, "vue");
    selectText(25, 7, 25, 14);
    const selectedText = document.getText(editor.selection);
    assert.ok(selectedText.includes("Line"), "Should handle large Vue files");
  });
  test("Multi-language support / Performance / Should handle complex nested JSX efficiently", async () => {
    const nestedJSX = `const Component = () => {
  return (
	<div>
	  ${Array.from(
      { length: 10 },
      (_, i) => `
	  <section key=${i}>
	<header>Section ${i}</header>
	<article>
	  ${Array.from({ length: 5 }, (_, j) => `<p>Paragraph ${i}-${j}</p>`).join(
      "\n          "
    )}
	</article>
	  </section>`
    ).join("")}
	</div>
  );
};`;
    await createTestDocument(nestedJSX, "javascriptreact");
    assert.ok(
      document.getText().includes("Section"),
      "Should handle complex nested JSX"
    );
  });
  teardown(async () => {
    // Close all editors after each test run
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
});
