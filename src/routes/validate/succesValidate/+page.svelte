<script>
	import { referenciaValida } from '$lib/stores/qrValidate';
	import { get } from 'svelte/store';
	import toast, { Toaster } from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import supabase from '$lib/supabase';

	let referencia;

	onMount(async () => {
		toast.remove();
		referencia = get(referenciaValida);

		const { data, error } = await supabase
			.from('ticket')
			.update({ validado: true, fechaValidacion: new Date() })
			.eq('referencia', referencia);

		if (error) {
			toast.error('Error al validar ticket');
			console.error(error);
			return;
		} else {
			console.log('Ticket validado con exxito');
			return;
		}
	});
</script>

<Toaster />

<h1>Referencia valida: {referencia}</h1>
<div style="width: 100; display: flex; justify-content: center; padding: 40px;">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100"
		height="100"
		fill="#FAFAFA"
		viewBox="0 0 256 256"
		><path
			d="M168,104H88a40,40,0,0,0-40,40v8a40,40,0,0,0,40,40h80a40,40,0,0,0,40-40v-8A40,40,0,0,0,168,104Zm24,48a24,24,0,0,1-24,24H88a24,24,0,0,1-24-24v-8a24,24,0,0,1,24-24h80a24,24,0,0,1,24,24ZM208,40a32.06,32.06,0,0,0-31,24H79a32,32,0,0,0-63,8v80a72.08,72.08,0,0,0,72,72h80a72.08,72.08,0,0,0,72-72V72A32,32,0,0,0,208,40Zm16,112a56.06,56.06,0,0,1-56,56H88a56.06,56.06,0,0,1-56-56V72a16,16,0,0,1,32,0,8,8,0,0,0,8,8H184a8,8,0,0,0,8-8,16,16,0,0,1,32,0Zm-120-4a12,12,0,1,1-12-12A12,12,0,0,1,104,148Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,148Z"
		></path></svg
	>

	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100"
		height="100"
		fill="#fafafa"
		viewBox="0 0 256 256"
		><path
			d="M230.33,141.06a24.34,24.34,0,0,0-18.61-4.77C230.5,117.33,240,98.48,240,80c0-26.47-21.29-48-47.46-48A47.58,47.58,0,0,0,156,48.75,47.58,47.58,0,0,0,119.46,32C93.29,32,72,53.53,72,80c0,11,3.24,21.69,10.06,33a31.87,31.87,0,0,0-14.75,8.4L44.69,144H16A16,16,0,0,0,0,160v40a16,16,0,0,0,16,16H120a7.93,7.93,0,0,0,1.94-.24l64-16a6.94,6.94,0,0,0,1.19-.4L226,182.82l.44-.2a24.6,24.6,0,0,0,3.93-41.56ZM119.46,48A31.15,31.15,0,0,1,148.6,67a8,8,0,0,0,14.8,0,31.15,31.15,0,0,1,29.14-19C209.59,48,224,62.65,224,80c0,19.51-15.79,41.58-45.66,63.9l-11.09,2.55A28,28,0,0,0,140,112H100.68C92.05,100.36,88,90.12,88,80,88,62.65,102.41,48,119.46,48ZM16,160H40v40H16Zm203.43,8.21-38,16.18L119,200H56V155.31l22.63-22.62A15.86,15.86,0,0,1,89.94,128H140a12,12,0,0,1,0,24H112a8,8,0,0,0,0,16h32a8.32,8.32,0,0,0,1.79-.2l67-15.41.31-.08a8.6,8.6,0,0,1,6.3,15.9Z"
		></path></svg
	>
</div>

<button
	class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
>
	<a href="/validate">Seguir validando</a>
</button>

<style>
	button {
		background-color: rgb(63, 248, 186);
		color: black;
	}

	button:hover {
		background-color: rgb(52, 180, 137);
	}

	a {
		width: 100%;
		color: black;
		text-align: center;
	}
</style>
