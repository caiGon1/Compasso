import { spawnSync } from 'node:child_process';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL de um banco de testes em .env.test.local.');
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/postgres.test.mjs'],{stdio:'inherit',env:{...process.env,RUN_POSTGRES_TESTS:'1'}});
process.exit(result.status ?? 1);
