<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import { campaniaStore } from '$lib/stores/campaniaStore';
	import {
		obtenerClientesUnicos,
		obtenerClientesPorEvento,
		obtenerEventosParaCampania
	} from '../../services/campania-service';

	let token = '';
	let titulo = '';
	let asunto = '';
	let eventos = [];
	let eventoSeleccionado = '';
	let clientes = [];
	let clientesFiltrados = [];
	let seleccionarTodos = false;
	let destinatariosSeleccionados = [];
	let cargandoClientes = false;
	let busqueda = '';

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		// Resetear el store al inicio
		campaniaStore.reset();

		// Cargar eventos y clientes
		await cargarDatos();
	});

		async function cargarDatos() {
		cargandoClientes = true;
		const loadingToast = toast.loading('Cargando datos...');

		try {
			eventos = await obtenerEventosParaCampania();
			clientes = await obtenerClientesUnicos();
			clientesFiltrados = clientes;

			// Contar clientes frecuentes
			const frecuentes = clientes.filter(c => c.esFrecuente).length;

			toast.dismiss(loadingToast);
			toast.success(`${clientes.length} clientes cargados (${frecuentes} frecuentes)`);
		} catch (error) {
			toast.dismiss(loadingToast);
			toast.error('Error al cargar datos');
			console.error(error);
		} finally {
			cargandoClientes = false;
		}
	}

	async function filtrarPorEvento() {
		
		if (eventoSeleccionado && eventoSeleccionado !== '') {
			cargandoClientes = true;
			const loadingToast = toast.loading('Filtrando clientes...');

			try {
				const eventoIdNumero = parseInt(eventoSeleccionado);
				
				clientesFiltrados = await obtenerClientesPorEvento(eventoIdNumero);
				
				toast.dismiss(loadingToast);
				toast.success(`${clientesFiltrados.length} clientes del evento`);
			} catch (error) {
				console.error('Error al filtrar:', error);
				toast.dismiss(loadingToast);
				toast.error('Error al filtrar clientes');
			} finally {
				cargandoClientes = false;
			}

			// Limpiar selección
			destinatariosSeleccionados = [];
			seleccionarTodos = false;
		} else {
			console.log('Mostrando todos los clientes');
			clientesFiltrados = clientes;
			// Limpiar selección
			destinatariosSeleccionados = [];
			seleccionarTodos = false;
		}
	}

	function toggleSeleccionarTodos() {
		if (seleccionarTodos) {
			destinatariosSeleccionados = clientesFiltrados.map((c) => c.id);
		} else {
			destinatariosSeleccionados = [];
		}
	}

	function toggleCliente(clienteId) {
		const index = destinatariosSeleccionados.indexOf(clienteId);
		if (index > -1) {
			destinatariosSeleccionados = destinatariosSeleccionados.filter((id) => id !== clienteId);
		} else {
			destinatariosSeleccionados = [...destinatariosSeleccionados, clienteId];
		}

		// Actualizar el toggle de "todos"
		seleccionarTodos = destinatariosSeleccionados.length === clientesFiltrados.length;
	}

	function filtrarClientesPorBusqueda() {
		if (busqueda.trim() === '') {
			clientesFiltrados = eventoSeleccionado && eventoSeleccionado !== ''
				? clientes.filter((c) => c.evento_id === parseInt(eventoSeleccionado))
				: clientes;
		} else {
			const busquedaLower = busqueda.toLowerCase();
			const base = eventoSeleccionado && eventoSeleccionado !== ''
				? clientes.filter((c) => c.evento_id === parseInt(eventoSeleccionado))
				: clientes;

			clientesFiltrados = base.filter(
				(c) =>
					c.nombre.toLowerCase().includes(busquedaLower) ||
					c.correo.toLowerCase().includes(busquedaLower)
			);
		}
	}

	function validarYContinuar() {
		// Validaciones
		if (!titulo.trim()) {
			toast.error('El título es requerido');
			return;
		}

		if (titulo.length > 100) {
			toast.error('El título debe tener máximo 100 caracteres');
			return;
		}

		if (!asunto.trim()) {
			toast.error('El asunto es requerido');
			return;
		}

		if (asunto.length > 200) {
			toast.error('El asunto debe tener máximo 200 caracteres');
			return;
		}

		if (destinatariosSeleccionados.length === 0) {
			toast.error('Debes seleccionar al menos un destinatario');
			return;
		}

		// Guardar en el store
		campaniaStore.setDatosBasicos({
			titulo,
			asunto,
			destinatarios: destinatariosSeleccionados,
			seleccionarTodos,
			filtroEvento: eventoSeleccionado
		});

		toast.success('Datos guardados. Continuando al siguiente paso...');

		// Navegar al siguiente paso
		setTimeout(() => {
			goto('/newCampaign/emailBody');
		}, 500);
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-5xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<button
				on:click={() => goto('/home')}
				class="text-stone-400 hover:text-white mb-4 flex items-center gap-2"
			>
				← Volver
			</button>
			<h1 class="text-3xl font-bold mb-2">Nueva Campaña de Email</h1>
			<p class="text-stone-400 text-sm">
				Paso 1 de 2: Configura los datos básicos de tu campaña
			</p>
		</div>

		<!-- Progreso -->
		<div class="mb-8">
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<div
						class="w-8 h-8 rounded-full bg-gradient-to-r from-stone-600 to-stone-500 flex items-center justify-center font-bold"
					>
						1
					</div>
					<span class="text-sm font-medium">Datos Básicos</span>
				</div>
				<div class="flex-1 h-0.5 bg-stone-700"></div>
				<div class="flex items-center gap-2 opacity-50">
					<div class="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center">2</div>
					<span class="text-sm">Contenido del Correo</span>
				</div>
			</div>
		</div>

		<!-- Formulario -->
		<div class="bg-stone-900 rounded-xl p-8 border border-stone-700 space-y-6">
			<!-- Título de la Campaña -->
			<div>
				<label class="block text-sm font-medium text-stone-300 mb-2">
					Título de la Campaña <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					bind:value={titulo}
					maxlength="100"
					class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
					placeholder="Ej: Campaña de Verano 2026"
				/>
				<p class="text-xs text-stone-500 mt-1">{titulo.length}/100 caracteres</p>
			</div>

			<!-- Asunto del Correo -->
			<div>
				<label class="block text-sm font-medium text-stone-300 mb-2">
					Asunto del Correo <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					bind:value={asunto}
					maxlength="200"
					class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
					placeholder="Ej: ¡No te pierdas nuestros próximos eventos!"
				/>
				<p class="text-xs text-stone-500 mt-1">{asunto.length}/200 caracteres</p>
			</div>

			<!-- Filtrar por Evento -->
			<div>
				<label class="block text-sm font-medium text-stone-300 mb-2">
					Filtrar por Evento (Opcional)
				</label>
				<select
					bind:value={eventoSeleccionado}
					on:change={filtrarPorEvento}
					class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
				>
					<option value="">Todos los clientes</option>
					{#each eventos as evento}
						<option value={evento.idevento}>
							{evento.nombreEvento} - {new Date(evento.fechaInicio).toLocaleDateString()}
						</option>
					{/each}
				</select>
				{#if eventoSeleccionado}
					<p class="text-xs text-stone-400 mt-1">
						Evento seleccionado: {eventos.find(e => e.idevento == eventoSeleccionado)?.nombreEvento || 'N/A'}
					</p>
				{/if}
			</div>

			<!-- Destinatarios -->
			<div>
				<div class="flex justify-between items-center mb-3">
					<label class="block text-sm font-medium text-stone-300">
						Destinatarios <span class="text-red-500">*</span>
					</label>
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="selectAll"
							bind:checked={seleccionarTodos}
							on:change={toggleSeleccionarTodos}
							class="w-4 h-4 rounded border-stone-600 bg-stone-800 text-stone-500 focus:ring-stone-500"
						/>
						<label for="selectAll" class="text-sm text-stone-400 cursor-pointer">
							Seleccionar todos ({clientesFiltrados.length})
						</label>
					</div>
				</div>

				<!-- Stats de clientes frecuentes -->
				{#if clientesFiltrados.some(c => c.esFrecuente)}
					<div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
						<div class="flex items-center gap-2 text-sm">
							<span class="text-2xl">⭐</span>
							<div>
								<p class="text-amber-300 font-semibold">
									{clientesFiltrados.filter(c => c.esFrecuente).length} Cliente{clientesFiltrados.filter(c => c.esFrecuente).length !== 1 ? 's' : ''} Frecuente{clientesFiltrados.filter(c => c.esFrecuente).length !== 1 ? 's' : ''}
				 </p>
								<p class="text-amber-400/70 text-xs">
									Clientes con 3 o más compras aparecen primero
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Buscador -->
				<div class="mb-4">
					<input
						type="text"
						bind:value={busqueda}
						on:input={filtrarClientesPorBusqueda}
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
						placeholder="🔍 Buscar por nombre o correo..."
					/>
				</div>

				<!-- Lista de Clientes -->
				<div
					class="bg-stone-800 border border-stone-700 rounded-lg max-h-96 overflow-y-auto divide-y divide-stone-700"
				>
					{#if cargandoClientes}
						<div class="p-4 text-center text-stone-400">
							<div class="animate-pulse">Cargando clientes...</div>
						</div>
					{:else if clientesFiltrados.length === 0}
						<div class="p-4 text-center text-stone-400">No hay clientes disponibles</div>
					{:else}
						{#each clientesFiltrados as cliente (cliente.id)}
							<label
								class="flex items-center gap-3 p-3 hover:bg-stone-700/50 cursor-pointer transition-colors {cliente.esFrecuente ? 'bg-amber-500/5' : ''}"
							>
								<input
									type="checkbox"
									checked={destinatariosSeleccionados.includes(cliente.id)}
									on:change={() => toggleCliente(cliente.id)}
									class="w-4 h-4 rounded border-stone-600 bg-stone-800 text-stone-500 focus:ring-stone-500"
								/>
								<div class="flex-1 min-w-0 flex items-center gap-2">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<p class="text-sm font-medium text-white truncate">{cliente.nombre}</p>
											{#if cliente.esFrecuente}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/20 to-green-500/20 text-green-300 border border-green-500/30 shrink-0">
													⭐ Frecuente
												</span>
											{/if}
										</div>
										<p class="text-xs text-stone-400 truncate">{cliente.correo}</p>
									</div>
									{#if cliente.compras}
										<div class="text-right shrink-0">
											<p class="text-xs font-medium text-stone-500">
												{cliente.compras} compra{cliente.compras !== 1 ? 's' : ''}
											</p>
										</div>
									{/if}
								</div>
							</label>
						{/each}
					{/if}
				</div>

				<p class="text-xs text-stone-500 mt-2">
					{destinatariosSeleccionados.length} destinatario{destinatariosSeleccionados.length !== 1
						? 's'
						: ''} seleccionado{destinatariosSeleccionados.length !== 1 ? 's' : ''}
				</p>
			</div>

			<!-- Botones -->
			<div class="flex gap-4 pt-4">
				<button
					on:click={() => goto('/home')}
					class="flex-1 bg-stone-700 hover:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
				>
					Cancelar
				</button>
				<button
					on:click={validarYContinuar}
					class="flex-1 bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
				>
					Continuar →
				</button>
			</div>
		</div>
	</div>
</div>
