<script>
	import supabase from '$lib/supabase';
	import EventCard from '../../components/eventCard.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast,{ Toaster } from 'svelte-french-toast';

	let eventos = [];
	let token = '';

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		// Obtener eventos
		let { data: mEvento, error } = await supabase.from('mEvento').select('*');

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
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Administrar Eventos</h1>
			<p class="text-stone-400 text-sm">Gestiona tus eventos y su configuración</p>
		</div>

		{#if eventos.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each eventos as evento}
					<EventCard
						id={evento.idevento}
						nombreEvento={evento.nombreEvento}
						venue={evento.venue}
						image={evento.pathImage}
						loadingImage={evento.loadingImage}
					/>
				{/each}
			</div>
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
