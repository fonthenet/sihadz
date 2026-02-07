#!/usr/bin/env node
/**
 * Ensures .next/next-stats.json exists after build.
 * Vercel expects this file for build analytics; Turbopack does not generate it.
 * Creates a minimal valid stats file if missing.
 */
const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const statsPath = path.join(nextDir, 'next-stats.json');

if (fs.existsSync(statsPath)) {
  console.log('[ensure-next-stats] next-stats.json already exists');
  process.exit(0);
}

if (!fs.existsSync(nextDir)) {
  console.log('[ensure-next-stats] .next directory not found, skipping');
  process.exit(0);
}

const minimalStats = {
  version: process.env.npm_package_version || '1.0.0',
  hash: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  time: 0,
};

fs.writeFileSync(statsPath, JSON.stringify(minimalStats), 'utf8');
console.log('[ensure-next-stats] Created next-stats.json');
