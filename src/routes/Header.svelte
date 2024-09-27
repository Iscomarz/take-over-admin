<script>
	import supabase from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { eventoStore } from '$lib/stores/eventoStore';

	let salir = false;
	let token = '';

	if (typeof window !== 'undefined') {
		token = localStorage.getItem('token');
	}

	$: {
		salir = token !== null;
	}

	async function cerrarSesion() {
		salir = false;
		localStorage.removeItem('token');
		limpiarStore();
		await supabase.auth.signOut();
		goto('/');
	}

	function limpiarStore() {
		eventoStore.set({
			nombreEvento: '',
			venue: '',
			fechaInicio: '',
			fechaFin: '',
			direccion: '',
			aforo: '',
			fases: []
		});
	}
</script>

<nav>
	<div class="nav">
		<div class="left-nav">
			<span>
				<a href="/home"><img src="/src/lib/images/logos/takeOver-logo.png" alt="" /></a>
			</span>
			<p>Take Over Admin</p>
		</div>

		{#if salir}
			<button on:click={cerrarSesion}>Salir</button>
		{/if}
	</div>
</nav>

<style>
	img {
		width: 70px;
	}

    nav{
        width: 100%;
    }

	.nav {
		color: azure;
		display: flex;
		justify-content: space-between;
		padding: 10px 20px 10px 20px;
		margin-left: 20px;
		margin-right: 20px;
	}

    .left-nav{
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
    }

    p{
        font-weight: bold;
    }
</style>
