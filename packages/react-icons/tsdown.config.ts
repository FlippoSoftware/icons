import { readdirSync } from 'node:fs';

import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: Object.fromEntries(
        readdirSync('src')
            .filter((file) => /\.tsx?$/.test(file))
            .map((file) => [file.replace(/\.tsx?$/, ''), `src/${file}`])
    ),
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    platform: 'neutral',
    deps: { neverBundle: [/^react(?:$|\/)/] }
});
