# Backgrounds do Lobby 🐉

Imagens de fundo da tela de lobby (atrás de tudo). Troque à vontade.

## Como usar

O lobby usa **`assets/backgrounds/bg-dragoes.webp`** por padrão — ver `css/style.css`
(seletor `#lobby-bg`). Para usar outra imagem, troque o arquivo (mantendo o nome)
ou atualize o caminho no CSS (ver abaixo).

- **Formato:** WebP de preferência (mais leve). JPG/PNG também servem.
- **Proporção:** paisagem, algo como **1920×1080** (16:9). A imagem é
  `cover` — preenche a tela inteira, cortando o excesso.
- **Foco:** deixe o dragão/arte mais para o **centro/direita**; o canto
  inferior-esquerdo (START) e os cantos recebem HUD por cima.
- Sem imagem, o lobby cai num fundo escuro com brasa dourada (fallback CSS),
  então nada quebra enquanto você não colocar a arte.

## Trocar por outra imagem

Para apontar outro arquivo, edite em `css/style.css`:

```css
#lobby-bg { background-image: url('../assets/backgrounds/bg-dragoes.webp'); }
```

> O lobby aplica uma animação leve (Ken Burns lento + pulsação do feixe de luz).
> Ela respeita `prefers-reduced-motion`. Ajustes ficam no mesmo seletor `#lobby-bg`
> em `css/style.css` (`@keyframes bg-drift` e `bg-brilho`).

> Um leve escurecimento (scrim) é aplicado por cima para manter os botões
> legíveis. Se a sua arte já for escura, dá pra reduzir esse scrim no mesmo seletor.
