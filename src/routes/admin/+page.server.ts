import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { listAdminPosts } from '$lib/server/posts';
import { requireEditor } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireEditor(locals);
	const { posts: recentPosts, counts } = listAdminPosts({ user, limit: 6 });

	const count = (sql: string, ...params: string[]) => (db.prepare(sql).get(...params) as { count: number }).count;
	const isAdmin = user.role === 'admin';

	return {
		recentPosts,
		counts,
		mediaCount: isAdmin
			? count('SELECT COUNT(*) AS count FROM media')
			: count('SELECT COUNT(*) AS count FROM media WHERE uploader_id = ?', user.id),
		usersCount: count('SELECT COUNT(*) AS count FROM users'),
		welcome: url.searchParams.has('welcome')
	};
};
