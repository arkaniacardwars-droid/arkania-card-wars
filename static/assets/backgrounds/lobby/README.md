# Camadas do lobby (dragões animados) 🐉

Coloque as camadas separadas AQUI (`assets/backgrounds/lobby/`), com estes
**nomes exatos**:

| Arquivo               | O que é                                              |
|-----------------------|------------------------------------------------------|
| `fundo.webp`          | Cenário **sem os dragões** (céu, montanhas, árvores) |
| `dragao-vermelho.png` | Só o dragão **central vermelho** (resto transparente)|
| `dragao-roxo.png`     | Só o dragão **esquerdo roxo** (resto transparente)   |
| `dragao-branco.png`   | Só o dragão **direito branco** (resto transparente)  |

Opcional: `frente.png` (primeiro plano, ex.: flores/cerejeiras) — anima com mais
parallax, passando "na frente".

## ⚠️ Regra de ouro do alinhamento

Exporte **cada camada no MESMO tamanho da imagem original** (mesma tela/canvas),
com o elemento na posição original e o resto **transparente**. Assim todas as
camadas se encaixam automaticamente (todas usam o mesmo enquadramento `cover`).

- **Não** recorte só o dragão coladinho — exporte a tela cheia com só aquele
  dragão visível.
- Formato: **PNG** para os dragões (precisa de transparência). O `fundo` pode ser
  WebP/JPG (mais leve), já que é opaco.
- Tamanho sugerido: igual ao `bg-dragoes.webp` original (paisagem 16:9).

## Como funciona

- Sem esses arquivos, o lobby continua usando `../bg-dragoes.webp` (imagem única) —
  nada quebra.
- Com os arquivos: o `fundo` recebe um Ken Burns lento, e **cada dragão** ganha um
  movimento próprio (respiração/balanço) + **parallax** conforme o mouse.
- Depois que você soltar, me avise: eu ajusto a intensidade/estilo do movimento de
  cada dragão (asas, flutuar, brilho nos olhos, etc.).
