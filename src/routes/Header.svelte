<script>
    import supabase from '$lib/supabase';
    import {goto} from '$app/navigation';

    let salir = false;
    let token = '';

    if(typeof window !== 'undefined'){
        token = localStorage.getItem('token')
    }

    $:{ salir = token !== null }

    async function cerrarSesion() {
        salir = false;
        localStorage.removeItem('token')
        await supabase.auth.signOut()
        goto('/')
    }
</script>
<h1>Header</h1>
{#if salir}
   <button on:click={cerrarSesion}>Salir</button> 
{/if}

<a href="/home">Home</a>
