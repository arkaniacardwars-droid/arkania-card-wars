/*
 * Arkania Card Wars — Motor de combate HÍBRIDO (turnos + leitura), puro e sem dependências.
 * Atributos da carta: ATA (ataque), DEF (defesa), VEL (velocidade), ENE (energia), VID (vida).
 * Fonte da verdade: design/combat-bible.md
 *
 * Fluxo de uma TROCA (rodada):
 *   1. VEL define quem começa atacando; depois os papéis alternam.
 *   2. Atacante escolhe, em segredo: Golpe Normal (ATA) ou Especial (ATA×mult, custa ENE).
 *   3. Defensor faz a leitura, em segredo: prevê Normal/Especial e aposta ENE.
 *      Acertou a leitura → bloqueia parte do dano (∝ aposta). Errou → toma cheio (e perde a ENE).
 *   4. Dano = (poder do golpe − DEF) × escala, reduzido pelo bloqueio; sai da VID do defensor.
 *   Vence quem zerar a VID do oponente.
 *
 * Roda igual no navegador (window.ArkaniaEngine) e no Node (module.exports).
 */
(function (global) {
  'use strict';

  var ATTRS = ['ATA', 'DEF', 'VEL', 'ENE', 'VID'];

  // Painel de balanceamento — ver combat-bible.md. Mutável de propósito (test/mc.js varre).
  var CONST = {
    ENERGIA_INICIAL: 30,   // ENE ao começar o duelo
    ENERGIA_REGEN: 14,     // ENE recuperada por troca (até o ENE da carta)
    CUSTO_ESPECIAL: 28,    // ENE para desferir um Especial
    ESP_MULT: 1.35,        // multiplicador de ATA no Especial
    DEF_FATOR: 1.0,        // peso da DEF na mitigação
    DANO_ESCALA: 0.55,     // escala global do dano — botão de DURAÇÃO
    DANO_MIN: 2,           // dano mínimo de um golpe que passa
    BLOQUEIO_MAX: 0.75,    // redução máxima ao ler certo
    BLOQUEIO_ESCALA: 34,   // ENE apostada para bloqueio quase cheio
    CONTRA_FATOR: 0.5,     // fração do dano bloqueado devolvida como contra-ataque
    ATTRS: ATTRS
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function energiaMax(j) { return j.carta.attrs.ENE; }
  function podeEspecial(j) { return j.energia >= CONST.CUSTO_ESPECIAL; }

  function criarJogador(carta, nome) {
    return {
      nome: nome || 'Duelista',
      carta: carta,
      vida: carta.attrs.VID,
      vidaMax: carta.attrs.VID,
      energia: Math.min(CONST.ENERGIA_INICIAL, carta.attrs.ENE)
    };
  }

  // iniciativa: maior VEL ataca primeiro; empate → `desempate` ('A'|'B', default 'A').
  // (o jogo/harness sorteia o desempate para não viciar em quem começa)
  function criarEstado(cartaA, cartaB, nomeA, nomeB, desempate) {
    var A = criarJogador(cartaA, nomeA || 'Você');
    var B = criarJogador(cartaB, nomeB || 'Adversário');
    var va = A.carta.attrs.VEL, vb = B.carta.attrs.VEL;
    var atacante = vb > va ? 'B' : (va > vb ? 'A' : (desempate === 'B' ? 'B' : 'A'));
    return { A: A, B: B, rodada: 0, atacante: atacante };
  }

  /*
   * Resolve uma troca e aplica ao estado.
   *   jogadaAtk = { tipo: 'normal' | 'especial' }
   *   jogadaDef = { preve: 'normal' | 'especial', aposta: n }
   */
  function aplicarTroca(estado, jogadaAtk, jogadaDef) {
    var atkKey = estado.atacante, defKey = atkKey === 'A' ? 'B' : 'A';
    var atk = estado[atkKey], def = estado[defKey];

    var tipo = jogadaAtk.tipo === 'especial' ? 'especial' : 'normal';
    if (tipo === 'especial' && !podeEspecial(atk)) tipo = 'normal'; // sem ENE → vira normal
    if (tipo === 'especial') atk.energia -= CONST.CUSTO_ESPECIAL;

    var poder = tipo === 'especial'
      ? atk.carta.attrs.ATA * CONST.ESP_MULT
      : atk.carta.attrs.ATA;
    var dano = Math.max(CONST.DANO_MIN,
      Math.round((poder - def.carta.attrs.DEF * CONST.DEF_FATOR) * CONST.DANO_ESCALA));

    var aposta = clamp(jogadaDef.aposta | 0, 0, def.energia);
    def.energia -= aposta;
    var acertou = jogadaDef.preve === tipo;
    var danoCheio = dano, contra = 0;
    if (acertou) {
      var reducao = Math.min(CONST.BLOQUEIO_MAX, aposta / CONST.BLOQUEIO_ESCALA);
      dano = Math.round(dano * (1 - reducao));
      contra = Math.round((danoCheio - dano) * CONST.CONTRA_FATOR); // devolve parte do bloqueado
    }
    dano = Math.max(0, dano);
    def.vida = Math.max(0, def.vida - dano);
    if (contra > 0) atk.vida = Math.max(0, atk.vida - contra);

    // regenera energia dos dois
    estado.A.energia = Math.min(energiaMax(estado.A), estado.A.energia + CONST.ENERGIA_REGEN);
    estado.B.energia = Math.min(energiaMax(estado.B), estado.B.energia + CONST.ENERGIA_REGEN);

    estado.atacante = defKey; // alterna a iniciativa
    estado.rodada++;

    // o dano do golpe resolve antes do contra-ataque
    var fim = def.vida <= 0 ? atkKey : (atk.vida <= 0 ? defKey : null);

    return {
      atacante: atkKey, defensor: defKey,
      tipo: tipo, dano: dano, aposta: aposta,
      acertou: acertou, contra: contra,
      fim: fim
    };
  }

  var api = {
    CONST: CONST, ATTRS: ATTRS,
    criarEstado: criarEstado, criarJogador: criarJogador,
    aplicarTroca: aplicarTroca, podeEspecial: podeEspecial,
    energiaMax: energiaMax, clamp: clamp
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ArkaniaEngine = api;

})(typeof window !== 'undefined' ? window : globalThis);
