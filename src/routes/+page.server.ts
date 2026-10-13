import type { PageServerLoad } from './$types';
import { listPublishedPosts, getPublicTags } from '$lib/server/posts';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('p') ?? '1', 10) || 1);
	const tag = url.searchParams.get('tag')?.trim() || undefined;
	const search = url.searchParams.get('q')?.trim().slice(0, 100) || undefined;

	const { posts, total } = listPublishedPosts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, tag, search });
	const tags = getPublicTags();

	return {
		posts,
		total,
		page,
		totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		tags,
		activeTag: tag ? (tags.find((t) => t.slug === tag || t.name === tag)?.slug ?? tag) : null,
		searchQuery: search ?? ''
	};
};
