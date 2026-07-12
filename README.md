# Arkania Card Wars ⚔️ — Arena Imperial

Jogo de cartas web. Dinâmica inspirada em **Yu-Gi-Oh** (leitura mental), roupagem
visual de **Age of Empires** (paleta imperial, serifa, 4 eixos nas cores de jogador).

Protótipo **local, sem build** (HTML5 + Canvas + JavaScript clássico). Oponente = IA.
A ideia é validar o *núcleo divertido* antes de portar para a stack online
(SvelteKit + Upstash Redis + Supabase Realtime).

## Como rodar

Sem dependências, sem build. Duas formas:

```bash
# 1) abrir direto no navegador
open index.html            # macOS

# 2) ou servir (recomendado, evita qualquer restrição de file://)
python3 -m http.server 8080
# depois abra http://localhost:8080
```

## Como jogar — "Aposta Cega"

A cada rodada os dois lados escolhem **ao mesmo tempo e em segredo** um triplo:

1. **Carta** (da mão de 5)
2. **Postura / eixo**: `FOR` · `VEL` · `INT` · `DEF`
3. **Aposta** de Fôlego (amplifica o embate, mas se você perde ela vira dano — *backfire*)

Vence o embate quem tiver maior **valor efetivo**:
`stat do eixo + (MARGEM se dominar o ciclo) + aposta × peso`. O ciclo é
`FOR ▸ VEL ▸ INT ▸ DEF ▸ FOR` (cada um domina o próximo). **Skill > deck**: ler o
eixo do adversário vale mais que ter a carta maior. Vida 36; ganha quem zerar o outro.

Detalhes completos e racional de balanceamento: [`design/combat-bible.md`](design/combat-bible.md).

## Estrutura

```
arkania-card-wars/
├── index.html          # lobby (estilo PUBG) + arena de duelo + catálogo
├── css/style.css       # tema Age of Empires
├── js/
│   ├── engine.js       # MOTOR puro do combate (usado pelo jogo E pelos testes)
│   ├── cards.js        # CATÁLOGO de cartas (fonte única) + raridades + render
│   ├── ai.js           # estratégias: leitor, statMaxer, mixer, aleatório
│   ├── backdrop.js     # cenário atmosférico em Canvas
│   ├── game.js         # lógica do duelo (mão, revelação, HUD, fim)
│   └── lobby.js        # navegação, modal "Jogar" e tela de Coleção
├── assets/cartas/      # 🎨 ARTE das cartas (veja o README de lá p/ adicionar)
├── design/combat-bible.md   # bíblia do combate (fonte da verdade)
└── test/mc.js          # harness de Monte Carlo
```

## Cartas (catálogo colecionável)

Todas as cartas do jogo vivem em **um só lugar**: o catálogo em
[`js/cards.js`](js/cards.js). Cada carta é **única** (uma de cada). Um mesmo
personagem/objeto (`base`) pode ter **variantes** — estilo/config diferente e
raridade maior (ex.: *Campeão* épico e *Campeão Dourado* lendário).

- **Ver todas:** lobby → aba **Coleção** (agrupadas por personagem, filtro por raridade).
- **Adicionar arte:** solte a imagem em `assets/cartas/` e aponte `arte:` no catálogo —
  veja [`assets/cartas/README.md`](assets/cartas/README.md). Sem arte, usa o emoji (fallback).
- **Raridades:** comum · incomum · raro · épico · lendário (borda + gema na carta).

## Testes / balanceamento (Monte Carlo)

O motor é puro e roda igual no Node, então dá pra validar o balanceamento com
milhares de partidas simuladas:

```bash
node test/mc.js            # suíte com os alvos da bíblia (skill>deck, duração, simetria)
node test/mc.js sweep      # varre MARGEM e mostra win-rate / duração
node test/mc.js 20000      # nº de partidas por cenário
```

`MARGEM` é o botão de balanceamento mais sensível. Sempre rode a suíte depois de
mexer em qualquer constante em `js/engine.js`.

## Status

- [x] Núcleo de combate "Aposta Cega" (motor puro, validado por Monte Carlo)
- [x] Duelo local jogável contra IA leitora
- [x] Lobby imperial (HUD estilo PUBG) + modo Aposta (carta em jogo)
- [x] Catálogo de cartas colecionáveis (raridades, variantes, arte plugável) + tela de Coleção
- [ ] Online: fila (Upstash Redis), salas e convites (Supabase Realtime) — próximo passo
- [ ] Deckbuilding (montar deck a partir da coleção), Passe do Duelista funcional, posse de cartas por jogador

> Ainda **não** é repositório git. Versionar/deployar só quando decidirmos.
