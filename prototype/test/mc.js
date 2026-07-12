/*
 * Arkania Card Wars — Harness de Monte Carlo (modelo Híbrido).
 * Valida a bíblia (design/combat-bible.md) e ajuda a tunar as constantes.
 *
 *   node test/mc.js            → suíte com os alvos de balanceamento
 *   node test/mc.js sweep      → varre DANO_ESCALA (duração) e mostra win/rodadas
 *   node test/mc.js 20000      → nº de partidas por cenário
 *
 * Usa o MESMO motor do jogo (js/engine.js). Como os atributos são template
 * (iguais em todas as cartas), a partida é decidida pela DECISÃO/LEITURA — é
 * exatamente o que queremos medir.
 */
'use strict';

var Engine = require('../js/engine.js');
var Cards = require('../js/cards.js');
var AI = require('../js/ai.js');

function rngFrom(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jogarPartida(estratA, estratB, rng) {
  var carta = Cards.porId('mago-negro'); // template (todas iguais por ora)
  var estado = Engine.criarEstado(carta, carta, 'A', 'B', rng() < 0.5 ? 'A' : 'B');
  var memA = {}, memB = {};
  var estrat = { A: estratA, B: estratB }, mem = { A: memA, B: memB };
  var MAX = 400;

  while (estado.rodada < MAX) {
    var atk = estado.atacante, def = atk === 'A' ? 'B' : 'A';
    var ja = estrat[atk].atacar(estado[atk], estado[def], mem[atk], rng);
    var jd = estrat[def].defender(estado[def], estado[atk], mem[def], rng);

    var r = Engine.aplicarTroca(estado, ja, jd);

    // memórias (com o tipo REVELADO): defensor vê o golpe; atacante vê a previsão
    (mem[def].atkHist = mem[def].atkHist || []).push(r.tipo);
    (mem[atk].defHist = mem[atk].defHist || []).push(jd.preve);

    if (r.fim) return { vencedor: r.fim, rodadas: estado.rodada };
  }
  return { vencedor: 'timeout', rodadas: estado.rodada };
}

function rodarCenario(estratA, estratB, n, seed) {
  var rng = rngFrom(seed);
  var vitA = 0, vitB = 0, timeouts = 0, soma = 0;
  for (var i = 0; i < n; i++) {
    var res = jogarPartida(estratA, estratB, rng);
    if (res.vencedor === 'A') vitA++;
    else if (res.vencedor === 'B') vitB++;
    else timeouts++;
    soma += res.rodadas;
  }
  return { n: n, vitA: vitA, vitB: vitB, timeouts: timeouts, winrateA: vitA / n, mediaRodadas: soma / n };
}

function pct(x) { return (x * 100).toFixed(1) + '%'; }

function cmdSweep(n) {
  console.log('\n=== Varredura de DANO_ESCALA (Leitor[A] vs Previsível[B], ' + n + ' partidas) ===\n');
  console.log('ESCALA | win Leitor | méd. rodadas | timeouts');
  console.log('-------+------------+--------------+---------');
  var orig = Engine.CONST.DANO_ESCALA;
  [0.35, 0.45, 0.55, 0.65, 0.75, 0.9].forEach(function (e) {
    Engine.CONST.DANO_ESCALA = e;
    var r = rodarCenario(AI.leitor, AI.previsivel, n, 12345);
    console.log('  ' + e.toFixed(2) + ' |   ' + pct(r.winrateA).padStart(7) +
      '  |     ' + r.mediaRodadas.toFixed(1).padStart(5) + '    |   ' + r.timeouts);
  });
  Engine.CONST.DANO_ESCALA = orig;
  console.log('\nAlvo: win Leitor 58–80% e média ~10–18 rodadas.\n');
}

function cmdSuite(n) {
  var falhas = 0;
  function check(nome, cond, det) {
    if (!cond) falhas++;
    console.log('[' + (cond ? '  OK ' : 'FALHA') + '] ' + nome + (det ? '  → ' + det : ''));
  }

  console.log('\n=== Arkania Card Wars — Suíte Monte Carlo · modelo Híbrido (' + n + ' partidas/cenário) ===');
  console.log('DANO_ESCALA=' + Engine.CONST.DANO_ESCALA + ' ESP_MULT=' + Engine.CONST.ESP_MULT +
    ' CUSTO_ESPECIAL=' + Engine.CONST.CUSTO_ESPECIAL + '\n');

  // 1) Leitura decide: Leitor bate o Previsível (que não blefa nem lê).
  var lp = rodarCenario(AI.leitor, AI.previsivel, n, 999);
  console.log('Leitor vs Previsível: win Leitor = ' + pct(lp.winrateA) + ' | méd. rodadas = ' + lp.mediaRodadas.toFixed(1));
  check('Leitura decide (Leitor vence ≥70%)', lp.winrateA >= 0.70, pct(lp.winrateA));
  check('Sem timeouts', lp.timeouts === 0, lp.timeouts + ' timeouts');

  // 2) Não dá pra "ler" o acaso: Leitor vs Aleatória fica perto de 50%.
  var la = rodarCenario(AI.leitor, AI.aleatoria, n, 321);
  console.log('\nLeitor vs Aleatória: win Leitor = ' + pct(la.winrateA));
  check('Acaso não é explorável (Leitor 45–62%)', la.winrateA >= 0.45 && la.winrateA <= 0.62, pct(la.winrateA));

  // 3) Justiça: aleatória vs aleatória ~50% (iniciativa sorteada não domina).
  var rr = rodarCenario(AI.aleatoria, AI.aleatoria, n, 777);
  console.log('\nAleatória vs Aleatória: win A = ' + pct(rr.winrateA) + ' | méd. rodadas = ' + rr.mediaRodadas.toFixed(1));
  check('Justiça de iniciativa (win A 45–55%)', rr.winrateA >= 0.45 && rr.winrateA <= 0.55, pct(rr.winrateA));
  check('Duração saudável (9–17 rodadas)', rr.mediaRodadas >= 9 && rr.mediaRodadas <= 17, rr.mediaRodadas.toFixed(1));

  // 4) Espelho: leitor vs leitor ~50%.
  var ll = rodarCenario(AI.leitor, AI.leitor, n, 555);
  console.log('Leitor vs Leitor: win A = ' + pct(ll.winrateA));
  check('Espelho equilibrado (win A 44–56%)', ll.winrateA >= 0.44 && ll.winrateA <= 0.56, pct(ll.winrateA));

  console.log('\n' + (falhas === 0 ? '✅ Todos os alvos OK.' : '❌ ' + falhas + ' alvo(s) fora da faixa.') + '\n');
  process.exit(falhas === 0 ? 0 : 1);
}

var args = process.argv.slice(2);
var n = 10000, modo = 'suite';
for (var i = 0; i < args.length; i++) {
  if (args[i] === 'sweep') modo = 'sweep';
  else if (/^\d+$/.test(args[i])) n = parseInt(args[i], 10);
}
if (modo === 'sweep') cmdSweep(n); else cmdSuite(n);
