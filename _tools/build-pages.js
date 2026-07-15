/* ============================================================
   chainfunnel — 欄目列表頁產生器
   改欄目/導覽只改這支，然後 `node build-pages.js` 重生。
   輸出純靜態 HTML，執行期無任何依賴。
   ============================================================ */
const fs = require('fs');
const path = require('path');

// ---- 單一導覽來源（改這裡就好） ----
const NAV = [
  {slug:'decode',  href:'decode/',  label:'幣圈拆解'},
  {slug:'exchange',href:'exchange/',label:'交易所指南'},
  {slug:'guide',   href:'guide/',   label:'新手教學'},
  {slug:'column',  href:'column/',  label:'觀察專欄'},
  {slug:'pivot',   href:'pivot/',   label:'轉職幣圈'},
  {slug:'journal', href:'journal/', label:'學習日誌'},
  {slug:'about',   href:'about.html',label:'關於我'},
];

// ---- 文章登錄表 ----
const MOTOGP = {
  href:'column/racing/motogp-crypto-sponsorship.html',
  kicker:'賽車 × 幣圈 · DECODE',
  title:'加密貨幣為什麼狂贊助賽車？我看到的是賭場的老套路',
  dek:'幣圈幾乎包了整條 F1 的 pit lane。第一眼像有錢任性，看久了我笑不出來——因為這套路，我以前做灰產時天天在用。',
  meta:'2026 · 12 分鐘', soon:false,
};

// ---- 欄目定義 ----
const CATS = {
  decode:{ico:'🧠',name:'幣圈拆解',dek:'全網 99% 的幣圈站教你怎麼賺，這裡拆給你看它怎麼運作、怎麼被行銷。用行銷人的眼睛，解剖加密世界的注意力生意。',
    posts:[ MOTOGP,
      {kicker:'韓國加密',title:'泡菜溢價是什麼？韓國人為什麼願意用更貴的價格買幣',dek:'從資金流、法規到民族性的行銷觀察——為什麼同一顆幣，在韓國就是比較貴。',soon:true},
      {kicker:'注意力經濟',title:'交易所行銷手法全拆解：他們到底在買你的什麼',dek:'空投、KOL、返佣、聯盟漏斗——把交易所的獲客機器拆開，看每一顆螺絲怎麼轉。',soon:true},
    ]},
  exchange:{ico:'💱',name:'交易所指南',dek:'入金、手續費、實測、比較。我親身跑過每一條聯盟漏斗，用行銷人看 CAC 與轉換的角度，告訴你交易所的生意怎麼做、你該怎麼選。',
    posts:[
      {kicker:'實測 · Bitget',title:'Bitget 註冊教學（台灣）：入金到第一筆交易全流程',dek:'一步步實測截圖，含台灣出入金、手續費怎麼算、新手常踩的坑。',soon:true},
      {kicker:'比較',title:'OKX vs Bybit vs Bitget：三大交易所到底差在哪',dek:'手續費、深度、出金速度、App 體驗——用一張大比較表幫你選。',soon:true},
      {kicker:'教學',title:'交易所出金到台灣銀行：路徑、手續費與注意事項',dek:'把幣換回台幣的每一種方式攤開講，包含成本與風險。',soon:true},
    ]},
  guide:{ico:'🛠',name:'新手教學',dek:'錢包設定、避雷、DEX 入門。把幣圈的第一哩路講清楚，讓你不用交昂貴的學費。',
    posts:[
      {kicker:'錢包',title:'MetaMask 設定教學（繁中）：從安裝到第一次連 DApp',dek:'含助記詞保管、網路設定、常見詐騙提醒。',soon:true},
      {kicker:'避雷',title:'如何避免假錢包詐騙：五個一定要養成的習慣',dek:'假 App、釣魚網站、授權盜轉——教你用行為習慣把風險降到最低。',soon:true},
      {kicker:'觀念',title:'DEX 是什麼？新手也能懂的去中心化交易所入門',dek:'CEX 跟 DEX 差在哪、什麼時候該用哪一個。',soon:true},
    ]},
  column:{ico:'📡',name:'觀察專欄',dek:'賽車 × 幣圈、注意力經濟、韓國加密——幾乎沒有繁中競品的利基觀察。這裡是護城河，也是我最想寫的地方。',
    posts:[ MOTOGP,
      {kicker:'韓國加密',title:'泡菜溢價是什麼？韓國人為什麼願意用更貴的價格買幣',dek:'從資金流、法規到民族性的行銷觀察——為什麼同一顆幣，在韓國就是比較貴。',soon:true},
      {kicker:'注意力經濟',title:'注意力經濟是什麼？為什麼幣圈的本質是一場敘事戰爭',dek:'從行銷人的視角，看幣圈怎麼把「注意力」變成錢。',soon:true},
    ]},
  pivot:{ico:'🚀',name:'轉職幣圈',dek:'寫給想從其他行業（尤其行銷）跨進幣圈的人。路徑、職缺地圖、作品集、面試、以及那些踩進去才知道的坑——一個正在轉職的行銷人，邊走邊寫的攻略。',
    posts:[
      {kicker:'起點',title:'一個 B2C 行銷人，為什麼決定轉職幣圈',dek:'不是因為想暴富。談我看到的產業拐點、可遷移的技能，以及為什麼現在是時機。',soon:true},
      {kicker:'職缺地圖',title:'幣圈行銷職缺都在做什麼？growth / community / KOL / BD 的差別',dek:'把幣圈行銷相關職位攤開，講清楚每個角色要什麼能力、薪資落點、怎麼卡位。',soon:true},
      {kicker:'作品集',title:'零經驗怎麼建幣圈作品集？我的三個月計畫',dek:'自架網站、實測交易所、參與 DAO——把「沒經驗」變成「有作品」的具體路線。',soon:true},
      {kicker:'面試',title:'幣圈行銷面試都問什麼？行銷職的考題拆解',dek:'從我蒐集到的真實題目，反推他們在找什麼樣的人，以及怎麼準備。',soon:true},
    ]},
  journal:{ico:'📔',name:'學習日誌',dek:'從 0 進幣圈的真實紀錄（build in public）——包含我犯的錯、學到的東西、和這個站怎麼一步步長出來。這一欄就是「經驗證明」本體。',
    posts:[
      {kicker:'Build in Public',title:'從 0 進幣圈的第一個月：我犯的三個菜鳥錯誤',dek:'真實記錄一個行銷人從零開始學幣圈的過程——包括那些踩進去才知道的坑。',soon:true},
    ]},
};

// ---------- 樣板 ----------
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function header(root, active){
  const nav = NAV.map(n=>{
    const cur = n.slug===active ? ' aria-current="page"' : '';
    return `      <a href="${root}${n.href}"${cur}>${n.label}</a>`;
  }).join('\n');
  return `<header class="site">
  <div class="bar">
    <a class="brand" href="${root}index.html" aria-label="chainfunnel 首頁"><img src="${root}assets/logo-mark.png" alt=""><b>chainfunnel</b></a>
    <button class="burger" id="burger" aria-label="選單" aria-expanded="false">☰</button>
    <nav class="nav" id="nav">
${nav}
    </nav>
    <span class="sp"></span>
    <a class="btn-sub" href="#subscribe">訂閱</a>
  </div>
</header>`;
}

function footer(root){
  const links = NAV.filter(n=>n.slug!=='about').map(n=>`        <a href="${root}${n.href}">${n.label}</a>`).join('\n');
  return `<footer class="site">
  <div class="foot-cta" id="subscribe">
    <h2>每週一篇，看懂幣圈的行銷底層</h2>
    <p>訂閱電子報，把「怎麼被行銷」的視角裝進你的腦袋。</p>
    <form class="sub" onsubmit="return false">
      <input type="email" placeholder="你的 Email" aria-label="Email">
      <button class="btn btn-primary" type="submit">免費訂閱</button>
    </form>
  </div>
  <div class="shell foot-grid">
    <div class="foot-brand">
      <img src="${root}assets/logo-full.png" alt="chainfunnel">
      <p>用行銷人的眼睛，拆解幣圈。繁體中文的加密觀察站。</p>
    </div>
    <div class="foot-links">
      <div class="foot-col">
        <b>欄目</b>
${links}
      </div>
      <div class="foot-col">
        <b>關於</b>
        <a href="${root}about.html">關於我</a>
        <a href="#subscribe">訂閱電子報</a>
      </div>
    </div>
  </div>
  <div class="foot-legal">
    <span>© 2026 chainfunnel · 本站為觀點分析，非投資建議</span>
    <span class="social"><a href="#" aria-label="X">X ↗</a><a href="#" aria-label="LinkedIn">LinkedIn ↗</a></span>
  </div>
</footer>`;
}

const burgerJS = `<script>
  (function(){var b=document.getElementById('burger'),n=document.getElementById('nav');
    b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o);});
    n.addEventListener('click',function(e){if(e.target.tagName==='A')n.classList.remove('open');});})();
</script>`;

function postRow(root, p, i){
  const idx = String(i+1).padStart(2,'0');
  const kicker = p.soon
    ? `<div class="rkicker">${esc(p.kicker)}<span class="soon-tag">籌備中</span></div>`
    : `<div class="rkicker">${esc(p.kicker)}</div>`;
  const inner = `${kicker}
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.dek)}</p>${p.meta?`\n      <div class="rmeta">${esc(p.meta)}</div>`:''}`;
  if(p.soon){
    return `    <div class="post-row soon">
      <span class="idx">${idx}</span>
      <div class="body">${inner}</div>
    </div>`;
  }
  return `    <a class="post-row h-link" href="${root}${p.href}" style="color:inherit">
      <span class="idx">${idx}</span>
      <div class="body">${inner}</div>
    </a>`;
}

function catPage(slug, c){
  const root = '../';
  const rows = c.posts.map((p,i)=>postRow(root,p,i)).join('\n');
  const soonCount = c.posts.filter(p=>p.soon).length;
  const empty = soonCount===c.posts.length
    ? `\n    <div class="empty-note"><b>這個欄目正在籌備中。</b><br>上面是規劃中的主題，第一批文章即將上線。想搶先看？<a href="#subscribe" style="color:var(--accent)">訂閱電子報</a>。</div>`
    : '';
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.name)} · chainfunnel</title>
<meta name="description" content="${esc(c.dek)}">
<link rel="icon" type="image/png" sizes="128x128" href="../assets/favicon-128.png">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="stylesheet" href="../assets/site.css">
</head>
<body>
${header(root, slug)}
<main>
  <section class="shell">
    <div class="page-hero">
      <p class="crumb"><a href="../index.html">首頁</a> / ${esc(c.name)}</p>
      <div class="ico">${c.ico}</div>
      <h1>${esc(c.name)}</h1>
      <p>${esc(c.dek)}</p>
    </div>
    <div class="postlist">
${rows}
    </div>${empty}
  </section>
</main>
${footer(root)}
${burgerJS}
</body>
</html>
`;
}

// ---------- 輸出 ----------
let n=0;
for(const [slug,c] of Object.entries(CATS)){
  const dir = path.join(__dirname, '..', slug);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'), catPage(slug,c));
  console.log('wrote', slug+'/index.html', '('+c.posts.length+' posts)');
  n++;
}
console.log('done —', n, 'category pages');
