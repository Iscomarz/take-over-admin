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
			evento.pathImage = image.signedUrl;
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

<div class="options">
	<button
		on:click={atras}
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
		>Atras</button
	>
	<button
		on:click={switchEditMode}
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
	>
		{editar ? 'Cancelar Edicion' : 'Editar'}
	</button>

	<button
		on:click={eliminarEvento}
		class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center delete"
		>Eliminar Evento</button
	>

	<label class="inline-flex items-center cursor-pointer">
		<input
			type="checkbox"
			bind:checked={evento.activo}
			on:click={desactivaActivaEv}
			class="sr-only peer"
		/>
		<div
			class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"
		></div>
		<span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{evento.activo == 1 ? 'Desactivar Evento' : 'Activar Evento'}</span
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

<br />
<div class="contenidoEvento">
	{#if loading}
		<p>Cargando...</p>
	{:else if editar}
		<form>
			<div class="edit">
				<input
					class="titulo"
					type="text"
					bind:value={evento.nombreEvento}
					placeholder="Nombre del evento"
				/>
				<div>
					<p class="subtitulo">Venue</p>
					<input type="text" bind:value={evento.venue} placeholder="Venue" />
				</div>
				<div>
					<p class="subtitulo">Direccion</p>
					<input type="text" bind:value={evento.direccion} placeholder="Dirección" />
				</div>

				<div>
					<p class="subtitulo">Descripcion</p>
					<textarea
						bind:value={evento.descripcion}
						placeholder="Descripción"
						class="auto-resize"
						on:input={(e) => autoResize(e.target)}
					></textarea>
				</div>

				<div>
					<p class="subtitulo">Fecha Inicio</p>
					<input
						type="text"
						id="fechaInicio"
						name="fechaInicio"
						class="date-pick"
						placeholder="Fecha de inicio"
						use:flatpickrAction={{
							onChange: (selectedDates, dateStr) => {
								evento.fechaInicio = dateStr;
							},
							defaultDate: evento.fechaInicio ? new Date(evento.fechaInicio) : null
						}}
					/>

					<input
						type="text"
						id="fechaFin"
						name="fechaFin"
						class="date-pick"
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
		</form>
	{:else}
		<section class="datosEvento">
			<h1 class="titulo">{evento.nombreEvento}</h1>
			<div style="display: flex; width: 100%; justify-content: space-between;">
				<div style="display: flex;flex-direction: column;gap: 15px;">
					<div>
						<p class="subtitulo">Venue</p>
						<p>{evento.venue}</p>
					</div>
					<div>
						<p class="subtitulo">Direccion</p>
						<p>{evento.direccion}</p>
					</div>
				</div>
				<div>
					<img src={evento.pathImage} alt="portada" style="width: 200px;" />
				</div>
			</div>
			<div>
				<p class="subtitulo">Descripcion</p>
				<p style="white-space: pre-line;" disabled>
					{evento.descripcion == null ? '' : evento.descripcion}
				</p>
			</div>
			<div>
				<p class="subtitulo">Fecha Inicio</p>
				<p>{formatoFecha(evento.fechaInicio)}</p>
			</div>
			<div>
				<p class="subtitulo">Fecha Fin</p>
				<p>{formatoFecha(evento.fechaFin)}</p>
			</div>

			<p class="subtitulo">Tickets</p>
		</section>
	{/if}

	{#each fases as fase, index}
		<TicketCard {fase} {index} {borrarFase} guardarFase={editarFase} {editar} />
	{/each}

	{#if editar}
		<button
			on:click={agregarNuevaFase}
			class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
			>Agregar nueva fase</button
		>
		<button
			on:click={guardarEditar}
			class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
			>Guardar cambios</button
		>
	{/if}
</div>

<style>
	.auto-resize {
		width: 100%; /* Ajusta al ancho del contenedor */
		box-sizing: border-box; /* Incluye padding y border en el cálculo */
		resize: none; /* Elimina el control de redimensionamiento manual */
		overflow: hidden; /* Oculta cualquier desbordamiento */
		background: transparent;
		color: white;
		border: 1px solid white;
		border-radius: 7px;
		padding: 1px;
	}

	input {
		background: transparent;
		color: white;
		border: 1px solid white;
		border-radius: 7px;
		padding: 1px;
	}

	button {
		background-color: rgb(63, 248, 186);
		color: black;
	}

	button:hover {
		background-color: rgb(52, 180, 137);
	}

	.delete {
		background-color: brown;
		color: whitesmoke;
	}

	.delete:hover {
		background-color: rgb(159, 8, 8);
		color: whitesmoke;
	}

	.titulo {
		font-size: 2rem;
	}

	.subtitulo {
		font-weight: bold;
	}

	.contenidoEvento {
		width: 100%;
		padding: 15px;
	}

	.datosEvento {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.edit {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.options {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 10px;
	}
</style>
