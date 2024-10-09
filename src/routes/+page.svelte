<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';

	let email = '';
	let pass = '';
	let token = '';

	// Verificar si el token está en localStorage al cargar el componente
	if (typeof window !== 'undefined') {
		token = localStorage.getItem('token');
		if (token != null) {
			goto('/home');
		}
	}

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

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email,
				password: pass
			});

			if (error) {
				// Si ocurre un error, mostrar el mensaje de error
				throw new Error(error.message);
			}

			// Si la respuesta es correcta y contiene la sesión
			if (data.session) {
				localStorage.setItem('token', data.session.access_token);
				toast.success('Sesión Iniciada!');
				goto('/home');
			} else {
				throw new Error('No se pudo obtener la sesión.');
			}
		} catch (err) {
			// Manejar cualquier error durante el inicio de sesión
			console.error('Error de inicio de sesión:', err.message);
			toast.error('Contraseña o usuario inválido.');
		}
	}
</script>

<!-- Asegúrate de colocar el Toaster en la parte superior del componente -->
<Toaster />

<section class="">
	<div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
		<a
			href="/"
			class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white welcome"
		>
			<img class="mr-2" src="\images\logos\takeover-logo.png" alt="logo" />
			Welcome
		</a>
		<div class="w-full bg-white rounded-lg shadow md:mt-0 sm:max-w-md xl:p-0 login">
			<div class="p-6 space-y-4 md:space-y-6 sm:p-8">
				<h1
					class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white"
				>
					Sign in to your account
				</h1>
				<form class="space-y-4 md:space-y-6" on:submit={login}>
					<div>
						<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
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
						<label
							for="password"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label
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
					<button
						type="submit"
						class="signIn"
						>Sign in</button
					>
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
	.signIn{
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 45px;
		background-color: aquamarine;
		border-radius: 10px;
		font-weight: bold;
		margin-top: 40px !important;
	}

	img{
		width: 140px;
	}
</style>
