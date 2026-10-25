import { fileURLToPath } from 'node:url';

import { isHex } from './utils.mjs';

export const SVGS_DIR = fileURLToPath(new URL('../packages/svg-icons/icons/', import.meta.url));
export const ICONS_DIR = fileURLToPath(new URL('../packages/react-icons/src/', import.meta.url));

// Lowercase only: `Check.svg` and `check.svg` would clash on case-insensitive file systems (macOS, Windows).
export const ICONS_NAME_REGEX = /^([a-z0-9](_?[a-z0-9])*)$/;

export const ICON_COMPONENT_FIGMA_REGEX = /^(?:Monochrome|Colored)\//;

export const IGNORED_COLORS_FOR_SVGO = {
    '$misc-red-darker': '#e52222',
    '$misc-red-default': '#ff4141',
    '$misc-red-lighter': '#ff5959',

    '$misc-warm-red-darker': '#ba1e06',
    '$misc-warm-red-default': '#d3341b',
    '$misc-warm-red-lighter': '#ff5f4d',

    '$misc-green-darker': '#1ba62b',
    '$misc-green-default': '#31be42',
    '$misc-green-lighter': '#4ed95e',

    '$misc-yellow-darker': '#bd9600',
    '$misc-yellow-default': '#d6ae12',
    '$misc-yellow-lighter': '#f0c82b',

    '$misc-golden-darker': '#857938',
    '$misc-golden-default': '#9e9352',
    '$misc-golden-lighter': '#b8ab5f'
};

export const IGNORED_COLORS_FOR_SVGO_REGEX = new RegExp(
    `#(?!${Object.values(IGNORED_COLORS_FOR_SVGO)
        .filter(isHex)
        .map((value) => value.slice(1))
        .join('|')})`,
    'i'
);

export const METADATA_FILE = fileURLToPath(new URL('../packages/svg-icons/metadata.json', import.meta.url));
