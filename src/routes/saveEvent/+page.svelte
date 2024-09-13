<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import { eventoStore } from '$lib/stores/eventoStore';
	import { get } from 'svelte/store';

	const evento = get(eventoStore);
	let { nombreEvento, venue, fechaInicio, fechaFin, direccion, aforo } = evento;
	//fases
	let nombreFace = '';
	let precio = '';
	let fechaExpira = '';
	let fases = [];

	let idUsuario = '';

	function agregarFase() {
		fases.push({ nombreFace, precio, fechaExpira });
		nombreFace = '';
		precio = '';
		fechaExpira = '';
	}

	async function insertarEvento(event) {
		event.preventDefault();

		// Actualizar las fases en el store
		eventoStore.update((evento) => {
			return { ...evento, fases };
		});

		const eventoCompleto = get(eventoStore);
		console.log(eventoCompleto);

		idUsuario = await traerUsuario();

		const { data: eventoData, error: eventoError } = toast.promise(
			supabase
				.from('mEvento')
				.insert([{
					nombreEvento: nombreEvento,
					venue: venue,
					direccion: direccion,
					fechaInicio: fechaInicio,
					fechaFin: fechaFin,
					aforo: parseInt(aforo),
					usuario: idUsuario
				}])
				.select(),
			{
				loading: 'Guardando...',
				success: 'Evento creado con éxito',
				error: 'Error al crear evento'
			},
			{
				duration: 5000
			}
		);

		// Si hay un error en la respuesta de Supabase, también lo manejamos aquí
		if (eventoError) {
			console.error('Error al insertar el evento:', error.message);
			toast.error(`Error: ${error.message}`);
		} else {
			console.log(eventoData);
			const eventoId = eventoData[0].idEvento;

			if (eventoId !== null) {
				for (const fase of fases) {
					const { error: faseError } = await supabase.from('cFaseEvento').insert([
						{
							eventoId,
							nombreFace: fase.nombreFace,
							precio: fase.precio,
							fechaExpira: fase.fechaExpira
						}
					]);

					if (faseError) throw faseError;
				}
			}

			eventoStore.set({
				nombreEvento: '',
				venue: '',
				fechaInicio: '',
				fechaFin: '',
				direccion: '',
				aforo: '',
				fases: []
			});
			console.log('Evento insertado');
			goto('/home');
		}
	}

	async function traerUsuario() {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			return data.session.user.id;
		}
	}

	function regresarPaso1() {
		goto('/newEvent'); // Volver al paso 1 con los datos preservados en el store
	}

	function cancelar() {
		goto('/');
	}
</script>

<Toaster />

<form on:submit={insertarEvento}>
	<h3>Datos del evento</h3>
	<p>Nombre: {nombreEvento}</p>
	<p>Venue: {venue}</p>
	<p>Fecha de inicio: {fechaInicio}</p>
	<p>Fecha de fin: {fechaFin}</p>

	<h3>Agregar Fases</h3>
	{#each fases as fase}
		<div>
			<p>{fase.nombreFace} - {fase.precio} - {fase.fechaExpira}</p>
		</div>
	{/each}

	<input bind:value={nombreFace} type="text" placeholder="Nombre de la fase" required />
	<input bind:value={precio} type="number" placeholder="Precio" required />
	<input bind:value={fechaExpira} type="date" required />

	<button type="button" on:click={agregarFase}>Agregar Fase</button><br />
	<button type="submit">Guardar Todo</button><br />
	<button type="button" on:click={regresarPaso1}>Regresar al Paso 1</button><br />
	<button type="button" on:click={cancelar}>Cancelar</button>
</form>
