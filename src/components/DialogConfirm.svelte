<script>
	export let mensaje = "";
	export let onConfirm;
	export let onCancel;
    export let titulo = "";
</script>

<div class="dialogo">
    <h3>{titulo}</h3>
	<p>{mensaje}</p>
	<div class="botones">
		<button on:click={onConfirm} class="confirmar">Confirmar</button>
		<button on:click={onCancel} class="cancelar">Cancelar</button>
	</div>
</div>

<style>
	.dialogo {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: rgb(52, 52, 52);
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
		text-align: center;
		z-index: 1000;
	}
	.botones {
		margin-top: 15px;
		display: flex;
		justify-content: center;
		gap: 10px;
	}
	.confirmar {
		background-color: brown;
		color: white;
		padding: 8px 12px;
		border-radius: 4px;
	}
	.confirmar:hover {
		background-color: darkred;
	}
	.cancelar {
		background-color: grey;
		color: white;
		padding: 8px 12px;
		border-radius: 4px;
	}
	.cancelar:hover {
		background-color: darkgrey;
	}
</style>
