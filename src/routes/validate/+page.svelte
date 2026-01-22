<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Html5QrcodeScanner } from 'html5-qrcode';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';
	import { referenciaValida } from '$lib/stores/qrValidate';
	import ValidationModal from '../../components/ValidationModal.svelte';

	let qrCodeMessage = '';
	let scanner;
	let token = '';
	let isScanning = true;
	let scannerActive = false;

	let eventos = [];
	let tickets = [];
	let filteredTickets = [];
	let filterCliente = '';
	let selectedEvento;
	let dataCargada = false;
	let modoValidacion = 'nombre';

	// Estados del modal
	let showModal = false;
	let modalStatus = 'success'; // 'success', 'already-validated', 'not-found'
	let modalClientName = '';

	onMount(async () => {
		toast.dismiss();
		await traerEventoMasCercano();

		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		const { data, error } = await supabase.from('mEvento').select('*');
		if (error) {
			console.error('Error fetching eventos:', error);
		} else {
			eventos = data;
		}
	});

	async function iniciarScanner() {
		modoValidacion = 'qr';
		scannerActive = true;
		
		setTimeout(() => {
			scanner = new Html5QrcodeScanner('reader', {
				fps: 10,
				qrbox: { width: 250, height: 250 },
				aspectRatio: 1.0,
				videoConstraints: {
					facingMode: { ideal: "environment" }
				},
				showTorchButtonIfSupported: true,
				rememberLastUsedCamera: true
			}, /* verbose= */ false);

			scanner.render(
				async (decodedText, decodedResult) => {
					if (!isScanning) return;

					qrCodeMessage = decodedText;
					console.log('QR Code escaneado:', decodedText);

					let { data: qrValido, error: qrNoValido } = await supabase
						.from('ticket')
						.select('*, mVenta(nombre)')
						.eq('codigoQR', qrCodeMessage);

					isScanning = false;

					if (qrNoValido || !qrValido || qrValido.length === 0) {
						// QR no encontrado
						modalStatus = 'not-found';
						modalClientName = '';
						showModal = true;
					} else if (qrValido[0].validado === true) {
						// QR ya validado
						modalStatus = 'already-validated';
						modalClientName = qrValido[0].mVenta?.nombre || '';
						showModal = true;
					} else if (qrValido[0].validado === false) {
						// QR válido, proceder a validar
						const { error: updateError } = await supabase
							.from('ticket')
							.update({ validado: true })
							.eq('codigoQR', qrCodeMessage);

						if (updateError) {
							toast.error('Error al validar el ticket');
							resetScanner();
						} else {
							modalStatus = 'success';
							modalClientName = qrValido[0].mVenta?.nombre || '';
							showModal = true;
						}
					}
				},
				(error) => {
					console.warn(`Error de escaneo: ${error}`);
				}
			);
		}, 100);
	}

	async function fetchTickets() {
		if (selectedEvento.idevento) {
			const { data, error } = await supabase
				.from('ticket')
				.select(
					`	idTicket,
						validado,
						mVenta (nombre, idEvento),
						cFaseEvento (nombreFace)
					`
				)
				.eq('mVenta.idEvento', selectedEvento.idevento)
				.order('idTicket', { asc: true });

			if (error) {
				console.error('Error fetching data:', error);
			} else {
				tickets = data;
				dataCargada = true;
			}
		}
	}

	async function validarTicket(idTicket) {
		const { data, error } = await supabase
			.from('ticket')
			.update({ validado: true })
			.eq('idTicket', idTicket);

		if (error) {
			console.error('Error al validar ticket:', error);
			toast.error('Error al validar');
		} else {
			toast.success('✓ Ticket validado correctamente');
			fetchTickets();
			resetScanner();
		}
	}

	async function traerEventoMasCercano() {
		const { data, error } = await supabase
			.from('mEvento')
			.select('*')
			.gt('fechaInicio', new Date().toISOString())
			.order('fechaInicio', {
				ascending: true
			})
			.limit(1);

		if (error) {
			console.error('Error fetching eventos:', error);
		} else {
			if (data.length > 0) {
				selectedEvento = data[0];
				fetchTickets();
			} else {
				toast.error('No hay eventos disponibles');
			}
		}
	}

	$: filteredTickets = tickets.filter(
		(ticket) =>
			ticket.idTicket &&
			ticket.mVenta &&
			ticket.mVenta.nombre &&
			ticket.mVenta.nombre.toLowerCase().includes(filterCliente.toLowerCase())
	);

	function resetScanner() {
		setTimeout(() => {
			isScanning = true;
		}, 2000);
	}

	function stopScanner() {
		if (scanner) {
			scanner.clear();
			scanner = null;
		}
		scannerActive = false;
		modoValidacion = 'nombre';
	}

	function cambiarModo(modo) {
		if (modo === 'nombre') {
			stopScanner();
			modoValidacion = 'nombre';
		} else if (modo === 'qr') {
			iniciarScanner();
		}
	}

	function handleModalClose() {
		showModal = false;
		modalClientName = '';
		resetScanner();
	}

	onDestroy(() => stopScanner());
</script>

<Toaster />
<ValidationModal
	isOpen={showModal}
	status={modalStatus}
	clientName={modalClientName}
	on:close={handleModalClose}
/>

<div class="min-h-screen bg-gradient-to-b from-black-900 to-black-800 text-white p-4 pb-20">
	<!-- Header -->
	<div class="w-full">
		<div class="text-center mb-6">
			<h1 class="text-2xl font-bold mb-2">Validar Accesos</h1>
			<p class="text-gray-400 text-sm">
				{selectedEvento ? selectedEvento.nombreEvento : 'Cargando evento...'}
			</p>
		</div>

		<!-- Selector de Modo -->
		<div class="grid grid-cols-2 gap-3 mb-6">
			<button
				on:click={() => cambiarModo('nombre')}
				class="flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 {modoValidacion === 'nombre'
					? 'bg-black shadow-lg shadow-black/50 scale-105 border-2 border-stone-500'
					: 'bg-stone-800/70 hover:bg-stone-700/90'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-12 h-12 mb-2"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
					></path>
				</svg>
				<span class="font-semibold text-sm">Por Nombre</span>
			</button>

			<button
				on:click={() => cambiarModo('qr')}
				class="flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 {modoValidacion === 'qr'
					? 'bg-black shadow-lg shadow-black/50 scale-105 border-2 border-gray-500'
					: 'bg-stone-900/70 hover:bg-stone-800/90'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-12 h-12 mb-2"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm0,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Zm0-160H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Z"
					></path>
				</svg>
				<span class="font-semibold text-sm">Escanear QR</span>
			</button>
		</div>

		<!-- Contenido según el modo -->
		{#if modoValidacion === 'qr'}
			<div class="bg-stone-800/50 rounded-2xl p-4 mb-6">
				<div class="text-center mb-4">
					<p class="text-sm text-stone-300">Apunta la cámara al código QR</p>
				</div>
				<div id="reader" class="rounded-xl overflow-hidden"></div>
				<button
					on:click={() => cambiarModo('nombre')}
					class="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors"
				>
					Cerrar Escáner
				</button>
			</div>
		{:else}
			<!-- Modo búsqueda por nombre -->
			<div class="bg-stone-800/50 rounded-2xl p-4 mb-6">
				<!-- Selector de evento -->
				<div class="mb-4">
					<label for="evento" class="block text-sm font-medium mb-2 text-stone-300"
						>Evento:</label
					>
					<select
						id="evento"
						bind:value={selectedEvento}
						on:change={fetchTickets}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					>
						<option value="" disabled selected>Seleccione un evento</option>
						{#each eventos as evento}
							<option value={evento}>{evento.nombreEvento}</option>
						{/each}
					</select>
				</div>

				<!-- Búsqueda por nombre -->
				<div class="mb-4">
					<label for="filterCliente" class="block text-sm font-medium mb-2 text-gray-300"
						>Buscar cliente:</label
					>
					<div class="relative">
						<input
							id="filterCliente"
							type="text"
							placeholder="Escribe el nombre del cliente..."
							bind:value={filterCliente}
							class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-stone-500 focus:border-transparent text-lg"
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
							></path>
						</svg>
					</div>
				</div>
			</div>

			<!-- Lista de tickets -->
			{#if dataCargada}
				<div class="space-y-3">
					{#if filteredTickets.length === 0}
						<div class="text-center py-12 text-gray-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-16 h-16 mx-auto mb-3 opacity-50"
								fill="currentColor"
								viewBox="0 0 256 256"
							>
								<path
									d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
								></path>
							</svg>
							<p class="text-lg">No se encontraron resultados</p>
							<p class="text-sm mt-1">Intenta con otro nombre</p>
						</div>
					{:else}
						{#each filteredTickets as ticket}
							<div
								class="bg-stone-800/70 rounded-xl p-4 border border-stone-700 hover:border-stone-600 transition-colors"
							>
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<h3 class="font-semibold text-lg mb-1">{ticket.mVenta.nombre}</h3>
										<p class="text-sm text-stone-400">{ticket.cFaseEvento.nombreFace}</p>
									</div>
									<div class="flex items-center gap-3">
										{#if ticket.validado}
											<div class="flex items-center gap-2 bg-green-900/30 text-green-400 px-3 py-2 rounded-lg">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-6 h-6"
													fill="currentColor"
													viewBox="0 0 256 256"
												>
													<path
														d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"
													></path>
												</svg>
												<span class="text-sm font-medium">Validado</span>
											</div>
										{:else}
											<button
												on:click={() => validarTicket(ticket.idTicket)}
												class="bg-stone-700 hover:bg-stone-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-lg border border-stone-600"
											>
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
												Validar
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{:else}
				<div class="text-center py-12 text-gray-400">
					<div class="animate-pulse">
						<div class="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3"></div>
						<p>Cargando tickets...</p>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

