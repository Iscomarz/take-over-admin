<script>
    import { referenciaValida } from '$lib/stores/qrValidate';
    import { get } from 'svelte/store';

    let referencia;

    $:{
        referencia = get(referenciaValida);
    }
</script>

<h1>Referencia valida: {referencia}</h1>