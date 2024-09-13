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
	let quitarReqFases = true;

	function agregarFase() {
		fases = [...fases, { nombreFace, precio, fechaExpira }]; // Crear nueva referencia del array
		nombreFace = '';
		precio = '';
		fechaExpira = '';
	}

	$: {
		if (fases.length > 0) {
			quitarReqFases = false;
		}
	}

	async function insertarEvento(event) {
		event.preventDefault();

		// Actualizar las fases en el store
		eventoStore.update((evento) => ({
			...evento,
			fases
		}));

		// Obtener usuario
		idUsuario = await traerUsuario();

		try {
			// Inserción del evento en la tabla 'mEvento'
			const { data: eventoData, error: eventoError } = await supabase
				.from('mEvento')
				.insert([
					{
						nombreEvento: nombreEvento,
						venue: venue,
						direccion: direccion,
						fechaInicio: fechaInicio,
						fechaFin: fechaFin,
						aforo: parseInt(aforo),
						usuario: idUsuario
					}
				])
				.select(); // Aseguramos que usamos select() para obtener los datos insertados

			// Manejar errores de inserción
			if (eventoError) {
				console.error('Error al insertar el evento:', eventoError.message);
				toast.error(`Error: ${eventoError.message}`);
				return; // Salir de la función si hay un error
			}

			// Si el insert fue exitoso, obtener el idEvento y continuar con las fases
			console.log(eventoData);
			const eventoId = eventoData[0].idevento;

			// Verificar que el evento se haya insertado correctamente antes de agregar fases
			if (eventoId) {
				console.log(fases);
				for (const fase of fases) {
					const { error: faseError } = await supabase.from('cFaseEvento').insert([
						{
							idEvento: eventoId,
							nombreFace: fase.nombreFace,
							precio: fase.precio,
							fechaExpira: fase.fechaExpira
						}
					]);

					if (faseError) {
						console.error('Error al insertar la fase:', faseError.message);
						throw new Error(faseError.message); // Lanzar error si falla la inserción de una fase
					}
				}

				// Mostrar mensaje de éxito
				toast.success('Evento y fases guardados exitosamente');
			}

			// Limpiar el store después de guardar todo
			limpiarStore();
			console.log('Evento insertado');
			goto('/home'); // Redirigir al home después de la inserción exitosa
		} catch (error) {
			console.error('Error durante la creación del evento y sus fases:', error.message);
			toast.error('Error al completar la creación del evento');
		}
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
		limpiarStore();
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

	<input
		bind:value={nombreFace}
		type="text"
		placeholder="Nombre de la fase"
		required={quitarReqFases}
	/>
	<input bind:value={precio} type="number" placeholder="Precio" required={quitarReqFases} />
	<input bind:value={fechaExpira} type="date" required={quitarReqFases} />

	<button type="button" on:click={agregarFase}>Agregar Fase</button><br />
	<button type="submit">Guardar Todo</button><br />
	<button type="button" on:click={regresarPaso1}>Regresar al Paso 1</button><br />
	<button type="button" on:click={cancelar}>Cancelar</button>
</form>

<style>
	p , h3 , input{
		color: whitesmoke;
	}
</style>
