/*
 * Arkania Card Wars — Duelo local (modelo Híbrido: turnos + leitura) contra a IA leitora.
 * Motor: engine.js · Cartas: cards.js · IA: ai.js (AI.leitor).
 * Expõe window.ArkaniaDuel.iniciar({ aposta: bool }).
 */
(function (global) {
  'use strict';

  var Engine = global.ArkaniaEngine;
  var Cards = global.ArkaniaCards;
  var AI = global.ArkaniaAI;

  var estado, memIA, modoAposta, fase, ocupado, cartaEu, cartaIA;
  var el = {};

  function q(id) { return document.getElementById(id); }
  function outra(k) { return k === 'A' ? 'B' : 'A'; }
  var EU = 'A', IA = 'B'; // o jogador é sempre A; a IA é B

  function bind() {
    ['op-nome','op-vida-bar','op-vida-txt','op-ene-bar','op-ene-txt','op-papel',
     'op-deck','op-ataque','op-descarte',
     'me-nome','me-vida-bar','me-vida-txt','me-ene-bar','me-ene-txt','me-papel',
     'me-deck','me-ataque','me-descarte',
     'reveal','log-combate','contador-rodada','comando-din','badge-modo-duelo',
     'fim-fundo','fim-titulo','fim-sub'].forEach(function (id) {
      el[id.replace(/-/g, '_')] = q(id);
    });
  }

  // pilha de cartas (deck = versos; descarte = a carta derrotada, de frente)
  function pilha(slot, n, cartaFrente) {
    slot.innerHTML = '';
    if (!n) return;
    var p = document.createElement('div');
    p.className = 'pilha';
    var mostra = Math.min(n, 3);
    for (var i = 0; i < mostra; i++) {
      var c;
      if (cartaFrente && i === mostra - 1) { c = Cards.el(cartaFrente); }
      else { c = document.createElement('div'); c.className = 'carta verso'; }
      c.style.transform = 'translate(' + (i * 2) + 'px,' + (-i * 2) + 'px)';
      p.appendChild(c);
    }
    var num = document.createElement('div');
    num.className = 'pilha-num';
    num.textContent = n;
    p.appendChild(num);
    slot.appendChild(p);
  }

  function limparZonas() {
    [el.op_ataque, el.me_ataque, el.op_deck, el.me_deck, el.op_descarte, el.me_descarte]
      .forEach(function (z) { if (z) z.innerHTML = ''; });
    [el.op_ataque, el.me_ataque].forEach(function (z) {
      if (z && z.parentNode) z.parentNode.classList.remove('derrotada');
    });
  }

  function iniciar(opts) {
    if (!el.reveal) bind();
    modoAposta = !!(opts && opts.aposta);
    el.badge_modo_duelo.textContent = modoAposta ? '⚔ MODO APOSTA' : 'Duelo Amistoso';
    el.badge_modo_duelo.style.color = modoAposta ? 'var(--for)' : 'var(--texto-suave)';

    // IA sorteia seu campeão agora; jogador escolhe o dele.
    var deckIA = Cards.deckAleatorio(5);
    cartaIA = deckIA[Math.floor(Math.random() * deckIA.length)];
    cartaEu = null;
    estado = null; memIA = { atkHist: [], defHist: [] };
    fase = 'escolha'; ocupado = false;

    el.contador_rodada.textContent = 'PREPARAÇÃO';
    el.log_combate.textContent = 'Escolha seu campeão para o duelo.';
    el.reveal.innerHTML = '';
    el.op_papel.textContent = ''; el.me_papel.textContent = '';
    limparZonas();
    pilha(el.op_deck, 5); pilha(el.me_deck, 5); // decks iniciais (versos)
    renderEscolha();
    global.ArkaniaNav.mostrar('duel');
  }

  // ---------- fase de escolha do campeão ----------
  function renderEscolha() {
    var mao = Cards.deckPadrao();
    var box = document.createElement('div');
    box.className = 'esc-campeao';
    box.innerHTML = '<div class="cmd-titulo">Escolha seu campeão</div>';
    var linha = document.createElement('div');
    linha.className = 'esc-mao';
    mao.forEach(function (c) {
      var cel = Cards.el(c, 'mini');
      cel.style.cursor = 'pointer';
      cel.addEventListener('click', function () { escolherCampeao(c); });
      linha.appendChild(cel);
    });
    box.appendChild(linha);
    el.comando_din.innerHTML = '';
    el.comando_din.appendChild(box);
  }

  function escolherCampeao(c) {
    cartaEu = c;
    estado = Engine.criarEstado(cartaEu, cartaIA, 'Você', 'Adversário',
      Math.random() < 0.5 ? 'A' : 'B');
    fase = 'jogo';
    // campeões entram na zona de Ataque; o deck fica com o restante
    el.op_ataque.appendChild(Cards.el(cartaIA));
    el.me_ataque.appendChild(Cards.el(cartaEu));
    pilha(el.op_deck, 4); pilha(el.me_deck, 4);
    el.op_nome.textContent = cartaIA.nome;
    el.me_nome.textContent = cartaEu.nome;
    el.reveal.innerHTML = '';
    el.log_combate.textContent = estado.atacante === EU
      ? cartaEu.nome + ' entra com a iniciativa — desfira o primeiro golpe.'
      : cartaIA.nome + ' é mais veloz e ataca primeiro — leia o golpe e defenda.';
    atualizarHUD();
    proximaTroca();
  }

  // ---------- HUD ----------
  function atualizarHUD() {
    barra(el.me_vida_bar, el.me_vida_txt, estado.A.vida, estado.A.vidaMax, 'VID');
    barra(el.op_vida_bar, el.op_vida_txt, estado.B.vida, estado.B.vidaMax, 'VID');
    ene(el.me_ene_bar, el.me_ene_txt, estado.A);
    ene(el.op_ene_bar, el.op_ene_txt, estado.B);
    el.contador_rodada.textContent = 'RODADA ' + (estado.rodada + 1);
    var euAtaca = estado.atacante === EU;
    el.me_papel.textContent = euAtaca ? '⚔ ATACA' : '🛡 DEFENDE';
    el.op_papel.textContent = euAtaca ? '🛡 DEFENDE' : '⚔ ATACA';
    el.me_papel.className = 'papel-tag ' + (euAtaca ? 'atk' : 'def');
    el.op_papel.className = 'papel-tag ' + (euAtaca ? 'def' : 'atk');
  }

  function barra(bar, txt, v, max, lbl) {
    bar.style.width = Math.max(0, v / max * 100) + '%';
    txt.textContent = v + ' / ' + max + (lbl ? '' : '');
  }
  function ene(bar, txt, j) {
    var max = Engine.energiaMax(j);
    bar.style.width = Math.max(0, j.energia / max * 100) + '%';
    txt.textContent = 'ENE ' + j.energia;
  }

  // ---------- turno ----------
  function proximaTroca() {
    if (estado.atacante === EU) renderAtaque();
    else renderDefesa();
  }

  function renderAtaque() {
    var podeEsp = Engine.podeEspecial(estado.A);
    var box = cmdBox('Você ataca — escolha o golpe');
    var acoes = document.createElement('div');
    acoes.className = 'cmd-acoes';
    acoes.appendChild(botao('⚔ Golpe Normal', 'ata-normal', false, function () { resolverComoAtacante('normal'); }));
    acoes.appendChild(botao('✦ Golpe Especial (⚡' + Engine.CONST.CUSTO_ESPECIAL + ')',
      'ata-especial esp', !podeEsp, function () { resolverComoAtacante('especial'); }));
    box.appendChild(acoes);
    if (!podeEsp) box.appendChild(dica('Energia insuficiente para o Especial (' + estado.A.energia + '/' + Engine.CONST.CUSTO_ESPECIAL + ').'));
    setComando(box);
  }

  function renderDefesa() {
    var box = cmdBox('Você defende — preveja o golpe e aposte energia');
    var sel = { preve: 'normal' };
    var acoes = document.createElement('div');
    acoes.className = 'cmd-acoes';
    var bN = botao('🛡 Prever Normal', 'def-normal sel', false, null);
    var bE = botao('🛡 Prever Especial', 'def-especial', false, null);
    bN.addEventListener('click', function () { sel.preve = 'normal'; bN.classList.add('sel'); bE.classList.remove('sel'); });
    bE.addEventListener('click', function () { sel.preve = 'especial'; bE.classList.add('sel'); bN.classList.remove('sel'); });
    acoes.appendChild(bN); acoes.appendChild(bE);
    box.appendChild(acoes);

    var apBox = document.createElement('div');
    apBox.className = 'cmd-aposta';
    var max = estado.A.energia;
    apBox.innerHTML = '<label>Apostar energia</label>';
    var range = document.createElement('input');
    range.type = 'range'; range.min = 0; range.max = max; range.value = Math.min(max, 12);
    var val = document.createElement('div'); val.className = 'aposta-val'; val.textContent = range.value;
    range.addEventListener('input', function () { val.textContent = range.value; });
    var ctrl = document.createElement('div'); ctrl.className = 'aposta-ctrl';
    ctrl.appendChild(range); ctrl.appendChild(val);
    apBox.appendChild(ctrl);
    box.appendChild(apBox);

    box.appendChild(botao('Confirmar defesa ⚔', 'confirmar', false, function () {
      resolverComoDefensor(sel.preve, +range.value);
    }, true));
    setComando(box);
  }

  // ---------- resolução ----------
  function resolverComoAtacante(tipo) {
    if (ocupado) return; ocupado = true;
    var ja = { tipo: tipo };
    var jd = AI.leitor.defender(estado.B, estado.A, memIA); // IA defende, lendo você
    finalizar(ja, jd, EU);
  }
  function resolverComoDefensor(preve, aposta) {
    if (ocupado) return; ocupado = true;
    var ja = AI.leitor.atacar(estado.B, estado.A, memIA);    // IA ataca, lendo você
    var jd = { preve: preve, aposta: aposta };
    finalizar(ja, jd, IA);
  }

  function finalizar(ja, jd, atacanteKey) {
    var r = Engine.aplicarTroca(estado, ja, jd);
    // a IA memoriza o que VOCÊ fez nesta troca
    if (atacanteKey === EU) memIA.atkHist.push(r.tipo);       // você atacou
    else memIA.defHist.push(jd.preve);                        // você defendeu

    mostrarReveal(r, ja, jd, atacanteKey);
    el.comando_din.innerHTML = '<div class="cmd-espera">Resolvendo…</div>';

    setTimeout(function () {
      atualizarHUD();
      ocupado = false;
      if (r.fim) return setTimeout(function () { fimDeJogo(r.fim); }, 600);
      proximaTroca();
    }, 1100);
  }

  function mostrarReveal(r, ja, jd, atacanteKey) {
    var euAtacou = atacanteKey === EU;
    var atkNome = euAtacou ? 'Você' : cartaIA.nome;
    var defNome = euAtacou ? cartaIA.nome : 'Você';
    var espTag = r.tipo === 'especial' ? 'esp' : '';
    el.reveal.innerHTML =
      '<div class="rev-lado atk">' +
        '<div class="rev-quem">' + atkNome + ' ataca</div>' +
        '<div class="rev-badge ' + espTag + '">' + (r.tipo === 'especial' ? '✦ ESPECIAL' : '⚔ NORMAL') + '</div>' +
      '</div>' +
      '<div class="rev-vs">⚔</div>' +
      '<div class="rev-lado def">' +
        '<div class="rev-quem">' + defNome + ' defende</div>' +
        '<div class="rev-badge ' + (r.acertou ? 'ok' : 'miss') + '">🛡 previu ' +
          (jd.preve === 'especial' ? 'ESPECIAL' : 'NORMAL') + ' · ⚡' + r.aposta + '</div>' +
      '</div>';

    var msg;
    if (r.acertou) {
      msg = defNome + ' LEU o golpe! Bloqueou — só ' + r.dano + ' de dano';
      if (r.contra > 0) msg += ' e contra-atacou (+' + r.contra + ')';
      msg += '.';
    } else {
      msg = defNome + ' errou a leitura — tomou ' + r.dano + ' de dano cheio.';
    }
    el.log_combate.textContent = msg;
  }

  // ---------- helpers de DOM do comando ----------
  function cmdBox(titulo) {
    var box = document.createElement('div');
    box.className = 'cmd-box';
    box.innerHTML = '<div class="cmd-titulo">' + titulo + '</div>';
    return box;
  }
  function botao(txt, cls, disabled, onclick, ouro) {
    var b = document.createElement('button');
    b.className = 'cmd-btn ' + cls + (ouro ? ' btn-ouro' : '');
    b.textContent = txt;
    if (disabled) b.disabled = true;
    if (onclick) b.addEventListener('click', onclick);
    return b;
  }
  function dica(txt) { var d = document.createElement('div'); d.className = 'cmd-dica'; d.textContent = txt; return d; }
  function setComando(box) { el.comando_din.innerHTML = ''; el.comando_din.appendChild(box); }

  // ---------- fim ----------
  function fimDeJogo(fim) {
    var venceu = fim === EU;
    // registra a partida no perfil (resultado + carta que o jogador usou)
    if (global.ArkaniaPerfil) global.ArkaniaPerfil.registrarPartida(venceu, cartaEu && cartaEu.id);
    // descarta automaticamente o campeão derrotado (vai pro banco/descarte)
    var perdedorEu = !venceu;
    var slotAtk = perdedorEu ? el.me_ataque : el.op_ataque;
    var slotDesc = perdedorEu ? el.me_descarte : el.op_descarte;
    var cartaMorta = perdedorEu ? cartaEu : cartaIA;
    if (slotAtk && slotAtk.parentNode) slotAtk.parentNode.classList.add('derrotada');
    pilha(slotDesc, 1, cartaMorta);

    el.fim_titulo.className = venceu ? 'venceu' : 'perdeu';
    el.fim_titulo.textContent = venceu ? 'Vitória!' : 'Derrota';
    var extra = modoAposta ? (venceu ? ' Você levou a carta apostada. 🃏' : ' Sua carta apostada foi para o vencedor.') : '';
    el.fim_sub.textContent = (venceu ? 'Você leu melhor o adversário.' : 'O adversário leu melhor desta vez.') + extra;
    el.fim_fundo.classList.add('ativa');
  }

  function ligarControles() {
    if (!el.reveal) bind();
    q('btn-revanche').addEventListener('click', function () {
      el.fim_fundo.classList.remove('ativa');
      iniciar({ aposta: modoAposta });
    });
    q('btn-lobby-fim').addEventListener('click', function () {
      el.fim_fundo.classList.remove('ativa');
      global.ArkaniaNav.mostrar('lobby');
    });
    q('btn-sair-duelo').addEventListener('click', function () {
      global.ArkaniaNav.mostrar('lobby');
    });
  }

  global.ArkaniaDuel = { iniciar: iniciar, ligarControles: ligarControles };

})(window);
