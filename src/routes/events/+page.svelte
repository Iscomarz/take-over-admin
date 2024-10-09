<script>
	import supabase from '$lib/supabase';
	import EventCard from '../../components/eventCard.svelte';
	import { onMount } from 'svelte';

	let eventos = [];

	onMount(async () => {
		let { data: mEvento, error } = await supabase.from('mEvento').select('*');

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
			console.log('Select a eventos', eventos);
		} else if (error || mEvento.length === 0) {
			console.log('Error al traer eventos o no existen eventos');
		}
	});
</script>

<h1>Administrar Eventos</h1>

{#if eventos.length > 0}
	<div class="event-grid">
		{#each eventos as evento}
			<EventCard id={evento.idevento} nombreEvento={evento.nombreEvento} venue={evento.venue} />
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

	/* Estilos para el grid */
	.event-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Hasta 4 columnas, con tamaño mínimo de 250px */
		gap: 16px; /* Espacio entre las tarjetas */
		padding: 16px;
	}

	/* Ajustes para pantallas más pequeñas */
	@media (max-width: 768px) {
		.event-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Reduce el tamaño mínimo en pantallas más pequeñas */
		}
	}

	@media (max-width: 480px) {
		.event-grid {
			grid-template-columns: 1fr; /* Solo una columna en pantallas muy pequeñas */
		}
	}
</style>