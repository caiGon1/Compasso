import { test } from 'vitest';
import assert from 'node:assert/strict';
import { api } from '../server/api.js';
import { getPostgresDatabase } from '../server/postgres.js';

test.skipIf(process.env.RUN_POSTGRES_TESTS !== '1' || !process.env.DATABASE_URL)('Postgres: cadastro, login, XP sem duplicação e progresso persistente', async () => {
  const db = getPostgresDatabase(), email = `qa-${crypto.randomUUID()}@compasso.invalid`, password = crypto.randomUUID();
  let cookie = '';
  async function call(path, body) {
    const response = await api(new Request(`https://compasso.test/api/${path}`, {
      method: body ? 'POST' : 'GET', headers: { cookie, origin: 'https://compasso.test' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), db);
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  try {
    const registered = await call('register', { name: 'Teste de implantação', email, password, age: 'adult', instrument: 'piano' });
    assert.equal(registered.status, 200);assert.match(registered.cookie, /HttpOnly/);assert.match(registered.cookie, /Secure/);
    cookie = registered.cookie.split(';')[0];
    assert.equal((await call('complete', { id: 'triads', answers: [1, 1, 0] })).status, 403);
    const done = await call('complete', { id: 'notes', answers: [1, 1, 0] });assert.equal(done.status, 200);assert.equal(done.data.progress[0].xp, 50);
    await call('complete', { id: 'notes', answers: [1, 1, 0] });
    assert.equal((await call('me')).data.progress.length, 1);
    await call('logout', {});assert.equal((await call('me')).data.user, null);
    const login = await call('login', { email, password });assert.equal(login.status, 200);cookie = login.cookie.split(';')[0];
    const restored = (await call('me')).data;assert.equal(restored.progress[0].xp, 50);assert.equal(restored.progress[0].score, 100);
  } finally {
    const user = await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
    if (user) {
      await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run();
      await db.prepare('DELETE FROM progress WHERE user_id=?').bind(user.id).run();
      await db.prepare('DELETE FROM users WHERE id=?').bind(user.id).run();
    }
  }
});
