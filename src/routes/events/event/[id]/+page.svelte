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

		//console.log(new Date(evento.fechaFin));
		loading = false;

		await tick();
	});

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
		const { error } = await supabase.from('fasesEvento').delete().eq('idFase', fases[index].idFase);
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

	onDestroy(unsubscribe);
</script>

<Toaster />

<button
	on:click={atras}
	class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
	>Atras</button
>

<button
	on:click={() => (editar = !editar)}
	class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
>
	{editar ? 'Cancelar Edicion' : 'Editar'}
</button>

<button
	on:click={eliminarEvento}
	class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center delete"
	>Eliminar Evento</button
>

{#if mostrarDialogoConfirm}
	<DialogConfirm
		titulo="¿Estás seguro de eliminar el evento?"
		mensaje="Se perderán los datos de ventas, tickets y pagos."
		onConfirm={confirmarEliminacion}
		onCancel={cancelarEliminacion}
	/>
{/if}

<br />

{#if loading}
	<p>Cargando...</p>
{:else if editar}
	<form>
		<input type="text" bind:value={evento.nombreEvento} placeholder="Nombre del evento" />
		<input type="text" bind:value={evento.venue} placeholder="Venue" />
		<input type="text" bind:value={evento.direccion} placeholder="Dirección" />
		<textarea bind:value={evento.descripcion} placeholder="Descripción"></textarea>
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
	</form>
{:else}
	<h1>{evento.nombreEvento}</h1>
	<p>Venue: {evento.venue}</p>
	<p>Direccion: {evento.direccion}</p>
	<p>Descripcion: {evento.descripcion == null ? '' : evento.descripcion}</p>
	<p>Fecha Inicio: {formatoFecha(evento.fechaInicio)}</p>
	<p>Fecha Fin: {formatoFecha(evento.fechaFin)}</p>
{/if}

{#each fases as fase, index}
	<TicketCard {fase} {index} {borrarFase} guardarFase={editarFase} {editar} />
{/each}

{#if editar}
	<button
		on:click={agregarNuevaFase}
		class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Agregar nueva fase</button
	>
	<button
		on:click={guardarEditar}
		class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">Guardar cambios</button
	>
{/if}

<style>
	input,
	textarea {
		color: black;
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
</style>
