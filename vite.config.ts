import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@myriaddreamin/typst.ts']
	},
	build: {
		target: 'esnext'
	},
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		testTimeout: 120_000
	}
});
