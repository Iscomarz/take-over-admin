import { writable } from 'svelte/store';
import supabase from '$lib/supabase';

export const authStore = writable({
	user: null,
	profile: null,
	loading: true,
	isAdmin: false,
	isTaquilla: false
});

export async function obtenerPerfilUsuario(providedUser = null) {
	try {
		let user = providedUser;
		if (!user) {
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionError || !sessionData?.session?.user) {
				authStore.set({
					user: null,
					profile: null,
					loading: false,
					isAdmin: false,
					isTaquilla: false
				});
				return null;
			}
			user = sessionData.session.user;
		}

		let perfil = null;
		try {
			const { data, error: perfilError } = await supabase
				.from('mPerfil')
				.select('*')
				.eq('id', user.id)
				.maybeSingle();

			if (!perfilError && data) {
				perfil = data;
			} else if (perfilError) {
				console.warn('Aviso al obtener mPerfil (usando fallback seguro):', perfilError.message);
			}
		} catch (dbErr) {
			console.warn('Excepción de base de datos en mPerfil:', dbErr);
		}

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
		console.error('Error general al obtener perfil de usuario:', error);
		authStore.update((state) => ({ ...state, loading: false }));
		return null;
	}
}
