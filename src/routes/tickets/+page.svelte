<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import supabase from '$lib/supabase';
	import toast, { Toaster } from 'svelte-french-toast';
	import { authStore } from '$lib/stores/authStore';

	let eventos = [];
	let selectedEventoId = null;
	let selectedEvento = null;
	let tickets = [];
	let loading = true;
	let searchTerm = '';
	let filtroEstado = 'todos'; // 'todos', 'activo', 'suspendido', 'cancelado'

	// Modal de edición de estado
	let showModalEstado = false;
	let ticketSeleccionado = null;
	let nuevoEstado = 'activo';
	let motivoCancelacion = '';
	let aplicarATodaLaVenta = false;
	let guardando = false;

	onMount(async () => {
		toast.dismiss();
		const eventIdParam = $page.url.searchParams.get('eventId');

		// Cargar eventos
		const { data: dataEventos, error: errEventos } = await supabase
			.from('mEvento')
			.select('idevento, nombreEvento, activo')
			.order('idevento', { ascending: false });

		if (errEventos) {
			console.error('Error al cargar eventos:', errEventos);
			toast.error('Error al cargar eventos');
			loading = false;
			return;
		}

		eventos = dataEventos || [];

		if (eventIdParam) {
			selectedEventoId = parseInt(eventIdParam);
			selectedEvento = eventos.find((e) => e.idevento === selectedEventoId) || null;
		} else if (eventos.length > 0) {
			const activo = eventos.find((e) => e.activo) || eventos[0];
			selectedEventoId = activo.idevento;
			selectedEvento = activo;
		}

		if (selectedEventoId) {
			await cargarTickets();
		} else {
			loading = false;
		}
	});

	async function cambiarEvento() {
		selectedEvento = eventos.find((e) => e.idevento === selectedEventoId) || null;
		await cargarTickets();
	}

	async function cargarTickets() {
		if (!selectedEventoId) return;
		loading = true;

		const { data, error } = await supabase
			.from('ticket')
			.select(
				`
				idTicket,
				codigoQR,
				referencia,
				validado,
				fechaValidacion,
				estado,
				motivo_cancelacion,
				updated_at,
				idVenta,
				mVenta!inner (
					idventa,
					idEvento,
					nombre,
					correo,
					fechaVenta,
					cantidadTickets,
					cliente_id (cliente_id, nombre, correo)
				),
				cFaseEvento (
					nombreFace,
					precio
				)
			`
			)
			.eq('mVenta.idEvento', selectedEventoId)
			.order('idTicket', { ascending: false });

		if (error) {
			console.error('Error al cargar tickets:', error);
			toast.error('Error al cargar tickets');
		} else {
			tickets = data || [];
		}

		loading = false;
	}

	// Estadísticas
	$: totalTickets = tickets.length;
	$: totalActivos = tickets.filter((t) => (t.estado || 'activo') === 'activo').length;
	$: totalSuspendidos = tickets.filter((t) => t.estado === 'suspendido').length;
	$: totalCancelados = tickets.filter(
		(t) => t.estado === 'cancelado' || t.estado === 'reembolsado'
	).length;
	$: totalValidados = tickets.filter((t) => t.validado === true).length;

	// Filtrado reactivo
	$: ticketsFiltrados = tickets.filter((t) => {
		const estado = t.estado || 'activo';
		if (filtroEstado !== 'todos') {
			if (filtroEstado === 'cancelado') {
				if (estado !== 'cancelado' && estado !== 'reembolsado') return false;
			} else if (estado !== filtroEstado) {
				return false;
			}
		}

		if (!searchTerm.trim()) return true;

		const term = searchTerm.toLowerCase().trim();
		const clienteNombre = (
			t.mVenta?.cliente_id?.nombre ||
			t.mVenta?.nombre ||
			''
		).toLowerCase();
		const clienteCorreo = (
			t.mVenta?.cliente_id?.correo ||
			t.mVenta?.correo ||
			''
		).toLowerCase();
		const idStr = String(t.idTicket);
		const refStr = String(t.referencia || '');
		const qrStr = String(t.codigoQR || '').toLowerCase();
		const ventaStr = String(t.idVenta || '');

		return (
			clienteNombre.includes(term) ||
			clienteCorreo.includes(term) ||
			idStr.includes(term) ||
			refStr.includes(term) ||
			qrStr.includes(term) ||
			ventaStr.includes(term)
		);
	});

	function abrirModalEstado(t) {
		ticketSeleccionado = t;
		nuevoEstado = t.estado || 'activo';
		motivoCancelacion = t.motivo_cancelacion || '';
		aplicarATodaLaVenta = false;
		showModalEstado = true;
	}

	function cerrarModalEstado() {
		showModalEstado = false;
		ticketSeleccionado = null;
		motivoCancelacion = '';
		guardando = false;
	}

	async function guardarCambioEstado() {
		if (!ticketSeleccionado) return;

		if (
			(nuevoEstado === 'suspendido' ||
				nuevoEstado === 'cancelado' ||
				nuevoEstado === 'reembolsado') &&
			!motivoCancelacion.trim()
		) {
			toast.error('Por favor escribe un motivo o referencia de la disputa/cancelación');
			return;
		}

		guardando = true;

		const updatePayload = {
			estado: nuevoEstado,
			motivo_cancelacion: motivoCancelacion.trim() || null,
			updated_at: new Date()
		};

		let query = supabase.from('ticket').update(updatePayload);

		if (aplicarATodaLaVenta && ticketSeleccionado.idVenta) {
			query = query.eq('idVenta', ticketSeleccionado.idVenta);
		} else {
			query = query.eq('idTicket', ticketSeleccionado.idTicket);
		}

		const { error } = await query;

		if (error) {
			console.error('Error al actualizar estado del ticket:', error);
			toast.error('Error al actualizar el ticket');
			guardando = false;
		} else {
			toast.success(
				aplicarATodaLaVenta
					? `✓ Todos los tickets de la venta #${ticketSeleccionado.idVenta} cambiaron a "${nuevoEstado}"`
					: `✓ Ticket #${ticketSeleccionado.idTicket} actualizado a "${nuevoEstado}"`
			);
			cerrarModalEstado();
			await cargarTickets();
		}
	}

	function volverAtras() {
		if (selectedEventoId) {
			goto(`/events/event/${selectedEventoId}`);
		} else {
			goto('/home');
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8">
	<div class="max-w-7xl mx-auto space-y-6">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
			<div>
				<button
					on:click={volverAtras}
					class="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm mb-2"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
						<path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
					</svg>
					Volver
				</button>
				<h1 class="text-3xl font-black text-white flex items-center gap-3">
					Gestión de Tickets y Disputas
				</h1>
				<p class="text-stone-400 text-sm mt-1">
					Control de estados en tiempo real (activar, suspender por disputa o cancelar boletos sin borrar registros).
				</p>
			</div>

			<!-- Selector de Evento -->
			<div class="w-full md:w-80">
				<label for="evento-select" class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">
					Evento
				</label>
				<select
					id="evento-select"
					bind:value={selectedEventoId}
					on:change={cambiarEvento}
					class="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
				>
					{#each eventos as ev}
						<option value={ev.idevento}>
							{ev.nombreEvento} {ev.activo ? '🟢 (Activo)' : ''}
						</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Tarjetas de métricas -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
			<button
				type="button"
				on:click={() => (filtroEstado = 'todos')}
				class="p-4 rounded-2xl border text-left transition-all {filtroEstado === 'todos'
					? 'bg-stone-800 border-stone-500 shadow-lg'
					: 'bg-stone-900/60 border-stone-800 hover:border-stone-700'}"
			>
				<p class="text-xs uppercase tracking-wider text-stone-400 font-medium">Total Tickets</p>
				<p class="text-2xl md:text-3xl font-black text-white mt-1">{totalTickets}</p>
				<p class="text-[11px] text-stone-500 mt-1">{totalValidados} ya ingresados</p>
			</button>

			<button
				type="button"
				on:click={() => (filtroEstado = 'activo')}
				class="p-4 rounded-2xl border text-left transition-all {filtroEstado === 'activo'
					? 'bg-green-950/40 border-green-500 shadow-lg shadow-green-950/50'
					: 'bg-stone-900/60 border-stone-800 hover:border-stone-700'}"
			>
				<div class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-green-400"></span>
					<p class="text-xs uppercase tracking-wider text-green-400 font-semibold">Activos</p>
				</div>
				<p class="text-2xl md:text-3xl font-black text-green-400 mt-1">{totalActivos}</p>
				<p class="text-[11px] text-stone-500 mt-1">Válidos para entrar</p>
			</button>

			<button
				type="button"
				on:click={() => (filtroEstado = 'suspendido')}
				class="p-4 rounded-2xl border text-left transition-all {filtroEstado === 'suspendido'
					? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/50'
					: 'bg-stone-900/60 border-stone-800 hover:border-stone-700'}"
			>
				<div class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
					<p class="text-xs uppercase tracking-wider text-amber-400 font-semibold">Suspendidos</p>
				</div>
				<p class="text-2xl md:text-3xl font-black text-amber-400 mt-1">{totalSuspendidos}</p>
				<p class="text-[11px] text-stone-400 mt-1">Disputa / Aclaración</p>
			</button>

			<button
				type="button"
				on:click={() => (filtroEstado = 'cancelado')}
				class="p-4 rounded-2xl border text-left transition-all {filtroEstado === 'cancelado'
					? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50'
					: 'bg-stone-900/60 border-stone-800 hover:border-stone-700'}"
			>
				<div class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-red-400"></span>
					<p class="text-xs uppercase tracking-wider text-red-400 font-semibold">Cancelados</p>
				</div>
				<p class="text-2xl md:text-3xl font-black text-red-400 mt-1">{totalCancelados}</p>
				<p class="text-[11px] text-stone-500 mt-1">Sin validez ni acceso</p>
			</button>
		</div>

		<!-- Barra de Búsqueda y Filtros -->
		<div class="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
			<div class="relative w-full md:max-w-md">
				<svg
					class="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
				</svg>
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Buscar por cliente, correo, #ticket, venta o referencia..."
					class="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-green-500"
				/>
				{#if searchTerm}
					<button
						on:click={() => (searchTerm = '')}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
					>
						✕
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'todos'
						? 'bg-stone-700 text-white'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroEstado = 'todos')}
				>
					Todos ({tickets.length})
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'activo'
						? 'bg-green-900/60 text-green-300 border border-green-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroEstado = 'activo')}
				>
					Activos ({totalActivos})
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'suspendido'
						? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroEstado = 'suspendido')}
				>
					Suspendidos ({totalSuspendidos})
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {filtroEstado === 'cancelado'
						? 'bg-red-900/60 text-red-300 border border-red-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroEstado = 'cancelado')}
				>
					Cancelados ({totalCancelados})
				</button>
			</div>
		</div>

		<!-- Tabla de Tickets -->
		{#if loading}
			<div class="p-12 text-center text-stone-400 bg-stone-900/40 rounded-2xl border border-stone-800">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-600 border-t-green-500 mb-3"></div>
				<p>Cargando tickets...</p>
			</div>
		{:else if ticketsFiltrados.length === 0}
			<div class="p-12 text-center text-stone-400 bg-stone-900/40 rounded-2xl border border-stone-800">
				<p class="text-lg font-medium text-stone-300">No se encontraron tickets</p>
				<p class="text-sm text-stone-500 mt-1">Prueba cambiando los filtros o el término de búsqueda.</p>
			</div>
		{:else}
			<div class="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-stone-800/80 text-stone-400 text-xs uppercase tracking-wider font-semibold border-b border-stone-800">
							<tr>
								<th class="px-4 py-3.5"># Ticket</th>
								<th class="px-4 py-3.5">Cliente</th>
								<th class="px-4 py-3.5">Fase</th>
								<th class="px-4 py-3.5">Ingreso</th>
								<th class="px-4 py-3.5">Estado</th>
								<th class="px-4 py-3.5">Motivo / Disputa</th>
								<th class="px-4 py-3.5 text-right">Acción</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-800/60">
							{#each ticketsFiltrados as t (t.idTicket)}
								{@const estado = t.estado || 'activo'}
								{@const clienteNombre = t.mVenta?.cliente_id?.nombre || t.mVenta?.nombre || 'Sin nombre'}
								{@const clienteCorreo = t.mVenta?.cliente_id?.correo || t.mVenta?.correo || 'Sin correo'}
								<tr class="hover:bg-stone-800/30 transition-colors {estado === 'suspendido' ? 'bg-amber-950/10' : estado === 'cancelado' ? 'bg-red-950/10' : ''}">
									<!-- # Ticket -->
									<td class="px-4 py-3.5 font-mono text-stone-300">
										<span class="font-bold text-white">#{t.idTicket}</span>
										{#if t.referencia}
											<span class="block text-[11px] text-stone-500">Ref: {t.referencia}</span>
										{/if}
										<span class="block text-[10px] text-stone-500">Venta #{t.idVenta}</span>
									</td>

									<!-- Cliente -->
									<td class="px-4 py-3.5">
										<p class="font-semibold text-white">{clienteNombre}</p>
										<p class="text-xs text-stone-400">{clienteCorreo}</p>
									</td>

									<!-- Fase -->
									<td class="px-4 py-3.5 text-stone-300">
										<p class="font-medium">{t.cFaseEvento?.nombreFace || 'General'}</p>
										{#if t.cFaseEvento?.precio}
											<p class="text-xs text-stone-500">${t.cFaseEvento.precio}</p>
										{/if}
									</td>

									<!-- Ingreso (Validado) -->
									<td class="px-4 py-3.5">
										{#if t.validado}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-900/40 text-green-300 border border-green-700/50">
												✓ Ingresó
											</span>
											{#if t.fechaValidacion}
												<span class="block text-[10px] text-stone-500 mt-0.5">
													{new Date(t.fechaValidacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												</span>
											{/if}
										{:else}
											<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-800 text-stone-400">
												Pendiente
											</span>
										{/if}
									</td>

									<!-- Estado del Ticket -->
									<td class="px-4 py-3.5">
										{#if estado === 'activo'}
											<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/30">
												<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
												Activo
											</span>
										{:else if estado === 'suspendido'}
											<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/40">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
												Suspendido
											</span>
										{:else if estado === 'cancelado'}
											<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
												<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
												Cancelado
											</span>
										{:else if estado === 'reembolsado'}
											<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
												Reembolsado
											</span>
										{/if}
									</td>

									<!-- Motivo / Disputa -->
									<td class="px-4 py-3.5 max-w-xs text-xs">
										{#if t.motivo_cancelacion}
											<span class="text-stone-300 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700 block truncate" title={t.motivo_cancelacion}>
												{t.motivo_cancelacion}
											</span>
										{:else}
											<span class="text-stone-600 italic">—</span>
										{/if}
									</td>

									<!-- Acciones -->
									<td class="px-4 py-3.5 text-right">
										<button
											on:click={() => abrirModalEstado(t)}
											class="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white px-3 py-1.5 rounded-xl border border-stone-700 text-xs font-semibold transition-all hover:border-stone-500 shadow-sm"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
												<path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31l123.31-123.31A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path>
											</svg>
											Gestionar
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de Cambio de Estado -->
{#if showModalEstado && ticketSeleccionado}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-stone-900 border border-stone-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-left">
			<div class="flex items-center justify-between pb-4 border-b border-stone-800">
				<div>
					<h3 class="text-xl font-bold text-white flex items-center gap-2">
						Gestionar Estado de Ticket
					</h3>
					<p class="text-xs text-stone-400 mt-0.5">
						Ticket #{ticketSeleccionado.idTicket} (Venta #{ticketSeleccionado.idVenta})
					</p>
				</div>
				<button
					on:click={cerrarModalEstado}
					class="text-stone-400 hover:text-white transition-colors"
				>
					✕
				</button>
			</div>

			<!-- Info del cliente -->
			<div class="bg-stone-950/80 rounded-xl p-3.5 border border-stone-800 my-4 text-xs space-y-1">
				<p class="text-stone-300">
					<span class="text-stone-500 font-semibold">Cliente:</span>
					{ticketSeleccionado.mVenta?.cliente_id?.nombre || ticketSeleccionado.mVenta?.nombre || 'Sin nombre'}
				</p>
				<p class="text-stone-300">
					<span class="text-stone-500 font-semibold">Correo:</span>
					{ticketSeleccionado.mVenta?.cliente_id?.correo || ticketSeleccionado.mVenta?.correo || 'Sin correo'}
				</p>
				<p class="text-stone-300">
					<span class="text-stone-500 font-semibold">Fase:</span>
					{ticketSeleccionado.cFaseEvento?.nombreFace || 'General'}
				</p>
			</div>

			<form on:submit|preventDefault={guardarCambioEstado} class="space-y-4">
				<!-- Selector de Estado -->
				<div>
					<label class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
						Nuevo Estado:
					</label>
					<div class="grid grid-cols-2 gap-2">
						<!-- Activo -->
						<label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all {nuevoEstado === 'activo'
							? 'bg-green-950/40 border-green-500 text-green-300'
							: 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'}">
							<input
								type="radio"
								name="estadoTicket"
								value="activo"
								bind:group={nuevoEstado}
								class="accent-green-500"
							/>
							<div>
								<p class="text-xs font-bold">Activo</p>
								<p class="text-[10px] text-stone-400">Permite ingreso</p>
							</div>
						</label>

						<!-- Suspendido -->
						<label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all {nuevoEstado === 'suspendido'
							? 'bg-amber-950/50 border-amber-500 text-amber-300'
							: 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'}">
							<input
								type="radio"
								name="estadoTicket"
								value="suspendido"
								bind:group={nuevoEstado}
								class="accent-amber-500"
							/>
							<div>
								<p class="text-xs font-bold">Suspendido</p>
								<p class="text-[10px] text-stone-400">Disputa / Aclaración</p>
							</div>
						</label>

						<!-- Cancelado -->
						<label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all {nuevoEstado === 'cancelado'
							? 'bg-red-950/40 border-red-500 text-red-300'
							: 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'}">
							<input
								type="radio"
								name="estadoTicket"
								value="cancelado"
								bind:group={nuevoEstado}
								class="accent-red-500"
							/>
							<div>
								<p class="text-xs font-bold">Cancelado</p>
								<p class="text-[10px] text-stone-400">Anulado permanente</p>
							</div>
						</label>

						<!-- Reembolsado -->
						<label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all {nuevoEstado === 'reembolsado'
							? 'bg-purple-950/40 border-purple-500 text-purple-300'
							: 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'}">
							<input
								type="radio"
								name="estadoTicket"
								value="reembolsado"
								bind:group={nuevoEstado}
								class="accent-purple-500"
							/>
							<div>
								<p class="text-xs font-bold">Reembolsado</p>
								<p class="text-[10px] text-stone-400">Dinero devuelto</p>
							</div>
						</label>
					</div>
				</div>

				<!-- Motivo -->
				<div>
					<label for="motivo" class="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1">
						Motivo / Observaciones:
						{#if nuevoEstado !== 'activo'}
							<span class="text-red-400">*</span>
						{/if}
					</label>
					<textarea
						id="motivo"
						bind:value={motivoCancelacion}
						rows="3"
						placeholder={nuevoEstado === 'suspendido'
							? 'Ej: Disputa bancaria Stripe (cliente desconoce cargo). En espera de respuesta.'
							: nuevoEstado === 'cancelado'
							? 'Ej: Disputa aceptada / Fraude confirmado.'
							: 'Notas u observaciones del cambio...'}
						class="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-green-500"
						required={nuevoEstado !== 'activo'}
					></textarea>
				</div>

				<!-- Opción de aplicar a todos los tickets de la venta -->
				{#if ticketSeleccionado.idVenta}
					<div class="bg-stone-800/40 rounded-xl p-3 border border-stone-700 flex items-start gap-3">
						<input
							type="checkbox"
							id="chk-venta"
							bind:checked={aplicarATodaLaVenta}
							class="mt-1 h-4 w-4 accent-green-500 rounded cursor-pointer"
						/>
						<label for="chk-venta" class="text-xs text-stone-300 cursor-pointer">
							<span class="font-bold text-white">Aplicar a todos los tickets de esta venta (#{ticketSeleccionado.idVenta})</span>
							<span class="block text-stone-400 mt-0.5">
								Recomendado si la disputa bancaria corresponde al total de la compra.
							</span>
						</label>
					</div>
				{/if}

				<!-- Botones -->
				<div class="flex items-center gap-3 pt-3 border-t border-stone-800">
					<button
						type="button"
						on:click={cerrarModalEstado}
						disabled={guardando}
						class="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2.5 rounded-xl text-sm font-semibold transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={guardando}
						class="flex-1 bg-green-500 hover:bg-green-400 text-black py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{#if guardando}
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
							Guardando...
						{:else}
							Guardar Cambios
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
