<script lang="ts">
	import { STATUS_LABELS } from '$lib/format';

	let { status }: { status: string } = $props();
</script>

<span class="badge badge-{status}">{STATUS_LABELS[status] ?? status}</span>
