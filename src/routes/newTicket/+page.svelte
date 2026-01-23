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

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-2xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Generar Nuevo Ticket</h1>
			<p class="text-stone-400 text-sm">Completa la información para crear tickets</p>
		</div>

		<form class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 space-y-6">
			<!-- Evento -->
			<div>
				<label for="events" class="block text-sm font-medium mb-2 text-stone-300">Evento</label>
				<select
					on:change={(event) => {
						eventoSelec = eventos.find((e) => e.idevento == event.target.value);
						traerFases();
					}}
					required
					id="events"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null} selected>Seleccionar Evento</option>
					{#each eventos as evento}
						<option value={evento.idevento}>{evento.nombreEvento}</option>
					{/each}
				</select>
			</div>

			<!-- Fase -->
			<div>
				<label for="fases" class="block text-sm font-medium mb-2 text-stone-300">Fase</label>
				<select
					on:change={(event) => {
						faseSelec = fasesEvento.find((e) => e.idFase == event.target.value);
					}}
					required
					id="fases"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null} selected>Seleccionar fase</option>
					{#each fasesEvento as fase}
						<option value={fase.idFase}>{fase.nombreFace} ${fase.precio}</option>
					{/each}
				</select>
			</div>
			<!-- Nombre -->
			<div>
				<label for="nombre" class="block text-sm font-medium mb-2 text-stone-300">Nombre</label>
				<input
					bind:value={nombre}
					type="text"
					id="nombre"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Nombre del cliente"
					required
				/>
			</div>

			<!-- Correo -->
			<div>
				<label for="correo" class="block text-sm font-medium mb-2 text-stone-300">Correo</label>
				<input
					bind:value={correo}
					type="email"
					id="correo"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="correo@ejemplo.com"
				/>
			</div>

			<!-- Cantidad -->
			<div>
				<label for="cantidad" class="block text-sm font-medium mb-2 text-stone-300">Cantidad</label>
				<input
					bind:value={cantidad}
					type="number"
					id="cantidad"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Número de tickets"
					required
					min="1"
				/>
			</div>

			<!-- Forma de pago -->
			<div>
				<label for="formasPago" class="block text-sm font-medium mb-2 text-stone-300"
					>Forma de pago</label
				>
				<select
					on:change={(event) => {
						formaPagoSelect = formasPago.find((e) => e.idformapago == event.target.value);
					}}
					required
					id="formasPago"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null} selected>Seleccionar forma de pago</option>
					{#each formasPago as formaPago}
						<option value={formaPago.idformapago}>{formaPago.nombre}</option>
					{/each}
				</select>
			</div>
			<!-- Botón generar -->
			<button
				on:click={generarTicket}
				type="submit"
				class="w-full bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600 flex items-center justify-center gap-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M232,96a8,8,0,0,1-8,8H176v16h32a8,8,0,0,1,0,16H176v16h48a8,8,0,0,1,0,16H176v16h32a8,8,0,0,1,0,16H176v16a8,8,0,0,1-16,0V56a8,8,0,0,1,16,0V88h48A8,8,0,0,1,232,96ZM64,120H96v16H64a8,8,0,0,0,0,16H96v16H80a8,8,0,0,0,0,16H96v16a8,8,0,0,0,16,0V56a8,8,0,0,0-16,0V88H64a8,8,0,0,0,0,16H96v16H64a8,8,0,0,0,0,16Z"
					></path>
				</svg>
				Generar Tickets
			</button>
		</form>
	</div>
</div>
