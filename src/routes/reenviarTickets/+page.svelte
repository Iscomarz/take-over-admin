<script>
	import { onMount } from 'svelte';
	import supabase from '$lib/supabase';
	import { generarTicket } from '$lib/utils/generarTicket';
	import { toast, Toaster } from 'svelte-french-toast';

	let eventos = [];
	let ventas = [];
	let selectedEvento;
	let pdfBuffer;
	let dataCargada = false;

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
				.select(
					`
						*,
						idFaseEvento ( nombreFace ),
						idPago ( cantidad ) 
					`
				)
				.eq('idEvento', selectedEvento.idevento)
				.order('fechaVenta', { ascending: false });

			if (error) {
				console.error('Error fetching ventas:', error);
			} else {
				ventas = data.map((venta) => ({
					...venta,
					idFaseEvento: venta.idFaseEvento?.nombreFace || null, // Extraer solo el nombre
					idPago: venta.idPago?.cantidad || null // Extraer solo el monto
				}));
				console.log('Ventas:', ventas);
				dataCargada = true;
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

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white p-6 pb-20">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Reenviar Tickets</h1>
			<p class="text-stone-400 text-sm">Selecciona un evento para reenviar los tickets de una venta</p>
		</div>

		<!-- Selector de evento -->
		<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 mb-6">
			<label for="evento" class="block text-sm font-medium mb-2 text-stone-300"
				>Seleccionar Evento:</label
			>
			<select
				id="evento"
				bind:value={selectedEvento}
				on:change={fetchVentas}
				class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
			>
				<option value="" disabled selected>Seleccione un evento</option>
				{#each eventos as evento}
					<option value={evento}>{evento.nombreEvento}</option>
				{/each}
			</select>
		</div>

		<!-- Tabla de ventas -->
		{#if dataCargada}
			<div class="bg-stone-800/50 rounded-2xl border border-stone-700 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-stone-700/50">
							<tr>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Cliente</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Correo</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Fecha</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Cantidad</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Ticket</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Monto</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-700">
							{#each ventas as venta}
								<tr class="hover:bg-stone-700/30 transition-colors">
									<td class="px-4 py-3 text-sm">{venta.nombre}</td>
									<td class="px-4 py-3 text-sm text-stone-400">{venta.correo}</td>
									<td class="px-4 py-3 text-sm text-stone-400">
										{new Date(venta.fechaVenta).toLocaleDateString()}
									</td>
									<td class="px-4 py-3 text-sm">{venta.cantidadTickets}</td>
									<td class="px-4 py-3 text-sm">{venta.idFaseEvento || 'N/A'}</td>
									<td class="px-4 py-3 text-sm font-semibold text-green-400">
										${venta.idPago || '0.00'}
									</td>
									<td class="px-4 py-3">
										<button
											on:click={() => reenviarTickets(venta)}
											class="bg-stone-700 hover:bg-stone-600 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2 text-sm"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												fill="currentColor"
												viewBox="0 0 256 256"
											>
												<path
													d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z"
												></path>
											</svg>
											Reenviar
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	table {
		border-collapse: collapse;
	}
</style>
