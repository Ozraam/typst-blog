<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto, replaceState } from '$app/navigation';
	import {
		ArrowLeft,
		Bold,
		ChevronDown,
		CircleAlert,
		CircleCheck,
		Code,
		Columns2,
		Eye,
		FileCode,
		Heading1,
		Heading2,
		Heading3,
		Image,
		Italic,
		Link,
		List,
		ListOrdered,
		LoaderCircle,
		Quote,
		RotateCcw,
		Send,
		SlidersHorizontal,
		Sigma,
		SquareSigma,
		Superscript,
		Table,
		TriangleAlert,
		Underline,
		X
	} from '@lucide/svelte';
	import CodeEditor from './CodeEditor.svelte';
	import TagInput from './TagInput.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import MediaGrid from '$lib/components/MediaGrid.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import { formatDate, formatTime, plural } from '$lib/format';
	import { slugify } from '$lib/slug';
	import { toast } from '$lib/ui/toast.svelte';
	import { confirm } from '$lib/ui/confirm.svelte';
	import { typstSnippetFor, type UploadedMedia } from '$lib/ui/upload';
	import { formatDiagnostic, type Diagnostic } from '$lib/typst/engine';

	type Status = 'draft' | 'published' | 'archived' | 'trash';

	interface EditablePost {
		id: string | null;
		title: string;
		slug: string;
		currentSlug: string | null;
		excerpt: string;
		content: string;
		status: Status;
		tags: string[];
		published_at: number | null;
		updated_at: number | null;
	}

	interface LocalBackup {
		title: string;
		slug: string;
		excerpt: string;
		content: string;
		tags: string[];
		savedAt: number;
	}

	let {
		initial,
		knownTags,
		user
	}: { initial: EditablePost; knownTags: string[]; user: { id: string; role: string } } = $props();

	// --- Article state -------------------------------------------------------
	// The editor owns its state after mounting (the page remounts it for another article)
	// svelte-ignore state_referenced_locally
	const start = $state.snapshot(initial);
	let postId = $state(start.id);
	let title = $state(start.title);
	let slug = $state(start.slug);
	let excerpt = $state(start.excerpt);
	let tags = $state(start.tags);
	let content = $state(start.content);
	let status = $state<Status>(start.status);
	let currentSlug = $state(start.currentSlug);
	let publishedAt = $state(start.published_at);

	const snapshot = () => JSON.stringify({ title, slug, excerpt, content, tags });
	let savedSnapshot = $state(snapshot());
	const dirty = $derived(snapshot() !== savedSnapshot);

	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let lastSavedAt = $state<number | null>(null);
	let serverDiagnostics = $state<Diagnostic[]>([]);

	// --- Preview state -------------------------------------------------------
	let previewSvg = $state<string | null>(null);
	let liveDiagnostics = $state<Diagnostic[]>([]);
	let compiling = $state(false);
	let engineReady = $state(false);
	let compileMs = $state<number | null>(null);
	let wordCount = $state(0);

	// --- UI state ------------------------------------------------------------
	let viewMode = $state<'split' | 'source' | 'preview'>('split');
	let narrow = $state(false);
	let settingsOpen = $state(false);
	let mediaOpen = $state(false);
	let mediaItems = $state<UploadedMedia[]>([]);
	let diagnosticsOpen = $state(false);
	let recovery = $state<LocalBackup | null>(null);
	let syncScroll = $state(true);

	let editor = $state<ReturnType<typeof CodeEditor> | null>(null);
	let previewPane = $state<HTMLElement | null>(null);
	let titleInput = $state<HTMLTextAreaElement | null>(null);

	const effectiveMode = $derived(narrow && viewMode === 'split' ? 'source' : viewMode);
	const diagnostics = $derived(liveDiagnostics.length ? liveDiagnostics : serverDiagnostics);
	const errorCount = $derived(diagnostics.filter((d) => d.severity === 'error').length);
	const isPublic = $derived(status === 'published');
	const slugPlaceholder = $derived(slugify(title || 'mon-article'));

	// --- Compilation (in the browser, same engine as the server) -------------
	let compileTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingSource: string | null = null;

	async function compileNow(source: string) {
		if (compiling) {
			pendingSource = source;
			return;
		}
		compiling = true;
		const started = performance.now();
		try {
			const { compileForWeb } = await import('$lib/typst/client');
			const result = await compileForWeb(source);
			engineReady = true;
			compileMs = Math.round(performance.now() - started);
			liveDiagnostics = result.diagnostics;
			if (result.svg) {
				previewSvg = result.svg;
				wordCount = result.wordCount;
			}
		} catch (err) {
			liveDiagnostics = [
				{
					severity: 'error',
					message: `Le moteur Typst n'a pas pu démarrer : ${err instanceof Error ? err.message : err}`,
					line: null,
					column: null,
					hints: []
				}
			];
		} finally {
			compiling = false;
			if (pendingSource !== null) {
				const next = pendingSource;
				pendingSource = null;
				compileNow(next);
			}
		}
	}

	function onContentChange(value: string) {
		content = value;
		clearTimeout(compileTimer);
		compileTimer = setTimeout(() => compileNow(value), 220);
	}

	// --- Local crash-recovery copy -------------------------------------------
	const backupKey = (id: string | null) => `typst-blog:backup:${id ?? 'new'}`;

	function readBackup(id: string | null): LocalBackup | null {
		try {
			const raw = localStorage.getItem(backupKey(id));
			return raw ? (JSON.parse(raw) as LocalBackup) : null;
		} catch {
			return null;
		}
	}

	function clearBackup(id: string | null) {
		try {
			localStorage.removeItem(backupKey(id));
		} catch {
			// ignore
		}
	}

	$effect(() => {
		if (!dirty) return;
		const backup: LocalBackup = { title, slug, excerpt, content, tags: [...tags], savedAt: Date.now() };
		const key = backupKey(postId);
		const timer = setTimeout(() => {
			try {
				localStorage.setItem(key, JSON.stringify(backup));
			} catch {
				// Storage full or unavailable: the server copy is the only one
			}
		}, 600);
		return () => clearTimeout(timer);
	});

	function restoreBackup() {
		if (!recovery) return;
		title = recovery.title;
		slug = recovery.slug;
		excerpt = recovery.excerpt;
		tags = recovery.tags;
		editor?.setValue(recovery.content);
		recovery = null;
		toast.info('Version locale restaurée. Enregistrez pour la conserver.');
	}

	function discardBackup() {
		clearBackup(postId);
		recovery = null;
	}

	// --- Saving ----------------------------------------------------------------
	async function save(options: { status?: Exclude<Status, 'trash'>; silent?: boolean } = {}): Promise<boolean> {
		if (saving) return false;
		if (!title.trim()) {
			if (!options.silent) {
				toast.error('Donnez un titre à votre article avant de l’enregistrer.');
				titleInput?.focus();
			}
			return false;
		}

		saving = true;
		saveError = null;
		const sent = snapshot();
		const payload = { title, slug, excerpt, content, tags, ...(options.status ? { status: options.status } : {}) };

		try {
			const res = await fetch(postId ? `/api/posts/${postId}` : '/api/posts', {
				method: postId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));

			if (!res.ok) {
				saveError = body.error ?? body.message ?? 'Échec de l’enregistrement.';
				serverDiagnostics = body.diagnostics ?? [];
				if (serverDiagnostics.length) diagnosticsOpen = true;
				if (!options.silent) toast.error(saveError!);
				return false;
			}

			const wasNew = !postId;
			postId = body.post.id;
			status = body.post.status;
			currentSlug = body.post.slug;
			publishedAt = body.post.published_at ?? publishedAt;
			const unchangedMeanwhile = sent === snapshot();
			if (slug) slug = body.post.slug;
			savedSnapshot = unchangedMeanwhile ? snapshot() : sent;
			lastSavedAt = Date.now();
			serverDiagnostics = [];
			clearBackup(null);
			clearBackup(postId);

			if (wasNew) replaceState(`/admin/posts/${postId}/edit`, {});
			return true;
		} catch {
			saveError = 'Connexion au serveur perdue.';
			if (!options.silent) toast.error('Connexion au serveur perdue : vos modifications sont conservées localement.');
			return false;
		} finally {
			saving = false;
		}
	}

	// Drafts are saved automatically; published articles only change when the author decides to.
	$effect(() => {
		if (!dirty || saving || status !== 'draft' || !title.trim() || saveError) return;
		const timer = setTimeout(() => save({ silent: true }), 2500);
		return () => clearTimeout(timer);
	});

	async function publish() {
		const firstTime = status !== 'published';
		if (await save({ status: 'published' })) {
			toast.success(firstTime ? 'Article publié 🎉' : 'Article mis à jour.', {
				action: { label: 'Voir', href: `/posts/${currentSlug}` }
			});
		}
	}

	async function saveNow() {
		if ((await save()) && status !== 'draft') toast.success('Modifications enregistrées.');
	}

	async function changeStatus(next: 'draft' | 'archived') {
		const ok = await confirm(
			next === 'draft'
				? { title: 'Dépublier cet article ?', message: 'Il redeviendra un brouillon, invisible pour les lecteurs.', confirmLabel: 'Dépublier' }
				: { title: 'Archiver cet article ?', message: 'Il disparaîtra de la liste des articles mais restera accessible par son lien.', confirmLabel: 'Archiver' }
		);
		if (ok && (await save({ status: next }))) {
			toast.success(next === 'draft' ? 'Article repassé en brouillon.' : 'Article archivé.');
		}
	}

	async function moveToTrash() {
		if (!postId) return;
		const ok = await confirm({
			title: 'Mettre à la corbeille ?',
			message: 'L’article sera retiré du blog. Vous pourrez le restaurer depuis la corbeille.',
			confirmLabel: 'Mettre à la corbeille',
			danger: true
		});
		if (!ok) return;
		const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
		if (res.ok) {
			clearBackup(postId);
			bypassGuard = true;
			toast.success('Article placé dans la corbeille.');
			goto('/admin/posts');
		} else {
			toast.error('Impossible de supprimer l’article.');
		}
	}

	// --- Leaving with unsaved changes -----------------------------------------
	let bypassGuard = false;
	beforeNavigate(({ cancel, to, type }) => {
		if (bypassGuard || !dirty || type === 'leave' || !to) return;
		cancel();
		confirm({
			title: 'Quitter sans enregistrer ?',
			message: 'Vos dernières modifications ne sont pas enregistrées sur le serveur (une copie reste dans ce navigateur).',
			confirmLabel: 'Quitter',
			danger: true
		}).then((ok) => {
			if (ok) {
				bypassGuard = true;
				goto(to.url);
			}
		});
	});

	// --- Toolbar ---------------------------------------------------------------
	function insertMedia(item: UploadedMedia) {
		mediaOpen = false;
		editor?.insert(typstSnippetFor(item));
	}

	async function openMedia() {
		mediaOpen = true;
		const res = await fetch('/api/media');
		if (res.ok) mediaItems = (await res.json()).media;
	}

	const toolbar = [
		{ icon: Heading1, label: 'Titre 1', run: () => editor?.prefixLines('= ') },
		{ icon: Heading2, label: 'Titre 2', run: () => editor?.prefixLines('== ') },
		{ icon: Heading3, label: 'Titre 3', run: () => editor?.prefixLines('=== ') },
		null,
		{ icon: Bold, label: 'Gras (Ctrl+B)', run: () => editor?.wrap('*') },
		{ icon: Italic, label: 'Italique (Ctrl+I)', run: () => editor?.wrap('_') },
		{ icon: Underline, label: 'Souligné', run: () => editor?.wrap('#underline[', ']') },
		{ icon: Code, label: 'Code (Ctrl+E)', run: () => editor?.wrap('`') },
		{ icon: Link, label: 'Lien', run: () => editor?.wrap('#link("https://")[', ']') },
		null,
		{ icon: Sigma, label: 'Formule en ligne (Ctrl+M)', run: () => editor?.wrap('$') },
		{ icon: SquareSigma, label: 'Formule centrée', run: () => editor?.wrap('$ ', ' $') },
		null,
		{ icon: List, label: 'Liste à puces', run: () => editor?.prefixLines('- ') },
		{ icon: ListOrdered, label: 'Liste numérotée', run: () => editor?.prefixLines('+ ') },
		{ icon: Quote, label: 'Citation', run: () => editor?.wrap('#quote(block: true)[', ']') },
		{ icon: Superscript, label: 'Note de bas de page', run: () => editor?.wrap('#footnote[', ']') },
		{
			icon: Table,
			label: 'Tableau',
			run: () =>
				editor?.insert('#table(\n  columns: 2,\n  table.header[*Colonne A*][*Colonne B*],\n  [Valeur 1], [Valeur 2],\n)\n')
		},
		{ icon: Image, label: 'Image ou fichier', run: openMedia }
	];

	// --- Preview interactions --------------------------------------------------
	function onEditorScroll(ratio: number) {
		if (!syncScroll || effectiveMode !== 'split' || !previewPane) return;
		previewPane.scrollTop = ratio * (previewPane.scrollHeight - previewPane.clientHeight);
	}

	function onPreviewClick(e: MouseEvent) {
		const link = (e.target as Element).closest?.('a');
		if (!link) return;
		e.preventDefault();
		const jump = link.getAttribute('data-jump');
		const svg = previewPane?.querySelector('svg');
		if (jump && svg && previewPane) {
			const scale = svg.getBoundingClientRect().height / (svg.viewBox.baseVal?.height || 1);
			const top = svg.getBoundingClientRect().top - previewPane.getBoundingClientRect().top + previewPane.scrollTop;
			previewPane.scrollTo({ top: top + parseFloat(jump) * scale - 24, behavior: 'smooth' });
		} else if (link.getAttribute('href')) {
			window.open(link.getAttribute('href')!, '_blank', 'noopener');
		}
	}

	function autosizeTitle() {
		if (!titleInput) return;
		titleInput.style.height = 'auto';
		titleInput.style.height = `${titleInput.scrollHeight}px`;
	}

	onMount(() => {
		const media = matchMedia('(max-width: 900px)');
		narrow = media.matches;
		media.addEventListener('change', (e) => (narrow = e.matches));

		const backup = readBackup(postId);
		if (backup) {
			const differs =
				backup.content !== start.content || backup.title !== start.title || backup.excerpt !== start.excerpt;
			if (differs && backup.savedAt > (start.updated_at ?? 0)) recovery = backup;
			else clearBackup(postId);
		}

		autosizeTitle();
		if (!postId) titleInput?.focus();
		compileNow(content);
	});

	const saveLabel = $derived.by(() => {
		if (saving) return 'Enregistrement…';
		if (saveError) return 'Non enregistré';
		if (dirty) return status === 'draft' ? 'Modifications en cours…' : 'Modifications non publiées';
		if (lastSavedAt) return `Enregistré à ${formatTime(lastSavedAt)}`;
		return postId ? 'Enregistré' : 'Nouveau brouillon';
	});
</script>

<svelte:window
	onbeforeunload={(e) => {
		if (dirty && !bypassGuard) e.preventDefault();
	}}
/>

<svelte:head>
	<title>{title || 'Nouvel article'} — Éditeur</title>
</svelte:head>

<div class="editor-shell">
	<header class="topbar">
		<div class="left">
			<a href="/admin/posts" class="btn btn-ghost btn-icon" aria-label="Retour aux articles" title="Retour aux articles"><ArrowLeft size={18} /></a>
			<StatusBadge status={postId ? status : 'draft'} />
			<span class="save-state" class:warn={!!saveError} class:pending={dirty && !saving} aria-live="polite">
				{#if saving}<LoaderCircle size={13} class="spinner" />{:else if saveError}<CircleAlert size={13} />{:else if !dirty && postId}<CircleCheck size={13} />{/if}
				{saveLabel}
			</span>
		</div>

		<div class="right">
			<button
				type="button"
				class="btn btn-ghost btn-sm"
				class:active={settingsOpen}
				onclick={() => (settingsOpen = !settingsOpen)}
				aria-expanded={settingsOpen}
			>
				<SlidersHorizontal size={15} /> <span class="hide-sm">Réglages</span>
			</button>
			{#if postId && currentSlug}
				<a href="/posts/{currentSlug}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title={isPublic ? 'Voir en ligne' : 'Aperçu de la page'}>
					<Eye size={15} /> <span class="hide-sm">{isPublic ? 'Voir' : 'Aperçu'}</span>
				</a>
			{/if}
			{#if !isPublic}
				<button type="button" class="btn btn-secondary btn-sm hide-xs" onclick={saveNow} disabled={saving || (!dirty && !!postId)} title="Enregistrer (Ctrl+S)">
					Enregistrer
				</button>
				<button type="button" class="btn btn-primary btn-sm" onclick={publish} disabled={saving}>
					<Send size={14} /> Publier
				</button>
			{:else}
				<button type="button" class="btn btn-primary btn-sm" onclick={publish} disabled={saving || !dirty} title="Mettre à jour (Ctrl+S)">
					Mettre à jour
				</button>
			{/if}
		</div>
	</header>

	{#if recovery}
		<div class="recovery">
			<RotateCcw size={16} />
			<span>Une version plus récente de cet article, non enregistrée, a été retrouvée dans ce navigateur.</span>
			<button type="button" class="btn btn-secondary btn-sm" onclick={restoreBackup}>Restaurer</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={discardBackup}>Ignorer</button>
		</div>
	{/if}

	<div class="title-row">
		<textarea
			bind:this={titleInput}
			bind:value={title}
			oninput={autosizeTitle}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					editor?.focus();
				}
			}}
			class="title-input"
			placeholder="Titre de l'article"
			rows="1"
			maxlength="200"
			aria-label="Titre de l'article"
		></textarea>
	</div>

	<div class="toolbar" role="toolbar" aria-label="Mise en forme">
		<div class="tools">
			{#each toolbar as tool}
				{#if tool}
					<button type="button" class="tool" onclick={tool.run} title={tool.label} aria-label={tool.label}>
						<tool.icon size={16} />
					</button>
				{:else}
					<span class="divider"></span>
				{/if}
			{/each}
		</div>

		<div class="view-controls">
			<div class="segmented" role="group" aria-label="Disposition">
				<button type="button" class:active={effectiveMode === 'source'} onclick={() => (viewMode = 'source')} title="Source seule" aria-label="Source seule"><FileCode size={15} /></button>
				{#if !narrow}
					<button type="button" class:active={effectiveMode === 'split'} onclick={() => (viewMode = 'split')} title="Côte à côte" aria-label="Côte à côte"><Columns2 size={15} /></button>
				{/if}
				<button type="button" class:active={effectiveMode === 'preview'} onclick={() => (viewMode = 'preview')} title="Aperçu seul" aria-label="Aperçu seul"><Eye size={15} /></button>
			</div>
		</div>
	</div>

	<div class="workspace mode-{effectiveMode}">
		<section class="pane source-pane" aria-label="Source Typst">
			<div class="code-wrap">
				<CodeEditor bind:this={editor} value={start.content} {diagnostics} onchange={onContentChange} onsave={saveNow} onscroll={onEditorScroll} />
			</div>

			<div class="statusbar">
				<button type="button" class="diag-toggle" class:has-errors={errorCount > 0} onclick={() => (diagnosticsOpen = !diagnosticsOpen)} aria-expanded={diagnosticsOpen}>
					{#if !engineReady}
						<LoaderCircle size={13} class="spinner" /> Chargement de Typst…
					{:else if compiling}
						<LoaderCircle size={13} class="spinner" /> Compilation…
					{:else if errorCount}
						<TriangleAlert size={13} /> {plural(errorCount, 'erreur')}
					{:else}
						<CircleCheck size={13} /> Compilé{compileMs !== null ? ` en ${compileMs} ms` : ''}
					{/if}
					{#if diagnostics.length}<ChevronDown size={13} class={diagnosticsOpen ? 'flip' : ''} />{/if}
				</button>
				<span class="muted">{plural(wordCount, 'mot')} · {Math.max(1, Math.round(wordCount / 220))} min de lecture</span>
				{#if effectiveMode === 'split'}
					<label class="sync">
						<input type="checkbox" class="checkbox" bind:checked={syncScroll} /> Défilement lié
					</label>
				{/if}
			</div>

			{#if diagnosticsOpen && diagnostics.length}
				<ul class="diagnostics">
					{#each diagnostics as d}
						<li>
							<button type="button" class="diag {d.severity}" disabled={!d.line} onclick={() => d.line && editor?.goToLine(d.line, d.column ?? 1)}>
								{#if d.severity === 'error'}<CircleAlert size={14} />{:else}<TriangleAlert size={14} />{/if}
								<span>
									{formatDiagnostic(d)}
									{#each d.hints as hint}<small>Astuce : {hint}</small>{/each}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<section class="pane preview-pane" bind:this={previewPane} onclick={onPreviewClick} aria-label="Aperçu">
			{#if previewSvg}
				<div class="paper" class:stale={errorCount > 0}>{@html previewSvg}</div>
			{:else if errorCount && engineReady}
				<div class="preview-empty">
					<TriangleAlert size={22} />
					<p>Le document ne compile pas encore. Corrigez les erreurs signalées pour afficher l'aperçu.</p>
				</div>
			{:else}
				<div class="preview-empty">
					<LoaderCircle size={22} class="spinner" />
					<p>Préparation de l'aperçu…</p>
				</div>
			{/if}
		</section>

		{#if settingsOpen}
			<aside class="settings" aria-label="Réglages de l'article">
				<header>
					<h2>Réglages</h2>
					<button type="button" class="btn btn-ghost btn-icon btn-sm" onclick={() => (settingsOpen = false)} aria-label="Fermer"><X size={16} /></button>
				</header>

				<div class="settings-body">
					<label class="field">
						<span class="field-label">Adresse</span>
						<div class="input-group">
							<span class="input-addon">/posts/</span>
							<input class="input" bind:value={slug} placeholder={slugPlaceholder} spellcheck="false" />
						</div>
						<span class="field-hint">
							{#if publishedAt}
								Modifier l'adresse d'un article publié casse les liens existants.
							{:else}
								Laissez vide pour la déduire du titre.
							{/if}
						</span>
					</label>

					<label class="field">
						<span class="field-label">Résumé</span>
						<textarea class="textarea" rows="4" maxlength="500" bind:value={excerpt} placeholder="Une ou deux phrases qui donnent envie de lire…"></textarea>
						<span class="field-hint">Affiché sur l'accueil et lors des partages. {excerpt.length}/500</span>
					</label>

					<div class="field">
						<label class="field-label" for="post-tags">Tags</label>
						<TagInput id="post-tags" bind:tags suggestions={knownTags} />
					</div>

					<dl class="facts">
						<div><dt>Statut</dt><dd><StatusBadge status={postId ? status : 'draft'} /></dd></div>
						{#if publishedAt}<div><dt>Publié le</dt><dd>{formatDate(publishedAt)}</dd></div>{/if}
						<div><dt>Longueur</dt><dd>{plural(wordCount, 'mot')}</dd></div>
					</dl>

					{#if postId}
						<div class="danger">
							{#if status === 'published'}
								<button type="button" class="btn btn-secondary btn-sm" onclick={() => changeStatus('draft')}>Dépublier</button>
								<button type="button" class="btn btn-secondary btn-sm" onclick={() => changeStatus('archived')}>Archiver</button>
							{/if}
							<button type="button" class="btn btn-danger-ghost btn-sm" onclick={moveToTrash}>Mettre à la corbeille</button>
						</div>
					{/if}
				</div>
			</aside>
		{/if}
	</div>
</div>

<Modal open={mediaOpen} onclose={() => (mediaOpen = false)} size="xl" labelledby="media-title">
	<div class="media-header">
		<h2 id="media-title">Insérer un fichier</h2>
		<button type="button" class="btn btn-ghost btn-icon btn-sm" onclick={() => (mediaOpen = false)} aria-label="Fermer"><X size={16} /></button>
	</div>
	<div class="media-body">
		<MediaGrid bind:items={mediaItems} mode="pick" currentUser={user} onpick={insertMedia} />
	</div>
</Modal>

<style>
	.editor-shell {
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		overflow: hidden;
	}

	/* Top bar --------------------------------------------------------------- */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		height: 3.4rem;
		padding: 0 0.75rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.save-state {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: 0.35rem;
		font-size: 0.78rem;
		color: var(--text-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.save-state.pending {
		color: var(--text-2);
	}

	.save-state.warn {
		color: var(--danger);
	}

	.btn.active {
		background: var(--surface-2);
		color: var(--text);
	}

	.recovery {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 1rem;
		background: var(--warning-soft);
		color: var(--warning);
		font-size: 0.85rem;
		border-bottom: 1px solid var(--border);
	}

	.recovery span {
		flex: 1;
		min-width: 14rem;
	}

	/* Title & toolbar ------------------------------------------------------- */
	.title-row {
		padding: 1rem 1.25rem 0.4rem;
		flex-shrink: 0;
	}

	.title-input {
		width: 100%;
		border: none;
		outline: none;
		resize: none;
		overflow: hidden;
		background: none;
		font-family: var(--font-serif);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--text);
	}

	.title-input::placeholder {
		color: var(--text-3);
		opacity: 0.6;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0.9rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tool {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-xs);
		color: var(--text-2);
	}

	.tool:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.divider {
		flex-shrink: 0;
		width: 1px;
		height: 1.1rem;
		margin: 0 0.3rem;
		background: var(--border-strong);
	}

	.segmented {
		display: inline-flex;
		padding: 0.15rem;
		gap: 0.1rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.segmented button {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 1.75rem;
		border-radius: var(--radius-xs);
		color: var(--text-3);
	}

	.segmented button.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}

	/* Workspace ------------------------------------------------------------- */
	.workspace {
		position: relative;
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	}

	.workspace.mode-source,
	.workspace.mode-preview {
		grid-template-columns: minmax(0, 1fr);
	}

	.mode-source .preview-pane,
	.mode-preview .source-pane {
		display: none;
	}

	.pane {
		min-height: 0;
	}

	.source-pane {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--border);
	}

	.code-wrap {
		flex: 1;
		min-height: 0;
	}

	.statusbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		height: 2.1rem;
		padding: 0 0.75rem;
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
		flex-shrink: 0;
		background: var(--surface);
		white-space: nowrap;
		overflow: hidden;
	}

	.diag-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 1.6rem;
		padding: 0 0.45rem;
		border-radius: var(--radius-xs);
		font-weight: 550;
		color: var(--success);
	}

	.diag-toggle:hover {
		background: var(--surface-2);
	}

	.diag-toggle.has-errors {
		color: var(--danger);
	}

	.diag-toggle :global(.flip) {
		transform: rotate(180deg);
	}

	.sync {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
		color: var(--text-3);
		cursor: pointer;
	}

	.sync .checkbox {
		width: 0.95rem;
		height: 0.95rem;
	}

	.diagnostics {
		list-style: none;
		max-height: 30%;
		overflow-y: auto;
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		flex-shrink: 0;
	}

	.diag {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		width: 100%;
		padding: 0.55rem 0.9rem;
		text-align: left;
		font-size: 0.8rem;
		line-height: 1.45;
		border-bottom: 1px solid var(--border);
	}

	.diag:not(:disabled):hover {
		background: var(--surface-3);
	}

	.diag.error {
		color: var(--danger);
	}

	.diag.warning {
		color: var(--warning);
	}

	.diag :global(svg) {
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.diag small {
		display: block;
		color: var(--text-2);
	}

	.preview-pane {
		overflow-y: auto;
		padding: 2rem clamp(1rem, 3vw, 2.5rem) 4rem;
		background: var(--surface-2);
	}

	.paper {
		max-width: 760px;
		margin: 0 auto;
		background: #fff;
		border-radius: var(--radius-xs);
		box-shadow: var(--paper-shadow);
		overflow: hidden;
		transition: opacity 0.2s var(--ease);
	}

	.paper.stale {
		opacity: 0.55;
	}

	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		max-width: 22rem;
		margin: 4rem auto;
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-3);
	}

	/* Settings drawer ------------------------------------------------------- */
	.settings {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		width: min(360px, 100%);
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border-left: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		animation: slide-in 0.2s var(--ease);
	}

	@keyframes slide-in {
		from {
			transform: translateX(16px);
			opacity: 0;
		}
	}

	.settings header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.settings h2 {
		font-size: 0.95rem;
	}

	.settings-body {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.1rem 1rem 2rem;
		overflow-y: auto;
	}

	.facts {
		display: grid;
		gap: 0.5rem;
		padding: 0.85rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-size: 0.8125rem;
	}

	.facts div {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.facts dt {
		color: var(--text-3);
	}

	.danger {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.media-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.media-header h2 {
		font-size: 1rem;
	}

	.media-body {
		padding: 1.25rem;
		overflow-y: auto;
	}

	@media (max-width: 640px) {
		.hide-sm {
			display: none;
		}

		.save-state {
			display: none;
		}
	}

	@media (max-width: 420px) {
		.hide-xs {
			display: none;
		}
	}
</style>
