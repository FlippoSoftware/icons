import process from 'node:process';

import { rimraf } from 'rimraf';

rimraf('dist').catch((_error) => {
    process.exit(1);
});
