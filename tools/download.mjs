import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { components as loadComponents } from '@figma-export/core';
import isSvg from 'is-svg';
import { optimize } from 'svgo';

import { readCatalogue } from './catalogue.mjs';
import { ICON_COMPONENT_FIGMA_REGEX, ICONS_NAME_REGEX, IGNORED_COLORS_FOR_SVGO_REGEX, METADATA_FILE, SVGS_DIR } from './constants.mjs';
import { kebabCaseToCamelCase } from './utils.mjs';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE = process.env.FIGMA_FILE;
const FIGMA_IDS = (process.env.FIGMA_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const FIGMA_PAGES = (process.env.FIGMA_PAGES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

function parseComponentPropsFromString(props) {
    const params = props.split(/\s*,\s?/);

    return params.reduce((acc, param) => {
        const [key, value] = param.split(/\s*=\s*/);
        acc[key] = value;

        return acc;
    }, {});
}

function parseComponentSetName(name) {
    const params = name.split('/');

    if (params.length < 3) throw new Error(`Icon must have palette, group and name (Monochrome/Logo/yandex): ${name}`);

    return {
        name: params.at(-1),
        meta: {
            palette: params.at(0).toLowerCase(),
            group: params.at(1).toLowerCase()
        }
    };
}

function svgTransformer(svg, palette) {
    const isMonochrome = palette === 'monochrome';

    return optimize(svg, {
        multipass: true,
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        convertColors: {
                            currentColor: isMonochrome ? IGNORED_COLORS_FOR_SVGO_REGEX : false
                        },
                        removeViewBox: false
                    }
                }
            }
        ]
    }).data;
}

function targetNodesBfs(targetIds, startQueue) {
    const queue = Array.from(startQueue);
    const resultNodes = [];

    const remainingIds = new Set(targetIds.map((id) => id.replace('-', ':')));

    while (queue.length > 0 && remainingIds.size > 0) {
        const node = queue.shift();

        if (remainingIds.has(node.id)) {
            resultNodes.push(node);
            remainingIds.delete(node.id);

            continue;
        }

        if (node.children) queue.push(...node.children);
    }

    return resultNodes;
}

function componentSetsDfs(startStack) {
    const stack = Array.from(startStack);
    const resultSets = new Set();

    while (stack.length > 0) {
        const node = stack.pop();

        if (node.type === 'COMPONENT_SET') {
            resultSets.add(node);

            continue;
        }

        if (node.children) {
            stack.push(...node.children);
        }
    }

    return Array.from(resultSets);
}

function createSvgBuilder(metadata, outputDir) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Preserve the existing Figma variant conversion during the workspace migration.
    return async function svgBuilder([{ children, components: icons }]) {
        const targetNodes = targetNodesBfs(FIGMA_IDS, children);
        const iconSets = componentSetsDfs(targetNodes);
        const iconsById = icons.reduce((acc, icon) => {
            acc[icon.id] = icon;
            return acc;
        }, {});
        const uniqueIcons = new Set();

        for (const iconSet of iconSets) {
            const { name, meta } = parseComponentSetName(iconSet.name);

            if (!ICONS_NAME_REGEX.test(name)) throw new Error(`Invalid icon name: ${name}. Pattern: ${ICONS_NAME_REGEX.source}`);

            if (uniqueIcons.has(name)) {
                throw new Error(`Icon has been already added: ${name}`);
            }

            uniqueIcons.add(name);

            if (!meta.palette) throw new Error(`Icon must have palette: ${name}`);

            if (!meta.group) throw new Error(`Icon must have group: ${name}`);

            metadata.info.palettes.add(meta.palette);
            metadata.info.groups.add(meta.group);

            for (const icon of iconSet.children) {
                const props = parseComponentPropsFromString(icon.name);
                if (!props.preview) throw new Error(`Icon has no preview: ${name}`);

                if (props.preview === 'true') continue;

                let svg = iconsById[icon.id].svg;
                let svgName = name;

                if (!props.style) throw new Error(`Icon has no style: ${name}`);

                if (props.style !== 'regular') svgName += `_${props.style}`;

                if (props.animated === 'true') {
                    if (!isSvg(iconsById[icon.id].description))
                        throw new Error(`If icon animated must have in description correct svg: ${name}`);

                    svg = iconsById[icon.id].description;
                }

                metadata.icons.push({
                    name,
                    style: props.style,
                    svgName,
                    componentName: kebabCaseToCamelCase(svgName),
                    meta
                });

                const optimizedSvg = svgTransformer(svg, meta.palette);
                await fs.writeFile(path.join(outputDir, `${svgName}.svg`), optimizedSvg);
            }
        }
    };
}

/** Whether a path exists. */
async function exists(file) {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}

/**
 * Swaps the downloaded catalogue in: the current one is first moved to `stage/previous/` and moved back if the swap
 * fails halfway, so the package is never left without its icons. The stage (and the previous catalogue) is removed by
 * the caller.
 */
async function replaceCatalogue(stage, svgDir, metadataFile) {
    const previous = path.join(stage, 'previous');
    const previousSvgs = path.join(previous, 'icons');
    const previousMetadata = path.join(previous, 'metadata.json');
    await fs.mkdir(previous);
    const hadSvgs = await exists(SVGS_DIR);
    const hadMetadata = await exists(METADATA_FILE);
    if (hadSvgs) await fs.rename(SVGS_DIR, previousSvgs);
    if (hadMetadata) await fs.rename(METADATA_FILE, previousMetadata);
    try {
        await fs.rename(svgDir, SVGS_DIR);
        await fs.rename(metadataFile, METADATA_FILE);
    } catch (error) {
        await fs.rm(SVGS_DIR, { recursive: true, force: true });
        await fs.rm(METADATA_FILE, { force: true });
        if (hadSvgs) await fs.rename(previousSvgs, SVGS_DIR);
        if (hadMetadata) await fs.rename(previousMetadata, METADATA_FILE);
        throw error;
    }
}

async function download() {
    if (!FIGMA_TOKEN || !FIGMA_FILE || FIGMA_IDS.length === 0 || FIGMA_PAGES.length === 0) {
        throw new Error('Set FIGMA_TOKEN, FIGMA_FILE, FIGMA_IDS and FIGMA_PAGES in .env.');
    }
    const stage = await fs.mkdtemp(path.join(path.dirname(SVGS_DIR), '.download-'));
    const svgDir = path.join(stage, 'icons');
    const metadataFile = path.join(stage, 'metadata.json');
    await fs.mkdir(svgDir);
    try {
        const metadata = { info: { palettes: new Set(), groups: new Set() }, icons: [] };
        await loadComponents({
            token: FIGMA_TOKEN,
            fileId: FIGMA_FILE,
            ids: FIGMA_IDS,
            onlyFromPages: FIGMA_PAGES,
            outputters: [createSvgBuilder(metadata, svgDir)],
            filterComponent: (node) => ICON_COMPONENT_FIGMA_REGEX.test(node.name) && node.type !== 'INSTANCE'
        });
        metadata.info.palettes = Array.from(metadata.info.palettes);
        metadata.info.groups = Array.from(metadata.info.groups);
        await fs.writeFile(metadataFile, `${JSON.stringify(metadata, null, 4)}\n`);
        await readCatalogue({ svgDir, metadataFile });
        // No tracked file is removed until the download and catalogue validation have succeeded.
        await replaceCatalogue(stage, svgDir, metadataFile);
        console.log(`svg-icons: downloaded ${metadata.icons.length} icons.`);
    } finally {
        await fs.rm(stage, { recursive: true, force: true });
    }
}

download().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
