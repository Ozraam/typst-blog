<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import MediaGrid from '$lib/components/MediaGrid.svelte';
	import { formatBytes } from '$lib/format';

	let { data } = $props();

	let items = $derived(data.media);

	const totalSize = $derived(items.reduce((sum, i) => sum + i.size, 0));
</script>

<svelte:head>
	<title>Médiathèque — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page">
	<PageHeader
		title="Médiathèque"
		description="{items.length} fichier{items.length > 1 ? 's' : ''} · {formatBytes(totalSize)}. Insérez-les dans vos articles avec le code Typst fourni."
	/>
	<MediaGrid bind:items mode="manage" currentUser={data.user} />
</div>
