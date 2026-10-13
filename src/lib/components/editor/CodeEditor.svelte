<script lang="ts">
	import { onMount } from 'svelte';
	import { basicSetup } from 'codemirror';
	import { EditorState, Prec } from '@codemirror/state';
	import { EditorView, keymap } from '@codemirror/view';
	import { indentWithTab } from '@codemirror/commands';
	import { setDiagnostics, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
	import { insertSnippet, setLinePrefix, typstKeymap, typstSupport, wrapSelection } from '$lib/typst/codemirror-typst';
	import type { Diagnostic } from '$lib/typst/engine';

	let {
		value,
		diagnostics = [],
		onchange,
		onsave,
		onscroll
	}: {
		/** Initial document (use `setValue` to replace it afterwards). */
		value: string;
		diagnostics?: Diagnostic[];
		onchange: (value: string) => void;
		onsave?: () => void;
		onscroll?: (ratio: number) => void;
	} = $props();

	let host = $state<HTMLDivElement | null>(null);
	let view = $state.raw<EditorView | null>(null);

	onMount(() => {
		view = new EditorView({
			parent: host!,
			state: EditorState.create({
				doc: value,
				extensions: [
					Prec.highest(keymap.of(typstKeymap({ onSave: () => onsave?.() }))),
					basicSetup,
					keymap.of([indentWithTab]),
					typstSupport(),
					EditorView.lineWrapping,
					EditorView.contentAttributes.of({ spellcheck: 'true', lang: 'fr', 'aria-label': 'Source Typst' }),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) onchange(update.state.doc.toString());
					}),
					EditorView.domEventHandlers({
						scroll: (_, v) => {
							const s = v.scrollDOM;
							onscroll?.(s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight));
						}
					})
				]
			})
		});
		return () => view?.destroy();
	});

	// Typst diagnostics → inline lint markers
	$effect(() => {
		if (!view) return;
		const doc = view.state.doc;
		const markers: CmDiagnostic[] = diagnostics
			.filter((d) => d.line !== null && d.line <= doc.lines)
			.map((d) => {
				const line = doc.line(d.line!);
				const from = Math.min(line.from + Math.max(0, (d.column ?? 1) - 1), line.to);
				return {
					from,
					to: Math.max(from, line.to),
					severity: d.severity,
					message: d.hints.length ? `${d.message}\n${d.hints.join('\n')}` : d.message
				};
			});
		view.dispatch(setDiagnostics(view.state, markers));
	});

	export function setValue(text: string) {
		view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
	}

	export function wrap(before: string, after = before) {
		if (view) wrapSelection(view, before, after);
	}

	export function prefixLines(prefix: string) {
		if (view) setLinePrefix(view, prefix);
	}

	export function insert(snippet: string, cursorOffset?: number) {
		if (!view) return;
		// Block snippets are separated from the surrounding text by blank lines
		const { from, to } = view.state.selection.main;
		const line = view.state.doc.lineAt(from);
		const block = snippet.includes('\n') || snippet.startsWith('#figure');
		const textBefore = view.state.sliceDoc(line.from, from).trim();
		const textAfter = view.state.sliceDoc(to, view.state.doc.lineAt(to).to).trim();
		const prefix = block && textBefore ? '\n\n' : '';
		const suffix = block ? (textAfter ? '\n\n' : snippet.endsWith('\n') ? '' : '\n') : '';
		insertSnippet(
			view,
			prefix + snippet + suffix,
			prefix.length + (cursorOffset ?? snippet.length + suffix.length)
		);
	}

	export function goToLine(lineNumber: number, column = 1) {
		if (!view) return;
		const line = view.state.doc.line(Math.min(Math.max(1, lineNumber), view.state.doc.lines));
		const pos = Math.min(line.from + column - 1, line.to);
		view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
		view.focus();
	}

	export function focus() {
		view?.focus();
	}
</script>

<div class="code-editor" bind:this={host}></div>

<style>
	.code-editor {
		height: 100%;
		min-height: 0;
		background: var(--surface);

		--syn-text: var(--text);
		--syn-heading: #0f5f58;
		--syn-comment: #8a847e;
		--syn-raw: #9a3412;
		--syn-keyword: #7c3aed;
		--syn-function: #1d4ed8;
		--syn-math: #0e7490;
		--syn-string: #15803d;
		--syn-number: #b45309;
		--syn-label: #be185d;
	}

	:global(:root[data-theme='dark']) .code-editor {
		--syn-heading: #5eead4;
		--syn-comment: #7c7771;
		--syn-raw: #fdba74;
		--syn-keyword: #c4b5fd;
		--syn-function: #93c5fd;
		--syn-math: #67e8f9;
		--syn-string: #86efac;
		--syn-number: #fcd34d;
		--syn-label: #f9a8d4;
	}

	.code-editor :global(.cm-editor) {
		height: 100%;
		font-size: 14px;
		color: var(--text);
		background: var(--surface);
	}

	.code-editor :global(.cm-editor.cm-focused) {
		outline: none;
	}

	.code-editor :global(.cm-scroller) {
		font-family: var(--font-mono);
		line-height: 1.7;
	}

	.code-editor :global(.cm-content) {
		padding: 1.25rem 0 40vh;
		max-width: 52rem;
		caret-color: var(--accent);
	}

	.code-editor :global(.cm-line) {
		padding: 0 1.25rem 0 0.75rem;
	}

	.code-editor :global(.cm-gutters) {
		background: var(--surface);
		border-right: none;
		color: var(--text-3);
		opacity: 0.7;
	}

	.code-editor :global(.cm-lineNumbers .cm-gutterElement) {
		padding: 0 0.5rem 0 1rem;
		font-size: 12px;
	}

	.code-editor :global(.cm-activeLine),
	.code-editor :global(.cm-activeLineGutter) {
		background: color-mix(in srgb, var(--surface-2) 70%, transparent);
	}

	.code-editor :global(.cm-cursor) {
		border-left: 2px solid var(--accent);
	}

	.code-editor :global(.cm-selectionBackground),
	.code-editor :global(.cm-focused .cm-selectionBackground),
	.code-editor :global(.cm-content ::selection) {
		background: var(--accent-soft-2) !important;
	}

	.code-editor :global(.cm-matchingBracket) {
		background: var(--accent-soft-2);
		outline: none;
	}

	.code-editor :global(.cm-foldGutter) {
		display: none;
	}

	.code-editor :global(.cm-tooltip) {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.code-editor :global(.cm-tooltip-autocomplete ul li[aria-selected]) {
		background: var(--accent);
		color: var(--on-accent);
	}

	.code-editor :global(.cm-diagnostic) {
		font-family: var(--font-sans);
		font-size: 0.8125rem;
		white-space: pre-wrap;
	}

	.code-editor :global(.cm-panels) {
		background: var(--surface-2);
		color: var(--text);
		border-color: var(--border);
	}

	.code-editor :global(.cm-panels input),
	.code-editor :global(.cm-panels button) {
		font-family: var(--font-sans);
	}

	.code-editor :global(.cm-searchMatch) {
		background: rgb(250 204 21 / 0.3);
	}
</style>
