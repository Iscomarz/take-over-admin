<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Html5QrcodeScanner } from 'html5-qrcode';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';
	import { referenciaValida } from '$lib/stores/qrValidate';

	let qrCodeMessage = ''; // Variable para almacenar el mensaje escaneado
	let scanner; // Para almacenar el escáner
	let token = '';
	let isScanning = true; // Flag para controlar el escaneo

	let eventos = [];
	let tickets = [];
	let filteredTickets = [];
	let filterCliente = '';
	let selectedEvento;
	let dataCargada = false;

	onMount(async () => {
		toast.dismiss();
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		// Configurar el escáner al montar el componente
		scanner = new Html5QrcodeScanner('reader', {
			fps: 10, // Cuántos frames por segundo procesar
			qrbox: { width: 250, height: 250 } // El tamaño del área de escaneo
		});

		// Iniciar el escaneo y manejar el resultado
		scanner.render(
			async (decodedText, decodedResult) => {
				if (!isScanning) return;

				qrCodeMessage = decodedText;
				console.log('QR Code escaneado:', decodedText);

				// Aquí podrías enviar el código escaneado para validarlo
				let { data: qrValido, error: qrNoValido } = await supabase
					.from('ticket')
					.select('*')
					.eq('codigoQR', qrCodeMessage);

				if (qrNoValido) {
					toast.remove();
					toast.error('Este QR no es valido no se encuentra en existencia');
					isScanning = false;
					resetScanner();
				} else if (qrValido[0].validado === true) {
					toast.remove();
					toast.error('Este QR ya fue validado anteriormente');
					isScanning = false;
					resetScanner(); // Reiniciar escaneo después de un breve intervalo
				} else if (qrValido[0].validado === false) {
					isScanning = false;
					referenciaValida.set(qrValido[0].referencia);
					toast.remove();
					goto('/validate/succesValidate');
					stopScanner();
				} else {
					toast.remove();
					toast.error('Este QR no es valido o no se encuentra en existencia');
					isScanning = false;
					resetScanner();
				}
			},
			(error) => {
				console.warn(`Error de escaneo: ${error}`);
			}
		);

		const { data, error } = await supabase.from('mEvento').select('*');
		if (error) {
			console.error('Error fetching eventos:', error);
		} else {
			eventos = data;
		}
	});

	async function fetchTickets() {
		if (selectedEvento.idevento) {
			const { data, error } = await supabase
				.from('ticket')
				.select(
					`	idTicket,
						validado,
						mVenta (nombre, idEvento),
						cFaseEvento (nombreFace)
					`
				)
				.eq('mVenta.idEvento', selectedEvento.idevento)
				.order('idTicket', { asc: true });

			if (error) {
				console.error('Error fetching data:', error);
			} else {
				tickets = data;
				dataCargada = true;
			}
		}
	}

	async function validarTicket(idTicket) {
		const { data, error } = await supabase
			.from('ticket')
			.update({ validado: true })
			.eq('idTicket', idTicket);

		if (error) {
			console.error('Error al validar ticket:', error);
		} else {
			toast.success('Ticket validado');
			fetchTickets();
			resetScanner();
		}
		
	}

	// Variable reactiva para filtrar los tickets en el cliente sin volver a consultar a la BD
	$: filteredTickets = tickets.filter(
		(ticket) =>
			ticket.idTicket &&
			ticket.mVenta &&
			ticket.mVenta.nombre &&
			ticket.mVenta.nombre.toLowerCase().includes(filterCliente.toLowerCase())
	);

	function resetScanner() {
		// Permitir que el escáner vuelva a funcionar después de un intervalo
		setTimeout(() => {
			isScanning = true;
		}, 2000); // Esperar 2 segundos antes de habilitar el siguiente escaneo
	}

	function stopScanner() {
		if (scanner) {
			scanner.clear();
			scanner = null;
		}
	}

	onDestroy(() => stopScanner());
</script>

<Toaster />

<h1>Validar Codigo QR</h1>
<br />

<div id="reader" style="margin-bottom: 40px;"></div>
<h2>Validar por Nombre</h2>
<div class="selectContainer">
	<label for="evento">Seleccionar Evento:</label>
	<select id="evento" bind:value={selectedEvento} on:change={fetchTickets}>
		<option value="" disabled selected>Seleccione un evento</option>
		{#each eventos as evento}
			<option value={evento}>{evento.nombreEvento}</option>
		{/each}
	</select>
</div>

{#if dataCargada}
	<section class="dataTable">
		<!-- Input para filtrar por nombre del cliente -->
		<div>
			<label for="filterCliente">Filtrar por Nombre del Cliente:</label>
			<input id="filterCliente" type="text" placeholder="ICliente" bind:value={filterCliente} />
		</div>
		<table>
			<thead>
				<tr>
					<th>Cliente</th>
					<th>Ticket</th>
					<th>Validado</th>
					<th>Validar</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredTickets as ticket}
					<tr>
						<td>{ticket.mVenta.nombre}</td>
						<td>{ticket.cFaseEvento.nombreFace}</td>
						<td
							>{#if ticket.validado}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="40"
									height="40"
									fill="#40BA6F"
									viewBox="0 0 256 256"
									><path
										d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm104,0a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h24A8,8,0,0,1,184,108Zm-9.08,48c-10.29,17.79-27.39,28-46.92,28s-36.63-10.2-46.93-28a8,8,0,1,1,13.86-8c7.46,12.91,19.2,20,33.07,20s25.61-7.1,33.08-20a8,8,0,1,1,13.84,8Z"
									></path></svg
								>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="40"
									height="40"
									fill="#BC2020"
									viewBox="0 0 256 256"
									><path
										d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm61.66-93.66a8,8,0,0,1-11.32,11.32L168,123.31l-10.34,10.35a8,8,0,0,1-11.32-11.32L156.69,112l-10.35-10.34a8,8,0,0,1,11.32-11.32L168,100.69l10.34-10.35a8,8,0,0,1,11.32,11.32L179.31,112Zm-80-20.68L99.31,112l10.35,10.34a8,8,0,0,1-11.32,11.32L88,123.31,77.66,133.66a8,8,0,0,1-11.32-11.32L76.69,112,66.34,101.66A8,8,0,0,1,77.66,90.34L88,100.69,98.34,90.34a8,8,0,0,1,11.32,11.32ZM140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"
									></path></svg
								>
							{/if}
						</td>
						<td><button 
							 on:click={validarTicket(ticket.idTicket)}>Validar</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	#reader {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
	}
	h1 {
		color: whitesmoke;
		font-size: 1.3em;
		font-weight: bold;
	}

	h2 {
		text-align: center;
		font-weight: bold;
		margin-bottom: 10px;
		font-size: 1.1em;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 0.5rem;
	}
	th {
		background-color: #f4f4f4;
		color: #000000;
	}

	select {
		color: black;
	}

	.selectContainer {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 20px;
	}

	#filterCliente {
		color: black;
	}

	.dataTable {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* Opcional: si el SVG es inline, lo convertimos en bloque y le damos margen automático */
	table td svg {
		display: block;
		margin: 0 auto;
	}
</style>
