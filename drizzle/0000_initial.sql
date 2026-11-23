CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, salt TEXT NOT NULL, age TEXT NOT NULL, instrument TEXT NOT NULL DEFAULT 'piano', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE progress (user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL, score INTEGER NOT NULL, xp INTEGER NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(user_id,lesson_id));
