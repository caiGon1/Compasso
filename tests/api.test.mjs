import {test} from 'vitest';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import {api} from '../server/api.js';import {lessons,questionsFor} from '../src/content.js';
function database(){const s=new DatabaseSync(':memory:');s.exec(fs.readFileSync(new URL('../drizzle/0000_initial.sql',import.meta.url),'utf8'));return {prepare(sql){return {bind(...p){return {async first(){return s.prepare(sql).get(...p)},async all(){return {results:s.prepare(sql).all(...p)}},async run(){return s.prepare(sql).run(...p)}}}}}}}
test('Cadastro, sessão, bloqueio de sequência, correção, XP idempotente e isolamento de contas',async()=>{const db=database();let cookie='';async function call(path,body){const r=await api(new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{cookie,origin:'http://localhost'},...(body?{body:JSON.stringify(body)}:{})}),db);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')}}
 assert.equal((await call('me')).data.user,null);
 assert.equal((await call('complete',{id:'notes',answers:[1,1,0]})).status,401);
 const r=await call('register',{name:'Teste',email:'teste@example.com',password:'SenhaTeste123!',age:'adult',instrument:'piano'});assert.equal(r.status,200);cookie=r.cookie.split(';')[0];assert.equal((await call('me')).data.user.name,'Teste');
 assert.equal((await call('complete',{id:'triads',answers:[1,1,0]})).status,403);
 assert.equal((await call('complete',{id:'notes',answers:[0,0,1]})).status,400);
 for(const l of lessons){const done=await call('complete',{id:l.id,answers:questionsFor(l,'adult').map(q=>q.answer)});assert.equal(done.status,200)}
 let state=(await call('me')).data;assert.equal(state.progress.length,6);assert.equal(state.progress.reduce((a,p)=>a+p.xp,0),300);
 await call('complete',{id:'notes',answers:[1,1,0]});state=(await call('me')).data;assert.equal(state.progress.reduce((a,p)=>a+p.xp,0),300);
 assert.equal((await call('logout',{})).status,200);assert.equal((await call('me')).data.user,null);
 assert.equal((await call('login',{email:'teste@example.com',password:'errada123'})).status,401);
 const login=await call('login',{email:'teste@example.com',password:'SenhaTeste123!'});assert.equal(login.status,200);cookie=login.cookie.split(';')[0];assert.equal((await call('me')).data.progress.length,6);
 const other=await call('register',{name:'Outra',email:'outra@example.com',password:'OutraSenha123!',age:'child',instrument:'guitar'});cookie=other.cookie.split(';')[0];assert.equal((await call('me')).data.progress.length,0);assert.equal((await call('complete',{id:'notes',answers:[1,1]})).status,200);
 assert.equal((await call('profile',{name:'Nova',age:'teen',instrument:'drums'})).data.user.age,'teen');
});
test('Rejeita gravação de outra origem',async()=>{const response=await api(new Request('http://localhost/api/register',{method:'POST',headers:{origin:'https://other.example'},body:'{}'}),database());assert.equal(response.status,403)});

