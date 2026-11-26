import { neon } from '@neondatabase/serverless';

// Only application-owned SQL reaches this adapter; user values stay parameterized.
export function postgresSQL(statement) {
  let index = 0;
  return statement.replace(/\?/g, () => `$${++index}`)
    .replaceAll('MAX(score,excluded.score)', 'GREATEST(progress.score,excluded.score)')
    .replaceAll('MAX(xp,excluded.xp)', 'GREATEST(progress.xp,excluded.xp)');
}

export function postgresDatabase(query) {
  return {
    prepare(statement) {
      return {
        bind(...values) {
          const execute = () => query(postgresSQL(statement), values);
          return {
            async first() { return (await execute())[0] ?? null; },
            async all() { return { results: await execute() }; },
            async run() { await execute(); return { success: true }; },
          };
        },
      };
    },
  };
}

let database;
export function getPostgresDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!database) {
    const sql = neon(process.env.DATABASE_URL);
    database = postgresDatabase((statement, values) => sql.query(statement, values));
  }
  return database;
}
