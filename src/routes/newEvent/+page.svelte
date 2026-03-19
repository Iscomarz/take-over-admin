<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { eventoStore } from '$lib/stores/eventoStore';
	import { get } from 'svelte/store';
	import toast, { Toaster } from 'svelte-french-toast';

	let token = '';
	let nombreEvento = '';
	let id_venue = null;
	let venue = ''; // we can keep it for backwards compatibility if needed, or remove it. Better keep it sync.
	let fechaInicio = null;
	let fechaFin = null;
	let direccion = '';
	let descripcionCorta = '';
	
	// Variables para géneros
	let generos = []; // G\u00e9neros seleccionados para el evento
	let generosActivos = []; // G\u00e9neros desde la base de datos
	let nuevoGenero = '';
	let mostrarDropdownGeneros = false;
	let generosFiltrados = [];

	let venuesActivos = [];

	// Suscribirse al store para obtener los datos iniciales (si el usuario vuelve del Paso 2)
	$: {
		const evento = get(eventoStore); // Obtener los datos del store
		nombreEvento = evento.nombreEvento;
		id_venue = evento.id_venue;
		venue = evento.venue;
		fechaInicio = evento.fechaInicio;
		fechaFin = evento.fechaFin;
		direccion = evento.direccion;
		descripcionCorta = evento.descripcionCorta;
		generos = evento.generos || [];
	}

	let fechaFinPicker;

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		await Promise.all([
			cargarGenerosActivos(),
			cargarVenuesActivos()
		]);

		flatpickr('#fechaInicio', {
			enableTime: true,
			dateFormat: 'Y-m-d H:i',
			onChange: function (selectedDates, dateStr) {
				fechaInicio = new Date(selectedDates[0]).toISOString();
				if (fechaFinPicker) {
					fechaFinPicker.set('minDate', selectedDates[0]); // Establecer la fecha mínima
				}
			}
		});

		fechaFinPicker = flatpickr('#fechaFin', {
			enableTime: true,
			dateFormat: 'Y-m-d H:i',
			minDate: fechaInicio,
			onChange: function (selectedDates, dateStr) {
				fechaFin = new Date(selectedDates[0]).toISOString();
			}
		});
	});

	async function cargarGenerosActivos() {
		const { data, error } = await supabase
			.from('generos_musicales')
			.select('*')
			.eq('activo', true);
		
		if (data) {
			generosActivos = data;
		} else if (error) {
			console.error('Error al cargar géneros:', error);
		}
	}

	async function cargarVenuesActivos() {
		const { data, error } = await supabase
			.from('venue')
			.select('*')
			.eq('activo', true)
			.order('nombre_venue');
		
		if (data) {
			venuesActivos = data;
		} else if (error) {
			console.error('Error al cargar venues:', error);
		}
	}

	function handleInputGenero() {
		if (nuevoGenero.length > 0) {
			const busqueda = nuevoGenero.toLowerCase();
			generosFiltrados = generosActivos.filter((g) =>
				g.nombre_genero.toLowerCase().includes(busqueda) &&
				!generos.some(selected => selected.nombre_genero.toLowerCase() === g.nombre_genero.toLowerCase())
			);
			mostrarDropdownGeneros = true;
		} else {
			mostrarDropdownGeneros = false;
			generosFiltrados = [];
		}
	}

	function agregarGenero(generoObj = null) {
		if (generos.length >= 5) {
			toast.error('Máximo 5 géneros permitidos.');
			return;
		}

		let generoAAgregar = null;

		if (generoObj) {
			generoAAgregar = generoObj;
		} else if (nuevoGenero.trim() !== '') {
			const nombreNuevo = nuevoGenero.trim();
			// Check if already selected
			if (generos.some(g => g.nombre_genero.toLowerCase() === nombreNuevo.toLowerCase())) {
				toast.error('Este genéro ya está seleccionado.');
				nuevoGenero = '';
				mostrarDropdownGeneros = false;
				return;
			}

			// Check if exists in DB but user just typed it
			const existeEnBD = generosActivos.find(g => g.nombre_genero.toLowerCase() === nombreNuevo.toLowerCase());
			
			if (existeEnBD) {
				generoAAgregar = existeEnBD;
			} else {
				// Es un género nuevo que no está en la BD
				generoAAgregar = {
					id_genero: null, // null indica que es nuevo y debe crearse
					nombre_genero: nombreNuevo,
					activo: true
				};
			}
		}

		if (generoAAgregar) {
			generos = [...generos, generoAAgregar];
			nuevoGenero = '';
			mostrarDropdownGeneros = false;
			generosFiltrados = [];
		}
	}

	function eliminarGenero(index) {
		generos = generos.filter((_, i) => i !== index);
	}

	function siguientePaso(event) {
		event.preventDefault();

		if (!nombreEvento || !id_venue || !fechaInicio || !fechaFin || !descripcionCorta) {
			toast.error('Por favor, completa todos los campos.');
			return;
		}

		// Obtener venue y dirección para mantener la compatibilidad si es necesario
		const venueSeleccionado = venuesActivos.find(v => v.id_venue === id_venue);
		if (venueSeleccionado) {
			venue = venueSeleccionado.nombre_venue;
			direccion = venueSeleccionado.direccion_venue;
		}

		// Actualizar el store con los datos del evento
		eventoStore.set({
			nombreEvento,
			id_venue,
			venue,
			fechaInicio,
			fechaFin,
			direccion,
			descripcionCorta,
			generos: generos, // Guardar generos en el store
			fases: get(eventoStore).fases // Mantener las fases (si existen)
		});

		// Navegar al segundo paso
		goto('/saveEvent');
	}

	function limpiarStore() {
		console.log('limpiar store');
		eventoStore.set({
			nombreEvento: '',
			id_venue: null,
			venue: '',
			fechaInicio: '',
			fechaFin: '',
			direccion: '',
			descripcionCorta: '',
			generos: [],
			fases: []
		});
		
		nombreEvento = '';
		id_venue = null;
		venue = '';
		fechaInicio = null;
		fechaFin = null;
		direccion = '';
		descripcionCorta = '';
		generos = [];
		nuevoGenero = '';
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-2xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Datos Generales del Evento</h1>
			<p class="text-stone-400 text-sm">Completa la información básica del evento</p>
		</div>

		<form on:submit={siguientePaso} class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
			<div class="mb-6">
				<label for="floating_nombre" class="block text-sm font-medium mb-2 text-stone-300"
					>Nombre del evento</label
				>
				<input
					type="text"
					name="floating_nombre"
					id="floating_nombre"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Ingresa el nombre del evento"
					required
					bind:value={nombreEvento}
				/>
			</div>

			<div class="mb-6">
				<label for="floating_venue" class="block text-sm font-medium mb-2 text-stone-300">
					Venue / Lugar
				</label>
				<div class="relative">
					<select
						id="floating_venue"
						name="floating_venue"
						bind:value={id_venue}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 appearance-none focus:ring-2 focus:ring-stone-500 focus:border-transparent custom-select"
						required
					>
						<option value={null} disabled>Selecciona un lugar</option>
						{#each venuesActivos as v}
							<option value={v.id_venue}>
								{v.nombre_venue} - {v.direccion_venue} {v.capacidad_venue ? '(Capacidad: ' + v.capacidad_venue + ')' : ''}
							</option>
						{/each}
					</select>
					<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-400">
						<svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
					</div>
				</div>
			</div>

			<!-- Datepicker para fecha de inicio -->
			<div class="mb-6">
				<label for="fechaInicio" class="block text-sm font-medium mb-2 text-stone-300"
					>Fecha de Inicio</label
				>
				<input
					type="text"
					id="fechaInicio"
					name="fechaInicio"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Selecciona la fecha de inicio"
					required
					bind:value={fechaInicio}
				/>
			</div>

			<!-- Datepicker para fecha de fin -->
			<div class="mb-6">
				<label for="fechaFin" class="block text-sm font-medium mb-2 text-stone-300"
					>Fecha de Fin</label
				>
				<input
					type="text"
					id="fechaFin"
					name="fechaFin"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Selecciona la fecha de fin"
					required
					bind:value={fechaFin}
				/>
			</div>



			<div class="mb-6">
				<label for="descripcion_corta" class="block text-sm font-medium mb-2 text-stone-300"
					>Descripción Corta (Para el feed)</label
				>
				<textarea
					id="descripcion_corta"
					name="descripcion_corta"
					rows="3"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Ingresa una descripción breve para los flayers o el feed"
					required
					bind:value={descripcionCorta}
				></textarea>
			</div>

			<div class="mb-6 relative">
				<label for="generoInput" class="block text-sm font-medium mb-2 text-stone-300">
					Géneros Musicales
					<span class="text-xs text-stone-500 ml-2 font-normal">(Máximo 5. Escribe un género y presiona Intro o selecciona de la lista)</span>
				</label>

				<!-- Wrapper del Input para que parezca que contiene los tags -->
				<div class="flex flex-wrap gap-2 w-full bg-stone-700 border border-stone-600 rounded-xl p-2 focus-within:ring-2 focus-within:ring-stone-500 focus-within:border-transparent min-h-[52px]">
					
					<!-- Tags seleccionados -->
					{#each generos as genero, i}
						<div class="flex items-center gap-1 bg-green-900/40 text-green-300 px-3 py-1 rounded-lg text-sm border border-green-700/50">
							<span>{genero.nombre_genero}</span>
							<button type="button" class="mt-[2px] ml-1 text-green-400 hover:text-green-100 transition-colors" on:click={() => eliminarGenero(i)}>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
							</button>
						</div>
					{/each}

					<!-- Input invisible que se expande -->
					<input
						type="text"
						id="generoInput"
						class="flex-1 min-w-[120px] bg-transparent text-white border-none p-1 text-sm focus:outline-none focus:ring-0"
						placeholder={generos.length < 5 ? "+ Agregar género" : ""}
						bind:value={nuevoGenero}
						on:input={handleInputGenero}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								agregarGenero();
							}
						}}
						disabled={generos.length >= 5}
						autocomplete="off"
					/>
				</div>

				<!-- Dropdown Sugerencias -->
				{#if mostrarDropdownGeneros}
					<div class="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
						{#if generosFiltrados.length > 0}
							{#each generosFiltrados as genero}
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<div
									class="px-4 py-3 hover:bg-stone-700 cursor-pointer flex flex-col border-b border-stone-700/50 last:border-0"
									on:click={() => agregarGenero(genero)}
								>
									<span class="text-sm font-medium text-white">{genero.nombre_genero}</span>
								</div>
							{/each}
						{:else}
							<div class="px-4 py-3 cursor-pointer hover:bg-stone-700 text-sm italic text-stone-400" on:click={() => agregarGenero()}>
								Presiona 'Enter' para crear "{nuevoGenero}"
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex gap-4 mt-8">
				<button
					type="submit"
					class="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600"
					>Siguiente
				</button>

				<button
					on:click={(event) => {
						event.stopPropagation();
						event.preventDefault();
						limpiarStore();
				limpiarStore();
			}}
			class="bg-red-900/30 hover:bg-red-900/50 text-red-400 py-3 px-6 rounded-xl font-semibold transition-colors border border-red-500/50 flex items-center justify-center gap-2"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path
					d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"
				></path>
			</svg>
			Limpiar
		</button>
			</div>
		</form>
	</div>
</div>

<style>
	:global(.flatpickr-calendar) {
		background-color: #292524 !important;
		border-color: #57534e !important;
	}

	:global(.flatpickr-day) {
		color: white !important;
	}

	:global(.flatpickr-day.selected) {
		background-color: #57534e !important;
		border-color: #57534e !important;
	}

	:global(.flatpickr-day:hover) {
		background-color: #44403c !important;
	}

	:global(.flatpickr-current-month) {
		color: white !important;
	}

	:global(.flatpickr-months .flatpickr-month) {
		color: white !important;
	}

	:global(.flatpickr-weekday) {
		color: #a8a29e !important;
	}
</style>
