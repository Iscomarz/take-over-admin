<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Html5QrcodeScanner } from 'html5-qrcode';
	import {toast, Toaster} from 'svelte-french-toast';
	import supabase from '$lib/supabase'; 
	import { referenciaValida } from '$lib/stores/qrValidate';

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
			async (decodedText, decodedResult) => {
				qrCodeMessage = decodedText;
				console.log('QR Code escaneado:', decodedText);
				// Aquí podrías enviar el código escaneado para validarlo

				let {data: qrValido, error:qrNoValido} = await supabase
				.from('ticket')
				.select('*')
				.eq('codigoQR',qrCodeMessage);

				if(qrNoValido){
					toast.error("Este QR no es valido no se encuentra en existencia");
				}else if(qrValido[0].validado === true){
					toast.error("Este QR ya fue validado anteriormente");
				}else if(qrValido[0].validado === false){
					toast.success("Codigo QR valido");
					referenciaValida.set(qrValido[0].referencia);
					goto("/validate/succesValidate");
					stopScanner();
				}
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

<Toaster />

<h1>Validar Codigo QR</h1>
<br>

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
