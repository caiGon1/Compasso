// Instrument samples: FluidR3 GM, CC BY 3.0. See AUDIO-CREDITS.md.
let ctx,master,compressor,bankPromise;
const decoded=new Map(),voices=new Set();let generation=0;
function context(){
 if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.65;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.2;master.connect(compressor);compressor.connect(ctx.destination)}
 return ctx;
}
function report(error){console.error('Audio playback:',error);window.dispatchEvent(new CustomEvent('compasso-audio-error',{detail:'Não foi possível carregar o som. Tente novamente.'}))}
async function buffer(instrument,key){
 const id=`${instrument}:${key}`;if(decoded.has(id))return decoded.get(id);
 const pending=(async()=>{bankPromise??=import('./samples.json').then(m=>m.default).catch(e=>{bankPromise=null;throw e});const bank=await bankPromise;const data=bank[instrument]?.[key];if(!data)throw Error(`Missing sample ${id}`);const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return context().decodeAudioData(bytes.buffer)})();
 decoded.set(id,pending);try{return await pending}catch(e){decoded.delete(id);throw e}
}
const names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
export function sampleKey(frequency){const midi=Math.round(69+12*Math.log2(frequency/440));return names[(midi%12+12)%12]+(Math.floor(midi/12)-1)}
function voice(audioBuffer,time,duration,instrument){
 const ac=context(),source=ac.createBufferSource(),gain=ac.createGain();source.buffer=audioBuffer;
 const length=Math.min(audioBuffer.duration,duration+(instrument==='guitar'?.5:.35)),volume=instrument==='drums'?.85:.7;
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.004);
 gain.gain.setValueAtTime(volume,time+Math.max(.005,length-.12));gain.gain.linearRampToValueAtTime(0,time+length);
 source.connect(gain);gain.connect(master);const item={source,gain};voices.add(item);source.onended=()=>{voices.delete(item);source.disconnect();gain.disconnect()};source.start(time);source.stop(time+length+.02);
 if(voices.size>32){const oldest=voices.values().next().value;oldest.source.stop();voices.delete(oldest)}
}
export function stopPlayback(){generation++;if(!ctx)return;for(const {source,gain} of voices){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setTargetAtTime(0,ctx.currentTime,.012);source.stop(ctx.currentTime+.06)}}
export function playNote(frequency=440,duration=1.4,delay=0,instrument='piano'){
 const ac=context(),version=generation;const resume=ac.resume();
 return Promise.all([resume,buffer(instrument,sampleKey(frequency))]).then(([,b])=>{if(version===generation)voice(b,ac.currentTime+.015+delay,duration,instrument)}).catch(report);
}
export function playDrum(name){const key={Bumbo:'C2',Caixa:'D2',Chimbal:'Gb2'}[name];const ac=context(),version=generation;return Promise.all([ac.resume(),buffer('drums',key)]).then(([,b])=>{if(version===generation)voice(b,ac.currentTime+.008,b.duration,'drums')}).catch(report)}
// A short synthesized click is intentionally reserved for the metronome.
export function tone(frequency=800,duration=.06,delay=0){const ac=context();ac.resume().catch(report);const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+delay;o.frequency.value=frequency;g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect()}}
export const notes=[['Dó',261.63,'a'],['Ré',293.66,'s'],['Mi',329.63,'d'],['Fá',349.23,'f'],['Sol',392,'g'],['Lá',440,'h'],['Si',493.88,'j'],['Dó',523.25,'k']];
export function sequence(freqs,instrument='piano',bass=null){
 stopPlayback();const ac=context(),version=generation;
 const requests=freqs.map(f=>buffer(instrument,sampleKey(f)));if(bass)requests.push(buffer('piano',sampleKey(bass)));
 return Promise.all([ac.resume(),...requests]).then(([, ...buffers])=>{if(version!==generation)return;const start=ac.currentTime+.025;freqs.forEach((f,i)=>voice(buffers[i],start+i*.45,.65,instrument));if(bass)voice(buffers.at(-1),start,2,'piano')}).catch(report);
}
