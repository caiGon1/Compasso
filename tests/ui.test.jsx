// @vitest-environment jsdom
import React from 'react';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App, Auth, Lesson, Keyboard, Metronome, Lab, EarTraining, Profile, smooth, request } from '../src/App.jsx';
import { modules, lessons, questionsFor } from '../src/content.js';
import { playNote, playDrum, sequence, tone, stopPlayback } from '../src/audio.js';
vi.mock('../src/audio.js',async importOriginal=>({...await importOriginal(),playNote:vi.fn(),playDrum:vi.fn(),sequence:vi.fn(),tone:vi.fn(),stopPlayback:vi.fn()}));
const user={name:'Ana',email:'ana@example.com',age:'adult',instrument:'piano'};
const state={user,progress:[]};
const reply=(data=state,ok=true)=>({ok,json:async()=>data});
beforeEach(()=>{
 vi.clearAllMocks();localStorage.clear();document.documentElement.dataset.theme='light';
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 vi.stubGlobal('fetch',vi.fn(async()=>reply()));
 document.startViewTransition=undefined;
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
test('teclado toca notas por clique/atalho, sustenidos e baixo; ignora digitação e repetição',()=>{
 const view=render(<Keyboard/>);fireEvent.click(screen.getAllByRole('button',{name:'Tocar Dó',exact:true})[0]);expect(playNote).toHaveBeenCalledWith(261.63);
 fireEvent.click(screen.getByRole('button',{name:'Tocar Dó sustenido'}));expect(playNote.mock.calls.at(-1)[0]).toBeCloseTo(277.18,1);
 fireEvent.keyDown(window,{key:'s'});expect(playNote).toHaveBeenLastCalledWith(293.66);
 fireEvent.keyDown(window,{key:'z'});expect(playNote).toHaveBeenLastCalledWith(130.81,1.5);
 playNote.mockClear();fireEvent.keyDown(window,{key:'a',repeat:true});const input=document.createElement('input');document.body.append(input);fireEvent.keyDown(input,{key:'a'});input.remove();expect(playNote).not.toHaveBeenCalled();
 view.unmount();fireEvent.keyDown(window,{key:'a'});expect(playNote).not.toHaveBeenCalled();
});
test('metrônomo marca pulso, muda BPM e encerra o timer ao parar/desmontar',()=>{
 vi.useFakeTimers();const view=render(<Metronome/>);fireEvent.click(screen.getByRole('button',{name:'Iniciar metrônomo'}));expect(tone).toHaveBeenLastCalledWith(1000,.06);
 act(()=>vi.advanceTimersByTime(750));expect(tone).toHaveBeenLastCalledWith(700,.06);
 fireEvent.change(screen.getByRole('slider'),{target:{value:'120'}});expect(screen.getByText('120 BPM')).toBeInTheDocument();const calls=tone.mock.calls.length;
 act(()=>vi.advanceTimersByTime(500));expect(tone).toHaveBeenCalledTimes(calls+1);
 fireEvent.click(screen.getByRole('button',{name:'Parar metrônomo'}));act(()=>vi.advanceTimersByTime(1000));expect(tone).toHaveBeenCalledTimes(calls+1);
 fireEvent.click(screen.getByRole('button',{name:'Iniciar metrônomo'}));view.unmount();expect(vi.getTimerCount()).toBe(0);
});
test('laboratório apresenta pauta, metrônomo, intervalos e acordes com as notas corretas',()=>{
 const view=render(<Lab kind="staff"/>);expect(screen.getByRole('img',{name:/cinco linhas/})).toBeInTheDocument();
 view.rerender(<Lab kind="rhythm"/>);expect(screen.getByRole('slider')).toHaveAttribute('min','40');expect(screen.getByRole('slider')).toHaveAttribute('max','180');
 view.rerender(<Lab kind="ear"/>);fireEvent.click(screen.getByRole('button',{name:'Ouvir exemplo'}));expect(sequence).toHaveBeenLastCalledWith([261.63,392]);
 view.rerender(<Lab kind="chords"/>);fireEvent.click(screen.getByRole('button',{name:'Dó maior'}));expect(playNote.mock.calls.map(c=>c[0])).toEqual([261.63,329.63,392]);playNote.mockClear();
 fireEvent.click(screen.getByRole('button',{name:'Dó menor'}));expect(playNote.mock.calls.map(c=>c[0])).toEqual([261.63,311.13,392]);
});
test.each([['child',2],['teen',3],['adult',3]])('aula adapta conteúdo e conclui desafio para %s',async(age,count)=>{
 const onSuccess=vi.fn(),close=vi.fn(),lesson=lessons[0];render(<Lesson lesson={lesson} user={{...user,age}} onSuccess={onSuccess} close={close}/>);
 expect(screen.getByText(age==='child'?lesson.child:age==='teen'?lesson.teen:lesson.text)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Praticar o que aprendi'}));
 const qs=questionsFor(lesson,age);expect(qs).toHaveLength(count);
 for(const [i,q] of qs.entries()){
  expect(screen.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();fireEvent.click(screen.getByText(q.options[q.answer],{exact:true}).closest('button'));
  fireEvent.click(screen.getByRole('button',{name:'Verificar resposta'}));expect(screen.getByText('Isso mesmo!')).toBeInTheDocument();expect(screen.getByText(q.why)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:i===qs.length-1?'Concluir aula':'Próxima pergunta'}));
 }
 expect(await screen.findByText('Aula concluída')).toBeInTheDocument();expect(fetch).toHaveBeenCalledWith('/api/complete',expect.objectContaining({body:JSON.stringify({id:lesson.id,answers:qs.map(q=>q.answer)})}));expect(onSuccess).toHaveBeenCalledWith(state);
 fireEvent.click(screen.getByRole('button',{name:'Voltar à trilha'}));expect(close).toHaveBeenCalledOnce();
});
test('aula explica resposta errada e permite revisar quando o servidor reprova',async()=>{
 fetch.mockResolvedValue(reply({error:'Revise a aula.'},false));render(<Lesson lesson={lessons[0]} user={{...user,age:'child'}} onSuccess={vi.fn()} close={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Praticar o que aprendi'}));
 for(let i=0;i<2;i++){fireEvent.click(screen.getByText(lessons[0].questions[i].options[0],{exact:true}).closest('button'));fireEvent.click(screen.getByRole('button',{name:'Verificar resposta'}));expect(screen.getByText('Vamos aprender com essa.')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:i?'Concluir aula':'Próxima pergunta'}))}
 expect(await screen.findByRole('alert')).toHaveTextContent('Revise a aula.');fireEvent.click(screen.getByRole('button',{name:'Revisar e tentar novamente'}));expect(screen.getByRole('button',{name:'Praticar o que aprendi'})).toBeEnabled();
});
test('cadastro envia nome/idade/instrumento e login exibe erro sem fechar o diálogo',async()=>{
 const success=vi.fn(),close=vi.fn();render(<Auth onSuccess={success} close={close}/>);
 fireEvent.change(screen.getByLabelText('Como podemos chamar você?'),{target:{value:'Ana'}});fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:user.email}});fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'Teste123!'}});fireEvent.change(screen.getByLabelText('Faixa etária'),{target:{value:'teen'}});fireEvent.change(screen.getByLabelText('Seu instrumento'),{target:{value:'guitar'}});
 fireEvent.click(screen.getByRole('button',{name:'Criar minha conta'}));await waitFor(()=>expect(success).toHaveBeenCalledWith(state));expect(close).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Já tenho uma conta'}));fetch.mockResolvedValue(reply({error:'E-mail ou senha incorretos.'},false));fireEvent.click(screen.getByRole('button',{name:'Entrar',exact:true}));expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');expect(close).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Quero criar uma conta'}));expect(screen.queryByRole('alert')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Fechar'}));expect(close).toHaveBeenCalledTimes(2);
});
test('perfil salva mudanças, apresenta falhas e permite sair',async()=>{
 const success=vi.fn(),logout=vi.fn();render(<Profile user={user} onSuccess={success} logout={logout}/>);
 expect(screen.getByLabelText('E-mail')).toBeDisabled();fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Bia'}});fireEvent.change(screen.getByLabelText('Faixa etária'),{target:{value:'child'}});fireEvent.change(screen.getByLabelText('Instrumento favorito'),{target:{value:'drums'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();expect(fetch).toHaveBeenLastCalledWith('/api/profile',expect.objectContaining({body:JSON.stringify({name:'Bia',age:'child',instrument:'drums'})}));
 fetch.mockRejectedValueOnce(new Error('Sem conexão'));fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));expect(await screen.findByText('Sem conexão')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Sair da conta'}));expect(logout).toHaveBeenCalledOnce();
});
test.each([0,.4,.9])('treino auditivo gera desafios descendente/ascendente/igual (%s)',random=>{
 vi.spyOn(Math,'random').mockReturnValue(random);render(<EarTraining/>);expect(screen.getByRole('button',{name:'Subiu'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Ouvir as notas'}));fireEvent.click(screen.getByRole('button',{name:'Subiu'}));expect(screen.getByText(/1 acertos/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Subiu'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Novo desafio'}));expect(screen.getByRole('button',{name:'Desceu'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Ouvir as notas'}));const expected=random===0?[392,261.63]:random<.7?[293.66,440]:[329.63,329.63];expect(sequence).toHaveBeenLastCalledWith(expected);
 fireEvent.click(screen.getByRole('button',{name:random===0?'Subiu':random<.7?'Desceu':'Subiu'}));expect(screen.getByRole('status')).toHaveTextContent('A resposta é:');expect(screen.getByText(/1 acertos/)).toBeInTheDocument();
});
test('visitante navega pelos três instrumentos e cadastro sem perder o funcionamento dos controles',async()=>{
 fetch.mockResolvedValue(reply({user:null,progress:[]}));render(<App/>);await screen.findByRole('heading',{name:'Sua jornada musical começa aqui.'});
 fireEvent.click(screen.getByRole('button',{name:'Guitarra Escalas que viram solos'}));fireEvent.click(screen.getByRole('button',{name:'Ouvir o solo'}));expect(sequence).toHaveBeenLastCalledWith(expect.any(Array),'guitar');
 fireEvent.click(screen.getByRole('button',{name:'Bateria',exact:true}));for(const name of ['Bumbo','Caixa','Chimbal']){fireEvent.click(screen.getByRole('button',{name,exact:true}));expect(playDrum).toHaveBeenLastCalledWith(name)}
 fireEvent.click(screen.getByRole('button',{name:'Piano',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Ouvir as duas mãos'}));expect(sequence).toHaveBeenLastCalledWith([261.63,293.66,329.63,349.23],'piano',130.81);
 fireEvent.click(screen.getByRole('button',{name:'Minha trilha'}));fireEvent.click(screen.getByRole('button',{name:'Começar minha jornada'}));expect(screen.getByRole('dialog')).toBeInTheDocument();expect(stopPlayback).toHaveBeenCalled();
});
test('dashboard, conquistas, perfil e logout refletem dados da conta',async()=>{
 const progress=lessons.map(l=>({lesson_id:l.id,score:100,xp:50,completed_at:'2026-11-26T12:00:00Z'}));fetch.mockResolvedValue(reply({user,progress}));render(<App/>);await screen.findByRole('heading',{name:'No seu ritmo, Ana.'});
 fireEvent.click(screen.getByRole('button',{name:'Conquistas'}));expect(screen.getByRole('heading',{name:'300 XP'})).toBeInTheDocument();expect(screen.getAllByText('Conquistada')).toHaveLength(3);expect(screen.getByRole('heading',{name:'6 aulas'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Abrir perfil'}));expect(screen.getByLabelText('Nome')).toHaveValue('Ana');fetch.mockResolvedValueOnce(reply({ok:true}));fireEvent.click(screen.getByRole('button',{name:'Sair da conta'}));await screen.findByRole('heading',{name:'Sua jornada musical começa aqui.'});
});
test('carregamento e falhas de rede/áudio são informados',async()=>{
 fetch.mockRejectedValueOnce(new Error('Falha de rede'));render(<App/>);expect(screen.getByText('Preparando sua jornada…')).toBeInTheDocument();expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede');act(()=>window.dispatchEvent(new CustomEvent('compasso-audio-error',{detail:'Áudio indisponível'})));expect(screen.getByRole('alert')).toHaveTextContent('Áudio indisponível');
});
test('transição respeita movimento reduzido e alternativa sem API; request informa erro genérico',async()=>{
 const update=vi.fn();smooth(update);expect(update).toHaveBeenCalledOnce();document.startViewTransition=vi.fn(cb=>cb());smooth(update);expect(document.startViewTransition).toHaveBeenCalledOnce();
 matchMedia.mockReturnValue({matches:true});smooth(update);expect(update).toHaveBeenCalledTimes(3);expect(document.startViewTransition).toHaveBeenCalledOnce();fetch.mockResolvedValue(reply({},false));await expect(request('me')).rejects.toThrow('Tente novamente.');
});
test('cadastro mantém envio desabilitado enquanto aguarda o servidor',async()=>{let resolve;fetch.mockImplementation(()=>new Promise(r=>{resolve=r}));render(<Auth onSuccess={vi.fn()} close={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Como podemos chamar você?'),{target:{value:'Ana'}});fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:user.email}});fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'Teste123!'}});fireEvent.change(screen.getByLabelText('Faixa etária'),{target:{value:'adult'}});fireEvent.click(screen.getByRole('button',{name:'Criar minha conta'}));expect(screen.getByRole('button',{name:'Aguarde…'})).toBeDisabled();await act(async()=>resolve(reply()));expect(screen.getByRole('button',{name:'Criar minha conta'})).toBeEnabled()});
test('sem conquistas apresenta primeira aula e permite treino auditivo; logout com falha mantém perfil',async()=>{render(<App/>);await screen.findByRole('heading',{name:'No seu ritmo, Ana.'});fireEvent.click(screen.getByRole('button',{name:'Conquistas'}));expect(screen.getAllByText('Ainda por descobrir')).toHaveLength(3);fireEvent.click(screen.getByRole('button',{name:'Começar uma aula'}));expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Fechar aula'}));fireEvent.click(screen.getByRole('button',{name:'Treino auditivo'}));expect(screen.getByRole('heading',{name:'Dê ouvidos à música.'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Abrir perfil'}));fetch.mockRejectedValueOnce(new Error('Falha ao sair'));fireEvent.click(screen.getByRole('button',{name:'Sair da conta'}));expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao sair');expect(screen.getByLabelText('Nome')).toHaveValue('Ana')});
