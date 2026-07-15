# chainfunnel · 網站維護說明

> 用行銷人的眼睛，拆解幣圈。
> 這是一個**純靜態 HTML 網站**，不需要 WordPress、不需要資料庫、不需要每月主機費。
> 用 Claude Code 或任何編輯器就能維護。

---

## 一、資料夾長怎樣（哪些是網站、哪些是工具）

```
content/                    ← 這整個資料夾就是「網站」，部署時上傳這個
│
├─ index.html               首頁
├─ about.html               關於我
├─ README.md                （這份說明，不影響網站）
│
├─ assets/                  全站共用資源
│   ├─ site.css               ⭐ 全站樣式與配色（改這裡＝改整站長相）
│   ├─ logo-mark.png          圖示（header 用）
│   ├─ logo-full.png          完整 logo（footer 用）
│   └─ favicon-128/32.png     瀏覽器分頁小圖示
│
├─ decode/     幣圈拆解        每個欄目一個資料夾，
├─ exchange/   交易所指南       裡面的 index.html 是「該欄目的文章列表頁」，
├─ guide/      新手教學         由工具自動產生（見下方）。
├─ column/     觀察專欄         文章檔案就放在對應欄目資料夾裡。
│   └─ racing/motogp-crypto-sponsorship.html   ← 第一篇文章
├─ pivot/      轉職幣圈
├─ journal/    學習日誌
│
├─ _tools/                  ⚠️ 開發工具，「不是網站的一部分」，部署時排除
│   ├─ build-pages.js         產生欄目列表頁 + 導覽的「唯一來源」
│   ├─ process-logo.js        從原圖產生 logo/favicon
│   ├─ serve.js               本機預覽伺服器
│   ├─ article-template.html  ⭐ 新文章的範本（複製它來寫）
│   ├─ logo.png               logo 原圖（來源檔）
│   └─ node_modules/、package*.json   工具用的套件
│
└─ .claude/                 規劃文件（playbook、內容日曆等），也不是網站
```

**一句話**：`_` 開頭的資料夾（`_tools`）和 `.claude` 都不是網站，其餘才是。

---

## 二、本機預覽（改完先看對不對）

```bash
node _tools/serve.js
```

然後瀏覽器開 **http://localhost:8099/** 。改了檔案後，重新整理瀏覽器就會看到最新的。
（要停止：關掉終端機，或按 Ctrl+C。）

---

## 三、⭐ 如何新增一篇文章

**步驟 1：複製範本**
把 `_tools/article-template.html` 複製到對應欄目資料夾，取一個英文檔名（用連字號、不要空格）：

```
例：要寫一篇「轉職幣圈」的文章
→ 複製成  pivot/why-i-pivot-to-crypto.html
```

**步驟 2：填內容**
打開剛複製的檔案，把所有【】裡的字換成你的內容（標題、摘要、內文…）。
範本裡有註解教你每一格放什麼，內文只要用 `<h2>` `<p>` `<ul>` `<blockquote>` 這幾種標籤，樣式會自動套好。

**步驟 3：讓它出現在欄目列表**
打開 `_tools/build-pages.js`，找到 `const CATS = {…}`，在對應欄目的 `posts:[ ]` 最前面加一筆：

```js
pivot:{ico:'🚀',name:'轉職幣圈',dek:'…',
  posts:[
    {href:'pivot/why-i-pivot-to-crypto.html',   // ← 你的檔案路徑（從網站根算）
     kicker:'起點',
     title:'一個 B2C 行銷人，為什麼決定轉職幣圈',
     dek:'一句話摘要…',
     meta:'2026 · 8 分鐘',
     soon:false},                                // ← false＝已完成可點；true＝顯示「籌備中」
    // …其他既有的先留著
  ]},
```

**步驟 4：重新產生列表頁**
```bash
node _tools/build-pages.js
```
完成。欄目頁就會列出這篇了。用預覽確認一下即可。

> 小抄：一篇文章要「被看到」需要兩件事 →（A）文章檔案本身、（B）在 build-pages.js 登記。只做 A 檔案存在但列表頁不會出現；只做 B 會列出但點了 404。

---

## 四、如何新增 / 修改「欄目」或「導覽列」

導覽列和欄目都定義在 **`_tools/build-pages.js`** 最上面的 `NAV` 和 `CATS`。

- **改導覽文字或順序** → 改 `NAV`
- **新增一個欄目** → 在 `NAV` 加一項，並在 `CATS` 加一個對應區塊，然後 `node _tools/build-pages.js`

⚠️ **重要**：`index.html`（首頁）和 `about.html` 的導覽是**手寫的**，build-pages.js 不會動到它們。
所以改導覽後，記得請 Claude 幫你把首頁和關於頁的導覽一起同步（或自己比對著改）。

---

## 五、換 logo / 改配色

- **換 logo**：把新圖（透明底 PNG）覆蓋 `_tools/logo.png`，跑 `node _tools/process-logo.js`，
  會自動裁切、縮圖、產生 header / footer / favicon 全部資產到 `assets/`。
- **改配色或字體**：改 `assets/site.css` 最上面 `:root{ }` 裡的顏色變數（`--accent` 是主色）。改一處，全站跟著變。

---

## 六、部署上線（免費）

推薦 **Cloudflare Pages** 或 **GitHub Pages**（都免費、附 HTTPS、速度快）。

- 上傳／連結的是 **`content/` 資料夾**。
- **部署時排除**（這些是工具與文件，不該公開）：`_tools/`、`.claude/`、`README.md`。
  （多數平台可設定忽略清單；或部署前先把這幾個移開。）
- 網域：買一個接上即可（例如 chainfunnel.xyz）。

---

## 七、常見注意事項

- 檔名用**英文小寫 + 連字號**（`bitget-review.html`），不要用中文或空格 → 網址才漂亮、才不會出錯。
- 每篇文章的 `<title>` 和 `description` 要**每篇不一樣**、放關鍵字 → 這是 SEO 的基本盤。
- 圖片放 `assets/`（或 `assets/img/`），記得壓縮、加 `loading="lazy"` → 手機才快。
- 改完**一定先本機預覽**再部署。
```
