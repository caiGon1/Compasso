import http from 'node:http';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {createServer} from 'vite';import {api} from './api.js';
fs.mkdirSync('.local',{recursive:true});const sqlite=new DatabaseSync('.local/compasso.sqlite');sqlite.exec('PRAGMA foreign_keys=ON');
if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='users'").get())sqlite.exec(fs.readFileSync('drizzle/0000_initial.sql','utf8'));
const db={prepare(sql){return {bind(...params){return {async first(){return sqlite.prepare(sql).get(...params)},async all(){return {results:sqlite.prepare(sql).all(...params)}},async run(){return sqlite.prepare(sql).run(...params)}}}}}};
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
http.createServer(async(req,res)=>{if(req.url.startsWith('/api/')){try{const chunks=[];for await(const c of req)chunks.push(c);const response=await api(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})}),db);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text())}catch{res.writeHead(500);res.end('Erro no servidor')}}else vite.middlewares(req,res)}).listen(5173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5173'));

