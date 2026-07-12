/*
 * Arkania — camada de dados (banco local).
 *
 * Hoje persiste no navegador (localStorage). A API já é no formato "repositório"
 * (métodos assíncronos que retornam Promise), então migrar para um backend online
 * depois é só reescrever ESTE arquivo (trocar localStorage por fetch/Supabase),
 * sem mexer no resto do jogo nem no painel admin.
 *
 * Campos editáveis por carta: nome, tipo (HERO|SUPP), stats {ATA,DEF,FOR,VEL,ENE,VID}, habilidades[].
 */
(function (global) {
  'use strict';

  var Cards = global.ArkaniaCards;
  var KEY = 'arkania.cards.v1';
  var CAMPOS = ['nome', 'tipo', 'raridade', 'stats', 'habilidades'];

  function ler() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function gravar(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }

  // aplica os ajustes salvos por cima de uma carta do catálogo
  function aplicar(carta, dados) {
    if (!dados) return;
    if (typeof dados.nome === 'string' && dados.nome.trim()) carta.nome = dados.nome.trim();
    if (dados.tipo === 'HERO' || dados.tipo === 'SUPP') carta.tipo = dados.tipo;
    if (dados.raridade && Cards.RARIDADES[dados.raridade]) carta.raridade = dados.raridade;
    if (dados.stats) {
      Cards.ATTR_ORDEM.forEach(function (k) {
        if (typeof dados.stats[k] === 'number') carta.stats[k] = Math.max(Cards.statMin(k), Math.min(Cards.statMax(k, carta.raridade), Math.round(dados.stats[k])));
      });
    }
    if (Array.isArray(dados.habilidades)) {
      carta.habilidades = dados.habilidades.map(function (h) { return String(h); }).filter(function (h) { return h.trim(); });
    }
    Cards.normalizar(carta);
  }

  // ---- carga inicial (SÍNCRONA): patcha o catálogo com o que está salvo ----
  function carregarSync() {
    var saved = ler();
    Object.keys(saved).forEach(function (id) {
      var c = Cards.porId(id);
      if (c) aplicar(c, saved[id]);
    });
  }
  carregarSync();

  // ---- API de repositório (assíncrona p/ compatibilidade futura c/ backend) ----
  var Store = {
    // lista todas as cartas (cópia)
    todas: function () { return Promise.resolve(Cards.todas()); },
    porId: function (id) { return Promise.resolve(Cards.porId(id)); },

    // salva os campos editáveis de uma carta (aplica em memória + persiste)
    salvarCarta: function (id, dados) {
      var c = Cards.porId(id);
      if (!c) return Promise.reject(new Error('carta inexistente: ' + id));
      aplicar(c, dados);
      var saved = ler();
      saved[id] = {};
      CAMPOS.forEach(function (k) {
        if (k === 'stats') { saved[id].stats = {}; Cards.ATTR_ORDEM.forEach(function (s) { saved[id].stats[s] = c.stats[s]; }); }
        else saved[id][k] = c[k];
      });
      gravar(saved);
      return Promise.resolve(c);
    },

    // reverte uma carta ao seed (remove o ajuste salvo)
    resetarCarta: function (id) {
      var saved = ler();
      delete saved[id];
      gravar(saved);
      return Promise.resolve(true);
    },

    // limpa tudo (volta todo o catálogo ao seed) — exige reload p/ refletir no jogo
    resetarTudo: function () { try { localStorage.removeItem(KEY); } catch (e) {} return Promise.resolve(true); },

    // exporta os ajustes salvos (p/ virar seed/commit ou subir pro backend)
    exportar: function () { return JSON.stringify(ler(), null, 2); }
  };

  global.ArkaniaStore = Store;

})(typeof window !== 'undefined' ? window : globalThis);
