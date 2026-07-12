<!--
  Duelo (arena top-down). Modelo Híbrido: turnos + leitura, contra a IA leitora.
  Porte de prototype/js/game.js. Motor: engine.js · IA: ai.js · Cartas: cards.js.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import * as Cards from '$lib/game/cards.js';
	import * as Engine from '$lib/game/engine.js';
	import * as AI from '$lib/game/ai.js';
	import { decksStore } from '$lib/game/decks.svelte.js';
	import { perfilStore } from '$lib/game/perfil.svelte.js';
	import Carta from './Carta.svelte';
	import Pilha from './Pilha.svelte';
	import DefesaControles from './DefesaControles.svelte';

	let { onSair } = $props();

	const CUSTO = Engine.CONST.CUSTO_ESPECIAL;

	// ---- estado do duelo ----
	let fase = $state('escolha'); // 'escolha' | 'jogo' | 'fim'
	let ocupado = $state(false);
	let estado = $state(null); // estado do motor (A = você, B = IA)
	let cartaEu = $state(null);
	let cartaIA = $state(null);
	let memIA = { atkHist: [], defHist: [] };
	let reveal = $state(null);
	let logMsg = $state('Escolha seu campeão.');
	let fimResult = $state(null); // 'A' (você venceu) | 'B' (IA venceu)

	const EU = 'A';

	// mão de escolha: o deck ativo do jogador (fallback: deck padrão)
	const mao = $derived.by(() => {
		const l = decksStore.deckAtual.map((id) => Cards.porId(id)).filter(Boolean);
		return l.length ? l : Cards.deckPadrao();
	});

	const euAtaca = $derived(estado ? estado.atacante === EU : false);
	const contador = $derived(
		fase === 'escolha' ? 'PREPARAÇÃO' : 'RODADA ' + (estado.rodada + 1)
	);
	const venceu = $derived(fimResult === EU);
	const podeEsp = $derived(estado ? Engine.podeEspecial(estado.A) : false);

	// zona derrotada / descarte derivados do resultado
	const meDerrotada = $derived(fimResult === 'B');
	const opDerrotada = $derived(fimResult === 'A');

	// ---- timers (limpos ao desmontar) ----
	let timers = [];
	function later(fn, ms) {
		const t = setTimeout(fn, ms);
		timers.push(t);
	}
	onDestroy(() => timers.forEach(clearTimeout));

	// ---- fluxo ----
	function iniciar() {
		const deckIA = Cards.deckAleatorio(5);
		cartaIA = deckIA[Math.floor(Math.random() * deckIA.length)];
		cartaEu = null;
		estado = null;
		memIA = { atkHist: [], defHist: [] };
		reveal = null;
		fimResult = null;
		ocupado = false;
		fase = 'escolha';
		logMsg = 'Escolha seu campeão para o duelo.';
	}

	function escolherCampeao(c) {
		cartaEu = c;
		estado = Engine.criarEstado(
			cartaEu,
			cartaIA,
			'Você',
			'Adversário',
			Math.random() < 0.5 ? 'A' : 'B'
		);
		fase = 'jogo';
		reveal = null;
		logMsg =
			estado.atacante === EU
				? `${cartaEu.nome} entra com a iniciativa — desfira o primeiro golpe.`
				: `${cartaIA.nome} é mais veloz e ataca primeiro — leia o golpe e defenda.`;
	}

	function resolverComoAtacante(tipo) {
		if (ocupado) return;
		ocupado = true;
		finalizar({ tipo }, AI.leitor.defender(estado.B, estado.A, memIA), EU);
	}
	function resolverComoDefensor(preve, aposta) {
		if (ocupado) return;
		ocupado = true;
		finalizar(AI.leitor.atacar(estado.B, estado.A, memIA), { preve, aposta }, 'B');
	}

	function finalizar(ja, jd, atacanteKey) {
		const r = Engine.aplicarTroca(estado, ja, jd);
		// a IA memoriza o que VOCÊ fez nesta troca
		if (atacanteKey === EU) memIA.atkHist.push(r.tipo);
		else memIA.defHist.push(jd.preve);

		const euAtacou = atacanteKey === EU;
		const defNome = euAtacou ? cartaIA.nome : 'Você';
		reveal = {
			atkNome: euAtacou ? 'Você' : cartaIA.nome,
			defNome,
			esp: r.tipo === 'especial',
			acertou: r.acertou,
			preve: jd.preve,
			aposta: r.aposta
		};

		if (r.acertou) {
			let msg = `${defNome} LEU o golpe! Bloqueou — só ${r.dano} de dano`;
			if (r.contra > 0) msg += ` e contra-atacou (+${r.contra})`;
			logMsg = msg + '.';
		} else {
			logMsg = `${defNome} errou a leitura — tomou ${r.dano} de dano cheio.`;
		}

		later(() => {
			ocupado = false;
			if (r.fim) later(() => fimDeJogo(r.fim), 600);
		}, 1100);
	}

	function fimDeJogo(fim) {
		perfilStore.registrarPartida(fim === EU, cartaEu && cartaEu.id);
		fimResult = fim;
		fase = 'fim';
	}

	onMount(iniciar);
</script>

<section id="tela-duel" class="tela ativa">
	<div class="duel-top">
		<button class="btn" onclick={() => onSair()}>‹ Sair</button>
		<div class="titulo">Arena de Duelos</div>
		<span class="badge-modo">Duelo Amistoso</span>
	</div>

	<div class="playmat">
		<!-- efeitos da arena -->
		<div class="arena-fx" aria-hidden="true">
			<div class="grid-glow"></div>
			<span class="beam b1"></span><span class="beam b2"></span><span class="beam b3"></span>
			<div class="ring"></div>
			<div class="ring r2"></div>
		</div>

		<!-- ADVERSÁRIO (topo) -->
		<div class="lado-mat op">
			<div class="mat-hud op">
				<div class="avatar">🗿</div>
				<div class="info-jog">
					<div class="nome">{cartaIA?.nome ?? 'Adversário'}</div>
					<div class="barra-vida">
						<i style="width:{estado ? Math.max(0, (estado.B.vida / estado.B.vidaMax) * 100) : 100}%"></i>
						<span>{estado ? `${estado.B.vida} / ${estado.B.vidaMax}` : '— / —'}</span>
					</div>
					<div class="barra-ene">
						<i
							style="width:{estado
								? Math.max(0, (estado.B.energia / Engine.energiaMax(estado.B)) * 100)
								: 0}%"
						></i>
						<span>ENE {estado ? estado.B.energia : 0}</span>
					</div>
				</div>
				{#if fase !== 'escolha'}
					<div class="papel-tag {euAtaca ? 'def' : 'atk'}">{euAtaca ? '🛡 DEFENDE' : '⚔ ATACA'}</div>
				{/if}
			</div>
			<div class="mat-zonas">
				<div class="zona deck">
					<div class="zona-slot"><Pilha n={fase === 'escolha' ? 5 : 4} /></div>
					<div class="zona-rotulo">Deck</div>
				</div>
				<div class="zona ataque" class:derrotada={opDerrotada}>
					<div class="zona-slot">{#if fase !== 'escolha' && cartaIA}<Carta carta={cartaIA} />{/if}</div>
					<div class="zona-rotulo">Ataque</div>
				</div>
				<div class="zona descarte">
					<div class="zona-slot">
						<Pilha n={opDerrotada ? 1 : 0} cartaFrente={opDerrotada ? cartaIA : null} />
					</div>
					<div class="zona-rotulo">Descarte</div>
				</div>
			</div>
		</div>

		<!-- CENTRO -->
		<div class="mat-centro">
			<div class="linha-batalha"></div>
			<div class="contador-rodada">{contador}</div>
			<div class="reveal">
				{#if reveal}
					<div class="rev-lado atk">
						<div class="rev-quem">{reveal.atkNome} ataca</div>
						<div class="rev-badge {reveal.esp ? 'esp' : ''}">
							{reveal.esp ? '✦ ESPECIAL' : '⚔ NORMAL'}
						</div>
					</div>
					<div class="rev-vs">⚔</div>
					<div class="rev-lado def">
						<div class="rev-quem">{reveal.defNome} defende</div>
						<div class="rev-badge {reveal.acertou ? 'ok' : 'miss'}">
							🛡 previu {reveal.preve === 'especial' ? 'ESPECIAL' : 'NORMAL'} · ⚡{reveal.aposta}
						</div>
					</div>
				{/if}
			</div>
			<div class="log-combate">{logMsg}</div>
		</div>

		<!-- VOCÊ (base) -->
		<div class="lado-mat eu">
			<div class="mat-zonas">
				<div class="zona descarte">
					<div class="zona-slot">
						<Pilha n={meDerrotada ? 1 : 0} cartaFrente={meDerrotada ? cartaEu : null} />
					</div>
					<div class="zona-rotulo">Descarte</div>
				</div>
				<div class="zona ataque" class:derrotada={meDerrotada}>
					<div class="zona-slot">{#if fase !== 'escolha' && cartaEu}<Carta carta={cartaEu} />{/if}</div>
					<div class="zona-rotulo">Ataque</div>
				</div>
				<div class="zona deck">
					<div class="zona-slot"><Pilha n={fase === 'escolha' ? 5 : 4} /></div>
					<div class="zona-rotulo">Deck</div>
				</div>
			</div>
			<div class="mat-hud eu">
				<div class="avatar">🛡️</div>
				<div class="info-jog">
					<div class="nome">{cartaEu?.nome ?? 'Você'}</div>
					<div class="barra-vida">
						<i style="width:{estado ? Math.max(0, (estado.A.vida / estado.A.vidaMax) * 100) : 100}%"></i>
						<span>{estado ? `${estado.A.vida} / ${estado.A.vidaMax}` : '— / —'}</span>
					</div>
					<div class="barra-ene">
						<i
							style="width:{estado
								? Math.max(0, (estado.A.energia / Engine.energiaMax(estado.A)) * 100)
								: 0}%"
						></i>
						<span>ENE {estado ? estado.A.energia : 0}</span>
					</div>
				</div>
				{#if fase !== 'escolha'}
					<div class="papel-tag {euAtaca ? 'atk' : 'def'}">{euAtaca ? '⚔ ATACA' : '🛡 DEFENDE'}</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- BARRA DE COMANDO dinâmica -->
	<div class="comando-barra">
		{#if fase === 'escolha'}
			<div class="esc-campeao">
				<div class="cmd-titulo">Escolha seu campeão</div>
				<div class="esc-mao">
					{#each mao as c (c.id)}
						<Carta carta={c} onclick={() => escolherCampeao(c)} />
					{/each}
				</div>
			</div>
		{:else if ocupado}
			<div class="cmd-espera">Resolvendo…</div>
		{:else if fase === 'jogo' && euAtaca}
			<div class="cmd-box">
				<div class="cmd-titulo">Você ataca — escolha o golpe</div>
				<div class="cmd-acoes">
					<button class="cmd-btn ata-normal" onclick={() => resolverComoAtacante('normal')}
						>⚔ Golpe Normal</button
					>
					<button
						class="cmd-btn ata-especial esp"
						disabled={!podeEsp}
						onclick={() => resolverComoAtacante('especial')}>✦ Golpe Especial (⚡{CUSTO})</button
					>
				</div>
				{#if !podeEsp}
					<div class="cmd-dica">
						Energia insuficiente para o Especial ({estado.A.energia}/{CUSTO}).
					</div>
				{/if}
			</div>
		{:else if fase === 'jogo'}
			{#key estado.rodada}
				<DefesaControles energiaMax={estado.A.energia} onConfirmar={resolverComoDefensor} />
			{/key}
		{/if}
	</div>
</section>

<!-- FIM DE JOGO -->
{#if fase === 'fim'}
	<div class="fim-fundo ativa">
		<div class="fim-card moldura">
			<h1 class={venceu ? 'venceu' : 'perdeu'}>{venceu ? 'Vitória!' : 'Derrota'}</h1>
			<p>
				{venceu
					? 'Você leu melhor o adversário.'
					: 'O adversário leu melhor desta vez.'}
			</p>
			<button class="btn btn-ouro" onclick={iniciar}>Revanche ⚔</button>
			<button class="btn" style="margin-top:10px" onclick={() => onSair()}>Voltar ao Lobby</button>
		</div>
	</div>
{/if}
