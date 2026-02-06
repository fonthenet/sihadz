/**
 * Fix Vercel 404 for dynamic API routes
 * Adds `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`
 * to all dynamic API routes that don't already have them.
 */
const fs = require('fs');
const path = require('path');

function findDynamicRoutes(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findDynamicRoutes(fullPath));
    } else if (entry.name === 'route.ts' && dir.includes('[')) {
      results.push(fullPath);
    }
  }
  return results;
}

const apiDir = path.join(__dirname, '..', 'app', 'api');
const routes = findDynamicRoutes(apiDir);

let fixed = 0;
let skipped = 0;

for (const routePath of routes) {
  let content = fs.readFileSync(routePath, 'utf8');
  const relPath = path.relative(path.join(__dirname, '..'), routePath);
  
  const needsRuntime = !content.includes("export const runtime");
  const needsDynamic = !content.includes("export const dynamic");
  
  if (!needsRuntime && !needsDynamic) {
    console.log(`SKIP: ${relPath} (already has both exports)`);
    skipped++;
    continue;
  }
  
  // Build the lines to add
  const linesToAdd = [];
  if (needsRuntime) linesToAdd.push('export const runtime = "nodejs"');
  if (needsDynamic) linesToAdd.push('export const dynamic = "force-dynamic"');
  
  // Find the position after the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('import{') || line.startsWith("import '") || line.startsWith('import "')) {
      lastImportIndex = i;
    }
    // Also track multi-line imports
    if (line.startsWith('} from ') || line.endsWith("from '@") || line.match(/^} from ['"]/) || line.match(/from ['"].*['"];?$/)) {
      if (i > lastImportIndex) lastImportIndex = i;
    }
  }
  
  // Insert after the last import (or at the top if no imports)
  const insertIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
  
  // Add a blank line before the exports if needed
  const insertLines = ['', ...linesToAdd, ''];
  lines.splice(insertIndex, 0, ...insertLines);
  
  content = lines.join('\n');
  
  // Clean up any triple+ blank lines
  content = content.replace(/\n{4,}/g, '\n\n\n');
  
  fs.writeFileSync(routePath, content, 'utf8');
  console.log(`FIXED: ${relPath} (added: ${linesToAdd.join(', ')})`);
  fixed++;
}

console.log(`\nDone! Fixed: ${fixed}, Skipped: ${skipped}, Total: ${routes.length}`);
