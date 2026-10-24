import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import * as esm from '../packages/react-icons/dist/index.js';

import { readCatalogue } from './catalogue.mjs';
import { kebabCaseToCamelCase } from './utils.mjs';

const requireReact = createRequire(new URL('../packages/react-icons/package.json', import.meta.url));
const requireSvg = createRequire(new URL('../packages/svg-icons/package.json', import.meta.url));
const cjs = requireReact('@flippo-software/react-icons');

test('every catalogue icon has matching ESM, CommonJS and individual exports', async () => {
    const icons = await readCatalogue();
    const names = icons.map((icon) => `${icon.componentName}Icon`).sort();
    assert.deepEqual(Object.keys(esm).sort(), names);
    assert.deepEqual(Object.keys(cjs).sort(), names);
    for (const icon of icons) {
        const individualSpecifiers = new Set([
            `@flippo-software/react-icons/${icon.svgName}`,
            `@flippo-software/react-icons/${icon.componentName}`
        ]);
        const props = { width: 32, height: 32, 'aria-label': icon.svgName, className: 'icon' };
        // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Verify every generated public export.
        const html = renderToStaticMarkup(createElement(esm[`${icon.componentName}Icon`], props));
        assert.equal(renderToStaticMarkup(createElement(cjs[`${icon.componentName}Icon`], props)), html);
        for (const specifier of individualSpecifiers) {
            const single = requireReact(specifier);
            const singleEsm = await import(pathToFileURL(requireReact.resolve(specifier).replace(/\.cjs$/, '.js')).href);
            assert.equal(renderToStaticMarkup(createElement(single, props)), html);
            assert.equal(renderToStaticMarkup(createElement(singleEsm.default, props)), html);
        }
        assert.match(html, /^<svg /);
        assert.match(html, /width="32"/);
        assert.match(html, /height="32"/);
        assert.match(html, /class="icon"/);
        assert.match(html, new RegExp(`aria-label="${icon.svgName}"`));
        for (const name of new Set([icon.svgName, icon.componentName])) {
            const specifier = `@flippo-software/react-icons/${name}`;
            const single = requireReact(specifier);
            const singleEsm = await import(pathToFileURL(requireReact.resolve(specifier).replace(/\.cjs$/, '.js')).href);
            assert.equal(renderToStaticMarkup(createElement(single, props)), html);
            assert.equal(renderToStaticMarkup(createElement(singleEsm.default, props)), html);
        }
    }
});

test('SVG exports resolve to the original files and the package has no React dependency', async () => {
    const icons = await readCatalogue();
    for (const icon of icons) {
        const file = requireSvg.resolve(`@flippo-software/svg-icons/${icon.svgName}`);
        const fileWithExtension = requireSvg.resolve(`@flippo-software/svg-icons/${icon.svgName}.svg`);
        assert.equal(fileWithExtension, file);
        assert.equal(await readFile(file, 'utf8'), icon.svg);
    }
    const pkg = requireSvg('@flippo-software/svg-icons/package.json');
    assert.equal(pkg.dependencies, undefined);
    assert.equal(pkg.peerDependencies, undefined);
    assert.equal(requireSvg('@flippo-software/svg-icons/metadata.json').icons.length, icons.length);
});

test('animated SVG content and monochrome coloring survive React generation', () => {
    const spinner = renderToStaticMarkup(createElement(esm.SpinnerIcon));
    assert.match(spinner, /<animateTransform/);
    assert.match(spinner, /repeatCount="indefinite"/);
    assert.match(spinner, /currentColor/);
});

test('every public React entry ships declarations for both module formats', async () => {
    for (const name of ['index', ...(await readCatalogue()).map((icon) => `${icon.componentName}Icon`)]) {
        for (const suffix of ['d.ts', 'd.cts']) {
            const declaration = await readFile(new URL(`../packages/react-icons/dist/${name}.${suffix}`, import.meta.url), 'utf8');
            assert.ok(declaration.length > 0);
        }
    }
});

test('invalid catalogues are rejected before generation', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'flippo-icons-'));
    const svgDir = path.join(root, 'icons');
    const metadataFile = path.join(root, 'metadata.json');
    await mkdir(svgDir);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>';
    const metadata = async (names) =>
        writeFile(
            metadataFile,
            JSON.stringify({ icons: names.map((name) => ({ svgName: name, componentName: kebabCaseToCamelCase(name) })) })
        );
    try {
        await metadata(['missing']);
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /Missing SVG/);
        await metadata(['check']);
        await writeFile(path.join(svgDir, 'check.svg'), 'invalid');
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /Invalid SVG/);
        await writeFile(path.join(svgDir, 'check.svg'), svg);
        await writeFile(path.join(svgDir, 'extra.svg'), svg);
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /missing from metadata/);
        await rm(path.join(svgDir, 'extra.svg'));
        await metadata(['check', 'check']);
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /Duplicate icon or component/);
        // Uppercase names would clash with their lowercase twins on case-insensitive file systems.
        await metadata(['Check']);
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /Invalid SVG name/);
        await metadata(['../outside']);
        await assert.rejects(readCatalogue({ svgDir, metadataFile }), /Invalid SVG name/);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
