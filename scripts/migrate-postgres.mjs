import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured before migration.');
const sql = neon(process.env.DATABASE_URL);
const statements = fs.readFileSync(new URL('../migrations/postgres/0001_initial.sql', import.meta.url), 'utf8').split(';').map(s => s.trim()).filter(Boolean);
await sql.transaction(statements.map(statement => sql.query(statement, [])));
console.log('Compasso Postgres schema ready.');
