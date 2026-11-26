import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { api } from '../../server/api.js';
export const account={name:'Ana',email:'ana@example.com',password:'TesteSeguro123!',age:'adult',instrument:'piano'};
export function client() {
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(fs.readFileSync(new NodeURL('../../drizzle/0000_initial.sql',import.meta.url),'utf8'));
 const db={prepare(sql){return{bind(...values){return{
  async first(){return sqlite.prepare(sql).get(...values)},
  async all(){return{results:sqlite.prepare(sql).all(...values)}},
  async run(){return sqlite.prepare(sql).run(...values)},
 }}}}};
 let cookie='';
 return {sqlite,db,close:()=>sqlite.close(),setCookie:v=>{cookie=v},async call(path,body,options={}){
  const response=await api(new Request((options.origin||'https://compasso.test')+'/api/'+path,{
   method:options.method||(body===undefined?'GET':'POST'),
   headers:{cookie,...(body===undefined?{}:{'Content-Type':'application/json'}),...options.headers},
   ...(body===undefined?{}:{body:options.raw??JSON.stringify(body)}),
  }),db);
  const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  return{status:response.status,data:await response.json(),headers:response.headers};
 },async register(overrides={}){return this.call('register',{...account,...overrides})}};
}
