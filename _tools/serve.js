/* 本機預覽伺服器：node _tools/serve.js → http://localhost:8099/
   永遠以 content/ 為網站根目錄（不管從哪個目錄執行）。 */
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');   // = content/
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/'))p+='index.html';
  let f=path.join(ROOT,p);
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end('404 '+p);return;}
    res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(d);});
}).listen(8099,()=>console.log('chainfunnel 預覽中 → http://localhost:8099/'));
