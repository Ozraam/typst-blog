import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';

export type Role = 'admin' | 'author' | 'reader';

export const SESSION_COOKIE = 'session_id';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface UserRow {
	id: string;
	username: string;
	email: string;
	password_hash: string;
	role: Role;
	created_at: number;
	updated_at: number;
}

export type PublicUser = Omit<UserRow, 'password_hash'>;

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
	return keyBuffer.length === derivedKey.length && crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Used to spend the same time verifying a password when the account does not exist
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

export function authenticate(identifier: string, password: string): UserRow | null {
	const user = getUserByUsernameOrEmail(identifier);
	const valid = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
	return user && valid ? user : null;
}

let usersExist = false;
export function hasAnyUser(): boolean {
	if (usersExist) return true;
	const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
	usersExist = row.count > 0;
	return usersExist;
}

export function validateCredentials(data: { username: string; email: string; password?: string }): string | null {
	const username = data.username.trim();
	if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username)) {
		return 'Le nom d’utilisateur doit contenir de 3 à 32 caractères (lettres, chiffres, « . », « - » ou « _ »).';
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
		return 'L’adresse email n’est pas valide.';
	}
	if (data.password !== undefined && data.password.length < 8) {
		return 'Le mot de passe doit comporter au moins 8 caractères.';
	}
	return null;
}

export function isUsernameOrEmailTaken(username: string, email: string, excludeUserId = ''): boolean {
	const row = db
		.prepare('SELECT 1 FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ?')
		.get(username.trim().toLowerCase(), email.trim().toLowerCase(), excludeUserId);
	return !!row;
}

export function createUser(data: { username: string; email: string; password: string; role?: Role }): PublicUser {
	const now = Date.now();
	const user: PublicUser = {
		id: crypto.randomUUID(),
		username: data.username.trim(),
		email: data.email.trim().toLowerCase(),
		role: data.role ?? 'author',
		created_at: now,
		updated_at: now
	};

	db.prepare(
		`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(user.id, user.username, user.email, hashPassword(data.password), user.role, now, now);

	usersExist = true;
	return user;
}

export function getUserByUsernameOrEmail(identifier: string): UserRow | null {
	const trimmed = identifier.trim().toLowerCase();
	const user = db
		.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
		.get(trimmed, trimmed) as UserRow | undefined;
	return user ?? null;
}

export function getUserById(id: string): UserRow | null {
	return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined) ?? null;
}

export function listUsers(): Array<PublicUser & { post_count: number }> {
	return db
		.prepare(
			`SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
				(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.status != 'trash') AS post_count
			 FROM users u ORDER BY u.created_at ASC`
		)
		.all() as Array<PublicUser & { post_count: number }>;
}

export function countAdmins(): number {
	return (db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }).count;
}

export function updateUserProfile(id: string, data: { username: string; email: string; password?: string }): void {
	const now = Date.now();
	if (data.password) {
		db.prepare('UPDATE users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?').run(
			data.username.trim(),
			data.email.trim().toLowerCase(),
			hashPassword(data.password),
			now,
			id
		);
	} else {
		db.prepare('UPDATE users SET username = ?, email = ?, updated_at = ? WHERE id = ?').run(
			data.username.trim(),
			data.email.trim().toLowerCase(),
			now,
			id
		);
	}
}

export function setUserRole(id: string, role: Role): void {
	db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, Date.now(), id);
}

/** Deletes a user; their articles and media are transferred to `heirId`. */
export function deleteUser(id: string, heirId: string): void {
	db.transaction(() => {
		db.prepare('UPDATE posts SET author_id = ? WHERE author_id = ?').run(heirId, id);
		db.prepare('UPDATE media SET uploader_id = ? WHERE uploader_id = ?').run(heirId, id);
		db.prepare('DELETE FROM users WHERE id = ?').run(id);
	})();
}

export function createSession(userId: string): { sessionId: string; expiresAt: number } {
	const sessionId = crypto.randomBytes(32).toString('hex');
	const expiresAt = Date.now() + SESSION_TTL_MS;
	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt);
	return { sessionId, expiresAt };
}

export function setSessionCookie(cookies: Cookies, session: { sessionId: string; expiresAt: number }, secure: boolean) {
	cookies.set(SESSION_COOKIE, session.sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: new Date(session.expiresAt)
	});
}

export function validateSession(sessionId: string): {
	user: { id: string; username: string; email: string; role: Role } | null;
	session: { id: string; userId: string; expiresAt: number } | null;
} {
	const row = db
		.prepare(
			`SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.username, u.email, u.role
			 FROM sessions s JOIN users u ON s.user_id = u.id
			 WHERE s.id = ?`
		)
		.get(sessionId) as
		| { session_id: string; user_id: string; expires_at: number; username: string; email: string; role: Role }
		| undefined;

	if (!row) return { user: null, session: null };

	const now = Date.now();
	if (now > row.expires_at) {
		destroySession(sessionId);
		return { user: null, session: null };
	}

	// Sliding expiration: extend once past half of the lifetime
	if (now + SESSION_TTL_MS / 2 > row.expires_at) {
		row.expires_at = now + SESSION_TTL_MS;
		db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(row.expires_at, sessionId);
	}

	return {
		user: { id: row.user_id, username: row.username, email: row.email, role: row.role },
		session: { id: row.session_id, userId: row.user_id, expiresAt: row.expires_at }
	};
}

export function destroySession(sessionId: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function destroyAllUserSessions(userId: string, exceptSessionId = ''): void {
	db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, exceptSessionId);
}

export function purgeExpiredSessions(): void {
	db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

/** Only allows same-site relative redirects (prevents open redirects through `?redirect=`). */
export function safeRedirect(target: string | null | undefined, fallback = '/admin'): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
	return target;
}

// Brute-force protection: failed logins per (client, identifier), kept in memory.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;
const loginFailures = new Map<string, { count: number; first: number }>();

export function isLoginThrottled(key: string): boolean {
	const entry = loginFailures.get(key);
	if (!entry) return false;
	if (Date.now() - entry.first > LOGIN_WINDOW_MS) {
		loginFailures.delete(key);
		return false;
	}
	return entry.count >= LOGIN_MAX_FAILURES;
}

export function recordLoginFailure(key: string): void {
	const entry = loginFailures.get(key);
	if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) {
		loginFailures.set(key, { count: 1, first: Date.now() });
	} else {
		entry.count++;
	}
	if (loginFailures.size > 5000) loginFailures.clear();
}

export function clearLoginFailures(key: string): void {
	loginFailures.delete(key);
}
