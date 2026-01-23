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

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white p-6 pb-20">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="mb-6">
			<button
				type="button"
				class="bg-stone-800/70 hover:bg-stone-700/90 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2"
				on:click={regresarPaso1}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
					></path>
				</svg>
				Regresar al paso 1
			</button>
		</div>

		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Configuración del Evento</h1>
			<p class="text-stone-400 text-sm">Revisa los datos y agrega las fases del evento</p>
		</div>

<form on:submit={insertarEvento}>
		<!-- Resumen del evento -->
		<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 mb-6">
			<h3 class="text-xl font-semibold mb-4 text-stone-200">Datos del Evento</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="bg-stone-700/50 rounded-xl p-4">
					<p class="text-stone-400 text-sm mb-1">Nombre</p>
					<p class="font-semibold text-lg">{nombreEvento}</p>
				</div>
				<div class="bg-stone-700/50 rounded-xl p-4">
					<p class="text-stone-400 text-sm mb-1">Venue</p>
					<p class="font-semibold text-lg">{venue}</p>
				</div>
				<div class="bg-stone-700/50 rounded-xl p-4">
					<p class="text-stone-400 text-sm mb-1">Fecha de inicio</p>
					<p class="font-semibold">{fechaInicio}</p>
				</div>
				<div class="bg-stone-700/50 rounded-xl p-4">
					<p class="text-stone-400 text-sm mb-1">Fecha de fin</p>
					<p class="font-semibold">{fechaFin}</p>
				</div>
			</div>
		</div>

		<!-- Sección de Fases/Tickets -->
		<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 mb-6">
			<h3 class="text-xl font-semibold mb-4 text-stone-200">Fases/Tickets del Evento</h3>
			
			<!-- Fases agregadas -->
			<div class="space-y-3 mb-6">
				{#each fases as fase, index}
					<TicketCard {fase} {index} {borrarFase} />
				{/each}
			</div>

			<!-- Formulario para agregar fase -->
			<div class="bg-stone-700/50 rounded-xl p-4 mb-4">
				<p class="text-stone-300 text-sm mb-3 font-medium">Agregar Nueva Fase</p>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div>
						<label for="nombre" class="block text-xs text-stone-400 mb-1">Nombre Fase/Ticket</label>
						<input
							name="nombre"
							bind:value={nombreFace}
							type="text"
							required={quitarReqFases}
							class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
							placeholder="VIP, General..."
						/>
					</div>
					<div>
						<label for="precio" class="block text-xs text-stone-400 mb-1">Precio</label>
						<input
							name="precio"
							bind:value={precio}
							type="number"
							required={quitarReqFases}
							class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
							placeholder="0.00"
						/>
					</div>
					<div>
						<label for="fecha" class="block text-xs text-stone-400 mb-1">Fecha Expiración</label>
						<input
							name="fecha"
							bind:value={fechaExpira}
							type="date"
							required={quitarReqFases}
							class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
						/>
					</div>
					<div>
						<label for="limite" class="block text-xs text-stone-400 mb-1">Límite</label>
						<input
							name="limite"
							bind:value={limite}
							type="number"
							required={quitarReqFases}
							class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
							placeholder="Sin límite"
						/>
					</div>
				</div>
				<button
					type="button"
					class="w-full bg-stone-600 hover:bg-stone-500 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-500 flex items-center justify-center gap-2 mt-3"
					on:click={agregarFase}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						fill="currentColor"
						viewBox="0 0 256 256"
					>
						<path
							d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
						></path>
					</svg>
					Agregar Fase/Ticket
				</button>
			</div>
		</div>

		<!-- Sección de Imagen -->
		<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 mb-6">
			<h3 class="text-xl font-semibold mb-4 text-stone-200">Imagen del Evento</h3>
			{#if !imagePreviewUrl}
				<FileDrop {handleFiles} let:droppable>
					<div
						class="border-2 border-dashed rounded-xl p-12 text-center transition-colors"
						class:border-stone-500={!droppable}
						class:bg-stone-700={!droppable}
						class:border-stone-400={droppable}
						class:bg-stone-600={droppable}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-16 h-16 mx-auto mb-4 text-stone-400"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"
							></path>
						</svg>
						<p class="text-stone-300 font-medium mb-1">Selecciona o arrastra una imagen aquí</p>
						<p class="text-stone-500 text-sm">La imagen debe ser cuadrada (PNG o JPG)</p>
					</div>
				</FileDrop>
			{:else}
				<div class="relative">
					<img src={imagePreviewUrl} alt="Vista previa" class="w-full max-w-md mx-auto rounded-xl" />
					<button
						type="button"
						on:click={eliminarImagen}
						class="mt-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 px-4 rounded-xl font-semibold transition-colors border border-red-500/50 flex items-center justify-center gap-2 mx-auto"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
							></path>
						</svg>
						Eliminar imagen
					</button>
				</div>
			{/if}
		</div>

		<!-- Botones de acción -->
		<div class="flex gap-4">
			<button
				type="submit"
				class="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center justify-center gap-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
					></path>
				</svg>
				Guardar Evento
			</button>

			<button
				type="button"
				class="bg-red-900/30 hover:bg-red-900/50 text-red-400 py-3 px-6 rounded-xl font-semibold transition-colors border border-red-500/50"
				on:click={cancelar}
			>
				Cancelar
			</button>
		</div>
</form>
	</div>
</div>

<style>
	:global(.droplet-container) {
		width: 100%;
	}
</style>
