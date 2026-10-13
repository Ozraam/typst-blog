<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props<{
		data: { isFirstRun: boolean; allowRegistration: boolean };
		form?: { error?: string; username?: string; email?: string };
	}>();

	let loading = $state(false);
</script>

<svelte:head>
	<title>{data.isFirstRun ? 'Configuration initiale' : 'Créer un compte'} — Typst Blog</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card {data.isFirstRun ? 'setup-card' : ''}">
		<div class="auth-header">
			<span class="auth-icon">{data.isFirstRun ? '🚀' : '✨'}</span>
			<h2>{data.isFirstRun ? 'Initialisation du Blog' : 'Créer un compte'}</h2>
			<p>
				{#if data.isFirstRun}
					Bienvenue ! Créez le premier compte <strong>Administrateur</strong> pour configurer votre blog Typst.
				{:else if data.allowRegistration}
					Rejoignez l'équipe de rédaction pour publier des articles en syntaxe Typst.
				{:else}
					Les inscriptions sont fermées.
				{/if}
			</p>
		</div>

		{#if form?.error}
			<div class="alert alert-danger" role="alert">
				{form.error}
			</div>
		{/if}

		{#if data.isFirstRun || data.allowRegistration}
			<form
				method="post"
				class="auth-form"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<div class="form-group">
					<label for="username">Nom d'utilisateur</label>
					<input
						type="text"
						id="username"
						name="username"
						value={form?.username || ''}
						required
						autocomplete="username"
						placeholder="ex: tristan"
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="email">Adresse Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email || ''}
						required
						autocomplete="email"
						placeholder="ex: admin@mon-blog.fr"
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="password">Mot de passe (8 caractères minimum)</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						minlength="8"
						autocomplete="new-password"
						placeholder="••••••••"
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="confirmPassword">Confirmer le mot de passe</label>
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						required
						minlength="8"
						autocomplete="new-password"
						placeholder="••••••••"
						class="input"
					/>
				</div>

				<button type="submit" class="btn btn-primary btn-block" disabled={loading}>
					{#if loading}
						Initialisation...
					{:else if data.isFirstRun}
						Créer le compte Administrateur
					{:else}
						S'inscrire
					{/if}
				</button>
			</form>
		{:else}
			<div class="alert alert-warning">
				Les inscriptions sont désactivées sur cette instance. Contactez l'administrateur si vous avez besoin d'un accès.
			</div>
		{/if}

		<div class="auth-footer">
			{#if !data.isFirstRun}
				<a href="/login">Déjà un compte ? Se connecter</a>
				<span>·</span>
			{/if}
			<a href="/">Retour au blog public</a>
		</div>
	</div>
</div>

<style>
	.auth-page {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 1.5rem;
		min-height: calc(100vh - 12rem);
	}

	.auth-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		width: 100%;
		max-width: 440px;
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.setup-card {
		border-top: 4px solid var(--accent);
	}

	.auth-header {
		text-align: center;
	}

	.auth-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		display: block;
	}

	.auth-header h2 {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.auth-header p {
		font-size: 0.9rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
	}

	.alert-danger {
		background-color: var(--danger-bg);
		color: var(--danger);
		border: 1px solid var(--danger);
	}

	.alert-warning {
		background-color: var(--warning-bg);
		color: var(--warning);
		border: 1px solid var(--warning);
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.btn-block {
		width: 100%;
		padding: 0.75rem;
	}

	.auth-footer {
		text-align: center;
		font-size: 0.85rem;
		border-top: 1px solid var(--border-light);
		padding-top: 1rem;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}
</style>
