<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';

	let eventos = [];
	let templates = [];
	let cargando = false;

	onMount(async () => {
		await cargarDatos();
	});

	async function cargarDatos() {
		cargando = true;
		const loadingToast = toast.loading('Cargando recordatorios...');
		try {
			// Fetch events and join with their active configuration and template name
			const { data: eventosData, error: errorEventos } = await supabase
				.from('mEvento')
				.select(
					`
					idevento,
					nombreEvento,
					fechaInicio,
					mRecordatorioEvento (
						id,
						activo,
						template_id,
						mRecordatorioTemplate (
							id,
							nombre
						)
					)
				`
				)
				.order('fechaInicio', { ascending: false });

			if (errorEventos) throw errorEventos;
			eventos = eventosData || [];

			// Fetch email templates
			const { data: templatesData, error: errorTemplates } = await supabase
				.from('mRecordatorioTemplate')
				.select('*')
				.order('nombre');

			if (errorTemplates) throw errorTemplates;
			templates = templatesData || [];

			toast.dismiss(loadingToast);
		} catch (error) {
			console.error('Error al cargar datos:', error);
			toast.dismiss(loadingToast);
			toast.error('Error al cargar los datos');
		} finally {
			cargando = false;
		}
	}

	async function eliminarTemplate(id) {
		if (
			!confirm(
				'¿Estás seguro de eliminar esta plantilla? Los eventos que la utilicen dejarán de enviar recordatorios.'
			)
		) {
			return;
		}

		const loadingToast = toast.loading('Eliminando plantilla...');
		try {
			const { error } = await supabase.from('mRecordatorioTemplate').delete().eq('id', id);

			toast.dismiss(loadingToast);

			if (error) {
				if (error.code === '23503') {
					toast.error(
						'No se puede eliminar la plantilla porque está asignada a uno o más eventos.'
					);
				} else {
					throw error;
				}
				return;
			}

			toast.success('Plantilla eliminada correctamente');
			await cargarDatos();
		} catch (error) {
			console.error('Error al eliminar plantilla:', error);
			toast.dismiss(loadingToast);
			toast.error('Error al eliminar la plantilla');
		}
	}

	function formatearFecha(fecha) {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('es-MX', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 text-white pb-20">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div
			class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-stone-800 pb-6"
		>
			<div>
				<h1 class="text-3xl font-bold tracking-tight mb-2">Recordatorios Automáticos</h1>
				<p class="text-stone-400 text-sm">
					Gestiona el envío automático de correos el día del evento a los compradores.
				</p>
			</div>
			<div class="flex gap-3">
				<a
					href="/recordatorios/templates"
					class="bg-gradient-to-r from-stone-850 to-stone-750 hover:from-stone-750 hover:to-stone-650 border border-stone-700 hover:border-stone-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md flex items-center gap-2"
				>
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path>
					</svg>
					Nueva Plantilla
				</a>
			</div>
		</div>

		<!-- Dashboard Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Col 1 & 2: Events Configuration -->
			<div class="lg:col-span-2 space-y-6">
				<div class="flex justify-between items-center">
					<h2 class="text-xl font-semibold flex items-center gap-2">
						<svg
							class="w-5 h-5 text-stone-400"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
							></path>
						</svg>
						Configuración de Eventos
					</h2>
				</div>

				{#if cargando}
					<div
						class="bg-stone-900/50 rounded-xl p-8 border border-stone-800 text-center text-stone-500"
					>
						Cargando eventos...
					</div>
				{:else if eventos.length === 0}
					<div
						class="bg-stone-900/50 rounded-xl p-8 border border-stone-800 text-center text-stone-500"
					>
						No se encontraron eventos registrados.
					</div>
				{:else}
					<div class="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr
										class="bg-stone-900/80 border-b border-stone-800 text-stone-400 text-xs font-semibold uppercase tracking-wider"
									>
										<th class="px-6 py-4">Evento</th>
										<th class="px-6 py-4">Fecha</th>
										<th class="px-6 py-4">Estado</th>
										<th class="px-6 py-4">Plantilla</th>
										<th class="px-6 py-4 text-right">Acciones</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-stone-800/60">
									{#each eventos as evento}
										{@const config = evento.mRecordatorioEvento?.[0]}
										<tr class="hover:bg-stone-850/40 transition-colors">
											<td class="px-6 py-4 font-semibold text-stone-200">
												{evento.nombreEvento}
											</td>
											<td class="px-6 py-4 text-sm text-stone-400">
												{formatearFecha(evento.fechaInicio)}
											</td>
											<td class="px-6 py-4">
												{#if !config}
													<span
														class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700"
													>
														No Configurado
													</span>
												{:else if config.activo}
													<span
														class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"
													>
														Activo
													</span>
												{:else}
													<span
														class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-900 text-stone-500 border border-stone-800"
													>
														Inactivo
													</span>
												{/if}
											</td>
											<td class="px-6 py-4 text-sm">
												{#if config?.mRecordatorioTemplate}
													<span class="text-stone-300 font-medium">
														{config.mRecordatorioTemplate.nombre}
													</span>
												{:else}
													<span class="text-stone-600">-</span>
												{/if}
											</td>
											<td class="px-6 py-4 text-right">
												<a
													href="/recordatorios/events?idevento={evento.idevento}"
													class="inline-flex items-center gap-1 bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
												>
													<svg
														class="w-3.5 h-3.5"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														viewBox="0 0 24 24"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
														></path>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
														></path>
													</svg>
													Configurar
												</a>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

			<!-- Col 3: Templates List -->
			<div class="space-y-6">
				<div class="flex justify-between items-center">
					<h2 class="text-xl font-semibold flex items-center gap-2">
						<svg
							class="w-5 h-5 text-stone-400"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							></path>
						</svg>
						Plantillas
					</h2>
				</div>

				{#if cargando}
					<div
						class="bg-stone-900/50 rounded-xl p-6 border border-stone-800 text-center text-stone-500"
					>
						Cargando plantillas...
					</div>
				{:else if templates.length === 0}
					<div
						class="bg-stone-900/50 rounded-xl p-8 border border-stone-800 text-center text-stone-500"
					>
						<p class="mb-4">No hay plantillas de correo creadas.</p>
						<a
							href="/recordatorios/templates"
							class="inline-block bg-stone-850 hover:bg-stone-800 border border-stone-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
						>
							Crear Plantilla
						</a>
					</div>
				{:else}
					<div class="space-y-4">
						{#each templates as template}
							<div
								class="bg-stone-900 rounded-xl p-5 border border-stone-800 flex flex-col justify-between hover:border-stone-750 transition-all duration-200"
							>
								<div class="mb-4">
									<h3 class="font-bold text-stone-100 mb-1">{template.nombre}</h3>
									<p class="text-stone-400 text-xs truncate">
										<span class="text-stone-500 font-medium">Asunto:</span>
										{template.asunto}
									</p>
								</div>
								<div class="flex justify-end gap-2 border-t border-stone-800/60 pt-3">
									<a
										href="/recordatorios/templates?templateId={template.id}"
										class="inline-flex items-center gap-1 bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
									>
										<svg
											class="w-3.5 h-3.5"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
											></path>
										</svg>
										Editar
									</a>
									<button
										on:click={() => eliminarTemplate(template.id)}
										class="inline-flex items-center gap-1 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
									>
										<svg
											class="w-3.5 h-3.5"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
											></path>
										</svg>
										Eliminar
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
