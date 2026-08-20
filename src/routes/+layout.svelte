<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import supabase from '$lib/supabase';
	import { authStore, obtenerPerfilUsuario } from '$lib/stores/authStore';
	import Header from './Header.svelte';
	import LeftSidebar from './LeftSidebar.svelte';
	import '../app.css';

	let showHeader = false;
	$: currentPath = $page.url.pathname;
	$: showHeader = currentPath !== '/';

	const RUTAS_PERMITIDAS_TAQUILLA = [
		'/',
		'/home',
		'/validate',
		'/ventaTaquilla',
		'/newTicket'
	];

	function esRutaPermitidaTaquilla(path) {
		return RUTAS_PERMITIDAS_TAQUILLA.some(
			(ruta) => path === ruta || path.startsWith('/validate') || path.startsWith('/newTicket')
		);
	}

	// Route guard reactivo para cambios de ruta
	$: if (browser && $authStore.profile && $authStore.isTaquilla && currentPath !== '/') {
		if (!esRutaPermitidaTaquilla(currentPath)) {
			goto('/home');
		}
	}

	onMount(() => {
		const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
		const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
			if (session) {
				const maxAge = session.expires_in || 3600;
				document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
				document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
			} else if (event === 'SIGNED_OUT') {
				document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
				document.cookie = `sb-refresh-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
				if (browser) {
					localStorage.removeItem('token');
				}
				if (currentPath !== '/') {
					goto('/');
				}
			}
		});

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session && currentPath !== '/') {
				goto('/');
			} else if (session && currentPath === '/') {
				goto('/home');
			}
		});

		return () => {
			if (authListener && authListener.subscription) {
				authListener.subscription.unsubscribe();
			}
		};
	});
</script>

<div class="app" class:login-page={!showHeader}>
	{#if showHeader}
		<div class="header">
			<Header />
		</div>
		<div class="sidebar">
			<LeftSidebar />
		</div>
	{/if}

	<main class="main-content">
		<div class="content">
			<slot />
		</div>
	</main>
	{#if showHeader}
		<footer class="footer">
			<p>Todos los derechos reservados @takeover</p>
		</footer>
	{/if}
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: 250px 1fr;
		grid-template-rows: auto 1fr auto;
		grid-template-areas:
			'header header'
			'sidebar  main'
			'footer footer';
		min-height: 100vh;
	}
	.header {
		grid-area: header;
		background-color: rgb(32, 32, 32);
	}

	.sidebar {
		grid-area: sidebar;
		color: white;
		padding: 1rem;
		border-right: 0.7rem solid rgb(32, 32, 32);
	}

	.main-content {
		grid-area: main;
		padding: 0.3rem;
	}

	.content {
		padding: 20px;
	}

	.footer {
		grid-area: footer;
		background-color: #818181;
		text-align: center;
		padding: 1rem;
	}

	.login-page {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		grid-template-columns: none;
		grid-template-rows: none;
		grid-template-areas: none;
	}

	.login-page .main-content {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.login-page .content {
		width: 100%;
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
		.app {
			grid-template-areas:
				'header header'
				'main  main'
				'footer footer';
		}
	}
</style>
