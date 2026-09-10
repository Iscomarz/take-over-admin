<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import {
		obtenerEventosParaSelector,
		obtenerMetricasAnalytics
	} from '../../services/analytics-service';

	let eventos = [];
	let selectedEventoId = 'todos';
	let cargando = true;
	let metricas = null;

	onMount(async () => {
		try {
			cargando = true;
			eventos = await obtenerEventosParaSelector();

			// Si viene por query param ?eventId=...
			const urlEventId = $page.url.searchParams.get('eventId');
			if (urlEventId && eventos.some((e) => String(e.idevento) === urlEventId)) {
				selectedEventoId = urlEventId;
			}

			await cargarMetricas();
		} catch (error) {
			console.error('Error al inicializar analítica:', error);
			toast.error('Error al cargar datos analíticos');
		} finally {
			cargando = false;
		}
	});

	async function cambiarEvento() {
		// Actualizar URL sin recargar
		const url = new URL(window.location.href);
		if (selectedEventoId === 'todos') {
			url.searchParams.delete('eventId');
		} else {
			url.searchParams.set('eventId', selectedEventoId);
		}
		window.history.replaceState({}, '', url);

		await cargarMetricas();
	}

	async function cargarMetricas() {
		try {
			cargando = true;
			metricas = await obtenerMetricasAnalytics(selectedEventoId);
		} catch (err) {
			console.error(err);
			toast.error('Error al calcular métricas');
		} finally {
			cargando = false;
		}
	}

	function imprimirReporte() {
		window.print();
	}

	function formatearMoneda(monto) {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			maximumFractionDigits: 0
		}).format(monto || 0);
	}
</script>

<Toaster />

<svelte:head>
	<title>Analítica y Estrategia de Fases | Take Over Admin</title>
</svelte:head>

<div class="min-h-screen bg-stone-950 text-stone-100 pb-20 pt-6 print:bg-white print:text-black print:p-0 print:pb-0">
	<div class="max-w-7xl mx-auto px-4 md:px-8">
		
		<!-- Barra superior / Header -->
		<header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-stone-800 pb-6 print:border-b-2 print:border-black print:mb-4">
			<div>
				<div class="flex items-center gap-3">
					<button
						on:click={() => goto('/home')}
						class="print:hidden text-stone-400 hover:text-white p-2 rounded-lg bg-stone-900 border border-stone-800 transition-colors"
						title="Volver al panel"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
					</button>
					<div>
						<h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white print:text-black flex items-center gap-2">
							<span>📊</span> Métricas y Estrategia de Fases
						</h1>
						<p class="text-xs md:text-sm text-stone-400 print:text-stone-600 mt-0.5">
							Inteligencia de ventas, velocidad de demanda y optimización de precios para tickets
						</p>
					</div>
				</div>
			</div>

			<!-- Acciones y Filtro -->
			<div class="flex flex-wrap items-center gap-3 print:hidden">
				<div class="relative min-w-[240px]">
					<select
						bind:value={selectedEventoId}
						on:change={cambiarEvento}
						disabled={cargando}
						class="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-stone-500 focus:border-transparent outline-none cursor-pointer appearance-none pr-10"
					>
						<option value="todos">🌐 Todos los eventos (Consolidado)</option>
						{#each eventos as ev}
							<option value={ev.idevento}>
								{ev.nombreEvento} ({ev.fechaInicio ? new Date(ev.fechaInicio).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : 'Sin fecha'})
							</option>
						{/each}
					</select>
					<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</div>

				<button
					on:click={imprimirReporte}
					class="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-stone-700 flex items-center gap-2 transition-colors shadow-sm"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
					</svg>
					Exportar / Imprimir PDF
				</button>
			</div>
		</header>

		<!-- Encabezado exclusivo de Impresión -->
		<div class="hidden print:block mb-6">
			<h2 class="text-xl font-bold">Reporte Ejecutivo de Demanda y Fases</h2>
			<p class="text-sm text-stone-600">
				Alcance: {metricas?.esGlobal ? 'Consolidado de todos los eventos' : metricas?.eventoActual?.nombreEvento} | Fecha de generación: {new Date().toLocaleDateString('es-MX')}
			</p>
		</div>

		{#if cargando}
			<div class="py-24 text-center">
				<div class="inline-block animate-spin w-10 h-10 border-4 border-stone-600 border-t-stone-200 rounded-full mb-4"></div>
				<p class="text-stone-400 font-medium">Analizando comportamiento de ventas y fases...</p>
			</div>
		{:else if !metricas}
			<div class="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center my-8">
				<p class="text-stone-300 text-lg">No se encontraron datos de ventas para este evento.</p>
			</div>
		{:else}
			
			<!-- 1. TARJETAS DE KPIS PRINCIPALES -->
			<section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				<!-- Boletos Vendidos -->
				<div class="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 print:border-stone-300 print:bg-stone-50">
					<span class="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">Boletos Vendidos</span>
					<div class="flex items-baseline justify-between">
						<span class="text-3xl font-black text-white print:text-black">{metricas.resumen.totalTickets}</span>
						<span class="text-xs text-stone-400 print:text-stone-600">{metricas.resumen.totalTransacciones} órdenes</span>
					</div>
					<p class="text-[11px] text-stone-500 mt-2">Tickets emitidos con registro</p>
				</div>

				<!-- Recaudación Total -->
				<div class="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 print:border-stone-300 print:bg-stone-50">
					<span class="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Ingresos Totales</span>
					<div class="flex items-baseline justify-between">
						<span class="text-2xl md:text-3xl font-black text-emerald-300 print:text-emerald-700">
							{formatearMoneda(metricas.resumen.totalIngresos)}
						</span>
					</div>
					<p class="text-[11px] text-stone-500 mt-2">Ventas directas + taquilla</p>
				</div>

				<!-- Yield / Ticket Promedio -->
				<div class="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 print:border-stone-300 print:bg-stone-50">
					<span class="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-1">Precio Promedio (Yield)</span>
					<div class="flex items-baseline justify-between">
						<span class="text-3xl font-black text-cyan-200 print:text-cyan-800">
							{formatearMoneda(metricas.resumen.ticketPromedioPrecio)}
						</span>
					</div>
					<p class="text-[11px] text-stone-500 mt-2">Ingreso promedio por boleto</p>
				</div>

				<!-- Comportamiento Grupal -->
				<div class="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 print:border-stone-300 print:bg-stone-50">
					<span class="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">Boletos por Orden</span>
					<div class="flex items-baseline justify-between">
						<span class="text-3xl font-black text-amber-200 print:text-amber-800">
							{metricas.resumen.boletosPorTransaccion}
						</span>
						<span class="text-xs text-stone-400 print:text-stone-600">tix / compra</span>
					</div>
					<p class="text-[11px] text-stone-500 mt-2">
						{metricas.resumen.boletosPorTransaccion >= 2 ? '👥 Tendencia a compra en grupo' : '👤 Compras predominantemente individuales'}
					</p>
				</div>
			</section>

			<!-- 2. ANÁLISIS DETALLADO DE FASES (CORAZÓN DE LA ESTRATEGIA DE PRECIOS) -->
			<section class="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 mb-8 print:border-stone-300 print:bg-white print:p-2">
				<div class="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
					<div>
						<h2 class="text-lg font-bold text-white print:text-black flex items-center gap-2">
							<span>🏷️</span> Rendimiento por Fase y Elasticidad de Precio
						</h2>
						<p class="text-xs text-stone-400 print:text-stone-600">
							Comparativa de cupos, volumen alcanzado, velocidad de agotamiento y diagnóstico
						</p>
					</div>
				</div>

				{#if metricas.fases.length === 0}
					<p class="text-stone-500 py-4 text-center">No hay fases configuradas para este alcance.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead>
								<tr class="border-b border-stone-800 print:border-stone-400 text-stone-400 print:text-stone-700 text-xs uppercase tracking-wider">
									<th class="py-3 px-3">Fase</th>
									<th class="py-3 px-3 text-right">Precio Unit.</th>
									<th class="py-3 px-3 text-center">Cupo / Vendidos</th>
									<th class="py-3 px-3 text-center">% Cupo</th>
									<th class="py-3 px-3 text-right">Recaudación</th>
									<th class="py-3 px-3 text-center">Velocidad</th>
									<th class="py-3 px-3">Diagnóstico Estratégico</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-stone-800/60 print:divide-stone-200">
								{#each metricas.fases as fase}
									<tr class="hover:bg-stone-800/30 print:hover:bg-transparent transition-colors">
										<td class="py-3.5 px-3 font-semibold text-white print:text-black">
											{fase.nombre}
											{#if fase.fechaExpira}
												<span class="block text-[10px] text-stone-400 print:text-stone-600 font-normal">
													Expira: {new Date(fase.fechaExpira).toLocaleDateString('es-MX')}
												</span>
											{/if}
										</td>
										<td class="py-3.5 px-3 text-right font-medium text-stone-200 print:text-black">
											{formatearMoneda(fase.precio)}
										</td>
										<td class="py-3.5 px-3 text-center text-stone-300 print:text-black">
											<span class="font-bold text-white print:text-black">{fase.boletosVendidos}</span>
											<span class="text-stone-500"> / {fase.limite || '∞'}</span>
										</td>
										<td class="py-3.5 px-3 text-center">
											{#if fase.porcentajeCupo !== null}
												<div class="flex items-center gap-2 max-w-[120px] mx-auto">
													<div class="w-full bg-stone-800 print:bg-stone-200 h-2 rounded-full overflow-hidden">
														<div
															class="h-full rounded-full transition-all {fase.porcentajeCupo >= 95 ? 'bg-emerald-500' : fase.porcentajeCupo >= 50 ? 'bg-amber-500' : 'bg-stone-500'}"
															style="width: {fase.porcentajeCupo}%"
														></div>
													</div>
													<span class="text-xs font-semibold shrink-0">{fase.porcentajeCupo}%</span>
												</div>
											{:else}
												<span class="text-xs text-stone-500">Ilimitado</span>
											{/if}
										</td>
										<td class="py-3.5 px-3 text-right font-bold text-emerald-400 print:text-emerald-800">
											{formatearMoneda(fase.ingresos)}
										</td>
										<td class="py-3.5 px-3 text-center text-xs">
											{#if fase.boletosPorDia}
												<span class="font-medium text-stone-300 print:text-black">{fase.boletosPorDia} tix/día</span>
												<span class="block text-[10px] text-stone-500">en ~{Math.round(fase.duracionHoras / 24) || 1}d</span>
											{:else}
												<span class="text-stone-500">-</span>
											{/if}
										</td>
										<td class="py-3.5 px-3">
											<span
												class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border {fase.tipoDiagnostico === 'subir_precio'
													? 'bg-amber-950/40 text-amber-300 border-amber-800/50 print:bg-amber-100 print:text-amber-900'
													: fase.tipoDiagnostico === 'exito'
													? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 print:bg-emerald-100 print:text-emerald-900'
													: fase.tipoDiagnostico === 'ajustar_ventana'
													? 'bg-orange-950/40 text-orange-300 border-orange-800/50 print:bg-orange-100 print:text-orange-900'
													: 'bg-stone-800/50 text-stone-400 border-stone-700 print:bg-stone-100 print:text-stone-800'}"
											>
												{fase.diagnostico}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<!-- 3. CURVA TEMPORAL DE ANTICIPACIÓN (LEAD TIME T-MINUS) -->
			<section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<!-- Curva de Días de Anticipación -->
				<div class="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 print:border-stone-300 print:bg-white">
					<h3 class="text-base font-bold text-white print:text-black flex items-center gap-2 mb-1">
						<span>⏳</span> Curva de Anticipación (Lead Time)
					</h3>
					<p class="text-xs text-stone-400 print:text-stone-600 mb-6">
						¿Cuántos días antes del evento compra tu público?
					</p>

					<div class="space-y-4">
						{#each [
							{ label: '> 30 días antes', valor: metricas.anticipacion.datos.masDe30, color: 'bg-indigo-500' },
							{ label: '15 a 30 días antes', valor: metricas.anticipacion.datos.de15a30, color: 'bg-blue-500' },
							{ label: '7 a 14 días antes', valor: metricas.anticipacion.datos.de7a14, color: 'bg-cyan-500' },
							{ label: '3 a 7 días antes', valor: metricas.anticipacion.datos.de3a7, color: 'bg-amber-500' },
							{ label: 'Últimas 48 horas', valor: metricas.anticipacion.datos.ultimas48h, color: 'bg-orange-500' },
							{ label: 'Mismo día del evento', valor: metricas.anticipacion.datos.mismoDia, color: 'bg-rose-500' }
						] as item}
							{@const pct = metricas.resumen.totalTickets > 0 ? Math.round((item.valor / metricas.resumen.totalTickets) * 100) : 0}
							<div>
								<div class="flex justify-between text-xs mb-1 font-medium">
									<span class="text-stone-300 print:text-black">{item.label}</span>
									<span class="text-stone-400 print:text-stone-600">{item.valor} boletos ({pct}%)</span>
								</div>
								<div class="w-full bg-stone-800 print:bg-stone-200 h-2.5 rounded-full overflow-hidden">
									<div class="h-full rounded-full {item.color} transition-all duration-500" style="width: {pct}%"></div>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-6 p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 print:bg-stone-50 print:border-stone-300">
						<p class="text-xs text-stone-300 print:text-black font-medium">
							🎯 <strong>FOMO Index:</strong> El <strong>{metricas.anticipacion.pctUltimaSemana}%</strong> de tus boletos se compran durante la semana del evento.
						</p>
					</div>
				</div>

				<!-- Patrón de Días de la Semana y Horarios -->
				<div class="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 print:border-stone-300 print:bg-white flex flex-col justify-between">
					<div>
						<h3 class="text-base font-bold text-white print:text-black flex items-center gap-2 mb-1">
							<span>📅</span> Patrón Semanal y Rango Horario
						</h3>
						<p class="text-xs text-stone-400 print:text-stone-600 mb-6">
							Días y horarios con mayor conversión de compra
						</p>

						<!-- Días de la semana -->
						<div class="mb-6">
							<span class="text-xs font-semibold text-stone-400 block mb-2">Ventas por Día de la Semana</span>
							<div class="grid grid-cols-7 gap-2 text-center">
								{#each metricas.patrones.diasSemana as item}
									<div class="bg-stone-950/60 border border-stone-800 print:border-stone-300 print:bg-stone-50 rounded-xl p-2 flex flex-col items-center justify-end h-24">
										<div
											class="w-full bg-stone-600 rounded-t transition-all"
											style="height: {Math.max(item.porcentaje * 1.5, 4)}px; max-height: 50px;"
										></div>
										<span class="text-[10px] text-stone-400 print:text-black mt-1 font-bold">{item.dia}</span>
										<span class="text-[9px] text-stone-500">{item.boletos}</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Horarios -->
						<div>
							<span class="text-xs font-semibold text-stone-400 block mb-2">Distribución por Bloque Horario</span>
							<div class="grid grid-cols-2 gap-3">
								{#each metricas.patrones.horarios as h}
									<div class="bg-stone-950/50 border border-stone-800/80 print:border-stone-300 print:bg-stone-50 p-2.5 rounded-xl">
										<div class="flex justify-between text-xs mb-1">
											<span class="text-stone-300 print:text-black">{h.rango}</span>
											<span class="font-bold text-white print:text-black">{h.porcentaje}%</span>
										</div>
										<div class="w-full bg-stone-800 print:bg-stone-200 h-1.5 rounded-full overflow-hidden">
											<div class="h-full bg-emerald-500 rounded-full" style="width: {h.porcentaje}%"></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- 4. RECOMENDACIONES ESTRATÉGICAS ACCIONABLES -->
			<section class="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800/90 border border-stone-700/70 rounded-2xl p-6 print:border-stone-400 print:bg-white">
				<h3 class="text-lg font-bold text-white print:text-black flex items-center gap-2 mb-2">
					<span>💡</span> Recomendaciones Estratégicas para tus Próximos Eventos
				</h3>
				<p class="text-xs text-stone-400 print:text-stone-600 mb-5">
					Conclusiones de datos para optimizar precio, cantidad de boletos y fechas límite de fases
				</p>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each metricas.recomendaciones as rec}
						<div class="bg-stone-950/70 border border-stone-800 print:border-stone-300 print:bg-stone-50 p-4 rounded-xl flex flex-col justify-between">
							<div>
								<h4 class="text-sm font-bold text-amber-300 print:text-amber-900 mb-2">
									{rec.titulo}
								</h4>
								<p class="text-xs text-stone-300 print:text-stone-700 leading-relaxed">
									{rec.detalle}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</section>

		{/if}
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background-color: white !important;
			color: black !important;
		}
		:global(.menu),
		:global(nav),
		:global(aside),
		:global(header button),
		:global(.Toaster) {
			display: none !important;
		}
	}
</style>
