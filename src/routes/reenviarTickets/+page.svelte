<script>
	import { onMount } from 'svelte';
	import supabase from '$lib/supabase';
	import { generarTicket } from '$lib/utils/generarTicket';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast, Toaster } from 'svelte-french-toast';

	let eventos = [];
	let ventas = [];
	let selectedEvento;
	let pdfBuffer;
	let dataCargada = false;
	let eventIdUrl = null;

	onMount(async () => {
		eventIdUrl = $page.url.searchParams.get('eventId');
		const { data, error } = await supabase.from('mEvento').select('*').order('idevento', { ascending: false });
		if (error) {
			console.error('Error fetching eventos:', error);
		} else {
			eventos = data;
			if(eventIdUrl) {
				selectedEvento = eventos.find(e => e.idevento === parseInt(eventIdUrl));
				if(selectedEvento) {
					fetchVentas();
				}
			}
		}
	});

	async function fetchVentas() {
		//console.log('Selected Evento:', selectedEvento);
		if (selectedEvento.idevento) {
			const { data, error } = await supabase
				.from('mVenta')
				.select(
					`
						idventa,
						fechaVenta,
						nombre,
						correo,
						cantidadTickets,
						cliente_id(cliente_id,nombre, correo),
						idFaseEvento ( "nombreFace" ),
						idPago ( cantidad ) 
					`
				)
				.eq('idEvento', selectedEvento.idevento)
				.order('fechaVenta', { ascending: false });

			if (error) {
				console.error('Error fetching ventas:', error);
			} else {
				console.log('¿Llegaron ventas?:', data);
				ventas = data.map((venta) => ({
					...venta,
					// Extraemos los datos de mCliente a través del objeto cliente_id
					nombre: venta.cliente_id?.nombre || venta.nombre || 'Sin nombre',
					correo: venta.cliente_id?.correo || venta.correo || 'Sin correo',
					idFaseEvento: venta.idFaseEvento?.nombreFace || null, 
					idPago: venta.idPago?.cantidad || null 
				}));
				dataCargada = true;
			}
		}
	}

	let reenviandoIds = {};

	async function reenviarTickets(venta) {
		// Marcar como enviando
		reenviandoIds[venta.idventa] = true;
		console.log('Reenviar tickets for venta ID:', venta.idventa);

		// Guardar el correo modificado en la base de datos para que quede la corrección permanente
		if (venta.cliente_id && venta.cliente_id.cliente_id) {
			await supabase.from('mCliente').update({ correo: venta.correo }).eq('cliente_id', venta.cliente_id.cliente_id);
		}
		// Y actualizar venta por seguridad temporal extra
		await supabase.from('mVenta').update({ correo: venta.correo }).eq('idventa', venta.idventa);

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
		// Finalizar load
		reenviandoIds[venta.idventa] = false;
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
	function atras() {
		if (eventIdUrl) {
			goto(`/events/event/${eventIdUrl}`);
		} else {
			goto('/events');
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20 pt-6">
	<div class="max-w-6xl mx-auto px-4 md:px-0">
		<div class="flex flex-wrap gap-3 mb-6">
			<button
				on:click={atras}
				class="bg-stone-800/70 hover:bg-stone-700/90 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
				Atrás
			</button>
		</div>
		{#if eventIdUrl && selectedEvento}
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold mb-2">Reenviar Tickets</h1>
				<p class="text-stone-400 text-sm">Mostrando ventas para: {selectedEvento.nombreEvento}</p>
			</div>
		{:else}
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
		{/if}

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
									<td class="px-4 py-3">
										<input 
											type="email" 
											bind:value={venta.correo} 
											class="w-full bg-stone-700 text-white border border-stone-600 rounded p-1.5 focus:ring-1 focus:ring-stone-500 focus:border-stone-500 transition-colors text-sm" 
											placeholder="correo@ejemplo.com"
										/>
									</td>
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
											disabled={reenviandoIds[venta.idventa]}
											class="bg-stone-700 hover:bg-stone-600 text-white py-2 px-4 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{#if reenviandoIds[venta.idventa]}
												<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
												Enviando...
											{:else}
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z"></path></svg>
												Reenviar
											{/if}
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
