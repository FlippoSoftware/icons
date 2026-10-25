import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import isSvg from 'is-svg';

import { ICONS_NAME_REGEX, METADATA_FILE, SVGS_DIR } from './constants.mjs';
import { kebabCaseToCamelCase } from './utils.mjs';

/** Validate the complete catalogue before a generator replaces any output. */
export async function readCatalogue({ svgDir = SVGS_DIR, metadataFile = METADATA_FILE } = {}) {
    const metadata = JSON.parse(await readFile(metadataFile, 'utf8'));
    if (!Array.isArray(metadata.icons) || metadata.icons.length === 0) throw new Error('The icon catalogue is empty or invalid.');
    const files = new Set((await readdir(svgDir)).filter((file) => file.endsWith('.svg')));
    const components = new Set();
    const icons = [];
    for (const icon of metadata.icons) {
        if (!ICONS_NAME_REGEX.test(icon.svgName ?? '')) throw new Error(`Invalid SVG name: ${icon.svgName}`);
        const name = kebabCaseToCamelCase(icon.svgName);
        if (icon.componentName !== name) throw new Error(`Incorrect componentName for ${icon.svgName}: expected ${name}`);
        if (components.has(name)) throw new Error(`Duplicate icon or component: ${icon.svgName}`);
        components.add(name);
        const file = `${icon.svgName}.svg`;
        if (!files.delete(file)) throw new Error(`Missing SVG: ${file}`);
        const svg = await readFile(path.join(svgDir, file), 'utf8');
        if (!isSvg(svg)) throw new Error(`Invalid SVG: ${file}`);
        icons.push({ ...icon, svg });
    }
    if (files.size > 0) throw new Error(`SVGs missing from metadata: ${[...files].join(', ')}`);
    return icons.sort((left, right) => left.componentName.localeCompare(right.componentName, 'en'));
}
