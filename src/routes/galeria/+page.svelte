<script>
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import { actualizarGaleria, crearGaleria, eliminarGaleria, obtenerEventosGaleria, obtenerGaleria, subirImagenGaleria } from '../../services/gallery-service.js';

	let events = [];
	let gallery = [];
	let files = [];
	let eventoId = '';
	let fechaContenido = '';
	let descripcion = '';
	let activo = true;
	let orden = 0;
	let loading = true;
	let saving = false;
	let eventFilter = 'all';
	let yearFilter = 'all';

	$: eventMap = new Map(events.map((event) => [String(event.idevento), event]));
	$: years = [...new Set(gallery.map((item) => new Date(item.fecha_contenido).getFullYear()))].sort((a,b) => b-a);
	$: filtered = gallery.filter((item) => (eventFilter === 'all' || String(item.evento_id) === eventFilter) && (yearFilter === 'all' || String(new Date(item.fecha_contenido).getFullYear()) === yearFilter));

	onMount(load);

	async function load() {
		loading = true;
		try {
			[events, gallery] = await Promise.all([obtenerEventosGaleria(), obtenerGaleria()]);
		} catch (error) {
			toast.error(error.message || 'No se pudo cargar la galeria.');
		} finally {
			loading = false;
		}
	}

	function selectEvent() {
		const event = eventMap.get(String(eventoId));
		if (event?.fechaInicio) fechaContenido = String(event.fechaInicio).slice(0, 10);
	}

	async function upload() {
		if (!eventoId || !fechaContenido || !files.length) {
			toast.error('Selecciona evento, fecha y al menos una imagen.');
			return;
		}
		if (files.some((file) => !file.type.startsWith('image/'))) {
			toast.error('Por ahora Vibe Wall acepta solamente imagenes.');
			return;
		}

		saving = true;
		try {
			const rows = [];
			for (const [index, file] of files.entries()) {
				const uploaded = await subirImagenGaleria(file, eventoId);
				rows.push({
					evento_id: eventoId,
					tipo: 'imagen',
					storage_path: uploaded.path,
					url_publica: uploaded.url,
					descripcion: descripcion.trim() || null,
					fecha_contenido: fechaContenido,
					orden: Number(orden) + index,
					activo
				});
			}
			await crearGaleria(rows);
			toast.success(`${rows.length} imagen${rows.length === 1 ? '' : 'es'} agregada${rows.length === 1 ? '' : 's'}.`);
			files = [];
			descripcion = '';
			await load();
		} catch (error) {
			console.error(error);
			toast.error(error.message || 'No se pudieron subir las imagenes.');
		} finally {
			saving = false;
		}
	}

	async function toggle(item) {
		try {
			await actualizarGaleria(item.id, { activo: !item.activo });
			await load();
		} catch (error) { toast.error(error.message); }
	}

	async function remove(item) {
		if (!confirm('Eliminar esta imagen de la galeria?')) return;
		try {
			await eliminarGaleria(item);
			toast.success('Imagen eliminada.');
			await load();
		} catch (error) { toast.error(error.message); }
	}
</script>

<svelte:head><title>Vibe Wall - Admin</title></svelte:head>
<Toaster />

<div class="page">
	<header><span>CONTENIDO PUBLICO</span><h1>Vibe Wall</h1><p>Sube y organiza recuerdos por evento y fecha.</p></header>

	<section class="panel">
		<h2>Agregar imagenes</h2>
		<div class="form-grid">
			<label>Evento *
				<select bind:value={eventoId} on:change={selectEvent}><option value="">Seleccionar</option>{#each events as event}<option value={event.idevento}>{event.nombreEvento}</option>{/each}</select>
			</label>
			<label>Fecha del contenido *<input type="date" bind:value={fechaContenido} /></label>
			<label class="full">Imagenes *<input type="file" accept="image/*" multiple on:change={(event) => files = [...event.currentTarget.files]} /></label>
			<label class="full">Descripcion<input bind:value={descripcion} maxlength="240" placeholder="Momento, artista o detalle opcional" /></label>
			<label>Orden inicial<input type="number" min="0" bind:value={orden} /></label>
			<label class="check"><input type="checkbox" bind:checked={activo} /> Publicar inmediatamente</label>
		</div>
		<button class="primary" on:click={upload} disabled={saving}>{saving ? 'Subiendo...' : `Subir ${files.length || ''} imagenes`}</button>
	</section>

	<section class="panel">
		<div class="toolbar"><h2>Contenido</h2><select bind:value={eventFilter}><option value="all">Todos los eventos</option>{#each events as event}<option value={event.idevento}>{event.nombreEvento}</option>{/each}</select><select bind:value={yearFilter}><option value="all">Todos los años</option>{#each years as year}<option value={String(year)}>{year}</option>{/each}</select></div>
		{#if loading}<p class="empty">Cargando...</p>{:else if !filtered.length}<p class="empty">No hay imagenes.</p>{:else}
			<div class="grid">{#each filtered as item}<article><img src={item.url_publica} alt="" /><div><strong>{eventMap.get(String(item.evento_id))?.nombreEvento || item.evento_id}</strong><small>{item.fecha_contenido}</small></div><div class="actions"><button on:click={() => toggle(item)}>{item.activo ? 'Ocultar' : 'Publicar'}</button><button class="danger" on:click={() => remove(item)}>Eliminar</button></div></article>{/each}</div>
		{/if}
	</section>
</div>

<style>
	.page{max-width:1100px;margin:auto;padding:2rem 2.5rem;color:#fff}header{margin-bottom:2rem}header span{color:#56fdb8;font-size:.7rem;letter-spacing:.2em}h1{font-size:2rem;margin:.35rem 0}header p,.empty{color:rgba(255,255,255,.45)}.panel{padding:1.5rem;margin-bottom:1.5rem;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:12px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.full{grid-column:1/-1}label{display:flex;flex-direction:column;gap:.4rem;color:rgba(255,255,255,.65);font-size:.8rem}input,select{padding:.7rem;color:#fff;background:#151515;border:1px solid rgba(255,255,255,.12);border-radius:7px}.check{flex-direction:row;align-items:center}.primary{margin-top:1rem;padding:.7rem 1rem;background:#56fdb8;border:0;border-radius:7px;font-weight:700}.toolbar{display:flex;gap:.7rem;align-items:center}.toolbar h2{margin-right:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.75rem}article{background:#111;border:1px solid rgba(255,255,255,.08)}article img{width:100%;aspect-ratio:1.4;object-fit:cover}article>div{padding:.65rem;display:flex;flex-direction:column}article small{color:rgba(255,255,255,.4)}.actions{flex-direction:row;gap:.4rem}.actions button{padding:.4rem;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:5px}.actions .danger{color:#ff7b73}.empty{text-align:center;padding:3rem}@media(max-width:700px){.page{padding:1.5rem .5rem}.form-grid{grid-template-columns:1fr}.full{grid-column:auto}.toolbar{align-items:stretch;flex-direction:column}.toolbar h2{margin-right:0}}
</style>
