/*
 * Smoke test do motor portado (espelha prototype/test/mc.js).
 * Garante o invariante central da bíblia: a LEITURA decide o duelo.
 *   npm run test
 */
import { describe, it, expect } from 'vitest';
import * as Engine from './engine.js';
import * as Cards from './cards.js';
import * as AI from './ai.js';

function rngFrom(seed) {
	var a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		var t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function jogarPartida(estratA, estratB, rng) {
	var carta = Cards.porId('mago-negro'); // template (todas iguais por ora)
	var estado = Engine.criarEstado(carta, carta, 'A', 'B', rng() < 0.5 ? 'A' : 'B');
	var estrat = { A: estratA, B: estratB },
		mem = { A: {}, B: {} };
	var MAX = 400;

	while (estado.rodada < MAX) {
		var atk = estado.atacante,
			def = atk === 'A' ? 'B' : 'A';
		var ja = estrat[atk].atacar(estado[atk], estado[def], mem[atk], rng);
		var jd = estrat[def].defender(estado[def], estado[atk], mem[def], rng);
		var r = Engine.aplicarTroca(estado, ja, jd);
		(mem[def].atkHist = mem[def].atkHist || []).push(r.tipo);
		(mem[atk].defHist = mem[atk].defHist || []).push(jd.preve);
		if (r.fim) return { vencedor: r.fim, rodadas: estado.rodada };
	}
	return { vencedor: 'timeout', rodadas: estado.rodada };
}

function rodarCenario(estratA, estratB, n, seed) {
	var rng = rngFrom(seed);
	var vitA = 0,
		timeouts = 0,
		soma = 0;
	for (var i = 0; i < n; i++) {
		var res = jogarPartida(estratA, estratB, rng);
		if (res.vencedor === 'A') vitA++;
		if (res.vencedor === 'timeout') timeouts++;
		soma += res.rodadas;
	}
	return { winrateA: vitA / n, timeouts, mediaRodadas: soma / n };
}

describe('motor híbrido', () => {
	it('iniciativa: maior VEL ataca primeiro', () => {
		const rapido = { ...Cards.porId('kassandra') }; // VEL alta
		const lento = { ...Cards.porId('guardiao-saturno') }; // VEL baixa
		expect(Engine.criarEstado(rapido, lento).atacante).toBe('A');
		expect(Engine.criarEstado(lento, rapido).atacante).toBe('B');
	});

	it('a leitura decide: Leitor vence o Previsível ≥70%', () => {
		const r = rodarCenario(AI.leitor, AI.previsivel, 2000, 999);
		expect(r.winrateA).toBeGreaterThanOrEqual(0.7);
	});

	it('o duelo sempre termina (sem timeouts)', () => {
		const r = rodarCenario(AI.leitor, AI.previsivel, 2000, 999);
		expect(r.timeouts).toBe(0);
	});
});
