<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';
	import { 
		obtenerCampanias, 
		obtenerDetalleCampania, 
		eliminarCampania,
		enviarCampania
	} from '../../services/campania-service';

	let token = '';
	let campanias = [];
	let cargando = false;
	let campaniaSeleccionada = null;
	let mostrarModal = false;
	let htmlPreview = '';
	let enviandoCampania = false;

	const estadosColores = {
		borrador: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
		enviada: 'bg-green-500/20 text-green-300 border-green-500/50',
		programada: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
		error: 'bg-red-500/20 text-red-300 border-red-500/50'
	};

	const estadosTexto = {
		borrador: 'Borrador',
		enviada: 'Enviada',
		programada: 'Programada',
		error: 'Error'
	};

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
		await cargarCampanias();
	});

	async function cargarCampanias() {
		cargando = true;
		const loadingToast = toast.loading('Cargando campañas...');

		campanias = await obtenerCampanias();

		toast.dismiss(loadingToast);
		if (campanias.length > 0) {
			toast.success(`${campanias.length} campaña${campanias.length !== 1 ? 's' : ''} cargada${campanias.length !== 1 ? 's' : ''}`);
		}
		cargando = false;
	}

	async function verDetalle(campaniaId) {
		const loadingToast = toast.loading('Cargando detalles...');
		campaniaSeleccionada = await obtenerDetalleCampania(campaniaId);
		toast.dismiss(loadingToast);

		if (campaniaSeleccionada) {
			// Actualizar vista previa del HTML
			htmlPreview = campaniaSeleccionada.cuerpo_html.replace(/\{\{nombre\}\}/g, 'Cliente');
			mostrarModal = true;
		} else {
			toast.error('Error al cargar los detalles de la campaña');
		}
	}

	function cerrarModal() {
		mostrarModal = false;
		campaniaSeleccionada = null;
		htmlPreview = '';
	}

	async function eliminarBorrador() {
		if (!confirm('¿Estás seguro de eliminar este borrador? Esta acción no se puede deshacer.')) {
			return;
		}

		const loadingToast = toast.loading('Eliminando borrador...');
		const exito = await eliminarCampania(campaniaSeleccionada.id);
		toast.dismiss(loadingToast);

		if (exito) {
			toast.success('Borrador eliminado correctamente');
			cerrarModal();
			await cargarCampanias();
		} else {
			toast.error('Error al eliminar el borrador');
		}
	}

	function editarBorrador() {
		// Redirigir a la edición llevando el ID del borrador
		goto(`/newCampaign/emailBody?campaniaId=${campaniaSeleccionada.id}`);
	}

	async function enviarBorradorAhora() {
		if (!confirm(`¿Enviar esta campaña a ${campaniaSeleccionada.destinatarios?.length || 0} destinatarios?`)) {
			return;
		}

		enviandoCampania = true;
		const loadingToast = toast.loading('Enviando campaña...');

		try {
			// Obtener datos completos de clientes
			const idsDestinatarios = campaniaSeleccionada.destinatarios.map(d => d.venta_id);
			
			const { data: clientesCompletos, error: errorClientes } = await supabase
				.from('mVenta')
				.select('idventa, correo, nombre')
				.in('idventa', idsDestinatarios);

			if (errorClientes || !clientesCompletos) {
				throw new Error('Error al obtener destinatarios');
			}

			const datosCampania = {
				titulo: campaniaSeleccionada.titulo,
				asunto: campaniaSeleccionada.asunto,
				cuerpo_html: campaniaSeleccionada.cuerpo_html,
				usar_variable_nombre: campaniaSeleccionada.usar_variable_nombre
			};

			const destinatariosParaEnviar = clientesCompletos.map(c => ({
				id: c.idventa,
				correo: c.correo,
				nombre: c.nombre
			}));

			const resultado = await enviarCampania(
				campaniaSeleccionada.id, 
				datosCampania, 
				destinatariosParaEnviar
			);

			toast.dismiss(loadingToast);

			if (resultado.success) {
				toast.success(`Campaña enviada: ${resultado.enviados} exitosos, ${resultado.errores} errores`);
				cerrarModal();
				await cargarCampanias();
			} else {
				toast.error('Error al enviar la campaña: ' + (resultado.error || 'Error desconocido'));
			}
		} catch (error) {
			toast.dismiss(loadingToast);
			toast.error(`Error: ${error.message}`);
			console.error('Error al enviar campaña:', error);
		} finally {
			enviandoCampania = false;
		}
	}

	function formatearFecha(fecha) {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold mb-2">Historial de Campañas</h1>
				<p class="text-stone-400 text-sm">Gestiona y revisa tus campañas de email marketing</p>
			</div>
			<button
				on:click={() => goto('/newCampaign')}
				class="bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
			>
				+ Nueva Campaña
			</button>
		</div>

		<!-- Lista de Campañas -->
		{#if cargando}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">Cargando campañas...</p>
				</div>
			</div>
		{:else if campanias.length > 0}
			<div class="grid gap-4">
				{#each campanias as campania}
					<div
						class="bg-stone-900 rounded-xl p-6 border border-stone-700 hover:border-stone-600 transition-all duration-200 cursor-pointer"
						on:click={() => verDetalle(campania.id)}
						on:keydown={(e) => e.key === 'Enter' && verDetalle(campania.id)}
						role="button"
						tabindex="0"
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-xl font-bold text-white truncate">{campania.titulo}</h3>
									<span
										class="px-3 py-1 rounded-full text-xs font-semibold border {estadosColores[
											campania.estado
										]}"
									>
										{estadosTexto[campania.estado]}
									</span>
								</div>
								<p class="text-stone-400 text-sm mb-3 truncate">
									<span class="font-medium">Asunto:</span>
									{campania.asunto}
								</p>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
									<div>
										<span class="text-stone-500">Creada:</span>
										<p class="text-white font-medium">
											{formatearFecha(campania.fecha_creacion)}
										</p>
									</div>
									{#if campania.fecha_envio}
										<div>
											<span class="text-stone-500">Enviada:</span>
											<p class="text-white font-medium">
												{formatearFecha(campania.fecha_envio)}
											</p>
										</div>
									{/if}
									<div>
										<span class="text-stone-500">Destinatarios:</span>
										<p class="text-white font-medium">
											{campania.destinatarios?.[0]?.count || 0}
										</p>
									</div>
									{#if campania.total_enviados > 0}
										<div>
											<span class="text-stone-500">Enviados:</span>
											<p class="text-green-400 font-medium">
												✓ {campania.total_enviados}
											</p>
										</div>
									{/if}
									{#if campania.total_errores > 0}
										<div>
											<span class="text-stone-500">Errores:</span>
											<p class="text-red-400 font-medium">✗ {campania.total_errores}</p>
										</div>
									{/if}
								</div>
							</div>
							<div class="text-stone-500">
								<svg
									class="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400 mb-4">No hay campañas creadas</p>
					<button
						on:click={() => goto('/newCampaign')}
						class="bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
					>
						Crear primera campaña
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de Detalle -->
{#if mostrarModal && campaniaSeleccionada}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		on:click={cerrarModal}
		on:keydown={(e) => e.key === 'Escape' && cerrarModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-stone-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-stone-700"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<!-- Header del Modal -->
			<div class="flex justify-between items-start mb-6">
				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<h2 class="text-2xl font-bold">{campaniaSeleccionada.titulo}</h2>
						<span
							class="px-3 py-1 rounded-full text-xs font-semibold border {estadosColores[
								campaniaSeleccionada.estado
							]}"
						>
							{estadosTexto[campaniaSeleccionada.estado]}
						</span>
					</div>
					<p class="text-stone-400 text-sm">{campaniaSeleccionada.asunto}</p>
				</div>
				<button
					on:click={cerrarModal}
					class="text-stone-400 hover:text-white transition-colors"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Estadísticas -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-stone-800 rounded-lg p-4 border border-stone-700">
					<p class="text-stone-400 text-xs mb-1">Total Destinatarios</p>
					<p class="text-2xl font-bold">{campaniaSeleccionada.destinatarios?.length || 0}</p>
				</div>
				<div class="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
					<p class="text-green-400 text-xs mb-1">Enviados</p>
					<p class="text-2xl font-bold text-green-300">{campaniaSeleccionada.total_enviados || 0}</p>
				</div>
				<div class="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
					<p class="text-red-400 text-xs mb-1">Errores</p>
					<p class="text-2xl font-bold text-red-300">{campaniaSeleccionada.total_errores || 0}</p>
				</div>
				<div class="bg-stone-800 rounded-lg p-4 border border-stone-700">
					<p class="text-stone-400 text-xs mb-1">Tasa de Éxito</p>
					<p class="text-2xl font-bold">
						{campaniaSeleccionada.destinatarios?.length > 0
							? Math.round(
									((campaniaSeleccionada.total_enviados || 0) /
										campaniaSeleccionada.destinatarios.length) *
										100
								)
							: 0}%
					</p>
				</div>
			</div>

			<!-- Fechas -->
			<div class="bg-stone-800 rounded-lg p-4 border border-stone-700 mb-6">
				<h3 class="text-sm font-semibold text-stone-300 mb-3">Información Temporal</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-stone-500">Fecha de Creación:</span>
						<p class="text-white font-medium">
							{formatearFecha(campaniaSeleccionada.fecha_creacion)}
						</p>
					</div>
					{#if campaniaSeleccionada.fecha_envio}
						<div>
							<span class="text-stone-500">Fecha de Envío:</span>
							<p class="text-white font-medium">
								{formatearFecha(campaniaSeleccionada.fecha_envio)}
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Vista Previa del HTML -->
			<div class="bg-stone-800 rounded-lg p-4 border border-stone-700 mb-6">
				<h3 class="text-sm font-semibold text-stone-300 mb-3">Vista Previa del Correo</h3>
				<div class="bg-white rounded-lg overflow-hidden">
					<iframe
						title="Vista previa del correo"
						srcdoc={htmlPreview}
						class="w-full border-0"
						style="min-height: 400px; height: 100%;"
					></iframe>
				</div>
			</div>

			<!-- Botones de acción -->
			<div class="flex gap-3">
				{#if campaniaSeleccionada.estado === 'borrador'}
					<button
						on:click={enviarBorradorAhora}
						disabled={enviandoCampania}
						class="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-stone-600 disabled:to-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
					>
						{#if enviandoCampania}
							<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Enviando...
						{:else}
							📧 Enviar Ahora
						{/if}
					</button>
					<button
						on:click={editarBorrador}
						disabled={enviandoCampania}
						class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
					>
						✏️ Editar
					</button>
					<button
						on:click={eliminarBorrador}
						disabled={enviandoCampania}
						class="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
					>
						🗑️ Eliminar
					</button>
				{/if}
				<button
					on:click={cerrarModal}
					class="flex-1 bg-stone-700 hover:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
