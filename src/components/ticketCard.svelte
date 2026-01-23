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
			fechaExpira
		});
	}
</script>

<div class="bg-stone-700/50 rounded-xl p-4 border border-stone-600">
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
		<!-- Modo vista -->
		<div class="flex items-center justify-between">
			<div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
				<div>
					<p class="text-xs text-stone-400 mb-1">Fase</p>
					<p class="font-semibold text-white">{fase.nombreFace}</p>
				</div>
				<div>
					<p class="text-xs text-stone-400 mb-1">Precio</p>
					<p class="font-semibold text-green-400">${fase.precio}</p>
				</div>
				<div>
					<p class="text-xs text-stone-400 mb-1">Límite</p>
					<p class="font-semibold">{fase.limite == null ? 'Sin límite' : fase.limite}</p>
				</div>
				<div>
					<p class="text-xs text-stone-400 mb-1">Expira</p>
					<p class="font-semibold">{formatoFecha(fase.fechaExpira)}</p>
				</div>
			</div>
			<button
				type="button"
				class="ml-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 p-2 rounded-lg transition-colors border border-red-500/50"
				on:click={() => borrarFase(index)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
					/>
				</svg>
			</button>
		</div>
	{/if}
</div>
