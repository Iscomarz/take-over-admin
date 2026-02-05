<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';

	let userEmail = '';
	let isValidator = false;
	let openEventos = false;
	let openHerramientas = false;

	onMount(() => {
		checkSession();
	});

  async function checkSession() {
        const { data } = await supabase.auth.getSession();
        userEmail = data?.session?.user?.email ?? '';
        isValidator = userEmail === 'validaciones@takeover.com';
    }

	function toggleGroup(group) {
		if (group === 'eventos') openEventos = !openEventos;
		if (group === 'herramientas') openHerramientas = !openHerramientas;
	}
</script>
<section class="menu">
	{#if isValidator}
		<a class="menu-item" href="/validate">✅ Validar QR</a>
	{:else}
		<a class="menu-item" href="/home">
			<span class="icon" aria-hidden="true">
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
					<path d="M3 9.5L12 3l9 6.5"></path>
					<path d="M9 22V12h6v10"></path>
				</svg>
			</span>
			<span>Home</span>
		</a>

		<div class="menu-group">
			<button class="menu-label" on:click={() => toggleGroup('eventos')} aria-expanded={openEventos} aria-controls="eventos-list">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<rect x="3" y="5" width="18" height="16" rx="2"></rect>
						<path d="M16 3v4M8 3v4"></path>
					</svg>
				</span>
				<span>Eventos</span>
			</button>
			<div id="eventos-list" class="submenu-list {openEventos ? 'open' : ''}">
			<a class="submenu" href="/events">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<rect x="3" y="5" width="18" height="16" rx="2"></rect>
						<path d="M8 3v4M16 3v4"></path>
					</svg>
				</span>
				<span>Ver Todos</span>
			</a>
			<a class="submenu" href="/newEvent">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 5v14"></path>
						<path d="M5 12h14"></path>
					</svg>
				</span>
				<span>Crear Nuevo</span>
			</a>
			</div>
		</div>
		<div class="divider"></div>

		<div class="menu-group">
			<button class="menu-label" on:click={() => toggleGroup('herramientas')} aria-expanded={openHerramientas} aria-controls="herramientas-list">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<path d="M21.7 13.3l-2-2a1 1 0 0 0-1.4 0l-1.3 1.3-3.3-3.3 1.3-1.3a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0L3 9v4h4l6.7-6.7 3.3 3.3-6.7 6.7V21h4l4-4a1 1 0 0 0 0-1.4z"></path>
					</svg>
				</span>
				<span>Herramientas</span>
			</button>
			<div id="herramientas-list" class="submenu-list {openHerramientas ? 'open' : ''}">
			<a class="submenu" href="/newTicket">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<path d="M21 10v4a2 2 0 0 1-2 2h-2v2H7v-2H5a2 2 0 0 1-2-2v-4"></path>
						<path d="M7 7h10v4H7z"></path>
					</svg>
				</span>
				<span>Generar Tickets</span>
			</a>
			<a class="submenu" href="/validate">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<path d="M20 6L9 17l-5-5"></path>
					</svg>
				</span>
				<span>Validar QR</span>
			</a>
			<a class="submenu" href="/reenviarTickets">
				<span class="icon" aria-hidden="true">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<path d="M22 12v6a2 2 0 0 1-2 2H4"></path>
						<path d="M16 6l6 6-6 6"></path>
					</svg>
				</span>
				<span>Reenviar Tickets</span>
			</a>
			</div>
		</div>
		<div class="divider"></div>

		<a class="menu-item" href="/teamMembers">
			<span class="icon" aria-hidden="true">
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
					<path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
					<circle cx="12" cy="7" r="4"></circle>
				</svg>
			</span>
			<span>Equipo</span>
		</a>
		<a class="menu-item" href="/campanias">
			<span class="icon" aria-hidden="true">
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
					<path d="M22 2L11 13"></path>
					<path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
				</svg>
			</span>
			<span>Campañas</span>
		</a>
	{/if}
</section>

<style>
	.menu {
		display: flex;
		padding: 20px;
		flex-direction: column;
		gap: 15px;
		justify-content: start;
		align-items: start;
		color: rgb(245, 245, 239);
	}

	.menu-item {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 8px 12px;
			border-radius: 8px;
			text-decoration: none;
			color: inherit;
		}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		flex: 0 0 1.1rem;
	}

	.icon-svg {
		width: 1.1rem;
		height: 1.1rem;
		display: block;
	}

	.submenu-list {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.18s ease-out;
	}

	.submenu-list.open {
		max-height: 400px;
	}

	.menu-item:hover {
			background: rgba(255,255,255,0.02);
		}

	.menu-group {
			width: 100%;
			margin-top: 6px;
		}

	.menu-label {
			font-size: 0.85rem;
			font-weight: 700;
			color: #bfbfbf;
			padding: 8px 12px;
			text-transform: uppercase;
			letter-spacing: 0.03em;
		}

	.submenu {
			display: block;
			padding: 6px 24px;
			text-decoration: none;
			color: #eaeaea;
			border-radius: 6px;
			margin: 4px 0;
		}

	.submenu:hover {
			background: rgba(255,255,255,0.02);
		}

.divider {
		width: 100%;
		height: 1px;
		background: rgba(255,255,255,0.04);
		margin: 8px 0;
		border-radius: 2px;
	}
</style>
