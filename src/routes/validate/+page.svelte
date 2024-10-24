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
					toast.error('Este QR no es valido no se encuentra en existencia');
					toast.dismiss();
					isScanning = false;
					resetScanner();
				} else if (qrValido[0].validado === true) {
					toast.error('Este QR ya fue validado anteriormente');
					toast.dismiss();
					isScanning = false;
					resetScanner(); // Reiniciar escaneo después de un breve intervalo
				} else if (qrValido[0].validado === false) {
					isScanning = false;
					referenciaValida.set(qrValido[0].referencia);
					toast.dismiss(); 
					goto('/validate/succesValidate');
					stopScanner();
				}else{
					toast.error('Este QR no es valido no se encuentra en existencia');
					toast.dismiss();
					isScanning = false;
					resetScanner();
				}
			},
			(error) => {
				console.warn(`Error de escaneo: ${error}`);
			}
		);
	});

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

<div id="reader"></div>

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
