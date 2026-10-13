<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, LoaderCircle } from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	let { data, form } = $props();
	let saving = $state(false);
</script>

<svelte:head>
	<title>Paramètres — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page narrow">
	<PageHeader title="Paramètres" description="Identité du blog et accès à la rédaction." />

	<form
		method="post"
		class="card form"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') toast.success('Paramètres enregistrés.');
				await update({ reset: false });
			};
		}}
	>
		<section class="section">
			<div class="section-intro">
				<h2>Identité</h2>
				<p>Affichés dans l'en-tête, la page d'accueil, le flux RSS et les partages.</p>
			</div>
			<div class="fields">
				{#if form?.error}
					<div class="alert alert-danger"><CircleAlert size={16} /> {form.error}</div>
				{/if}
				<label class="field">
					<span class="field-label">Titre du blog</span>
					<input class="input" name="site_title" value={data.settings.siteTitle} required maxlength="80" />
				</label>
				<label class="field">
					<span class="field-label">Description</span>
					<textarea class="textarea" name="site_description" rows="3" maxlength="300">{data.settings.siteDescription}</textarea>
					<span class="field-hint">Une phrase qui présente le blog.</span>
				</label>
			</div>
		</section>

		<section class="section">
			<div class="section-intro">
				<h2>Inscriptions</h2>
				<p>Contrôle qui peut rejoindre la rédaction.</p>
			</div>
			<div class="fields">
				<label class="toggle-row">
					<input type="checkbox" class="checkbox" name="allow_registration" checked={data.settings.allowRegistration} />
					<span>
						<strong>Autoriser les inscriptions</strong>
						<small>Toute personne pourra créer un compte auteur depuis <code>/register</code>. Désactivez-les une fois votre équipe constituée.</small>
					</span>
				</label>
			</div>
		</section>

		<footer class="form-footer">
			<button type="submit" class="btn btn-primary" disabled={saving}>
				{#if saving}<LoaderCircle size={15} class="spinner" />{/if}
				Enregistrer
			</button>
		</footer>
	</form>
</div>

<style>
	.narrow {
		max-width: 880px;
	}

	.section {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
		gap: 1.5rem;
		padding: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	@media (max-width: 720px) {
		.section {
			grid-template-columns: minmax(0, 1fr);
			gap: 1rem;
		}
	}

	h2 {
		font-size: 0.95rem;
	}

	.section-intro p {
		margin-top: 0.3rem;
		font-size: 0.8125rem;
		color: var(--text-2);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.toggle-row {
		display: flex;
		gap: 0.75rem;
		cursor: pointer;
	}

	.toggle-row .checkbox {
		margin-top: 0.15rem;
	}

	.toggle-row span {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.875rem;
	}

	.toggle-row small {
		color: var(--text-2);
		font-size: 0.8125rem;
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.85em;
	}

	.form-footer {
		display: flex;
		justify-content: flex-end;
		padding: 1rem 1.5rem;
		background: var(--surface-2);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}
</style>
