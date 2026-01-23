<script>
	import { onDestroy, onMount } from 'svelte';
	import { eventoId } from '$lib/stores/eventoId';
	import supabase from '$lib/supabase';
	import toast, { Toaster } from 'svelte-french-toast';
	import { goto } from '$app/navigation';
	import TicketCard from '../../../../components/ticketCard.svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { tick } from 'svelte';
	import { flatpickrAction } from '$lib/utils/flatpickrAction';
	import DialogConfirm from '../../../../components/DialogConfirm.svelte';

	let id;
	let evento = {};
	let fases = [];
	let loading = true;
	let editar = false;
	let mostrarDialogoConfirm = false;
	let ventas = [];
	let pagos = [];
	let rutaImagen = null;

	const unsubscribe = eventoId.subscribe((value) => {
		id = value;
	});

	onMount(async () => {
		let { data: mEvento, error } = await supabase.from('mEvento').select('*').eq('idevento', id);
		if (mEvento && mEvento.length > 0) {
			evento = mEvento[0];
		}

		if (error) {
			console.log('Error al traer evento o no existe el id');
		}

		let { data: cFase, errorF } = await supabase.from('cFaseEvento').select('*').eq('idEvento', id);
		if (cFase.length > 0) {
			fases = cFase;
		} else if (errorF) {
			console.log('Error al traer las fases o no existe el id');
		}

		//traer la imagen del evento
		let { data: image, error: errorImage } = await supabase.storage
			.from('imageEventos')
			.createSignedUrl(evento.pathImage, 60 * 60);

		if (errorImage) {
			console.log('Error al traer imagen de evento', errorImage);
		} else {
			rutaImagen = image.signedUrl;
		}

		//console.log(new Date(evento.fechaFin));
		loading = false;

		await tick();
	});

	async function switchEditMode() {
		editar = !editar;
		if (editar) {
			await tick(); // Espera a que el DOM se actualice
			adjustAllTextareas();
		}
	}

	function formatoFecha(fechaISO) {
		const fecha = new Date(fechaISO); // Crea la fecha a partir del valor ISO
		const dia = String(fecha.getUTCDate()).padStart(2, '0'); // Usamos getUTCDate para asegurarnos que no cambie el día
		const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); // Usamos getUTCMonth para obtener el mes en UTC
		const año = fecha.getUTCFullYear(); // Año en UTC
		const hora = String(fecha.getUTCHours()).padStart(2, '0'); // Hora en UTC
		const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
		const segundos = String(fecha.getUTCSeconds()).padStart(2, '0');

		return `${dia}/${mes}/${año} - ${hora}:${minutos}:${segundos}`;
	}

	async function guardarEditar() {
		const { data, error } = await supabase.from('mEvento').update(evento).eq('idevento', id);

		if (error) {
			console.log('Error actualizando el evento', error);
		} else {
			for (let i = 0; i < fases.length; i++) {
				const { error: errorFase } = await supabase
					.from('cFaseEvento')
					.update(fases[i])
					.eq('idFase', fases[i].idFase);
				if (errorFase) {
					console.error('Error actualizando fase:', errorFase);
				}
			}
			toast.success('Evento actualizado con exito', {
				duration: 3000
			});
			editar = false;
		}
	}

	function editarFase(index, updatedFase) {
		fases[index] = { ...fases[index], ...updatedFase };
	}

	async function borrarFase(index) {
		console.log(fases[index].idFase);
		const { error } = await supabase.from('cFaseEvento').delete().eq('idFase', fases[index].idFase);
		if (error) {
			console.error('Error eliminando fase:', error);
		} else {
			fases.splice(index, 1);
		}
	}

	function agregarNuevaFase() {
		const nuevaFase = {
			nombreFace: '',
			precio: 0,
			limite: null,
			fechaExpira: null,
			idEvento: eventoId
		};
		fases.push(nuevaFase);
	}

	function atras() {
		goto('/events');
	}

	async function eliminarEvento() {
		const { data: dataVentas, error: errorVentas } = await supabase
			.from('mVenta')
			.select('idventa,idPago')
			.eq('idEvento', id);
		if (errorVentas) {
			console.log('Error en la consulta de ventas', errorVentas);
		} else {
			if (dataVentas.length !== 0) {
				//abrir un dialogo para preguntar si esta seguro
				for (let venta of dataVentas) {
					ventas.push(venta.idventa);
					pagos.push(venta.idPago);
				}
				mostrarDialogoConfirm = true;
				console.log('Existen ventas', ventas, pagos);
			} else {
				const { error: fasesError } = await supabase
					.from('cFaseEvento')
					.delete()
					.eq('idEvento', id);
				if (fasesError) {
					console.log('Ocurrio un error al eliminar fases');
				}

				const { error: eventoError } = await supabase.from('mEvento').delete().eq('idevento', id);
				if (eventoError) {
					console.log('Ocurrio un error al eliminar el evento');
				} else {
					toast.success('Evento Eliminado con exito.', {
						duration: 3000
					});
					atras();
				}
			}
		}
	}

	async function confirmarEliminacion() {
		const { error: ticketsError } = await supabase.from('ticket').delete().in('idVenta', ventas);
		if (ticketsError) {
			console.log('Error al eliminar los tickets');
		} else {
			const { error: ventasError } = await supabase.from('mVenta').delete().in('idventa', ventas);
			if (ventasError) {
				console.log('Error al eliminar las ventas');
			} else {
				const { error: pagosError } = await supabase.from('mPago').delete().in('idpago', pagos);
				if (pagosError) {
					console.log('Error al eliminar el pago');
				} else {
					const { error: fasesError } = await supabase
						.from('cFaseEvento')
						.delete()
						.eq('idEvento', id);
					if (fasesError) {
						console.log('Ocurrio un error al eliminar fases');
					}

					const { error: eventoError } = await supabase.from('mEvento').delete().eq('idevento', id);
					if (eventoError) {
						console.log('Ocurrio un error al eliminar el evento');
					} else {
						toast.success('Evento Eliminado con exito.', {
							duration: 3000
						});
						atras();
					}
				}
			}
		}

		mostrarDialogoConfirm = false;
		// Lógica para eliminar evento y sus ventas
		toast.success('Evento eliminado exitosamente', { duration: 3000 });
	}

	function cancelarEliminacion() {
		mostrarDialogoConfirm = false;
	}

	function autoResize(textarea) {
		console.log('autorezise');
		textarea.style.height = 'auto'; // Resetea la altura
		textarea.style.height = `${textarea.scrollHeight}px`; // Ajusta al contenido
	}

	function adjustAllTextareas() {
		const textareas = document.querySelectorAll('textarea.auto-resize');
		textareas.forEach((textarea) => {
			textarea.style.height = 'auto'; // Restablece la altura
			textarea.style.height = `${textarea.scrollHeight}px`; // Ajusta al contenido actual
		});
	}

	async function desactivaActivaEv() {
		console.log('funcion activa/desactiva');
		//validar que no exista otro evento activo
		if (evento.activo == 1) {
			//si el evento esta activo desactivar evento
			const { error: errorActualizacion } = await supabase
				.from('mEvento')
				.update({ activo: 0 })
				.eq('idevento', id);

			if (errorActualizacion) {
				console.error('Error al desactivar el evento:', errorActualizacion);
				return;
			}

			toast.success('Evento desactivado con exito');
		} else {
			if (!existeEventoActivo) {
				//mostrar dialogo de confirmacion para desactivar el evento activo
				toast.error('Ya exsiste un evento activo');
			} else {
				// Si no hay otro evento activo, activa el evento actual
				const { error: errorActualizacion } = await supabase
					.from('mEvento')
					.update({ activo: 1 })
					.eq('idevento', id);

				if (errorActualizacion) {
					console.error('Error al activar el evento:', errorActualizacion);
					return;
				}

				toast.success('Evento activado con exito');
			}
		}
	}

	async function existeEventoActivo() {
		const { data, error } = await supabase
			.from('mEvento') // Tabla mEvento
			.select('idevento') // Selecciona solo el id para reducir datos transferidos
			.eq('activo', 1) // Busca eventos activos
			.limit(1); // Solo necesitamos saber si existe uno

		if (error) {
			console.error('Error verificando evento activo:', error);
			return false; // O maneja el error según sea necesario
		}
		console.log('Data eventos activos',data.length);
		return data.length > 0; // Si la lista tiene elementos, existe un evento activo
	}

	onDestroy(unsubscribe);
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white p-6 pb-20">
	<div class="max-w-6xl mx-auto">
		<!-- Header con botones de acción -->
		<div class="flex flex-wrap gap-3 mb-6">
			<button
				on:click={atras}
				class="bg-stone-800/70 hover:bg-stone-700/90 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
					></path>
				</svg>
				Atrás
			</button>

			<button
				on:click={switchEditMode}
				class="bg-stone-700 hover:bg-stone-600 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"
					></path>
				</svg>
				{editar ? 'Cancelar' : 'Editar'}
			</button>

			<button
				on:click={eliminarEvento}
				class="bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 px-4 rounded-xl font-semibold transition-colors border border-red-500/50 flex items-center gap-2"
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
				Eliminar
			</button>

			<label class="inline-flex items-center cursor-pointer ml-auto">
				<input
					type="checkbox"
					bind:checked={evento.activo}
					on:click={desactivaActivaEv}
					class="sr-only peer"
				/>
				<div
					class="relative w-11 h-6 bg-stone-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
				></div>
				<span class="ms-3 text-sm font-medium text-stone-300"
					>{evento.activo == 1 ? 'Desactivar' : 'Activar'}</span
				>
			</label>
		</div>

		{#if mostrarDialogoConfirm}
			<DialogConfirm
				titulo="¿Estás seguro de eliminar el evento?"
				mensaje="Se perderán los datos de ventas, tickets y pagos."
				onConfirm={confirmarEliminacion}
				onCancel={cancelarEliminacion}
			/>
		{/if}

		{#if loading}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Cargando...</p>
				</div>
			</div>
		{:else if editar}
			<!-- Modo edición -->
			<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 space-y-6">
				<form>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium mb-2 text-stone-300"
								>Nombre del evento</label
							>
							<input
								type="text"
								bind:value={evento.nombreEvento}
								placeholder="Nombre del evento"
								class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent text-xl font-bold"
							/>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium mb-2 text-stone-300">Venue</label>
								<input
									type="text"
									bind:value={evento.venue}
									placeholder="Venue"
									class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium mb-2 text-stone-300">Dirección</label>
								<input
									type="text"
									bind:value={evento.direccion}
									placeholder="Dirección"
									class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium mb-2 text-stone-300">Descripción</label>
							<textarea
								bind:value={evento.descripcion}
								placeholder="Descripción del evento"
								class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent min-h-24"
								on:input={(e) => autoResize(e.target)}
							></textarea>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium mb-2 text-stone-300">Fecha Inicio</label>
								<input
									type="text"
									id="fechaInicio"
									name="fechaInicio"
									class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
									placeholder="Fecha de inicio"
									use:flatpickrAction={{
										onChange: (selectedDates, dateStr) => {
											evento.fechaInicio = dateStr;
										},
										defaultDate: evento.fechaInicio ? new Date(evento.fechaInicio) : null
									}}
								/>
							</div>
							<div>
								<label class="block text-sm font-medium mb-2 text-stone-300">Fecha Fin</label>
								<input
									type="text"
									id="fechaFin"
									name="fechaFin"
									class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
									placeholder="Fecha de fin"
									use:flatpickrAction={{
										onChange: (selectedDates, dateStr) => {
											evento.fechaFin = dateStr;
										},
										defaultDate: evento.fechaFin ? new Date(evento.fechaFin) : null
									}}
								/>
							</div>
						</div>
					</div>
				</form>
			</div>
		{:else}
			<!-- Modo vista -->
			<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
				<h1 class="text-3xl font-bold mb-6">{evento.nombreEvento}</h1>

				<div class="flex flex-col md:flex-row gap-6 mb-6">
					<div class="flex-1 space-y-4">
						<div>
							<p class="text-sm font-semibold text-stone-400 mb-1">Venue</p>
							<p class="text-lg">{evento.venue}</p>
						</div>
						<div>
							<p class="text-sm font-semibold text-stone-400 mb-1">Dirección</p>
							<p class="text-lg">{evento.direccion}</p>
						</div>
					</div>
					{#if rutaImagen}
						<div class="flex-shrink-0">
							<img
								src={rutaImagen}
								alt="Portada del evento"
								class="w-full md:w-64 rounded-xl border-2 border-stone-600"
							/>
						</div>
					{/if}
				</div>

				<div class="space-y-4">
					<div>
						<p class="text-sm font-semibold text-stone-400 mb-1">Descripción</p>
						<p class="text-base whitespace-pre-line">
							{evento.descripcion == null ? 'Sin descripción' : evento.descripcion}
						</p>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p class="text-sm font-semibold text-stone-400 mb-1">Fecha Inicio</p>
							<p class="text-base">{formatoFecha(evento.fechaInicio)}</p>
						</div>
						<div>
							<p class="text-sm font-semibold text-stone-400 mb-1">Fecha Fin</p>
							<p class="text-base">{formatoFecha(evento.fechaFin)}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Secci\u00f3n de fases/tickets -->
		<div class="mt-6">
			<h2 class="text-xl font-semibold mb-4">Fases del Evento</h2>
			<div class="space-y-3">
				{#each fases as fase, index}
					<TicketCard {fase} {index} {borrarFase} guardarFase={editarFase} {editar} />
				{/each}
			</div>

			{#if editar}
				<div class="flex gap-3 mt-6">
					<button
						on:click={agregarNuevaFase}
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
								d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
							></path>
						</svg>
						Agregar Fase
					</button>

					<button
						on:click={guardarEditar}
						class="flex-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 py-3 px-6 rounded-xl font-semibold transition-colors border border-green-500/50 flex items-center justify-center gap-2"
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
						Guardar Cambios
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	textarea {
		resize: vertical;
		overflow: hidden;
	}

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
