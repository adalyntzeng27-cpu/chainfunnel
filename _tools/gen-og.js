/**
 * gen-og.js — 從 _tools/og-cover.html 重出分享預覽圖 assets/og-cover.png（1200×630）
 *
 * 為什麼要寫成腳本而不是手打 chrome 指令：手打 file:// 路徑很容易錯
 * （Git Bash 的 $(pwd) 會回傳 /c/Users/... 這種 Chrome 吃不到的形式），
 * 錯了不會報錯 —— Chrome 會把「找不到檔案」的錯誤頁截下來存成 og-cover.png，
 * 一路推上線都不會有人發現。這支自己解析絕對路徑，截完再驗一次輸出。
 *
 * 改了 logo、標語或版型之後都要重跑：node _tools/gen-og.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const W = 1200, H = 630;
const SRC = path.join(__dirname, 'og-cover.html');
const OUT = path.join(__dirname, '..', 'assets', 'og-cover.png');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));

if (!CHROME) { console.error('找不到 Chrome'); process.exit(1); }
if (!fs.existsSync(SRC)) { console.error('找不到 ' + SRC); process.exit(1); }

// path.resolve 給的是 C:\... ，轉成 Chrome 吃得下的 file:///C:/...
const fileUrl = 'file:///' + path.resolve(SRC).replace(/\\/g, '/');

execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${path.join(__dirname, '.chrome-og')}`,
  `--screenshot=${OUT}`, `--window-size=${W},${H}`, '--hide-scrollbars', fileUrl],
  { stdio: 'ignore' });

// 驗一下：錯誤頁是大片白底，壓縮後會明顯偏小；正常的深色版型約 200KB 以上
const size = fs.statSync(OUT).size;
console.log(`✓ assets/og-cover.png  ${W}×${H}  ${(size / 1024).toFixed(0)} KB`);
if (size < 60 * 1024) {
  console.error('⚠️  檔案異常小 —— 很可能截到 Chrome 的錯誤頁，去開圖確認再推上線');
  process.exit(1);
}
fs.rmSync(path.join(__dirname, '.chrome-og'), { recursive: true, force: true });
