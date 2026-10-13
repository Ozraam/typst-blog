<script lang="ts">
	let { size = 28 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" class="logo">
	<rect width="32" height="32" rx="8" />
	<path d="M10 9.5h12M16 9.5v13.5M13 23h6" />
</svg>

<style>
	.logo {
		flex-shrink: 0;
	}

	rect {
		fill: var(--accent);
	}

	path {
		fill: none;
		stroke: var(--on-accent);
		stroke-width: 2.6;
		stroke-linecap: round;
	}
</style>
