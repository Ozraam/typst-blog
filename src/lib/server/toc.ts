import { slugify } from './posts';

export interface TocItem {
	level: number;
	text: string;
	id: string;
}

export function extractTocFromTypst(content: string): TocItem[] {
	if (!content) return [];

	const lines = content.split('\n');
	const items: TocItem[] = [];
	const seenIds = new Map<string, number>();

	for (const rawLine of lines) {
		const line = rawLine.trim();
		// Typst headings: = Title, == Subtitle, === Subsubtitle
		const match = line.match(/^(=+)\s+(.+)$/);
		if (match) {
			const level = match[1].length;
			let text = match[2].trim();

			// Strip basic Typst formatting markers for clean display
			text = text
				.replace(/\*([^*]+)\*/g, '$1') // *bold*
				.replace(/_([^_]+)_/g, '$1')   // _italic_
				.replace(/`([^`]+)`/g, '$1')   // `code`
				.replace(/<[^>]+>/g, '')       // labels like <intro>
				.trim();

			let anchor = slugify(text);
			const count = seenIds.get(anchor) || 0;
			seenIds.set(anchor, count + 1);
			if (count > 0) {
				anchor = `${anchor}-${count + 1}`;
			}

			items.push({
				level,
				text,
				id: anchor
			});
		}
	}

	return items;
}
