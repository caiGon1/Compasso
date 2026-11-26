CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  salt TEXT NOT NULL,
  age TEXT NOT NULL,
  instrument TEXT NOT NULL DEFAULT 'piano',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires);
