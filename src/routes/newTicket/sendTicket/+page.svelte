<script>
	import { ticket } from '$lib/stores/ticketStore';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { toast, Toaster } from 'svelte-french-toast';
	import { goto } from '$app/navigation';
	import { generarTicket } from '$lib/utils/generarTicket';

	let pdfUrl = ''; // URL del PDF generado para mostrarlo y descargarlo
	const ticketStore = get(ticket);
	let pdfBuffer;
	let token = '';

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
		if (ticketStore) {
			// Generar el ticket en formato PDF (array buffer)
			pdfBuffer = await generarTicket(
				ticketStore.eventoSelec,
				ticketStore.mVenta,
				ticketStore.tickets
			);

			// Crear un blob a partir del buffer del PDF
			const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

			// Crear una URL para el blob que será usada en el iframe y el enlace de descarga
			pdfUrl = URL.createObjectURL(blob);
		}
	});

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
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Enviar o Descargar Ticket</h1>
			<p class="text-stone-400 text-sm">Tu ticket ha sido generado exitosamente</p>
		</div>

		<!-- Mostrar el PDF generado -->
		{#if pdfUrl}
			<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 mb-6">
				<div class="mb-4">
					<iframe
						src={pdfUrl}
						class="w-full rounded-xl border-2 border-stone-600"
						style="height:500px;"
						title="Vista previa del ticket en PDF"
					></iframe>
				</div>

				<!-- Botones de acci\u00f3n -->\n\t\t\t<div class="flex flex-col sm:flex-row gap-4">
					<a
						href={pdfUrl}
						download="ticket.pdf"
						class="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center justify-center gap-2 no-underline"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V40a8,8,0,0,0-16,0v84.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"
							></path>
						</svg>
						Descargar Ticket
					</a>

					<button
						class="flex-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 py-3 px-6 rounded-xl font-semibold transition-colors border border-green-500/50 flex items-center justify-center gap-2"
						on:click={enviarTicketAlServidor(pdfBuffer, ticketStore.mVenta)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z"
							></path>
						</svg>
						Enviar por Correo
					</button>
				</div>

				<!-- Bot\u00f3n para generar otro ticket -->
				<a
					href="/newTicket"
					class="mt-4 block bg-stone-800/70 hover:bg-stone-700/90 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600 text-center no-underline"
				>
					Generar otro Ticket
				</a>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Generando ticket...</p>
				</div>
			</div>
		{/if}
	</div>
</div>
