<script lang="ts">
	import { enhance } from '$app/forms';

	let { form, data } = $props<{
		form?: { error?: string; identifier?: string };
		data: { redirect: string };
	}>();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Connexion — Typst Blog</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card">
		<div class="auth-header">
			<span class="auth-icon">🔐</span>
			<h2>Connexion</h2>
			<p>Accédez à l'administration de votre blog Typst</p>
		</div>

		{#if form?.error}
			<div class="alert alert-danger" role="alert">
				{form.error}
			</div>
		{/if}

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
				<label for="identifier">Nom d'utilisateur ou Email</label>
				<input
					type="text"
					id="identifier"
					name="identifier"
					value={form?.identifier || ''}
					required
					autocomplete="username"
					placeholder="admin ou admin@exemple.com"
					class="input"
				/>
			</div>

			<div class="form-group">
				<label for="password">Mot de passe</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete="current-password"
					placeholder="••••••••"
					class="input"
				/>
			</div>

			<button type="submit" class="btn btn-primary btn-block" disabled={loading}>
				{loading ? 'Connexion en cours...' : 'Se connecter'}
			</button>
		</form>

		<div class="auth-footer">
			<a href="/">← Retour au blog public</a>
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
		max-width: 420px;
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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
	}
</style>
