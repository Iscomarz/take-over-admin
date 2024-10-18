import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import supabase from '$lib/supabase';

//Variables de prueba

export async function generarTicket(evento, venta, tickets) {
	// Generar el código QR como una imagen Base64
	//`https://example.com/${venta.idVenta}`

	const doc = new jsPDF();

	let altura = 0;
	for (var i = 0; i < tickets.length; i++) {
		let qrImageDataUrl = await obtenerQR(tickets[i]);

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.text('TAKE-OVER.COM', 10, 20);

		doc.setFontSize(10);
		doc.text(new Date().toDateString, 10, 20);
		doc.text('Payment receipt for ' + venta.nombre, 10, 35);

		//titulo del evento
		doc.setFontSize(12);
		doc.setFont('helvetica', 'bold');
		doc.text(
			evento.nombreEvento +
				' ' +
				evento.venue +
				' - ' +
				faseEvento.nombreFace +
				' | TICKET N. ' +
				(i + 1) +
				'/' +
				venta.cantidadTickets,
			10,
			45 + altura
		);

		// Descripción y referencia en una tabla
		doc.setFontSize(10);
		doc.setFillColor(200, 200, 200); // Color de fondo gris
		doc.rect(10, 50 + altura, 90, 8, 'F'); // Rectángulo de descripción
		doc.rect(100, 50 + altura, 100, 8, 'F'); // Rectángulo de referencia
		doc.text('Description:' + evento.descripcion, 12, 55 + altura);
		doc.text('Reference: ' + tickets[i].referencia, 102, 55 + altura);

		const maxWidth = 180;
		// Descripción del ticket
		doc.setFont('helvetica', 'normal');
		doc.text(doc.splitTextToSize(evento.descripcion, maxWidth), 10, 65 + altura);

		// Información del evento
		doc.setFont('helvetica', 'bold');
		doc.text('DATE: ' + evento.fechaInicio, 10, 105 + altura);
		doc.text('TIME: ' + evento.fechaInicio, 10, 110 + altura);
		doc.text('VENUE: ' + evento.venue, 10, 115 + altura);
		doc.text('ADDRESS:' + evento.direccion, 10, 120 + altura);
		doc.text('*This event is for people over 18 years old.', 10, 130 + altura);

		doc.addImage(qrImageDataUrl, 'PNG', 150, 50 + altura, 50, 50);

		altura += 100;
	}

	return Buffer.from(doc.output('arraybuffer'));
}

async function obtenerQR(ticket) {
	const { data, error } = await supabase.storage
		.from('codigosQR')
		.createSignedUrl(ticket.pathStorage, 60 * 60);

	if (error) {
		console.log('Error al obtener imagen QR:', error);
	} else {
		return data.signedUrl;
	}
}
