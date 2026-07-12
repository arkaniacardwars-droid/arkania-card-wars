# 🎨 Arte das cartas — `assets/cartas/`

Aqui ficam **todas as imagens das cartas** do Arkania Card Wars. Você cria a arte e solta
o arquivo nesta pasta; o jogo passa a exibi-la no lugar do emoji provisório.

O formato padrão é **WebP** — mais leve que PNG/JPG com a mesma qualidade, e
suportado por todos os navegadores modernos.

## Como adicionar a arte de uma carta

1. **Exporte a arte em `.webp`** e salve aqui com o nome igual ao `id` da carta.
   Ex.: a carta `campeao-dourado` → `assets/cartas/campeao-dourado.webp`

2. **Ligue no catálogo** em [`../../js/cards.js`](../../js/cards.js): na carta,
   basta `arte: true` (o jogo monta `assets/cartas/<id>.webp` sozinho).

   ```js
   { id: 'campeao-dourado', base: 'campeao', nome: 'Campeão Dourado',
     variante: 'Dourado', raridade: 'lendario', emoji: '👑',
     arte: true,                    // ← usa assets/cartas/campeao-dourado.webp
     dom: 'FOR', stats: { FOR:9, VEL:8, INT:4, DEF:5 } },
   ```

3. Pronto. A arte aparece na mão, no palco do lobby, na revelação de combate e no
   Catálogo — com carregamento `lazy` (só baixa quando aparece). Se o arquivo
   faltar ou não carregar, o `emoji` volta como fallback — **o jogo nunca quebra
   por falta de arte**.

## Especificação da imagem

| Item | Recomendação |
|------|--------------|
| Formato | **WebP** |
| Proporção | retrato **4:5** (ex.: `512 × 640 px`) |
| Qualidade | ~80 (WebP com perdas) costuma dar o melhor peso/qualidade |
| Enquadramento | a arte **preenche a janela de ilustração** (`object-fit: cover` — sobra é cortada nas bordas) |
| Fundo | pode ser cheio (full-bleed); a moldura e a borda de raridade ficam por cima |
| Peso | mire **< ~120 KB** por carta (com WebP dá folga de sobra) |

> A janela de ilustração fica **entre o nome (topo) e os stats (base)** da carta.
> Deixe o rosto/foco do personagem no centro-superior para não ser cortado.

## Como gerar o WebP

- **Do terminal (cwebp):** `cwebp -q 80 campeao-dourado.png -o campeao-dourado.webp`
- **Em lote:** `for f in *.png; do cwebp -q 80 "$f" -o "${f%.png}.webp"; done`
- **Ferramentas visuais:** Squoosh (squoosh.app), Photoshop/Affinity ("Exportar → WebP"),
  Figma (plugin de export WebP) ou GIMP.

## Convenções

- **1 arquivo por carta**, nome = `id` da carta em kebab-case (`campeao-dourado.webp`).
- **Variantes** do mesmo personagem são cartas diferentes → arquivos diferentes:
  `campeao.webp`, `campeao-dourado.webp`, `campeao-sombrio.webp`…
- **Cada carta é única** (uma de cada no jogo). A variante mais rara é uma carta
  à parte, não uma "cópia melhorada".
- Precisa de outro formato numa carta específica? Dá pra sobrescrever:
  `arte: 'campeao.png'` ou um caminho completo. Mas o padrão é WebP.

## Raridades (borda + gema no canto da carta)

| Raridade | Cor |
|----------|-----|
| Comum | cinza |
| Incomum | verde |
| Raro | azul |
| Épico | roxo |
| Lendário | dourado (com brilho) |

A raridade é definida no catálogo (`raridade: '...'`), não pela arte.
