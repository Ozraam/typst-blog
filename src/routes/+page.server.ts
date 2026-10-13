import type { PageServerLoad } from './$types';
import { listPublishedPosts, getAllTags } from '$lib/server/posts';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('p') || '1', 10));
	const tag = url.searchParams.get('tag') || undefined;
	const search = url.searchParams.get('q') || undefined;
	const limit = 10;
	const offset = (page - 1) * limit;

	const { posts, total } = listPublishedPosts({
		limit,
		offset,
		tag,
		search
	});

	const tags = getAllTags();
	const totalPages = Math.max(1, Math.ceil(total / limit));

	return {
		posts,
		total,
		page,
		totalPages,
		tags,
		activeTag: tag,
		searchQuery: search || ''
	};
};
