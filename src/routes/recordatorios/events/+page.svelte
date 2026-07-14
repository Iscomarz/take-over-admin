<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';

	let idEvento = null;
	let evento = null;
	let configExistente = null;
	let templates = [];
	let templateSeleccionada = '';
	let activo = true;
	let cargando = false;
	let guardando = false;

	$: ideventoParam = $page.url.searchParams.get('idevento');

	$: {
		if (ideventoParam) {
			idEvento = parseInt(ideventoParam);
		}
	}

	onMount(async () => {
		if (idEvento) {
			await Promise.all([cargarEventoYConfig(), cargarTemplates()]);
		} else {
			toast.error('ID de evento no proporcionado');
		}
	});

	async function cargarEventoYConfig() {
		cargando = true;
		try {
			// Fetch Event Details
			const { data: eventoData, error: errorEvento } = await supabase
				.from('mEvento')
				.select('*')
				.eq('idevento', idEvento)
				.single();

			if (errorEvento) throw errorEvento;
			evento = eventoData;

			// Fetch existing configuration for this event
			const { data: configData, error: errorConfig } = await supabase
				.from('mRecordatorioEvento')
				.select('*')
				.eq('evento_id', idEvento);

			if (errorConfig) throw errorConfig;

			if (configData && configData.length > 0) {
				configExistente = configData[0];
				templateSeleccionada = configExistente.template_id;
				activo = configExistente.activo;
			}
		} catch (error) {
			console.error('Error al cargar evento:', error);
			toast.error('Error al cargar detalles del evento');
		} finally {
			cargando = false;
		}
	}

	async function cargarTemplates() {
		try {
			const { data, error } = await supabase
				.from('mRecordatorioTemplate')
				.select('id, nombre')
				.order('nombre');

			if (error) throw error;
			templates = data || [];
		} catch (error) {
			console.error('Error al cargar plantillas:', error);
			toast.error('Error al cargar plantillas de correo');
		}
	}

	async function guardar() {
		if (!templateSeleccionada) {
			toast.error('Por favor, selecciona una plantilla.');
			return;
		}

		guardando = true;
		const loadingToast = toast.loading('Guardando configuración...');

		try {
			const configData = {
				evento_id: idEvento,
				template_id: templateSeleccionada,
				activo: activo
			};

			let error;
			if (configExistente) {
				// Update
				const { error: updateError } = await supabase
					.from('mRecordatorioEvento')
					.update({
						template_id: templateSeleccionada,
						activo: activo
					})
					.eq('id', configExistente.id);
				error = updateError;
			} else {
				// Insert
				const { error: insertError } = await supabase
					.from('mRecordatorioEvento')
					.insert([configData]);
				error = insertError;
			}

			if (error) throw error;

			toast.dismiss(loadingToast);
			toast.success('Configuración guardada correctamente');

			setTimeout(() => {
				goto('/recordatorios');
			}, 1000);
		} catch (error) {
			console.error('Error al guardar configuración:', error);
			toast.dismiss(loadingToast);
			toast.error('Error al guardar la configuración');
		} finally {
			guardando = false;
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 text-white pb-20">
	<div class="max-w-3xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-8">
			<button
				on:click={() => goto('/recordatorios')}
				class="bg-stone-900 hover:bg-stone-855 border border-stone-850 text-stone-400 hover:text-white p-2.5 rounded-lg transition-colors"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
					></path>
				</svg>
			</button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Vincular Recordatorio</h1>
				<p class="text-stone-400 text-sm">
					Asigna una plantilla de recordatorio y define si está activa para el evento.
				</p>
			</div>
		</div>

		{#if cargando || !evento}
			<div
				class="bg-stone-900 border border-stone-850 rounded-xl p-12 text-center text-stone-500 animate-pulse"
			>
				Cargando información del evento...
			</div>
		{:else}
			<div class="bg-stone-900 border border-stone-850 rounded-xl p-6 space-y-6">
				<!-- Event info card -->
				<div class="bg-stone-955 border border-stone-800 rounded-lg p-5">
					<span class="text-xs text-stone-500 font-semibold uppercase tracking-wider block mb-1"
						>Evento Seleccionado</span
					>
					<h2 class="text-xl font-bold text-white mb-2">{evento.nombreEvento}</h2>
					<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-400">
						<span class="flex items-center gap-1.5">
							<svg
								class="w-4 h-4 text-stone-500"
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
							{new Date(evento.fechaInicio).toLocaleDateString('es-MX', { dateStyle: 'long' })}
						</span>
						<span class="flex items-center gap-1.5">
							<svg
								class="w-4 h-4 text-stone-500"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							{new Date(evento.fechaInicio).toLocaleTimeString('es-MX', {
								hour: '2-digit',
								minute: '2-digit'
							})} hrs
						</span>
					</div>
				</div>

				<!-- Template Selection -->
				<div>
					<label for="template" class="block text-sm font-semibold text-stone-300 mb-2"
						>Plantilla de Recordatorio</label
					>
					<div class="relative">
						<select
							id="template"
							bind:value={templateSeleccionada}
							class="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:outline-none focus:border-stone-700 transition-colors appearance-none cursor-pointer"
						>
							<option value="" disabled>Selecciona una plantilla...</option>
							{#each templates as temp}
								<option value={temp.id}>{temp.nombre}</option>
							{/each}
						</select>
						<div
							class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500"
						>
							<svg
								class="fill-current h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
							>
								<path
									d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
								/>
							</svg>
						</div>
					</div>
					{#if templates.length === 0}
						<p class="text-xs text-red-400 mt-2">
							No se encontraron plantillas. Debes
							<a href="/recordatorios/templates" class="underline hover:text-red-300"
								>crear una plantilla primero</a
							>.
						</p>
					{/if}
				</div>

				<!-- Toggle switch -->
				<div class="flex items-center justify-between border-t border-stone-800/60 pt-6">
					<div>
						<h3 class="text-sm font-semibold text-stone-200 mb-0.5">Envío Automático Activo</h3>
						<p class="text-stone-500 text-xs">
							Si está activo, el sistema enviará correos de recordatorio a las 08:00 AM el día del
							evento.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={activo}
						on:click={() => (activo = !activo)}
						class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {activo
							? 'bg-green-600'
							: 'bg-stone-800'}"
					>
						<span
							aria-hidden="true"
							class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {activo
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 border-t border-stone-800/60 pt-6">
					<button
						type="button"
						on:click={() => goto('/recordatorios')}
						class="bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
					>
						Cancelar
					</button>
					<button
						type="button"
						on:click={guardar}
						disabled={guardando || templates.length === 0}
						class="bg-gradient-to-r from-stone-800 to-stone-700 hover:from-stone-700 hover:to-stone-600 border border-stone-700 hover:border-stone-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{guardando ? 'Guardando...' : 'Guardar Configuración'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
