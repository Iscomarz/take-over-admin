<script>
     import { page } from "$app/stores";
    import Header from "./Header.svelte";
    import '../app.css'

    let showHeader = false;
    $: currentPath = $page.url.pathname;
    $: showHeader = currentPath !== "/";
</script>

<div class="app">
    {#if showHeader}
        <Header />
    {/if}

    <main>
        <slot />
    </main>

    <footer>
        <p>Footer</p>
    </footer>
</div>

<style>
    .app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>