<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import { authStore, obtenerPerfilUsuario } from '$lib/stores/authStore';
	import 'flatpickr/dist/flatpickr.min.css';

	let email = '';
	let pass = '';
	let loading = false;

	// // Función para registrar un usuario si en un futuro se registran mas usuarios
	// async function registrar() {
	// 	const { user, error } = await supabase.auth.signUp({
	// 		email: email,
	// 		password: pass
	// 	});

	// 	if (error) {
	// 		toast.error('Error al registrar el usuario.');
	// 	} else {
	// 		toast.success('Usuario registrado exitosamente.');
	// 	}
	// }

	// Función para iniciar sesión
	async function login(event) {
		event.preventDefault(); // Evitar que el formulario se recargue al enviar

		if (loading) return;
		loading = true;

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password: pass
			});

			if (error) {
				throw error;
			}

			// Si la respuesta es correcta y contiene la sesión
			if (data?.session) {
				const maxAge = data.session.expires_in || 3600;
				const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
				document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
				document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;

				await obtenerPerfilUsuario();

				toast.success('¡Bienvenido!', {
					duration: 3000
				});

				await goto('/home');
			} else {
				throw new Error('No se pudo obtener la sesión de usuario.');
			}
		} catch (err) {
			console.error('Error de inicio de sesión:', err);
			const mensaje = err.message === 'Invalid login credentials' 
				? 'Contraseña o correo inválido.' 
				: (err.message || 'Error al iniciar sesión.');
			toast.error(mensaje);
		} finally {
			loading = false;
		}
	}
</script>

<!-- Asegúrate de colocar el Toaster en la parte superior del componente -->
<Toaster />

<section class="">
	<div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
		<a href="/" class="flex items-center mb-6 text-2xl font-semibold welcome">
			<img class="mr-2" src="/logos/takeover-logo.png?version=1.0" alt="logo" />
			Welcome
		</a>
		<div class="w-full bg-white rounded-lg shadow md:mt-0 sm:max-w-md xl:p-0 login">
			<div class="p-6 space-y-4 md:space-y-6 sm:p-8">
				<h1 class="text-xl font-bold leading-tight tracking-tight md:text-2xl dark:text-white">
					Sign in to your account
				</h1>
				<form class="space-y-4 md:space-y-6" on:submit={login}>
					<div>
						<label for="email" class="block mb-2 text-sm font-medium dark:text-white"
							>Your email</label
						>
						<input
							type="email"
							name="email"
							id="email"
							bind:value={email}
							class="border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="name@company.com"
							required
						/>
					</div>
					<div>
						<label for="password" class="block mb-2 text-sm font-medium dark:text-white"
							>Password</label
						>
						<input
							type="password"
							name="password"
							id="password"
							bind:value={pass}
							placeholder="••••••••"
							class="border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-500 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							required
						/>
					</div>
					<button type="submit" class="signIn" disabled={loading}>
						{#if loading}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Iniciando sesión...
						{:else}
							Sign in
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
</section>

<style>
	.welcome {
		display: contents;
	}

	.login {
		background-color: rgb(32, 32, 32);
		margin-top: 20px;
	}
	.signIn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 45px;
		background-color: aquamarine;
		border-radius: 10px;
		font-weight: bold;
		margin-top: 40px !important;
		transition: opacity 0.2s ease, transform 0.1s ease;
	}
	.signIn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	img {
		width: 140px;
	}
	button {
		color: black;
	}
</style>
