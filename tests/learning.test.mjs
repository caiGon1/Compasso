import { test, expect, beforeEach, afterEach } from 'vitest';
import { modules, lessons, instruments, unlocked, questionsFor } from '../src/content.js';
import { client } from './helpers/api.mjs';
let c;beforeEach(()=>{c=client()});afterEach(()=>c.close());
test('conteúdo tem IDs únicos, questões válidas e materiais por instrumento',()=>{
 expect(new Set(lessons.map(l=>l.id)).size).toBe(lessons.length);expect(modules).toHaveLength(5);expect(instruments.map(i=>i.id).sort()).toEqual(['drums','guitar','piano']);
 for(const l of lessons){expect(l.text.length).toBeGreaterThan(30);for(const q of l.questions){expect(q.options.length).toBeGreaterThan(1);expect(q.options[q.answer]).toBeTruthy();expect(q.why).toBeTruthy()}}
});
test.each(['child','teen','adult'])('questões e desbloqueios para %s',age=>{for(const l of lessons)expect(questionsFor(l,age)).toHaveLength(age==='child'?2:3);expect(unlocked(lessons[0].id,[])).toBe(true);expect(unlocked(lessons[1].id,[])).toBe(false);expect(unlocked(lessons[1].id,[lessons[0].id])).toBe(true);expect(unlocked('inexistente',[])).toBe(false)});
test.each([[],[1],[1,1,9],[1,1,-1],[1,1,'0'],[1,1,1.5],[1,1,null],[1,1,0,0]])('respostas inválidas não criam progresso: %j',async answers=>{await c.register();expect((await c.call('complete',{id:'notes',answers})).status).toBe(400);expect((await c.call('me')).data.progress).toEqual([])});
test('reprovação não libera aula; melhoria mantém melhor nota e não duplica XP',async()=>{
 await c.register();const failed=await c.call('complete',{id:'notes',answers:[0,0,0]});expect(failed.status).toBe(400);expect((await c.call('complete',{id:'pulse',answers:[1,0,1]})).status).toBe(403);
 const pass=await c.call('complete',{id:'notes',answers:[1,1,1]});expect(pass.data.progress[0]).toMatchObject({score:67,xp:34});
 const perfect=await c.call('complete',{id:'notes',answers:[1,1,0]});expect(perfect.data.progress).toHaveLength(1);expect(perfect.data.progress[0]).toMatchObject({score:100,xp:50});
 const replay=await c.call('complete',{id:'notes',answers:[1,1,1]});expect(replay.data.progress[0]).toMatchObject({score:100,xp:50});
 expect((await c.call('complete',{id:'missing',answers:[]})).status).toBe(403);
});
test.each(['child','teen','adult'])('trilha completa e isolamento de contas para %s',async age=>{
 await c.register({age});for(const l of lessons){const r=await c.call('complete',{id:l.id,answers:questionsFor(l,age).map(q=>q.answer)});expect(r.status).toBe(200)}
 const completed=(await c.call('me')).data.progress;expect(completed).toHaveLength(lessons.length);expect(completed.reduce((n,p)=>n+p.xp,0)).toBe(300);
 await c.register({email:'outra@example.com',age});expect((await c.call('me')).data.progress).toEqual([]);
});
