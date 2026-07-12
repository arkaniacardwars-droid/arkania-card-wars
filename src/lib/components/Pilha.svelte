<!-- Pilha de cartas do playmat: versos empilhados (deck) ou a carta de frente
     (descarte). Porte de pilha() em prototype/js/game.js. -->
<script>
	import Carta from './Carta.svelte';

	let { n = 0, cartaFrente = null } = $props();
	const mostra = $derived(Math.min(n, 3));
</script>

{#if n}
	<div class="pilha">
		{#each Array(mostra) as _, i (i)}
			{@const t = `transform:translate(${i * 2}px,${-i * 2}px)`}
			{#if cartaFrente && i === mostra - 1}
				<Carta carta={cartaFrente} style={t} />
			{:else}
				<div class="carta verso" style={t}></div>
			{/if}
		{/each}
		<div class="pilha-num">{n}</div>
	</div>
{/if}
