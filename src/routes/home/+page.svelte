<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';

	let usuario = null;
    let email = '';

	let token = '';
	
	if (typeof window !== 'undefined') {
		token = localStorage.getItem('token');
		if (token == null) {
			goto('/');
		} else {
			traerUsuario();
		}
	}

	async function traerUsuario() {
		const { data } = await supabase.auth.getSession();
		console.log(data);
		if (data.session) {
			usuario = data.session.user;
            email = usuario.email;
		}
	}
</script>

<h1>HOME</h1>
<h2>Bienvenido, {email}</h2>

<style>
	h1, h2{
		color: aliceblue;
	}
</style>
