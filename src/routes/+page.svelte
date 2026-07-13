<script>
	import { goto, invalidate } from '$app/navigation';
	import Lobby from '$lib/components/Lobby.svelte';
	import DeckBuilder from '$lib/components/DeckBuilder.svelte';
	import Duelo from '$lib/components/Duelo.svelte';
	import CartaModal from '$lib/components/CartaModal.svelte';
	import PerfilModal from '$lib/components/PerfilModal.svelte';
	import { ui } from '$lib/game/ui.svelte.js';
	import { perfilStore } from '$lib/game/perfil.svelte.js';
	import { decksStore } from '$lib/game/decks.svelte.js';

	let { data } = $props();

	// hidrata perfil + decks/posse (do Supabase, carregados no server) no client e
	// dá acesso ao cliente Supabase p/ as mutações. Só re-hidrata se o usuário mudar.
	$effect(() => {
		perfilStore.init(data.supabase, data.user, data.profile);
		decksStore.init(data.supabase, data.user, data.decks, data.owned);
	});

	// navegação entre telas (SPA, como no protótipo): 'lobby' | 'colecao' | 'duelo'
	let view = $state('lobby');

	async function sair() {
		await data.supabase.auth.signOut();
		await invalidate('supabase:auth');
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Arkania Card Wars — Arena de Duelos</title>
</svelte:head>

{#if view === 'lobby'}
	<Lobby
		nome={data.profile?.username}
		onAbrirDeck={() => (view = 'colecao')}
		onStart={() => (view = 'duelo')}
		onLogout={sair}
	/>
{:else if view === 'colecao'}
	<DeckBuilder onVoltar={() => (view = 'lobby')} />
{:else}
	<Duelo onSair={() => (view = 'lobby')} />
{/if}

<CartaModal />
{#if ui.perfilAberto}
	<PerfilModal />
{/if}
