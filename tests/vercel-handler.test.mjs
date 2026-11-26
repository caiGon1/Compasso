import{test,expect,vi,afterEach}from'vitest';
const mocks=vi.hoisted(()=>({api:vi.fn(),getPostgresDatabase:vi.fn()}));
vi.mock('../server/api.js',()=>({api:mocks.api}));vi.mock('../server/postgres.js',()=>({getPostgresDatabase:mocks.getPostgresDatabase}));
import handler from'../server/vercel-handler.js';
afterEach(()=>vi.clearAllMocks());
test('handler Vercel encaminha Request para a API e devolve Response',async()=>{const db={},request=new Request('https://compasso.test/api/me'),response=Response.json({user:null,progress:[]});mocks.getPostgresDatabase.mockReturnValue(db);mocks.api.mockResolvedValue(response);expect(await handler.fetch(request)).toBe(response);expect(mocks.api).toHaveBeenCalledWith(request,db)});
test('indisponibilidade do banco devolve 503 sem cache nem segredos',async()=>{vi.spyOn(console,'error').mockImplementation(()=>{});mocks.getPostgresDatabase.mockImplementation(()=>{throw Error('password-secret')});const r=await handler.fetch(new Request('https://compasso.test/api/me'));expect(r.status).toBe(503);expect(r.headers.get('cache-control')).toBe('no-store');expect(await r.text()).not.toContain('password-secret')});
test.each(['me','register','login','logout','profile','complete'])('endpoint /api/%s exporta o handler compartilhado',async name=>{expect((await import(`../api/${name}.js`)).default).toBe(handler)});
