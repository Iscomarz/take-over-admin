<script>
	import supabase from '$lib/supabase';
	import EventCard from '../../components/eventCard.svelte';
	import { onMount } from 'svelte';

	let eventos = [];
	let eventoSelec = {};
	let nombre = '';
	let cantidad;
	let correo;

	onMount(async () => {
		let { data: mEvento, error } = await supabase.from('mEvento').select('*');

		if (mEvento && mEvento.length > 0) {
			eventos = mEvento;
		} else if (error || mEvento.length === 0) {
			console.log('Error al traer eventos o no existen eventos');
		}
	});
</script>

<h1>Nuevo Ticket</h1>

<form class="max-w-sm mx-auto">
	<label for="events" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
		>Select an option</label
	>
	<select
		id="events"
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	>
		<option selected>Seleccionar Evento</option>
		{#each eventos as evento}
			<option value={evento}>{evento.nombreEvento}</option>
		{/each}
	</select>

	<div>
		<label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Nombre</label
		>
		<input
			bind:value={nombre}
			type="text"
			id="nombre"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Nombre"
			required
		/>
	</div>
	<div>
		<label for="correo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Correo</label
		>
		<input
			bind:value={correo}
			type="email"
			id="correo"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Mail"
			required
		/>
	</div>
	<div>
		<label for="cantidad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
			>Cantidad</label
		>
		<input
			bind:value={cantidad}
			type="number"
			id="cantidad"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="Qty"
			required
		/>
	</div>
    <br>
	<button
		type="submit"
		class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
		>Submit</button
	>
</form>

<style>
	h1 {
		color: whitesmoke;
	}
</style>
