<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import QRCode from 'qrcode';
	import { ticket } from '$lib/stores/ticketStore';
	import { goto } from '$app/navigation';
	import { obtenerClientesUnicos } from '../../services/campania-service';

	import { tick } from 'svelte';

	let eventos = [];
	let eventoSelec = {};
	let fasesEvento = [];
	let faseSelec = {};
	let formasPago = [];
	let formaPagoSelect = {};
	let nombre = '';
	let cantidad = 1;
	let correo = '';
	let idUsuario = '';
	let token = '';

	// IDs para binding (más robusto)
	let selectedEventoId = null;
	let selectedFaseId = null;
	let selectedPagoId = null;
	let mostrarEventosPasados = false;

	// Estados para el buscador de clientes
	let todosLosClientes = [];
	let clientesFiltrados = [];
	let mostrarDropdown = false;

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		await traerUsuario();
		await traeFormaPago();
		await cargarEventos();
		
		// Cargar clientes para el buscador
		todosLosClientes = await obtenerClientesUnicos();
	});

	// Reactividad para vincular IDs con Objetos
	$: eventoSelec = eventos.find(e => e.idevento == selectedEventoId) || {};
	$: faseSelec = fasesEvento.find(f => f.idFase == selectedFaseId) || {};
	$: formaPagoSelect = formasPago.find(p => p.idformapago == selectedPagoId) || {};

	// Cuando cambia el evento, traer sus fases
	$: if (selectedEventoId) {
		traerFasesActivas();
	}

	async function cargarEventos() {
		const query = supabase.from('mEvento').select('*');
		if (!mostrarEventosPasados) {
			query.eq('activo', true);
		}
		
		let { data: mEvento, error } = await query;

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
			// Auto seleccionar el primer evento (asumiendo que es el activo si mostrarEventosPasados es false)
			if (!selectedEventoId || !eventos.find(e => e.idevento == selectedEventoId)) {
				selectedEventoId = eventos[0].idevento;
			}
		} else {
			eventos = [];
			if (error) console.log('Error al traer eventos');
		}
	}

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
			// Auto seleccionar Efectivo
			selectedPagoId = 1;
		} else if (error) {
			console.log('Error al traer las formas de pago');
		}
	}

	async function traerFasesActivas() {
		if (!selectedEventoId) return;

		let { data: fases, error } = await supabase
			.from('cFaseEvento')
			.select('*')
			.eq('idEvento', selectedEventoId)
			.not('activo', 'eq', false) // Muestra si es true o null
			.not('soldout', 'eq', true); // Muestra si es false o null

		if (fases && fases.length > 0) {
			fasesEvento = fases.sort((a, b) => a.precio - b.precio);
			await tick();
			// Auto seleccionar la más barata
			selectedFaseId = fasesEvento[0].idFase;
		} else {
			fasesEvento = [];
			selectedFaseId = null;
			if (error) console.log('Error al traer las fases del evento');
		}
	}

	// Cuando cambia el estado del checkbox, recargar eventos
	$: if (mostrarEventosPasados !== undefined) {
		cargarEventos();
	}

	function handleInputNombre() {
		if (nombre.length > 1) {
			const busqueda = nombre.toLowerCase();
			clientesFiltrados = todosLosClientes.filter(
				(c) =>
					c.nombre.toLowerCase().includes(busqueda) || c.correo.toLowerCase().includes(busqueda)
			);
			mostrarDropdown = clientesFiltrados.length > 0;
		} else {
			mostrarDropdown = false;
		}
	}

	function seleccionarCliente(cliente) {
		nombre = cliente.nombre;
		correo = cliente.correo;
		mostrarDropdown = false;
	}

	async function generarTicket() {
		if (!selectedEventoId) {
			toast.error('Selecciona un evento');
		} else if (!selectedFaseId) {
			toast.error('Selecciona una fase');
		} else {
			//paso 1 Guardar en tabla mPago
			const { data: dataPago, error: errorPago } = await supabase
				.from('mPago')
				.insert([
					{
						idFormaPago: selectedPagoId,
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
				//paso 2: Buscar o crear cliente
				let clienteId;

				// Buscar cliente existente
				const { data: clienteExistente, error: errorBusqueda } = await supabase
					.from('mCliente')
					.select('cliente_id')
					.eq('correo', correo)
					.maybeSingle();

				if (clienteExistente) {
					clienteId = clienteExistente.cliente_id;
				} else {
					// Crear nuevo cliente
					const { data: nuevoCliente, error: errorCliente } = await supabase
						.from('mCliente')
						.insert([
							{
								nombre: nombre,
								correo: correo,
								fecha_registro: new Date()
							}
						])
						.select()
						.single();

					if (errorCliente) {
						console.log('Error al crear cliente:', errorCliente);
						toast.error('Error al registrar cliente');
						return;
					}
					clienteId = nuevoCliente.cliente_id;
				}

				//paso 3: Guardar en tabla mVenta
				const { data: dataVenta, error: errorVenta } = await supabase
					.from('mVenta')
					.insert([
						{
							idEvento: eventoSelec.idevento,
							idUsuario: idUsuario.id,
							cliente_id: clienteId,
							fechaVenta: new Date(),
							cantidadTickets: cantidad,
							idPago: dataPago[0].idpago,
							idFaseEvento: faseSelec.idFase
						}
					])
					.select();

				if (errorVenta) {
					console.log('Error al insertar venta', errorVenta);
					toast.error('Error al registrar la venta');
					return;
				} else {
					mVenta = {
						...dataVenta[0],
						nombre: nombre,
						correo: correo
					};
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

						//paso 4 Guardar en tabla ticket
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
				limpiarForm();
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

	function limpiarForm() {
		nombre = '';
		cantidad = 1;
		correo = '';
		traerFasesActivas();
		// Re-seleccionar Efectivo
		formaPagoSelect = formasPago.find((f) => f.idformapago === 1) || formasPago[0];
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
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<label for="events" class="block text-sm font-medium text-stone-300">Evento</label>
					<label class="flex items-center gap-2 cursor-pointer group">
						<input 
							type="checkbox" 
							bind:checked={mostrarEventosPasados}
							class="w-4 h-4 rounded border-stone-600 bg-stone-700 text-stone-500 focus:ring-stone-500 focus:ring-offset-stone-800 transition-all cursor-pointer"
						/>
						<span class="text-xs text-stone-400 group-hover:text-stone-300 transition-colors">Mostrar eventos pasados</span>
					</label>
				</div>
				<select
					required
					id="events"
					bind:value={selectedEventoId}
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null}>Seleccionar Evento</option>
					{#each eventos as evento}
						<option value={evento.idevento}>{evento.nombreEvento}</option>
					{/each}
				</select>
			</div>

			<!-- Fase -->
			<div>
				<label for="fases" class="block text-sm font-medium mb-2 text-stone-300">Fase</label>
				<select
					required
					id="fases"
					bind:value={selectedFaseId}
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null}>Seleccionar fase</option>
					{#each fasesEvento as fase}
						<option value={fase.idFase}>{fase.nombreFace} - ${fase.precio}</option>
					{/each}
				</select>
			</div>
			<!-- Nombre -->
			<div class="relative">
				<label for="nombre" class="block text-sm font-medium mb-2 text-stone-300">Nombre</label>
				<input
					bind:value={nombre}
					on:input={handleInputNombre}
					on:focus={() => { if (clientesFiltrados.length > 0 && nombre.length > 1) mostrarDropdown = true; }}
					type="text"
					id="nombre"
					autocomplete="off"
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					placeholder="Nombre del cliente"
					required
				/>
				
				{#if mostrarDropdown}
					<div class="absolute z-50 w-full mt-1 bg-stone-800 border border-stone-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-stone-700">
						{#each clientesFiltrados as cliente}
							<button
								type="button"
								class="w-full text-left p-3 hover:bg-stone-700 transition-colors flex flex-col"
								on:click={() => seleccionarCliente(cliente)}
							>
								<span class="text-white font-medium">{cliente.nombre}</span>
								<span class="text-stone-400 text-xs">{cliente.correo}</span>
							</button>
						{/each}
					</div>
				{/if}
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

			<!-- Cantidad con Contador -->
			<div>
				<label for="cantidad" class="block text-sm font-medium mb-2 text-stone-300">Cantidad</label>
				<div class="flex items-center gap-4 bg-stone-700 rounded-xl p-1 border border-stone-600 w-fit">
					<button 
						type="button"
						on:click={() => { if (cantidad > 1) cantidad-- }}
						class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-stone-600 transition-colors text-white font-bold"
					>
						-
					</button>
					<div class="w-12 text-center font-bold text-lg">{cantidad}</div>
					<button 
						type="button"
						on:click={() => cantidad++}
						class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-stone-600 transition-colors text-white font-bold"
					>
						+
					</button>
				</div>
			</div>

			<!-- Forma de pago -->
			<div>
				<label for="formasPago" class="block text-sm font-medium mb-2 text-stone-300"
					>Forma de pago</label
				>
				<select
					required
					id="formasPago"
					bind:value={selectedPagoId}
					class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
				>
					<option value={null}>Seleccionar forma de pago</option>
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
