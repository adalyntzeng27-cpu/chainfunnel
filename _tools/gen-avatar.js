/**
 * gen-avatar.js — 從 _tools/profile-source.png 產生站上用的頭像 assets/profile.png
 *
 * 原圖是 1254×1254、2MB，但站上只用在 44px（文章作者列）到 76px（首頁），
 * 等於每個訪客都下載了 2MB 去顯示一個指甲大的圓。縮到 160×160（76px 的 2 倍，
 * 涵蓋 Retina）之後大約剩 1–2%。
 *
 * 面積平均重採樣（box filter）—— 純縮小的情況下品質足夠，也不必多裝套件。
 *
 * 跑法：node _tools/gen-avatar.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = path.join(__dirname, 'profile-source.png');
const OUT = path.join(__dirname, '..', 'assets', 'profile.png');
const SIZE = 160;

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const out = new PNG({ width: SIZE, height: SIZE });
const sx = W / SIZE, sy = H / SIZE;

for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    const x0 = Math.floor(i * sx), x1 = Math.min(W, Math.ceil((i + 1) * sx));
    const y0 = Math.floor(j * sy), y1 = Math.min(H, Math.ceil((j + 1) * sy));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = (W * y + x) << 2;
      r += src.data[k]; g += src.data[k + 1]; b += src.data[k + 2]; a += src.data[k + 3]; n++;
    }
    const k = (j * SIZE + i) << 2;
    out.data[k] = Math.round(r / n); out.data[k + 1] = Math.round(g / n);
    out.data[k + 2] = Math.round(b / n); out.data[k + 3] = Math.round(a / n);
  }
}

fs.writeFileSync(OUT, PNG.sync.write(out));
const before = fs.statSync(SRC).size, after = fs.statSync(OUT).size;
console.log(`✓ assets/profile.png  ${SIZE}×${SIZE}  ${(after / 1024).toFixed(0)} KB`
  + `（原 ${(before / 1024 / 1024).toFixed(2)} MB，省 ${(100 - after / before * 100).toFixed(1)}%）`);
