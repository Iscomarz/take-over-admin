<script>
	export let nombreEvento;
	export let image;
	export let venue;
	export let id;
	export let loadingImage = true;
	export let horizontal = false;
</script>

{#if horizontal}
	<div
		class="bg-stone-800/70 border border-stone-700 rounded-2xl shadow-lg overflow-hidden hover:border-stone-600 transition-all duration-300 hover:shadow-xl flex items-center p-3 gap-4"
	>
		{#if loadingImage}
			<div class="w-32 h-24 bg-stone-700 animate-pulse rounded-xl flex-shrink-0"></div>
		{:else}
			<a href={`/events/event/${id}`} class="block flex-shrink-0">
				<img class="w-32 h-24 object-cover rounded-xl" src={image} alt={nombreEvento} />
			</a>
		{/if}

		<div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div class="min-w-0">
				<a href={`/events/event/${id}`} class="block">
					<h5
						class="text-lg font-bold tracking-tight text-white hover:text-stone-300 transition-colors truncate"
					>
						{nombreEvento}
					</h5>
				</a>
				<p class="text-sm font-normal text-stone-400 truncate mt-1">{venue}</p>
			</div>

			<a
				href={`/events/event/${id}`}
				class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-stone-700 rounded-xl hover:bg-stone-600 focus:ring-4 focus:outline-none focus:ring-stone-500 border border-stone-600 transition-colors gap-2 no-underline whitespace-nowrap self-start sm:self-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"
					></path>
				</svg>
				Administrar
			</a>
		</div>
	</div>
{:else}
	<div
		class="bg-stone-800/70 border border-stone-700 rounded-2xl shadow-lg overflow-hidden hover:border-stone-600 transition-all duration-300 hover:shadow-xl hover:scale-105"
	>
		{#if loadingImage}
			<div class="w-full h-48 bg-stone-700 animate-pulse"></div>
		{:else}
			<a href={`/events/event/${id}`} class="block">
				<img class="w-full h-48 object-cover" src={image} alt={nombreEvento} />
			</a>
		{/if}

		<div class="p-5">
			<a href={`/events/event/${id}`} class="block">
				<h5
					class="mb-2 text-xl font-bold tracking-tight text-white hover:text-stone-300 transition-colors"
				>
					{nombreEvento}
				</h5>
			</a>
			<p class="mb-4 font-normal text-stone-400">{venue}</p>
			<a
				href={`/events/event/${id}`}
				class="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-stone-700 rounded-xl hover:bg-stone-600 focus:ring-4 focus:outline-none focus:ring-stone-500 border border-stone-600 transition-colors gap-2 no-underline"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="currentColor"
					viewBox="0 0 256 256"
				>
					<path
						d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"
					></path>
				</svg>
				Administrar
			</a>
		</div>
	</div>
{/if}

<style>
	a {
		text-decoration: none;
	}
</style>
