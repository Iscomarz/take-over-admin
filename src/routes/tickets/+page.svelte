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
	let filtroPago = 'todos'; // 'todos', 'stripe', 'efectivo', 'transferencia', 'terminal'

	// Modal de edición de estado
	let showModalEstado = false;
	let ticketSeleccionado = null;
	let nuevoEstado = 'activo';
	let motivoCancelacion = '';
	let aplicarATodaLaVenta = false;
	let guardando = false;

	// Modal de Reporte de Cierre y Liquidación
	let showModalReporte = false;

	onMount(async () => {
		toast.dismiss();
		const eventIdParam = $page.url.searchParams.get('eventId');
		const reportParam = $page.url.searchParams.get('report');

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
			if (reportParam === 'open') {
				showModalReporte = true;
			}
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
					cliente_id (cliente_id, nombre, correo),
					mPago (
						idpago,
						cantidad,
						idFormaPago,
						idTransaccionStripe,
						checkout_session,
						cFormaPago (
							idformapago,
							nombre
						)
					)
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

	// Helper: Identificar método de pago estandarizado
	function getMetodoPago(t) {
		const idForma = t?.mVenta?.mPago?.idFormaPago;
		const nombreRaw = t?.mVenta?.mPago?.cFormaPago?.nombre || '';
		const nombreLower = nombreRaw.toLowerCase();

		if (idForma === 3 || nombreLower.includes('stripe')) {
			return {
				id: 'stripe',
				nombre: 'Stripe',
				badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
				icon: '💳',
				transaccion: t?.mVenta?.mPago?.idTransaccionStripe || t?.mVenta?.mPago?.checkout_session || ''
			};
		}
		if (idForma === 1 || nombreLower.includes('efectivo')) {
			return {
				id: 'efectivo',
				nombre: 'Efectivo',
				badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
				icon: '💵',
				transaccion: ''
			};
		}
		if (idForma === 2 || nombreLower.includes('transferencia')) {
			return {
				id: 'transferencia',
				nombre: 'Transferencia',
				badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
				icon: '🏦',
				transaccion: t?.referencia || ''
			};
		}
		if (idForma === 4 || nombreLower.includes('tarjeta')) {
			return {
				id: 'terminal',
				nombre: 'Terminal / Tarjeta',
				badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
				icon: '📟',
				transaccion: ''
			};
		}

		return {
			id: 'otro',
			nombre: nombreRaw || 'No registrado',
			badgeClass: 'bg-stone-500/10 text-stone-400 border-stone-500/30',
			icon: '🏷️',
			transaccion: ''
		};
	}

	// Helper: Obtener precio unitario del ticket
	function getTicketPrecio(t) {
		if (t?.cFaseEvento?.precio != null) {
			const cleaned = String(t.cFaseEvento.precio).replace(/[^0-9.-]+/g, '');
			const n = parseFloat(cleaned);
			if (!isNaN(n)) return n;
		}
		if (t?.mVenta?.mPago?.cantidad != null) {
			const cleaned = String(t.mVenta.mPago.cantidad).replace(/[^0-9.-]+/g, '');
			const total = parseFloat(cleaned);
			const qty = parseInt(t?.mVenta?.cantidadTickets) || 1;
			if (!isNaN(total) && qty > 0) return Math.round(total / qty);
		}
		return 0;
	}

	// Helper: Formato de moneda MXN
	function formatearMoneda(monto) {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			maximumFractionDigits: 0
		}).format(monto || 0);
	}

	// Helper: Copiar texto al portapapeles
	function copiarAlPortapapeles(texto, label = 'Texto') {
		if (!texto) return;
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(texto);
			toast.success(`${label} copiado`);
		}
	}

	// Estadísticas generales de tickets
	$: totalTickets = tickets.length;
	$: totalActivos = tickets.filter((t) => (t.estado || 'activo') === 'activo').length;
	$: totalSuspendidos = tickets.filter((t) => t.estado === 'suspendido').length;
	$: totalCancelados = tickets.filter(
		(t) => t.estado === 'cancelado' || t.estado === 'reembolsado'
	).length;
	$: totalValidados = tickets.filter((t) => t.validado === true).length;

	// Desglose de Caja por Método de Pago
	$: desglosePagos = (() => {
		const mapa = {
			stripe: {
				id: 'stripe',
				nombre: 'Stripe (En línea)',
				icon: '💳',
				tickets: 0,
				activos: 0,
				validados: 0,
				cancelados: 0,
				montoNeto: 0,
				badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
			},
			efectivo: {
				id: 'efectivo',
				nombre: 'Efectivo (Taquilla)',
				icon: '💵',
				tickets: 0,
				activos: 0,
				validados: 0,
				cancelados: 0,
				montoNeto: 0,
				badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
			},
			transferencia: {
				id: 'transferencia',
				nombre: 'Transferencia bancaria',
				icon: '🏦',
				tickets: 0,
				activos: 0,
				validados: 0,
				cancelados: 0,
				montoNeto: 0,
				badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
			},
			terminal: {
				id: 'terminal',
				nombre: 'Terminal / Tarjeta',
				icon: '📟',
				tickets: 0,
				activos: 0,
				validados: 0,
				cancelados: 0,
				montoNeto: 0,
				badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
			},
			otro: {
				id: 'otro',
				nombre: 'Otro / Sin registrar',
				icon: '🏷️',
				tickets: 0,
				activos: 0,
				validados: 0,
				cancelados: 0,
				montoNeto: 0,
				badgeClass: 'bg-stone-500/10 text-stone-400 border-stone-500/30'
			}
		};

		let totalMontoNeto = 0;
		let totalMontoBruto = 0;

		tickets.forEach((t) => {
			const info = getMetodoPago(t);
			const precio = getTicketPrecio(t);
			const target = mapa[info.id] || mapa.otro;
			const esCancelado = t.estado === 'cancelado' || t.estado === 'reembolsado';

			target.tickets += 1;
			if (!esCancelado) {
				target.activos += 1;
				target.montoNeto += precio;
				totalMontoNeto += precio;
			} else {
				target.cancelados += 1;
			}

			if (t.validado) target.validados += 1;
			totalMontoBruto += precio;
		});

		const lista = Object.values(mapa).filter((m) => m.tickets > 0);
		return { lista, totalMontoNeto, totalMontoBruto };
	})();

	// Desglose por Fases para el reporte de cierre
	$: desgloseFases = (() => {
		const mapa = {};
		tickets.forEach((t) => {
			const nombreFase = t.cFaseEvento?.nombreFace || 'General';
			const precio = getTicketPrecio(t);
			const esCancelado = t.estado === 'cancelado' || t.estado === 'reembolsado';

			if (!mapa[nombreFase]) {
				mapa[nombreFase] = {
					nombre: nombreFase,
					precio,
					total: 0,
					activos: 0,
					validados: 0,
					cancelados: 0,
					montoNeto: 0
				};
			}

			mapa[nombreFase].total += 1;
			if (!esCancelado) {
				mapa[nombreFase].activos += 1;
				mapa[nombreFase].montoNeto += precio;
			} else {
				mapa[nombreFase].cancelados += 1;
			}

			if (t.validado) mapa[nombreFase].validados += 1;
		});
		return Object.values(mapa);
	})();

	// Filtrado reactivo combinado (Estado + Método de Pago + Búsqueda libre)
	$: ticketsFiltrados = tickets.filter((t) => {
		const estado = t.estado || 'activo';
		if (filtroEstado !== 'todos') {
			if (filtroEstado === 'cancelado') {
				if (estado !== 'cancelado' && estado !== 'reembolsado') return false;
			} else if (estado !== filtroEstado) {
				return false;
			}
		}

		if (filtroPago !== 'todos') {
			const info = getMetodoPago(t);
			if (info.id !== filtroPago) return false;
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
		const refStr = String(t.referencia || '').toLowerCase();
		const qrStr = String(t.codigoQR || '').toLowerCase();
		const ventaStr = String(t.idVenta || '');
		const metodoInfo = getMetodoPago(t);
		const metodoNombre = metodoInfo.nombre.toLowerCase();
		const transStr = (metodoInfo.transaccion || '').toLowerCase();

		return (
			clienteNombre.includes(term) ||
			clienteCorreo.includes(term) ||
			idStr.includes(term) ||
			refStr.includes(term) ||
			qrStr.includes(term) ||
			ventaStr.includes(term) ||
			metodoNombre.includes(term) ||
			transStr.includes(term)
		);
	});

	// Exportar reporte detallado a archivo CSV con UTF-8 BOM
	function exportarCSV() {
		if (!tickets || tickets.length === 0) {
			toast.error('No hay tickets para exportar');
			return;
		}

		const headers = [
			'ID Ticket',
			'Venta #',
			'Fecha Venta',
			'Cliente',
			'Correo',
			'Fase',
			'Precio Unitario ($ MXN)',
			'Metodo de Pago',
			'ID Transaccion / Referencia Stripe',
			'Referencia Ticket',
			'Estado',
			'Ingreso al Evento',
			'Fecha Ingreso',
			'Motivo Cancelacion / Disputa'
		];

		const rows = tickets.map((t) => {
			const metodo = getMetodoPago(t);
			const precio = getTicketPrecio(t);
			const clienteNombre = t.mVenta?.cliente_id?.nombre || t.mVenta?.nombre || 'Sin nombre';
			const clienteCorreo = t.mVenta?.cliente_id?.correo || t.mVenta?.correo || '';
			const fechaVenta = t.mVenta?.fechaVenta ? new Date(t.mVenta.fechaVenta).toLocaleString('es-MX') : '';
			const fechaIngreso = t.fechaValidacion ? new Date(t.fechaValidacion).toLocaleString('es-MX') : '';
			const estado = t.estado || 'activo';
			const transaccion = metodo.transaccion || t.referencia || '';

			return [
				t.idTicket,
				t.idVenta || '',
				fechaVenta,
				`"${clienteNombre.replace(/"/g, '""')}"`,
				`"${clienteCorreo.replace(/"/g, '""')}"`,
				`"${(t.cFaseEvento?.nombreFace || 'General').replace(/"/g, '""')}"`,
				precio,
				`"${metodo.nombre.replace(/"/g, '""')}"`,
				`"${transaccion.replace(/"/g, '""')}"`,
				`"${(t.referencia || '').replace(/"/g, '""')}"`,
				estado,
				t.validado ? 'SI' : 'NO',
				fechaIngreso,
				`"${(t.motivo_cancelacion || '').replace(/"/g, '""')}"`
			].join(',');
		});

		// Añadir BOM (\uFEFF) para compatibilidad inmediata con Microsoft Excel
		const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const nombreLimpio = (selectedEvento?.nombreEvento || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_');
		const fechaHoy = new Date().toISOString().split('T')[0];

		link.setAttribute('href', url);
		link.setAttribute('download', `Reporte_Tickets_${nombreLimpio}_${fechaHoy}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toast.success('Reporte exportado correctamente a CSV');
	}

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
		<!-- Header Principal -->
		<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800 pb-6">
			<div>
				<button
					on:click={volverAtras}
					class="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm mb-2"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
						<path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
					</svg>
					Volver al Evento
				</button>
				<h1 class="text-3xl font-black text-white flex items-center gap-3">
					Tickets y Arqueo de Ventas
				</h1>
				<p class="text-stone-400 text-sm mt-1">
					Control de tickets vendidos, desglose contable por método de pago y gestión de estados.
				</p>
			</div>

			<!-- Acciones y Selector de Evento -->
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
				<!-- Botones de Reporte y Exportación -->
				<button
					on:click={() => (showModalReporte = true)}
					class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]"
					title="Ver reporte ejecutivo de cierre de caja"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
						<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216v32H40ZM216,200H40V104H216v96Zm-88-80a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0V128A8,8,0,0,1,128,120Zm-40,16a8,8,0,0,1,8,8v32a8,8,0,0,1-16,0V144A8,8,0,0,1,88,136Zm80-8a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V136A8,8,0,0,1,168,128Z"></path>
					</svg>
					Reporte de Cierre
				</button>

				<button
					on:click={exportarCSV}
					class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700 text-sm font-semibold transition-colors"
					title="Descargar todos los tickets en archivo CSV para Excel"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
						<path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z"></path>
					</svg>
					Exportar CSV
				</button>

				<!-- Selector de Evento -->
				<div class="w-full sm:w-64">
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
		</div>

		<!-- 1. Tarjetas de métricas de Estado -->
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
				<p class="text-[11px] text-stone-500 mt-1">{totalValidados} ya ingresados ({totalTickets > 0 ? Math.round((totalValidados / totalTickets) * 100) : 0}%)</p>
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

		<!-- 2. Arqueo y Desglose por Método de Pago -->
		<section class="bg-stone-900/80 border border-stone-800 rounded-2xl p-5">
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
				<div>
					<h2 class="text-base font-bold text-white flex items-center gap-2">
						<span>💰</span> Desglose de Caja por Método de Pago
					</h2>
					<p class="text-xs text-stone-400">
						Haz clic en cualquier método para filtrar los tickets correspondientes
					</p>
				</div>

				<div class="text-right">
					<span class="text-xs text-stone-400 uppercase tracking-wider block">Recaudación Neta Total</span>
					<span class="text-2xl font-black text-emerald-400">
						{formatearMoneda(desglosePagos.totalMontoNeto)}
					</span>
				</div>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				{#each desglosePagos.lista as metodo}
					{@const seleccionado = filtroPago === metodo.id}
					<button
						type="button"
						on:click={() => (filtroPago = seleccionado ? 'todos' : metodo.id)}
						class="p-3.5 rounded-xl border text-left transition-all relative {seleccionado
							? 'bg-stone-800 border-green-500 shadow-lg ring-1 ring-green-500/50'
							: 'bg-stone-950/70 border-stone-800 hover:border-stone-700'}"
					>
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-lg">{metodo.icon}</span>
							<span class="text-[11px] font-bold px-2 py-0.5 rounded-full {metodo.badgeClass}">
								{metodo.tickets} tix
							</span>
						</div>
						<p class="text-xs font-semibold text-white truncate">{metodo.nombre}</p>
						<p class="text-sm font-bold text-emerald-400 mt-1">
							{formatearMoneda(metodo.montoNeto)}
						</p>
						<p class="text-[10px] text-stone-500 mt-0.5">
							{metodo.validados} ingresados
							{#if metodo.cancelados > 0}
								<span class="text-red-400">· {metodo.cancelados} canc.</span>
							{/if}
						</p>
					</button>
				{/each}
			</div>
		</section>

		<!-- 3. Barra de Búsqueda y Filtros Rápidos -->
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
					placeholder="Buscar por cliente, correo, #ticket, Stripe ID, ref o método..."
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

			<!-- Filtro por Método de Pago -->
			<div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
				<span class="text-xs text-stone-500 font-semibold uppercase hidden lg:inline">Pago:</span>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 {filtroPago === 'todos'
						? 'bg-stone-700 text-white'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroPago = 'todos')}
				>
					Todos
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 {filtroPago === 'stripe'
						? 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroPago = 'stripe')}
				>
					💳 Stripe
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 {filtroPago === 'efectivo'
						? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroPago = 'efectivo')}
				>
					💵 Efectivo
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 {filtroPago === 'transferencia'
						? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroPago = 'transferencia')}
				>
					🏦 Transf.
				</button>
				<button
					class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 {filtroPago === 'terminal'
						? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
						: 'bg-stone-950 text-stone-400 hover:text-white'}"
					on:click={() => (filtroPago = 'terminal')}
				>
					📟 Terminal
				</button>
			</div>
		</div>

		<!-- 4. Tabla Detallada de Tickets -->
		{#if loading}
			<div class="p-12 text-center text-stone-400 bg-stone-900/40 rounded-2xl border border-stone-800">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-600 border-t-green-500 mb-3"></div>
				<p>Cargando tickets y registros de pago...</p>
			</div>
		{:else if ticketsFiltrados.length === 0}
			<div class="p-12 text-center text-stone-400 bg-stone-900/40 rounded-2xl border border-stone-800">
				<p class="text-lg font-medium text-stone-300">No se encontraron tickets</p>
				<p class="text-sm text-stone-500 mt-1">Prueba cambiando los filtros o el término de búsqueda.</p>
				{#if filtroPago !== 'todos' || filtroEstado !== 'todos' || searchTerm}
					<button
						on:click={() => {
							filtroPago = 'todos';
							filtroEstado = 'todos';
							searchTerm = '';
						}}
						class="mt-3 text-xs text-green-400 hover:underline font-semibold"
					>
						Limpiar todos los filtros
					</button>
				{/if}
			</div>
		{:else}
			<div class="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-stone-800/80 text-stone-400 text-xs uppercase tracking-wider font-semibold border-b border-stone-800">
							<tr>
								<th class="px-4 py-3.5"># Ticket</th>
								<th class="px-4 py-3.5">Cliente</th>
								<th class="px-4 py-3.5">Fase y Precio</th>
								<th class="px-4 py-3.5">Método de Pago</th>
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
								{@const metodo = getMetodoPago(t)}
								{@const precio = getTicketPrecio(t)}
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

									<!-- Fase y Precio -->
									<td class="px-4 py-3.5 text-stone-300">
										<p class="font-medium text-white">{t.cFaseEvento?.nombreFace || 'General'}</p>
										<p class="text-xs font-bold text-emerald-400">
											{formatearMoneda(precio)}
										</p>
									</td>

									<!-- Método de Pago -->
									<td class="px-4 py-3.5">
										<div class="space-y-1">
											<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border {metodo.badgeClass}">
												{metodo.icon} {metodo.nombre}
											</span>
											{#if metodo.transaccion}
												<div class="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
													<span class="truncate max-w-[130px]" title={metodo.transaccion}>
														{metodo.transaccion}
													</span>
													<button
														type="button"
														on:click={() => copiarAlPortapapeles(metodo.transaccion, 'ID')}
														class="text-stone-500 hover:text-stone-300 p-0.5"
														title="Copiar ID de transacción"
													>
														<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
															<path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
														</svg>
													</button>
												</div>
											{/if}
										</div>
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

<!-- Modal de Reporte Final de Cierre y Liquidación -->
{#if showModalReporte}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-stone-900 border border-stone-700 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl relative text-left max-h-[92vh] overflow-y-auto">
			<!-- Encabezado de Reporte -->
			<div class="flex items-start justify-between pb-4 border-b border-stone-800 gap-4">
				<div>
					<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-950/60 text-green-400 border border-green-700/50 mb-1.5">
						✓ Auditoría y Cierre Oficial
					</span>
					<h3 class="text-2xl font-black text-white">
						Reporte de Liquidación de Evento
					</h3>
					<p class="text-sm text-stone-300 font-medium mt-0.5">
						{selectedEvento?.nombreEvento || 'Evento'}
					</p>
					<p class="text-xs text-stone-500 mt-0.5">
						Generado el {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
					</p>
				</div>
				<button
					on:click={() => (showModalReporte = false)}
					class="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
					title="Cerrar modal"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
						<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,66.34,200.97a8,8,0,0,1-11.32-11.32L116.69,128,55.03,66.34A8,8,0,0,1,66.34,55.03L128,116.69l61.66-61.66a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
					</svg>
				</button>
			</div>

			<!-- KPIs Resumen del Cierre -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
				<div class="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
					<p class="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Total Emitidos</p>
					<p class="text-2xl font-black text-white mt-1">{totalTickets}</p>
					<p class="text-[10px] text-stone-500 mt-0.5">{totalActivos} válidos activos</p>
				</div>
				<div class="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
					<p class="text-[11px] uppercase tracking-wider text-green-400 font-semibold">Ingresados (Puerta)</p>
					<p class="text-2xl font-black text-green-400 mt-1">{totalValidados}</p>
					<p class="text-[10px] text-stone-500 mt-0.5">
						{totalTickets > 0 ? Math.round((totalValidados / totalTickets) * 100) : 0}% asistencia
					</p>
				</div>
				<div class="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
					<p class="text-[11px] uppercase tracking-wider text-red-400 font-semibold">Cancelados / Disp.</p>
					<p class="text-2xl font-black text-red-400 mt-1">{totalCancelados}</p>
					<p class="text-[10px] text-stone-500 mt-0.5">Anulados o disputa</p>
				</div>
				<div class="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
					<p class="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Recaudación Neta</p>
					<p class="text-xl font-black text-emerald-400 mt-1">
						{formatearMoneda(desglosePagos.totalMontoNeto)}
					</p>
					<p class="text-[10px] text-stone-500 mt-0.5">De boletos activos</p>
				</div>
			</div>

			<!-- Desglose Contable por Método de Pago -->
			<div class="space-y-3 mb-6">
				<h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
					<span>💳</span> Cuadre por Método de Pago
				</h4>
				<div class="border border-stone-800 rounded-xl overflow-hidden">
					<table class="w-full text-left text-xs">
						<thead class="bg-stone-800 text-stone-400 uppercase font-semibold">
							<tr>
								<th class="py-2.5 px-3">Método de Pago</th>
								<th class="py-2.5 px-3 text-center">Tickets</th>
								<th class="py-2.5 px-3 text-center">Ingresados</th>
								<th class="py-2.5 px-3 text-center">Cancelados</th>
								<th class="py-2.5 px-3 text-right">Recaudación Neta</th>
								<th class="py-2.5 px-3 text-right">% Recaudado</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-800 bg-stone-950/60">
							{#each desglosePagos.lista as m}
								{@const pct = desglosePagos.totalMontoNeto > 0 ? Math.round((m.montoNeto / desglosePagos.totalMontoNeto) * 100) : 0}
								<tr class="hover:bg-stone-800/40">
									<td class="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
										<span>{m.icon}</span>
										<span>{m.nombre}</span>
									</td>
									<td class="py-2.5 px-3 text-center text-stone-200 font-bold">{m.tickets}</td>
									<td class="py-2.5 px-3 text-center text-green-400">{m.validados}</td>
									<td class="py-2.5 px-3 text-center text-stone-400">{m.cancelados}</td>
									<td class="py-2.5 px-3 text-right font-bold text-emerald-400">
										{formatearMoneda(m.montoNeto)}
									</td>
									<td class="py-2.5 px-3 text-right text-stone-400 font-mono">{pct}%</td>
								</tr>
							{/each}
						</tbody>
						<tfoot class="bg-stone-800/90 font-bold text-white border-t border-stone-700">
							<tr>
								<td class="py-2.5 px-3">TOTAL CONSOLIDADO</td>
								<td class="py-2.5 px-3 text-center">{totalTickets}</td>
								<td class="py-2.5 px-3 text-center text-green-400">{totalValidados}</td>
								<td class="py-2.5 px-3 text-center text-red-400">{totalCancelados}</td>
								<td class="py-2.5 px-3 text-right text-emerald-400">
									{formatearMoneda(desglosePagos.totalMontoNeto)}
								</td>
								<td class="py-2.5 px-3 text-right">100%</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			<!-- Desglose por Fases de Venta -->
			<div class="space-y-3 mb-6">
				<h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
					<span>🏷️</span> Cuadre por Fases de Venta
				</h4>
				<div class="border border-stone-800 rounded-xl overflow-hidden">
					<table class="w-full text-left text-xs">
						<thead class="bg-stone-800 text-stone-400 uppercase font-semibold">
							<tr>
								<th class="py-2.5 px-3">Fase</th>
								<th class="py-2.5 px-3 text-right">Precio Unit.</th>
								<th class="py-2.5 px-3 text-center">Boletos Vendidos</th>
								<th class="py-2.5 px-3 text-center">Ingresaron</th>
								<th class="py-2.5 px-3 text-right">Recaudación Neta</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-800 bg-stone-950/60">
							{#each desgloseFases as f}
								<tr class="hover:bg-stone-800/40">
									<td class="py-2.5 px-3 font-semibold text-white">{f.nombre}</td>
									<td class="py-2.5 px-3 text-right text-stone-300">{formatearMoneda(f.precio)}</td>
									<td class="py-2.5 px-3 text-center font-bold text-white">{f.total}</td>
									<td class="py-2.5 px-3 text-center text-green-400">{f.validados}</td>
									<td class="py-2.5 px-3 text-right font-bold text-emerald-400">
										{formatearMoneda(f.montoNeto)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Acciones del Modal -->
			<div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800">
				<button
					type="button"
					on:click={() => window.print()}
					class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-stone-700"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
						<path d="M216,48H184V24a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8V48H40A16,16,0,0,0,24,64V168a16,16,0,0,0,16,16H72v48a8,8,0,0,0,8,8H176a8,8,0,0,0,8-8V184h32a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM96,32h64V48H96ZM160,224H96V168h64ZM216,168H184v-8a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v8H40V64H216V168Zm-32-80a12,12,0,1,1,12-12A12,12,0,0,1,184,88Z"></path>
					</svg>
					Imprimir / Guardar en PDF
				</button>

				<div class="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						on:click={exportarCSV}
						class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-stone-700"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
							<path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z"></path>
						</svg>
						Descargar CSV
					</button>

					<button
						type="button"
						on:click={() => (showModalReporte = false)}
						class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold transition-colors"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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
