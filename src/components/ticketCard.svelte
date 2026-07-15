<script>
	import toast from 'svelte-french-toast';

	export let fase;
	export let borrarFase;
	export let index;
	export let editar = false;
	export let guardarFase;

	let nombreFace = fase.nombreFace;
	let precio = fase.precio;
	let limite = fase.limite;
	let fechaExpira = fase.fechaExpira ? fase.fechaExpira.split('T')[0] : '';
	let oculto = fase.oculto || false;
	let soldout = fase.soldout || false;
	let activo = fase.activo || false;
	let idPrecioStripe = fase.idPrecioStripe || '';
	let descripcion = fase.descripcion || '';

	let stripePrecios = [];
	let cargandoStripe = false;
	let creandoStripe = false;
	let preciosCargados = false;

	// Cargar precios de Stripe de manera reactiva cuando se activa el modo edición
	$: if (editar && !preciosCargados && !cargandoStripe) {
		cargarPreciosStripe();
	}

	async function cargarPreciosStripe() {
		try {
			cargandoStripe = true;
			const res = await fetch('/api/stripe/precios');
			const data = await res.json();
			if (data.success) {
				stripePrecios = data.prices;
				preciosCargados = true;
			}
		} catch (err) {
			console.error('Error cargando precios de Stripe:', err);
		} finally {
			cargandoStripe = false;
		}
	}

	async function crearPrecioStripe() {
		if (!nombreFace || !precio) {
			toast.error('Nombre de fase y precio son requeridos para crear el producto en Stripe');
			return;
		}

		creandoStripe = true;
		const idToast = toast.loading('Creando producto y precio en Stripe...');
		try {
			const res = await fetch('/api/stripe/precios', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nombre: nombreFace, precio: Number(precio) })
			});
			const data = await res.json();
			if (data.success) {
				idPrecioStripe = data.idPrecioStripe;
				precio = data.precioCalculado;
				toast.success('¡Producto creado en Stripe con éxito!', { id: idToast });
				handleGuardar();

				// Actualizar lista local de precios para incluir el nuevo
				stripePrecios = [
					...stripePrecios,
					{
						idPrecioStripe: data.idPrecioStripe,
						nombre: nombreFace,
						precio: data.precioCalculado,
						moneda: 'mxn'
					}
				];
			} else {
				toast.error(`Error de Stripe: ${data.error}`, { id: idToast });
			}
		} catch (err) {
			console.error(err);
			toast.error('Ocurrió un error al crear el producto en Stripe', { id: idToast });
		} finally {
			creandoStripe = false;
		}
	}

	function handleStripeSelect(e) {
		const selected = stripePrecios.find((p) => p.idPrecioStripe === e.target.value);
		if (selected) {
			nombreFace = selected.nombre;
			precio = selected.precio;
			idPrecioStripe = selected.idPrecioStripe;
			handleGuardar();
		}
	}

	function formatoFecha(fechaISO) {
		const fecha = new Date(fechaISO);
		const dia = String(fecha.getDate()).padStart(2, '0');
		const mes = String(fecha.getMonth() + 1).padStart(2, '0');
		const año = fecha.getFullYear();
		return `${dia}/${mes}/${año}`;
	}

	function handleGuardar() {
		guardarFase(index, {
			nombreFace,
			precio,
			limite,
			fechaExpira: fechaExpira || null,
			oculto,
			soldout,
			activo,
			idPrecioStripe: idPrecioStripe || null,
			descripcion: descripcion || null
		});
	}
</script>

<div
	class="bg-stone-700/30 rounded-lg p-3 border border-stone-600/50 hover:border-stone-500 transition-colors"
>
	{#if editar}
		<!-- Modo edición -->
		<!-- Autocompletado de Stripe -->
		<div class="mb-3">
			<label for="stripeSelect" class="block text-xs text-stone-400 mb-1"
				>Vincular a Precio de Stripe Existente (Opcional)</label
			>
			<select
				id="stripeSelect"
				on:change={handleStripeSelect}
				class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
			>
				<option value=""
					>-- {cargandoStripe ? 'Cargando precios de Stripe...' : 'Seleccionar precio existente'} --</option
				>
				{#each stripePrecios as sp}
					<option value={sp.idPrecioStripe} selected={sp.idPrecioStripe === idPrecioStripe}>
						{sp.nombre} (${sp.precio}
						{sp.moneda.toUpperCase()}) - {sp.idPrecioStripe}
					</option>
				{/each}
			</select>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
			<div>
				<input
					on:change={handleGuardar}
					type="text"
					bind:value={nombreFace}
					placeholder="Nombre de Fase"
					class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
				/>
			</div>
			<div>
				<input
					on:change={handleGuardar}
					type="number"
					bind:value={precio}
					placeholder="Precio"
					class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
				/>
			</div>
			<div>
				<input
					on:change={handleGuardar}
					type="number"
					bind:value={limite}
					placeholder="Límite"
					class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
				/>
			</div>
			<div>
				<input
					on:change={handleGuardar}
					type="date"
					bind:value={fechaExpira}
					placeholder="Fecha Expiración"
					class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
				/>
			</div>
		</div>

		<!-- Nuevos campos: idPrecioStripe y descripcion -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
			<div>
				<div class="flex gap-2">
					<input
						on:change={handleGuardar}
						type="text"
						bind:value={idPrecioStripe}
						placeholder="ID Precio Stripe (ej: price_...)"
						class="flex-1 bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
					/>
					{#if !idPrecioStripe}
						<button
							type="button"
							on:click={crearPrecioStripe}
							disabled={creandoStripe || !nombreFace || !precio}
							class="bg-green-700 hover:bg-green-600 text-white px-3 rounded-lg text-xs font-semibold border border-green-600 transition-colors whitespace-nowrap disabled:opacity-50"
						>
							Crear en Stripe
						</button>
					{/if}
				</div>
			</div>
			<div>
				<input
					on:change={handleGuardar}
					type="text"
					bind:value={descripcion}
					placeholder="Descripción (opcional)"
					class="w-full bg-stone-600 text-white border border-stone-500 rounded-lg p-2 focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
				/>
			</div>
		</div>

		<!-- Controles booleanos -->
		<div class="mt-4 flex flex-wrap gap-4">
			<label class="inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					bind:checked={activo}
					on:change={handleGuardar}
					class="sr-only peer"
				/>
				<div
					class="relative w-11 h-6 bg-stone-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
				></div>
				<span class="ms-3 text-sm font-medium text-stone-300">Activo</span>
			</label>

			<label class="inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					bind:checked={oculto}
					on:change={handleGuardar}
					class="sr-only peer"
				/>
				<div
					class="relative w-11 h-6 bg-stone-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
				></div>
				<span class="ms-3 text-sm font-medium text-stone-300">Oculto</span>
			</label>

			<label class="inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					bind:checked={soldout}
					on:change={handleGuardar}
					class="sr-only peer"
				/>
				<div
					class="relative w-11 h-6 bg-stone-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-stone-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"
				></div>
				<span class="ms-3 text-sm font-medium text-stone-300">Agotado</span>
			</label>
		</div>

		<button
			type="button"
			class="mt-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg font-semibold transition-colors border border-red-500/50 flex items-center gap-2"
			on:click={() => borrarFase(index)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path
					d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
				/>
			</svg>
			Eliminar
		</button>
	{:else}
		<!-- Modo vista Simplificado -->
		<div class="flex flex-col justify-between gap-1 px-2 py-1">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div class="flex items-center gap-4 flex-1">
					<p class="font-bold text-white text-base truncate max-w-[120px] sm:max-w-xs">
						{fase.nombreFace}
					</p>
					<p class="text-green-400 font-semibold text-sm">${fase.precio}</p>
					<p class="text-xs text-stone-400">
						{fase.limite == null ? '∞ total' : fase.limite + ' limite'}
					</p>
					{#if fase.fechaExpira}
						<p class="text-xs text-stone-400 hidden sm:block">
							Expira: {formatoFecha(fase.fechaExpira)}
						</p>
					{/if}
				</div>

				<div class="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
					<!-- Status Badges -->
					<span
						class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium {fase.activo
							? 'bg-green-900/30 text-green-400'
							: 'bg-stone-600/30 text-stone-400'}"
					>
						{fase.activo ? 'Activo' : 'Inactivo'}
					</span>
					{#if fase.oculto}
						<span
							class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/30 text-blue-400"
						>
							Oculto
						</span>
					{/if}
					{#if fase.soldout}
						<span
							class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/30 text-red-400"
						>
							Agotado
						</span>
					{/if}
				</div>
			</div>

			{#if fase.idPrecioStripe || fase.descripcion}
				<div
					class="mt-1 flex flex-col sm:flex-row gap-x-4 text-xs text-stone-400 border-t border-stone-800/40 pt-1"
				>
					{#if fase.idPrecioStripe}
						<p>
							<span class="font-semibold text-stone-500">Stripe Price:</span>
							{fase.idPrecioStripe}
						</p>
					{/if}
					{#if fase.descripcion}
						<p>
							<span class="font-semibold text-stone-500">Descripción:</span>
							{fase.descripcion}
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
