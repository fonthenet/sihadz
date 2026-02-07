#!/usr/bin/env node
/**
 * Writes build-info.json at build time for deployment status detection.
 * Run before next build so the file is included in the output.
 */
const fs = require('fs');
const path = require('path');

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  `local-${Date.now().toString(36)}`;
const timestamp = new Date().toISOString();

const publicDir = path.join(process.cwd(), 'public');
const outPath = path.join(publicDir, 'build-info.json');

const payload = { buildId, timestamp };

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(payload, null, 0), 'utf8');
console.log(`[build-info] Written ${outPath} (buildId: ${buildId})`);
