<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';

	let generos = [];
	let loading = true;
	let showModal = false;

	// Form fields
	let nombre_genero = '';

	onMount(async () => {
		await loadGeneros();
	});

	async function loadGeneros() {
		loading = true;
		const { data, error } = await supabase.from('generos_musicales').select('*').order('nombre_genero');
		if (error) {
			console.error(error);
			toast.error('Error al cargar géneros');
		} else {
			generos = data;
		}
		loading = false;
	}

	function resetForm() {
		nombre_genero = '';
		showModal = false;
	}

	async function toggleActive(genero) {
		const { error } = await supabase
			.from('generos_musicales')
			.update({ activo: !genero.activo })
			.eq('id_genero', genero.id_genero);
		
		if (error) {
			toast.error('Error al actualizar género');
		} else {
			toast.success(genero.activo ? 'Género desactivado' : 'Género activado');
			await loadGeneros();
		}
	}

	async function saveGenero(e) {
		e.preventDefault();

		if (!nombre_genero.trim()) {
			toast.error('El nombre es obligatorio');
			return;
		}

		// Check if exists
		const { data: existing, error: checkError } = await supabase
			.from('generos_musicales')
			.select('id_genero')
			.ilike('nombre_genero', nombre_genero.trim())
			.limit(1);

		if (checkError) {
			toast.error('Error al verificar existencia');
			return;
		}

		if (existing && existing.length > 0) {
			toast.error('Este género musical ya existe');
			return;
		}

		const { error } = await supabase.from('generos_musicales').insert([{
			nombre_genero: nombre_genero.trim(),
			activo: true
		}]);

		if (error) {
			console.error(error);
			toast.error('Error al crear género');
		} else {
			toast.success('Género creado exitosamente');
			resetForm();
			await loadGeneros();
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-[#111111] p-8 text-white">
	<div class="max-w-4xl mx-auto space-y-6">
		<!-- Header Segment -->
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-stone-900 border border-stone-800 rounded-3xl shadow-xl w-full">
			<div>
				<h1 class="text-2xl font-bold tracking-wider text-white">Géneros Musicales</h1>
				<p class="text-sm text-stone-400 mt-1">Gstiona los géneros que se pueden asignar a los eventos.</p>
			</div>
			<div class="mt-4 md:mt-0">
				<button 
					on:click={() => showModal = true}
					class="px-5 py-2.5 bg-green-900/40 text-green-300 font-semibold rounded-xl border border-green-700/50 hover:bg-green-900/60 transition-colors shadow-lg"
				>
					+ Nuevo Género
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
								<th class="px-6 py-4">ID</th>
								<th class="px-6 py-4">Nombre del Género</th>
								<th class="px-6 py-4">Estado</th>
								<th class="px-6 py-4 text-center">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-800 text-sm">
							{#each generos as genero}
								<tr class="hover:bg-stone-800/30 transition-colors">
									<td class="px-6 py-4 font-medium text-stone-500">{genero.id_genero}</td>
									<td class="px-6 py-4 text-white font-medium">{genero.nombre_genero}</td>
									<td class="px-6 py-4">
										<span class={`px-2 py-1 text-xs rounded-lg font-medium border ${genero.activo ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
											{genero.activo ? 'Activo' : 'Inactivo'}
										</span>
									</td>
									<td class="px-6 py-4 text-center">
										<button 
											on:click={() => toggleActive(genero)}
											class={`text-xs px-3 py-1 rounded-lg border transition-colors ${genero.activo ? 'border-red-500/50 text-red-400 hover:bg-red-900/30' : 'border-green-500/50 text-green-400 hover:bg-green-900/30'}`}
										>
											{genero.activo ? 'Desactivar' : 'Activar'}
										</button>
									</td>
								</tr>
							{/each}
							{#if generos.length === 0}
								<tr>
									<td colspan="4" class="px-6 py-8 text-center text-stone-500 italic">No hay géneros registrados</td>
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
		<div class="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-stone-800 flex justify-between items-center">
				<h2 class="text-xl font-bold text-white">Nuevo Género</h2>
				<button on:click={resetForm} class="text-stone-400 hover:text-white transition">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto">
				<form id="generoForm" on:submit={saveGenero} class="space-y-5">
					<div>
						<label class="block text-sm font-medium mb-1 text-stone-400">Nombre del Género *</label>
						<input type="text" bind:value={nombre_genero} required class="w-full bg-stone-800 text-white border border-stone-700 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" placeholder="Ej. Rock, Electrónica, Pop..." />
					</div>
				</form>
			</div>
			
			<div class="p-6 border-t border-stone-800 flex justify-end gap-3 bg-stone-900">
				<button type="button" on:click={resetForm} class="px-5 py-2.5 rounded-xl text-stone-300 font-medium hover:bg-stone-800 transition">Cancelar</button>
				<button type="submit" form="generoForm" class="px-5 py-2.5 bg-green-900/40 text-green-300 border border-green-700/50 font-medium rounded-xl hover:bg-green-900/60 transition">Guardar</button>
			</div>
		</div>
	</div>
{/if}
