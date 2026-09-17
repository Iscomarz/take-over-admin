<script>
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import {
		obtenerMediaPorEvento,
		crearMediaEvento,
		actualizarMediaEvento,
		eliminarMediaEvento
	} from '../services/evento-media-service.js';

	export let idEvento;
	export let editar = false;

	let mediaList = [];
	let loading = true;
	let guardando = false;
	let mostrandoFormulario = false;
	let editandoId = null;

	let form = {
		tipo: 'youtube',
		url: '',
		titulo: '',
		artista: '',
		orden: 0,
		activo: true
	};

	onMount(async () => {
		await cargarMedia();
	});

	async function cargarMedia() {
		if (!idEvento) return;
		loading = true;
		try {
			mediaList = await obtenerMediaPorEvento(idEvento);
		} catch (error) {
			console.error('Error al cargar media:', error);
			// If table doesn't exist yet, warn gracefully
			if (error?.message?.includes('does not exist')) {
				console.warn('La tabla tEventoMedia aún no ha sido creada en Supabase.');
			}
		} finally {
			loading = false;
		}
	}

	function detectarTipoUrl(url) {
		const u = url.trim().toLowerCase();
		if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
		if (u.includes('soundcloud.com')) return 'soundcloud';
		if (u.includes('spotify.com')) return 'spotify';
		return null;
	}

	function handleUrlChange() {
		const tipoDetectado = detectarTipoUrl(form.url);
		if (tipoDetectado) {
			form.tipo = tipoDetectado;
		}
	}

	function resetForm() {
		form = {
			tipo: 'youtube',
			url: '',
			titulo: '',
			artista: '',
			orden: mediaList.length,
			activo: true
		};
		editandoId = null;
		mostrandoFormulario = false;
	}

	function iniciarEdicion(item) {
		editandoId = item.id;
		form = {
			tipo: item.tipo,
			url: item.url,
			titulo: item.titulo || '',
			artista: item.artista || '',
			orden: item.orden ?? 0,
			activo: item.activo
		};
		mostrandoFormulario = true;
	}

	function extraerYoutubeId(url) {
		try {
			if (!url) return null;
			const match = url.match(
				/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
			);
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}

	async function guardarMedia() {
		if (!form.url.trim()) {
			toast.error('La URL es obligatoria');
			return;
		}

		guardando = true;
		try {
			if (editandoId) {
				await actualizarMediaEvento(editandoId, {
					tipo: form.tipo,
					url: form.url.trim(),
					titulo: form.titulo.trim() || null,
					artista: form.artista.trim() || null,
					orden: Number(form.orden) || 0,
					activo: form.activo
				});
				toast.success('Contenido multimedia actualizado');
			} else {
				await crearMediaEvento({
					id_evento: Number(idEvento),
					tipo: form.tipo,
					url: form.url.trim(),
					titulo: form.titulo.trim() || null,
					artista: form.artista.trim() || null,
					orden: Number(form.orden) || mediaList.length,
					activo: form.activo
				});
				toast.success('Contenido multimedia agregado');
			}
			resetForm();
			await cargarMedia();
		} catch (error) {
			console.error('Error al guardar multimedia:', error);
			if (error?.message?.includes('does not exist')) {
				toast.error('Debes ejecutar la migración SQL de tEventoMedia en Supabase primero.');
			} else {
				toast.error('Error al guardar el contenido multimedia');
			}
		} finally {
			guardando = false;
		}
	}

	async function toggleActivo(item) {
		try {
			await actualizarMediaEvento(item.id, { activo: !item.activo });
			item.activo = !item.activo;
			mediaList = [...mediaList];
			toast.success(item.activo ? 'Activado' : 'Desactivado');
		} catch (error) {
			console.error(error);
			toast.error('Error al cambiar estado');
		}
	}

	async function eliminarItem(id) {
		if (!confirm('¿Eliminar este enlace multimedia?')) return;
		try {
			await eliminarMediaEvento(id);
			mediaList = mediaList.filter((m) => m.id !== id);
			toast.success('Enlace eliminado');
		} catch (error) {
			console.error(error);
			toast.error('Error al eliminar');
		}
	}
</script>

<div class="mt-8 pt-6 border-t border-stone-700/50">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					fill="currentColor"
					viewBox="0 0 256 256"
					class="text-red-500"
				>
					<path
						d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM160,132.89l-48,32A8,8,0,0,1,100,158V98a8,8,0,0,1,12-6.89l48,32a8,8,0,0,1,0,13.78Z"
					></path>
				</svg>
				Multimedia y Sets del Artista
			</h2>
			<p class="text-xs text-stone-400 mt-0.5">
				Videos de YouTube, sets de SoundCloud o tracks de Spotify para que la gente conozca el sonido del evento.
			</p>
		</div>

		{#if editar && !mostrandoFormulario}
			<button
				type="button"
				on:click={() => {
					resetForm();
					mostrandoFormulario = true;
				}}
				class="bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors border border-stone-600 flex items-center gap-1.5 shadow-sm"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
					<path
						d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
					></path>
				</svg>
				Agregar Enlace
			</button>
		{/if}
	</div>

	<!-- Formulario para agregar / editar -->
	{#if mostrandoFormulario}
		<div class="bg-stone-800/80 border border-stone-600/80 rounded-2xl p-5 mb-6 shadow-xl animate-in fade-in duration-200">
			<div class="flex items-center justify-between pb-3 mb-4 border-b border-stone-700">
				<h3 class="font-bold text-sm text-white flex items-center gap-2">
					{#if editandoId}
						Editar Multimedia
					{:else}
						Nuevo Enlace Multimedia
					{/if}
				</h3>
				<button
					type="button"
					on:click={resetForm}
					class="text-stone-400 hover:text-white text-xs py-1 px-2 rounded-lg hover:bg-stone-700"
				>
					Cancelar
				</button>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<label class="block text-xs font-medium text-stone-300 mb-1.5">Tipo de Plataforma</label>
					<select
						bind:value={form.tipo}
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-stone-500"
					>
						<option value="youtube">YouTube (Video / Set)</option>
						<option value="soundcloud">SoundCloud (Track / Set)</option>
						<option value="spotify">Spotify (Track / Playlist)</option>
					</select>
				</div>

				<div class="md:col-span-2">
					<label class="block text-xs font-medium text-stone-300 mb-1.5">
						URL del Enlace <span class="text-red-400">*</span>
					</label>
					<input
						type="url"
						bind:value={form.url}
						on:input={handleUrlChange}
						placeholder="https://www.youtube.com/watch?v=... o https://soundcloud.com/..."
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-stone-500"
						required
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<label class="block text-xs font-medium text-stone-300 mb-1.5">Artista / DJ (Opcional)</label>
					<input
						type="text"
						bind:value={form.artista}
						placeholder="Ej. MarSan, Boris Brejcha"
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-stone-500"
					/>
				</div>

				<div>
					<label class="block text-xs font-medium text-stone-300 mb-1.5">Título / Descripción (Opcional)</label>
					<input
						type="text"
						bind:value={form.titulo}
						placeholder="Ej. Live Set @ Boiler Room"
						class="w-full bg-stone-700 text-white border border-stone-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-stone-500"
					/>
				</div>

				<div class="flex items-center gap-4 pt-5">
					<label class="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300">
						<input
							type="checkbox"
							bind:checked={form.activo}
							class="rounded bg-stone-700 border-stone-600 text-green-500 focus:ring-0 w-4 h-4"
						/>
						Visible en web
					</label>
				</div>
			</div>

			<!-- Vista previa simple de YouTube si la URL es válida -->
			{#if form.tipo === 'youtube' && extraerYoutubeId(form.url)}
				<div class="mb-4 p-3 bg-stone-900/60 rounded-xl border border-stone-700/60">
					<p class="text-[11px] font-semibold text-stone-400 mb-2 uppercase tracking-wider">
						Vista previa de miniatura
					</p>
					<div class="flex items-center gap-3">
						<img
							src={`https://img.youtube.com/vi/${extraerYoutubeId(form.url)}/hqdefault.jpg`}
							alt="Preview"
							class="w-28 h-16 object-cover rounded-lg border border-stone-700 shadow"
						/>
						<div class="text-xs text-stone-400">
							<p class="text-white font-medium">Video detectado correctamente</p>
							<p>ID: {extraerYoutubeId(form.url)}</p>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					on:click={resetForm}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-700 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="button"
					on:click={guardarMedia}
					disabled={guardando}
					class="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-md flex items-center gap-2"
				>
					{#if guardando}
						<span class="animate-spin text-sm">↻</span>
						Guardando...
					{:else}
						{editandoId ? 'Actualizar Enlace' : 'Guardar Enlace'}
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Lista de enlaces multimedia existentes -->
	{#if loading}
		<div class="text-center py-6 text-stone-400 text-xs animate-pulse">
			Cargando contenido multimedia...
		</div>
	{:else if mediaList.length === 0}
		<div class="bg-stone-800/30 border border-dashed border-stone-700 rounded-xl p-6 text-center text-stone-400 text-sm">
			<p>No hay contenido multimedia agregado a este evento todavía.</p>
			{#if editar}
				<button
					type="button"
					on:click={() => {
						resetForm();
						mostrandoFormulario = true;
					}}
					class="mt-2 text-xs text-green-400 hover:text-green-300 underline font-semibold"
				>
					+ Agregar el primer set o video
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each mediaList as item (item.id)}
				<div
					class="bg-stone-800/60 border border-stone-700/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-stone-600 transition-all {item.activo ? '' : 'opacity-60'}"
				>
					<div class="flex items-start gap-3">
						<!-- Icono según tipo -->
						<div class="p-2.5 rounded-xl shrink-0 mt-0.5
							{item.tipo === 'youtube' ? 'bg-red-950/50 text-red-400 border border-red-800/40' :
							 item.tipo === 'soundcloud' ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40' :
							 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'}"
						>
							{#if item.tipo === 'youtube'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
									<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM160,132.89l-48,32A8,8,0,0,1,100,158V98a8,8,0,0,1,12-6.89l48,32a8,8,0,0,1,0,13.78Z"></path>
								</svg>
							{:else if item.tipo === 'soundcloud'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
									<path d="M128,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,128,80Zm32,16a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,160,96ZM96,104a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V112A8,8,0,0,0,96,104Zm96,0a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V112A8,8,0,0,0,192,104ZM64,120a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V128A8,8,0,0,0,64,120Z"></path>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
									<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.24,147.23a8,8,0,0,1-11,2.62c-23.77-14.54-53.7-17.84-88.94-9.78a8,8,0,1,1-3.6-15.59c38.71-8.86,71.86-5.14,98.67,11.27A8,8,0,0,1,173.24,171.23Z"></path>
								</svg>
							{/if}
						</div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-0.5">
								<span class="text-xs font-bold uppercase tracking-wider text-stone-400">
									{item.tipo}
								</span>
								{#if !item.activo}
									<span class="text-[10px] bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded font-semibold">
										Inactivo
									</span>
								{/if}
							</div>
							<p class="font-semibold text-sm text-white truncate">
								{item.titulo || item.artista || 'Sin título'}
							</p>
							{#if item.artista && item.titulo}
								<p class="text-xs text-stone-400 truncate">{item.artista}</p>
							{/if}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-xs text-green-400 hover:underline truncate block mt-1"
							>
								{item.url}
							</a>
						</div>
					</div>

					<!-- Acciones -->
					{#if editar}
						<div class="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-stone-700/60">
							<button
								type="button"
								on:click={() => toggleActivo(item)}
								class="text-xs px-2.5 py-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
							>
								{item.activo ? 'Desactivar' : 'Activar'}
							</button>
							<button
								type="button"
								on:click={() => iniciarEdicion(item)}
								class="text-xs px-2.5 py-1 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 transition-colors"
							>
								Editar
							</button>
							<button
								type="button"
								on:click={() => eliminarItem(item.id)}
								class="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
							>
								Eliminar
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
