/*
 * Arkania Card Wars — efeitos atmosféricos do LOBBY em Canvas.
 * Brasas/faíscas douradas subindo sobre o fundo de dragões, dando "vida" à cena
 * sem precisar separar a arte em camadas. Puramente decorativo e leve.
 * Pausa quando o lobby não está visível e respeita prefers-reduced-motion.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('lobby-fx');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, t = 0;
  var brasas = [], faiscas = [];

  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    semear();
  }

  function novaBrasa(inicial) {
    return {
      x: rnd(0, W),
      y: inicial ? rnd(0, H) : H + rnd(0, 40),
      r: rnd(1.4, 4),
      vy: rnd(0.3, 1.1),         // sobe devagar
      sway: rnd(0.4, 1.4),        // amplitude do balanço lateral
      fase: rnd(0, Math.PI * 2),
      vel: rnd(0.4, 1.2),
      a: rnd(0.5, 1),
      quente: Math.random() < 0.5 // metade mais quentes (quase brancas)
    };
  }

  function semear() {
    var n = reduz ? 0 : Math.round((W * H) / 24000); // densidade leve-média
    brasas = [];
    for (var i = 0; i < n; i++) brasas.push(novaBrasa(true));
    faiscas = [];
  }

  function ativo() {
    var lobby = document.getElementById('tela-lobby');
    return lobby && lobby.classList.contains('ativa');
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!ativo()) { ctx.clearRect(0, 0, W, H); return; }

    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; // brilho aditivo (fogo)

    for (var i = 0; i < brasas.length; i++) {
      var p = brasas[i];
      p.y -= p.vy;
      p.x += Math.sin(t * p.vel + p.fase) * p.sway * 0.5;
      // desvanece perto do topo
      var vida = p.y / H;
      var alpha = p.a * Math.max(0, Math.min(1, vida * 1.4));
      if (p.y < -10) { brasas[i] = novaBrasa(false); continue; }

      var cor = p.quente ? '255,240,200' : '245,165,70';
      var raio = p.r * 3.4;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio);
      g.addColorStop(0, 'rgba(' + cor + ',' + alpha + ')');
      g.addColorStop(0.4, 'rgba(' + cor + ',' + (alpha * 0.5) + ')');
      g.addColorStop(1, 'rgba(' + cor + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
      ctx.fill();
      // núcleo quente da brasa
      ctx.fillStyle = 'rgba(255,250,230,' + (alpha * 0.9) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // faíscas ocasionais (brilho rápido que sobe e some)
    if (!reduz && Math.random() < 0.04) {
      faiscas.push({ x: rnd(0, W), y: H * rnd(0.55, 0.95), r: rnd(1, 2), a: 1, vy: rnd(1.2, 2.4) });
    }
    for (var j = faiscas.length - 1; j >= 0; j--) {
      var f = faiscas[j];
      f.y -= f.vy; f.a -= 0.02;
      if (f.a <= 0) { faiscas.splice(j, 1); continue; }
      ctx.fillStyle = 'rgba(255,240,190,' + f.a + ')';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();

/* ======================================================================
 * Parallax dos dragões do lobby — cada camada desloca conforme o mouse,
 * com profundidades diferentes (data-par). Só quando há camadas separadas.
 * ==================================================================== */
(function () {
  'use strict';
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz) return;
  var wraps = Array.prototype.slice.call(document.querySelectorAll('.bg-dragao-wrap'));
  if (!wraps.length) return;
  var mx = 0, my = 0, agendado = false;

  function aplicar() {
    agendado = false;
    for (var i = 0; i < wraps.length; i++) {
      var par = parseFloat(wraps[i].getAttribute('data-par')) || 0;
      wraps[i].style.transform = 'translate(' + (mx * par) + 'px,' + (my * par) + 'px)';
    }
  }
  window.addEventListener('mousemove', function (e) {
    // -0.5..0.5 a partir do centro da tela
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
    if (!agendado) { agendado = true; requestAnimationFrame(aplicar); }
  });
})();

/* ======================================================================
 * Fogo do Battle Pass — chamas subindo do fundo/laterais + brasas subindo.
 * ==================================================================== */
(function () {
  'use strict';
  var cv = document.getElementById('bp-fogo-cv');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, chamas = [], brasas = [];
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    W = cv.offsetWidth; H = cv.offsetHeight;
    if (!W || !H) return;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function lobbyAtivo() {
    var l = document.getElementById('tela-lobby');
    return l && l.classList.contains('ativa');
  }

  // chamas ao longo das BORDAS (base + laterais), pequenas e de vida curta,
  // pra "lamberem" a borda em vez de subir pro centro
  function novaChama() {
    var e = Math.random(), x, y, vx, vy;
    if (e < 0.5) { x = rnd(0, W); y = H - 2; vx = rnd(-0.08, 0.08); vy = -rnd(0.2, 0.5); }          // base
    else if (e < 0.75) { x = 2; y = rnd(H * 0.15, H); vx = rnd(0.05, 0.16); vy = -rnd(0.15, 0.4); }  // esquerda
    else { x = W - 2; y = rnd(H * 0.15, H); vx = -rnd(0.05, 0.16); vy = -rnd(0.15, 0.4); }            // direita
    chamas.push({ x: x, y: y, vx: vx, vy: vy, r: rnd(3, 6.5), vida: 1, decai: rnd(0.024, 0.045) });
  }
  function novaBrasa() {
    brasas.push({ x: rnd(0, W), y: H - rnd(0, 5), vx: rnd(-0.12, 0.12), vy: -rnd(0.35, 0.8), r: rnd(0.6, 1.3), vida: 1, decai: rnd(0.012, 0.022), f: rnd(0, 6.28) });
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!W || !H) { resize(); if (!W) return; }
    if (reduz || !lobbyAtivo()) { ctx.clearRect(0, 0, W, H); return; }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; // fogo = brilho aditivo

    if (Math.random() < 0.85) novaChama();
    if (Math.random() < 0.18) novaBrasa();

    for (var i = chamas.length - 1; i >= 0; i--) {
      var p = chamas[i];
      p.x += p.vx; p.y += p.vy; p.vy *= 0.99; p.vida -= p.decai;
      if (p.vida <= 0) { chamas.splice(i, 1); continue; }
      var r = p.r * (0.5 + p.vida * 0.6), a = p.vida;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,238,195,' + (a * 0.5) + ')');
      g.addColorStop(0.45, 'rgba(255,150,45,' + (a * 0.32) + ')');
      g.addColorStop(1, 'rgba(190,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
    }

    for (var j = brasas.length - 1; j >= 0; j--) {
      var e = brasas[j];
      e.x += e.vx + Math.sin((1 - e.vida) * 6 + e.f) * 0.3; e.y += e.vy; e.vida -= e.decai;
      if (e.vida <= 0) { brasas.splice(j, 1); continue; }
      ctx.fillStyle = 'rgba(255,' + (205 + Math.floor(35 * e.vida)) + ',160,' + (e.vida * 0.6) + ')';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
