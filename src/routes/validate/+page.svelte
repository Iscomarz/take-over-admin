<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Html5QrcodeScanner } from 'html5-qrcode';

	let qrCodeMessage = ''; // Variable para almacenar el mensaje escaneado
	let scanner; // Para almacenar el escáner

	let token = '';

	onMount(() => {
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
			(decodedText, decodedResult) => {
				qrCodeMessage = decodedText;
				console.log('QR Code escaneado:', decodedText);
				// Aquí podrías enviar el código escaneado para validarlo
			},
			(error) => {
				console.warn(`Error de escaneo: ${error}`);
			}
		);
	});

	function stopScanner() {
		if (scanner) {
			scanner.clear();
			scanner = null;
		}
	}

	onDestroy(() => stopScanner());
</script>

<h1>Validar Codigo QR</h1>

<div id="reader"></div>
<p>QR Code: {qrCodeMessage}</p>

<style>
	#reader {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
	}
	h1 {
		color: whitesmoke;
	}
</style>
