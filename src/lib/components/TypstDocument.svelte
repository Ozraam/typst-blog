<script lang="ts">
	/**
	 * Displays a processed Typst SVG and handles in-document jumps (Typst internal links).
	 * `scrollToY` scrolls the window to a position expressed in document points.
	 */
	let { svg, class: className = '' }: { svg: string; class?: string } = $props();

	let container = $state<HTMLDivElement | null>(null);

	function svgElement(): SVGSVGElement | null {
		return container?.querySelector('svg.typst-doc') ?? null;
	}

	/** Absolute page Y (px) of a document position (pt). */
	export function pageYOf(y: number): number | null {
		const el = svgElement();
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		const height = el.viewBox.baseVal?.height || rect.height;
		return rect.top + window.scrollY + (y * rect.height) / height;
	}

	export function scrollToY(y: number) {
		const target = pageYOf(y);
		if (target === null) return;
		const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;
		window.scrollTo({ top: Math.max(0, target - offset), behavior: 'smooth' });
	}

	function onclick(e: MouseEvent) {
		const link = (e.target as Element).closest?.('a.typst-jump');
		if (!link) return;
		e.preventDefault();
		const y = parseFloat(link.getAttribute('data-jump') ?? '');
		if (Number.isFinite(y)) scrollToY(y);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="paper {className}" bind:this={container} {onclick}>
	{@html svg}
</div>

<style>
	.paper {
		width: 100%;
		background: #fff;
		border-radius: var(--radius-sm);
		box-shadow: var(--paper-shadow);
		overflow: hidden;
	}
</style>
