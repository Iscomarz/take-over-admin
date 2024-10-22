<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { eventoStore } from '$lib/stores/eventoStore';
	import 'flatpickr/dist/flatpickr.min.css';
	import { onMount } from 'svelte';

	let salir = false;
	let token = '';
	let showDropdown = false; // Estado para controlar la visibilidad del dropdown
	let dropdownElement;

	if (typeof window !== 'undefined') {
		token = localStorage.getItem('token');
	}

	$: {
		salir = token !== null;
	}

	async function cerrarSesion() {
		salir = false;
		localStorage.removeItem('token');
		limpiarStore();
		await supabase.auth.signOut();
		goto('/');
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

	function toggleDropdown() {
		showDropdown = !showDropdown; // Cambia el estado al hacer clic
	}

	function clickFueraDropdown(event){
		if(dropdownElement && !dropdownElement.contains(event.target)){
			showDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', clickFueraDropdown);

		// Desregistrar el evento cuando el componente se desmonte
		return () => {
			document.removeEventListener('click', clickFueraDropdown);
		};
	});
</script>

<nav>
	<div class="nav">
		<div class="left-nav">
			<span>
				<a href="/home"><img src="\logos\takeover-logo.png" alt="" /></a>
			</span>
			<p>Take Over Admin</p>
		</div>

		<div id="dropdownHoverMenu" class="relative inline-block text-left" bind:this={dropdownElement}>
			<div>
				<button
					type="button"
					class="inline-flex w-full justify-center gap-x-1.5 rounded-md  px-3 py-2 text-sm font-semibold hover:text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 items-center"
					id="menu-button"
					aria-expanded={showDropdown}
					aria-haspopup="true"
					on:click={toggleDropdown}
				>
					Menu
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#3ff8ba" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path></svg>
				</button>
			</div>

			<!-- Mostrar u ocultar el dropdown basado en showDropdown -->
			{#if showDropdown}
				<div
					class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
					role="menu"
					aria-orientation="vertical"
					aria-labelledby="menu-button"
					tabindex="-1"
				>
					<div class="py-1" role="none">
						<a
							on:click={toggleDropdown}
							href="/newEvent"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
							tabindex="-1"
							id="menu-item-1">Nuevo Evento</a
						>
						<a
							on:click={toggleDropdown}
							href="/events"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
							tabindex="-1"
							id="menu-item-2">Administrar Eventos</a
						>
						<a
							on:click={toggleDropdown}
							href="/newTicket"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
							tabindex="-1"
							id="menu-item-3">Generar Ticket</a
						>
						<a
							on:click={toggleDropdown}
							href="/validate"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
							tabindex="-1"
							id="menu-item-4">Validar QR</a
						>
						<button
							on:click={cerrarSesion}
							type="submit"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
							tabindex="-1"
							id="menu-item-3">Salir</button
						>
					</div>
				</div>
			{/if}
		</div>

		{#if salir}
			<button class="salir" on:click={cerrarSesion}>Salir</button>
		{/if}
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

	@media (max-width: 768px) {
		#dropdownHoverMenu {
			display: block;
		}
		.salir {
			display: none;
		}
	}
</style>
