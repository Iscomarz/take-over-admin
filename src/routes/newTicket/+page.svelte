<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import QRCode from 'qrcode';
	import { ticket } from '$lib/stores/ticketStore';
	import { goto } from '$app/navigation';

	let eventos = [];
	let eventoSelec = {};
	let fasesEvento = [];
	let faseSelec = {};
	let formasPago = [];
	let formaPagoSelect = {};
	let nombre = '';
	let cantidad;
	let correo;
	let cargaCompleta = false;
	let idUsuario = '';
	let mVenta = {};
	let tickets = [];
	let token = '';

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		let { data: mEvento, error } = await supabase.from('mEvento').select('*');

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
			traeFormaPago();
			traerUsuario();
		} else if (error || mEvento.length === 0) {
			console.log('Error al traer eventos o no existen eventos');
		}
	});

	async function traerUsuario() {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			idUsuario = data.session.user;
		}
	}

	async function traeFormaPago() {
		let { data, error } = await supabase.from('cFormaPago').select('*').in('idformapago', [1, 2]);
		if (data && data.length > 0) {
			formasPago = data;
		} else if (error) {
			console.log('Error al traer las formas de pago');
		}
	}

	async function traerFases() {
		let { data: fases, error } = await supabase
			.from('cFaseEvento')
			.select('*')
			.eq('idEvento', eventoSelec.idevento);
		if (fases && fases.length > 0) {
			fasesEvento = fases;
		} else if (error) {
			console.log('Error al traer las fases del evento');
		}
	}

	async function generarTicket() {
		if (eventoSelec == null) {
			toast.error('Selecciona un evento');
		} else {
			//paso 1 Guardar en tabla mPago
			const { data: dataPago, error: errorPago } = await supabase
				.from('mPago')
				.insert([
					{
						idFormaPago: formaPagoSelect.idformapago,
						cantidad: (cantidad * faseSelec.precio).toFixed(2),
						acreditado: true,
						fechaAcreditacion: new Date(),
						fechaPago: new Date()
					}
				])
				.select();
			if (errorPago) {
				console.log('Error al guardar en mPago:', errorPago);
				toast.error('Error al guardar el pago');
				return; // Detener si hay error
			} else {
				//paso 2: Guardar en tabla mVenta
				const { data: dataVenta, error: errorVenta } = await supabase
					.from('mVenta')
					.insert([
						{
							idEvento: eventoSelec.idevento,
							idUsuario: idUsuario.id,
							nombre: nombre,
							correo: correo,
							fechaVenta: new Date(),
							cantidadTickets: cantidad,
							idPago: dataPago[0].idpago,
							idFaseEvento: faseSelec.idFase
						}
					])
					.select();

				if (errorVenta) {
					console.log('Error al insertar venta', errorVenta);
					toast.error('Error interno');
					return;
				} else {
					mVenta = dataVenta[0];
					for (let i = 1; i <= cantidad; i++) {
						// Generar referencia aleatoria de 8 dígitos
						let referencia = Math.floor(10000000 + Math.random() * 90000000);

						// Crear un salt único
						let salt = crypto.randomUUID();

						// Combinar la referencia con el salt y aplicar una función hash (SHA-256)
						let codigoQR = await crypto.subtle
							.digest('SHA-256', new TextEncoder().encode(referencia + salt))
							.then((hashBuffer) => {
								// Convertir el resultado a una cadena hexadecimal
								return Array.from(new Uint8Array(hashBuffer))
									.map((b) => b.toString(16).padStart(2, '0'))
									.join('');
							});

						let base64QR = await generarQRCode(codigoQR);

						let pathQR = await subirQRASupabase(base64QR, referencia);

						//paso 3 Guardar en tabla ticket
						const { data: dataTicket, error: errorTicket } = await supabase
							.from('ticket')
							.insert([
								{
									codigoQR: codigoQR,
									validado: false,
									pathStorage: pathQR,
									idVenta: dataVenta[0].idventa,
									idFase: faseSelec.idFase,
									referencia: referencia,
									fechaValidacion: null
								}
							])
							.select();
						tickets.push(dataTicket[0]);

						if (errorTicket) {
							console.log('Error al insertar ticket', errorTicket);
						} else {
							if (cantidad == i) {
								cargaCompleta = true;
							}
						}
					}
				}
			}

			if (cargaCompleta) {
				ticket.set({
					eventoSelec,
					mVenta,
					tickets
				});
				toast.success('Se generaron los tickets');
				limpiiarForm();
				cargaCompleta = false;
				goto('/newTicket/sendTicket');
			} else {
				toast.error('Error al genrar');
			}
			//paso 4 Generar ticket

			//boton enviar por correo
		}
	}

	// Generar QR en formato base64
	async function generarQRCode(texto) {
		try {
			const qrBase64 = await QRCode.toDataURL(texto);
			return qrBase64; // Este es el string base64 de la imagen
		} catch (err) {
			console.error('Error generando el QR:', err);
		}
	}

	async function subirQRASupabase(base64Image, referencia) {
		// Convertir la imagen base64 a un Blob
		const base64Data = base64Image.split(',')[1]; // Eliminar el prefijo "data:image/png;base64,"
		const byteCharacters = atob(base64Data);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		const blob = new Blob([byteArray], { type: 'image/png' });

		// Subir el archivo a Supabase Storage
		const { data, error } = await supabase.storage
			.from('codigosQR')
			.upload(`qr_${referencia}.png`, blob);

		if (error) {
			console.log('Error subiendo el QR a Supabase:', error);
		} else {
			return data.path; // Devolver la ruta del archivo
		}
	}

	function limpiiarForm() {
		eventoSelec = {};
		faseSelec = {};
		formaPagoSelect = {};
		nombre = '';
		cantidad;
		correo;
	}
</script>

<Toaster />

<h1>Nuevo Ticket</h1>
<br />
<form class="max-w-sm mx-auto">
	<label for="events" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
		>Evento</label
	>
	<select
		on:change={(event) => {
			eventoSelec = eventos.find((e) => e.idevento == event.target.value);
			traerFases();
		}}
		required
		id="events"
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	>
		<option value={null} selected>Seleccionar Evento</option>
		{#each eventos as evento}
			<option value={evento.idevento}>{evento.nombreEvento}</option>
		{/each}
	</select>
	<label for="events" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
		>Fase</label
	>
	<select
		on:change={(event) => {
			faseSelec = fasesEvento.find((e) => e.idFase == event.target.value);
		}}
		required
		id="fases"
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	>
		<option value={null} selected>Seleccionar fase</option>
		{#each fasesEvento as fase}
			<option value={fase.idFase}>{fase.nombreFace} ${fase.precio}</option>
		{/each}
	</select>

	<div>
		<label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Nombre</label
		>
		<input
			bind:value={nombre}
			type="text"
			id="nombre"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Nombre"
			required
		/>
	</div>
	<div>
		<label for="correo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Correo</label
		>
		<input
			bind:value={correo}
			type="email"
			id="correo"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Mail"
		/>
	</div>
	<div>
		<label for="cantidad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Cantidad</label
		>
		<input
			bind:value={cantidad}
			type="number"
			id="cantidad"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Qty"
			required
			min="0"
		/>
	</div>
	<label for="events" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
		>Forma de pago</label
	>
	<select
		on:change={(event) => {
			formaPagoSelect = formasPago.find((e) => e.idformapago == event.target.value);
		}}
		required
		id="formasPago"
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	>
		<option value={null} selected>Seleccionar forma de pago</option>
		{#each formasPago as formaPago}
			<option value={formaPago.idformapago}>{formaPago.nombre}</option>
		{/each}
	</select>
	<br />
	<button
		on:click={generarTicket}
		type="submit"
		class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
		>Generar</button
	>
</form>

<style>
	h1 {
		width: 100%;
		color: whitesmoke;
		text-align: center;
	}
</style>
