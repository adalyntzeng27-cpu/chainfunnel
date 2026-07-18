/* ============================================================
   chainfunnel — 欄目列表頁 + sitemap 產生器
   改欄目/導覽/文章清單只改這支，然後 `node _tools/build-pages.js` 重生。
   輸出純靜態 HTML，執行期無任何依賴。
   ============================================================ */
const fs = require('fs');
const path = require('path');

/* ⚠️ 接上自訂網域後，只要改這一行（例如 'https://chainfunnel.xyz'），
   canonical / OG / sitemap 全站跟著換。結尾不要斜線。 */
const BASE_URL = 'https://adalyntzeng27-cpu.github.io/chainfunnel';

const SITE_NAME = 'chainfunnel';
const AUTHOR = '艾德';
const OG_IMAGE = BASE_URL + '/assets/logo-full.png';

/* ⚠️ 讀者數還不夠多時先關閉訂閱功能（nav 按鈕＋頁尾表單），
   之後要重新打開，把這個改回 true 再重跑 build-pages.js 就好。
   手寫頁（index/about/既有文章）的訂閱區塊是用註解包起來，同樣搜尋「訂閱功能」統一打開。 */
const SUBSCRIBE_ENABLED = false;

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
  decode:{ico:'🧠',name:'幣圈拆解',kw:"交易所行銷手法",seoTitle:"幣圈拆解 · 交易所行銷手法全解｜行銷人視角",seoDesc:"拆解交易所與加密項目的行銷手法：空投、KOL、返佣、聯盟漏斗怎麼運作。用行銷人的眼睛，看懂幣圈怎麼把注意力變成錢。",dek:'全網 99% 的幣圈站教你怎麼賺，這裡拆給你看它怎麼運作、怎麼被行銷。用行銷人的眼睛，解剖加密世界的注意力生意。',
    posts:[ MOTOGP,
      {kicker:'韓國加密',title:'泡菜溢價是什麼？韓國人為什麼願意用更貴的價格買幣',dek:'從資金流、法規到民族性的行銷觀察——為什麼同一顆幣，在韓國就是比較貴。',soon:true},
      {kicker:'注意力經濟',title:'交易所行銷手法全拆解：他們到底在買你的什麼',dek:'空投、KOL、返佣、聯盟漏斗——把交易所的獲客機器拆開，看每一顆螺絲怎麼轉。',soon:true},
    ]},
  exchange:{ico:'💱',name:'交易所指南',kw:"加密貨幣交易所 比較 台灣",seoTitle:"交易所指南｜加密貨幣交易所比較與實測（台灣）",seoDesc:"台灣加密貨幣交易所比較與實測：入金出金、手續費怎麼算、該選哪一家。用行銷人看 CAC 與轉換的角度，帶你看懂交易所的生意。",dek:'入金、手續費、實測、比較。我親身跑過每一條聯盟漏斗，用行銷人看 CAC 與轉換的角度，告訴你交易所的生意怎麼做、你該怎麼選。',
    posts:[
      {kicker:'實測 · Bitget',title:'Bitget 註冊教學（台灣）：入金到第一筆交易全流程',dek:'一步步實測截圖，含台灣出入金、手續費怎麼算、新手常踩的坑。',soon:true},
      {kicker:'比較',title:'OKX vs Bybit vs Bitget：三大交易所到底差在哪',dek:'手續費、深度、出金速度、App 體驗——用一張大比較表幫你選。',soon:true},
      {kicker:'教學',title:'交易所出金到台灣銀行：路徑、手續費與注意事項',dek:'把幣換回台幣的每一種方式攤開講，包含成本與風險。',soon:true},
    ]},
  guide:{ico:'🛠',name:'新手教學',kw:"幣圈 新手教學",seoTitle:"幣圈新手教學｜錢包設定、避雷與 DEX 入門",seoDesc:"幣圈新手教學：MetaMask 錢包設定、如何避免假錢包詐騙、DEX 是什麼。把第一哩路講清楚，讓你不用交昂貴學費。",dek:'錢包設定、避雷、DEX 入門。把幣圈的第一哩路講清楚，讓你不用交昂貴的學費。',
    posts:[
      {kicker:'錢包',title:'MetaMask 設定教學（繁中）：從安裝到第一次連 DApp',dek:'含助記詞保管、網路設定、常見詐騙提醒。',soon:true},
      {kicker:'避雷',title:'如何避免假錢包詐騙：五個一定要養成的習慣',dek:'假 App、釣魚網站、授權盜轉——教你用行為習慣把風險降到最低。',soon:true},
      {kicker:'觀念',title:'DEX 是什麼？新手也能懂的去中心化交易所入門',dek:'CEX 跟 DEX 差在哪、什麼時候該用哪一個。',soon:true},
    ]},
  column:{ico:'📡',name:'觀察專欄',kw:"加密貨幣 贊助 賽車",seoTitle:"觀察專欄｜加密貨幣贊助賽車與注意力經濟",seoDesc:"為什麼加密貨幣狂贊助賽車？從 F1、MotoGP 贊助到注意力經濟與韓國加密市場，幾乎沒有繁中競品的利基觀察。",dek:'賽車 × 幣圈、注意力經濟、韓國加密——幾乎沒有繁中競品的利基觀察。這裡是護城河，也是我最想寫的地方。',
    posts:[ MOTOGP,
      {kicker:'韓國加密',title:'泡菜溢價是什麼？韓國人為什麼願意用更貴的價格買幣',dek:'從資金流、法規到民族性的行銷觀察——為什麼同一顆幣，在韓國就是比較貴。',soon:true},
      {kicker:'注意力經濟',title:'注意力經濟是什麼？為什麼幣圈的本質是一場敘事戰爭',dek:'從行銷人的視角，看幣圈怎麼把「注意力」變成錢。',soon:true},
    ]},
  pivot:{ico:'🚀',name:'轉職幣圈',kw:"行銷人 轉職 幣圈",seoTitle:"行銷人如何轉職幣圈？職缺、作品集與面試全攻略",seoDesc:"行銷人如何轉職幣圈：職缺地圖、零經驗作品集、面試考題與薪資。一個正在轉職的行銷人，邊走邊寫的第一手攻略。",dek:'寫給想從其他行業（尤其行銷）跨進幣圈的人。路徑、職缺地圖、作品集、面試、以及那些踩進去才知道的坑——一個正在轉職的行銷人，邊走邊寫的攻略。',
    posts:[
      {kicker:'起點',title:'一個 B2C 行銷人，為什麼決定轉職幣圈',dek:'不是因為想暴富。談我看到的產業拐點、可遷移的技能，以及為什麼現在是時機。',soon:true},
      {href:'pivot/crypto-marketing-jobs.html',kicker:'職缺地圖',title:'幣圈行銷職缺到底在做什麼？中英文資料翻遍後，我發現這題根本沒人講清楚',dek:'Growth、Community、Content、KOL/BD——名字都很潮，但實際在幹嘛、薪水多少、沒經驗能不能應徵？中英文資料查了一輪的真實整理。',meta:'2026 · 9 分鐘',soon:false},
      {kicker:'作品集',title:'零經驗怎麼建幣圈作品集？我的三個月計畫',dek:'自架網站、實測交易所、參與 DAO——把「沒經驗」變成「有作品」的具體路線。',soon:true},
      {kicker:'面試',title:'幣圈行銷面試都問什麼？行銷職的考題拆解',dek:'從我蒐集到的真實題目，反推他們在找什麼樣的人，以及怎麼準備。',soon:true},
    ]},
  journal:{ico:'📔',name:'學習日誌',kw:"轉職幣圈 心得",seoTitle:"學習日誌｜從 0 轉職幣圈的真實心得紀錄",seoDesc:"從 0 進幣圈的 build in public 紀錄：轉職幣圈的真實心得、犯過的錯、學到的東西，以及這個站怎麼長出來。",dek:'從 0 進幣圈的真實紀錄（build in public）——包含我犯的錯、學到的東西、和這個站怎麼一步步長出來。這一欄就是「經驗證明」本體。',
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
  const subBtn = SUBSCRIBE_ENABLED ? `\n    <a class="btn-sub" href="#subscribe">訂閱</a>` : '';
  return `<header class="site">
  <div class="bar">
    <a class="brand" href="${root}index.html" aria-label="chainfunnel 首頁"><img src="${root}assets/logo-mark.png" alt=""><b>chainfunnel</b></a>
    <button class="burger" id="burger" aria-label="選單" aria-expanded="false">☰</button>
    <nav class="nav" id="nav">
${nav}
    </nav>
    <span class="sp"></span>${subBtn}
  </div>
</header>`;
}

function footer(root){
  const links = NAV.filter(n=>n.slug!=='about').map(n=>`        <a href="${root}${n.href}">${n.label}</a>`).join('\n');
  const cta = SUBSCRIBE_ENABLED ? `  <div class="foot-cta" id="subscribe">
    <h2>每週一篇，看懂幣圈的行銷底層</h2>
    <p>訂閱電子報，把「怎麼被行銷」的視角裝進你的腦袋。</p>
    <form class="sub" onsubmit="return false">
      <input type="email" placeholder="你的 Email" aria-label="Email">
      <button class="btn btn-primary" type="submit">免費訂閱</button>
    </form>
  </div>
` : '';
  const subLink = SUBSCRIBE_ENABLED ? `\n        <a href="#subscribe">訂閱電子報</a>` : '';
  return `<footer class="site">
${cta}  <div class="shell foot-grid">
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
        <a href="${root}about.html">關於我</a>${subLink}
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
  const title = c.seoTitle || `${c.name} · ${SITE_NAME}`;
  const desc  = c.seoDesc  || c.dek;
  const url   = `${BASE_URL}/${slug}/`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" sizes="128x128" href="../assets/favicon-128.png">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="stylesheet" href="../assets/site.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="zh_TW">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<script type="application/ld+json">
${JSON.stringify({
  "@context":"https://schema.org",
  "@graph":[
    {"@type":"CollectionPage","@id":url,"url":url,"name":title,"description":desc,
     "isPartOf":{"@type":"WebSite","@id":BASE_URL+'/#website',"name":SITE_NAME,"url":BASE_URL+'/'},
     "about":c.kw ? {"@type":"Thing","name":c.kw} : undefined},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"首頁","item":BASE_URL+'/'},
      {"@type":"ListItem","position":2,"name":c.name,"item":url}
    ]}
  ]
},null,1)}
</script>
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

/* ---------- sitemap.xml + robots.txt（自動產生，頁面增減自動同步） ---------- */
const ROOT = path.join(__dirname, '..');

// 掃出所有實際存在的文章頁（欄目資料夾底下的 .html，排除 index）
function findArticles(dir, rel=''){
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('_')||e.name.startsWith('.')||e.name==='assets') continue;
    const p=path.join(dir,e.name), r=rel?rel+'/'+e.name:e.name;
    if(e.isDirectory()) out=out.concat(findArticles(p,r));
    else if(e.name.endsWith('.html') && e.name!=='index.html' && r!=='404.html') out.push(r);
  }
  return out;
}

const urls = [
  {loc:BASE_URL+'/', pri:'1.0', freq:'weekly'},
  {loc:BASE_URL+'/about.html', pri:'0.5', freq:'monthly'},
  ...Object.keys(CATS).map(s=>({loc:`${BASE_URL}/${s}/`, pri:'0.8', freq:'weekly'})),
  ...findArticles(ROOT).filter(f=>f!=='about.html').map(f=>({loc:`${BASE_URL}/${f}`, pri:'0.7', freq:'monthly'})),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u=>`  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT,'sitemap.xml'), sitemap);
console.log('wrote sitemap.xml —', urls.length, 'URLs');

fs.writeFileSync(path.join(ROOT,'robots.txt'),
`User-agent: *
Allow: /

# 開發工具與草稿不需索引
Disallow: /_tools/
Disallow: /_drafts/

Sitemap: ${BASE_URL}/sitemap.xml
`);
console.log('wrote robots.txt');

/* ---------- 404.html ----------
   GitHub Pages 會在「任意深度」的錯誤網址回傳這頁，但網址列仍停在那個深路徑，
   所以這頁的資源與連結一律用 BASE_URL 絕對網址，否則 CSS 會壞掉。 */
const notFound = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>找不到這一頁 · ${SITE_NAME}</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/png" sizes="128x128" href="${BASE_URL}/assets/favicon-128.png">
<link rel="stylesheet" href="${BASE_URL}/assets/site.css">
</head>
<body>
<header class="site">
  <div class="bar">
    <a class="brand" href="${BASE_URL}/" aria-label="${SITE_NAME} 首頁"><img src="${BASE_URL}/assets/logo-mark.png" alt=""><b>${SITE_NAME}</b></a>
    <span class="sp"></span>
    <a class="btn-sub" href="${BASE_URL}/">回首頁</a>
  </div>
</header>
<main>
  <section class="shell" style="text-align:center;padding:90px 20px 40px">
    <p class="eyebrow">404</p>
    <h1 style="font-size:clamp(30px,6vw,48px);letter-spacing:-.03em;margin:0 0 16px">這一頁被割掉了</h1>
    <p style="color:var(--muted);max-width:520px;margin:0 auto 30px;font-size:17px">
      連結可能過期、或是我搬過位置。要不要從這幾個地方繼續逛？
    </p>
    <div class="cols" style="max-width:760px;margin:0 auto;text-align:left">
${NAV.filter(n=>n.slug!=='about').map(n=>
`      <a class="col-tile" href="${BASE_URL}/${n.href}"><span class="ico">→</span><span><b>${n.label}</b></span></a>`).join('\n')}
    </div>
  </section>
</main>
<footer class="site">
  <div class="foot-legal" style="border:0;justify-content:center">
    <span>© 2026 ${SITE_NAME} · 用行銷人的眼睛，拆解幣圈</span>
  </div>
</footer>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT,'404.html'), notFound);
console.log('wrote 404.html');
