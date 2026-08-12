/**
 * process-new-logo.js — 把 New Logo 原圖處理成站上可用的圖案素材
 *
 * 原圖是「平面單色藍 + 烤死的深色背景」的點陣圖，而且左邊圖案、右邊字標連在一起。
 * 站上只需要圖案（字標已經是 SVG，見 gen-wordmark.js），而且必須透明背景——
 * 導覽列、卡片、頁尾的底色都不一樣，帶著方形底色放上去會很明顯。
 *
 * 做法：整張圖只有兩個顏色，所以用投影法算 alpha
 *   alpha = clamp( dot(pixel - bg, fg - bg) / |fg - bg|² , 0, 1 )
 * 這比「亮度過門檻」乾淨——抗鋸齒的半透明邊緣會被正確保留，不會留下黑邊。
 * 算完把 RGB 一律改成站上的 --accent-2，顏色跟調色盤對齊。
 *
 * 因為整塊是單色，縮圖只要對 alpha 做面積平均即可（等同高品質重採樣）。
 *
 * 產出到 ../assets/：mark.png（直式貼齊裁切，網頁鎖定版用）
 * favicon 不由這支產生 —— 見 assets/favicon.svg 與 _tools/gen-favicon.js
 * 跑法：node _tools/process-new-logo.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, 'new-logo-source.png');
const OUT = path.join(__dirname, '..', 'assets');

const FG = [0x2E, 0x7B, 0xFF];   // --accent-2，最終輸出的顏色
const EDGE = 0.02;               // 判定「有內容」的 alpha 門檻

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;

// 背景色取四個角的平均（原圖四角都是純背景）
const px = (x, y) => { const i = (W * y + x) << 2; return [src.data[i], src.data[i + 1], src.data[i + 2]]; };
const corners = [px(0, 0), px(W - 1, 0), px(0, H - 1), px(W - 1, H - 1)];
const BG = [0, 1, 2].map(c => Math.round(corners.reduce((s, p) => s + p[c], 0) / 4));

// 前景取「離背景最遠」的像素，避免抓到抗鋸齒的中間色
let SRCFG = [0, 0, 0], far = -1;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const p = px(x, y);
  const d = (p[0] - BG[0]) ** 2 + (p[1] - BG[1]) ** 2 + (p[2] - BG[2]) ** 2;
  if (d > far) { far = d; SRCFG = p; }
}
const D = [0, 1, 2].map(c => SRCFG[c] - BG[c]);
const DD = D[0] * D[0] + D[1] * D[1] + D[2] * D[2];

// alpha матte
const alpha = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = px(x, y);
  const t = ((p[0] - BG[0]) * D[0] + (p[1] - BG[1]) * D[1] + (p[2] - BG[2]) * D[2]) / DD;
  alpha[y * W + x] = t < 0 ? 0 : t > 1 ? 1 : t;
}

/** 找出 [x0,x1) 範圍內有內容的方框 */
function bbox(x0, x1) {
  let minX = x1, maxX = x0, minY = H, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
    if (alpha[y * W + x] > EDGE) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// 圖案與字標之間有一段完全空白的直行 —— 找最長的那段當切點
const colHas = new Uint8Array(W);
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
  if (alpha[y * W + x] > EDGE) { colHas[x] = 1; break; }
}
const full = bbox(0, W);
let run = 0, bestRun = 0, bestEnd = -1;
for (let x = full.x; x < full.x + full.w; x++) {
  if (!colHas[x]) { if (++run > bestRun) { bestRun = run; bestEnd = x; } } else run = 0;
}
const splitAt = bestRun > 0 ? bestEnd - bestRun + 1 : full.x + full.w;
const mark = bbox(full.x, splitAt);
console.log(`背景 rgb(${BG})  前景 rgb(${SRCFG})`);
console.log(`整體 ${full.w}×${full.h}  圖案/字標分界 x=${splitAt}（空白 ${bestRun}px）`);
console.log(`圖案 ${mark.w}×${mark.h} @ (${mark.x},${mark.y})`);

/**
 * 兩種裁法，用途不同：
 *   square 正方形畫布、圖案置中 —— favicon 專用，圖示本來就是方的
 *   tight  貼齊內容的直式裁切 —— 網頁鎖定版專用。圖案本身是直的（456×607），
 *          硬塞進正方形會在左右留白，以高度定尺寸時看起來就比字標小一截
 */
function render(size, mode = 'square', padRatio = 0.04) {
  const pad = Math.round(Math.max(mark.w, mark.h) * padRatio);
  const cw = mode === 'square' ? Math.max(mark.w, mark.h) + pad * 2 : mark.w + pad * 2;
  const ch = mode === 'square' ? Math.max(mark.w, mark.h) + pad * 2 : mark.h + pad * 2;
  const ox = mark.x - Math.round((cw - mark.w) / 2);          // 畫布左上角在原圖的位置
  const oy = mark.y - Math.round((ch - mark.h) / 2);
  const outW = mode === 'square' ? size : Math.round(size * cw / ch);
  const out = new PNG({ width: outW, height: size });
  const step = ch / size;

  for (let j = 0; j < size; j++) for (let i = 0; i < outW; i++) {
    const sx0 = ox + i * step, sy0 = oy + j * step;
    let sum = 0, n = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy0 + step); y++) {
      for (let x = Math.floor(sx0); x < Math.ceil(sx0 + step); x++) {
        n++;
        // 只取分界線左邊 —— 正方形畫布會超出圖案本身的寬度，不擋住就會吃到字標的 C 和 F
        if (x >= 0 && x < splitAt && y >= 0 && y < H) sum += alpha[y * W + x];
      }
    }
    const a = n ? sum / n : 0;
    const k = (j * outW + i) << 2;
    out.data[k] = FG[0]; out.data[k + 1] = FG[1]; out.data[k + 2] = FG[2];
    out.data[k + 3] = Math.round(a * 255);
  }
  return out;
}

/* 只出網頁鎖定版用的圖案。favicon 不從這裡縮 —— 原圖是細線＋鏈節＋內部橫線，
   32px 以下會糊成一團藍。圖示走 assets/favicon.svg 的簡化版（見 gen-favicon.js）。 */
const JOBS = [
  ['mark.png', 512, 'tight'],          // 導覽列 / 頁尾 / OG 用
];
for (const [name, size, mode] of JOBS) {
  const img = render(size, mode);
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(img));
  console.log(`✓ assets/${name}  ${img.width}×${img.height}`);
}
