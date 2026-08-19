import { writable } from 'svelte/store';
import supabase from '$lib/supabase';

export const authStore = writable({
	user: null,
	profile: null,
	loading: true,
	isAdmin: false,
	isTaquilla: false
});

export async function obtenerPerfilUsuario() {
	try {
		const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
		if (sessionError || !sessionData?.session) {
			authStore.set({
				user: null,
				profile: null,
				loading: false,
				isAdmin: false,
				isTaquilla: false
			});
			return null;
		}

		const user = sessionData.session.user;
		const { data: perfil, error: perfilError } = await supabase
			.from('mPerfil')
			.select('*')
			.eq('id', user.id)
			.maybeSingle();

		const rol = perfil?.rol || (user.email === 'validaciones@takeover.com' ? 'taquilla' : 'admin');
		const profileData = perfil || {
			id: user.id,
			email: user.email,
			nombre: user.user_metadata?.nombre || user.email?.split('@')[0],
			rol
		};

		authStore.set({
			user,
			profile: profileData,
			loading: false,
			isAdmin: rol === 'admin',
			isTaquilla: rol === 'taquilla'
		});

		return profileData;
	} catch (error) {
		console.error('Error al obtener perfil de usuario:', error);
		authStore.update((state) => ({ ...state, loading: false }));
		return null;
	}
}
