<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash, UserPlus } from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { formatShortDate, initials } from '$lib/format';
	import { actionFeedback } from '$lib/ui/enhance';

	let { data } = $props();
</script>

<svelte:head>
	<title>Utilisateurs — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page">
	<PageHeader title="Utilisateurs" description="Les membres de la rédaction et leurs rôles." />

	<div class="alert alert-info invite">
		<UserPlus size={16} />
		<span>
			{#if data.allowRegistration}
				Les inscriptions sont <strong>ouvertes</strong> : de nouveaux auteurs peuvent créer un compte sur <code>/register</code>.
			{:else}
				Les inscriptions sont <strong>fermées</strong>. Ouvrez-les temporairement dans les
				<a href="/admin/settings">paramètres</a> pour inviter un auteur.
			{/if}
		</span>
	</div>

	<div class="card table-card">
		<div class="table-scroll">
			<table class="table">
				<thead>
					<tr>
						<th>Membre</th>
						<th>Rôle</th>
						<th class="num">Articles</th>
						<th>Inscription</th>
						<th><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as member (member.id)}
						{@const self = member.id === data.user.id}
						<tr>
							<td>
								<div class="member">
									<span class="avatar">{initials(member.username)}</span>
									<div>
										<strong>{member.username}{#if self}<span class="you">vous</span>{/if}</strong>
										<span class="muted">{member.email}</span>
									</div>
								</div>
							</td>
							<td>
								<form method="post" action="?/role" use:enhance={actionFeedback()}>
									<input type="hidden" name="id" value={member.id} />
									<select
										class="select role"
										name="role"
										value={member.role}
										disabled={self}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										aria-label="Rôle de {member.username}"
									>
										<option value="admin">Administrateur</option>
										<option value="author">Auteur</option>
									</select>
								</form>
							</td>
							<td class="num">{member.post_count}</td>
							<td class="muted">{formatShortDate(member.created_at)}</td>
							<td>
								{#if !self}
									<form
										method="post"
										action="?/delete"
										use:enhance={actionFeedback({
											title: `Supprimer le compte de ${member.username} ?`,
											message: 'Ses articles et ses fichiers vous seront transférés. Cette action est irréversible.',
											confirmLabel: 'Supprimer le compte',
											danger: true
										})}
									>
										<input type="hidden" name="id" value={member.id} />
										<button class="btn btn-danger-ghost btn-sm btn-icon" title="Supprimer le compte" aria-label="Supprimer le compte de {member.username}">
											<Trash size={15} />
										</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.invite {
		margin-bottom: 1rem;
	}

	.invite a {
		color: var(--accent);
		font-weight: 600;
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.85em;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.member {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.member div {
		display: flex;
		flex-direction: column;
		font-size: 0.8125rem;
	}

	.member strong {
		font-size: 0.875rem;
	}

	.avatar {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 50%;
		background: var(--accent-soft-2);
		color: var(--accent);
		font-weight: 650;
		font-size: 0.85rem;
	}

	.you {
		margin-left: 0.4rem;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: var(--surface-2);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-2);
	}

	.role {
		width: auto;
		min-height: 2rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.8125rem;
	}
</style>
