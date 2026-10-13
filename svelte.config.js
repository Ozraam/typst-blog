import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: false
		}),
		csrf: {
			// Disabled because the public origin depends on the reverse proxy setup (ORIGIN may be unset).
			// Session cookies are SameSite=Lax, which already blocks cross-site form posts.
			checkOrigin: false
		}
	}
};

export default config;
