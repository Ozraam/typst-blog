import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { listAdminPosts } from '$lib/server/posts';

export const load: PageServerLoad = async () => {
	const { posts: recentPosts, counts } = listAdminPosts({ limit: 5 });

	const mediaCountRow = db.prepare('SELECT COUNT(*) as count FROM media').get() as { count: number };
	const usersCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

	return {
		recentPosts,
		counts,
		mediaCount: mediaCountRow.count,
		usersCount: usersCountRow.count
	};
};
