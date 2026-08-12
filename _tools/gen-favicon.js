/**
 * gen-favicon.js — 從 ../assets/favicon.svg 重出各尺寸 PNG
 *
 * favicon.svg 是唯一來源（手寫）。這支只負責用 headless Chrome 把它
 * 渲染成 PNG 備援尺寸——舊版 Safari 與部分 RSS/社群平台不吃 SVG favicon。
 *
 * 需要本機有 Chrome。跑法：node _tools/gen-favicon.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ASSETS = path.join(__dirname, '..', 'assets');
const SVG = path.join(ASSETS, 'favicon.svg');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));

if (!CHROME) {
  console.error('找不到 Chrome —— 這支只是重出 PNG 備援，favicon.svg 本身已經可用。');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-fav-'));
const svg = fs.readFileSync(SVG, 'utf8');

for (const size of [180, 32, 16]) {
  // 包一層 HTML 才能精準控制輸出尺寸；body 邊界歸零，背景全透明留給圓角
  const page = path.join(tmp, `${size}.html`);
  fs.writeFileSync(page, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);

  const out = path.join(ASSETS, size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`);
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
    `--user-data-dir=${path.join(tmp, 'profile')}`,
    `--screenshot=${out}`, `--window-size=${size},${size}`,
    '--hide-scrollbars', '--default-background-color=00000000',
    `file:///${page.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  console.log(`✓ assets/${path.basename(out)}  ${size}×${size}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
