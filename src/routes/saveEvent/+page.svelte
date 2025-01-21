<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import { eventoStore } from '$lib/stores/eventoStore';
	import { get } from 'svelte/store';
	import TicketCard from '../../components/ticketCard.svelte';
	import 'flatpickr/dist/flatpickr.min.css';
	import { FileDrop } from 'svelte-droplet';

	const evento = get(eventoStore);
	let { nombreEvento, venue, fechaInicio, fechaFin, direccion } = evento;
	//fases
	let nombreFace = '';
	let precio = '';
	let fechaExpira = '';
	let limite;
	let fases = [];
	let token = '';
	let idUsuario = '';
	let quitarReqFases = true;

	let droppedFiles = [];
	let imagePreviewUrl = '';
	let imageName = '';

	onMount(() => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
	});

	function agregarFase() {
		fases = [...fases, { nombreFace, precio, fechaExpira, limite }]; // Crear nueva referencia del array
		nombreFace = '';
		precio = '';
		fechaExpira = '';
		limite = null;
	}

	function borrarFase(index) {
		fases = [...fases.slice(0, index), ...fases.slice(index + 1)];
	}

	$: quitarReqFases = fases.length === 0;

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
						usuario: idUsuario,
						pathImage: `${nombreEvento.replace(/ /g, '')}_img.png`
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
				await subirImagenEvento();
				console.log(fases);
				for (const fase of fases) {
					const { error: faseError } = await supabase.from('cFaseEvento').insert([
						{
							idEvento: eventoId,
							nombreFace: fase.nombreFace,
							precio: fase.precio,
							fechaExpira: fase.fechaExpira,
							limite: fase.limite
						}
					]);

					if (faseError) {
						console.error('Error al insertar la fase:', faseError.message);
						throw new Error(faseError.message); // Lanzar error si falla la inserción de una fase
					} else {
						// Mostrar mensaje de éxito
						toast.success('Evento creado exitosamente',{
							duration: 3000
						});
					}
				}
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

	function handleFiles(files) {
		const validImagesTypes = ['image/png', 'image/jpeg'];
		const [file] = files;

		//Verificar el tipo de archivo
		if (validImagesTypes.includes(file.type)) {
			const img = new Image();
			img.src = URL.createObjectURL(file);

			img.onload = () => {
				const { width, height } = img;

				// Verifica si la imagen es cuadrada
				if (width === height) {
					imagePreviewUrl = img.src; // Mostrar la imagen
					droppedFiles = files; // Guarda el archivo solo si es válido
				} else {
					toast.error('La imagen debe ser cuadrada (ancho igual a alto).');
					imagePreviewUrl = null;
					droppedFiles = [];
				}
			};

			console.log(files);
		} else {
			toast.error('Selecciona un archivo de imagen valido (PNG o JPG)');
		}
	}

	function eliminarImagen() {
		imagePreviewUrl = '';
		droppedFiles = [];
	}

	async function subirImagenEvento() {
		// Subir el archivo a Supabase Storage
		const { data, error } = await supabase.storage
			.from('imageEventos')
			.upload(`${nombreEvento.replace(/ /g, '')}_img.png`, droppedFiles[0]);

		if (error) {
			console.log('Error subiendo imagen a Supabase:', error);
		} else {
			return data.path; // Devolver la ruta del archivo
		}
	}
</script>

<Toaster />

<form on:submit={insertarEvento}>
	<button
		type="button"
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center flex items-center"
		on:click={regresarPaso1}
	>
		<svg
			style="margin-right: 3px;"
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			fill="#000000"
			viewBox="0 0 256 256"
			><path
				d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
			></path></svg
		> Regresar al paso 1
	</button><br />

	<div class="datos">
		<h3>Datos del evento</h3>
		<p>Nombre: <b>{nombreEvento}</b></p>
		<p>Venue: <b>{venue}</b></p>
		<p>Fecha de inicio: <b>{fechaInicio}</b></p>
		<p>Fecha de fin: <b>{fechaFin}</b></p>
	</div>

	<div class="tickets">
		<h3>Agregar Fases/Tickets</h3>
		{#each fases as fase, index}
			<TicketCard {fase} {index} {borrarFase} />
		{/each}

		<div class="grid grid-cols-4 gap-2 items-center infoTicket">
			<!-- Fila 1: Etiquetas -->
			<div>
				<label for="nombre">Nombre Fase/Ticket</label>
			</div>
			<div>
				<label for="precio">Precio</label>
			</div>
			<div>
				<label for="fecha">Fecha Expiración</label>
			</div>
			<div>
				<label for="limite">Limite</label>
			</div>
			<!-- Fila 2: Inputs y botón -->
			<div>
				<input
					name="nombre"
					bind:value={nombreFace}
					type="text"
					required={quitarReqFases}
					class="w-full"
				/>
			</div>
			<div>
				<input
					name="precio"
					bind:value={precio}
					type="number"
					required={quitarReqFases}
					class="w-full"
				/>
			</div>
			<div>
				<input
					name="fecha"
					bind:value={fechaExpira}
					type="date"
					required={quitarReqFases}
					class="w-full"
				/>
			</div>
			<div>
				<input
					name="limite"
					bind:value={limite}
					type="number"
					required={quitarReqFases}
					class="w-full"
					placeholder="Sin limite"
				/>
			</div>
		</div>

		<div>
			<button
				type="button"
				class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center flex items-center agregar"
				on:click={agregarFase}
			>
				<svg
					style="margin-right: 3px;"
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="#000000"
					viewBox="0 0 256 256"
					><path
						d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
					></path></svg
				>Agregar Tecket</button
			>
		</div>
	</div>

	{#if !imagePreviewUrl}
		<FileDrop {handleFiles} let:droppable>
			<div class="zone" class:droppable>Selecciona o suelta una imagen aqui</div>
		</FileDrop>
	{:else}
		<img src={imagePreviewUrl} alt="Vista previa" class="image-preview" />
	{/if}

	{#if imagePreviewUrl}
		<button
			type="button"
			on:click={eliminarImagen}
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
		>
			Eliminar imagen
		</button>
	{/if}

	<div class="guardar">
		<button
			type="submit"
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
			>Guardar Todo</button
		><br />

		<button
			type="button"
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
			on:click={cancelar}>Cancelar</button
		>
	</div>
</form>

<style>
	form {
		color: whitesmoke;
	}

	h3 {
		font-size: 1.3rem;
	}

	.agregar {
		background-color: dimgray;
	}

	.infoTicket {
		margin-bottom: 20px;
	}

	button {
		background-color: rgb(63, 248, 186);
		color: black;
	}

	button:hover {
		background-color: rgb(52, 180, 137);
	}

	.guardar {
		display: flex;
		margin-top: 10px;
		padding: 20px;
		gap: 20px;
		width: 100%;
		align-items: center;
		justify-content: center;
	}

	.datos {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: 20px;
	}

	.tickets {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: 20px;
	}

	input {
		color: black;
	}

	.zone {
		background-color: #6d6d82;
		padding: 30px;
		border: 2px solid #dddddd;
		color: black;
		width: 80%;
	}
	.droppable {
		border-color: #1f79ff;
	}

	.image-preview {
		max-width: 80%;
		margin-top: 10px;
	}
</style>
