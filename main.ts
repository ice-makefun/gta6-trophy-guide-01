// Vice State Trophy Guide — entry program (Node 22, standard library only).
//
// The guide itself is plain static files under app/ (index.html, style.css,
// app.js, data/trophies.json) that any static server can serve with app/ at
// its root; it loads nothing over the network. This program hands the guide
// in: it copies app/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, which is the summary the judge reads (screenshots, first-load
// files and bytes, and the guide's source).
//
// vendor/makefun-frontend.ts is the kit's copy, unchanged: the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// Serve the guide locally with `python3 -m http.server` inside app/, then
// open http://localhost:8000.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing: the guide was not built');
}
if (!existsSync(join(here, 'screenshots'))) {
  throw new Error('screenshots/ is missing: take 3 or 4 screenshots of the guide first');
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps: at most 4 screenshots, each at most 256 KiB; app/ at
// most 993 files and directories and 48 MiB in all; the dossier text at
// most 163,840 bytes. buildDossier refuses an entry past those limits, and
// the dossier it writes is what the gate compares byte for byte.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
