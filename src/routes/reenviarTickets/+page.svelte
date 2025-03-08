<script>
	import { onMount } from 'svelte';
	import supabase from '$lib/supabase';
	import { generarTicket } from '$lib/utils/generarTicket';
    import { toast, Toaster } from 'svelte-french-toast';

	let eventos = [];
	let ventas = [];
	let selectedEvento;
	let pdfBuffer;

	onMount(async () => {
		const { data, error } = await supabase.from('mEvento').select('*');
		if (error) {
			console.error('Error fetching eventos:', error);
		} else {
			eventos = data;
		}
	});

	async function fetchVentas() {
		console.log('Selected Evento:', selectedEvento);
		if (selectedEvento.idevento) {
			const { data, error } = await supabase
				.from('mVenta')
				.select('*')
				.eq('idEvento', selectedEvento.idevento)
				.order('fechaVenta', { ascending: false });
			if (error) {
				console.error('Error fetching ventas:', error);
			} else {
				ventas = data;
				console.log('Ventas:', ventas);
			}
		}
	}

	async function reenviarTickets(venta) {
		console.log('Reenviar tickets for venta ID:', venta.idventa);
		const { data: tickets, error } = await supabase
			.from('ticket')
			.select('*')
			.eq('idVenta', venta.idventa);
		if (error) {
			console.error('Error fetching tickets:', error);
		} else {
			console.log('Tickets for venta ID:', venta, tickets);
			// Logic to resend tickets will go here

			// Send email with tickets
			pdfBuffer = await generarTicket(selectedEvento, venta, tickets);
            await enviarTicketAlServidor(pdfBuffer, venta);

		}
	}

    async function enviarTicketAlServidor(pdfBufferCorreo, mventa) {
		const response = await fetch('/api/enviarTicket', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				pdfBuffer: Array.from(new Uint8Array(pdfBufferCorreo)),
				venta: mventa
			})
		});

		const data = await response.json();
		if (response.ok) {
			console.log('Correo enviado con éxito:', data);
			toast.success('Correo enviado');
		} else {
			console.error('Error al enviar el correo:', data);
		}
	}
</script>
<Toaster />
<main>
	<h1>Reenviar Tickets</h1>
	<div>
		<label for="evento">Seleccionar Evento:</label>
		<select id="evento" bind:value={selectedEvento} on:change={fetchVentas}>
			<option value="" disabled selected>Seleccione un evento</option>
			{#each eventos as evento}
				<option value={evento}>{evento.nombreEvento}</option>
			{/each}
		</select>
	</div>

	{#if ventas.length > 0}
		<table>
			<thead>
				<tr>
					<th>ID Venta</th>
					<th>Cliente</th>
                    <th>Correo</th>
					<th>Fecha</th>
					<th>Cantidad</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each ventas as venta}
					<tr>
						<td>{venta.idventa}</td>
						<td>{venta.nombre}</td>
                        <td>{venta.correo}</td>
						<td>{venta.fechaVenta}</td>
						<td>{venta.cantidadTickets}</td>
						<td>
							<button on:click={() => reenviarTickets(venta)}>Reenviar Tickets</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</main>

<style>
	main {
		padding: 1rem;
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
		color: #000000;
	}
</style>
