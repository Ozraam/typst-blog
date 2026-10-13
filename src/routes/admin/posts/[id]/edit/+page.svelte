<script lang="ts">
	import SplitEditor from '$lib/components/SplitEditor.svelte';

	let { data, form } = $props<{
		data: { post: any; justCreated: boolean; user: any };
		form?: any;
	}>();

	let title = $state(data.post.title);
	let slug = $state(data.post.slug);
	let excerpt = $state(data.post.excerpt || '');
	let tags = $state((data.post.tags || []).join(', '));
	let status = $state<'draft' | 'published' | 'archived'>(data.post.status);
	let content = $state(data.post.content);
	let renderedSvg = $state(data.post.rendered_svg || '');

	let showMeta = $state(false);
	let formElement: HTMLFormElement;
	let saveSuccessToast = $state(data.justCreated);

	function submitWithStatus(targetStatus: 'draft' | 'published' | 'archived') {
		status = targetStatus;
		setTimeout(() => {
			if (formElement) formElement.requestSubmit();
		}, 20);
	}

	$effect(() => {
		if (form?.success) {
			saveSuccessToast = true;
			setTimeout(() => {
				saveSuccessToast = false;
			}, 3000);
		}
	});
</script>

<svelte:head>
	<title>Éditer : {data.post.title} — Typst Studio</title>
</svelte:head>

<div class="editor-page-container">
	<form method="post" action="?/update" bind:this={formElement} class="editor-main-form">
		<!-- Top Action Header -->
		<header class="editor-header">
			<div class="header-left">
				<a href="/admin/posts" class="back-btn" title="Retour aux articles">←</a>
				<input
					type="text"
					name="title"
					bind:value={title}
					placeholder="Titre de l'article..."
					class="input title-input"
					required
				/>
				<span class="status-indicator-badge {status}">{status}</span>
			</div>

			<div class="header-right">
				{#if saveSuccessToast}
					<span class="save-toast">✓ Enregistré</span>
				{/if}

				{#if status === 'published'}
					<a href="/posts/{slug}" target="_blank" class="btn btn-secondary btn-sm" title="Voir l'article en ligne">
						👁 Voir en ligne
					</a>
				{/if}

				<button
					type="button"
					class="btn btn-secondary btn-sm"
					onclick={() => (showMeta = !showMeta)}
				>
					⚙️ {showMeta ? 'Masquer métas' : 'Métadonnées'}
				</button>

				<input type="hidden" name="status" value={status} />
				<input type="hidden" name="content" value={content} />
				<input type="hidden" name="rendered_svg" value={renderedSvg} />

				<button
					type="button"
					class="btn btn-secondary"
					onclick={() => submitWithStatus('draft')}
				>
					Sauvegarder
				</button>

				{#if status !== 'published'}
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => submitWithStatus('published')}
					>
						🚀 Publier
					</button>
				{:else}
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => submitWithStatus('published')}
					>
						Mettre à jour
					</button>
				{/if}
			</div>
		</header>

		{#if form?.error}
			<div class="alert alert-danger">{form.error}</div>
		{/if}

		<!-- Collapsible Metadata Drawer -->
		{#if showMeta}
			<div class="meta-drawer">
				<div class="meta-field">
					<label for="slug">Slug d'URL :</label>
					<div class="slug-input-wrapper">
						<span class="slug-prefix">/posts/</span>
						<input
							type="text"
							id="slug"
							name="slug"
							bind:value={slug}
							class="input slug-input"
						/>
					</div>
				</div>

				<div class="meta-field">
					<label for="excerpt">Résumé / Extrait :</label>
					<textarea
						id="excerpt"
						name="excerpt"
						bind:value={excerpt}
						placeholder="Court aperçu affiché sur la page d'accueil..."
						rows="2"
						class="textarea"
					></textarea>
				</div>

				<div class="meta-field">
					<label for="tags">Tags (séparés par des virgules) :</label>
					<input
						type="text"
						id="tags"
						name="tags"
						bind:value={tags}
						placeholder="typst, tutoriel, mathématiques"
						class="input"
					/>
				</div>

				<div class="meta-field danger-zone">
					<label>Zone de danger :</label>
					<button
						type="submit"
						formaction="?/trash"
						class="btn btn-danger btn-sm"
						onclick={(e) => {
							if (!confirm('Déplacer cet article vers la corbeille ?')) e.preventDefault();
						}}
					>
						🗑️ Mettre à la corbeille
					</button>
				</div>
			</div>
		{/if}

		<!-- Split Screen Editor -->
		<div class="editor-workspace-wrap">
			<SplitEditor
				bind:content
				bind:renderedSvg
				postId={data.post.id}
				postTitle={title}
				postExcerpt={excerpt}
				postTags={tags.split(',').map((t: string) => t.trim()).filter(Boolean)}
				onSave={() => submitWithStatus(status)}
			/>
		</div>
	</form>
</div>

<style>
	.editor-page-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.editor-main-form {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.editor-header {
		padding: 0.75rem 1.25rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 250px;
	}

	.back-btn {
		font-size: 1.2rem;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
	}

	.back-btn:hover {
		background: var(--bg-secondary);
	}

	.title-input {
		font-size: 1.15rem;
		font-weight: 700;
		border-color: transparent;
		background: transparent;
		padding: 0.35rem 0.5rem;
	}

	.title-input:focus {
		border-color: var(--accent);
		background: var(--bg-card);
	}

	.status-indicator-badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
	}

	.status-indicator-badge.published {
		background: var(--success-bg);
		color: var(--success);
	}

	.status-indicator-badge.draft {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.status-indicator-badge.archived {
		background: var(--bg-secondary);
		color: var(--text-muted);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.save-toast {
		font-size: 0.8rem;
		color: var(--success);
		font-weight: 600;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.alert-danger {
		margin: 0.5rem 1.25rem;
		padding: 0.6rem 1rem;
		background: var(--danger-bg);
		color: var(--danger);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
	}

	.meta-drawer {
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-color);
		padding: 1rem 1.5rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
		align-items: flex-end;
	}

	.meta-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.meta-field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.slug-input-wrapper {
		display: flex;
		align-items: center;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--bg-card);
		overflow: hidden;
	}

	.slug-prefix {
		padding: 0 0.6rem;
		font-size: 0.85rem;
		color: var(--text-muted);
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-color);
		line-height: 2.2;
	}

	.slug-input {
		border: none;
		border-radius: 0;
	}

	.danger-zone {
		justify-content: flex-end;
	}

	.editor-workspace-wrap {
		flex: 1;
		min-height: 0;
		padding: 0.75rem 1.25rem 1.25rem;
		display: flex;
		flex-direction: column;
	}
</style>
