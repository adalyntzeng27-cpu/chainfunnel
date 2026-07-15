/* ============================================================
   chainfunnel — logo 資產產生器
   來源：_tools/logo.png（透明底原圖）
   輸出：../assets/ 的 logo-mark / logo-full / favicon-128 / favicon-32
   用法：換了新 logo → 覆蓋 _tools/logo.png → `node _tools/process-logo.js`
   一步完成「裁切透明留白 + 縮到 web 尺寸」，輸出即為最終上線用檔。
   ============================================================ */
const {PNG}=require('pngjs');
const fs=require('fs');
const path=require('path');
const SRC=path.join(__dirname,'logo.png');
const OUT=path.join(__dirname,'..','assets');

const src=PNG.sync.read(fs.readFileSync(SRC));
const {width:W,height:H,data:d}=src;
const A=18;                                   // alpha 門檻：低於此視為透明背景
const alpha=(x,y)=>d[(y*W+x)*4+3];

// 在 y 範圍內、alpha>A 的內容邊界
function bbox(y0,y1){let mnx=W,mny=H,mxx=-1,mxy=-1;
  for(let y=y0;y<=y1;y++)for(let x=0;x<W;x++){if(alpha(x,y)>A){if(x<mnx)mnx=x;if(x>mxx)mxx=x;if(y<mny)mny=y;if(y>mxy)mxy=y;}}
  return{mnx,mny,mxx,mxy};}

function crop(x0,y0,w,h){const o=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((y0+y)*W+(x0+x))*4,di=(y*w+x)*4;
    for(let k=0;k<4;k++)o.data[di+k]=(y0+y<H&&x0+x<W)?d[si+k]:0;}return o;}

// 面積平均縮放（處理 alpha），指定目標高、寬等比
function resize(png,th){const{width:sw,height:sh,data:s}=png;const tw=Math.round(sw*th/sh);const o=new PNG({width:tw,height:th});
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    const x0=Math.floor(x*sw/tw),x1=Math.max(x0+1,Math.floor((x+1)*sw/tw));
    const y0=Math.floor(y*sh/th),y1=Math.max(y0+1,Math.floor((y+1)*sh/th));
    let r=0,g=0,b=0,a=0,n=0;
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*sw+xx)*4,al=s[i+3];r+=s[i]*al;g+=s[i+1]*al;b+=s[i+2]*al;a+=al;n++;}
    const di=(y*tw+x)*4;o.data[di]=a?Math.round(r/a):0;o.data[di+1]=a?Math.round(g/a):0;o.data[di+2]=a?Math.round(b/a):0;o.data[di+3]=Math.round(a/n);}
  return o;}

function square(png){const{width:w,height:h}=png;const s=Math.max(w,h);const o=new PNG({width:s,height:s});
  const ox=(s-w>>1),oy=(s-h>>1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=(y*w+x)*4,di=((y+oy)*s+(x+ox))*4;for(let k=0;k<4;k++)o.data[di+k]=png.data[si+k];}
  return o;}

const pad=8;
const write=(name,png)=>{fs.writeFileSync(path.join(OUT,name),PNG.sync.write(png,{deflateLevel:9}));
  console.log(name,png.width+'x'+png.height,(fs.statSync(path.join(OUT,name)).size/1024|0)+'KB');};

// 完整 logo（圖示+文字）：整體內容框，底部裁到 ~772 去掉尾端光暈
const full=bbox(0,H-1);
const fullCrop=crop(Math.max(0,full.mnx-pad),Math.max(0,full.mny-pad),(full.mxx+pad)-(full.mnx-pad),772-(full.mny-pad));
write('logo-full.png',resize(fullCrop,300));

// 純圖示（鏈+漏斗，y<648 那段）→ header 與 favicon 用
const m=bbox(0,648);
const markCrop=crop(Math.max(0,m.mnx-pad),Math.max(0,m.mny-pad),(m.mxx+pad)-(m.mnx-pad),(m.mxy+pad)-(m.mny-pad));
write('logo-mark.png',resize(markCrop,150));

const sq=square(markCrop);
write('favicon-128.png',resize(sq,128));
write('favicon-32.png',resize(sq,32));
console.log('完成 → assets/');
