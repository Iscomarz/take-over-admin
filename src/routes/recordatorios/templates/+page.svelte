<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import supabase from '$lib/supabase';

	let id = null;
	let nombre = '';
	let asunto = '';
	let cuerpoHtml = '';
	let textareaRef;
	let cargando = false;
	let guardando = false;

	// Mock data for live replacement in the preview panel
	const mockData = {
		nombre: 'Juan Pérez',
		evento: 'Festivales TakeOver 2026',
		fecha: 'Viernes, 17 de Julio de 2026',
		hora: '19:00 CST',
		ubicacion: 'Centro de Convenciones, CDMX',
		link_maps: 'https://maps.google.com/?q=Centro+de+Convenciones+CDMX',
		link_ticket: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=TakeOverDemo',
		tickets_qr: `
			<div style="margin: 15px auto; display: inline-block; padding: 15px; background-color: #ffffff; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; max-width: 220px; color: #000;">
				<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=TakeOverDemo" width="180" height="180" style="display: block; margin: 0 auto 10px auto;" />
				<div style="font-family: sans-serif; font-size: 12px; color: #475569; font-weight: 600;">Boleto 1</div>
				<div style="font-family: sans-serif; font-size: 11px; color: #94a3b8; margin-top: 2px;">Ref: 12345678</div>
			</div>
		`
	};

	$: templateId = $page.url.searchParams.get('templateId');

	$: {
		if (templateId) {
			id = templateId;
		}
	}

	onMount(async () => {
		if (id) {
			await cargarTemplate();
		}
	});

	async function cargarTemplate() {
		cargando = true;
		try {
			const { data, error } = await supabase
				.from('mRecordatorioTemplate')
				.select('*')
				.eq('id', id)
				.single();

			if (error) throw error;
			if (data) {
				nombre = data.nombre;
				asunto = data.asunto;
				cuerpoHtml = data.cuerpo_html;
			}
		} catch (error) {
			console.error('Error al cargar plantilla:', error);
			toast.error('Error al cargar los datos de la plantilla');
		} finally {
			cargando = false;
		}
	}

	// Live preview HTML generation with replacements
	$: previewHtml = (() => {
		let html = cuerpoHtml || '';
		if (!html) {
			return `
				<html>
					<body style="background-color: #1c1917; color: #d6d3d1; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center;">
						<div>
							<svg style="width: 48px; height: 48px; color: #78716c; margin-bottom: 12px; display: inline-block;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"></path>
							</svg>
							<p style="font-size: 14px; font-weight: 500;">Ingresa código HTML en el editor para ver el diseño final aquí.</p>
						</div>
					</body>
				</html>
			`;
		}
		// Interpolate mock values
		Object.entries(mockData).forEach(([key, val]) => {
			const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
			html = html.replace(regex, val);
		});
		return html;
	})();

	function insertarVariable(variable) {
		const placeholder = `{{${variable}}}`;
		if (!textareaRef) {
			cuerpoHtml += placeholder;
			return;
		}
		const start = textareaRef.selectionStart;
		const end = textareaRef.selectionEnd;
		cuerpoHtml = cuerpoHtml.substring(0, start) + placeholder + cuerpoHtml.substring(end);

		setTimeout(() => {
			textareaRef.focus();
			textareaRef.selectionStart = textareaRef.selectionEnd = start + placeholder.length;
		}, 0);
	}

	async function guardar() {
		if (!nombre.trim()) {
			toast.error('Especifica un nombre para la plantilla.');
			return;
		}
		if (!asunto.trim()) {
			toast.error('Especifica el asunto del correo.');
			return;
		}
		if (!cuerpoHtml.trim()) {
			toast.error('El contenido HTML de la plantilla no puede estar vacío.');
			return;
		}

		guardando = true;
		const loadingToast = toast.loading('Guardando plantilla...');

		try {
			const record = {
				nombre: nombre.trim(),
				asunto: asunto.trim(),
				cuerpo_html: cuerpoHtml.trim()
			};

			let error;
			if (id) {
				const { error: err } = await supabase
					.from('mRecordatorioTemplate')
					.update(record)
					.eq('id', id);
				error = err;
			} else {
				const { error: err } = await supabase.from('mRecordatorioTemplate').insert([record]);
				error = err;
			}

			if (error) throw error;

			toast.dismiss(loadingToast);
			toast.success('Plantilla guardada correctamente');

			setTimeout(() => {
				goto('/recordatorios');
			}, 1000);
		} catch (error) {
			console.error('Error al guardar plantilla:', error);
			toast.dismiss(loadingToast);
			toast.error('Error al guardar los cambios');
		} finally {
			guardando = false;
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 text-white pb-10">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-8">
			<button
				on:click={() => goto('/recordatorios')}
				class="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-stone-400 hover:text-white p-2.5 rounded-lg transition-colors"
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
				<h1 class="text-3xl font-bold tracking-tight">
					{id ? 'Editar Plantilla' : 'Nueva Plantilla'}
				</h1>
				<p class="text-stone-400 text-sm">
					Crea o edita la estructura HTML y variables de tu plantilla de recordatorio.
				</p>
			</div>
		</div>

		{#if cargando}
			<div
				class="bg-stone-900 border border-stone-850 rounded-xl p-12 text-center text-stone-500 animate-pulse"
			>
				Cargando información de plantilla...
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
				<!-- Left Panel: Editor Fields -->
				<div class="space-y-6 flex flex-col">
					<div class="bg-stone-900 border border-stone-850 rounded-xl p-6 space-y-4">
						<!-- Name -->
						<div>
							<label for="nombre" class="block text-sm font-semibold text-stone-300 mb-2"
								>Nombre Interno</label
							>
							<input
								type="text"
								id="nombre"
								bind:value={nombre}
								placeholder="Ej. Recordatorio General - Puertas"
								class="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-650 focus:outline-none focus:border-stone-700 transition-colors"
							/>
						</div>

						<!-- Subject -->
						<div>
							<label for="asunto" class="block text-sm font-semibold text-stone-300 mb-2"
								>Asunto del Correo</label
							>
							<input
								type="text"
								id="asunto"
								bind:value={asunto}
								placeholder="Ej. ¡Hoy es el gran día! Prepárate para {'{{evento}}'}"
								class="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-650 focus:outline-none focus:border-stone-700 transition-colors"
							/>
						</div>
					</div>

					<!-- Variable Helper Panel -->
					<div class="bg-stone-900 border border-stone-850 rounded-xl p-6">
						<h3 class="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-1.5">
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
									d="M9.813 15.904L9 21m0 0l-.813-5.096M9 21h3m-3 0H6m9.813-5.096a9 9 0 11-12.025 0m12.025 0a8.959 8.959 0 01-1.812 5.096M21 7.5a3 3 0 11-6 0 3 3 0 016 0z"
								></path>
							</svg>
							Variables Disponibles
						</h3>
						<p class="text-stone-500 text-xs mb-4">
							Haz clic en cualquier variable para insertarla en la posición del cursor del editor de
							cuerpo HTML.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each Object.keys(mockData) as variable}
								<button
									type="button"
									on:click={() => insertarVariable(variable)}
									class="bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all"
								>
									{`{{${variable}}}`}
								</button>
							{/each}
						</div>
					</div>

					<!-- HTML Textarea Editor -->
					<div class="bg-stone-900 border border-stone-850 rounded-xl p-6 flex-1 flex flex-col">
						<label for="cuerpoHtml" class="block text-sm font-semibold text-stone-300 mb-2"
							>Cuerpo HTML del Correo</label
						>
						<textarea
							id="cuerpoHtml"
							bind:this={textareaRef}
							bind:value={cuerpoHtml}
							placeholder="<!-- Ingresa código HTML completo aquí -->&#10;<div style='padding: 20px;'>&#10;  <h1>Hola {'{{nombre}}'}</h1>&#10;  <p>Te recordamos que hoy es {'{{evento}}'} en {'{{ubicacion}}'}...</p>&#10;</div>"
							rows="15"
							class="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-700 font-mono text-sm focus:outline-none focus:border-stone-700 transition-colors flex-1 resize-none min-h-[300px]"
						></textarea>
					</div>

					<!-- Save buttons -->
					<div class="flex justify-end gap-3 pt-2">
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
							disabled={guardando}
							class="bg-gradient-to-r from-stone-800 to-stone-700 hover:from-stone-700 hover:to-stone-600 border border-stone-700 hover:border-stone-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{guardando ? 'Guardando...' : 'Guardar Plantilla'}
						</button>
					</div>
				</div>

				<!-- Right Panel: Live Preview -->
				<div class="flex flex-col">
					<div
						class="bg-stone-900 border border-stone-850 rounded-xl p-6 flex flex-col h-full min-h-[500px]"
					>
						<div class="flex justify-between items-center mb-4 pb-3 border-b border-stone-850">
							<h3 class="text-sm font-semibold text-stone-300 flex items-center gap-1.5">
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
										d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
									></path>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									></path>
								</svg>
								Vista Previa en Vivo (Interpretable)
							</h3>
							<span
								class="text-xs text-stone-500 bg-stone-950 px-2.5 py-1 rounded-full border border-stone-800"
							>
								Valores de simulación activos
							</span>
						</div>

						<div class="flex-1 bg-white rounded-lg overflow-hidden border border-stone-800">
							<iframe
								title="Vista Previa de Correo"
								srcdoc={previewHtml}
								class="w-full h-full border-0 bg-white"
							></iframe>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
