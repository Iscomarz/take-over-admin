<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { eventoStore } from '$lib/stores/eventoStore';
	import 'flatpickr/dist/flatpickr.min.css';
	import { tick } from 'svelte';
	import { onMount } from 'svelte';

	let showDropdown = false;
	let dropdownButton;
	let openEventos = false;
	let openCatalogos = false;
	let openDifusion = false;

	//control de email
	let userEmail = '';
	let isValidator = false;

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		checkSession();

		// Desregistrar el evento cuando el componente se desmonte
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	async function checkSession() {
		try {
			const { data, error } = await supabase.auth.getSession();
			if (error) {
				console.error('Error al obtener sesión:', error);
				return;
			}
			userEmail = data?.session?.user?.email ?? '';
			isValidator = userEmail === 'validaciones@takeover.com';
		} catch (e) {
			console.error(e);
		}
	}

	function handleClickOutside(event) {
		if (dropdownButton && !dropdownButton.contains(event.target)) {
			showDropdown = false;
		}
	}

	async function cerrarSesion() {
		limpiarStore();
		await supabase.auth.signOut();
		// La redirección y limpieza de cookies es manejada por el layout
	}

	function limpiarStore() {
		eventoStore.set({
			nombreEvento: '',
			venue: '',
			fechaInicio: '',
			fechaFin: '',
			direccion: '',
			aforo: '',
			fases: []
		});
	}

	async function toggleDropdown() {
		showDropdown = !showDropdown;
		await tick(); // Cambia el estado al hacer clic
	}

	function toggleGroup(group, event) {
		event.stopPropagation();
		if (group === 'eventos') openEventos = !openEventos;
		if (group === 'catalogos') openCatalogos = !openCatalogos;
		if (group === 'difusion') openDifusion = !openDifusion;
	}
</script>

<nav>
	<div class="nav">
		<div class="left-nav">
			<span>
				<a href="/home"><img src="/logos/takeover-logo.png" alt="Takeover Logo" /></a>
			</span>
			<p>Take Over Admin</p>
		</div>

		<div id="dropdownHoverMenu" class="relative text-left">
			<div>
				<button
					bind:this={dropdownButton}
					type="button"
					class="inline-flex w-full justify-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold hover:text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 items-center"
					id="menu-button"
					aria-expanded={showDropdown}
					aria-haspopup="true"
					on:click={toggleDropdown}
				>
					Menu
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						fill="#3ff8ba"
						viewBox="0 0 256 256"
						><path
							d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"
						></path></svg
					>
				</button>
			</div>

			<!-- Mostrar u ocultar el dropdown basado en showDropdown -->
			{#if showDropdown}
				<div
					class="dropdown-menu"
					role="menu"
					aria-orientation="vertical"
					aria-labelledby="menu-button"
					tabindex="-1"
				>
					{#if isValidator}
						<a on:click={toggleDropdown} href="/validate" class="dropdown-item" role="menuitem">✅ Validar QR</a>
						<div class="dropdown-divider"></div>
						<button on:click={cerrarSesion} class="dropdown-item dropdown-signout">Salir</button>
					{:else}
						<!-- Home -->
						<a on:click={toggleDropdown} href="/home" class="dropdown-item">Home</a>

						<!-- Eventos -->
						<a on:click={toggleDropdown} href="/events" class="dropdown-item">Eventos</a>

						<!-- Equipo -->
						<a on:click={toggleDropdown} href="/teamMembers" class="dropdown-item">Equipo</a>

						<div class="dropdown-divider"></div>

						<!-- Difusión group -->
						<button class="dropdown-group-label" on:click={(e) => toggleGroup('difusion', e)}>
							Difusión <span class="chevron {openDifusion ? 'open' : ''}">▼</span>
						</button>
						{#if openDifusion}
							<div class="dropdown-subgroup">
								<a on:click={toggleDropdown} href="/campanias" class="dropdown-subitem">Campañas</a>
								<a on:click={toggleDropdown} href="/recordatorios" class="dropdown-subitem">Recordatorios</a>
							</div>
						{/if}

						<!-- Catálogos group -->
						<button class="dropdown-group-label" on:click={(e) => toggleGroup('catalogos', e)}>
							Catálogos <span class="chevron {openCatalogos ? 'open' : ''}">▼</span>
						</button>
						{#if openCatalogos}
							<div class="dropdown-subgroup">
								<a on:click={toggleDropdown} href="/catalogos/venues" class="dropdown-subitem">Venues</a>
								<a on:click={toggleDropdown} href="/catalogos/generos" class="dropdown-subitem">Géneros Musicales</a>
							</div>
						{/if}

						<div class="dropdown-divider"></div>

						<!-- Sound of Take Over -->
						<a on:click={toggleDropdown} href="/sounds" class="dropdown-item">Sound of Take Over</a>
						<a on:click={toggleDropdown} href="/galeria" class="dropdown-item">Vibe Wall</a>

						<!-- Config -->
						<a on:click={toggleDropdown} href="/config" class="dropdown-item">Config</a>

						<div class="dropdown-divider"></div>

						<!-- Salir -->
						<button on:click={cerrarSesion} class="dropdown-item dropdown-signout">Salir</button>
					{/if}
				</div>
			{/if}
		</div>

		<button class="salir" on:click={cerrarSesion}>Salir</button>
	</div>
</nav>

<style>
	img {
		width: 70px;
	}

	nav {
		width: 100%;
	}

	.nav {
		color: azure;
		display: flex;
		justify-content: space-between;
		padding: 10px 20px 10px 20px;
		margin-left: 20px;
		margin-right: 20px;
		align-items: center;
	}

	.left-nav {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}

	p {
		font-weight: bold;
	}

	#dropdownHoverMenu {
		display: none;
	}

	/* Dropdown panel */
	.dropdown-menu {
		position: absolute;
		right: 0;
		z-index: 50;
		margin-top: 0.5rem;
		width: 220px;
		background: #111;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		overflow: hidden;
		padding: 0.4rem 0;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.6rem 1.2rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: none;
		font-family: inherit;
		transition: background 0.15s ease;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
	}

	.dropdown-group-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.5rem 1.2rem;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.35);
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition: color 0.15s ease;
	}

	.dropdown-group-label:hover {
		color: rgba(255, 255, 255, 0.6);
	}

	.chevron {
		font-size: 0.65rem;
		transition: transform 0.2s ease;
		display: inline-block;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown-subgroup {
		padding-bottom: 0.3rem;
	}

	.dropdown-subitem {
		display: block;
		padding: 0.5rem 1.2rem 0.5rem 2rem;
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.dropdown-subitem:hover {
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.9);
	}

	.dropdown-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.06);
		margin: 0.3rem 0;
	}

	.dropdown-signout {
		color: rgba(255, 95, 86, 0.8);
	}

	.dropdown-signout:hover {
		color: #ff5f56;
		background: rgba(255, 95, 86, 0.06);
	}

	@media (max-width: 768px) {
		#dropdownHoverMenu {
			display: block !important;
		}
		.salir {
			display: none;
		}
	}
</style>
