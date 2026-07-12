/*
 * Arkania — Painel Admin. Edita as cartas (nome, tipo, 6 habilidades, habilidades)
 * e salva via ArkaniaStore (banco local hoje; backend depois, sem mudar esta tela).
 */
(function (global) {
  'use strict';

  var Cards = global.ArkaniaCards;
  var Store = global.ArkaniaStore;
  var q = function (id) { return document.getElementById(id); };

  var atual = null; // carta selecionada (objeto em memória)

  // popula o seletor de raridade (uma vez)
  function montarRaridades() {
    var sel = q('f-raridade');
    if (!sel || sel.options.length) return;
    Object.keys(Cards.RARIDADES)
      .sort(function (a, b) { return Cards.RARIDADES[a].ordem - Cards.RARIDADES[b].ordem; })
      .forEach(function (r) {
        var o = document.createElement('option');
        o.value = r; o.textContent = Cards.RARIDADES[r].nome;
        sel.appendChild(o);
      });
  }

  // ---- lista lateral ----
  function renderLista() {
    var box = q('adm-lista');
    box.innerHTML = '';
    Cards.todas().forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'adm-item t-' + Cards.tipo(c) + (atual && atual.id === c.id ? ' sel' : '');
      b.innerHTML =
        '<span class="adm-item-nota">' + Cards.nota(c) + '</span>' +
        '<span class="adm-item-nome">' + c.nome + '</span>' +
        '<span class="adm-item-tipo">' + Cards.tipo(c) + '</span>';
      b.addEventListener('click', function () { selecionar(c); });
      box.appendChild(b);
    });
  }

  // ---- editor ----
  function selecionar(c) {
    atual = c;
    q('adm-vazio').classList.add('oculto');
    q('adm-form').classList.remove('oculto');
    q('f-nome').value = c.nome;
    q('f-tipo').value = Cards.tipo(c);
    q('f-raridade').value = c.raridade;
    q('f-habs').value = (c.habilidades || []).join('\n');
    montarStats(c);
    atualizarPreview();
    renderLista();
  }

  function montarStats(c) {
    var box = q('adm-stats');
    box.innerHTML = '';
    Cards.ATTR_ORDEM.forEach(function (k) {
      var wrap = document.createElement('div');
      wrap.className = 'adm-stat';
      wrap.innerHTML =
        '<div class="adm-stat-top"><label>' + k + ' · ' + Cards.ATTR_NOME[k] + '</label><b id="v-' + k + '">' + (c.stats[k] | 0) + '</b></div>' +
        '<input type="range" min="' + Cards.statMin(k) + '" max="' + Cards.statMax(k, c.raridade) + '" value="' + (c.stats[k] | 0) + '" data-k="' + k + '">';
      box.appendChild(wrap);
      wrap.querySelector('input').addEventListener('input', function () {
        atual.stats[k] = +this.value;
        q('v-' + k).textContent = this.value;
        atualizarPreview();
      });
    });
  }

  // aplica campos de texto (nome/tipo/habs) no objeto em memória
  function coletarTexto() {
    if (!atual) return;
    var nome = q('f-nome').value.trim();
    if (nome) atual.nome = nome;
    atual.tipo = q('f-tipo').value === 'SUPP' ? 'SUPP' : 'HERO';
    if (Cards.RARIDADES[q('f-raridade').value]) atual.raridade = q('f-raridade').value;
    atual.habilidades = q('f-habs').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function atualizarPreview() {
    coletarTexto();
    var box = q('adm-preview');
    box.innerHTML = '';
    box.appendChild(Cards.el(atual));
    q('adm-nota').textContent = Cards.nota(atual);
  }

  function ligar() {
    ['f-nome', 'f-tipo', 'f-habs'].forEach(function (id) {
      q(id).addEventListener('input', atualizarPreview);
    });

    // trocar raridade: novo teto → clampa stats e re-renderiza os sliders
    q('f-raridade').addEventListener('change', function () {
      if (!atual) return;
      if (Cards.RARIDADES[this.value]) atual.raridade = this.value;
      Cards.ATTR_ORDEM.forEach(function (k) {
        atual.stats[k] = Math.max(Cards.statMin(k), Math.min(Cards.statMax(k, atual.raridade), atual.stats[k] | 0));
      });
      montarStats(atual);
      atualizarPreview();
      renderLista();
    });

    q('adm-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!atual) return;
      coletarTexto();
      Store.salvarCarta(atual.id, {
        nome: atual.nome, tipo: atual.tipo, raridade: atual.raridade, stats: atual.stats, habilidades: atual.habilidades
      }).then(function () {
        var ok = q('adm-ok');
        ok.classList.remove('oculto');
        setTimeout(function () { ok.classList.add('oculto'); }, 1600);
        renderLista();
      });
    });

    q('f-reset').addEventListener('click', function () {
      if (!atual) return;
      if (!confirm('Reverter "' + atual.nome + '" para o padrão? (recarrega a página)')) return;
      Store.resetarCarta(atual.id).then(function () { location.reload(); });
    });

    q('adm-reset-tudo').addEventListener('click', function () {
      if (!confirm('Resetar TODAS as cartas para o padrão? (recarrega a página)')) return;
      Store.resetarTudo().then(function () { location.reload(); });
    });

    q('adm-exportar').addEventListener('click', function () {
      var blob = new Blob([Store.exportar()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'arkania-cartas.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

  montarRaridades();
  renderLista();
  ligar();

})(window);
