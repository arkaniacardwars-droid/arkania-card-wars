# Molduras ornamentadas 🖼️

Molduras dos HUDs (perfil, recursos e "Meu Deck"). Por padrão o jogo usa uma
moldura desenhada em **SVG** (cantos com filigrana dourada), definida na variável
CSS `--frame-img` em `css/style.css`.

## Trocar por uma arte própria (ex.: moldura gótica de PNG)

Para o visual barroco/gótico realista (tipo aqueles frames de metal ornamentado),
use um **PNG transparente** de moldura (com os 4 cantos desenhados):

1. Salve a arte aqui, ex.: `assets/frames/moldura.png`.
   - Precisa ser uma **moldura completa** (4 cantos + bordas), fundo transparente.
   - Quadrada de preferência (ex.: 512×512), cantos ocupando ~1/4 de cada lado.
2. Em `css/style.css`, aponte a variável e ajuste o *slice* (px do canto na imagem):

   ```css
   :root {
     --frame-img: url('../assets/frames/moldura.png');
   }
   /* e no seletor .lb-perfil::before,.lb-recursos::before,.deck-grid::before: */
   /* border-image: var(--frame-img) 128 stretch;  (128 = tamanho do canto no PNG) */
   ```

3. `border-image` repete/estica só as **bordas**; os **cantos** ficam nítidos.
   Ajuste `border-width` (espessura da moldura) e o número do `slice` até encaixar.

> ⚠️ Use só imagens que você tem licença para usar. Não coloque aqui prints com
> marca d'água de bancos de imagem (ex.: PNGTree) — além de ilegal, a marca aparece.
