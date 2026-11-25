import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import '../public/rules.js';
import {api} from './api.mjs';
const db=new DatabaseSync(process.env.BARRIER_DB||'barrier.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY,data TEXT NOT NULL,time INTEGER NOT NULL,rev INTEGER NOT NULL)');
const store={
 cleanup:t=>db.prepare('DELETE FROM rooms WHERE time<?').run(t),
 create:(c,r,t)=>db.prepare('INSERT OR IGNORE INTO rooms VALUES (?,?,?,0)').run(c,JSON.stringify(r),t).changes,
 get:c=>db.prepare('SELECT * FROM rooms WHERE code=?').get(c),
 save:(c,v,r,t)=>db.prepare('UPDATE rooms SET data=?,time=?,rev=rev+1 WHERE code=? AND rev=?').run(JSON.stringify(r),t,c,v).changes
};
const types={html:'text/html',css:'text/css',js:'text/javascript',png:'image/png',ico:'image/x-icon',webmanifest:'application/manifest+json'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413).end();return}}
  const ans=await api(new Request(url,{method:req.method,headers:req.headers,body:body||undefined}),store);
  res.writeHead(ans.status,Object.fromEntries(ans.headers));res.end(await ans.text());return;
 }
 const f=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!/^[a-z0-9-]+\.(html|css|js|png|ico|webmanifest)$/.test(f)){res.writeHead(404).end();return}
 const b=await readFile(new URL('../public/'+f,import.meta.url));res.writeHead(200,{'Content-Type':types[f.split('.').at(-1)]});res.end(b);
 }catch{res.writeHead(404).end()}
}).listen(Number(process.env.PORT||8080),()=>console.log('Barrier listening on port '+(process.env.PORT||8080)));
