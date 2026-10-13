import crypto from 'node:crypto';
import { db } from './db';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString('hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, key] = stored.split(':');
	if (!salt || !key) return false;
	const keyBuffer = Buffer.from(key, 'hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export interface UserRow {
	id: string;
	username: string;
	email: string;
	password_hash: string;
	role: 'admin' | 'author' | 'reader';
	created_at: number;
	updated_at: number;
}

export function hasAnyUser(): boolean {
	const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
	return row.count > 0;
}

export function createUser(data: {
	username: string;
	email: string;
	password: string;
	role?: 'admin' | 'author' | 'reader';
}): { id: string; username: string; email: string; role: 'admin' | 'author' | 'reader' } {
	const id = crypto.randomUUID();
	const now = Date.now();
	const password_hash = hashPassword(data.password);
	const role = data.role || 'author';

	db.prepare(
		`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(id, data.username.trim(), data.email.trim().toLowerCase(), password_hash, role, now, now);

	return { id, username: data.username.trim(), email: data.email.trim().toLowerCase(), role };
}

export function getUserByUsernameOrEmail(identifier: string): UserRow | null {
	const trimmed = identifier.trim().toLowerCase();
	const user = db
		.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
		.get(trimmed, trimmed) as UserRow | undefined;
	return user || null;
}

export function getUserById(id: string): UserRow | null {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
	return user || null;
}

export function createSession(userId: string): { sessionId: string; expiresAt: number } {
	const sessionId = crypto.randomBytes(32).toString('hex');
	const expiresAt = Date.now() + SESSION_TTL_MS;

	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
		sessionId,
		userId,
		expiresAt
	);

	return { sessionId, expiresAt };
}

export function validateSession(sessionId: string): {
	user: { id: string; username: string; email: string; role: 'admin' | 'author' | 'reader' } | null;
	session: { id: string; userId: string; expiresAt: number } | null;
} {
	const row = db
		.prepare(
			`SELECT s.id as session_id, s.user_id, s.expires_at,
			        u.id as user_id, u.username, u.email, u.role
			 FROM sessions s
			 JOIN users u ON s.user_id = u.id
			 WHERE s.id = ?`
		)
		.get(sessionId) as
		| {
				session_id: string;
				user_id: string;
				expires_at: number;
				username: string;
				email: string;
				role: 'admin' | 'author' | 'reader';
		  }
		| undefined;

	if (!row) {
		return { user: null, session: null };
	}

	const now = Date.now();
	if (now > row.expires_at) {
		destroySession(sessionId);
		return { user: null, session: null };
	}

	// Extend session if past half its lifetime
	if (now + SESSION_TTL_MS / 2 > row.expires_at) {
		const newExpires = now + SESSION_TTL_MS;
		db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(newExpires, sessionId);
		row.expires_at = newExpires;
	}

	return {
		user: {
			id: row.user_id,
			username: row.username,
			email: row.email,
			role: row.role
		},
		session: {
			id: row.session_id,
			userId: row.user_id,
			expiresAt: row.expires_at
		}
	};
}

export function destroySession(sessionId: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function destroyAllUserSessions(userId: string): void {
	db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
