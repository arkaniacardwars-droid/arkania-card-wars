/*
 * Arkania Card Wars — cenário atmosférico em Canvas (HTML5, game-loop clássico).
 * Deserto/ruínas ao entardecer + poeira dourada. Puramente decorativo,
 * renderizado atrás das telas de lobby e duelo.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('backdrop');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var poeira = [];
  var t = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    semearPoeira();
  }

  function semearPoeira() {
    poeira = [];
    var n = Math.round((W * H) / 26000);
    for (var i = 0; i < n; i++) {
      poeira.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vx: 0.15 + Math.random() * 0.5,
        vy: -0.05 + Math.random() * 0.25,
        a: 0.15 + Math.random() * 0.45,
        f: 0.5 + Math.random() * 1.5
      });
    }
  }

  // silhueta de ruínas no horizonte (colunas quebradas + arco)
  function ruinas(base) {
    ctx.fillStyle = 'rgba(20,14,8,0.92)';
    var chao = base;
    ctx.fillRect(0, chao, W, H - chao);
    // colunas
    var cols = [0.12, 0.2, 0.27, 0.72, 0.8, 0.88];
    var alturas = [90, 130, 70, 110, 150, 80];
    for (var i = 0; i < cols.length; i++) {
      var x = cols[i] * W, w = 26, h = alturas[i];
      ctx.fillStyle = 'rgba(26,18,10,0.95)';
      ctx.fillRect(x, chao - h, w, h);
      ctx.fillRect(x - 5, chao - h - 8, w + 10, 8); // capitel
    }
    // arco central
    var ax = W * 0.47, aw = W * 0.12, ah = 150;
    ctx.fillStyle = 'rgba(24,16,9,0.95)';
    ctx.fillRect(ax, chao - ah, 22, ah);
    ctx.fillRect(ax + aw, chao - ah, 22, ah);
    ctx.beginPath();
    ctx.moveTo(ax, chao - ah);
    ctx.quadraticCurveTo(ax + aw / 2 + 11, chao - ah - 60, ax + aw + 22, chao - ah);
    ctx.lineTo(ax + aw + 22, chao - ah + 18);
    ctx.quadraticCurveTo(ax + aw / 2 + 11, chao - ah - 30, ax, chao - ah + 18);
    ctx.closePath();
    ctx.fill();
  }

  function frame() {
    t += 0.006;
    // céu de entardecer (amarelo/verde/pedra)
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2418');
    g.addColorStop(0.42, '#3d3a1e');
    g.addColorStop(0.72, '#6b4e22');
    g.addColorStop(1, '#2c1d0f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // sol baixo pulsando suave
    var sx = W * 0.5, sy = H * 0.6;
    var glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, W * 0.5);
    glow.addColorStop(0, 'rgba(255,210,120,' + (0.22 + Math.sin(t) * 0.05) + ')');
    glow.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ruinas(H * 0.72);

    // poeira dourada
    for (var i = 0; i < poeira.length; i++) {
      var p = poeira[i];
      p.x += p.vx; p.y += p.vy + Math.sin(t * p.f + i) * 0.15;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(240,214,150,' + p.a + ')';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // vinheta
    var vin = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    vin.addColorStop(0, 'rgba(0,0,0,0)');
    vin.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vin;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
