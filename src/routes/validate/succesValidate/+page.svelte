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
		} else {
			toast.success('Referencia Validada con exito', {
				duration: 4000
			});
		}
	});
</script>

<Toaster />

<h1>Referencia valida: {referencia}</h1>

<a href="/validate">Seguir validando</a>
