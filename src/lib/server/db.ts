import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// `.env` values (exposed by SvelteKit in dev) are defaults: real environment variables win.
let env: Record<string, string | undefined> = process.env;
try {
	const kitEnv = await import('$env/dynamic/private');
	if (kitEnv?.env) env = { ...kitEnv.env, ...process.env };
} catch {
	env = process.env;
}

const DATA_DIR = path.resolve(env.DATA_DIR || './data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const FONTS_DIR = path.join(DATA_DIR, 'fonts');

for (const dir of [DATA_DIR, UPLOADS_DIR, FONTS_DIR]) {
	fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'blog.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Base schema (version 0). Never edit it: add a migration below instead.
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

/**
 * Ordered migrations, tracked with `PRAGMA user_version`.
 * Migration N brings the schema from version N to N + 1. Append only.
 */
const migrations: Array<(db: Database.Database) => void> = [
	// 0 → 1: server-side Typst rendering metadata + indexes
	(db) => {
		db.exec(`
			ALTER TABLE posts ADD COLUMN toc_json TEXT;
			ALTER TABLE posts ADD COLUMN plain_text TEXT;
			ALTER TABLE posts ADD COLUMN word_count INTEGER;
			ALTER TABLE posts ADD COLUMN render_version INTEGER NOT NULL DEFAULT 0;
			-- SVGs were produced (and trusted) client-side until now: re-render everything on the server.
			UPDATE posts SET rendered_svg = NULL;
			CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC);
			CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
			CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
			CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
			CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);
		`);
	}
];

function migrate() {
	const current = db.pragma('user_version', { simple: true }) as number;
	for (let version = current; version < migrations.length; version++) {
		db.transaction(() => {
			migrations[version](db);
			db.pragma(`user_version = ${version + 1}`);
		})();
	}
}

migrate();

// Default settings, only applied when the key does not exist yet (the database is the source of truth afterwards)
const defaultSettings: Record<string, string> = {
	site_title: env.SITE_TITLE || 'Typst Blog',
	site_description: env.SITE_DESCRIPTION || 'Moteur de blog moderne propulsé par Typst et SvelteKit',
	allow_registration: env.ALLOW_REGISTRATION || 'false'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
	insertSetting.run(key, value);
}

export interface SiteSettings {
	siteTitle: string;
	siteDescription: string;
	allowRegistration: boolean;
}

export function getSettings(): SiteSettings {
	const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
	const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	return {
		siteTitle: map.site_title || defaultSettings.site_title,
		siteDescription: map.site_description ?? defaultSettings.site_description,
		allowRegistration: map.allow_registration === 'true'
	};
}

export function saveSettings(settings: SiteSettings): void {
	const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
	db.transaction(() => {
		stmt.run('site_title', settings.siteTitle);
		stmt.run('site_description', settings.siteDescription);
		stmt.run('allow_registration', settings.allowRegistration ? 'true' : 'false');
	})();
}

export { db, DATA_DIR, UPLOADS_DIR, FONTS_DIR };
