// @vitest-environment jsdom
import React from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from '../src/App.jsx';
import { client, account } from './helpers/api.mjs';
import { lessons } from '../src/content.js';
vi.mock('../src/audio.js',async original=>({...await original(),playNote:vi.fn(),playDrum:vi.fn(),sequence:vi.fn(),tone:vi.fn(),stopPlayback:vi.fn()}));
let c;
afterEach(()=>{cleanup();c?.close();vi.unstubAllGlobals()});
test('fluxo completo: React → API real → SQLite → conquista → recarga → edição de perfil → logout',async()=>{
 c=client();document.startViewTransition=undefined;document.documentElement.dataset.theme='light';
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 vi.stubGlobal('fetch',vi.fn(async(path,options)=>{const r=await c.call(path.replace('/api/',''),options?.body?JSON.parse(options.body):undefined);return{ok:r.status<400,json:async()=>r.data}}));
 let view=render(<App/>);await screen.findByRole('heading',{name:'Sua jornada musical começa aqui.'});fireEvent.click(screen.getByRole('button',{name:'Começar minha jornada'}));
 for(const[label,value]of[['Como podemos chamar você?',account.name],['E-mail',account.email],['Senha',account.password]])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.change(screen.getByLabelText('Faixa etária'),{target:{value:'adult'}});fireEvent.click(screen.getByRole('button',{name:'Criar minha conta'}));await screen.findByRole('heading',{name:'No seu ritmo, Ana.'});
 fireEvent.click(screen.getByRole('button',{name:'Começar minha jornada',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Praticar o que aprendi'}));
 for(const[i,q]of lessons[0].questions.entries()){fireEvent.click(screen.getByText(q.options[q.answer],{exact:true}).closest('button'));fireEvent.click(screen.getByRole('button',{name:'Verificar resposta'}));fireEvent.click(screen.getByRole('button',{name:i===2?'Concluir aula':'Próxima pergunta'}))}
 await screen.findByText('Aula concluída');fireEvent.click(screen.getByRole('button',{name:'Voltar à trilha'}));expect(c.sqlite.prepare('SELECT score,xp FROM progress').get()).toMatchObject({score:100,xp:50});
 view.unmount();view=render(<App/>);await screen.findByRole('heading',{name:'No seu ritmo, Ana.'});expect(screen.getByRole('button',{name:'Ritmo, pulso e compasso'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Conquistas'}));expect(screen.getByRole('heading',{name:'50 XP'})).toBeInTheDocument();expect(screen.getByText('Conquistada')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Abrir perfil'}));fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Ana Música'}});fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await waitFor(()=>expect(c.sqlite.prepare('SELECT name FROM users').get().name).toBe('Ana Música'));
 fireEvent.click(screen.getByRole('button',{name:'Sair da conta'}));await screen.findByRole('heading',{name:'Sua jornada musical começa aqui.'});expect(c.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions').get().n).toBe(0);
});

