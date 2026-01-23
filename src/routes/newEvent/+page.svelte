<script>
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { eventoStore } from '$lib/stores/eventoStore';
	import { get } from 'svelte/store';
	import toast, { Toaster } from 'svelte-french-toast';

	let token = '';
	let nombreEvento = '';
	let venue = '';
	let fechaInicio = null;
	let fechaFin = null;
	let direccion = '';

	// Suscribirse al store para obtener los datos iniciales (si el usuario vuelve del Paso 2)
	$: {
		const evento = get(eventoStore); // Obtener los datos del store
		nombreEvento = evento.nombreEvento;
		venue = evento.venue;
		fechaInicio = evento.fechaInicio;
		fechaFin = evento.fechaFin;
		direccion = evento.direccion;
	}

	let fechaFinPicker;

	onMount(() => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
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

	function siguientePaso(event) {
		event.preventDefault();

		if (!nombreEvento || !venue || !fechaInicio || !fechaFin || !direccion) {
			toast.error('Por favor, completa todos los campos.');
			return;
		}

		// Actualizar el store con los datos del evento
		eventoStore.set({
			nombreEvento,
			venue,
			fechaInicio,
			fechaFin,
			direccion,
			fases: get(eventoStore).fases // Mantener las fases (si existen)
		});

		// Navegar al segundo paso
		goto('/saveEvent');
	}

	function limpiarStore() {
		console.log('limpiar store');
		eventoStore.set({
			nombreEvento: '',
			venue: '',
			fechaInicio: '',
			fechaFin: '',
			direccion: '',
			fases: []
		});
		
		nombreEvento = '';
		venue = '';
		fechaInicio = null;
		fechaFin = null;
		direccion = '';
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
				<label for="floating_venue" class="block text-sm font-medium mb-2 text-stone-300"
					>Venue/Lugar</label
				>
				<input
					type="text"
					name="floating_venue"
					id="floating_venue"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Ingresa el lugar del evento"
					required
					bind:value={venue}
				/>
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
				<label for="floating_direccion" class="block text-sm font-medium mb-2 text-stone-300"
					>Dirección</label
				>
				<input
					type="text"
					name="floating_direccion"
					id="floating_direccion"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Ingresa la dirección"
					required
					bind:value={direccion}
				/>
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
