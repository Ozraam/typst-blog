/** URL slug shared by the server (stored slugs) and the editor (placeholder preview). */
export function slugify(text: string): string {
	return (
		text
			.toString()
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.substring(0, 80)
			.replace(/-+$/g, '') || 'article'
	);
}
