<script lang="ts">
	import PostEditor from '$lib/components/editor/PostEditor.svelte';

	let { data } = $props();
</script>

<PostEditor
	initial={{
		id: null,
		title: '',
		slug: '',
		currentSlug: null,
		excerpt: '',
		content: data.starterContent,
		status: 'draft',
		tags: [],
		published_at: null,
		updated_at: null
	}}
	knownTags={data.knownTags}
	user={data.user}
/>
