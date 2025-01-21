<script>
	export let fase;
	export let borrarFase;
	export let index;
	export let editar = false; // Controla si estamos en modo edición o no
	export let guardarFase; // Función para guardar la fase editada

	let nombreFace = fase.nombreFace;
	let precio = fase.precio;
	let limite = fase.limite;
	let fechaExpira = fase.fechaExpira;

	function formatoFecha(fechaISO) {
		const fecha = new Date(fechaISO);
		const dia = String(fecha.getDate()).padStart(2, '0'); // Obtener el día (dd)
		const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Obtener el mes (MM)
		const año = fecha.getFullYear(); // Obtener el año (aaaa)
		return `${dia}/${mes}/${año}`;
	}

	function handleGuardar() {
		// Guardar los datos editados
		guardarFase(index, {
			nombreFace,
			precio,
			limite,
			fechaExpira
		});
	}
</script>

<div class="ticket">
	<div class="ticketRegistrado">
		{#if editar}
			<!-- Mostrar inputs en modo edición -->
			<input on:change={handleGuardar} type="text" bind:value={nombreFace} placeholder="Nombre de Fase" />
			<input on:change={handleGuardar} type="number" bind:value={precio} placeholder="Precio" />
			<input on:change={handleGuardar} type="number" bind:value={limite} placeholder="Límite" />
			<input on:change={handleGuardar} type="date" bind:value={fechaExpira} placeholder="Fecha Expiración" />
			<!-- <button
				type="button"
				class="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
				on:click={handleGuardar}
			>
				Guardar
			</button> -->
		{:else}
			<!-- Mostrar datos en modo vista -->
			<p><b>{fase.nombreFace}</b></p>
			<p>Precio: ${fase.precio}</p>
			<p>Limite: {fase.limite == null ? 'Sin limite' : fase.limite}</p>
			<p>Fecha Expiracion: {formatoFecha(fase.fechaExpira)}</p>
		{/if}

		<div>
			<button
				type="button"
				class="bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-2"
				on:click={() => borrarFase(index)}
			>
				<!-- Icono de eliminar -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="#000000"
					viewBox="0 0 256 256"
				>
					<path
						d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.ticketRegistrado {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid gray;
		border-radius: 10px;
		gap: 20px;
		width: 100%;
		padding: 10px;
		margin-top: 5px;
		margin-bottom: 5px;
	}

	input {
		color: black;
        width: 100px;
	}
</style>
