#!/usr/bin/env node
// Scans built client assets for server secrets. Run after `npm run build`
// (and after the OpenNext build if you deploy that output).
//   node scripts/check-client-secrets.mjs
// Exit 0: clean. Exit 1: a secret or a service role JWT was found.
// Exit 2: nothing to scan, build first.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const SCAN_DIRS = ['.next/static', '.open-next/assets'];
const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map', '.txt']);
const SECRET_NAME = /(SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|TOKEN|API_KEY)/i;
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local', '.dev.vars'];

function loadSecrets() {
  const pairs = new Map(Object.entries(process.env));
  for (const file of ENV_FILES) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) pairs.set(m[1], m[2].replace(/^['"]|['"]$/g, ''));
    }
  }
  const secrets = [];
  for (const [key, value] of pairs) {
    if (key.startsWith('NEXT_PUBLIC_')) continue;
    if (SECRET_NAME.test(key) && typeof value === 'string' && value.length >= 16) {
      secrets.push({ key, value });
    }
  }
  return secrets;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (TEXT_EXT.has(extname(name))) yield full;
  }
}

const dirs = SCAN_DIRS.filter((d) => existsSync(d));
if (dirs.length === 0) {
  console.error('No build output found. Run the build first.');
  process.exit(2);
}

const secrets = loadSecrets();
const jwtPattern = /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g;
const findings = [];
let scanned = 0;

for (const dir of dirs) {
  for (const file of walk(dir)) {
    scanned += 1;
    const content = readFileSync(file, 'utf8');
    for (const { key, value } of secrets) {
      if (content.includes(value)) findings.push(`${file}: contains the value of ${key}`);
    }
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      findings.push(`${file}: references SUPABASE_SERVICE_ROLE_KEY`);
    }
    for (const token of content.match(jwtPattern) ?? []) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
        if (payload.role === 'service_role') findings.push(`${file}: contains a service_role JWT`);
      } catch {
        /* not a JWT */
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`FAIL: ${findings.length} finding(s) in ${scanned} file(s)`);
  for (const f of [...new Set(findings)]) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`OK: ${scanned} file(s) scanned in ${dirs.join(', ')}, ${secrets.length} secret value(s) checked.`);
