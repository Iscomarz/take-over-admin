<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import { obtenerVentasDelDia, obtenerVentasPorEventoActivo } from '../../services/ventas-service';

	let usuario = null;
	let email = '';
	let loading = true;
	let ventasHoy = { totalVentas: 0, montoTotal: 0 };
	let ventasEventoActivo = { totalTickets: 0, totalMonto: 0, fases: [] };

	onMount(async () => {
		// verificar la sesion real en supabase
		const { data, error } = await supabase.auth.getSession();
		if (error) {
			console.error('Error al obtener sesión:', error);
			goto('/', { replaceState: true });
			return;
		}
		if (!data?.session) {
			toast.info('Sesión no encontrada. Redirigiendo al login...');
			goto('/', { replaceState: true });
			return;
		}
		usuario = data.session.user;
		email = usuario?.email ?? '';

		// Obtener ventas del día y evento activo
		try {
			ventasHoy = await obtenerVentasDelDia();
			ventasEventoActivo = await obtenerVentasPorEventoActivo();
		} catch (error) {
			console.error('Error al obtener datos:', error);
			toast.error('Error al cargar datos del dashboard');
		} finally {
			loading = false;
		}
	});

	function formatMoney(value) {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(value || 0);
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white p-6 pb-20">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold mb-2">Dashboard</h1>
			<p class="text-stone-400 text-sm">Bienvenido, {email}</p>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Cargando datos...</p>
				</div>
			</div>
		{:else}
			<!-- Cards Grid -->
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
				<div class="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
					<div class="flex items-center gap-3 mb-4">
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

					{#if ventasEventoActivo.totalTickets > 0}
						<!-- Totales -->
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

						<!-- Desglose por Fases -->
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
													style="width: {(fase.cantidad /
														ventasEventoActivo.totalTickets) *
														100}%"
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
		{/if}
	</div>
</div>
