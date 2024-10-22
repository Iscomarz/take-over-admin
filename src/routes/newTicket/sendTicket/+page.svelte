<script>
	import { ticket } from '$lib/stores/ticketStore';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { generarTicket } from '$lib/utils/generarTicket';
	import { toast, Toaster } from 'svelte-french-toast';
	import { goto } from '$app/navigation';

	let pdfUrl = ''; // URL del PDF generado para mostrarlo y descargarlo
	const ticketStore = get(ticket);
	let pdfBuffer;
	token = '';

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
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
<h1>Enviar o Descargar ticket</h1>

<!-- Mostrar el PDF generado -->
{#if pdfUrl}
	<iframe src={pdfUrl} style="width:100%; height:500px;" title="Vista previa del ticket en PDF"
	></iframe>

	<!-- Enlace para descargar el PDF -->
	<a href={pdfUrl} download="ticket.pdf" class="btn-download">Descargar Ticket</a>

	<form>
		<button on:click={enviarTicketAlServidor(pdfBuffer, ticketStore.mVenta)}>
			Enviar por correo
		</button>
	</form>
{:else}
	<p>Generando...</p>
{/if}
