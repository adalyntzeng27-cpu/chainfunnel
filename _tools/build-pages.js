/* ============================================================
   chainfunnel — 欄目列表頁 + 首頁區塊 + sitemap 產生器
   改欄目/導覽/文章清單只改這支，然後 `node _tools/build-pages.js` 重生。
   輸出純靜態 HTML，執行期無任何依賴。

   ⭐ 這支現在也會回寫 index.html 與 about.html 裡以 <!-- AUTO:xxx --> 標記
      包住的區塊（導覽、招牌拆解、最新文章、逛逛欄目、頁尾欄目連結）。
      → 新文章只要登記進下面的 POSTS，首頁「最新文章」就會自動更新，
        不需要（也不要）手改那幾段 HTML。標記以外的地方仍然是手寫的。
   ============================================================ */
const fs = require('fs');
const path = require('path');

/* ⚠️ 接上自訂網域後，只要改這一行（例如 'https://chainfunnel.xyz'），
   canonical / OG / sitemap 全站跟著換。結尾不要斜線。 */
const BASE_URL = 'https://www.chain-funnel.com';

const SITE_NAME = 'chainfunnel';
const AUTHOR = '華特';
const OG_IMAGE = BASE_URL + '/assets/og-cover.png';

/* Google Analytics 4 追蹤碼（gtag.js）。換 GA 資源只改這個 ID。
   注意：手寫頁（index/about/既有文章/article-template）的 gtag 是各自寫死的，
   換 ID 時要一起搜尋「G-YQQK1Y311K」全站替換。 */
const GA_ID = 'G-YQQK1Y311K';
const GTAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;

/* ⚠️ 讀者數還不夠多時先關閉訂閱功能（nav 按鈕＋頁尾表單），
   之後要重新打開，把這個改回 true 再重跑 build-pages.js 就好。
   手寫頁（index/about/既有文章）的訂閱區塊是用註解包起來，同樣搜尋「訂閱功能」統一打開。 */
const SUBSCRIBE_ENABLED = false;

// 首頁「最新文章」要列幾篇（依發佈日期由新到舊，不做任何排除 →
// 新上線的文章必定出現在最前面）
const LATEST_COUNT = 4;

/* ============================================================
   ⭐ 欄目定義（2026-08-04 重整：6 欄 → 3 欄 → 再收斂為 2 欄）

   第一次收斂（6→3）解決的問題：3 個欄目是空殼（exchange / guide / journal
   籌備中卻掛在導覽與 sitemap 上），MotoGP 與泡菜溢價同時掛在兩個欄目，
   journal（轉職幣圈 心得）與 pivot（行銷人 轉職 幣圈）打同一個搜尋意圖。

   第二次收斂（3→2）解決的問題：「幣圈拆解」與「觀察專欄」的界線，就算寫成
   「對內 vs. 對外」讀者也分不出來——因為「拆解」是全站的動詞（首頁標語就是
   「用行銷人的眼睛，拆解幣圈」），叫這個名字的欄目會讓另一欄看起來像它的子集。
   與其硬撐兩個名字，不如合成一欄，用 kicker 分主題。

   剩下兩條界線（新文章要歸哪一欄，照 `rule` 判斷，不要憑感覺）：
     decode  幣圈的行銷動作 —— 怎麼買注意力（贊助、版位、市場）、怎麼把注意力變成錢（漏斗、誘因、CAC）
     pivot   行銷人要進這個產業需要知道的事 —— 主角是求職者（含過程筆記，原 journal 併入）

   ⚠️ 一篇文章只登記一次、只屬於一個欄目（見下方 POSTS 的 cat 欄位）。
   ⚠️ 檔案位置與欄目 slug 不必一致：已上線的兩篇贊助文留在 `column/` 底下
      不動網址（改網址的 SEO 成本沒必要付），新文章一律放 `decode/<主題>/`。
   ============================================================ */
const CATS = {
  decode: {
    ico: '🧠',
    name: '幣圈拆解',
    // 支柱詞「交易所行銷手法」「幣圈 體育贊助」歸各自的支柱長文，欄目頁不跟它們搶
    kw: '幣圈行銷手法',
    seoTitle: '幣圈拆解｜交易所行銷手法、體育贊助與注意力經濟',
    seoDesc: '用行銷人的眼睛拆解幣圈行銷手法：交易所怎麼靠空投、KOL、返佣、聯盟漏斗獲客，以及幣圈為什麼買下 F1 與 MotoGP 的版位、卻放掉世界盃。不談幣價，只拆手法。',
    dek: '空投、KOL、返佣、聯盟漏斗，到贊助 F1 與 MotoGP 的版位——幣圈怎麼把注意力買進來，又怎麼把它換成入金。這裡不談幣價，只拆手法。',
    rule: '收錄標準：主角是「幣圈的行銷動作」——不論是對外買注意力（體育贊助、賽車、地區市場、注意力經濟），還是對內把注意力變現（獲客漏斗、空投、KOL、CAC）。判斷句：這篇在講幣圈怎麼買注意力、或怎麼把注意力變成錢 → 放這裡。用 kicker 標主題（體育贊助／賽車 × 幣圈／交易所行銷／韓國加密…），欄目不再細分。',
    tile: '幣圈怎麼買注意力、又怎麼變現',
  },
  pivot: {
    ico: '🚀',
    name: '轉職幣圈',
    kw: '行銷人 轉職 幣圈',
    seoTitle: '行銷人如何轉職幣圈？職缺、作品集與面試全攻略',
    seoDesc: '行銷人如何轉職幣圈：職缺地圖、零經驗作品集、面試考題與薪資區間，加上邊拆邊學的過程筆記。用行銷人的眼睛，把這條路一篇篇拆解清楚。',
    dek: '寫給對「行銷人跨進幣圈」這件事好奇的人。職缺地圖、作品集、面試、薪資，以及邊拆邊學路上想通與卡住的事——一篇一篇拆給你看。',
    rule: '收錄標準：主角是「要進這個產業的人」——職缺、作品集、面試、薪資，以及自己邊補課邊修正的觀察筆記（原「學習日誌」欄目已併入這裡）。',
    tile: '行銷人跨進幣圈的路線與筆記',
  },
};

/* ---- 未開放欄目（資料夾與列表頁已下架，不進導覽、不進 sitemap） ----
   原本的「交易所指南」與「新手教學」兩欄合併成這一欄，等實際累積 2 篇
   以上再搬回上面的 CATS 重跑即可。affiliate 錢頁屬階段 2，本來就不該早開。 */
const PARKED = {
  tools: {
    ico: '🛠',
    name: '工具實測',
    kw: '加密貨幣交易所 比較 台灣',
    note: '合併原 exchange（交易所比較／出入金／手續費）與 guide（錢包、避雷、DEX 入門）。滿 2 篇再開欄。',
  },
};

/* ============================================================
   ⭐ 文章總表（全站唯一來源）
   一篇文章只出現在這個陣列一次，用 cat 指定欄目——欄目列表頁、首頁
   「最新文章」「招牌拆解」、sitemap 全部從這裡長出來。

   欄位：
     cat       欄目 slug（decode / column / pivot；PARKED 的 tools 會被忽略）
     href      相對網址；soon 的文章沒有這欄
     date      發佈日 YYYY-MM-DD（＝文章 JSON-LD 的 datePublished，決定排序）
     read      閱讀時間，例如 '12 分鐘'
     cardTitle / cardDek  首頁卡片用的短版（省略則沿用 title / dek）
     featured  true ＝ 進首頁「招牌拆解」（人工精選，取前 3）
     soon      true ＝ 內容路線圖，保留在表裡但不上站
   ============================================================ */
const POSTS = [
  // ---- decode｜敘事行銷：公司怎麼對資本市場講自己的故事 ----
  {
    cat: 'decode',
    href: 'decode/treasury/strategy-sells-bitcoin.html',
    kicker: '敘事行銷',
    title: '微策略賣比特幣：他們把「賣」改成了另一個名字',
    dek: '一家把「永不賣出」寫進企業身分的公司，這三個月分四批賣了幣。這篇拆的是他們怎麼讓這件事聽起來不像違背承諾。',
    cardDek: '官方公告裡那項計畫叫「貨幣化」，不叫賣。公告當天，股價漲了 12%。',
    date: '2026-08-13', read: '13 分鐘',
  },

  // ---- decode｜買注意力：贊助、賽車、地區市場（檔案留在 column/ 不動網址）----
  {
    cat: 'decode', featured: true,
    href: 'column/sponsorship/crypto-sports-sponsorship-2026.html',
    kicker: '體育贊助',
    title: '幣圈為什麼不贊助 2026 世界盃了？答案可能不只是熊市：錢還在，只是換了一個位置',
    dek: '世界盃沒有一個交易所 logo，但同年幣圈體育贊助總額創新高 5.65 億美元。拆解 OKX 怎麼把一支 F1 車隊用成一條通路。',
    cardTitle: '幣圈為什麼不贊助 2026 世界盃了？',
    cardDek: '世界盃一個交易所 logo 都沒有，同年體育贊助總額卻創新高。錢沒有變少，是換了一個位置。',
    date: '2026-08-04', read: '12 分鐘',
  },
  {
    cat: 'decode',
    href: 'column/racing/motogp-crypto-sponsorship.html',
    kicker: '賽車 × 幣圈',
    title: '加密貨幣為什麼贊助賽車？拆開看，是賭場的老邏輯',
    dek: '幣圈幾乎包了整條 F1 的 pit lane。第一眼像有錢任性，但拆開看，其實是賭場那套「錢跟著人走」的老邏輯搬上了賽車場。',
    cardDek: '幣圈幾乎包了整條 F1 的 pit lane。第一眼像有錢任性，拆開看是賭場那套「錢跟著人走」的老邏輯。',
    date: '2026-07-16', read: '12 分鐘',
  },
  {
    cat: 'decode', soon: true,
    kicker: '韓國加密',
    title: '泡菜溢價是什麼？韓國人為什麼願意用更貴的價格買幣',
    dek: '從資金流、法規到民族性的行銷觀察——為什麼同一顆幣，在韓國就是比較貴。',
  },
  {
    cat: 'decode', soon: true,
    kicker: '注意力經濟',
    title: '注意力經濟是什麼？為什麼幣圈的本質是一場敘事戰爭',
    dek: '從行銷人的視角，看幣圈怎麼把「注意力」變成錢。',
  },

  // ---- decode｜把注意力變現：獲客漏斗、空投、KOL、CAC ----
  {
    cat: 'decode', featured: true,
    href: 'decode/exchange-marketing-playbook.html',
    kicker: '交易所行銷',
    title: '交易所行銷手法全拆解：他們到底在買你的什麼',
    dek: '空投、KOL、返佣、聯盟漏斗——把交易所的獲客機器拆開，看每一顆螺絲怎麼轉。',
    date: '2026-07-19', read: '11 分鐘',
  },
  {
    cat: 'decode', soon: true,
    kicker: 'KOL 行銷',
    title: '幣圈 KOL 行銷怎麼運作？從報價、分潤到帶單話術',
    dek: '一條 KOL 推文背後的合約長什麼樣，以及為什麼你看到的「觀點」多半是通路。',
  },
  {
    cat: 'decode', soon: true,
    kicker: '空投',
    title: '空投行銷是什麼？把「免費送幣」當成獲客成本來算',
    dek: '空投不是福利，是 CAC。用行銷人的算法，看這筆錢到底買到了什麼樣的用戶。',
  },

  // ---- pivot 轉職幣圈（含原「學習日誌」的過程筆記） ----
  {
    cat: 'pivot',
    href: 'pivot/why-marketers-pivot-to-crypto.html',
    kicker: '現象觀察',
    title: '2026 年還有行銷人想轉職幣圈，原因真的只是錢嗎？',
    dek: '幣圈熊市、市值蒸發近 9 千億美元、還在裁員——這種時候「為了錢」最說不通。把薪資反差、去泡沫招聘、rug pull 算一遍，拆熊市裡還想進的人到底圖什麼。',
    cardDek: '熊市、蒸發近 9 千億美元、還在裁員——這種時候「為了錢」最說不通。那還想進的人在圖什麼？',
    date: '2026-07-27', read: '8 分鐘',
  },
  {
    cat: 'pivot', featured: true,
    href: 'pivot/crypto-marketing-jobs.html',
    kicker: '職缺地圖',
    title: '幣圈行銷職缺到底在做什麼？六個職位，各配一個真實案例拆給你看',
    dek: 'Community、Growth、Content、KOL、BD、行銷經理——職稱都很潮，但實際在做什麼？把六個常見職位各對上一個真實幣圈案例，加上薪資區間和沒經驗能不能應徵。',
    cardTitle: '幣圈行銷職缺到底在做什麼？六個職位拆解',
    cardDek: '職稱都很潮，實際在做什麼？六個常見職位各配一個真實案例，加上薪資區間與門檻。',
    date: '2026-07-18', read: '11 分鐘',
  },
  {
    cat: 'pivot', soon: true,
    kicker: '作品集',
    title: '零經驗怎麼建幣圈作品集？我的三個月計畫',
    dek: '自架網站、實測交易所、參與 DAO——把「沒經驗」變成「有作品」的具體路線。',
  },
  {
    cat: 'pivot', soon: true,
    kicker: '面試',
    title: '幣圈行銷面試都問什麼？行銷職的考題拆解',
    dek: '從蒐集到的真實題目，反推他們在找什麼樣的人，以及怎麼準備。',
  },
  {
    cat: 'pivot', soon: true,
    kicker: '過程筆記',
    title: '剛開始拆幣圈時，最容易看走眼的三件事',
    dek: '把新手最容易誤判的幾個幣圈現象記下來——不是教學，是踩過之後的修正筆記。',
  },

  // ---- tools 工具實測（欄目未開放，先寄放路線圖） ----
  { cat: 'tools', soon: true, kicker: '實測 · Bitget', title: 'Bitget 註冊教學（台灣）：入金到第一筆交易全流程', dek: '一步步實測截圖，含台灣出入金、手續費怎麼算、新手常踩的坑。' },
  { cat: 'tools', soon: true, kicker: '比較', title: 'OKX vs Bybit vs Bitget：三大交易所到底差在哪', dek: '手續費、深度、出金速度、App 體驗——用一張大比較表幫你選。' },
  { cat: 'tools', soon: true, kicker: '錢包', title: 'MetaMask 設定教學（繁中）：從安裝到第一次連 DApp', dek: '含助記詞保管、網路設定、常見詐騙提醒。' },
  { cat: 'tools', soon: true, kicker: '避雷', title: '如何避免假錢包詐騙：五個一定要養成的習慣', dek: '假 App、釣魚網站、授權盜轉——教你用行為習慣把風險降到最低。' },
];

// ---- 導覽（單一來源；index.html 與 about.html 由本檔自動同步） ----
const NAV = [
  ...Object.entries(CATS).map(([slug, c]) => ({ slug, href: slug + '/', label: c.name })),
  { slug: 'about', href: 'about.html', label: '關於我' },
];

// ---- 從 POSTS 衍生的清單 ----
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');
const published = POSTS.filter(p => !p.soon && p.href && CATS[p.cat]).sort(byDateDesc);
const postsOf = slug => POSTS.filter(p => p.cat === slug && !p.soon).sort(byDateDesc);
const latest = published.slice(0, LATEST_COUNT);
const featured = published.filter(p => p.featured).slice(0, 3);

// ---------- 樣板 ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function navLinks(root, active, indent) {
  return NAV.map(n => {
    const cur = n.slug === active ? ' aria-current="page"' : '';
    return `${indent}<a href="${root}${n.href}"${cur}>${n.label}</a>`;
  }).join('\n');
}

/* ⭐ 品牌鎖定版的唯一來源。字標是 SVG 路徑（見 _tools/gen-wordmark.js），
   不吃系統字體。header()／footer()／syncNav() 都從這兩支長出來，
   換 logo 只要改這裡再重跑。 */
function brandLink(root) {
  return `<a class="brand" href="${root}index.html" aria-label="chainfunnel 首頁"`
    + `><img class="mark" src="${root}assets/mark.png" alt=""`
    + `><img class="wm" src="${root}assets/wordmark.svg" alt="chainfunnel"></a>`;
}

function footBrand(root) {
  return `<span class="lockup"><img class="mark" src="${root}assets/mark.png" alt=""`
    + `><img class="wm" src="${root}assets/wordmark-stack.svg" alt="chainfunnel"></span>`;
}

function header(root, active) {
  const subBtn = SUBSCRIBE_ENABLED ? `\n    <a class="btn-sub" href="#subscribe">訂閱</a>` : '';
  return `<header class="site">
  <div class="bar">
    ${brandLink(root)}
    <button class="burger" id="burger" aria-label="選單" aria-expanded="false">☰</button>
    <nav class="nav" id="nav">
${navLinks(root, active, '      ')}
    </nav>
    <span class="sp"></span>${subBtn}
  </div>
</header>`;
}

function footLinks(root, indent) {
  return NAV.filter(n => n.slug !== 'about').map(n => `${indent}<a href="${root}${n.href}">${n.label}</a>`).join('\n');
}

function footer(root) {
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
      ${footBrand(root)}
      <p>用行銷人的眼睛，拆解幣圈。繁體中文的加密觀察站。</p>
    </div>
    <div class="foot-links">
      <div class="foot-col">
        <b>欄目</b>
${footLinks(root, '        ')}
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

function postRow(root, p, i) {
  const idx = String(i + 1).padStart(2, '0');
  const kicker = p.soon
    ? `<div class="rkicker">${esc(p.kicker)}<span class="soon-tag">籌備中</span></div>`
    : `<div class="rkicker">${esc(p.kicker)}</div>`;
  const meta = p.soon ? '' : `${p.date.slice(0, 4)} · ${p.read}`;
  const inner = `${kicker}
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.dek)}</p>${meta ? `\n      <div class="rmeta">${esc(meta)}</div>` : ''}`;
  if (p.soon) {
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

function catPage(slug, c) {
  const root = '../';
  // 只渲染已完成文章；soon:true 為內容路線圖，保留在 POSTS 但不上站。
  const pub = postsOf(slug).filter(p => !p.soon);
  const rows = pub.map((p, i) => postRow(root, p, i)).join('\n');
  const empty = pub.length === 0
    ? `\n    <div class="empty-note"><b>這個欄目正在籌備中。</b><br>第一批文章即將上線，敬請期待。</div>`
    : '';
  const title = c.seoTitle || `${c.name} · ${SITE_NAME}`;
  const desc = c.seoDesc || c.dek;
  const url = `${BASE_URL}/${slug}/`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${GTAG}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="../assets/favicon-16.png">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
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
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage", "@id": url, "url": url, "name": title, "description": desc,
        "isPartOf": { "@type": "WebSite", "@id": BASE_URL + '/#website', "name": SITE_NAME, "url": BASE_URL + '/' },
        "about": c.kw ? { "@type": "Thing", "name": c.kw } : undefined
      },
      {
        "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "首頁", "item": BASE_URL + '/' },
          { "@type": "ListItem", "position": 2, "name": c.name, "item": url }
        ]
      }
    ]
  }, null, 1)}
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

// ---------- 輸出欄目頁 ----------
let n = 0;
for (const [slug, c] of Object.entries(CATS)) {
  const dir = path.join(__dirname, '..', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), catPage(slug, c));
  const pub = postsOf(slug).filter(p => !p.soon).length;
  const all = postsOf(slug).length;
  console.log('wrote', slug + '/index.html', '(' + pub + ' published / ' + all + ' total)');
  n++;
}
console.log('done —', n, 'category pages');

/* ============================================================
   ⭐ 回寫首頁與關於頁的自動區塊
   只替換 <!-- AUTO:xxx --> ... <!-- /AUTO:xxx --> 之間的內容，
   標記以外的手寫內容完全不動。找不到標記就跳過並警告（不會壞頁）。
   ============================================================ */
function homeCard(p, feat) {
  const meta = feat
    ? `${CATS[p.cat].name} · ${p.read}`
    : `${p.date} · ${CATS[p.cat].name}`;
  return `    <a class="card${feat ? ' feat' : ''}" href="${p.href}">
      <div class="kicker">${esc(p.kicker)}</div>
      <h3>${esc(p.cardTitle || p.title)}</h3>
      <p>${esc(p.cardDek || p.dek)}</p>
      <div class="meta">${esc(meta)}</div>
    </a>`;
}

function fillAuto(file, blocks) {
  const abs = path.join(__dirname, '..', file);
  let html = fs.readFileSync(abs, 'utf8');
  let hit = 0;
  for (const [key, body] of Object.entries(blocks)) {
    const re = new RegExp(`(<!-- AUTO:${key} -->)[\\s\\S]*?(<!-- /AUTO:${key} -->)`);
    if (!re.test(html)) { console.warn('  ⚠️ ' + file + ' 找不到 AUTO:' + key + ' 標記，略過'); continue; }
    html = html.replace(re, `$1\n${body}\n$2`);
    hit++;
  }
  fs.writeFileSync(abs, html);
  console.log('wrote', file, '—', hit + '/' + Object.keys(blocks).length, 'auto blocks');
}

/* ⭐ 導覽同步：所有手寫頁（index / about / 每篇文章 / 文章模板）的
   <nav class="nav" id="nav">、頁尾「欄目」清單、以及品牌鎖定版（導覽列 logo
   與頁尾 logo），一律由 NAV 與 brandLink()／footBrand() 覆寫。
   → 以後改欄目或換 logo 都不必逐頁手改，重跑這支就好。
   （靠 markup 形狀辨識，不需要 AUTO 標記；改過的舊標記會被自動清掉。） */
function syncNav(file) {
  const abs = path.join(__dirname, '..', file);
  if (!fs.existsSync(abs)) return false;
  let html = fs.readFileSync(abs, 'utf8');
  const before = html;

  const depth = file.split('/').length - 1;
  const root = '../'.repeat(depth);
  // 欄目由 POSTS 決定，不靠資料夾名——已上線的贊助文檔案在 column/ 但欄目是 decode
  const top = depth ? file.split('/')[0] : null;
  const post = POSTS.find(p => p.href === file);
  const active = file === 'about.html' ? 'about'
    : post ? post.cat
      : (CATS[top] ? top : null);

  html = html.replace(
    /(<nav class="nav" id="nav">)[\s\S]*?(\s*<\/nav>)/,
    (_m, open, close) => `${open}\n${navLinks(root, active, '      ')}${close}`);
  html = html.replace(
    /(<b>欄目<\/b>)[\s\S]*?(\s*<\/div>)/,
    (_m, open, close) => `${open}\n${footLinks(root, '        ')}${close}`);
  // 品牌鎖定版：導覽列的 <a class="brand"> 與頁尾 .foot-brand 裡的圖，整塊換掉
  html = html.replace(/<a class="brand"[\s\S]*?<\/a>/, () => brandLink(root));
  html = html.replace(
    /(<div class="foot-brand">\s*)[\s\S]*?(\s*<p>)/,
    (_m, open, close) => `${open}${footBrand(root)}${close}`);

  if (html === before) return false;
  fs.writeFileSync(abs, html);
  return true;
}

const navTargets = ['index.html', 'about.html', '_tools/article-template.html'];
console.log('synced nav —', navTargets.filter(syncNav).length, 'of', navTargets.length, 'shell pages');

fillAuto('index.html', {
  // 招牌與最新都橫跨三個欄目，沒有單一「看全部」目的地，所以不放 more 連結；
  // 導覽交給下面的「逛逛欄目」。
  featured: `  <div class="sec-head"><h2>招牌拆解</h2></div>
  <div class="grid g3">
${featured.map(p => homeCard(p, true)).join('\n')}
  </div>`,
  latest: `  <div class="sec-head"><h2>最新文章</h2></div>
  <div class="grid g2">
${latest.map(p => homeCard(p, false)).join('\n')}
  </div>`,
  // 兩個欄目 +「關於我」剛好一排三格
  cols: `  <div class="sec-head"><h2>逛逛欄目</h2></div>
  <div class="cols">
${Object.entries(CATS).map(([slug, c]) =>
    `    <a class="col-tile" href="${slug}/"><span class="ico">${c.ico}</span><span><b>${esc(c.name)}</b><span>${esc(c.tile)}</span></span></a>`).join('\n')}
    <a class="col-tile" href="about.html"><span class="ico">👤</span><span><b>關於我</b><span>我是誰，為什麼寫這個站</span></span></a>
  </div>`,
});

/* ---------- sitemap.xml + robots.txt（自動產生，頁面增減自動同步） ---------- */
const ROOT = path.join(__dirname, '..');

// 掃出所有實際存在的文章頁（欄目資料夾底下的 .html，排除 index）
function findArticles(dir, rel = '') {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || e.name === 'assets') continue;
    const p = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out = out.concat(findArticles(p, r));
    else if (e.name.endsWith('.html') && e.name !== 'index.html' && r !== '404.html') out.push(r);
  }
  return out;
}

// 每篇既有文章的導覽列也一起同步（文章是手寫的，但導覽不該手寫）
const articleFiles = findArticles(ROOT).filter(f => f !== 'about.html' && f !== 'index.html');
console.log('synced nav —', articleFiles.filter(syncNav).length, 'of', articleFiles.length, 'articles');

const urls = [
  { loc: BASE_URL + '/', pri: '1.0', freq: 'weekly' },
  { loc: BASE_URL + '/about.html', pri: '0.5', freq: 'monthly' },
  ...Object.keys(CATS).map(s => ({ loc: `${BASE_URL}/${s}/`, pri: '0.8', freq: 'weekly' })),
  ...articleFiles.map(f => ({ loc: `${BASE_URL}/${f}`, pri: '0.7', freq: 'monthly' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('wrote sitemap.xml —', urls.length, 'URLs');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
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
${GTAG}
<title>找不到這一頁 · ${SITE_NAME}</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/svg+xml" href="${BASE_URL}/assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="${BASE_URL}/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="${BASE_URL}/assets/favicon-16.png">
<link rel="stylesheet" href="${BASE_URL}/assets/site.css">
</head>
<body>
<header class="site">
  <div class="bar">
    <a class="brand" href="${BASE_URL}/" aria-label="${SITE_NAME} 首頁"><img class="mark" src="${BASE_URL}/assets/mark.png" alt=""><img class="wm" src="${BASE_URL}/assets/wordmark.svg" alt="${SITE_NAME}"></a>
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
${NAV.filter(n => n.slug !== 'about').map(n =>
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
fs.writeFileSync(path.join(ROOT, '404.html'), notFound);
console.log('wrote 404.html');
