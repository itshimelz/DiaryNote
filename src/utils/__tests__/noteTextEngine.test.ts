import { describe, it, expect } from 'vitest';
import {
  normalizeNoteText,
  isNoteTextEmpty,
  applyMarkdownFormatting,
  handleSmartEnterList,
  handleSmartAutoPairing,
  handleSmartClosingPair,
  handleSmartPairBackspace,
  applySmartUrlPaste,
  preserveNoteTabsAndIndentation,
} from '../noteTextEngine';

function createMockTextarea(value: string, selectionStart = 0, selectionEnd = 0): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
  return textarea;
}

describe('noteTextEngine', () => {
  describe('normalizeNoteText & isNoteTextEmpty', () => {
    it('normalizes CRLF to LF', () => {
      expect(normalizeNoteText('line 1\r\nline 2\rline 3')).toBe('line 1\nline 2\nline 3');
    });

    it('identifies empty note text', () => {
      expect(isNoteTextEmpty('')).toBe(true);
      expect(isNoteTextEmpty('   \n\t  ')).toBe(true);
      expect(isNoteTextEmpty('Hello')).toBe(false);
    });
  });

  describe('applyMarkdownFormatting', () => {
    it('wraps unformatted text with bold tokens', () => {
      const textarea = createMockTextarea('Hello world', 6, 11);
      const res = applyMarkdownFormatting(textarea, 'bold');
      expect(res.newContent).toBe('Hello **world**');
      expect(res.newSelectionStart).toBe(6);
      expect(res.newSelectionEnd).toBe(15);
    });

    it('unwraps bold text if already formatted', () => {
      const textarea = createMockTextarea('Hello **world**', 8, 13);
      const res = applyMarkdownFormatting(textarea, 'bold');
      expect(res.newContent).toBe('Hello world');
      expect(res.newSelectionStart).toBe(6);
      expect(res.newSelectionEnd).toBe(11);
    });

    it('inserts default placeholder when no selection exists', () => {
      const textarea = createMockTextarea('Hello ', 6, 6);
      const res = applyMarkdownFormatting(textarea, 'italic');
      expect(res.newContent).toBe('Hello *italic text*');
      expect(res.newSelectionStart).toBe(7);
      expect(res.newSelectionEnd).toBe(18);
    });
  });

  describe('handleSmartEnterList', () => {
    it('continues numbered lists incrementing counter', () => {
      const textarea = createMockTextarea('1. Task one', 11, 11);
      const res = handleSmartEnterList(textarea);
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('1. Task one\n2. ');
    });

    it('terminates numbered list on empty item', () => {
      const textarea = createMockTextarea('1. Task one\n2. ', 15, 15);
      const res = handleSmartEnterList(textarea);
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('1. Task one\n');
    });

    it('continues checklist items with empty checkbox', () => {
      const textarea = createMockTextarea('- [x] Finished item', 19, 19);
      const res = handleSmartEnterList(textarea);
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('- [x] Finished item\n- [ ] ');
    });

    it('continues bullet list items preserving indent', () => {
      const textarea = createMockTextarea('  * Nested bullet item', 22, 22);
      const res = handleSmartEnterList(textarea);
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('  * Nested bullet item\n  * ');
    });
  });

  describe('handleSmartAutoPairing', () => {
    it('wraps selected text when typing opening bracket', () => {
      const textarea = createMockTextarea('Sample text', 0, 6);
      const res = handleSmartAutoPairing(textarea, '[');
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('[Sample] text');
    });

    it('inserts auto-closing pair and positions cursor inside when no selection', () => {
      const textarea = createMockTextarea('Hello ', 6, 6);
      const res = handleSmartAutoPairing(textarea, '(');
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('Hello ()');
      expect(res?.newSelectionStart).toBe(7);
      expect(res?.newSelectionEnd).toBe(7);
    });

    it('wraps selection with strikethrough double tildes when typing ~', () => {
      const textarea = createMockTextarea('Sample text', 7, 11);
      const res = handleSmartAutoPairing(textarea, '~');
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('Sample ~~text~~');
    });
  });

  describe('handleSmartClosingPair', () => {
    it('steps over closing bracket if next character matches', () => {
      const textarea = createMockTextarea('Hello [world]', 12, 12);
      const res = handleSmartClosingPair(textarea, ']');
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newCursorPos).toBe(13);
    });

    it('returns null if character does not match', () => {
      const textarea = createMockTextarea('Hello [world]', 6, 6);
      const res = handleSmartClosingPair(textarea, ')');
      expect(res).toBeNull();
    });
  });

  describe('handleSmartPairBackspace', () => {
    it('deletes both brackets when cursor is between empty pair', () => {
      const textarea = createMockTextarea('Hello []', 7, 7);
      const res = handleSmartPairBackspace(textarea);
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('Hello ');
      expect(res?.newCursorPos).toBe(6);
    });

    it('does nothing special when not between empty pair', () => {
      const textarea = createMockTextarea('Hello [world]', 7, 7);
      const res = handleSmartPairBackspace(textarea);
      expect(res).toBeNull();
    });
  });

  describe('applySmartUrlPaste', () => {
    it('formats selected text as markdown link when pasting valid URL', () => {
      const textarea = createMockTextarea('Visit our website for docs', 10, 17);
      const res = applySmartUrlPaste(textarea, 'https://diarynote.app');
      expect(res).not.toBeNull();
      expect(res?.handled).toBe(true);
      expect(res?.newContent).toBe('Visit our [website](https://diarynote.app) for docs');
    });

    it('returns null when no text is selected', () => {
      const textarea = createMockTextarea('Visit our website', 5, 5);
      const res = applySmartUrlPaste(textarea, 'https://diarynote.app');
      expect(res).toBeNull();
    });

    it('returns null when pasted content is not a URL', () => {
      const textarea = createMockTextarea('Visit our website', 10, 17);
      const res = applySmartUrlPaste(textarea, 'just some plain text');
      expect(res).toBeNull();
    });
  });

  describe('preserveNoteTabsAndIndentation', () => {
    it('converts leading tabs on normal paragraphs to non-breaking spaces', () => {
      const input = '\t\t\t\t\tHere in this line I gave 5 tab\n\tand 1 tab';
      const output = preserveNoteTabsAndIndentation(input);
      // 5 tabs = 20 non-breaking spaces; 1 tab = 4 non-breaking spaces
      expect(output.startsWith('\u00A0'.repeat(20) + 'Here in this line I gave 5 tab')).toBe(true);
      expect(output.includes('\n' + '\u00A0'.repeat(4) + 'and 1 tab')).toBe(true);
    });

    it('preserves list structural indentation without turning into NBSP', () => {
      const input = '- Item 1\n  - Nested item\n  1. Ordered sub-item';
      const output = preserveNoteTabsAndIndentation(input);
      expect(output).toBe(input);
    });

    it('preserves fenced code block contents intact', () => {
      const input = '```js\n    const indented = true;\n```';
      const output = preserveNoteTabsAndIndentation(input);
      expect(output).toBe(input);
    });

    it('preserves multiple consecutive blank lines with &nbsp; spacers', () => {
      const input = 'Line 1\n\nLine 2\n\n\n\nLine 3';
      const output = preserveNoteTabsAndIndentation(input);
      expect(output).toBe('Line 1\n\nLine 2\n\n&nbsp;\n\n&nbsp;\n\nLine 3');
    });
  });
});
