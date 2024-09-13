<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { eventoStore } from '$lib/stores/eventoStore';
	import { get } from 'svelte/store';

	let token = '';
	if (typeof window !== 'undefined') {
		token = localStorage.getItem('token');
		if (token == null) {
			goto('/');
		}
	}

	let nombreEvento = '';
	let venue = '';
	let fechaInicio = null;
	let fechaFin = null;
	let direccion = '';
	let aforo = '';

	// Suscribirse al store para obtener los datos iniciales (si el usuario vuelve del Paso 2)
	$: {
		const evento = get(eventoStore); // Obtener los datos del store
		nombreEvento = evento.nombreEvento;
		venue = evento.venue;
		fechaInicio = evento.fechaInicio;
		fechaFin = evento.fechaFin;
		direccion = evento.direccion;
		aforo = evento.aforo;
	}

	let fechaFinPicker;

	onMount(() => {
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

		if (!nombreEvento || !venue || !fechaInicio || !fechaFin || !direccion || !aforo) {
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
			aforo,
			fases: get(eventoStore).fases // Mantener las fases (si existen)
		});

		// Navegar al segundo paso
		goto('/saveEvent');
	}

	function cancelar() {
		limpiarStore();
		goto('/');
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
</script>

<h1>Datos Generales del Evento</h1>

<form on:submit={siguientePaso} class="max-w-md mx-auto">
	<div class="relative z-0 w-full mb-5 group">
		<input
			type="text"
			name="floating_nombre"
			id="floating_nombre"
			class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
			placeholder=" "
			required
			bind:value={nombreEvento}
		/>
		<label
			for="floating_nombre"
			class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
			>Nombre del evento</label
		>
	</div>
	<div class="relative z-0 w-full mb-5 group">
		<input
			type="text"
			name="floating_venue"
			id="floating_venue"
			class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
			placeholder=" "
			required
			bind:value={venue}
		/>
		<label
			for="floating_venue"
			class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
			>Venue/Lugar</label
		>
	</div>

	<!-- Datepicker para fecha de inicio -->
	<div class="relative z-0 w-full mb-5 group">
		<input
			type="text"
			id="fechaInicio"
			name="fechaInicio"
			class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer date-pick"
			placeholder="Fecha de inicio"
			required
			bind:value={fechaInicio}
		/>
		<label
			for="fechaInicio"
			class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:scale-75 peer-focus:-translate-y-6"
			>Fecha de Inicio</label
		>
	</div>

	<!-- Datepicker para fecha de fin -->
	<div class="relative z-0 w-full mb-5 group">
		<input
			type="text"
			id="fechaFin"
			name="fechaFin"
			class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer date-pick"
			placeholder="Fecha de fin"
			required
			bind:value={fechaFin}
		/>
		<label
			for="fechaFin"
			class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:scale-75 peer-focus:-translate-y-6"
			>Fecha de Fin</label
		>
	</div>

	<div class="grid md:grid-cols-2 md:gap-6">
		<div class="relative z-0 w-full mb-5 group">
			<input
				type="text"
				name="floating_direccion"
				id="floating_direccion"
				class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
				placeholder=""
				required
				bind:value={direccion}
			/>
			<label
				for="floating_direccion"
				class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
				>Direccion</label
			>
		</div>
		<div class="relative z-0 w-full mb-5 group">
			<input
				type="text"
				name="floating_aforo"
				id="floating_aforo"
				class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
				placeholder=""
				required
				bind:value={aforo}
			/>
			<label
				for="floating_aforo"
				class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
				>Aforo</label
			>
		</div>
	</div>

	<div class="flujo">
		<button
			type="submit"
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
			>Siguiente
		</button>

		<button
			type="button"
			on:click={cancelar}
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
			>Cancelar</button
		>
	</div>
</form>

<style>
	input {
		color: black;
	}

	h1 {
		width: 100%;
		color: whitesmoke;
		text-align: center;
		padding-bottom: 40px;
	}

	.flujo {
		width: 100%;
		display: flex;
		justify-content: center;
		gap: 20px;
	}

	button {
		background-color: rgb(63, 248, 186);
		color: black;
	}

	button:hover {
		background-color: rgb(52, 180, 137);
	}

	.date-pick {
		color: whitesmoke;
	}

	input {
		color: whitesmoke;
	}
</style>
