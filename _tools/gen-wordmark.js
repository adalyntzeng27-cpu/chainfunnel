/**
 * gen-wordmark.js — 產生 chainfunnel 字標 SVG
 *
 * 為什麼要轉成路徑：logo 的字不能靠 CSS font-family。訪客裝置沒裝 Inter
 * 就會 fallback 成別的字，同一個 logo 在每台機器上長得不一樣。
 * 這支把文字烤成 <path>，網站端不需要載任何字體。
 *
 * 字體：Inter ExtraBold 800（SIL Open Font License 1.1，可自由使用與再散布）
 *
 * 產出到 ../assets/：
 *   wordmark.svg              橫排 · 深底（導覽列用）
 *   wordmark-stack.svg        堆疊 · 深底（頁尾 / OG 用）
 *   wordmark-light.svg        橫排 · 淺底（履歷 / 名片）
 *   wordmark-stack-light.svg  堆疊 · 淺底
 *
 * 跑法：node _tools/gen-wordmark.js
 */
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const FONT = path.join(__dirname, 'inter-800.ttf');
const OUT = path.join(__dirname, '..', 'assets');

const EM = 100;            // 生成用字級，實際尺寸由 SVG viewBox 等比縮放
const TRACK = -0.025;      // 基礎字距，參考稿略緊
const LEAD = 1.12;         // 堆疊版行距 = cap height 的倍數

// 配色：深底把 Chain 換成 --ink，否則近黑會沉進背景
const INK_DARK = '#E9EEF7';
const INK_LIGHT = '#0E1626';
const BLUE = '#2E7BFF';    // = --accent-2

const font = opentype.parse(fs.readFileSync(FONT).buffer);
const scale = EM / font.unitsPerEm;
const CAP = font.tables.os2.sCapHeight * scale;

/** 走一遍字串，回傳路徑資料與總寬（含 kerning 與字距） */
function word(text, tracking) {
  const glyphs = [...text].map(ch => font.charToGlyph(ch));
  const d = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    d.push(g.getPath(x, 0, EM).toPathData(2));
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += font.getKerningValue(g, glyphs[i + 1]) * scale + tracking * EM;
    }
  });
  return { d: d.join(''), width: x };
}

const n = t => t.toFixed(1);

/**
 * 堆疊版：Chain 在上、Funnel 在下。
 * 兩行補字距撐成等寬，左右邊緣切齊 —— 這是參考稿那個方塊感的來源。
 */
function stack(inkColor) {
  const wc = word('Chain', TRACK).width;
  const wf = word('Funnel', TRACK).width;
  const target = Math.max(wc, wf);
  const chain = word('Chain', TRACK + (target - wc) / (4 * EM));   // 5 字 → 4 個字距
  const funnel = word('Funnel', TRACK + (target - wf) / (5 * EM)); // 6 字 → 5 個字距
  const lead = CAP * LEAD;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(target)} ${n(CAP + lead)}" role="img" aria-label="chainfunnel">
  <path fill="${inkColor}" transform="translate(0,${n(CAP)})" d="${chain.d}"/>
  <path fill="${BLUE}" transform="translate(0,${n(CAP + lead)})" d="${funnel.d}"/>
</svg>
`;
}

/** 橫排版：ChainFunnel 一行，自然字距 */
function inline(inkColor) {
  const chain = word('Chain', TRACK);
  const funnel = word('Funnel', TRACK);
  const total = chain.width + funnel.width;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(total)} ${n(CAP)}" role="img" aria-label="chainfunnel">
  <g transform="translate(0,${n(CAP)})">
    <path fill="${inkColor}" d="${chain.d}"/>
    <path fill="${BLUE}" transform="translate(${n(chain.width)},0)" d="${funnel.d}"/>
  </g>
</svg>
`;
}

const files = {
  'wordmark.svg': inline(INK_DARK),
  'wordmark-stack.svg': stack(INK_DARK),
  'wordmark-light.svg': inline(INK_LIGHT),
  'wordmark-stack-light.svg': stack(INK_LIGHT),
};

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg);
  console.log(`✓ assets/${name}  ${svg.length} bytes`);
}
