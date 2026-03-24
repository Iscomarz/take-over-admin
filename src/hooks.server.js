import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const token = event.cookies.get('sb-access-token');
	const path = event.url.pathname;
	
	// Si no hay token y no es la página de login (path '/'), redirige a login
	if (!token && path !== '/') {
		throw redirect(303, '/');
	}

	// Si hay token y estamos en la página de login, redirigir a /home
	if (token && path === '/') {
		throw redirect(303, '/home');
	}

	return resolve(event);
}
