import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		prerender: {
			handleHttpError: ({status, path, referrer, referenceType }) =>{
				if(status === 404){
					console.warn(`404 error on prerendering: ${path}`);
					return;
				}
				throw new Error(`${status} ${path} (linked from ${referrer})`);
			}
	},
	preprocess: vitePreprocess()
};

export default config;
