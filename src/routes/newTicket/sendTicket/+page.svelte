<script>
	import { ticket } from '$lib/stores/ticketStore';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { generarTicket } from '$lib/utils/generarTicket';

	let pdfUrl = ''; // URL del PDF generado para mostrarlo y descargarlo
	const ticketStore = get(ticket);

    console.log(ticketStore);
	onMount(async () => {
		// Generar el ticket en formato PDF (array buffer)
		const pdfBuffer = await generarTicket(
			ticketStore.eventoSelec,
			ticketStore.mVenta,
			ticketStore.tickets
		);

		// Crear un blob a partir del buffer del PDF
		const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

		// Crear una URL para el blob que será usada en el iframe y el enlace de descarga
		pdfUrl = URL.createObjectURL(blob);
	});
</script>

<h1>Enviar o Descargar ticket</h1>

<!-- Mostrar el PDF generado -->
{#if pdfUrl}
	<iframe src={pdfUrl} style="width:100%; height:500px;" title="Vista previa del ticket en PDF"
	></iframe>

	<!-- Enlace para descargar el PDF -->
	<a href={pdfUrl} download="ticket.pdf" class="btn-download">Descargar Ticket</a>
{/if}
