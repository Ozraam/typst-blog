/**
 * Isomorphic Typst rendering pipeline, used by the server (published renders) and by the browser
 * (editor preview, PDF export). Both sides wrap the source the same way so that what the author
 * previews is exactly what readers get.
 */
import type { $typst as TypstSnippetInstance } from '@myriaddreamin/typst.ts';
import { processTypstSvg } from './svg';

type TypstSnippet = typeof TypstSnippetInstance;

/**
 * Web-friendly defaults, prepended to every article rendered for the web. Authors can override
 * any of them with their own `#set` rules (later rules win).
 */
const WEB_PRELUDE = [
	'#set page(width: 14cm, height: auto, margin: (x: 1.1cm, top: 1.2cm, bottom: 1.4cm), fill: white)',
	'#set text(lang: "fr", size: 11pt)',
	'#set par(justify: true, leading: 0.7em)',
	'#show link: set text(fill: rgb("#0f6e66"))'
].join('\n');

const PDF_PRELUDE = '#set text(lang: "fr")';

/**
 * Appended to the document: exposes the outline (with positions) through `query(<__blog_toc>)`.
 * Metadata is invisible, so this does not change the layout.
 */
const TOC_PROBE = `
#let __blog_plain(it) = {
  if it == none { "" }
  else if type(it) == str { it }
  else if it == [ ] { " " }
  else if it.has("text") { __blog_plain(it.text) }
  else if it.has("children") { it.children.map(__blog_plain).join("") }
  else if it.has("body") { __blog_plain(it.body) }
  else { "" }
}
#context [#metadata(query(heading.where(outlined: true)).map(h => (level: h.level, text: __blog_plain(h.body), page: h.location().page(), y: h.location().position().y.pt())))<__blog_toc>]
`;

export type RenderMode = 'web' | 'pdf';

export interface TocEntry {
	level: number;
	text: string;
	/** Vertical position in the rendered document, in pt from the top of the first page. */
	y: number;
}

export interface Diagnostic {
	severity: 'error' | 'warning';
	message: string;
	/** 1-based line in the author's source, when known. */
	line: number | null;
	column: number | null;
	hints: string[];
}

export interface WebRender {
	svg: string | null;
	toc: TocEntry[];
	plainText: string;
	wordCount: number;
	diagnostics: Diagnostic[];
}

export interface PdfRender {
	pdf: Uint8Array | null;
	diagnostics: Diagnostic[];
}

/** Loads a referenced file (e.g. `/uploads/foo.png`) or returns null when it does not exist. */
export type AssetLoader = (path: string) => Promise<Uint8Array | null>;

/** Paths of uploaded files referenced by the source, normalised as `/uploads/<name>`. */
export function referencedUploads(source: string): string[] {
	const paths = new Set<string>();
	for (const m of source.matchAll(/["']\.?\/?uploads\/([^"'\\\s]+)["']/g)) {
		paths.add(`/uploads/${m[1]}`);
	}
	return [...paths];
}

function escapeTypstString(value: string): string {
	return value.replace(/[\u0000-\u001f]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function wrapSource(content: string, mode: RenderMode, title?: string): { source: string; offset: number } {
	let prelude = mode === 'web' ? WEB_PRELUDE : PDF_PRELUDE;
	if (title) prelude += `\n#set document(title: "${escapeTypstString(title)}")`;
	const offset = prelude.split('\n').length;
	const source = `${prelude}\n${content}${mode === 'web' ? `\n${TOC_PROBE}` : '\n'}`;
	return { source, offset };
}

interface RawDiagnostic {
	path?: string;
	range?: string;
	severity?: string;
	message?: string;
	hints?: string[];
}

function normalizeDiagnostics(raw: unknown, lineOffset: number, sourceLines: number): Diagnostic[] {
	if (!Array.isArray(raw)) return [];
	return (raw as RawDiagnostic[]).map((d) => {
		let line: number | null = null;
		let column: number | null = null;
		const range = /^(\d+):(\d+)/.exec(d.range ?? '');
		if (range && (!d.path || d.path === '/main.typ')) {
			const l = parseInt(range[1], 10) + 1 - lineOffset;
			line = Math.min(Math.max(l, 1), Math.max(sourceLines, 1));
			column = l >= 1 ? parseInt(range[2], 10) + 1 : null;
		}
		return {
			severity: String(d.severity).toLowerCase() === 'warning' ? 'warning' : 'error',
			message: d.message ?? 'Erreur inconnue',
			line,
			column,
			hints: Array.isArray(d.hints) ? d.hints : []
		};
	});
}

function errorToDiagnostics(err: unknown): Diagnostic[] {
	const text = err instanceof Error ? err.message : String(err);
	const messages = [...text.matchAll(/message: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"'));
	return (messages.length ? messages : [text]).map((message) => ({
		severity: 'error' as const,
		message,
		line: null,
		column: null,
		hints: []
	}));
}

// typst.ts keeps a single global compiler: every compilation must run exclusively.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(task, task);
	queue = run.catch(() => undefined);
	return run;
}

async function compileDocument(
	typst: TypstSnippet,
	content: string,
	mode: RenderMode,
	loadAsset: AssetLoader,
	title?: string
) {
	const { source, offset } = wrapSource(content, mode, title);
	const sourceLines = content.split('\n').length;
	const compiler = await typst.getCompiler();
	await compiler.reset();
	compiler.resetShadow();

	for (const path of referencedUploads(content)) {
		const data = await loadAsset(path);
		if (data) compiler.mapShadow(path, data);
	}
	compiler.addSource('/main.typ', source);

	try {
		return await compiler.runWithWorld({ mainFilePath: '/main.typ', root: '/' }, async (world) => {
			const compiled = (await world.compile({ diagnostics: 'full' })) as { diagnostics?: unknown };
			const diagnostics = normalizeDiagnostics(compiled?.diagnostics, offset, sourceLines);
			if (diagnostics.some((d) => d.severity === 'error')) {
				return { diagnostics, artifact: null, toc: null };
			}
			const toc = mode === 'web' ? await world.query({ selector: '<__blog_toc>', field: 'value' }) : null;
			const output = (mode === 'web' ? world.vector({ diagnostics: 'full' }) : world.pdf({ diagnostics: 'full' })) as {
				result?: Uint8Array;
			};
			return { diagnostics, artifact: output?.result ?? null, toc };
		});
	} catch (err) {
		return { diagnostics: errorToDiagnostics(err), artifact: null, toc: null };
	}
}

export function renderWeb(typst: TypstSnippet, content: string, loadAsset: AssetLoader): Promise<WebRender> {
	return exclusive(async () => {
		const { diagnostics, artifact, toc } = await compileDocument(typst, content, 'web', loadAsset);
		if (!artifact) {
			return { svg: null, toc: [], plainText: '', wordCount: 0, diagnostics };
		}

		const rawSvg = await typst.svg({ vectorData: artifact });
		const { svg, pageOffsets, plainText } = processTypstSvg(rawSvg);

		const rawToc = (Array.isArray(toc) ? toc[0] : null) as
			| Array<{ level: number; text: string; page: number; y: number }>
			| null;
		const entries: TocEntry[] = (rawToc ?? [])
			.filter((h) => h && typeof h.y === 'number')
			.map((h) => ({
				level: h.level,
				text: String(h.text ?? '').replace(/\s+/g, ' ').trim(),
				y: Math.round(((pageOffsets[h.page - 1] ?? 0) + h.y) * 100) / 100
			}))
			.filter((h) => h.text.length > 0);

		return {
			svg,
			toc: entries,
			plainText,
			wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : 0,
			diagnostics
		};
	});
}

export function renderPdf(
	typst: TypstSnippet,
	content: string,
	loadAsset: AssetLoader,
	title?: string
): Promise<PdfRender> {
	return exclusive(async () => {
		const { diagnostics, artifact } = await compileDocument(typst, content, 'pdf', loadAsset, title);
		return { pdf: artifact, diagnostics };
	});
}

export function formatDiagnostic(d: Diagnostic): string {
	return d.line ? `Ligne ${d.line}${d.column ? `, col. ${d.column}` : ''} : ${d.message}` : d.message;
}
