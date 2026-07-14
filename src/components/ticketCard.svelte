<script>
	export let fase;
	export let borrarFase;
	export let index;
	export let editar = false;
	export let guardarFase;

	let nombreFace = fase.nombreFace;
	let precio = fase.precio;
	let limite = fase.limite;
	let fechaExpira = fase.fechaExpira;
	let oculto = fase.oculto || false;
	let soldout = fase.soldout || false;
	let activo = fase.activo || false;

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
			fechaExpira,
			oculto,
			soldout,
			activo
		});
	}
</script>

<div
	class="bg-stone-700/30 rounded-lg p-3 border border-stone-600/50 hover:border-stone-500 transition-colors"
>
	{#if editar}
		<!-- Modo edición -->
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
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1">
			<div class="flex items-center gap-4 flex-1">
				<p class="font-bold text-white text-base truncate max-w-[120px] sm:max-w-xs">
					{fase.nombreFace}
				</p>
				<p class="text-green-400 font-semibold text-sm">${fase.precio}</p>
				<p class="text-xs text-stone-400 hidden sm:block">
					{fase.limite == null ? '∞ total' : fase.limite + ' limite'}
				</p>
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
	{/if}
</div>
