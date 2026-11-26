import { test, expect, vi, beforeEach, afterEach } from 'vitest';
let audio, ac;
function parameter(){return{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),setTargetAtTime:vi.fn()}}
function node(){return{connect:vi.fn(),disconnect:vi.fn(),gain:parameter(),frequency:parameter(),start:vi.fn(),stop:vi.fn()}}
beforeEach(async()=>{
 vi.resetModules();
 ac={currentTime:10,destination:{},sources:[],oscillators:[],gains:[],resume:vi.fn().mockResolvedValue(),decodeAudioData:vi.fn(async()=>({duration:3})),createGain(){const g=node();this.gains.push(g);return g},createDynamicsCompressor(){return{...node(),threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter()}},createBufferSource(){const s=node();this.sources.push(s);return s},createOscillator(){const s=node();this.oscillators.push(s);return s}};
 const target=new EventTarget();target.AudioContext=class{constructor(){return ac}};vi.stubGlobal('window',target);audio=await import('../src/audio.js');
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
test('mapeia notas, oitavas e sustenidos por frequência',()=>{for(const[f,key]of[[130.81,'C3'],[261.63,'C4'],[277.18,'Db4'],[440,'A4'],[523.25,'C5']])expect(audio.sampleKey(f)).toBe(key)});
test('piano decodifica MP3 uma vez, reutiliza cache e libera nós encerrados',async()=>{
 await audio.playNote(261.63);await audio.playNote(261.63);expect(ac.decodeAudioData).toHaveBeenCalledOnce();expect(ac.sources).toHaveLength(2);expect(ac.decodeAudioData.mock.calls[0][0].byteLength).toBeGreaterThan(1000);
 expect(ac.sources[0].start).toHaveBeenCalledWith(10.015);expect(ac.sources[0].stop.mock.calls[0][0]).toBeGreaterThan(11);ac.sources[0].onended();expect(ac.sources[0].disconnect).toHaveBeenCalledOnce();
});
test('guitarra usa amostra diferente e três pads usam três sons de bateria',async()=>{
 await audio.playNote(440,1,0,'guitar');for(const name of ['Bumbo','Caixa','Chimbal'])await audio.playDrum(name);expect(ac.sources).toHaveLength(4);expect(ac.decodeAudioData).toHaveBeenCalledTimes(4);expect(new Set(ac.decodeAudioData.mock.calls.map(([b])=>Buffer.from(b).toString('base64'))).size).toBe(4);
});
test('sequência agenda todas as notas a intervalos iguais com baixo simultâneo',async()=>{
 await audio.sequence([261.63,293.66,329.63],'piano',130.81);expect(ac.sources).toHaveLength(4);expect(ac.sources.map(s=>s.start.mock.calls[0][0])).toEqual([10.025,10.475,10.925,10.025]);
 audio.stopPlayback();for(const s of ac.sources)expect(s.stop).toHaveBeenLastCalledWith(10.06);
});
test('troca de tela cancela reprodução que ainda aguarda decodificação',async()=>{
 let decode;ac.decodeAudioData.mockImplementation(()=>new Promise(resolve=>{decode=resolve}));const pending=audio.playNote(261.63);
 await vi.waitFor(()=>expect(decode).toBeTypeOf('function'));audio.stopPlayback();decode({duration:2});await pending;expect(ac.sources).toHaveLength(0);
});
test('sequência substituída antes de carregar não começa a tocar',async()=>{
 let decode;ac.decodeAudioData.mockImplementation(()=>new Promise(resolve=>{decode=resolve}));const pending=audio.sequence([261.63]);await vi.waitFor(()=>expect(decode).toBeTypeOf('function'));audio.stopPlayback();decode({duration:2});await pending;expect(ac.sources).toHaveLength(0);
});
test('limite de vozes encerra a mais antiga em uso intenso',async()=>{for(let i=0;i<33;i++)await audio.playNote(261.63);expect(ac.sources[0].stop).toHaveBeenLastCalledWith();expect(ac.sources.at(-1).start).toHaveBeenCalledOnce()});
test('clique do metrônomo agenda oscilador e desconecta ao terminar',()=>{audio.stopPlayback();audio.tone(1000,.06,.2);expect(ac.oscillators[0].frequency.value).toBe(1000);expect(ac.oscillators[0].start).toHaveBeenCalledWith(10.2);ac.oscillators[0].onended();expect(ac.oscillators[0].disconnect).toHaveBeenCalledOnce()});
test('falha ao decodificar dispara erro acessível e permite tentar novamente',async()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});const listener=vi.fn();window.addEventListener('compasso-audio-error',listener);ac.decodeAudioData.mockRejectedValueOnce(new Error('decode failed'));await audio.playNote(261.63);expect(listener).toHaveBeenCalledOnce();expect(listener.mock.calls[0][0].detail).toContain('Não foi possível');expect(ac.sources).toHaveLength(0);
 await audio.playNote(261.63);expect(ac.decodeAudioData).toHaveBeenCalledTimes(2);expect(ac.sources).toHaveLength(1);
});
