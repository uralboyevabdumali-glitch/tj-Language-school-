import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { publicLanding } from '../server/publicLanding.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(await fs.readFile(path.join(root, '..', 'server', 'db.json'), 'utf8'));
const outDir = path.join(root, '..', 'public');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'landing.json'), JSON.stringify(publicLanding(db)), 'utf8');
console.log('Wrote public/landing.json');
