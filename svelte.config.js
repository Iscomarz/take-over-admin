import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: ({ status, path, referrer }) => {
				// Excluir el logo y otros archivos estáticos del prerender
				if (status === 404 && path === '/images/logos/takeover-logo.png') {
					console.warn(`404 error on prerendering: ${path}`);
					return;
				}
				// Lógica para otros 404
				if (status === 404) {
					console.warn(`404 error on prerendering: ${path}`);
					return;
				}
				throw new Error(`${status} ${path} (linked from ${referrer})`);
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;