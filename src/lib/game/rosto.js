/*
 * Enquadramento do rosto no avatar. A foto de perfil é a ARTE de uma carta;
 * este módulo detecta a caixa do rosto/cabeça na ilustração e dá zoom nela, de
 * modo que o círculo do avatar mostre só o rosto (sem a bandeirinha do topo nem
 * o painel de stats da base). Porte fiel de prototype/js/perfil.js.
 *
 * Uso: action Svelte `use:enquadrar={cardId}` sobre uma <img class="av-img">.
 */
import { browser } from '$app/environment';

const K_ROSTOS = 'arkania.rostos.v6';
const FAIXA_TOPO = 0.0; // mostra desde o topo (bandeirinha visível)
const FAIXA_BASE = 0.63; // base da janela útil (painel começa ~0.64)
const ZOOM_MAX = 1.65; // teto do zoom → mantém a foto "normal"
const ZONA_ROSTO = 0.6; // analisa só os 60% de cima ao procurar o rosto
const MASSA = 0.52; // fração da massa que a caixa do rosto deve conter
const ALVO = 0.98; // enquadramento folgado

function lerCache() {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(K_ROSTOS)) || {};
	} catch {
		return {};
	}
}
function gravarCache(obj) {
	if (!browser) return;
	try {
		localStorage.setItem(K_ROSTOS, JSON.stringify(obj));
	} catch {
		/* indisponível */
	}
}

// janela mínima em torno do centro que acumula `alvo` da massa do perfil `m`
function janela(m, centro, alvo) {
	let i0 = centro,
		i1 = centro,
		acc = m[centro] || 0;
	while (acc < alvo && (i0 > 0 || i1 < m.length - 1)) {
		const esq = i0 > 0 ? m[i0 - 1] : -1;
		const dir = i1 < m.length - 1 ? m[i1 + 1] : -1;
		if (dir >= esq) {
			i1++;
			acc += m[i1];
		} else {
			i0--;
			acc += m[i0];
		}
	}
	return [i0, i1];
}

function detectarCaixaRosto(img) {
	const W = 56,
		NH = img.naturalHeight,
		NW = img.naturalWidth;
	const H = Math.max(16, Math.round((W * NH) / NW));
	const cv = document.createElement('canvas');
	cv.width = W;
	cv.height = H;
	const ctx = cv.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(img, 0, 0, W, H);
	const d = ctx.getImageData(0, 0, W, H).data; // pode lançar se tainted

	const yLim = Math.round(H * ZONA_ROSTO);
	const Wx = new Array(W).fill(0),
		Wy = new Array(H).fill(0);
	let total = 0;
	for (let y = 0; y < yLim; y++) {
		const vy = y / (H - 1);
		const prior = Math.exp(-Math.pow((vy - 0.32) / 0.24, 2)); // pico ~1/3 do topo
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 4,
				r = d[i],
				g = d[i + 1],
				b = d[i + 2];
			const mx = Math.max(r, g, b),
				mn = Math.min(r, g, b);
			if ((r + g + b) / 765 < 0.06) continue; // ignora fundo quase preto
			const pele =
				r > 60 && g > 30 && b > 15 && r >= g && g >= b * 0.9 && r - b > 10 && mx - mn > 10 ? 1 : 0;
			const w = prior * (0.5 + (mx - mn) / 255 + pele * 2.4);
			Wx[x] += w;
			Wy[y] += w;
			total += w;
		}
	}
	if (total <= 0) return null;

	let cx = 0,
		cy = 0;
	for (let k = 0; k < W; k++) cx += k * Wx[k];
	for (let k = 0; k < H; k++) cy += k * Wy[k];
	cx = Math.round(cx / total);
	cy = Math.round(cy / total);

	const fx = janela(Wx, cx, total * MASSA);
	const fy = janela(Wy, cy, total * MASSA);
	const mrx = (fx[1] - fx[0]) * 0.22,
		mry = (fy[1] - fy[0]) * 0.22;
	const x0 = Math.max(0, fx[0] - mrx),
		x1 = Math.min(W, fx[1] + mrx);
	const y0 = Math.max(0, fy[0] - mry * 1.1),
		y1 = Math.min(H, fy[1] + mry);

	const fw = Math.max(0.26, (x1 - x0) / W);
	const fh = Math.max(0.26, (y1 - y0) / H);
	return { cx: (x0 + x1) / 2 / W, cy: (y0 + y1) / 2 / H, fw, fh };
}

// monta o frame da <img> (% do container quadrado) a partir da caixa do rosto
function montarFrame(box, arHW) {
	const banda = FAIXA_BASE - FAIXA_TOPO;
	let sh = Math.min(ALVO / box.fh, (ALVO * arHW) / box.fw);
	sh = Math.max(sh, 1 / banda, arHW, 1.0);
	sh = Math.min(sh, ZOOM_MAX);
	const sw = sh / arHW;
	const winH = 1 / sh,
		winW = 1 / sw;
	const winTop = Math.max(FAIXA_TOPO, Math.min(FAIXA_BASE - winH, box.cy - winH / 2));
	const winLeft = Math.max(0, Math.min(1 - winW, box.cx - winW / 2));
	const W = sw * 100,
		H = sh * 100;
	return {
		w: +W.toFixed(1),
		h: +H.toFixed(1),
		l: +(-winLeft * W).toFixed(1),
		t: +(-winTop * H).toFixed(1)
	};
}

function frameDefault(img) {
	return montarFrame({ cx: 0.5, cy: 0.36, fw: 0.6, fh: 0.5 }, img.naturalHeight / img.naturalWidth);
}
function calcularFrame(img) {
	const box = detectarCaixaRosto(img);
	return box ? montarFrame(box, img.naturalHeight / img.naturalWidth) : frameDefault(img);
}
function aplicarFrame(img, f) {
	img.style.objectFit = 'fill';
	img.style.width = f.w + '%';
	img.style.height = f.h + '%';
	img.style.left = f.l + '%';
	img.style.top = f.t + '%';
	img.style.objectPosition = '';
}

function enquadrarRosto(img, cardId) {
	const cache = lerCache();
	const f = cache[cardId];
	if (f && typeof f === 'object') {
		aplicarFrame(img, f);
		return;
	}
	const run = () => {
		let fr;
		try {
			fr = calcularFrame(img);
		} catch {
			fr = frameDefault(img); // canvas bloqueado
		}
		aplicarFrame(img, fr);
		cache[cardId] = fr;
		gravarCache(cache);
	};
	if (img.complete && img.naturalWidth) run();
	else img.addEventListener('load', run, { once: true });
}

// action Svelte: enquadra o rosto assim que a <img> monta
export function enquadrar(node, cardId) {
	enquadrarRosto(node, cardId);
	return {
		update(novo) {
			enquadrarRosto(node, novo);
		}
	};
}
