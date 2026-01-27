<script>
	import supabase from '$lib/supabase';
	import { onMount } from 'svelte';

	let userEmail = '';
	let isValidator = false;

	onMount(() => {
		checkSession();
	});

  async function checkSession() {
        const { data } = await supabase.auth.getSession();
        userEmail = data?.session?.user?.email ?? '';
        isValidator = userEmail === 'validaciones@takeover.com';
    }
</script>
<section class="menu">
	{#if isValidator}
		<a href="/validate">Validar QR</a>
	{:else}
	<a href="/home">Home</a>
	<a href="/newEvent">Nuevo Evento</a>
	<a href="/events">Eventos</a>
	<a href="/newTicket">Generar ticket</a>
	<a href="/validate">Validar QR</a>
	<a href="/reenviarTickets">Reenviar Tickets</a>
	<a href="/teamMembers">Equipo</a>
	{/if}
</section>

<style>
	.menu {
		display: flex;
		padding: 20px;
		flex-direction: column;
		gap: 15px;
		justify-content: start;
		align-items: start;
		color: rgb(245, 245, 239);
	}
</style>
