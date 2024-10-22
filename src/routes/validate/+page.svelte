<script>
	import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let token = '';

	onMount(() => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
	});
</script>

<h1>Validar Codigo QR</h1>

<style>
	h1 {
		color: whitesmoke;
	}
</style>
