import { readCatalogue } from './catalogue.mjs';

const icons = await readCatalogue();
console.log(`svg-icons: ${icons.length} SVGs match the catalogue.`);
