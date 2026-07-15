<script>
	import supabase from '$lib/supabase';
	import EventCard from '../../components/eventCard.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';

	let eventos = [];
	let token = '';
	let vistaLista = false;

	function cambiarVista(lista) {
		vistaLista = lista;
		localStorage.setItem('pref_vista_eventos', lista ? 'lista' : 'mosaico');
	}

	onMount(async () => {
		const pref = localStorage.getItem('pref_vista_eventos');
		if (pref) {
			vistaLista = pref === 'lista';
		}
		// Obtener eventos ordenados de más recientes a más antiguos
		let { data: mEvento, error } = await supabase
			.from('mEvento')
			.select('*')
			.order('idevento', { ascending: false });

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
			const id = toast('Cargando Imagenes...', { type: 'loading' });
			// Para cada evento, obtener la URL firmada
			for (let i = 0; i < eventos.length; i++) {
				eventos[i].loadingImage = true; // Estado de carga inicial

				let { data: image, error: errorImage } = await supabase.storage
					.from('imageEventos')
					.createSignedUrl(eventos[i].pathImage, 60 * 60);

				if (errorImage) {
					console.log('Error al traer imagen de evento', errorImage);
				} else {
					eventos[i].pathImage = image.signedUrl;
				}

				eventos[i].loadingImage = false;
				toast.dismiss(id); // Indicar que la imagen ha cargado
			}
		} else if (error || mEvento.length === 0) {
			console.log('Error al traer eventos o no existen eventos');
		}
	});
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div
			class="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-700/30 pb-6 mb-8 gap-4"
		>
			<div>
				<h1 class="text-3xl font-bold mb-1">Administrar Eventos</h1>
				<p class="text-stone-400 text-sm">Gestiona tus eventos y su configuración</p>
			</div>

			<div class="flex items-center gap-4">
				<!-- Switch/Toggle de Vista -->
				<div
					class="flex items-center bg-stone-800/80 rounded-xl p-1 border border-stone-700/60 text-stone-400"
				>
					<button
						on:click={() => cambiarVista(false)}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 {!vistaLista
							? 'bg-stone-700 text-white shadow-md'
							: 'hover:text-white'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							fill="currentColor"
							viewBox="0 0 256 256"
							><path d="M120,48V120H48V48ZM48,136H120v72H48Zm160-88H136V120h72Zm-72,160h72V136H136Z"
							></path></svg
						>
						Mosaico
					</button>
					<button
						on:click={() => cambiarVista(true)}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 {vistaLista
							? 'bg-stone-700 text-white shadow-md'
							: 'hover:text-white'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							fill="currentColor"
							viewBox="0 0 256 256"
							><path
								d="M80,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H88A8,8,0,0,1,80,64Zm136,56H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM44,52A12,12,0,1,0,56,64,12,12,0,0,0,44,52Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,116Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,180Z"
							></path></svg
						>
						Lista
					</button>
				</div>

				<!-- Botón Crear Nuevo -->
				<a
					href="/newEvent"
					class="bg-green-600 hover:bg-green-500 text-white py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg border border-green-500/30 flex items-center gap-2 text-sm no-underline"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						fill="currentColor"
						viewBox="0 0 256 256"
					>
						<path
							d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
						></path>
					</svg>
					Crear Evento
				</a>
			</div>
		</div>

		{#if eventos.length > 0}
			{#if vistaLista}
				<!-- Vista de Lista (Horizontal cards) -->
				<div class="flex flex-col gap-4">
					{#each eventos as evento}
						<EventCard
							id={evento.idevento}
							nombreEvento={evento.nombreEvento}
							venue={evento.venue}
							image={evento.pathImage}
							loadingImage={evento.loadingImage}
							horizontal={true}
						/>
					{/each}
				</div>
			{:else}
				<!-- Vista Mosaico (Large cards grid) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each eventos as evento}
						<EventCard
							id={evento.idevento}
							nombreEvento={evento.nombreEvento}
							venue={evento.venue}
							image={evento.pathImage}
							loadingImage={evento.loadingImage}
							horizontal={false}
						/>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Cargando eventos...</p>
				</div>
			</div>
		{/if}
	</div>
</div>
