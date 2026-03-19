<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
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
	let procesando = false;

	// IDs para binding (más robusto)
	let selectedEventoId = null;
	let selectedFaseId = null;
	let selectedPagoId = null;

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
		await cargarDatosIniciales();
		
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

	async function cargarDatosIniciales() {
		// Cargar eventos activos
		let { data: mEvento, error } = await supabase
			.from('mEvento')
			.select('*')
			.eq('activo', true);

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
			// Auto seleccionar el primer evento activo
			selectedEventoId = eventos[0].idevento;
			await traeFormaPago();
		} else if (error || mEvento.length === 0) {
			console.log('Error o no existen eventos activos');
		}
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

	async function traerUsuario() {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			idUsuario = data.session.user;
		}
	}

	async function traeFormaPago() {
		let { data, error } = await supabase
			.from('cFormaPago')
			.select('*')
			.in('idformapago', [1, 2, 4]);
		if (data && data.length > 0) {
			formasPago = data;
			// Auto seleccionar Efectivo (ID 1)
			selectedPagoId = 1;
		} else if (error) {
			console.log('Error al traer las formas de pago');
			toast.error('Error al cargar formas de pago');
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
			// Ordenar por precio ascendente
			fasesEvento = fases.sort((a, b) => a.precio - b.precio);
			await tick();
			// Auto seleccionar la más barata
			selectedFaseId = fasesEvento[0].idFase;
		} else {
			fasesEvento = [];
			selectedFaseId = null;
			if (error) {
				console.log('Error al traer las fases del evento');
				toast.error('Error al cargar las fases del evento');
			}
		}
	}

	async function realizarVentaTaquilla() {
		// Validar campos obligatorios
		if (!selectedEventoId) {
			toast.error('Selecciona un evento');
			return;
		}

		if (!selectedFaseId) {
			toast.error('Selecciona una fase del evento');
			return;
		}

		if (!cantidad || cantidad < 1) {
			toast.error('La cantidad debe ser al menos 1');
			return;
		}

		if (!formaPagoSelect || !formaPagoSelect.idformapago) {
			toast.error('Selecciona una forma de pago');
			return;
		}

		procesando = true;

		try {
			// Paso 1: Guardar en tabla mPago
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
				procesando = false;
				return;
			}

			// Paso 2: Buscar o crear cliente
			let clienteId;
			const correoCliente = correo || 'taquilla@takeovermx.com';
			const nombreCliente = nombre || 'Venta en taquilla';

			// Buscar cliente existente
			const { data: clienteExistente } = await supabase
				.from('mCliente')
				.select('cliente_id')
				.eq('correo', correoCliente)
				.maybeSingle();

			if (clienteExistente) {
				clienteId = clienteExistente.cliente_id;
			} else {
				// Crear nuevo cliente
				const { data: nuevoCliente, error: errorCliente } = await supabase
					.from('mCliente')
					.insert([
						{
							nombre: nombreCliente,
							correo: correoCliente,
							fecha_registro: new Date()
						}
					])
					.select()
					.single();

				if (errorCliente) {
					console.error('Error al crear cliente:', errorCliente);
					toast.error('Error al registrar cliente');
					procesando = false;
					return;
				}
				clienteId = nuevoCliente.cliente_id;
			}

			// Paso 3: Guardar en tabla mVenta
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
				procesando = false;
				return;
			}

			// Venta exitosa
			toast.success('✓ Venta registrada correctamente');
			
			// Limpiar formulario
			limpiarForm();
			
			// Regresar a validate después de 1 segundo
			setTimeout(() => {
				goto('/validate');
			}, 1000);

		} catch (error) {
			console.error('Error en la venta:', error);
			toast.error('Error al procesar la venta');
			procesando = false;
		}
	}

	function limpiarForm() {
		nombre = '';
		cantidad = 1;
		correo = '';
		procesando = false;
		traerFasesActivas();
		// Re-seleccionar Efectivo
		formaPagoSelect = formasPago.find((f) => f.idformapago === 1) || formasPago[0];
	}

	function cancelar() {
		goto('/validate');
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-2xl mx-auto px-4 py-6">
		<!-- Header -->
		<div class="flex items-center mb-6">
			<button
				on:click={cancelar}
				class="mr-4 p-2 hover:bg-stone-700 rounded-lg transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
					></path>
				</svg>
			</button>
			<div class="flex-1">
				<h1 class="text-3xl font-bold">Venta en Taquilla</h1>
				<p class="text-stone-400 text-sm mt-1">Registro de venta sin emisión de ticket</p>
			</div>
		</div>

		<form
			on:submit|preventDefault={realizarVentaTaquilla}
			class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 space-y-6"
		>
			<!-- Sección: Datos del evento - Campos obligatorios -->
			<div class="space-y-6">
				<!-- Evento -->
				<div>
					<label for="events" class="block text-sm font-medium mb-2 text-stone-300"
						>Evento <span class="text-red-500">*</span></label
					>
					<select
						required
						id="events"
						bind:value={selectedEventoId}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value={null}>Seleccionar Evento</option>
						{#each eventos as evento}
							<option value={evento.idevento}>{evento.nombreEvento}</option>
						{/each}
					</select>
				</div>

				<!-- Fase -->
				<div>
					<label for="fases" class="block text-sm font-medium mb-2 text-stone-300"
						>Fase del Ticket <span class="text-red-500">*</span></label
					>
					<select
						required
						id="fases"
						bind:value={selectedFaseId}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value={null}>Seleccionar fase</option>
						{#each fasesEvento as fase}
							<option value={fase.idFase}>{fase.nombreFace} - ${fase.precio}</option>
						{/each}
					</select>
				</div>

				<!-- Cantidad con Contador -->
				<div>
					<label for="cantidad" class="block text-sm font-medium mb-2 text-stone-300"
						>Cantidad <span class="text-red-500">*</span></label
					>
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
						>Forma de Pago <span class="text-red-500">*</span></label
					>
					<select
						required
						id="formasPago"
						bind:value={selectedPagoId}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value={null}>Seleccionar forma de pago</option>
						{#each formasPago as formaPago}
							<option value={formaPago.idformapago}>{formaPago.nombre}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Separador -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-stone-600"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-3 bg-stone-800/50 text-stone-400">Datos opcionales del cliente</span>
				</div>
			</div>

			<!-- Sección: Datos del cliente - Campos opcionales -->
			<div class="space-y-6">
				<!-- Nombre -->
				<div class="relative">
					<label for="nombre" class="block text-sm font-medium mb-2 text-stone-300"
						>Nombre <span class="text-stone-500 text-xs">(opcional)</span></label
					>
					<input
						bind:value={nombre}
						on:input={handleInputNombre}
						on:focus={() => { if (clientesFiltrados.length > 0 && nombre.length > 1) mostrarDropdown = true; }}
						type="text"
						id="nombre"
						autocomplete="off"
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
						placeholder="Nombre del cliente"
					/>

					{#if mostrarDropdown}
						<div class="absolute z-50 w-full mt-1 bg-stone-800 border border-stone-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-stone-700 font-sans">
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
					<label for="correo" class="block text-sm font-medium mb-2 text-stone-300"
						>Correo <span class="text-stone-500 text-xs">(opcional)</span></label
					>
					<input
						bind:value={correo}
						type="email"
						id="correo"
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
						placeholder="correo@ejemplo.com"
					/>
				</div>
			</div>

			<!-- Total a pagar -->
			{#if faseSelec && faseSelec.precio && cantidad}
				<div class="bg-stone-700/50 rounded-xl p-4 border border-stone-600">
					<div class="flex justify-between items-center">
						<span class="text-stone-300 font-medium">Total a pagar:</span>
						<span class="text-2xl font-bold text-green-400"
							>${(cantidad * faseSelec.precio).toFixed(2)}</span
						>
					</div>
				</div>
			{/if}

			<!-- Botones -->
			<div class="flex gap-3 pt-4">
				<button
					type="button"
					on:click={cancelar}
					class="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors border border-stone-600"
					disabled={procesando}
				>
					Cancelar
				</button>
				<button
					type="submit"
					class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold transition-colors shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={procesando}
				>
					{#if procesando}
						<svg
							class="animate-spin h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Procesando...
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"
							></path>
						</svg>
						Registrar Venta
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
