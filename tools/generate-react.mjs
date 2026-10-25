import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { transform } from '@svgr/core';

import { readCatalogue } from './catalogue.mjs';
import { ICONS_DIR } from './constants.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const icons = await readCatalogue();
const packageFile = path.join(root, 'packages/react-icons/package.json');
const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
const parent = path.dirname(ICONS_DIR);
await mkdir(parent, { recursive: true });
const stage = await mkdtemp(path.join(parent, '.generate-'));
try {
    // SVGs are already optimized on download. Preserve their paths, colors and SMIL animation here.
    for (const icon of icons) {
        const code = await transform(
            icon.svg,
            {
                typescript: true,
                jsxRuntime: 'automatic',
                dimensions: false,
                plugins: ['@svgr/plugin-jsx']
            },
            { componentName: icon.componentName }
        );
        await writeFile(path.join(stage, `${icon.componentName}Icon.tsx`), code);
    }
    await writeFile(
        path.join(stage, 'index.ts'),
        `${icons.map(({ componentName }) => `export { default as ${componentName}Icon } from './${componentName}Icon';`).join('\n')}\n`
    );
    const biome = fileURLToPath(import.meta.resolve('@biomejs/biome/bin/biome'));
    execFileSync(process.execPath, [biome, 'check', '--write', '--linter-enabled=false', '--config-path', root, stage], {
        stdio: 'inherit'
    });
    // Replacing the directory removes files of icons deleted from the catalogue as well.
    await rm(ICONS_DIR, { recursive: true, force: true });
    await rename(stage, ICONS_DIR);

    const iconExports = Object.fromEntries(
        icons.map(({ svgName, componentName }) => [
            `./${svgName}`,
            {
                import: {
                    types: `./dist/${componentName}Icon.d.ts`,
                    default: `./dist/${componentName}Icon.js`
                },
                require: {
                    types: `./dist/${componentName}Icon.d.cts`,
                    default: `./dist/${componentName}Icon.cjs`
                }
            }
        ])
    );
    packageJson.exports = {
        '.': packageJson.exports['.'],
        ...iconExports,
        './*': packageJson.exports['./*'],
        './package.json': packageJson.exports['./package.json']
    };
    await writeFile(packageFile, `${JSON.stringify(packageJson, null, 4)}\n`);
} finally {
    await rm(stage, { recursive: true, force: true });
}
console.log(`react-icons: generated ${icons.length} components.`);
