<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, LoaderCircle } from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { formatDate, initials, ROLE_LABELS } from '$lib/format';
	import { toast } from '$lib/ui/toast.svelte';

	let { data, form } = $props();
	let saving = $state(false);
</script>

<svelte:head>
	<title>Mon profil — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page narrow">
	<PageHeader title="Mon profil" description="Vos informations de connexion." />

	<div class="card identity">
		<span class="avatar">{initials(data.profile.username)}</span>
		<div>
			<strong>{data.profile.username}</strong>
			<span class="muted">{ROLE_LABELS[data.profile.role]} · membre depuis le {formatDate(data.profile.created_at)}</span>
		</div>
	</div>

	<form
		method="post"
		class="card form"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success' && typeof result.data?.success === 'string') toast.success(result.data.success);
				await update();
			};
		}}
	>
		<section class="section">
			<div class="section-intro">
				<h2>Compte</h2>
				<p>Vous pouvez vous connecter avec l'un ou l'autre.</p>
			</div>
			<div class="fields">
				{#if form?.error}
					<div class="alert alert-danger"><CircleAlert size={16} /> {form.error}</div>
				{/if}
				<label class="field">
					<span class="field-label">Nom d'utilisateur</span>
					<input class="input" name="username" value={data.profile.username} required minlength="3" maxlength="32" autocomplete="username" />
				</label>
				<label class="field">
					<span class="field-label">Adresse email</span>
					<input class="input" type="email" name="email" value={data.profile.email} required autocomplete="email" />
				</label>
			</div>
		</section>

		<section class="section">
			<div class="section-intro">
				<h2>Mot de passe</h2>
				<p>Laissez vide pour le conserver. Changer de mot de passe déconnecte vos autres appareils.</p>
			</div>
			<div class="fields">
				<label class="field">
					<span class="field-label">Mot de passe actuel</span>
					<PasswordInput name="current_password" autocomplete="current-password" />
				</label>
				<label class="field">
					<span class="field-label">Nouveau mot de passe</span>
					<PasswordInput name="new_password" minlength={8} autocomplete="new-password" />
					<span class="field-hint">8 caractères minimum.</span>
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

	.identity {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 1.5rem;
		margin-bottom: 1rem;
	}

	.identity div {
		display: flex;
		flex-direction: column;
		font-size: 0.875rem;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: var(--accent-soft-2);
		color: var(--accent);
		font-size: 1.2rem;
		font-weight: 650;
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

	.form-footer {
		display: flex;
		justify-content: flex-end;
		padding: 1rem 1.5rem;
		background: var(--surface-2);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}
</style>
