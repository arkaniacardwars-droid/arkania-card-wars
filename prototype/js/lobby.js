/*
 * Arkania Card Wars — Lobby estilo PUBG Mobile (HUD de cantos sobre o cenário Canvas):
 * perfil + esquadrão (topo-esq), moedas + promo (topo-dir), herói em destaque
 * no centro, card de modo + START (rodapé-esq), navegação (rodapé-dir).
 */
(function (global) {
  'use strict';

  var Cards = global.ArkaniaCards;
  var EIXOS = global.ArkaniaEngine.EIXOS;

  // ---- navegação entre telas ----
  var Nav = {
    mostrar: function (id) {
      ['lobby', 'duel', 'colecao'].forEach(function (t) {
        var el = document.getElementById('tela-' + t);
        if (el) el.classList.toggle('ativa', t === id);
      });
    }
  };
  global.ArkaniaNav = Nav;

  function q(id) { return document.getElementById(id); }

  // ---- palco central: carrossel (conveyor) das cartas do DECK ativo ----
  // A cada 5s: direita→meio, meio→esquerda, esquerda some, nova entra pela direita.
  // Cada carta transiciona suave entre os slots (CSS .pc-left/.pc-mid/.pc-right).
  var palcoSeq = [];       // cartas em exibição (deck ativo ou fallback)
  var palcoIdx = 0;        // índice, na sequência, da carta que está à ESQUERDA
  var palcoEls = null;     // [elEsquerda, elMeio, elDireita]
  var palcoTimer = null, palcoAnimando = false, palcoGen = 0;

  function fontePalco() {
    var lista = deckAtual().map(function (id) { return Cards.porId(id); }).filter(Boolean);
    if (!lista.length) lista = ['guardiao-saturno', 'mago-negro', 'kassandra'].map(Cards.porId);
    return lista;
  }

  function novaCartaPalco(c, cls) {
    var el = Cards.el(c);
    el.classList.add(cls);
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () { abrirCartaModal(c); });
    return el;
  }
  function nomeHeroi(c) {
    q('heroi-nome').innerHTML = c.nome + '<small>' + Cards.raridadeInfo(c.raridade).nome + '</small>';
  }

  // (re)monta o palco do zero, sem animação (boot / troca de deck)
  function montarPalco() {
    var palco = q('palco-cartas');
    if (!palco) return;
    palcoGen++; palcoAnimando = false;
    palcoSeq = fontePalco();
    var n = palcoSeq.length;
    palcoIdx = ((palcoIdx % n) + n) % n;
    palco.innerHTML = ''; palcoEls = null;

    if (n < 3) { // decks pequenos: estático, sem carrossel
      var slots = ['pc-mid', 'pc-right', 'pc-left'];
      palcoSeq.forEach(function (c, i) { palco.appendChild(novaCartaPalco(c, slots[i] || 'pc-left')); });
      nomeHeroi(palcoSeq[0]);
      return;
    }

    var iM = (palcoIdx + 1) % n, iR = (palcoIdx + 2) % n;
    var elL = novaCartaPalco(palcoSeq[palcoIdx], 'pc-left');
    var elM = novaCartaPalco(palcoSeq[iM], 'pc-mid');
    var elR = novaCartaPalco(palcoSeq[iR], 'pc-right');
    palco.appendChild(elL); palco.appendChild(elM); palco.appendChild(elR);
    palcoEls = [elL, elM, elR];
    nomeHeroi(palcoSeq[iM]);
  }

  function avancarPalco() {
    var palco = q('palco-cartas');
    if (!palco || !palcoEls || palcoAnimando) return;
    var n = palcoSeq.length;
    if (n < 3) return;
    palcoAnimando = true;
    var gen = palcoGen;

    var elL = palcoEls[0], elM = palcoEls[1], elR = palcoEls[2];
    var elEnter = novaCartaPalco(palcoSeq[(palcoIdx + 3) % n], 'pc-enter');
    palco.appendChild(elEnter);
    void palco.offsetWidth; // reflow: fixa a posição inicial (entrada) antes de animar

    elR.classList.remove('pc-right'); elR.classList.add('pc-mid');   // direita → meio
    elM.classList.remove('pc-mid');   elM.classList.add('pc-left');  // meio → esquerda
    elL.classList.remove('pc-left');  elL.classList.add('pc-exit');  // esquerda → some
    elEnter.classList.remove('pc-enter'); elEnter.classList.add('pc-right'); // entra pela direita

    nomeHeroi(palcoSeq[(palcoIdx + 2) % n]); // novo meio = a que era da direita

    setTimeout(function () {
      if (gen !== palcoGen) return;   // palco foi remontado no meio da animação → aborta
      if (elL && elL.parentNode) elL.parentNode.removeChild(elL);
      palcoEls = [elM, elR, elEnter];
      palcoIdx = (palcoIdx + 1) % n;
      palcoAnimando = false;
    }, 720);
  }

  function iniciarCarrossel() {
    if (palcoTimer) clearInterval(palcoTimer);
    palcoTimer = setInterval(function () {
      var lobby = document.getElementById('tela-lobby');
      if (!lobby || !lobby.classList.contains('ativa')) return; // pausa fora do lobby
      avancarPalco();
    }, 3500);
  }

  // ---- modal de detalhe da carta ----
  function abrirCartaModal(c) {
    q('cm-carta').innerHTML = '';
    q('cm-carta').appendChild(Cards.el(c));
    var info = Cards.raridadeInfo(c.raridade);
    q('cm-nota-num').textContent = Cards.nota(c);
    q('cm-nota-tipo').textContent = Cards.tipo(c);
    q('cm-nome').textContent = c.nome;
    var rar = q('cm-rar');
    rar.textContent = '◆ ' + info.nome;
    rar.style.color = info.cor;
    var at = Cards.atributos(c);
    q('cm-attrs').innerHTML = Cards.ATTR_ORDEM.map(function (k) {
      var v = at[k];
      return '<div class="cm-attr">' +
        '<div class="cm-attr-top"><span>' + Cards.ATTR_NOME[k] + '</span><b>' + v + '</b></div>' +
        '<div class="cm-bar"><i style="width:' + Math.min(100, v) + '%;background:' + Cards.ATTR_COR[k] + '"></i></div>' +
        '</div>';
    }).join('');
    q('carta-modal').classList.add('ativa');
  }
  function fecharCartaModal() { q('carta-modal').classList.remove('ativa'); }

  // ---- tela de Coleção / Catálogo ----
  var filtroRar = 'todas';

  // ordenação (cicla no botão): alfabética → raridade ↑ → raridade ↓
  var ORDENS = ['alfabetica', 'rar-cresc', 'rar-desc'];
  var ORDEM_LBL = { alfabetica: '⇅ A–Z', 'rar-cresc': '⇅ Raridade ↑', 'rar-desc': '⇅ Raridade ↓' };
  var ordem = 'alfabetica';

  // cartas que o JOGADOR possui (protótipo: subconjunto fixo).
  // TODO: substituir por posse persistida (localStorage/backend) no online.
  var POSSUI = {
    'skeleton-red': true, 'nagoy': true, 'fox': true, 'taichin': true,
    'kassandra': true, 'lincon-cartola': true, 'mago-negro': true,
    'siberian': true, 'guardiao-saturno': true
  };
  function possui(c) { return !!POSSUI[c.id]; }

  // ---- decks (5 decks de até 12 cartas) ----
  // TODO: persistir (localStorage/backend). Por ora, em memória na sessão.
  var DECK_MAX = 8, N_DECKS = 5;
  var decks = [
    ['kassandra', 'mago-negro', 'guardiao-saturno', 'fox', 'taichin', 'siberian'],
    [], [], [], []
  ];
  var deckNomes = ['Deck 1', 'Deck 2', 'Deck 3', 'Deck 4', 'Deck 5'];
  var deckAtivo = 0;

  // ícone de pena (SVG monocromático → herda a cor dourada via currentColor)
  var SVG_PENA = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
    'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';

  // ---- persistência (localStorage): decks sobrevivem ao reload ----
  var LS_KEY = 'arkania.decks.v1';
  var LS_KEY_LEGADO = 'cardwars.decks.v1'; // pré-rebrand Arkania — migração transparente

  function salvarDecks() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ decks: decks, nomes: deckNomes, ativo: deckAtivo }));
    } catch (e) { /* localStorage indisponível — segue só em memória */ }
  }

  function carregarDecks() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) { // migra decks salvos sob a chave antiga (cardwars.*) uma única vez
        raw = localStorage.getItem(LS_KEY_LEGADO);
        if (raw) { localStorage.setItem(LS_KEY, raw); localStorage.removeItem(LS_KEY_LEGADO); }
      }
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.decks) && s.decks.length === N_DECKS) {
        // valida: só ids de cartas existentes, sem duplicar, até DECK_MAX por deck
        decks = s.decks.map(function (d) {
          var out = [];
          (Array.isArray(d) ? d : []).forEach(function (id) {
            if (Cards.porId(id) && out.indexOf(id) === -1 && out.length < DECK_MAX) out.push(id);
          });
          return out;
        });
      }
      if (s && Array.isArray(s.nomes) && s.nomes.length === N_DECKS) {
        deckNomes = s.nomes.map(function (n) { return String(n).slice(0, 16) || 'Deck'; });
      }
      if (s && typeof s.ativo === 'number' && s.ativo >= 0 && s.ativo < N_DECKS) deckAtivo = s.ativo;
    } catch (e) { /* dados corrompidos — ignora e usa o padrão */ }
  }
  carregarDecks();

  function deckAtual() { return decks[deckAtivo]; }
  function noDeck(c) { return deckAtual().indexOf(c.id) !== -1; }

  function toggleDeck(c) {
    if (!possui(c)) return;
    var d = deckAtual(), i = d.indexOf(c.id);
    if (i !== -1) d.splice(i, 1);                 // já está → remove
    else if (d.length < DECK_MAX) d.push(c.id);   // tem espaço → adiciona
    else return;                                   // deck cheio → ignora
    salvarDecks();
    montarDeckSlots(); montarMeuDeck(); montarColecao();
  }
  function removeDoDeck(c) {
    var d = deckAtual(), i = d.indexOf(c.id);
    if (i === -1) return;
    d.splice(i, 1);
    salvarDecks();
    montarDeckSlots(); montarMeuDeck(); montarColecao();
  }

  function montarDeckSlots() {
    var box = q('deck-slots');
    box.innerHTML = '';
    for (var i = 0; i < N_DECKS; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'deck-slot-btn' + (idx === deckAtivo ? ' ativo' : '');
        b.addEventListener('click', function () {
          deckAtivo = idx;
          salvarDecks();
          montarDeckSlots(); montarMeuDeck(); montarColecao();
        });

        var topo = document.createElement('span');
        topo.className = 'ds-topo';
        var nome = document.createElement('span');
        nome.className = 'ds-nome'; nome.textContent = deckNomes[idx];
        var pena = document.createElement('span');
        pena.className = 'deck-ren'; pena.innerHTML = SVG_PENA; pena.title = 'Renomear deck';
        pena.addEventListener('click', function (e) {
          e.stopPropagation();
          renomearDeck(idx, nome);
        });
        topo.appendChild(nome); topo.appendChild(pena);

        var cont = document.createElement('span');
        cont.className = 'ds-cont';
        cont.textContent = decks[idx].length + '/' + DECK_MAX;

        b.appendChild(topo); b.appendChild(cont);
        box.appendChild(b);
      })(i);
    }
  }

  // edição inline do nome do deck (clica na pena → vira input; Enter confirma, Esc cancela)
  function renomearDeck(idx, nomeEl) {
    var input = document.createElement('input');
    input.className = 'ds-nome-edit'; input.type = 'text';
    input.value = deckNomes[idx]; input.maxLength = 16;
    nomeEl.replaceWith(input);
    input.focus(); input.select();
    input.addEventListener('click', function (e) { e.stopPropagation(); });
    function salvar() {
      var v = input.value.trim();
      if (v) deckNomes[idx] = v;
      salvarDecks();
      montarDeckSlots();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); salvar(); }
      else if (e.key === 'Escape') { montarDeckSlots(); }
    });
    input.addEventListener('blur', salvar);
  }

  function montarMeuDeck() {
    var grid = q('deck-grid');
    grid.innerHTML = '';
    var d = deckAtual();
    for (var i = 0; i < DECK_MAX; i++) {
      if (i < d.length) {
        var c = Cards.porId(d[i]);
        var wrap = document.createElement('div');
        wrap.className = 'deck-item';
        wrap.appendChild(Cards.el(c));
        var rm = document.createElement('div');
        rm.className = 'deck-rm'; rm.textContent = '✕';
        wrap.appendChild(rm);
        wrap.addEventListener('click', (function (carta) {
          return function () { removeDoDeck(carta); };
        })(c));
        grid.appendChild(wrap);
      } else {
        var vazio = document.createElement('div');
        vazio.className = 'deck-slot-vazio'; vazio.textContent = '+';
        grid.appendChild(vazio);
      }
    }
    q('deck-cont').textContent = d.length + ' / ' + DECK_MAX;
  }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      if (ordem === 'alfabetica') return a.nome.localeCompare(b.nome, 'pt-BR');
      var oa = Cards.RARIDADES[a.raridade].ordem, ob = Cards.RARIDADES[b.raridade].ordem;
      if (oa !== ob) return ordem === 'rar-desc' ? ob - oa : oa - ob;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }

  function abrirColecao() {
    filtroRar = 'todas';
    var bo = q('btn-col-ordenar');
    if (bo) bo.textContent = ORDEM_LBL[ordem];
    montarDeckSlots();
    montarMeuDeck();
    montarFiltros();
    montarColecao();
    Nav.mostrar('colecao');
  }

  function montarFiltros() {
    var barra = q('col-filtros');
    var itens = [['todas', 'Todas']].concat(
      Object.keys(Cards.RARIDADES)
        .sort(function (a, b) { return Cards.RARIDADES[a].ordem - Cards.RARIDADES[b].ordem; })
        .map(function (r) { return [r, Cards.RARIDADES[r].nome]; })
    );
    barra.innerHTML = '';
    itens.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'col-filtro' + (it[0] === filtroRar ? ' sel' : '');
      if (it[0] !== 'todas') b.style.setProperty('--c', Cards.RARIDADES[it[0]].cor);
      b.textContent = it[1];
      b.addEventListener('click', function () {
        filtroRar = it[0];
        montarFiltros();
        montarColecao();
      });
      barra.appendChild(b);
    });
  }

  // um item da grade (carta + rótulo); `tem=false` → preto-e-branco + cadeado.
  // possuída → toque adiciona/remove do deck ativo; já no deck → destacada.
  function itemColecao(c, tem) {
    var wrap = document.createElement('div');
    var emDeck = tem && noDeck(c);
    wrap.className = 'col-item' + (tem ? ' pode-add' : ' nao-possui') + (emDeck ? ' no-deck' : '');
    if (tem) wrap.addEventListener('click', function () { toggleDeck(c); });
    wrap.appendChild(Cards.el(c));
    if (!tem) {
      var lock = document.createElement('div');
      lock.className = 'lock'; lock.textContent = '🔒';
      wrap.appendChild(lock);
    }
    // carta no deck → só a borda dourada (classe .no-deck), sem ícone
    var lbl = document.createElement('div');
    lbl.className = 'col-item-lbl';
    var info = Cards.raridadeInfo(c.raridade);
    lbl.innerHTML = '<span class="col-nome">' + c.nome + '</span>' +
      '<span class="col-rar" style="color:' + info.cor + '">◆ ' + info.nome + '</span>';
    wrap.appendChild(lbl);
    return wrap;
  }

  function montarColecao() {
    var grid = q('col-grid');
    grid.innerHTML = '';
    var total = Cards.todas().length;
    var cartas = Cards.todas().filter(function (c) {
      return filtroRar === 'todas' || c.raridade === filtroRar;
    });

    // possuídas em cima (ordenadas), não-possuídas embaixo (ordenadas)
    var tem = ordenar(cartas.filter(possui));
    var naoTem = ordenar(cartas.filter(function (c) { return !possui(c); }));

    tem.forEach(function (c) { grid.appendChild(itemColecao(c, true)); });
    if (naoTem.length) {
      var sep = document.createElement('div');
      sep.className = 'col-sep';
      sep.innerHTML = '<span>Ainda não obtidas</span>';
      grid.appendChild(sep);
      naoTem.forEach(function (c) { grid.appendChild(itemColecao(c, false)); });
    }

    var possuiTotal = Cards.todas().filter(possui).length;
    q('col-contagem').textContent = possuiTotal + '/' + total;
  }

  function jogar() { global.ArkaniaDuel.iniciar({ aposta: false }); }

  // ---- modal (seletor de adversário) — dormente no redesenho, mantido p/ reuso ----
  function fecharModal() { q('modal-jogar').classList.remove('ativa'); }

  // mensagens dos botões placeholder (recursos que dependem do backend)
  var MSG_MENU = {
    loja: 'Loja: pacotes de cartas e cosméticos entram quando houver conta/economia persistida (backend). Por enquanto, veja suas cartas na Coleção.',
    missoes: 'Missões diárias/semanais entram quando houver conta e progressão persistidos (backend).',
    conquistas: 'Conquistas (troféus de duelo) chegam junto com a progressão persistida. Em breve!'
  };

  function ligarLobby() {
    // START → inicia o duelo direto
    q('btn-start').addEventListener('click', jogar);

    // menu lateral: Loja / Missões / Conquistas / Coleção
    document.querySelectorAll('.lb-menu-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var alvo = b.getAttribute('data-aba');
        if (alvo === 'colecao') return abrirColecao();
        alert(MSG_MENU[alvo] || 'Em breve.');
      });
    });

    // Battle Pass
    var bp = q('btn-battlepass');
    if (bp) bp.addEventListener('click', function () {
      alert('Battle Pass — Temporada I: trilha de recompensas por nível. Ativa quando plugarmos progressão online.');
    });

    // voltar da coleção (atualiza o palco com o deck possivelmente alterado)
    var voltar = q('btn-col-voltar');
    if (voltar) voltar.addEventListener('click', function () {
      palcoIdx = 0; montarPalco();
      Nav.mostrar('lobby');
    });

    // ordenar coleção (cicla A–Z → raridade ↑ → raridade ↓)
    var btnOrd = q('btn-col-ordenar');
    if (btnOrd) btnOrd.addEventListener('click', function () {
      ordem = ORDENS[(ORDENS.indexOf(ordem) + 1) % ORDENS.length];
      btnOrd.textContent = ORDEM_LBL[ordem];
      montarColecao();
    });

    // modal de detalhe da carta
    q('cm-fechar').addEventListener('click', fecharCartaModal);
    q('carta-modal').addEventListener('click', function (e) {
      if (e.target === q('carta-modal')) fecharCartaModal();
    });

    // ---- modal "Jogar" (dormente): mantém os handlers p/ não quebrar se reativado ----
    var mFechar = q('modal-fechar');
    if (mFechar) mFechar.addEventListener('click', fecharModal);
    var mJogar = q('modal-jogar');
    if (mJogar) mJogar.addEventListener('click', function (e) {
      if (e.target === mJogar) fecharModal();
    });
    var opFila = q('op-fila');
    if (opFila) opFila.addEventListener('click', function () { fecharModal(); jogar(); });
    var opSalas = q('op-salas');
    if (opSalas) opSalas.addEventListener('click', function () {
      alert('Lista de Duelos (salas) chega quando plugarmos o backend online (Upstash Redis + Supabase Realtime).');
    });
    var opConvite = q('op-convite');
    if (opConvite) opConvite.addEventListener('click', function () {
      alert('Chamar para Confronto (convite direto) também depende do backend online. Em breve!');
    });
  }

  // ---- boot ----
  function boot() {
    montarPalco();
    iniciarCarrossel();
    ligarLobby();
    global.ArkaniaDuel.ligarControles();
    Nav.mostrar('lobby');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
