import {test} from 'vitest';import assert from 'node:assert/strict';import fs from 'node:fs';import {sampleKey} from '../src/audio.js';
test('Todas as notas do teclado, acordes, treino e solo têm amostras MP3 próprias',()=>{
 const banks=JSON.parse(fs.readFileSync(new URL('../src/samples.json',import.meta.url),'utf8'));
 const piano=[130.81,261.63,277.18,293.66,311.13,329.63,349.23,369.99,392,415.30,440,466.16,493.88,523.25];
 for(const f of piano)assert.ok(banks.piano[sampleKey(f)],`Piano ${f}`);
 for(const f of [440,523.25,392,329.63])assert.ok(banks.guitar[sampleKey(f)],`Guitarra ${f}`);
 for(const n of ['C2','D2','Gb2'])assert.ok(banks.drums[n]);
 const samples=Object.values(banks).flatMap(b=>Object.values(b));assert.equal(new Set(samples).size,samples.length,'Cada timbre deve conter áudio distinto');
 for(const s of samples){assert.match(s,/^data:audio\/mp3;base64,/);assert.ok(Buffer.from(s.split(',')[1],'base64').length>1000)}
});
