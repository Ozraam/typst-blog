<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { defaultKeymap, historyKeymap } from '@codemirror/commands';
	import { typstLanguage, createTypstKeymaps } from '$lib/typst/codemirror-typst';
	import { compileToSvg } from '$lib/typst/compiler.client';
	import MediaModal from './MediaModal.svelte';

	let {
		content = $bindable(''),
		renderedSvg = $bindable(''),
		postId = '',
		postTitle = '',
		postExcerpt = '',
		postTags = [] as string[],
		onSave
	} = $props<{
		content: string;
		renderedSvg?: string;
		postId?: string;
		postTitle?: string;
		postExcerpt?: string;
		postTags?: string[];
		onSave?: () => void;
	}>();

	let editorContainer = $state<HTMLDivElement | null>(null);
	let previewContainer = $state<HTMLDivElement | null>(null);
	let editorView = $state<EditorView | null>(null);

	let viewMode = $state<'split' | 'editor' | 'preview'>('split');
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let compileTimeMs = $state<number | null>(null);
	let isMediaModalOpen = $state(false);
	let autoSaveStatus = $state<string>('');
	let syncScroll = $state(true);

	let debounceTimer: any = null;
	let autoSaveTimer: any = null;
	let lastSavedContent = content;

	async function runCompile(source: string) {
		isCompiling = true;
		const startTime = performance.now();
		const result = await compileToSvg(source);
		compileTimeMs = Math.round(performance.now() - startTime);

		if (result.error) {
			compileError = result.error;
		} else {
			compileError = null;
			renderedSvg = result.svg;
		}
		isCompiling = false;
	}

	function handleContentChange(newContent: string) {
		content = newContent;
		// Save to localStorage as emergency crash recovery
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(`typst_draft_${postId || 'new'}`, newContent);
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			runCompile(newContent);
		}, 200);
	}

	async function triggerAutoSave() {
		if (content === lastSavedContent || !postTitle?.trim()) return;

		try {
			autoSaveStatus = 'Sauvegarde...';
			const res = await fetch('/api/posts/draft', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: postId,
					title: postTitle,
					content,
					rendered_svg: renderedSvg,
					excerpt: postExcerpt,
					tags: postTags
				})
			});

			if (res.ok) {
				lastSavedContent = content;
				const now = new Date();
				const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
				autoSaveStatus = `Sauvegardé à ${timeStr}`;
			} else {
				autoSaveStatus = 'Erreur autosave';
			}
		} catch (e) {
			autoSaveStatus = 'Erreur autosave';
		}
	}

	onMount(() => {
		if (!editorContainer) return;

		// Check for local crash recovery draft
		const localDraft = localStorage.getItem(`typst_draft_${postId || 'new'}`);
		if (localDraft && !content) {
			content = localDraft;
		}

		// Initial compile
		runCompile(content);

		// Initialize CodeMirror 6
		const state = EditorState.create({
			doc: content,
			extensions: [
				basicSetup,
				typstLanguage,
				keymap.of([
					...createTypstKeymaps({
						onSave: () => {
							if (onSave) onSave();
						}
					}),
					...defaultKeymap,
					...historyKeymap
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						handleContentChange(update.state.doc.toString());
					}
				}),
				EditorView.theme({
					'&': { height: '100%', fontSize: '14px' },
					'.cm-scroller': { overflow: 'auto', height: '100%' },
					'.cm-content': { minHeight: '100%', cursor: 'text' },
					'&.cm-focused': { outline: 'none' }
				})
			]
		});

		editorView = new EditorView({
			state,
			parent: editorContainer
		});

		// Setup synchronized scrolling
		const scroller = editorContainer.querySelector('.cm-scroller');
		if (scroller) {
			scroller.addEventListener('scroll', () => {
				if (!syncScroll || !previewContainer) return;
				const percent = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1);
				previewContainer.scrollTop = percent * (previewContainer.scrollHeight - previewContainer.clientHeight);
			});
		}

		// Periodic autosave every 20 seconds
		autoSaveTimer = setInterval(triggerAutoSave, 20000);
	});

	onDestroy(() => {
		clearTimeout(debounceTimer);
		clearInterval(autoSaveTimer);
		if (editorView) {
			editorView.destroy();
		}
	});

	function insertText(snippet: string) {
		if (!editorView) return;
		const { state, dispatch } = editorView;
		const { from, to } = state.selection.main;
		dispatch({
			changes: { from, to, insert: snippet },
			selection: { anchor: from + snippet.length }
		});
		editorView.focus();
	}

	function wrapSelection(prefix: string, suffix: string) {
		if (!editorView) return;
		const { state, dispatch } = editorView;
		const { from, to } = state.selection.main;
		const text = state.sliceDoc(from, to);
		dispatch({
			changes: { from, to, insert: `${prefix}${text}${suffix}` },
			selection: { anchor: from + prefix.length, head: to + prefix.length }
		});
		editorView.focus();
	}
</script>

<div class="split-editor-root">
	<!-- Toolbar -->
	<header class="editor-toolbar">
		<div class="toolbar-group">
			<button type="button" class="tool-btn" onclick={() => wrapSelection('= ', '\n')} title="Titre 1 (= )">
				H1
			</button>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('== ', '\n')} title="Titre 2 (== )">
				H2
			</button>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('=== ', '\n')} title="Titre 3 (=== )">
				H3
			</button>
			<span class="tool-divider"></span>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('*', '*')} title="Gras (*texte*)">
				<strong>B</strong>
			</button>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('_', '_')} title="Italique (_texte_)">
				<em>I</em>
			</button>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('`', '`')} title="Code (`code`)">
				<code>&lt;&gt;</code>
			</button>
			<button type="button" class="tool-btn" onclick={() => wrapSelection('$ ', ' $')} title="Formule math ($ x $)">
				∑
			</button>
			<span class="tool-divider"></span>
			<button
				type="button"
				class="tool-btn"
				onclick={() =>
					insertText('\n#table(\n  columns: (1fr, 1fr),\n  [En-tête 1], [En-tête 2],\n  [Valeur 1], [Valeur 2]\n)\n')}
				title="Insérer un tableau"
			>
				▦ Tableau
			</button>
			<button
				type="button"
				class="tool-btn"
				onclick={() => (isMediaModalOpen = true)}
				title="Insérer une image / média"
			>
				🖼️ Média
			</button>
		</div>

		<!-- Status & View toggles -->
		<div class="toolbar-group">
			{#if autoSaveStatus}
				<span class="autosave-tag">{autoSaveStatus}</span>
			{/if}

			{#if isCompiling}
				<span class="status-tag compiling">Compiling...</span>
			{:else if compileError}
				<span class="status-tag error" title={compileError}>⚠️ Erreur syntaxe</span>
			{:else if compileTimeMs !== null}
				<span class="status-tag success">✓ {compileTimeMs}ms</span>
			{/if}

			<span class="tool-divider"></span>

			<button
				type="button"
				class="tool-btn {syncScroll ? 'active' : ''}"
				onclick={() => (syncScroll = !syncScroll)}
				title="Défilement synchronisé"
			>
				⇄ Scroll
			</button>

			<div class="view-toggles">
				<button
					type="button"
					class="view-btn {viewMode === 'editor' ? 'active' : ''}"
					onclick={() => (viewMode = 'editor')}
					title="Éditeur seul"
				>
					⟨/⟩
				</button>
				<button
					type="button"
					class="view-btn {viewMode === 'split' ? 'active' : ''}"
					onclick={() => (viewMode = 'split')}
					title="Vue divisée (Split)"
				>
					◫
				</button>
				<button
					type="button"
					class="view-btn {viewMode === 'preview' ? 'active' : ''}"
					onclick={() => (viewMode = 'preview')}
					title="Aperçu seul"
				>
					👁
				</button>
			</div>
		</div>
	</header>

	<!-- Error Alert if any -->
	{#if compileError}
		<div class="error-banner">
			<strong>Erreur Typst :</strong> {compileError}
		</div>
	{/if}

	<!-- Editor and Preview Workspace -->
	<div class="editor-workspace {viewMode}">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="editor-pane"
			bind:this={editorContainer}
			onclick={() => {
				if (editorView && !editorView.hasFocus) {
					editorView.focus();
				}
			}}
		></div>

		<div class="preview-pane" bind:this={previewContainer}>
			{#if renderedSvg}
				<div class="typst-doc-wrapper">
					{@html renderedSvg}
				</div>
			{:else if !compileError}
				<div class="preview-empty">Rendu en cours...</div>
			{/if}
		</div>
	</div>
</div>

<MediaModal
	bind:isOpen={isMediaModalOpen}
	onSelect={(snippet) => insertText(snippet)}
/>

<style>
	.split-editor-root {
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--bg-card);
	}

	.editor-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.tool-btn {
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		color: var(--text-primary);
		border: 1px solid transparent;
		background: transparent;
	}

	.tool-btn:hover {
		background: var(--bg-card);
		border-color: var(--border-color);
	}

	.tool-btn.active {
		background: var(--accent-light);
		color: var(--accent);
		border-color: var(--accent);
	}

	.tool-divider {
		display: inline-block;
		width: 1px;
		height: 18px;
		background: var(--border-color);
		margin: 0 0.3rem;
	}

	.autosave-tag {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-right: 0.5rem;
	}

	.status-tag {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
	}

	.status-tag.compiling {
		background: var(--bg-secondary);
		color: var(--text-muted);
	}

	.status-tag.success {
		background: var(--success-bg);
		color: var(--success);
	}

	.status-tag.error {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.view-toggles {
		display: flex;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.view-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		background: var(--bg-card);
		color: var(--text-secondary);
	}

	.view-btn.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.error-banner {
		padding: 0.6rem 1rem;
		background: var(--danger-bg);
		color: var(--danger);
		font-size: 0.85rem;
		border-bottom: 1px solid var(--danger);
		white-space: pre-wrap;
		max-height: 120px;
		overflow-y: auto;
	}

	.editor-workspace {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 550px;
	}

	.editor-pane {
		flex: 1;
		height: 100%;
		overflow: hidden;
		background: var(--bg-card);
	}

	.preview-pane {
		flex: 1;
		height: 100%;
		overflow-y: auto;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-color);
	}

	/* View modes */
	.editor-workspace.editor .preview-pane {
		display: none;
	}

	.editor-workspace.preview .editor-pane {
		display: none;
	}

	.editor-workspace.preview .preview-pane {
		border-left: none;
	}

	.preview-empty {
		padding: 3rem;
		text-align: center;
		color: var(--text-muted);
	}
</style>
