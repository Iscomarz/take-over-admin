<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';

	let venues = [];
	let loading = true;
	let showModal = false;

	// Form fields
	let nombre_venue = '';
	let descripcion_venue = '';
	let capacidad_venue = '';
	let direccion_venue = '';
	let estado = '';
	let ciudad = '';
	let pais = '';
	let codigo_postal = '';
	let url_direccion = '';

	onMount(async () => {
		await loadVenues();
	});

	async function loadVenues() {
		loading = true;
		const { data, error } = await supabase.from('venue').select('*').order('nombre_venue');
		if (error) {
			console.error(error);
			toast.error('Error al cargar venues');
		} else {
			venues = data;
		}
		loading = false;
	}

	function resetForm() {
		nombre_venue = '';
		descripcion_venue = '';
		capacidad_venue = '';
		direccion_venue = '';
		estado = '';
		ciudad = '';
		pais = '';
		codigo_postal = '';
		url_direccion = '';
		showModal = false;
	}

	async function toggleActive(venue) {
		const { error } = await supabase
			.from('venue')
			.update({ activo: !venue.activo })
			.eq('id_venue', venue.id_venue);
		
		if (error) {
			toast.error('Error al actualizar venue');
		} else {
			toast.success(venue.activo ? 'Venue desactivado' : 'Venue activado');
			await loadVenues();
		}
	}

	async function saveVenue(e) {
		e.preventDefault();

		if (!nombre_venue.trim() || !direccion_venue.trim()) {
			toast.error('Nombre y dirección son obligatorios');
			return;
		}

		// Check if exists
		const { data: existing, error: checkError } = await supabase
			.from('venue')
			.select('id_venue')
			.ilike('nombre_venue', nombre_venue.trim())
			.limit(1);

		if (checkError) {
			toast.error('Error al verificar existencia');
			return;
		}

		if (existing && existing.length > 0) {
			toast.error('Ya existe un venue con ese nombre');
			return;
		}

		const { error } = await supabase.from('venue').insert([{
			nombre_venue: nombre_venue.trim(),
			descripcion_venue: descripcion_venue.trim() || null,
			capacidad_venue: parseInt(capacidad_venue) || null,
			direccion_venue: direccion_venue.trim(),
			estado: estado.trim() || null,
			ciudad: ciudad.trim() || null,
			pais: pais.trim() || null,
			codigo_postal: codigo_postal.trim() || null,
			url_direccion: url_direccion.trim() || null,
			activo: true
		}]);

		if (error) {
			console.error(error);
			toast.error('Error al crear venue');
		} else {
			toast.success('Venue creado exitosamente');
			resetForm();
			await loadVenues();
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-[#111111] p-8 text-white">
	<div class="max-w-7xl mx-auto space-y-6">
		<!-- Header Segment -->
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-stone-900 border border-stone-800 rounded-3xl shadow-xl w-full">
			<div>
				<h1 class="text-2xl font-bold tracking-wider text-white">Catálogo de Venues</h1>
				<p class="text-sm text-stone-400 mt-1">Gestiona los lugares donde se realizan los eventos.</p>
			</div>
			<div class="mt-4 md:mt-0">
				<button 
					on:click={() => showModal = true}
					class="px-5 py-2.5 bg-green-900/40 text-green-300 font-semibold rounded-xl border border-green-700/50 hover:bg-green-900/60 transition-colors shadow-lg"
				>
					+ Nuevo Venue
				</button>
			</div>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<p class="text-stone-400">Cargando...</p>
			</div>
		{:else}
			<div class="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead class="bg-stone-800/50 text-stone-400 text-xs uppercase font-semibold">
							<tr>
								<th class="px-6 py-4">Nombre</th>
								<th class="px-6 py-4">Dirección</th>
								<th class="px-6 py-4">Capacidad</th>
								<th class="px-6 py-4">Ciudad/Estado/País</th>
								<th class="px-6 py-4">Estado</th>
								<th class="px-6 py-4 text-center">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-800 text-sm">
							{#each venues as venue}
								<tr class="hover:bg-stone-800/30 transition-colors">
									<td class="px-6 py-4 font-medium text-white">{venue.nombre_venue}</td>
									<td class="px-6 py-4 text-stone-300">
										{venue.direccion_venue}
										{#if venue.url_direccion}
											<a href={venue.url_direccion} target="_blank" class="block text-xs text-green-400 hover:underline mt-1">Ver mapa</a>
										{/if}
									</td>
									<td class="px-6 py-4 text-stone-300">{venue.capacidad_venue || '-'}</td>
									<td class="px-6 py-4 text-stone-300">
										{venue.ciudad || '-'}{#if venue.estado}, {venue.estado}{/if}{#if venue.pais}, {venue.pais}{/if}
									</td>
									<td class="px-6 py-4">
										<span class={`px-2 py-1 text-xs rounded-lg font-medium border ${venue.activo ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
											{venue.activo ? 'Activo' : 'Inactivo'}
										</span>
									</td>
									<td class="px-6 py-4 text-center">
										<button 
											on:click={() => toggleActive(venue)}
											class={`text-xs px-3 py-1 rounded-lg border transition-colors ${venue.activo ? 'border-red-500/50 text-red-400 hover:bg-red-900/30' : 'border-green-500/50 text-green-400 hover:bg-green-900/30'}`}
										>
											{venue.activo ? 'Desactivar' : 'Activar'}
										</button>
									</td>
								</tr>
							{/each}
							{#if venues.length === 0}
								<tr>
									<td colspan="6" class="px-6 py-8 text-center text-stone-500 italic">No hay venues registrados</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Create -->
{#if showModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click|self={resetForm}>
		<div class="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-stone-800 flex justify-between items-center">
				<h2 class="text-xl font-bold text-white">Nuevo Venue</h2>
				<button on:click={resetForm} class="text-stone-400 hover:text-white transition">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto custom-scrollbar">
				<form id="venueForm" on:submit={saveVenue} class="space-y-5">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
						<div class="md:col-span-2">
							<label class="block text-sm font-medium mb-1 text-stone-400">Nombre del Venue *</label>
							<input type="text" bind:value={nombre_venue} required class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" placeholder="Ej. Foro Sol" />
						</div>

						<div class="md:col-span-2">
							<label class="block text-sm font-medium mb-1 text-stone-400">Descripción</label>
							<textarea bind:value={descripcion_venue} rows="2" class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent"></textarea>
						</div>

						<div class="md:col-span-2">
							<label class="block text-sm font-medium mb-1 text-stone-400">Dirección Exacta *</label>
							<input type="text" bind:value={direccion_venue} required class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" placeholder="Calle, Número, Colonia" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">Capacidad Aprox.</label>
							<input type="number" bind:value={capacidad_venue} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" placeholder="Ej. 1000" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">Ciudad</label>
							<input type="text" bind:value={ciudad} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">Estado</label>
							<input type="text" bind:value={estado} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">País</label>
							<input type="text" bind:value={pais} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">Código Postal</label>
							<input type="text" bind:value={codigo_postal} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
						</div>

						<div>
							<label class="block text-sm font-medium mb-1 text-stone-400">URL Maps/Ubucación</label>
							<input type="url" bind:value={url_direccion} class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" placeholder="https://maps.google.com/..." />
						</div>
					</div>
				</form>
			</div>
			
			<div class="p-6 border-t border-stone-800 flex justify-end gap-3 bg-stone-900">
				<button type="button" on:click={resetForm} class="px-5 py-2.5 rounded-xl text-stone-300 font-medium hover:bg-stone-800 transition">Cancelar</button>
				<button type="submit" form="venueForm" class="px-5 py-2.5 bg-green-900/40 text-green-300 border border-green-700/50 font-medium rounded-xl hover:bg-green-900/60 transition">Guardar Venue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: #444;
		border-radius: 10px;
	}
</style>
