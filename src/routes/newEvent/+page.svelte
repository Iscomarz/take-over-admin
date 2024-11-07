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

	<div class="flujo">
		<button
			type="submit"
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-80 sm:w-auto px-5 py-2.5 text-center"
			>Siguiente
		</button>

		<button
			on:click={(event) => {
				event.stopPropagation();
				event.preventDefault();
				limpiarStore();
			}}
			class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-20 sm:w-auto px-5 py-2.5 text-center items-center flex justify-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="#000000"
				viewBox="0 0 256 256"
				><path
					d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"
				></path></svg
			>
		</button>
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
		margin-top: 20px;
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
