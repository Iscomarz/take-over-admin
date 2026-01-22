<script>
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let status = 'success'; // 'success', 'already-validated', 'not-found'
	export let clientName = '';

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	$: statusConfig = {
		success: {
			icon: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z',
			color: 'text-green-400',
			bgColor: 'bg-green-900/20',
			borderColor: 'border-green-500/50',
			title: '✓ Acceso Válido',
			message: clientName ? `${clientName} puede entrar` : 'El cliente puede entrar'
		},
		'already-validated': {
			icon: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z',
			color: 'text-yellow-400',
			bgColor: 'bg-yellow-900/20',
			borderColor: 'border-yellow-500/50',
			title: '⚠ Ya Validado',
			message: 'Este QR ya fue validado anteriormente'
		},
		'not-found': {
			icon: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z',
			color: 'text-red-400',
			bgColor: 'bg-red-900/20',
			borderColor: 'border-red-500/50',
			title: '✗ QR No Válido',
			message: 'El código QR no se encuentra en el sistema'
		}
	}[status];
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="button"
		tabindex="0"
	>
		<div
			class="bg-gray-900 rounded-3xl shadow-2xl border-2 {statusConfig.borderColor} max-w-md w-full transform transition-all animate-scale-in"
		>
			<!-- Icono y Estado -->
			<div class="p-8 text-center">
				<div
					class="w-24 h-24 mx-auto mb-6 rounded-full {statusConfig.bgColor} flex items-center justify-center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-16 h-16 {statusConfig.color}"
						fill="currentColor"
						viewBox="0 0 256 256"
					>
						<path d={statusConfig.icon}></path>
					</svg>
				</div>

				<h2 class="text-2xl font-bold mb-3 {statusConfig.color}">
					{statusConfig.title}
				</h2>

				<p class="text-gray-300 text-lg mb-6">
					{statusConfig.message}
				</p>

				{#if status === 'success'}
					<div class="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
						<p class="text-sm text-gray-400 mb-1">Estado</p>
						<p class="text-green-400 font-semibold text-lg">Entrada Autorizada</p>
					</div>
				{/if}
			</div>

			<!-- Botones -->
			<div class="px-6 pb-6">
				<button
					on:click={close}
					class="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold transition-colors border border-gray-600 text-lg"
				>
					{status === 'success' ? 'Siguiente' : 'Intentar de Nuevo'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-scale-in {
		animation: scale-in 0.2s ease-out;
	}
</style>
