import {lessons,questionsFor,unlocked} from '../src/content.js';
const json=(x,status=200,headers={})=>Response.json(x,{status,headers:{'Cache-Control':'no-store',...headers}});
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function hash(text){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
export async function api(req,db){
 const url=new URL(req.url),path=url.pathname;const secure=url.protocol==='https:'?'; Secure':'';
 const cookie=t=>`compasso_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`;
 if(req.method!=='GET'&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return json({error:'Origem inválida.'},403);
 try{
 const token=(req.headers.get('cookie')||'').match(/(?:^|; )compasso_session=([^;]+)/)?.[1];
 const user=token?await db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').bind(await hash(token),Date.now()).first():null;
 async function state(u){const {results}=await db.prepare('SELECT lesson_id,score,xp,completed_at FROM progress WHERE user_id=? ORDER BY completed_at').bind(u.id).all();return {user:{name:u.name,email:u.email,age:u.age,instrument:u.instrument},progress:results}}
 if(path==='/api/me'&&req.method==='GET')return json(user?await state(user):{user:null,progress:[]});
 if(req.method!=='POST')return json({error:'Rota não encontrada.'},404);
 if(Number(req.headers.get('content-length'))>10000)return json({error:'Dados muito grandes.'},413);
 const raw=await req.text();if(raw.length>10000)return json({error:'Dados muito grandes.'},413);
 let body;try{body=JSON.parse(raw||'{}')}catch{return json({error:'Envie um objeto JSON válido.'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Envie um objeto JSON válido.'},400);
 if(path==='/api/register'||path==='/api/login'){
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<8||password.length>128)return json({error:'Informe um e-mail válido e uma senha de 8 a 128 caracteres.'},400);
  let u;
  if(path==='/api/register'){
   const name=String(body.name||'').trim();if(!name||name.length>60||!['child','teen','adult'].includes(body.age))return json({error:'Informe seu nome e sua faixa etária.'},400);
   if(await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first())return json({error:'Este e-mail já está cadastrado. Use Entrar.'},409);
   const salt=crypto.randomUUID();u={id:crypto.randomUUID(),name,email,age:body.age,instrument:['piano','guitar','drums'].includes(body.instrument)?body.instrument:'piano'};
   await db.prepare('INSERT INTO users (id,name,email,password,salt,age,instrument,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(u.id,name,email,await passwordHash(password,salt),salt,u.age,u.instrument,new Date().toISOString()).run();
  }else{u=await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();const computed=await passwordHash(password,u?.salt||'dummy-salt');if(!u||computed!==u.password)return json({error:'E-mail ou senha incorretos.'},401)}
  const session=hex(crypto.getRandomValues(new Uint8Array(32)));await db.prepare('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)').bind(await hash(session),u.id,Date.now()+604800000).run();return json(await state(u),200,{'Set-Cookie':cookie(session)});
 }
 if(!user)return json({error:'Entre na sua conta para continuar.'},401);
 if(path==='/api/logout'){if(token)await db.prepare('DELETE FROM sessions WHERE token=?').bind(await hash(token)).run();return json({ok:true},200,{'Set-Cookie':`compasso_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`})}
 if(path==='/api/profile'){const name=String(body.name||'').trim();if(!name||name.length>60||!['child','teen','adult'].includes(body.age)||!['piano','guitar','drums'].includes(body.instrument))return json({error:'Confira os campos do perfil.'},400);await db.prepare('UPDATE users SET name=?,age=?,instrument=? WHERE id=?').bind(name,body.age,body.instrument,user.id).run();return json(await state({...user,name,age:body.age,instrument:body.instrument}))}
 if(path==='/api/complete'){
  const lesson=lessons.find(l=>l.id===body.id),s=await state(user);if(!lesson||!unlocked(body.id,s.progress.map(p=>p.lesson_id)))return json({error:'Conclua a aula anterior primeiro.'},403);
  const questions=questionsFor(lesson,user.age);if(!Array.isArray(body.answers)||body.answers.length!==questions.length||body.answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=questions[i].options.length))return json({error:'Responda todas as perguntas.'},400);
  const score=Math.round(100*questions.filter((q,i)=>q.answer===body.answers[i]).length/questions.length);if(score<60)return json({error:'Você precisa de pelo menos 60%. Revise a aula e tente novamente.',score},400);
  await db.prepare('INSERT INTO progress (user_id,lesson_id,score,xp,completed_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET score=MAX(score,excluded.score),xp=MAX(xp,excluded.xp)').bind(user.id,lesson.id,score,Math.round(score/2),new Date().toISOString()).run();return json(await state(user));
 }
 return json({error:'Rota não encontrada.'},404);
 }catch(e){console.error(e);return json({error:'Não foi possível concluir. Tente novamente.'},500)}
}
