<script>
	import Lobby from '$lib/components/Lobby.svelte';
	import DeckBuilder from '$lib/components/DeckBuilder.svelte';
	import Duelo from '$lib/components/Duelo.svelte';
	import CartaModal from '$lib/components/CartaModal.svelte';
	import PerfilModal from '$lib/components/PerfilModal.svelte';
	import { ui } from '$lib/game/ui.svelte.js';

	// navegação entre telas (SPA, como no protótipo): 'lobby' | 'colecao' | 'duelo'
	let view = $state('lobby');
</script>

<svelte:head>
	<title>Arkania Card Wars — Arena de Duelos</title>
</svelte:head>

{#if view === 'lobby'}
	<Lobby onAbrirDeck={() => (view = 'colecao')} onStart={() => (view = 'duelo')} />
{:else if view === 'colecao'}
	<DeckBuilder onVoltar={() => (view = 'lobby')} />
{:else}
	<Duelo onSair={() => (view = 'lobby')} />
{/if}

<CartaModal />
{#if ui.perfilAberto}
	<PerfilModal />
{/if}
