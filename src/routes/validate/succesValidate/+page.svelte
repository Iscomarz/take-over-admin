<script>
	import { referenciaValida } from '$lib/stores/qrValidate';
	import { get } from 'svelte/store';
	import toast, { Toaster } from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import supabase from '$lib/supabase';

	let referencia;

	onMount(async () => {
		referencia = get(referenciaValida);

		const { data, error } = await supabase
			.from('ticket')
			.update({ validado: true })
			.eq('referencia', referencia);

		if (error) {
			toast.error('Error al validar ticket');
			console.error(error);
            return;
		} else {
			toast.success('Referencia Validada con exito', {
				duration: 4000
			});
            return;
		}
	});
</script>

<Toaster />

<h1>Referencia valida: {referencia}</h1>

<button class="text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center">
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

    a{
        width: 100%;
        color: black;
        text-align: center;
    }
</style>
