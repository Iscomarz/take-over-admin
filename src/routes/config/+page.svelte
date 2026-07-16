<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';

	// --- Teaser Mode State ---
	let teaserConfig = null;
	let teaserLoading = true;
	let savingTeaser = false;

	// Minimum selectable date = right now
	const now = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	const minDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

	// Form fields
	let fechaTeaser = '';
	let tituloTeaser = '';
	let teaserActivo = true;

	onMount(async () => {
		await loadTeaserConfig();
	});

	async function loadTeaserConfig() {
		teaserLoading = true;
		const { data, error } = await supabase
			.from('tTeaserConfig')
			.select('*')
			.order('id', { ascending: true })
			.limit(1)
			.maybeSingle();

		if (error) {
			toast.error('Error al cargar la configuración del teaser.');
			console.error(error);
		} else if (data) {
			teaserConfig = data;
			// Convert UTC timestamp to local datetime-local input format
			const d = new Date(data.fecha_teaser);
			const pad = (n) => String(n).padStart(2, '0');
			fechaTeaser = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
			tituloTeaser = data.titulo_teaser;
			teaserActivo = data.activo;
		}
		teaserLoading = false;
	}

	async function saveTeaserConfig() {
		if (!fechaTeaser) {
			toast.error('La fecha objetivo es obligatoria.');
			return;
		}

		if (new Date(fechaTeaser) <= new Date()) {
			toast.error('La fecha debe ser posterior al momento actual.');
			return;
		}

		savingTeaser = true;

		const payload = {
			fecha_teaser: new Date(fechaTeaser).toISOString(),
			titulo_teaser: tituloTeaser.trim(),
			activo: teaserActivo
		};

		let result;
		if (teaserConfig?.id) {
			result = await supabase
				.from('tTeaserConfig')
				.update(payload)
				.eq('id', teaserConfig.id);
		} else {
			result = await supabase
				.from('tTeaserConfig')
				.insert(payload);
		}

		if (result.error) {
			toast.error('Error al guardar: ' + result.error.message);
			console.error(result.error);
		} else {
			toast.success('Configuración del teaser guardada correctamente.');
			await loadTeaserConfig();
		}

		savingTeaser = false;
	}
</script>

<svelte:head>
	<title>Configuración - Take Over Admin</title>
	<meta name="description" content="Configuración general de la plataforma Take Over" />
</svelte:head>

<Toaster />

<div class="config-page">
	<div class="page-header">
		<h1 class="page-title">Configuración</h1>
		<p class="page-subtitle">Ajustes generales de la plataforma web.</p>
	</div>

	<!-- ================================ -->
	<!-- TEASER MODE SECTION              -->
	<!-- ================================ -->
	<section class="config-section">
		<div class="section-header">
			<div class="section-title-group">
				<div class="section-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				</div>
				<div>
					<h2 class="section-title">Teaser Mode</h2>
					<p class="section-desc">Configura el contador y el título que se muestra en la web cuando no hay eventos activos.</p>
				</div>
			</div>
			<label class="toggle-switch" for="teaser-activo-toggle" title="Activar o desactivar el teaser">
				<input
					id="teaser-activo-toggle"
					type="checkbox"
					bind:checked={teaserActivo}
				/>
				<span class="toggle-slider"></span>
				<span class="toggle-label">{teaserActivo ? 'Activo' : 'Inactivo'}</span>
			</label>
		</div>

		{#if teaserLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Cargando configuración...</span>
			</div>
		{:else}
			<div class="form-grid">
				<div class="form-field">
					<label for="titulo-teaser" class="field-label">Título del Anuncio <span class="optional">(opcional)</span></label>
					<input
						id="titulo-teaser"
						type="text"
						bind:value={tituloTeaser}
						placeholder="NEXT DESTINATION LOADING..."
						class="field-input"
						maxlength="80"
					/>
					<span class="field-hint">Si lo dejás vacío aparecerá "NEXT DESTINATION LOADING..." por defecto.</span>
				</div>

				<div class="form-field">
					<label for="fecha-teaser" class="field-label">Fecha Objetivo del Contador</label>
					<input
						id="fecha-teaser"
						type="datetime-local"
						bind:value={fechaTeaser}
						min={minDate}
						class="field-input"
					/>
					<span class="field-hint">El contador en la web retrocederá hacia esta fecha.</span>
				</div>
			</div>

			{#if teaserConfig}
				<div class="current-values">
					<span class="current-label">Configuración actual:</span>
					<span class="current-chip">{teaserConfig.titulo_teaser}</span>
					<span class="current-chip">
						{new Date(teaserConfig.fecha_teaser).toLocaleDateString('es-MX', {
							day: '2-digit',
							month: 'long',
							year: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</span>
					<span class="current-chip status {teaserConfig.activo ? 'active' : 'inactive'}">
						{teaserConfig.activo ? '● Activo' : '○ Inactivo'}
					</span>
				</div>
			{/if}

			<div class="section-actions">
				<button
					id="save-teaser-btn"
					class="btn-save"
					on:click={saveTeaserConfig}
					disabled={savingTeaser}
				>
					{#if savingTeaser}
						<div class="spinner-sm"></div>
						Guardando...
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" class="btn-icon">
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
							<polyline points="17 21 17 13 7 13 7 21"></polyline>
							<polyline points="7 3 7 8 15 8"></polyline>
						</svg>
						Guardar cambios
					{/if}
				</button>
			</div>
		{/if}
	</section>
</div>

<style>
	.config-page {
		padding: 2rem 2.5rem;
		max-width: 900px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.page-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.page-subtitle {
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
	}

	/* Section card */
	.config-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.section-title-group {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.section-icon {
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(86, 253, 184, 0.08);
		border: 1px solid rgba(86, 253, 184, 0.15);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #56fdb8;
	}

	.section-icon svg {
		width: 1.1rem;
		height: 1.1rem;
	}

	.section-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 0.3rem 0;
	}

	.section-desc {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
		max-width: 500px;
		line-height: 1.5;
	}

	/* Toggle Switch */
	.toggle-switch {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		flex-shrink: 0;
		user-select: none;
	}

	.toggle-switch input {
		display: none;
	}

	.toggle-slider {
		position: relative;
		width: 44px;
		height: 24px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		transition: all 0.25s ease;
	}

	.toggle-slider::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 50%;
		transition: all 0.25s ease;
	}

	.toggle-switch input:checked + .toggle-slider {
		background: rgba(86, 253, 184, 0.2);
		border-color: rgba(86, 253, 184, 0.4);
	}

	.toggle-switch input:checked + .toggle-slider::after {
		background: #56fdb8;
		transform: translateX(20px);
	}

	.toggle-label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
		min-width: 50px;
	}

	/* Form */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 0.01em;
	}

	.field-input {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #ffffff;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease;
		color-scheme: dark;
	}

	.field-input:focus {
		border-color: rgba(86, 253, 184, 0.4);
		background: rgba(86, 253, 184, 0.02);
	}

	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.2);
	}

	.field-hint {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.optional {
		font-size: 0.78rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.3);
	}

	/* Current values badges */
	.current-values {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.current-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.current-chip {
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
		padding: 0.25rem 0.7rem;
		border-radius: 20px;
	}

	.current-chip.status.active {
		background: rgba(86, 253, 184, 0.07);
		border-color: rgba(86, 253, 184, 0.2);
		color: #56fdb8;
	}

	.current-chip.status.inactive {
		background: rgba(255, 95, 86, 0.07);
		border-color: rgba(255, 95, 86, 0.2);
		color: #ff5f56;
	}

	/* Save button */
	.section-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.btn-save {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: #56fdb8;
		color: #000;
		border: none;
		border-radius: 8px;
		padding: 0.7rem 1.4rem;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-save:hover:not(:disabled) {
		background: #3ae49d;
		box-shadow: 0 4px 15px rgba(86, 253, 184, 0.25);
	}

	.btn-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-icon {
		width: 1rem;
		height: 1rem;
	}

	/* Loading */
	.loading-state {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.9rem;
		padding: 1rem 0;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(86, 253, 184, 0.15);
		border-top-color: #56fdb8;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	.spinner-sm {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-top-color: #000;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Responsive */
	@media screen and (max-width: 700px) {
		.config-page {
			padding: 1.5rem 1rem;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.section-header {
			flex-direction: column;
		}
	}
</style>
