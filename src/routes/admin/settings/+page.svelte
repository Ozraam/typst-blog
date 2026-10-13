<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props<{
		data: {
			settings: Record<string, string>;
			profile: { username: string; email: string };
		};
		form?: {
			errorProfile?: string;
			successSettings?: boolean;
			successProfile?: boolean;
		};
	}>();

	let savingSettings = $state(false);
	let savingProfile = $state(false);
</script>

<svelte:head>
	<title>Paramètres — Typst Studio</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Paramètres</h1>
			<p class="page-subtitle">Configurez votre moteur de blog et votre compte administrateur</p>
		</div>
	</header>

	<div class="settings-grid">
		<!-- General Site Settings -->
		<section class="settings-card">
			<div class="card-header">
				<h2>Paramètres du blog</h2>
				<p>Personnalisez le titre, la description et l'accès au blog</p>
			</div>

			{#if form?.successSettings}
				<div class="alert alert-success">✓ Paramètres du blog enregistrés avec succès.</div>
			{/if}

			<form
				method="post"
				action="?/saveSettings"
				class="settings-form"
				use:enhance={() => {
					savingSettings = true;
					return async ({ update }) => {
						savingSettings = false;
						await update();
					};
				}}
			>
				<div class="form-group">
					<label for="site_title">Titre du blog</label>
					<input
						type="text"
						id="site_title"
						name="site_title"
						value={data.settings.site_title || 'Typst Blog'}
						required
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="site_description">Description / Slogan</label>
					<textarea
						id="site_description"
						name="site_description"
						rows="2"
						class="textarea"
					>{data.settings.site_description || ''}</textarea>
				</div>

				<div class="form-checkbox">
					<input
						type="checkbox"
						id="allow_registration"
						name="allow_registration"
						checked={data.settings.allow_registration === 'true'}
					/>
					<label for="allow_registration">
						<strong>Autoriser les inscriptions publiques</strong>
						<span class="subtext">Si désactivé, seuls les administrateurs existants peuvent utiliser le back-office.</span>
					</label>
				</div>

				<button type="submit" class="btn btn-primary" disabled={savingSettings}>
					{savingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
				</button>
			</form>
		</section>

		<!-- Admin Profile Settings -->
		<section class="settings-card">
			<div class="card-header">
				<h2>Profil Administrateur</h2>
				<p>Modifiez vos identifiants de connexion et votre mot de passe</p>
			</div>

			{#if form?.errorProfile}
				<div class="alert alert-danger">{form.errorProfile}</div>
			{/if}
			{#if form?.successProfile}
				<div class="alert alert-success">✓ Profil mis à jour avec succès.</div>
			{/if}

			<form
				method="post"
				action="?/updateProfile"
				class="settings-form"
				use:enhance={() => {
					savingProfile = true;
					return async ({ update }) => {
						savingProfile = false;
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
						value={data.profile.username}
						required
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="email">Adresse Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={data.profile.email}
						required
						class="input"
					/>
				</div>

				<div class="divider">
					<span>Changer de mot de passe (optionnel)</span>
				</div>

				<div class="form-group">
					<label for="current_password">Mot de passe actuel</label>
					<input
						type="password"
						id="current_password"
						name="current_password"
						placeholder="••••••••"
						autocomplete="current-password"
						class="input"
					/>
				</div>

				<div class="form-group">
					<label for="new_password">Nouveau mot de passe (8 caractères minimum)</label>
					<input
						type="password"
						id="new_password"
						name="new_password"
						placeholder="••••••••"
						minlength="8"
						autocomplete="new-password"
						class="input"
					/>
				</div>

				<button type="submit" class="btn btn-secondary" disabled={savingProfile}>
					{savingProfile ? 'Mise à jour...' : 'Mettre à jour le profil'}
				</button>
			</form>
		</section>
	</div>
</div>

<style>
	.settings-page {
		padding: 2rem;
		max-width: 1100px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-title {
		font-size: 1.8rem;
		font-weight: 700;
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.settings-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.75rem;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.card-header h2 {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.card-header p {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.settings-form {
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

	.form-checkbox {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
	}

	.form-checkbox input {
		margin-top: 0.25rem;
	}

	.form-checkbox label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.form-checkbox .subtext {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.divider {
		border-top: 1px solid var(--border-light);
		padding-top: 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
	}

	.alert-success {
		background: var(--success-bg);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.alert-danger {
		background: var(--danger-bg);
		color: var(--danger);
		border: 1px solid var(--danger);
	}
</style>
