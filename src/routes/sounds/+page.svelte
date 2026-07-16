<script>
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import {
		actualizarSound,
		crearSound,
		eliminarSound,
		obtenerSounds
	} from '../../services/sounds-service.js';

	const emptyForm = () => ({
		id: null,
		titulo: '',
		artista: '',
		soundcloud_url: '',
		artwork_url: '',
		orden: 0,
		activo: true
	});

	let sounds = [];
	let form = emptyForm();
	let loading = true;
	let saving = false;
	let deletingId = null;

	onMount(loadSounds);

	async function loadSounds() {
		loading = true;
		try {
			sounds = await obtenerSounds();
		} catch (error) {
			console.error(error);
			toast.error('No se pudieron cargar los sets.');
		} finally {
			loading = false;
		}
	}

	function editSound(sound) {
		form = {
			id: sound.id,
			titulo: sound.titulo,
			artista: sound.artista ?? '',
			soundcloud_url: sound.soundcloud_url,
			artwork_url: sound.artwork_url ?? '',
			orden: sound.orden ?? 0,
			activo: sound.activo
		};
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function resetForm() {
		form = emptyForm();
	}

	function isValidSoundCloudUrl(value) {
		try {
			const url = new URL(value);
			return ['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'].includes(url.hostname);
		} catch {
			return false;
		}
	}

	async function saveSound() {
		const titulo = form.titulo.trim();
		const soundcloudUrl = form.soundcloud_url.trim();
		if (!titulo || !soundcloudUrl) {
			toast.error('El titulo y la URL de SoundCloud son obligatorios.');
			return;
		}
		if (!isValidSoundCloudUrl(soundcloudUrl)) {
			toast.error('Ingresa una URL valida de SoundCloud.');
			return;
		}

		const payload = {
			titulo,
			artista: form.artista.trim() || null,
			soundcloud_url: soundcloudUrl,
			artwork_url: form.artwork_url.trim() || null,
			orden: Number(form.orden) || 0,
			activo: form.activo
		};

		saving = true;
		try {
			if (form.id) {
				await actualizarSound(form.id, payload);
				toast.success('Set actualizado.');
			} else {
				await crearSound(payload);
				toast.success('Set agregado.');
			}
			resetForm();
			await loadSounds();
		} catch (error) {
			console.error(error);
			toast.error(error.message || 'No se pudo guardar el set.');
		} finally {
			saving = false;
		}
	}

	async function removeSound(sound) {
		if (!confirm(`Eliminar "${sound.titulo}"?`)) return;
		deletingId = sound.id;
		try {
			await eliminarSound(sound.id);
			if (form.id === sound.id) resetForm();
			toast.success('Set eliminado.');
			await loadSounds();
		} catch (error) {
			console.error(error);
			toast.error(error.message || 'No se pudo eliminar el set.');
		} finally {
			deletingId = null;
		}
	}
</script>

<svelte:head>
	<title>Sound of Take Over - Admin</title>
	<meta name="description" content="Configuracion de sets publicados en la web de Take Over" />
</svelte:head>

<Toaster />

<div class="sounds-page">
	<header class="page-header">
		<p class="eyebrow">MUSICA PUBLICA</p>
		<h1>Sound of Take Over</h1>
		<p>Administra los sets que apareceran en el reproductor de la web publica.</p>
	</header>

	<section class="panel">
		<div class="section-heading">
			<div>
				<h2>{form.id ? 'Editar set' : 'Agregar set'}</h2>
				<p>Usa una URL publica de un track, set o playlist de SoundCloud.</p>
			</div>
			{#if form.id}
				<button class="btn-secondary" type="button" on:click={resetForm}>Cancelar</button>
			{/if}
		</div>

		<form on:submit|preventDefault={saveSound}>
			<div class="form-grid">
				<label>
					<span>Titulo *</span>
					<input bind:value={form.titulo} maxlength="120" placeholder="Take Over Session 001" />
				</label>
				<label>
					<span>Artista</span>
					<input bind:value={form.artista} maxlength="120" placeholder="DJ / colectivo" />
				</label>
				<label class="full">
					<span>URL de SoundCloud *</span>
					<input bind:value={form.soundcloud_url} type="url" placeholder="https://soundcloud.com/..." />
				</label>
				<label class="full">
					<span>URL de portada <small>(opcional)</small></span>
					<input bind:value={form.artwork_url} type="url" placeholder="https://..." />
				</label>
				<label>
					<span>Orden</span>
					<input bind:value={form.orden} type="number" min="0" step="1" />
				</label>
				<label class="toggle-row">
					<input bind:checked={form.activo} type="checkbox" />
					<span>Visible en la web publica</span>
				</label>
			</div>
			<div class="form-actions">
				<button class="btn-primary" type="submit" disabled={saving}>
					{saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Agregar set'}
				</button>
			</div>
		</form>
	</section>

	<section class="panel">
		<div class="section-heading">
			<div>
				<h2>Sets configurados</h2>
				<p>{sounds.length} registro{sounds.length === 1 ? '' : 's'} en Supabase.</p>
			</div>
			<button class="btn-secondary" type="button" on:click={loadSounds} disabled={loading}>Actualizar</button>
		</div>

		{#if loading}
			<div class="empty-state">Cargando sets...</div>
		{:else if sounds.length === 0}
			<div class="empty-state">Aun no hay sets configurados.</div>
		{:else}
			<div class="sound-list">
				{#each sounds as sound}
					<article class="sound-card">
						<div class="artwork">
							{#if sound.artwork_url}
								<img src={sound.artwork_url} alt="" />
							{:else}
								<span aria-hidden="true">♫</span>
							{/if}
						</div>
						<div class="sound-info">
							<div class="title-row">
								<h3>{sound.titulo}</h3>
								<span class:active={sound.activo} class="status">{sound.activo ? 'Activo' : 'Oculto'}</span>
							</div>
							<p>{sound.artista || 'Take Over'}</p>
							<a href={sound.soundcloud_url} target="_blank" rel="noreferrer">Abrir en SoundCloud</a>
							<small>Orden: {sound.orden}</small>
						</div>
						<div class="card-actions">
							<button class="btn-secondary" type="button" on:click={() => editSound(sound)}>Editar</button>
							<button class="btn-danger" type="button" on:click={() => removeSound(sound)} disabled={deletingId === sound.id}>
								{deletingId === sound.id ? 'Eliminando...' : 'Eliminar'}
							</button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.sounds-page { max-width: 1050px; margin: 0 auto; padding: 2rem 2.5rem; color: #fff; }
	.page-header { padding-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 2rem; }
	.eyebrow { color: #56fdb8 !important; font-size: .75rem !important; font-weight: 700; letter-spacing: .22em; margin: 0 0 .5rem !important; }
	h1, h2, h3, p { margin-top: 0; }
	h1 { font-size: 2rem; margin-bottom: .4rem; }
	.page-header p, .section-heading p, .sound-info p { color: rgba(255,255,255,.48); margin-bottom: 0; }
	.panel { background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 1.5rem; margin-bottom: 1.5rem; }
	.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
	.section-heading h2 { font-size: 1.15rem; margin-bottom: .25rem; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	label { display: flex; flex-direction: column; gap: .45rem; color: rgba(255,255,255,.72); font-size: .85rem; font-weight: 600; }
	label.full { grid-column: 1 / -1; }
	label small { font-weight: 400; opacity: .55; }
	input { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.11); border-radius: 8px; color: #fff; padding: .75rem .85rem; font: inherit; outline: none; }
	input:focus { border-color: rgba(86,253,184,.5); }
	.toggle-row { flex-direction: row; align-items: center; align-self: end; min-height: 43px; }
	.toggle-row input { accent-color: #56fdb8; width: 18px; height: 18px; }
	.form-actions { display: flex; justify-content: flex-end; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,.06); }
	button { border-radius: 8px; padding: .65rem 1rem; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
	button:disabled { opacity: .5; cursor: wait; }
	.btn-primary { background: #56fdb8; color: #06110c; border: 0; }
	.btn-secondary { background: rgba(255,255,255,.04); color: rgba(255,255,255,.78); border: 1px solid rgba(255,255,255,.1); }
	.btn-danger { background: rgba(255,95,86,.08); color: #ff7b73; border: 1px solid rgba(255,95,86,.18); }
	.sound-list { display: flex; flex-direction: column; gap: .75rem; }
	.sound-card { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: 1rem; padding: 1rem; background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; }
	.artwork { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; display: grid; place-items: center; background: rgba(86,253,184,.08); color: #56fdb8; font-size: 1.6rem; }
	.artwork img { width: 100%; height: 100%; object-fit: cover; }
	.title-row { display: flex; align-items: center; gap: .7rem; }
	.sound-info h3 { font-size: 1rem; margin-bottom: 0; }
	.sound-info a { color: #56fdb8; font-size: .8rem; text-decoration: none; margin-right: 1rem; }
	.sound-info small { color: rgba(255,255,255,.35); }
	.status { padding: .2rem .5rem; border-radius: 999px; background: rgba(255,255,255,.07); color: rgba(255,255,255,.45); font-size: .7rem; }
	.status.active { color: #56fdb8; background: rgba(86,253,184,.08); }
	.card-actions { display: flex; gap: .5rem; }
	.empty-state { text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,.4); }
	@media (max-width: 750px) {
		.sounds-page { padding: 1.5rem .5rem; }
		.form-grid { grid-template-columns: 1fr; }
		label.full { grid-column: auto; }
		.sound-card { grid-template-columns: 52px 1fr; }
		.artwork { width: 52px; height: 52px; }
		.card-actions { grid-column: 1 / -1; justify-content: flex-end; }
	}
</style>
