# Arkania Card Wars — Bíblia de Combate (modelo "Híbrido")

> Documento-fonte da mecânica. O motor (`js/engine.js`) é a implementação fiel
> desta bíblia. Antes de mexer em qualquer constante, rode `node test/mc.js` e
> confira se os alvos de balanceamento continuam de pé.

## Atributos da carta

Cada carta tem 5 atributos (o que aparece na arte) + uma nota geral:

| Attr | Significado | Papel no combate |
|------|-------------|------------------|
| **ATA** | Ataque    | poder do golpe |
| **DEF** | Defesa    | mitiga o dano recebido |
| **VEL** | Velocidade| define quem ataca primeiro (iniciativa) |
| **ENE** | Energia   | recurso: paga o Especial e as apostas de leitura |
| **VID** | Vida      | vida da carta — zerou, perdeu |

> **Nota atual:** os atributos são um **template** (iguais em todas as cartas:
> ATA 92 · DEF 75 · VEL 45 · ENE 62 · VID 80). Com stats iguais, a partida é
> decidida **100% pela leitura/decisão**. Quando os valores variarem por carta,
> o "deck" passa a pesar junto com a skill.

## Filosofia

**Turnos + leitura.** É um duelo por turnos (você ataca, o oponente ataca), mas a
cada golpe há um **duelo mental**: o defensor aposta energia tentando **prever** se
vem um golpe Normal ou Especial. Ler certo bloqueia (e revida); ler errado dói.

## O turno (uma "troca")

1. **Iniciativa:** quem tem maior **VEL** ataca primeiro. Empate → sorteio (o jogo
   não vicia em quem começa). Depois os papéis **alternam** a cada troca.
2. **Atacante escolhe (em segredo):**
   - **Golpe Normal** — usa ATA, custo 0.
   - **Golpe Especial** — usa ATA × `ESP_MULT`, custa `CUSTO_ESPECIAL` de ENE.
3. **Defensor faz a leitura (em segredo):** prevê **Normal** ou **Especial** e
   **aposta** ENE.
4. **Resolução:**
   - `dano = (poder − DEF) × DANO_ESCALA` (mínimo `DANO_MIN`), sai da VID do defensor.
   - **Leu certo:** bloqueia parte do dano (∝ aposta, até `BLOQUEIO_MAX`) **e
     contra-ataca** (`CONTRA_FATOR` do que bloqueou volta como dano ao atacante).
   - **Leu errado:** toma o dano cheio — e a energia apostada foi perdida à toa.

Vence quem zerar a VID do oponente.

## Por que funciona (skill > deck)

- O atacante **blefa** entre Normal e Especial; o defensor **lê** o padrão.
- Contra um jogador **previsível**, o leitor bloqueia tudo e revida → vence fácil.
- Contra o **acaso** (jogadas aleatórias), não há padrão para ler → cai a ~50%
  (ninguém "lê a sorte").
- O **contra-ataque** dá agência à defesa e equilibra a vantagem de atacar primeiro.

## Constantes (o painel de balanceamento)

| Constante | Padrão | Papel |
|-----------|:------:|-------|
| `ENERGIA_INICIAL` | 30  | ENE no início |
| `ENERGIA_REGEN`   | 14  | ENE recuperada por troca (até o ENE da carta) |
| `CUSTO_ESPECIAL`  | 28  | ENE para desferir um Especial |
| `ESP_MULT`        | 1.35| multiplicador de ATA no Especial |
| `DANO_ESCALA`     | 0.55| escala global do dano — **botão de duração** |
| `DANO_MIN`        | 2   | dano mínimo de um golpe que passa |
| `BLOQUEIO_MAX`    | 0.75| redução máxima ao ler certo |
| `BLOQUEIO_ESCALA` | 34  | ENE apostada para bloqueio quase cheio |
| `CONTRA_FATOR`    | 0.5 | fração do bloqueado que volta como contra-ataque |

`DANO_ESCALA` é o botão mais sensível para **duração** (varie com `node test/mc.js sweep`).

## Alvos de balanceamento (validados por Monte Carlo)

`node test/mc.js` roda milhares de partidas e confirma:

- **Leitura decide:** o **Leitor** vence o **Previsível** (que não blefa nem lê) — ≥70%.
- **Acaso não é explorável:** Leitor vs Aleatória fica **45–62%** (não dá pra ler a sorte).
- **Justiça de iniciativa:** Aleatória vs Aleatória ~**50%** (iniciativa sorteada).
- **Espelho:** Leitor vs Leitor ~**50%**.
- **Duração:** confronto equilibrado dura **~9–17 trocas**.

Se algo sair da faixa, mexa em `DANO_ESCALA` (duração) e depois em `ESP_MULT` /
`BLOQUEIO_ESCALA` (peso do blefe vs. bloqueio).
