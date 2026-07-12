/*
 * Arkania — Perfil do jogador: nome, foto, bio, estatísticas (partidas /
 * vitórias / derrotas / taxa de vitória) e as 3 cartas mais usadas. Persiste
 * local (localStorage), no mesmo padrão de repositório do resto do jogo
 * (js/store.js, js/lobby.js). Migrar para backend depois = reescrever só a
 * camada de leitura/gravação abaixo.
 *
 *   arkania.perfil.v1 = { nome, foto: <idDaCarta>|null, bio }
 *   arkania.stats.v1  = { partidas, vitorias, derrotas, usoCartas: { <id>: n } }
 *   arkania.rostos.v1 = { <idDaCarta>: "<x>% <y>%" }   // foco do rosto (cache)
 *
 * A foto é o id de uma carta do catálogo — usamos a arte (ou o emoji) do
 * personagem como ícone de avatar, então "todos os personagens do jogo" já
 * viram opções de foto automaticamente. Ao aplicar a arte no círculo, um
 * detector de rosto (canvas) centraliza a cabeça do personagem.
 */
(function (global) {
  'use strict';

  var Cards = global.ArkaniaCards;

  var K_PERFIL = 'arkania.perfil.v1';
  var K_STATS  = 'arkania.stats.v1';
  var K_ROSTOS = 'arkania.rostos.v6';
  var BIO_MAX  = 240;
  var NOME_MAX = 20;
  var NOME_PADRAO = 'Duelista';

  // ---------------- persistência ----------------
  function lerJSON(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; }
    catch (e) { return fallback; }
  }
  function gravarJSON(k, obj) {
    try { localStorage.setItem(k, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getPerfil() {
    var p = lerJSON(K_PERFIL, {});
    return {
      nome: (typeof p.nome === 'string' && p.nome.trim()) ? p.nome.trim().slice(0, NOME_MAX) : NOME_PADRAO,
      foto: (typeof p.foto === 'string' && Cards.porId(p.foto)) ? p.foto : null,
      bio:  typeof p.bio === 'string' ? p.bio : '',
      criadoEm: typeof p.criadoEm === 'number' ? p.criadoEm : null
    };
  }
  // data de criação da conta: registrada na 1ª vez que o perfil roda (protótipo
  // local). Com backend, isto passa a vir do created_at da conta.
  function garantirCriadoEm() {
    var p = getPerfil();
    if (!p.criadoEm) { p.criadoEm = Date.now(); gravarJSON(K_PERFIL, p); }
    return p.criadoEm;
  }
  function formatarData(ts) {
    try {
      return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function salvarPerfil(dados) {
    var p = getPerfil();
    if (dados && typeof dados.nome === 'string') { var n = dados.nome.trim().slice(0, NOME_MAX); p.nome = n || NOME_PADRAO; }
    if (dados && 'foto' in dados) p.foto = (dados.foto && Cards.porId(dados.foto)) ? dados.foto : null;
    if (dados && typeof dados.bio === 'string') p.bio = dados.bio.trim().slice(0, BIO_MAX);
    gravarJSON(K_PERFIL, p);
    return p;
  }

  function getStats() {
    var s = lerJSON(K_STATS, {});
    return {
      partidas:  s.partidas | 0,
      vitorias:  s.vitorias | 0,
      derrotas:  s.derrotas | 0,
      usoCartas: (s.usoCartas && typeof s.usoCartas === 'object') ? s.usoCartas : {}
    };
  }
  function registrarPartida(venceu, cartaId) {
    var s = getStats();
    s.partidas += 1;
    if (venceu) s.vitorias += 1; else s.derrotas += 1;
    if (cartaId && Cards.porId(cartaId)) s.usoCartas[cartaId] = (s.usoCartas[cartaId] | 0) + 1;
    gravarJSON(K_STATS, s);
  }
  function topCartas(n) {
    n = n || 3;
    var uso = getStats().usoCartas;
    return Object.keys(uso)
      .map(function (id) { return { carta: Cards.porId(id), usos: uso[id] | 0 }; })
      .filter(function (o) { return o.carta && o.usos > 0; })
      .sort(function (a, b) { return b.usos - a.usos; })
      .slice(0, n);
  }

  // ---------------- detecção de rosto (enquadramento do avatar) ----------------
  // Detecta a CAIXA do rosto/cabeça na arte e dá zoom nela, então o círculo do
  // avatar mostra só o rosto — bem fechado e sem o painel de status (que fica na
  // faixa inferior da arte, deliberadamente ignorada aqui).
  //
  // Como: num canvas pequeno, pontua cada pixel por "pele" + saliência de cor,
  // com viés vertical para o topo (cabeça em arte-retrato) e IGNORANDO a faixa
  // de baixo (painel). Dos perfis de linha/coluna extrai a janela que concentra
  // a massa → caixa do rosto {cx,cy,fw,fh} em frações da imagem.
  // Enquadramento NORMAL mostrando a arte do topo (inclusive a bandeirinha da
  // nota) até FAIXA_BASE. Só o painel de nome/stats (~64% p/ baixo) fica de fora.
  // Zoom limitado a ZOOM_MAX → a janela fica ancorada no topo, sem aproximar.
  var FAIXA_TOPO   = 0.0;    // mostra desde o topo (bandeirinha visível)
  var FAIXA_BASE   = 0.63;   // base da janela útil (painel começa ~0.64)
  var ZOOM_MAX     = 1.65;   // teto do zoom → mantém a foto "normal", sem aproximar
  var ZONA_ROSTO   = 0.60;   // analisa só os 60% de cima ao procurar o rosto
  var MASSA        = 0.52;   // fração da massa que a caixa do rosto deve conter
  var ALVO         = 0.98;   // enquadramento folgado (rosto não colado nas bordas)

  // janela mínima em torno do centro que acumula `alvo` da massa do perfil `m`
  function janela(m, centro, alvo) {
    var i0 = centro, i1 = centro, acc = m[centro] || 0;
    while (acc < alvo && (i0 > 0 || i1 < m.length - 1)) {
      var esq = i0 > 0 ? m[i0 - 1] : -1;
      var dir = i1 < m.length - 1 ? m[i1 + 1] : -1;
      if (dir >= esq) { i1++; acc += m[i1]; } else { i0--; acc += m[i0]; }
    }
    return [i0, i1];
  }

  function detectarCaixaRosto(img) {
    var W = 56, NH = img.naturalHeight, NW = img.naturalWidth;
    var H = Math.max(16, Math.round(W * NH / NW));
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    var d = ctx.getImageData(0, 0, W, H).data;   // pode lançar se tainted (file://)

    var yLim = Math.round(H * ZONA_ROSTO);
    var Wx = new Array(W).fill(0), Wy = new Array(H).fill(0), total = 0;
    for (var y = 0; y < yLim; y++) {
      var vy = y / (H - 1);
      var prior = Math.exp(-Math.pow((vy - 0.32) / 0.24, 2)); // pico ~1/3 do topo
      for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if ((r + g + b) / 765 < 0.06) continue;   // ignora fundo quase preto
        var pele = (r > 60 && g > 30 && b > 15 && r >= g && g >= b * 0.9 && (r - b) > 10 && (mx - mn) > 10) ? 1 : 0;
        var w = prior * (0.5 + (mx - mn) / 255 + pele * 2.4);
        Wx[x] += w; Wy[y] += w; total += w;
      }
    }
    if (total <= 0) return null;

    var cx = 0, cy = 0, k;
    for (k = 0; k < W; k++) cx += k * Wx[k];
    for (k = 0; k < H; k++) cy += k * Wy[k];
    cx = Math.round(cx / total); cy = Math.round(cy / total);

    var fx = janela(Wx, cx, total * MASSA);
    var fy = janela(Wy, cy, total * MASSA);
    // margem em volta da caixa (deixa respiro para o rosto não colar na borda)
    var mrx = (fx[1] - fx[0]) * 0.22, mry = (fy[1] - fy[0]) * 0.22;
    var x0 = Math.max(0, fx[0] - mrx), x1 = Math.min(W, fx[1] + mry * 0 + mrx);
    var y0 = Math.max(0, fy[0] - mry * 1.1), y1 = Math.min(H, fy[1] + mry);

    var fw = Math.max(0.26, (x1 - x0) / W);
    var fh = Math.max(0.26, (y1 - y0) / H);
    return { cx: (x0 + x1) / 2 / W, cy: (y0 + y1) / 2 / H, fw: fw, fh: fh };
  }

  // monta o frame da <img> (% do container quadrado) a partir da caixa do rosto.
  // A janela visível fica presa à faixa [FAIXA_TOPO, FAIXA_BASE] da arte → a
  // bandeirinha (topo) e o painel (base) nunca aparecem no avatar.
  function montarFrame(box, arHW) {
    var banda = FAIXA_BASE - FAIXA_TOPO;                  // altura útil da ilustração
    // zoom NORMAL: piso garante caber na banda e cobrir; teto evita aproximar demais
    var sh = Math.min(ALVO / box.fh, ALVO * arHW / box.fw);
    sh = Math.max(sh, 1 / banda, arHW, 1.0);
    sh = Math.min(sh, ZOOM_MAX);
    var sw = sh / arHW;                                   // aspecto preservado
    var winH = 1 / sh, winW = 1 / sw;                     // janela visível (fração da arte)
    // centraliza no rosto, mas mantém a janela dentro de [FAIXA_TOPO, FAIXA_BASE]
    var winTop = Math.max(FAIXA_TOPO, Math.min(FAIXA_BASE - winH, box.cy - winH / 2));
    var winLeft = Math.max(0, Math.min(1 - winW, box.cx - winW / 2));
    var W = sw * 100, H = sh * 100;
    return {
      w: +W.toFixed(1), h: +H.toFixed(1),
      l: +(-winLeft * W).toFixed(1), t: +(-winTop * H).toFixed(1)
    };
  }

  // frame sem detecção (canvas bloqueado/sem rosto): centro da banda útil.
  function frameDefault(img) {
    return montarFrame({ cx: 0.5, cy: 0.36, fw: 0.6, fh: 0.5 }, img.naturalHeight / img.naturalWidth);
  }
  function calcularFrame(img) {
    var box = detectarCaixaRosto(img);   // pode lançar (tainted) — tratado no chamador
    return box ? montarFrame(box, img.naturalHeight / img.naturalWidth) : frameDefault(img);
  }

  function aplicarFrame(img, f) {
    img.style.objectFit = 'fill';                         // w/h já respeitam o aspecto
    img.style.width = f.w + '%'; img.style.height = f.h + '%';
    img.style.left = f.l + '%'; img.style.top = f.t + '%';
    img.style.objectPosition = '';
  }

  function enquadrarRosto(img, cardId) {
    var cache = lerJSON(K_ROSTOS, {});
    var f = cache[cardId];
    if (f && typeof f === 'object') { aplicarFrame(img, f); return; }
    var run = function () {
      var fr;
      try { fr = calcularFrame(img); }                    // detecta o rosto
      catch (e) { fr = frameDefault(img); }               // canvas bloqueado (file://)
      aplicarFrame(img, fr);                              // sempre recorta o painel fora
      cache[cardId] = fr; gravarJSON(K_ROSTOS, cache);
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener('load', run, { once: true });
  }

  // ---------------- avatar ----------------
  // pinta um container redondo com o ROSTO da carta enquadrado; emoji atrás como fallback.
  function pintarAvatar(elemento, foto) {
    if (!elemento) return;
    var c = foto ? Cards.porId(foto) : null;
    elemento.innerHTML = '<span class="av-emoji">' + (c ? c.emoji : '🛡️') + '</span>';
    if (!c) return;
    var url = Cards.urlArte(c);
    if (!url) return;
    var img = document.createElement('img');
    img.className = 'av-img'; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = function () { img.remove(); };
    enquadrarRosto(img, c.id);   // zoom na caixa do rosto (cache/heurística)
    img.src = url;
    elemento.appendChild(img);
  }
  function q(id) { return document.getElementById(id); }

  // ---------------- modal ----------------
  var pendenteFoto = null;   // foto escolhida no picker mas ainda não salva
  var avatarLobby = null;    // avatar do lobby (repintado ao salvar)
  var nomeLobby = null;      // nome do lobby (reescrito ao salvar)

  function pintarNomeLobby(nome) {
    if (nomeLobby) nomeLobby.innerHTML = esc(nome) + ' <span class="nv">Nv.7</span>';
  }

  function abrir() {
    var p = getPerfil();
    pendenteFoto = p.foto;

    pintarAvatar(q('pf-av'), pendenteFoto);
    var nomeIn = q('pf-nome-input');
    if (nomeIn) nomeIn.value = p.nome;
    var bio = q('pf-bio');
    if (bio) bio.value = p.bio;
    var membro = q('pf-membro');
    if (membro) membro.textContent = 'Membro desde ' + formatarData(p.criadoEm || garantirCriadoEm());
    var salvo = q('pf-salvo');
    if (salvo) salvo.textContent = '';

    montarStats();
    montarTopCartas();
    montarPicker();

    q('perfil-modal').classList.add('ativa');
  }
  function fechar() { q('perfil-modal').classList.remove('ativa'); }

  function montarStats() {
    var box = q('pf-stats');
    if (!box) return;
    var s = getStats();
    var taxa = s.partidas ? Math.round(s.vitorias / s.partidas * 100) : 0;
    var itens = [
      { v: s.partidas,   l: 'Partidas',      cls: '' },
      { v: s.vitorias,   l: 'Vitórias',      cls: 'win' },
      { v: s.derrotas,   l: 'Derrotas',      cls: 'loss' },
      { v: taxa + '%',   l: 'Taxa Vitória',  cls: 'win' }
    ];
    box.innerHTML = itens.map(function (i) {
      return '<div class="pf-stat ' + i.cls + '"><b>' + i.v + '</b><span>' + i.l + '</span></div>';
    }).join('');
  }

  function montarTopCartas() {
    var box = q('pf-top');
    if (!box) return;
    box.innerHTML = '';
    var top = topCartas(3);
    // sempre 3 slots (#1 #2 #3) da esquerda p/ direita — vazios até serem usados
    for (var i = 0; i < 3; i++) {
      var o = top[i];
      var item = document.createElement('div');
      item.className = 'pf-top-item';
      var carta = document.createElement('div');
      carta.className = 'pf-top-carta' + (o ? '' : ' vazio');
      if (o) {
        carta.appendChild(Cards.el(o.carta));
      } else {
        var ph = document.createElement('div');
        ph.className = 'pf-top-slot-vazio';
        carta.appendChild(ph);
      }
      var medalha = document.createElement('span');
      medalha.className = 'pf-top-pos';
      medalha.textContent = '#' + (i + 1);
      carta.appendChild(medalha);
      var info = document.createElement('div');
      info.className = 'pf-top-info';
      info.innerHTML = o
        ? '<span class="pf-top-nome">' + esc(o.carta.nome) + '</span>' +
          '<span class="pf-top-usos">' + o.usos + (o.usos === 1 ? ' partida' : ' partidas') + '</span>'
        : '<span class="pf-top-nome">—</span><span class="pf-top-usos">0 partidas</span>';
      item.appendChild(carta);
      item.appendChild(info);
      box.appendChild(item);
    }
  }

  function montarPicker() {
    var box = q('pf-avatares');
    if (!box) return;
    box.innerHTML = '';
    Cards.todas().forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pf-av-opt' + (c.id === pendenteFoto ? ' sel' : '');
      b.title = c.nome;
      b.setAttribute('data-id', c.id);
      pintarAvatar(b, c.id);
      b.addEventListener('click', function () {
        pendenteFoto = c.id;
        pintarAvatar(q('pf-av'), pendenteFoto);
        box.querySelectorAll('.pf-av-opt.sel').forEach(function (e) { e.classList.remove('sel'); });
        b.classList.add('sel');
      });
      box.appendChild(b);
    });
  }

  function salvar() {
    var nomeIn = q('pf-nome-input');
    var bio = q('pf-bio');
    var p = salvarPerfil({
      nome: nomeIn ? nomeIn.value : NOME_PADRAO,
      foto: pendenteFoto,
      bio: bio ? bio.value : ''
    });
    if (nomeIn) nomeIn.value = p.nome;           // normaliza (ex.: vazio → Duelista)
    pintarAvatar(avatarLobby, p.foto);           // reflete no lobby na hora
    pintarNomeLobby(p.nome);
    var salvo = q('pf-salvo');
    if (salvo) {
      salvo.textContent = '✓ Perfil salvo';
      salvo.classList.add('show');
      setTimeout(function () { salvo.classList.remove('show'); }, 2200);
    }
  }

  // ---------------- boot ----------------
  function boot() {
    garantirCriadoEm();            // carimba a data de criação da conta (1ª vez)
    var p = getPerfil();
    // avatar + nome do lobby refletem o que está salvo; clicar abre o modal
    avatarLobby = document.querySelector('.lb-perfil-av');
    nomeLobby = document.querySelector('.lb-perfil-nome');
    pintarAvatar(avatarLobby, p.foto);
    pintarNomeLobby(p.nome);

    var perfilBtn = document.querySelector('.lb-perfil');
    if (perfilBtn) {
      perfilBtn.classList.add('clicavel');
      perfilBtn.addEventListener('click', abrir);
    }

    var fecharBtn = q('pf-fechar');
    if (fecharBtn) fecharBtn.addEventListener('click', fechar);
    var fundo = q('perfil-modal');
    if (fundo) fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    var salvarBtn = q('pf-salvar');
    if (salvarBtn) salvarBtn.addEventListener('click', salvar);

    // deep-link: abrir /index.html#perfil já com o perfil aberto
    if (global.location && global.location.hash === '#perfil') abrir();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // API pública (game.js registra as partidas por aqui)
  global.ArkaniaPerfil = {
    getPerfil: getPerfil, salvarPerfil: salvarPerfil,
    getStats: getStats, registrarPartida: registrarPartida, topCartas: topCartas,
    pintarAvatar: pintarAvatar, abrir: abrir
  };

})(window);
