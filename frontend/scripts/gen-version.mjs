import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const version = pkg.version;
const build = process.env.VITE_BUILD_SHA?.slice(0, 7) || 'dev';
const builtAt = process.env.VITE_BUILD_TIME || new Date().toISOString();

const info = { version, build, builtAt };

writeFileSync(join(root, 'public/version.json'), `${JSON.stringify(info, null, 2)}\n`);
console.log(`Version manifest: v${version} (${build})`);
