<script>
	import Lobby from '$lib/components/Lobby.svelte';
	import DeckBuilder from '$lib/components/DeckBuilder.svelte';
	import CartaModal from '$lib/components/CartaModal.svelte';
	import PerfilModal from '$lib/components/PerfilModal.svelte';
	import { ui } from '$lib/game/ui.svelte.js';

	// navegação entre telas (SPA, como no protótipo): 'lobby' | 'colecao'
	let view = $state('lobby');

	function start() {
		alert(
			'Duelo em breve — a arena (motor de combate) já está portada; falta ligar a UI do duelo e o matchmaking online.'
		);
	}
</script>

<svelte:head>
	<title>Arkania Card Wars — Arena de Duelos</title>
</svelte:head>

{#if view === 'lobby'}
	<Lobby onAbrirDeck={() => (view = 'colecao')} onStart={start} />
{:else}
	<DeckBuilder onVoltar={() => (view = 'lobby')} />
{/if}

<CartaModal />
{#if ui.perfilAberto}
	<PerfilModal />
{/if}
