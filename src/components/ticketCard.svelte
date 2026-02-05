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
		</div>
		
		<!-- Estados booleanos en modo vista -->
		<div class="mt-3 flex flex-wrap gap-3">
			<span
				class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {fase.activo
					? 'bg-green-900/30 text-green-400 border border-green-500/50'
					: 'bg-stone-600/30 text-stone-400 border border-stone-500/50'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					fill="currentColor"
					viewBox="0 0 256 256"
					class="mr-1"
				>
					{#if fase.activo}
						<path
							d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
						/>
					{:else}
						<path
							d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
						/>
					{/if}
				</svg>
				{fase.activo ? 'Activo' : 'Inactivo'}
			</span>

			<span
				class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {fase.oculto
					? 'bg-blue-900/30 text-blue-400 border border-blue-500/50'
					: 'bg-stone-600/30 text-stone-400 border border-stone-500/50'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					fill="currentColor"
					viewBox="0 0 256 256"
					class="mr-1"
				>
					{#if fase.oculto}
						<path
							d="M228,175a8,8,0,0,1-10.92-3l-19-33.2A123.23,123.23,0,0,1,162,155.46l5.87,35.22a8,8,0,0,1-6.58,9.21A8.4,8.4,0,0,1,160,200a8,8,0,0,1-7.88-6.69l-5.77-34.58a133.06,133.06,0,0,1-36.68,0l-5.77,34.58A8,8,0,0,1,96,200a8.4,8.4,0,0,1-1.32-.11,8,8,0,0,1-6.58-9.21L94,155.46a123.23,123.23,0,0,1-36.06-16.69L39,172A8,8,0,1,1,25.06,164l20-35a152.8,152.8,0,0,1-19.3-20,8,8,0,0,1,0-10.06C44.56,75.72,77.55,48,128,48s83.44,27.72,102.22,51a8,8,0,0,1,0,10.06,152.8,152.8,0,0,1-19.3,20l20,35A8,8,0,0,1,228,175Z"
						/>
					{:else}
						<path
							d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"
						/>
					{/if}
				</svg>
				{fase.oculto ? 'Oculto' : 'Visible'}
			</span>

			<span
				class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {fase.soldout
					? 'bg-red-900/30 text-red-400 border border-red-500/50'
					: 'bg-green-900/30 text-green-400 border border-green-500/50'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					fill="currentColor"
					viewBox="0 0 256 256"
					class="mr-1"
				>
					<path
						d="M136,120v56a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm36.84,5.16a8,8,0,0,0-11.32,11.31L188.69,164l-27.17,27.15a8,8,0,0,0,11.32,11.32L200,175.31l27.15,27.16a8,8,0,0,0,11.32-11.32L211.31,164l27.16-27.15a8,8,0,0,0-11.32-11.31L200,152.69ZM216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H152a8,8,0,0,0,0-16H40V56H216v88a8,8,0,0,0,16,0V56A16,16,0,0,0,216,40ZM80,136a8,8,0,0,0,8-8V96h32v80a8,8,0,0,0,16,0V88a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v40A8,8,0,0,0,80,136Z"
					/>
				</svg>
				{fase.soldout ? 'Agotado' : 'Disponible'}
			</span>
		</div>
	{/if}
</div>
