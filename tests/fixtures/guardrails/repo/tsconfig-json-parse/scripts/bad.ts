import * as fs from 'node:fs';

const raw = fs.readFileSync('tsconfig.json', 'utf8');
const parsed = JSON.parse(raw);
void parsed;
