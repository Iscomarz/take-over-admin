<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';

	let usuario = null;
    let email = '';
	let token = '';
	
	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			} else {
				await traerUsuario();
			}
		}
	});

	async function traerUsuario() {
		const { data } = await supabase.auth.getSession();
		if (data.session) {
			usuario = data.session.user;
            email = usuario.email;
		}
	}
</script>

<Toaster/>

<h1>HOME</h1>
<h2>Bienvenido, {email}</h2>

<style>
	h1, h2{
		color: aliceblue;
	}
</style>
