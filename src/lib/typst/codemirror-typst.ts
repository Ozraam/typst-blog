import { StreamLanguage } from '@codemirror/language';
import type { KeyBinding } from '@codemirror/view';

export const typstLanguage = StreamLanguage.define<{
	inBlockComment: boolean;
	inCodeBlock: boolean;
	inMath: boolean;
}>({
	startState() {
		return {
			inBlockComment: false,
			inCodeBlock: false,
			inMath: false
		};
	},

	token(stream, state) {
		// Inside block comments /* ... */
		if (state.inBlockComment) {
			if (stream.match('*/')) {
				state.inBlockComment = false;
				return 'blockComment';
			}
			stream.next();
			return 'blockComment';
		}

		// Inside code blocks ``` ... ```
		if (state.inCodeBlock) {
			if (stream.match('```')) {
				state.inCodeBlock = false;
				return 'monospace';
			}
			stream.next();
			return 'monospace';
		}

		// Check for block comment start
		if (stream.match('/*')) {
			state.inBlockComment = true;
			return 'blockComment';
		}

		// Check for line comment //
		if (stream.match('//')) {
			stream.skipToEnd();
			return 'lineComment';
		}

		// Check for code blocks ```
		if (stream.match('```')) {
			state.inCodeBlock = true;
			return 'monospace';
		}

		// Inline code `...`
		if (stream.match(/^`[^`]+`/)) {
			return 'monospace';
		}

		// Math mode $ ... $
		if (stream.match(/^\$[^$]+\$/)) {
			return 'variableName.special';
		}

		// Headings at line start: = Title, == Subtitle, etc.
		if (stream.sol()) {
			if (stream.match(/^=====\s+/)) return 'heading5';
			if (stream.match(/^====\s+/)) return 'heading4';
			if (stream.match(/^===\s+/)) return 'heading3';
			if (stream.match(/^==\s+/)) return 'heading2';
			if (stream.match(/^=\s+/)) return 'heading1';
			if (stream.match(/^[-+]\s+/)) return 'list';
		}

		// Bold *text*
		if (stream.match(/^\*[^* \t\n][^*]*\*/)) {
			return 'strong';
		}

		// Italic _text_
		if (stream.match(/^_[^_ \t\n][^_]*_/)) {
			return 'emphasis';
		}

		// Label <label-name>
		if (stream.match(/^<[a-zA-Z0-9_:-]+>/)) {
			return 'labelName';
		}

		// Ref @label-name
		if (stream.match(/^@[a-zA-Z0-9_:-]+/)) {
			return 'link';
		}

		// Typst function/keyword starting with #
		if (stream.match(/^#(let|set|show|import|include|return|if|else|for|while|context)\b/)) {
			return 'keyword';
		}

		if (stream.match(/^#(image|table|align|text|rect|circle|box|grid|colbreak|pagebreak|v|h|line)\b/)) {
			return 'variableName.standard';
		}

		if (stream.match(/^#[a-zA-Z_][a-zA-Z0-9_]*/)) {
			return 'variableName.function';
		}

		// Strings "..."
		if (stream.match(/^"([^"\\]|\\.)*"/)) {
			return 'string';
		}

		// Numbers with units: 10pt, 2em, 50%, 12.5cm, 100
		if (stream.match(/^[0-9]+(\.[0-9]+)?(pt|mm|cm|in|em|%|deg|rad)?\b/)) {
			return 'number';
		}

		stream.next();
		return null;
	}
});

/**
 * Creates custom Typst keybindings for the editor
 */
export function createTypstKeymaps(options: {
	onSave?: () => void;
}): KeyBinding[] {
	return [
		{
			key: 'Mod-s',
			run: () => {
				if (options.onSave) {
					options.onSave();
					return true;
				}
				return false;
			}
		},
		{
			key: 'Mod-b',
			run: (view) => {
				const { state, dispatch } = view;
				const { from, to } = state.selection.main;
				const text = state.sliceDoc(from, to);
				dispatch({
					changes: { from, to, insert: `*${text}*` },
					selection: { anchor: from + 1, head: to + 1 }
				});
				return true;
			}
		},
		{
			key: 'Mod-i',
			run: (view) => {
				const { state, dispatch } = view;
				const { from, to } = state.selection.main;
				const text = state.sliceDoc(from, to);
				dispatch({
					changes: { from, to, insert: `_${text}_` },
					selection: { anchor: from + 1, head: to + 1 }
				});
				return true;
			}
		},
		{
			key: 'Mod-e',
			run: (view) => {
				const { state, dispatch } = view;
				const { from, to } = state.selection.main;
				const text = state.sliceDoc(from, to);
				dispatch({
					changes: { from, to, insert: `\`${text}\`` },
					selection: { anchor: from + 1, head: to + 1 }
				});
				return true;
			}
		}
	];
}
