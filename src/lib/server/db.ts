import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
let env: Record<string, string | undefined> = process.env;
try {
	const kitEnv = await import('$env/dynamic/private');
	if (kitEnv?.env) env = kitEnv.env;
} catch {
	env = process.env;
}

const DATA_DIR = env.DATA_DIR || './data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
	fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'blog.db');
const db = new Database(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL CHECK(role IN ('admin', 'author', 'reader')),
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		expires_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS posts (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		slug TEXT UNIQUE NOT NULL,
		excerpt TEXT,
		content TEXT NOT NULL,
		rendered_svg TEXT,
		status TEXT NOT NULL CHECK(status IN ('draft', 'published', 'archived', 'trash')),
		published_at INTEGER,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		author_id TEXT NOT NULL REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS tags (
		id TEXT PRIMARY KEY,
		name TEXT UNIQUE NOT NULL,
		slug TEXT UNIQUE NOT NULL
	);

	CREATE TABLE IF NOT EXISTS post_tags (
		post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
		tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
		PRIMARY KEY (post_id, tag_id)
	);

	CREATE TABLE IF NOT EXISTS media (
		id TEXT PRIMARY KEY,
		filename TEXT NOT NULL,
		original_name TEXT NOT NULL,
		mime_type TEXT NOT NULL,
		size INTEGER NOT NULL,
		url TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		uploader_id TEXT NOT NULL REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
`);

// Seed default settings if not existing
const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

const defaultSettings: Record<string, string> = {
	site_title: env.SITE_TITLE || 'Typst Blog',
	site_description: env.SITE_DESCRIPTION || 'Moteur de blog moderne propulsé par Typst et SvelteKit',
	allow_registration: env.ALLOW_REGISTRATION || 'false'
};

for (const [key, value] of Object.entries(defaultSettings)) {
	setSettingStmt.run(key, value);
}

export { db, DATA_DIR, UPLOADS_DIR };
