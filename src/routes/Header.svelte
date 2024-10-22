<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { eventoStore } from '$lib/stores/eventoStore';

	let salir = false;
	let token = '';

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
</script>

<nav>
	<div class="nav">
		<div class="left-nav">
			<span>
				<a href="/home"><img src="\images\logos\takeover-logo.png" alt="" /></a>
			</span>
			<p>Take Over Admin</p>
		</div>

		<button
			id="dropdownHoverMenu"
			data-dropdown-toggle="dropdownHover"
			data-dropdown-trigger="hover"
			class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
			type="button"
			>Dropdown hover <svg
				class="w-2.5 h-2.5 ms-3"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 10 6"
			>
				<path
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="m1 1 4 4 4-4"
				/>
			</svg>
		</button>

		<!-- Dropdown menu -->
		<div
			id="dropdownHover"
			class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700"
		>
			<ul
				class="py-2 text-sm text-gray-700 dark:text-gray-200"
				aria-labelledby="dropdownHoverMenu"
			>
				<li>
					<a
						href="/home"
						class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
						>Home</a
					>
				</li>
				<li>
					<a
						href="/newEvent"
						class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
						>Nuevo Evento</a
					>
				</li>
				<li>
					<a
						href="/events"
						class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
						>Administrar Eventos</a
					>
				</li>
				<li>
					<a
						href="/newTicket"
						class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
						>Generar Ticket</a
					>
				</li>
				<li>
					<a
						href="/validate"
						class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
						>Validar Qr</a
					>
				</li>
			</ul>
		</div>

		{#if salir}
			<button on:click={cerrarSesion}>Salir</button>
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

	#dropdownHoverMenu{
		display: none;
	}

	@media (max-width: 768px) {
		#dropdownHoverMenu {
			display: block; /* Esto ocultará el elemento en pantallas pequeñas */
		}
	}
</style>
