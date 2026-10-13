<script lang="ts">
	import PostEditor from '$lib/components/editor/PostEditor.svelte';

	let { data } = $props();
</script>

{#key data.post.id}
	<PostEditor initial={data.post} knownTags={data.knownTags} user={data.user} />
{/key}
