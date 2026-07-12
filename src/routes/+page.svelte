<script lang="ts">
	import * as Cards from '$lib/game/cards';

	let { data } = $props();

	const colecao = Cards.todas();
	const porRaridade = Cards.RARIDADES;

	// status de conexão (só reflete se a sessão carregou; não bate no banco ainda)
	const autenticado = $derived(!!data.user);
</script>

<svelte:head>
	<title>Arkania Card Wars — Arena de Duelos</title>
</svelte:head>

<main>
	<header>
		<h1>Arkania <span>Card Wars</span></h1>
		<p class="sub">Arena Imperial · protótipo online (SvelteKit + Supabase)</p>
		<p class="status" class:on={autenticado}>
			{autenticado ? `Sessão: ${data.user?.email ?? 'ativa'}` : 'Sem sessão (auth ainda não ligado)'}
		</p>
		<p class="count">{colecao.length} cartas no catálogo</p>
	</header>

	<section class="grid">
		{#each colecao as c (c.id)}
			{@const rar = porRaridade[c.raridade]}
			{@const arte = Cards.urlArte(c)}
			<article class="carta" style="--rar:{rar.cor}">
				<div class="thumb">
					{#if arte}
						<img src={arte} alt={c.nome} loading="lazy" />
					{:else}
						<span class="emoji">{c.emoji}</span>
					{/if}
					<b class="nota">{Cards.nota(c)}</b>
				</div>
				<div class="meta">
					<strong>{c.nome}</strong>
					<small>{rar.nome} · {Cards.tipoNome(c)} · {c.dom}</small>
				</div>
			</article>
		{/each}
	</section>
</main>

<style>
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}
	header {
		text-align: center;
		margin-bottom: 2rem;
	}
	h1 {
		font-size: clamp(2rem, 6vw, 3.5rem);
		letter-spacing: 0.06em;
		margin: 0;
		color: var(--ak-ouro);
		text-shadow: 0 2px 12px rgb(0 0 0 / 0.6);
	}
	h1 span {
		color: var(--ak-texto);
	}
	.sub {
		opacity: 0.75;
		margin: 0.25rem 0 0.75rem;
	}
	.status {
		display: inline-block;
		font-size: 0.8rem;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		border: 1px solid #6b5a2e;
		opacity: 0.8;
	}
	.status.on {
		border-color: #3fcf7a;
		color: #3fcf7a;
	}
	.count {
		opacity: 0.55;
		font-size: 0.85rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
	}
	.carta {
		border: 2px solid var(--rar);
		border-radius: 12px;
		overflow: hidden;
		background: #1c160f;
		box-shadow: 0 6px 20px rgb(0 0 0 / 0.45);
		transition: transform 0.15s ease;
	}
	.carta:hover {
		transform: translateY(-4px);
	}
	.thumb {
		position: relative;
		aspect-ratio: 3 / 4;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 50% 30%, #2a2114, #141009);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.emoji {
		font-size: 3.5rem;
	}
	.nota {
		position: absolute;
		top: 6px;
		left: 6px;
		background: var(--rar);
		color: #0e0b06;
		font-weight: 800;
		padding: 0.1rem 0.45rem;
		border-radius: 6px;
		font-size: 0.85rem;
	}
	.meta {
		padding: 0.55rem 0.6rem 0.7rem;
	}
	.meta strong {
		display: block;
		font-size: 0.95rem;
	}
	.meta small {
		opacity: 0.6;
		font-size: 0.72rem;
	}
</style>
