/**
 * Post-processing of the SVG produced by typst.ts, shared by the server (stored render)
 * and the browser (live preview) so both look identical.
 *
 * The renderer output is well-formed XML whose attribute values are quote-escaped, so the
 * transformations below can safely work on tags with regular expressions. The only values an
 * author controls are text (escaped) and link targets, which are filtered here.
 */

const ENTITY_MAP: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

export function decodeEntities(value: string): string {
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code[0] === '#') {
			const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
			return Number.isFinite(n) ? String.fromCodePoint(n) : match;
		}
		return ENTITY_MAP[code.toLowerCase()] ?? match;
	});
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Whether a (decoded) URL can be exposed as a clickable link. */
export function isSafeLinkTarget(url: string): boolean {
	const trimmed = url.trim();
	if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
		return !trimmed.startsWith('//');
	}
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed.replace(/[\u0000- ]/g, ''));
	if (!scheme) return true; // relative path
	return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase());
}

function parseAttributes(tag: string): Map<string, string> {
	const attrs = new Map<string, string>();
	for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
		attrs.set(m[1], m[2]);
	}
	return attrs;
}

export interface ProcessedSvg {
	svg: string;
	/** Vertical offset (in pt) of each page in the stacked document. */
	pageOffsets: number[];
	/** Plain text extracted from the text-selection layer. */
	plainText: string;
}

export function processTypstSvg(raw: string): ProcessedSvg {
	let svg = raw;

	// Scripts are dead code once inlined (and a liability); the embedded stylesheet leaks global
	// selectors (`svg { fill: none }`), it is replaced by the scoped `.typst-doc` rules in app.css.
	svg = svg.replace(/<script\b[\s\S]*?<\/script>/gi, '');
	svg = svg.replace(/<style\b[\s\S]*?<\/style>/gi, '');

	const pageOffsets: number[] = [];
	for (const m of svg.matchAll(/<g class="typst-page" transform="translate\(\s*[-\d.]+\s*,\s*([-\d.]+)\s*\)"/g)) {
		pageOffsets.push(parseFloat(m[1]));
	}
	if (pageOffsets.length === 0) pageOffsets.push(0);

	// Links: internal jumps become `data-jump` (document y offset, handled by the page), external
	// links are filtered by scheme and open in a new tab.
	svg = svg.replace(/<a\b[^>]*>/g, (tag) => {
		const attrs = parseAttributes(tag);
		const onclick = attrs.get('onclick') ?? '';
		const jump = /handleTypstLocation\(\s*this\s*,\s*(\d+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(onclick);
		if (jump) {
			const page = parseInt(jump[1], 10);
			const y = (pageOffsets[page - 1] ?? 0) + parseFloat(jump[3]);
			return `<a href="#" class="typst-jump" data-jump="${y.toFixed(2)}">`;
		}

		const href = decodeEntities(attrs.get('xlink:href') ?? attrs.get('href') ?? '');
		if (!href || !isSafeLinkTarget(href)) return '<a>';
		const external = /^[a-z][a-z0-9+.-]*:/i.test(href);
		return external
			? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`
			: `<a href="${escapeAttr(href)}">`;
	});

	// Defense in depth: no event handler attributes, no script URLs anywhere else.
	svg = svg.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
	svg = svg.replace(/(\s(?:xlink:)?href)="([^"]*)"/g, (match, name: string, value: string) => {
		const decoded = decodeEntities(value);
		if (decoded.startsWith('#') || /^data:image\//i.test(decoded) || isSafeLinkTarget(decoded)) return match;
		return `${name}="#"`;
	});

	// The text-selection layer uses `h5:` (XHTML) prefixed elements, which the HTML parser does not
	// understand. Inside <foreignObject> a plain <div> is parsed as real HTML: text becomes selectable.
	svg = svg.replace(/<h5:div\b/g, '<div').replace(/<\/h5:div>/g, '</div>');

	const runs: string[] = [];
	for (const m of svg.matchAll(/<div class="tsel"[^>]*>([^<]*)<\/div>/g)) {
		runs.push(decodeEntities(m[1]));
	}

	return { svg, pageOffsets, plainText: joinTextRuns(runs) };
}

/** Joins text runs: runs on separate lines have no space between them, hyphenated words are merged. */
export function joinTextRuns(runs: string[]): string {
	const SEP = '\u0000';
	return runs
		.join(SEP)
		.replace(/(\p{L})[-­]\u0000(\p{Ll})/gu, '$1$2')
		.replace(/(\S)\u0000(?=\S)/g, '$1 ')
		.replaceAll(SEP, '')
		.replace(/[\s ]+/g, ' ')
		.trim();
}
