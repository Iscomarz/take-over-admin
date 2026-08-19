<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import { authStore, obtenerPerfilUsuario } from '$lib/stores/authStore';
	import {
		obtenerVentasDelDia,
		obtenerVentasPorEventoActivo,
		obtenerUltimasTransacciones
	} from '../../services/ventas-service';

	let usuario = null;
	let email = '';
	let loading = true;
	let ventasHoy = { totalVentas: 0, montoTotal: 0 };
	let ventasEventoActivo = { totalTickets: 0, totalMonto: 0, fases: [] };
	let ultimasTransacciones = [];

	// Modo Taquilla
	let modoTaquillaAdmin = false;
	let eventoActivo = null;
	let ticketsEventoActivo = [];
	let loadingTickets = false;
	let busquedaTicket = '';
	let filtroEstado = 'todos'; // 'todos', 'pendientes', 'validados'

	$: isTaquilla = $authStore.isTaquilla;
	$: isAdmin = $authStore.isAdmin;
	$: enModoTaquilla = isTaquilla || modoTaquillaAdmin;

	onMount(async () => {
		const profile = await obtenerPerfilUsuario();
		if (!profile) {
			toast.info('Sesión no encontrada. Redirigiendo al login...');
			goto('/', { replaceState: true });
			return;
		}

		usuario = $authStore.user;
		email = usuario?.email ?? '';

		if (typeof window !== 'undefined') {
			modoTaquillaAdmin = localStorage.getItem('modoTaquilla') === 'true';
		}

		await Promise.allSettled([
			cargarDatosDashboard(),
			cargarDatosTaquilla()
		]);

		loading = false;
	});

	async function cargarDatosDashboard() {
		const promesas = [
			obtenerVentasDelDia().then((res) => (ventasHoy = res)),
			obtenerUltimasTransacciones().then((res) => (ultimasTransacciones = res)),
			obtenerVentasPorEventoActivo().then((res) => (ventasEventoActivo = res))
		];
		await Promise.allSettled(promesas);
	}

	async function cargarDatosTaquilla() {
		try {
			loadingTickets = true;
			const { data: eventoData, error: errorEvento } = await supabase
				.from('mEvento')
				.select('*')
				.eq('activo', true)
				.order('idevento', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (errorEvento) {
				console.error('Error al cargar evento activo:', errorEvento);
			} else if (eventoData) {
				eventoActivo = eventoData;
				await cargarTicketsEvento(eventoData.idevento);
			}
		} finally {
			loadingTickets = false;
		}
	}

	async function cargarTicketsEvento(idevento) {
		const { data, error } = await supabase
			.from('ticket')
			.select(
				`idTicket,
				validado,
				referencia,
				fechaValidacion,
				mVenta!inner (nombre, idEvento, cliente_id(nombre, correo)),
				cFaseEvento (nombreFace, precio)`
			)
			.eq('mVenta.idEvento', idevento)
			.order('idTicket', { ascending: false });

		if (error) {
			console.error('Error al traer tickets del evento:', error);
		} else {
			ticketsEventoActivo = data || [];
		}
	}

	async function validarTicketDirecto(ticketItem) {
		if (ticketItem.validado) return;

		const { error } = await supabase
			.from('ticket')
			.update({ validado: true, fechaValidacion: new Date() })
			.eq('idTicket', ticketItem.idTicket);

		if (error) {
			console.error('Error al validar ticket:', error);
			toast.error('Error al validar ticket');
		} else {
			toast.success(`✓ Ticket #${ticketItem.referencia || ticketItem.idTicket} validado`);
			ticketsEventoActivo = ticketsEventoActivo.map((t) =>
				t.idTicket === ticketItem.idTicket ? { ...t, validado: true, fechaValidacion: new Date() } : t
			);
		}
	}

	function toggleModoTaquilla() {
		modoTaquillaAdmin = !modoTaquillaAdmin;
		if (typeof window !== 'undefined') {
			localStorage.setItem('modoTaquilla', modoTaquillaAdmin.toString());
		}
		if (modoTaquillaAdmin && (!ticketsEventoActivo || ticketsEventoActivo.length === 0)) {
			cargarDatosTaquilla();
		}
	}

	$: ticketsFiltrados = ticketsEventoActivo.filter((t) => {
		const clientName = t.mVenta?.cliente_id?.nombre || t.mVenta?.nombre || '';
		const clientEmail = t.mVenta?.cliente_id?.correo || '';
		const ref = t.referencia ? String(t.referencia) : '';
		const query = busquedaTicket.toLowerCase().trim();

		const matchesQuery =
			!query ||
			clientName.toLowerCase().includes(query) ||
			clientEmail.toLowerCase().includes(query) ||
			ref.includes(query) ||
			String(t.idTicket).includes(query);

		if (!matchesQuery) return false;

		if (filtroEstado === 'pendientes') return !t.validado;
		if (filtroEstado === 'validados') return t.validado;
		return true;
	});

	$: totalValidados = ticketsEventoActivo.filter((t) => t.validado).length;
	$: totalPendientes = ticketsEventoActivo.filter((t) => !t.validado).length;

	function formatMoney(value) {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(value || 0);
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		let fecha = dateStr;
		if (typeof fecha === 'string' && !fecha.endsWith('Z') && !fecha.includes('+')) {
			fecha = fecha + 'Z';
		}
		const date = new Date(fecha);
		return new Intl.DateTimeFormat('es-MX', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Mexico_City'
		}).format(date);
	}

	function parseMoney(value) {
		if (value == null) return 0;
		if (typeof value === 'number') return value;
		const cleaned = String(value).replace(/[^0-9.-]+/g, '');
		const n = parseFloat(cleaned);
		return Number.isNaN(n) ? 0 : n;
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-7xl mx-auto px-4 md:px-0 pt-4">
		<!-- Header con Switch de Modo Taquilla -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold">
						{enModoTaquilla ? '🎟️ Modo Taquilla' : 'Dashboard'}
					</h1>
					{#if enModoTaquilla}
						<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
							Operativo
						</span>
					{/if}
				</div>
				<p class="text-stone-400 text-sm mt-1">
					{usuario?.email} • Rol: <span class="capitalize font-medium text-stone-300">{$authStore.profile?.rol || 'staff'}</span>
				</p>
			</div>

			<!-- Switch solo visible para Admin -->
			{#if isAdmin}
				<div class="flex items-center gap-3 bg-stone-800/80 border border-stone-700 rounded-2xl p-2 px-4 w-fit">
					<span class="text-xs font-medium text-stone-300">Modo Taquilla</span>
					<button
						type="button"
						on:click={toggleModoTaquilla}
						class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {modoTaquillaAdmin ? 'bg-amber-500' : 'bg-stone-700'}"
						role="switch"
						aria-checked={modoTaquillaAdmin}
					>
						<span
							aria-hidden="true"
							class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {modoTaquillaAdmin ? 'translate-x-5' : 'translate-x-0'}"
						></span>
					</button>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Cargando...</p>
				</div>
			</div>
		{:else if enModoTaquilla}
			<!-- VISTA: MODO TAQUILLA -->
			<div class="space-y-6">
				<!-- Tarjeta de Evento Activo y Accesos Rápidos -->
				{#if eventoActivo}
					<div class="bg-stone-800/60 rounded-2xl p-6 border border-stone-700">
						<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
							<div>
								<span class="text-xs uppercase tracking-wider text-amber-400 font-semibold">Evento Activo</span>
								<h2 class="text-2xl font-bold text-white mt-1">{eventoActivo.nombreEvento}</h2>
								<p class="text-sm text-stone-400 mt-1">
									{eventoActivo.fechaEvento ? formatDate(eventoActivo.fechaEvento) : 'Fecha pendiente'}
								</p>
							</div>

							<!-- Botones Principales de Acción -->
							<div class="flex flex-wrap items-center gap-3">
								<button
									on:click={() => goto('/validate')}
									class="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-stone-950 py-3 px-6 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
									</svg>
									Escanear QR
								</button>

								<button
									on:click={() => goto('/ventaTaquilla')}
									class="flex-1 sm:flex-none bg-stone-700 hover:bg-stone-600 text-white py-3 px-6 rounded-xl font-bold transition-colors border border-stone-600 flex items-center justify-center gap-2"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
									Nueva Venta
								</button>
							</div>
						</div>

						<!-- Métricas operativas (validados vs pendientes) -->
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-700/60">
							<div class="bg-stone-900/50 rounded-xl p-4 border border-stone-700/40">
								<p class="text-xs text-stone-400 mb-1">Total Tickets Emitidos</p>
								<p class="text-2xl font-bold text-white">{ticketsEventoActivo.length}</p>
							</div>
							<div class="bg-green-950/30 rounded-xl p-4 border border-green-800/30">
								<p class="text-xs text-green-400 mb-1">Ingresados / Validados</p>
								<p class="text-2xl font-bold text-green-400">{totalValidados}</p>
							</div>
							<div class="bg-amber-950/30 rounded-xl p-4 border border-amber-800/30">
								<p class="text-xs text-amber-400 mb-1">Pendientes por Ingresar</p>
								<p class="text-2xl font-bold text-amber-400">{totalPendientes}</p>
							</div>
						</div>
					</div>
				{:else}
					<div class="bg-stone-800/50 rounded-2xl p-8 border border-stone-700 text-center">
						<p class="text-stone-400">No hay ningún evento activo actualmente.</p>
					</div>
				{/if}

				<!-- Lista y Buscador de Tickets a Validar -->
				<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 space-y-4">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 class="text-xl font-bold">Validación de Tickets</h3>
							<p class="text-xs text-stone-400">Busca por referencia, nombre o correo del cliente</p>
						</div>

						<!-- Filtros por Estado -->
						<div class="flex items-center gap-2 bg-stone-900/60 p-1 rounded-xl border border-stone-700/60 self-start">
							<button
								type="button"
								on:click={() => (filtroEstado = 'todos')}
								class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors {filtroEstado === 'todos' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'}"
							>
								Todos ({ticketsEventoActivo.length})
							</button>
							<button
								type="button"
								on:click={() => (filtroEstado = 'pendientes')}
								class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors {filtroEstado === 'pendientes' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-stone-400 hover:text-white'}"
							>
								Pendientes ({totalPendientes})
							</button>
							<button
								type="button"
								on:click={() => (filtroEstado = 'validados')}
								class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors {filtroEstado === 'validados' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'text-stone-400 hover:text-white'}"
							>
								Validados ({totalValidados})
							</button>
						</div>
					</div>

					<!-- Buscador -->
					<div class="relative">
						<input
							bind:value={busquedaTicket}
							type="text"
							placeholder="Buscar por referencia (ej. 82910382), nombre de cliente o correo..."
							class="w-full bg-stone-700/60 text-white border border-stone-600 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm placeholder-stone-400"
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5 absolute left-3 top-3.5 text-stone-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>

					<!-- Tabla de Tickets -->
					{#if loadingTickets}
						<div class="text-center py-8 text-stone-400">Cargando tickets del evento...</div>
					{:else if ticketsFiltrados.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-stone-700/50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-semibold text-stone-300 uppercase tracking-wider">Referencia</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-stone-300 uppercase tracking-wider">Cliente</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-stone-300 uppercase tracking-wider">Fase</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-stone-300 uppercase tracking-wider">Estado</th>
										<th class="px-4 py-3 text-right text-xs font-semibold text-stone-300 uppercase tracking-wider">Acción</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-stone-700/60">
									{#each ticketsFiltrados as ticketItem}
										<tr class="hover:bg-stone-700/30 transition-colors">
											<td class="px-4 py-3 text-sm font-mono text-amber-300">
												#{ticketItem.referencia || ticketItem.idTicket}
											</td>
											<td class="px-4 py-3 text-sm">
												<div class="font-medium text-white">
													{ticketItem.mVenta?.cliente_id?.nombre || ticketItem.mVenta?.nombre || 'Sin nombre'}
												</div>
												<div class="text-xs text-stone-400">
													{ticketItem.mVenta?.cliente_id?.correo || ''}
												</div>
											</td>
											<td class="px-4 py-3 text-sm text-stone-300">
												{ticketItem.cFaseEvento?.nombreFace || 'General'}
											</td>
											<td class="px-4 py-3 text-sm">
												{#if ticketItem.validado}
													<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
														✓ Validado
													</span>
												{:else}
													<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-500/30">
														⏳ Pendiente
													</span>
												{/if}
											</td>
											<td class="px-4 py-3 text-sm text-right">
												{#if !ticketItem.validado}
													<button
														type="button"
														on:click={() => validarTicketDirecto(ticketItem)}
														class="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
													>
														Validar
													</button>
												{:else}
													<span class="text-xs text-stone-500">
														{ticketItem.fechaValidacion ? formatDate(ticketItem.fechaValidacion) : 'Validado'}
													</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="text-center py-8 text-stone-400 text-sm">
							No se encontraron tickets con los filtros seleccionados.
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- VISTA: DASHBOARD ADMIN -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Card: Ventas del Día -->
				<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
					<div class="flex items-center gap-3 mb-4">
						<div class="bg-green-900/30 p-3 rounded-xl">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6 text-green-400"
								fill="currentColor"
								viewBox="0 0 256 256"
							>
								<path
									d="M232,96a8,8,0,0,1-8,8H176v16h32a8,8,0,0,1,0,16H176v16h48a8,8,0,0,1,0,16H176v16h32a8,8,0,0,1,0,16H176v16a8,8,0,0,1-16,0V56a8,8,0,0,1,16,0V88h48A8,8,0,0,1,232,96ZM64,120H96v16H64a8,8,0,0,0,0,16H96v16H80a8,8,0,0,0,0,16H96v16a8,8,0,0,0,16,0V56a8,8,0,0,0-16,0V88H64a8,8,0,0,0,0,16H96v16H64a8,8,0,0,0,0,16Z"
								></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold">Ventas del Día</h2>
					</div>

					<div class="space-y-4">
						<div class="bg-stone-700/50 rounded-xl p-4">
							<p class="text-sm text-stone-400 mb-1">Total de Ventas</p>
							<p class="text-3xl font-bold text-white">{ventasHoy.totalVentas}</p>
						</div>
						<div class="bg-stone-700/50 rounded-xl p-4">
							<p class="text-sm text-stone-400 mb-1">Monto Total</p>
							<p class="text-3xl font-bold text-green-400">{formatMoney(ventasHoy.montoTotal)}</p>
						</div>
					</div>
				</div>

				<!-- Card: Evento Activo -->
				<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 relative overflow-hidden group">
					<div class="flex items-center justify-between gap-3 mb-4 relative z-10">
						<div class="flex items-center gap-3">
							<div class="bg-blue-900/30 p-3 rounded-xl">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-6 h-6 text-blue-400"
									fill="currentColor"
									viewBox="0 0 256 256"
								>
									<path
										d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-68a28,28,0,0,1-28,28h-4v8a8,8,0,0,1-16,0v-8H104a8,8,0,0,1,0-16h36a12,12,0,0,0,0-24H116a28,28,0,0,1,0-56h4V72a8,8,0,0,1,16,0v8h16a8,8,0,0,1,0,16H116a12,12,0,0,0,0,24h24A28,28,0,0,1,168,148Z"
									></path>
								</svg>
							</div>
							<h2 class="text-xl font-semibold">Evento Activo</h2>
						</div>

						{#if ventasEventoActivo.eventoId}
							<button
								on:click={() => goto(`/events/event/${ventasEventoActivo.eventoId}`)}
								class="text-sm font-semibold text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-blue-900/40 hover:border-blue-700/60"
							>
								Administrar
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									fill="currentColor"
									viewBox="0 0 256 256"
								><path
									d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"
								></path></svg>
							</button>
						{/if}
					</div>

					{#if ventasEventoActivo.totalTickets > 0}
						<div class="space-y-3 mb-4">
							<div class="bg-stone-700/50 rounded-xl p-4">
								<p class="text-sm text-stone-400 mb-1">Tickets Vendidos</p>
								<p class="text-2xl font-bold text-white">{ventasEventoActivo.totalTickets}</p>
							</div>
							<div class="bg-stone-700/50 rounded-xl p-4">
								<p class="text-sm text-stone-400 mb-1">Monto Total</p>
								<p class="text-2xl font-bold text-blue-400">
									{formatMoney(ventasEventoActivo.totalMonto)}
								</p>
							</div>
						</div>

						<div>
							<p class="text-sm font-semibold text-stone-300 mb-3">Desglose por Fase</p>
							<div class="space-y-2">
								{#each ventasEventoActivo.fases as fase}
									<div
										class="bg-stone-700/30 rounded-lg p-3 border border-stone-600 hover:border-stone-500 transition-colors"
									>
										<div class="flex items-center justify-between mb-2">
											<p class="font-semibold text-sm">{fase.nombre_fase}</p>
											<p class="text-xs text-stone-400">{fase.cantidad} tickets</p>
										</div>
										<div class="flex items-center justify-between">
											<div class="flex-1 bg-stone-600 rounded-full h-2 mr-3">
												<div
													class="bg-blue-500 h-2 rounded-full"
													style="width: {(fase.cantidad / ventasEventoActivo.totalTickets) * 100}%"
												></div>
											</div>
											<p class="text-sm font-semibold text-blue-400">
												{formatMoney(fase.monto)}
											</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="text-center py-8">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-12 h-12 mx-auto mb-3 text-stone-600"
								fill="currentColor"
								viewBox="0 0 256 256"
							>
								<path
									d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"
								></path>
							</svg>
							<p class="text-stone-400 text-sm">No hay evento activo</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Tabla: Últimas Transacciones -->
			<div class="mt-6 bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
				<div class="flex items-center gap-3 mb-6">
					<div class="bg-purple-900/30 p-3 rounded-xl">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-6 h-6 text-purple-400"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM40,112H80v32H40Zm56,0H216v32H96ZM216,64V96H40V64ZM40,160H80v32H40Zm176,32H96V160H216v32Z"
							></path>
						</svg>
					</div>
					<h2 class="text-xl font-semibold">Últimas Transacciones</h2>
				</div>

				{#if ultimasTransacciones.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-stone-700/50">
								<tr>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Fecha</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Cliente</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Correo</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Evento</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Tickets</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Monto</th>
									<th class="px-4 py-3 text-left text-sm font-semibold text-stone-300">Forma de pago</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-stone-700">
								{#each ultimasTransacciones as transaccion}
									<tr class="hover:bg-stone-700/30 transition-colors">
										<td class="px-4 py-3 text-sm text-stone-400">
											{formatDate(transaccion.fechaVenta)}
										</td>
										<td class="px-4 py-3 text-sm font-medium">{transaccion.nombre}</td>
										<td class="px-4 py-3 text-sm text-stone-400">{transaccion.correo}</td>
										<td class="px-4 py-3 text-sm">{transaccion.mEvento?.nombreEvento}</td>
										<td class="px-4 py-3 text-sm">
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
												{transaccion.cantidadTickets}
											</span>
										</td>
										<td class="px-4 py-3 text-sm font-semibold text-green-400">
											{formatMoney(parseMoney(transaccion.mPago?.cantidad))}
										</td>
										<td class="px-4 py-3 text-sm text-stone-400">
											{transaccion.mPago?.cFormaPago?.nombre || 'N/A'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-center py-8">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-12 h-12 mx-auto mb-3 text-stone-600"
							fill="currentColor"
							viewBox="0 0 256 256"
						>
							<path
								d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"
							></path>
						</svg>
						<p class="text-stone-400 text-sm">No hay transacciones recientes</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
