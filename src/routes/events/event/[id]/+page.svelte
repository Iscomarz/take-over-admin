<script>
	import { onDestroy, onMount } from 'svelte';
	import { eventoId } from '$lib/stores/eventoId';
	import supabase from '$lib/supabase';
	import toast, { Toaster } from 'svelte-french-toast';
	import { goto } from '$app/navigation';

	let id;
	let evento = {};
	let loading = true;
	let editar = false;

	const unsubscribe = eventoId.subscribe((value) => {
		id = value; // Almacenamos el valor del store
	});

	onMount(async () => {
		let { data: mEvento, error } = await supabase.from('mEvento').select('*').eq('idevento', id);
		if (mEvento && mEvento.length > 0) {
			evento = mEvento[0];
		}
		loading = false;
		if (error) {
			console.log('Error al traer evento o no existe el id');
		}
	});

	function formatoFecha(fechaISO) {
		const fecha = new Date(fechaISO);
		const dia = String(fecha.getDate()).padStart(2, '0'); // Obtener el día (dd)
		const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Obtener el mes (MM)
		const año = fecha.getFullYear(); // Obtener el año (aaaa)

		return `${dia}/${mes}/${año}`; // Retornar en formato dd/MM/aaaa
	}

	function editarEvent() {
		editar = true;
	}
	function cancelEdit() {
		editar = false;
	}

	async function guardarEditar() {
		const { data, error } = await supabase.from('mEvento').update(evento).eq('idevento', id);

		if (error) {
			console.log('Error actualizando el evento', error);
		} else {
			toast.success('Evento actualizado con exito',
				{
					duration: 3000
				}
			);
			console.log('Evento actualizado con exito');
			editar = false;
		}
	}

	function atras(){
		goto('/events');
	}

	onDestroy(unsubscribe); // Limpiamos la suscripción al destruir el componente
</script>

<Toaster />

<button on:click={atras} class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center">
	Atras
</button>

<button
	on:click={editarEvent}
	class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
	>Editar</button
><br />

{#if loading}
	<p>Cargando...</p>
{:else if editar}
	<!-- Modo edición -->
	<input type="text" bind:value={evento.nombreEvento} placeholder="Nombre del evento" />
	<input type="text" bind:value={evento.venue} placeholder="Venue" />
	<input type="text" bind:value={evento.direccion} placeholder="Dirección" />
	<textarea bind:value={evento.descripcion} placeholder="Descripción"></textarea>
	<br />
	<button
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
		on:click={guardarEditar}>Guardar</button
	>
	<button
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
		on:click={cancelEdit}>Cancelar</button
	>
	<!-- Puedes añadir más campos según lo necesites -->
{:else}
	<!-- Mostrar detalles cuando no esté en modo de edición -->
	<h1>{evento.nombreEvento}</h1>
	<p>Venue: {evento.venue}</p>
	<p>Direccion: {evento.direccion}</p>
	<p>Descripcion: {evento.descripcion == null ? '' : evento.descripcion}</p>
	<p>Fecha: {formatoFecha(evento.fechaInicio)}</p>
{/if}

<style>
	input, textarea {
		color: black;
	}

	button {
		background-color: rgb(63, 248, 186);
		color: black;
	}

	button:hover {
		background-color: rgb(52, 180, 137);
	}
</style>
