<script>
    import { onDestroy } from 'svelte';
    import { eventoId } from '$lib/stores/eventoId';

    let id;

    const unsubscribe = eventoId.subscribe(value => {
        id = value; // Almacenamos el valor del store
    });

    onDestroy(unsubscribe); // Limpiamos la suscripción al destruir el componente
</script>

<h1>Detalle del evento con ID: {id}</h1>
