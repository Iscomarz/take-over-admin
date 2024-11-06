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
<Toaster/>

<h1>Administrar Eventos</h1>

{#if eventos.length > 0}
	<div class="event-grid">
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
	<p>Cargando...</p>
{/if}

<style>
	h1 {
		color: whitesmoke;
		text-align: center;
	}

	.event-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 16px;
		padding: 16px;
	}

	@media (max-width: 768px) {
		.event-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
	}

	@media (max-width: 480px) {
		.event-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
