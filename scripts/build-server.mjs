import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();

await build({
  entryPoints: [path.join(root, 'src', 'server.ts')],
  outfile: path.join(root, 'server.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
});
