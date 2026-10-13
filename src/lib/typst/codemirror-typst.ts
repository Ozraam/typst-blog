import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { EditorSelection, type Extension } from '@codemirror/state';
import { EditorView, type KeyBinding } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

interface TypstState {
	inBlockComment: boolean;
	inRaw: boolean;
	inMath: boolean;
}

/** Lightweight Typst highlighter (markup mode, plus the most common code constructs). */
export const typstLanguage = StreamLanguage.define<TypstState>({
	name: 'typst',
	startState: () => ({ inBlockComment: false, inRaw: false, inMath: false }),
	copyState: (s) => ({ ...s }),

	token(stream, state) {
		if (state.inBlockComment) {
			if (stream.skipTo('*/')) {
				stream.match('*/');
				state.inBlockComment = false;
			} else {
				stream.skipToEnd();
			}
			return 'blockComment';
		}

		if (state.inRaw) {
			if (stream.skipTo('```')) {
				stream.match('```');
				state.inRaw = false;
			} else {
				stream.skipToEnd();
			}
			return 'monospace';
		}

		if (state.inMath) {
			if (stream.match(/^\\./)) return 'escape';
			if (stream.match('$')) {
				state.inMath = false;
				return 'processingInstruction';
			}
			if (stream.match(/^"([^"\\]|\\.)*"/)) return 'string';
			stream.next();
			return 'variableName.special';
		}

		if (stream.match('/*')) {
			state.inBlockComment = true;
			return 'blockComment';
		}
		if (stream.match('//')) {
			stream.skipToEnd();
			return 'lineComment';
		}
		if (stream.match(/^```\w*/)) {
			state.inRaw = true;
			return 'monospace';
		}
		if (stream.match(/^`[^`]*`/)) return 'monospace';
		if (stream.match(/^\\./)) return 'escape';

		if (stream.match('$')) {
			state.inMath = true;
			return 'processingInstruction';
		}

		if (stream.sol()) {
			const heading = stream.match(/^(=+)\s/);
			if (heading) {
				stream.skipToEnd();
				const level = Math.min((heading as RegExpMatchArray)[1].length, 4);
				return `heading${level}`;
			}
			if (stream.match(/^\s*([-+]|\d+\.)\s/)) return 'list';
			if (stream.match(/^\/\s[^:]*:/)) return 'list';
		}

		if (stream.match(/^\*[^*\s][^*]*\*/)) return 'strong';
		if (stream.match(/^_[^_\s][^_]*_/)) return 'emphasis';
		if (stream.match(/^<[\w:.-]+>/)) return 'labelName';
		if (stream.match(/^@[\w:.-]+/)) return 'link';
		if (stream.match(/^https?:\/\/[^\s)\]]+/)) return 'url';

		if (stream.match(/^#(let|set|show|import|include|return|if|else|for|in|while|context|break|continue)\b/)) {
			return 'keyword';
		}
		if (stream.match(/^#[a-zA-Z_][\w-]*(\.[a-zA-Z_][\w-]*)*/)) return 'variableName.function';

		if (stream.match(/^"([^"\\]|\\.)*"/)) return 'string';
		if (stream.match(/^-?\d+(\.\d+)?(pt|mm|cm|in|em|fr|%|deg|rad)?\b/)) return 'number';
		if (stream.match(/^(true|false|none|auto)\b/)) return 'bool';

		stream.next();
		return null;
	},

	languageData: {
		commentTokens: { line: '//', block: { open: '/*', close: '*/' } }
	}
});

/** Colors come from CSS variables (see CodeEditor.svelte), so the editor follows the theme. */
const typstHighlight = HighlightStyle.define([
	{ tag: t.heading1, color: 'var(--syn-heading)', fontWeight: '700', fontSize: '1.12em' },
	{ tag: t.heading2, color: 'var(--syn-heading)', fontWeight: '700', fontSize: '1.06em' },
	{ tag: [t.heading3, t.heading4], color: 'var(--syn-heading)', fontWeight: '650' },
	{ tag: t.strong, fontWeight: '700', color: 'var(--syn-text)' },
	{ tag: t.emphasis, fontStyle: 'italic', color: 'var(--syn-text)' },
	{ tag: [t.lineComment, t.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
	{ tag: t.monospace, color: 'var(--syn-raw)' },
	{ tag: [t.keyword, t.processingInstruction], color: 'var(--syn-keyword)' },
	{ tag: t.function(t.variableName), color: 'var(--syn-function)' },
	{ tag: t.special(t.variableName), color: 'var(--syn-math)' },
	{ tag: t.string, color: 'var(--syn-string)' },
	{ tag: [t.number, t.bool], color: 'var(--syn-number)' },
	{ tag: [t.labelName, t.link], color: 'var(--syn-label)' },
	{ tag: t.url, color: 'var(--syn-label)', textDecoration: 'underline' },
	{ tag: t.list, color: 'var(--syn-keyword)', fontWeight: '700' },
	{ tag: t.escape, color: 'var(--syn-number)' }
]);

export function typstSupport(): Extension {
	return [typstLanguage, syntaxHighlighting(typstHighlight)];
}

/** Wraps every selection range with `before`/`after` (or inserts them around the cursor). */
export function wrapSelection(view: EditorView, before: string, after = before): boolean {
	view.dispatch(
		view.state.changeByRange((range) => {
			const text = view.state.sliceDoc(range.from, range.to);
			return {
				changes: { from: range.from, to: range.to, insert: `${before}${text}${after}` },
				range: EditorSelection.range(range.from + before.length, range.to + before.length)
			};
		})
	);
	view.focus();
	return true;
}

/** Sets (or replaces) a line prefix such as `== ` or `- ` on every selected line. */
export function setLinePrefix(view: EditorView, prefix: string, replace: RegExp = /^(=+\s|[-+]\s|\d+\.\s|>\s)?/): boolean {
	const { state } = view;
	const changes = [];
	const seen = new Set<number>();
	for (const range of state.selection.ranges) {
		for (let pos = range.from; pos <= range.to; ) {
			const line = state.doc.lineAt(pos);
			if (!seen.has(line.number)) {
				seen.add(line.number);
				const existing = replace.exec(line.text)?.[0] ?? '';
				changes.push({ from: line.from, to: line.from + existing.length, insert: existing === prefix ? '' : prefix });
			}
			pos = line.to + 1;
		}
	}
	view.dispatch({ changes });
	view.focus();
	return true;
}

export function insertSnippet(view: EditorView, snippet: string, cursorOffset = snippet.length): boolean {
	const { from, to } = view.state.selection.main;
	view.dispatch({
		changes: { from, to, insert: snippet },
		selection: { anchor: from + cursorOffset }
	});
	view.focus();
	return true;
}

export function typstKeymap(options: { onSave?: () => void }): KeyBinding[] {
	return [
		{
			key: 'Mod-s',
			preventDefault: true,
			run: () => {
				options.onSave?.();
				return true;
			}
		},
		{ key: 'Mod-b', run: (view) => wrapSelection(view, '*') },
		{ key: 'Mod-i', run: (view) => wrapSelection(view, '_') },
		{ key: 'Mod-e', run: (view) => wrapSelection(view, '`') },
		{ key: 'Mod-m', run: (view) => wrapSelection(view, '$') }
	];
}
