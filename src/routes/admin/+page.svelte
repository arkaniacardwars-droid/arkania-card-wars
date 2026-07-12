<!--
  Painel Admin — editor de cartas (nome, tipo, raridade, 6 stats, habilidades),
  com preview ao vivo. Salva via store.svelte.js (banco local hoje; Supabase
  depois, sem mudar esta tela). Porte de prototype/admin.html + js/admin.js.
-->
<script>
	import '$lib/game/admin.css';
	import * as Cards from '$lib/game/cards.js';
	import * as Store from '$lib/game/store.svelte.js';
	import Carta from '$lib/components/Carta.svelte';

	const raridades = Object.keys(Cards.RARIDADES).sort(
		(a, b) => Cards.RARIDADES[a].ordem - Cards.RARIDADES[b].ordem
	);

	let versao = $state(0); // ↑ força recomputar a lista após salvar
	let atual = $state(null); // cópia de trabalho da carta selecionada
	let habsText = $state('');
	let ok = $state(false);
	let okTimer;

	const lista = $derived.by(() => {
		versao; // dependência
		return Cards.todas();
	});

	function parseHabs(t) {
		return t
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	// preview ao vivo: cópia + habilidades do textarea
	const cartaPreview = $derived(atual ? { ...atual, habilidades: parseHabs(habsText) } : null);
	const nota = $derived(cartaPreview ? Cards.nota(cartaPreview) : '–');

	function selecionar(c) {
		atual = { ...c, stats: { ...c.stats }, habilidades: [...(c.habilidades || [])] };
		habsText = (c.habilidades || []).join('\n');
	}

	// trocar raridade: novo teto → clampa os stats à faixa
	function aoTrocarRaridade() {
		if (!atual) return;
		Cards.ATTR_ORDEM.forEach((k) => {
			atual.stats[k] = Math.max(
				Cards.statMin(k),
				Math.min(Cards.statMax(k, atual.raridade), atual.stats[k] | 0)
			);
		});
	}

	function salvar(e) {
		e.preventDefault();
		if (!atual) return;
		Store.salvarCarta(atual.id, {
			nome: atual.nome,
			tipo: atual.tipo,
			raridade: atual.raridade,
			stats: atual.stats,
			habilidades: parseHabs(habsText)
		});
		versao++;
		ok = true;
		clearTimeout(okTimer);
		okTimer = setTimeout(() => (ok = false), 1600);
	}

	function reverter() {
		if (!atual) return;
		if (!confirm(`Reverter "${atual.nome}" para o padrão? (recarrega a página)`)) return;
		Store.resetarCarta(atual.id);
		location.reload();
	}
	function resetarTudo() {
		if (!confirm('Resetar TODAS as cartas para o padrão? (recarrega a página)')) return;
		Store.resetarTudo();
		location.reload();
	}
	function exportar() {
		const blob = new Blob([Store.exportar()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'arkania-cartas.json';
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}
</script>

<svelte:head>
	<title>Arkania — Painel Admin</title>
</svelte:head>

<div class="admin-body">
	<header class="adm-top">
		<div class="adm-marca">ARKANIA <small>· Painel Admin</small></div>
		<div class="adm-top-acoes">
			<a class="btn" href="/">‹ Voltar ao jogo</a>
			<button class="btn" onclick={exportar}>⤓ Exportar JSON</button>
			<button class="btn" onclick={resetarTudo}>↺ Resetar tudo</button>
		</div>
	</header>

	<div class="adm-aviso">
		As alterações salvam no <b>banco local</b> (este navegador) e já valem no jogo. Para valer
		<b>online, pra todos</b>, plugamos o backend depois — a camada de dados já está pronta pra isso.
	</div>

	<main class="adm-main">
		<!-- lista de cartas -->
		<aside class="adm-lista">
			{#each lista as c (c.id)}
				<button
					type="button"
					class="adm-item t-{Cards.tipo(c)}"
					class:sel={atual?.id === c.id}
					onclick={() => selecionar(c)}
				>
					<span class="adm-item-nota">{Cards.nota(c)}</span>
					<span class="adm-item-nome">{c.nome}</span>
					<span class="adm-item-tipo">{Cards.tipo(c)}</span>
				</button>
			{/each}
		</aside>

		<!-- editor -->
		<section class="adm-editor">
			{#if !atual}
				<div class="adm-vazio">← Selecione uma carta para editar.</div>
			{:else}
				<form class="adm-form" onsubmit={salvar}>
					<div class="adm-form-grid">
						<!-- preview -->
						<div class="adm-preview">
							<div class="adm-preview-carta"><Carta carta={cartaPreview} /></div>
							<div class="adm-nota">Nota (média): <b>{nota}</b></div>
						</div>

						<!-- campos -->
						<div class="adm-campos">
							<label class="adm-campo">
								<span>Nome</span>
								<input type="text" maxlength="28" bind:value={atual.nome} />
							</label>

							<div class="adm-dupla">
								<label class="adm-campo">
									<span>Tipo</span>
									<select bind:value={atual.tipo}>
										<option value="HERO">HERO — Herói</option>
										<option value="SUPP">SUPP — Suporte</option>
									</select>
								</label>
								<label class="adm-campo">
									<span>Raridade</span>
									<select bind:value={atual.raridade} onchange={aoTrocarRaridade}>
										{#each raridades as r (r)}
											<option value={r}>{Cards.RARIDADES[r].nome}</option>
										{/each}
									</select>
								</label>
							</div>

							<div class="adm-stats">
								{#each Cards.ATTR_ORDEM as k (k)}
									<div class="adm-stat">
										<div class="adm-stat-top">
											<label for="stat-{k}">{k} · {Cards.ATTR_NOME[k]}</label>
											<b>{atual.stats[k] | 0}</b>
										</div>
										<input
											id="stat-{k}"
											type="range"
											min={Cards.statMin(k)}
											max={Cards.statMax(k, atual.raridade)}
											bind:value={atual.stats[k]}
										/>
									</div>
								{/each}
							</div>

							<label class="adm-campo">
								<span>Habilidades (uma por linha)</span>
								<textarea
									rows="4"
									placeholder="Ex.: Ao entrar, cura 5 de vida do aliado."
									bind:value={habsText}
								></textarea>
							</label>

							<div class="adm-form-acoes">
								<button type="submit" class="btn btn-ouro">Salvar</button>
								<button type="button" class="btn" onclick={reverter}>Reverter ao padrão</button>
								<span class="adm-ok" class:oculto={!ok}>✓ Salvo</span>
							</div>
						</div>
					</div>
				</form>
			{/if}
		</section>
	</main>
</div>
