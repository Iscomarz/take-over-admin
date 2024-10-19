import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: ({ status, path, referrer, referenceType }) => {
				if (status === 404) {
					console.warn(`404 error on prerendering: ${path}`);
					return;
				}
				throw new Error(`${status} ${path} (linked from ${referrer})`);
			},
			entries: ['*', '!images/logos/takeover-logo.png'] // Excluir el logo del prerender
		}
	},
	preprocess: vitePreprocess()
};

export default config;