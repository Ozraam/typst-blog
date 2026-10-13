import { describe, expect, it } from 'vitest';
import { isSafeLinkTarget, joinTextRuns, processTypstSvg } from '../src/lib/typst/svg';
import { referencedUploads } from '../src/lib/typst/engine';

const SAMPLE = `<svg class="typst-doc" viewBox="0 0 396 900" xmlns:h5="http://www.w3.org/1999/xhtml"><style type="text/css">svg { fill: none; }</style>
<g class="typst-page" transform="translate(0, 0)" data-page-height="450"><a target="_blank" xlink:href="javascript:alert(1)"><rect class="pseudo-link"/></a>
<a target="_blank" xlink:href="https://typst.app/?a=1&amp;b=2"><rect/></a></g>
<g class="typst-page" transform="translate(0, 450)" data-page-height="450"><a xlink:href="#" onclick="handleTypstLocation(this, 2, 70.5, 112.25); return false"><rect/></a>
<foreignObject><h5:div class="tsel" style="font-size: 62px">exem-</h5:div></foreignObject><foreignObject><h5:div class="tsel">ple &amp; fin</h5:div></foreignObject>
<image xlink:href="data:image/png;base64,AAAA"/><use href="#glyph"/><g onmouseover="alert(1)"></g></g>
<script type="text/javascript">alert(1)</script></svg>`;

describe('processTypstSvg', () => {
	const { svg, pageOffsets, plainText } = processTypstSvg(SAMPLE);

	it('removes scripts, embedded styles and event handlers', () => {
		expect(svg).not.toMatch(/<script|<style|onclick|onmouseover|alert\(1\)/);
	});

	it('neutralises unsafe links and keeps safe ones', () => {
		expect(svg).not.toContain('javascript:');
		expect(svg).toContain('<a href="https://typst.app/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">');
	});

	it('turns internal Typst jumps into absolute document offsets', () => {
		expect(pageOffsets).toEqual([0, 450]);
		expect(svg).toContain('data-jump="562.25"');
	});

	it('keeps embedded images and glyph references', () => {
		expect(svg).toContain('xlink:href="data:image/png;base64,AAAA"');
		expect(svg).toContain('href="#glyph"');
	});

	it('exposes the text layer as HTML and extracts plain text', () => {
		expect(svg).not.toContain('h5:div');
		expect(svg).toContain('<div class="tsel"');
		expect(plainText).toBe('exemple & fin');
	});
});

describe('helpers', () => {
	it('classifies link targets', () => {
		expect(isSafeLinkTarget('https://example.com')).toBe(true);
		expect(isSafeLinkTarget('/posts/x')).toBe(true);
		expect(isSafeLinkTarget('mailto:a@b.c')).toBe(true);
		expect(isSafeLinkTarget('java\nscript:alert(1)')).toBe(false);
		expect(isSafeLinkTarget(' JavaScript:alert(1)')).toBe(false);
		expect(isSafeLinkTarget('data:text/html,x')).toBe(false);
		expect(isSafeLinkTarget('//evil.example')).toBe(false);
	});

	it('joins text runs across lines', () => {
		expect(joinTextRuns(['Bonjour', ' ', 'le', 'monde'])).toBe('Bonjour le monde');
	});

	it('finds referenced uploads', () => {
		expect(referencedUploads('#image("/uploads/a.png") #read("uploads/b.csv") #image("x.png")')).toEqual([
			'/uploads/a.png',
			'/uploads/b.csv'
		]);
	});
});
