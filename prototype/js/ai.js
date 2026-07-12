/*
 * Arkania Card Wars — Estratégias do modelo Híbrido (IA do duelo + baselines do Monte Carlo).
 *
 * Cada estratégia é um objeto com dois papéis:
 *   atacar(self, opp, mem, rng)   -> { tipo: 'normal' | 'especial' }
 *   defender(self, opp, mem, rng) -> { preve: 'normal' | 'especial', aposta: n }
 *
 * mem: memória livre entre trocas. Alimente-a com registrar() após revelar as jogadas:
 *   mem.atkHist -> tipos que o oponente usou ATACANDO (para você prever quando defende)
 *   mem.defHist -> previsões que o oponente fez DEFENDENDO (para você atacar quando ataca)
 */
(function (global) {
  'use strict';

  var Engine = (typeof require !== 'undefined') ? require('./engine.js') : global.ArkaniaEngine;

  function freq(lista, valor) {
    if (!lista || !lista.length) return 0.5;
    var n = 0;
    for (var i = 0; i < lista.length; i++) if (lista[i] === valor) n++;
    return n / lista.length;
  }

  // registra o que foi revelado nesta troca, do ponto de vista de quem observa `mem`.
  // tipoDoAtacante = o golpe que o atacante usou; preveDoDefensor = o palpite do defensor.
  function registrar(mem, tipoDoAtacante, preveDoDefensor) {
    (mem.atkHist = mem.atkHist || []).push(tipoDoAtacante);
    (mem.defHist = mem.defHist || []).push(preveDoDefensor);
  }

  /* ---------- Aleatória: baseline sem leitura ---------- */
  var aleatoria = {
    atacar: function (self, opp, mem, rng) {
      rng = rng || Math.random;
      var tipo = (Engine.podeEspecial(self) && rng() < 0.5) ? 'especial' : 'normal';
      return { tipo: tipo };
    },
    defender: function (self, opp, mem, rng) {
      rng = rng || Math.random;
      return {
        preve: rng() < 0.5 ? 'especial' : 'normal',
        aposta: Math.floor(rng() * Math.min(self.energia + 1, 26))
      };
    }
  };

  /* ---------- Previsível: exploitável de propósito (deck sem blefe) ----------
   * Ataca: sempre Especial quando tem energia (senão Normal).
   * Defende: sempre prevê Normal, com aposta pequena.
   * Se o Leitor bate este consistentemente, provamos que a LEITURA decide.       */
  var previsivel = {
    atacar: function (self) {
      return { tipo: Engine.podeEspecial(self) ? 'especial' : 'normal' };
    },
    defender: function (self) {
      return { preve: 'normal', aposta: Math.min(self.energia, 12) };
    }
  };

  /* ---------- Leitor: encarna o "skill" ---------- */
  var leitor = {
    // ataca onde o defensor menos espera; usa Especial quando ele tende a prever Normal
    atacar: function (self, opp, mem, rng) {
      rng = rng || Math.random;
      var pDefEsp = freq(mem.defHist, 'especial'); // quão frequente o oponente prevê Especial
      if (!Engine.podeEspecial(self)) return { tipo: 'normal' };
      // se ele raramente prevê Especial, castiga com Especial; senão finta no Normal
      if (pDefEsp < 0.45) return { tipo: 'especial' };
      if (pDefEsp > 0.6) return { tipo: 'normal' };
      return { tipo: rng() < 0.5 ? 'especial' : 'normal' };
    },
    // prevê o golpe pela tendência do atacante e aposta conforme a confiança
    defender: function (self, opp, mem) {
      // se o oponente não pode dar Especial, é Normal na certa
      if (!Engine.podeEspecial(opp)) {
        return { preve: 'normal', aposta: Math.min(self.energia, 14) };
      }
      var pEsp = freq(mem.atkHist, 'especial');
      var preve = pEsp >= 0.5 ? 'especial' : 'normal';
      var confianca = Math.abs(pEsp - 0.5) * 2;            // 0..1
      var teto = self.vida <= self.vidaMax * 0.35 ? self.energia : Math.min(self.energia, 30);
      var aposta = Math.round((0.4 + 0.6 * confianca) * teto);
      return { preve: preve, aposta: aposta };
    }
  };

  var api = { aleatoria: aleatoria, previsivel: previsivel, leitor: leitor, registrar: registrar, freq: freq };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ArkaniaAI = api;

})(typeof window !== 'undefined' ? window : globalThis);
