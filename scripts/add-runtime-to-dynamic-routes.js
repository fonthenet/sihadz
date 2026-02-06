const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Find all route.ts files that contain [id] or other dynamic segments in their path
async function findDynamicRoutes() {
  const routes = await glob('app/api/**/\\[*\\]/**/route.ts', { 
    cwd: process.cwd(),
    ignore: ['node_modules/**']
  });
  return routes;
}

function addRuntimeConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has runtime export
  if (content.includes('export const runtime')) {
    console.log(`SKIP: ${filePath} (already has runtime config)`);
    return false;
  }
  
  // Check if it has "use server" directive which conflicts
  if (content.includes('"use server"') || content.includes("'use server'")) {
    console.log(`REMOVE: ${filePath} (removing "use server" directive)`);
    const withoutUseServer = content.replace(/^["']use server["']\s*\n/m, '');
    fs.writeFileSync(filePath, withoutUseServer, 'utf8');
  }
  
  // Find the first import statement
  const importMatch = content.match(/^import\s/m);
  if (!importMatch) {
    console.log(`WARN: ${filePath} (no imports found)`);
    return false;
  }
  
  // Add runtime config after imports
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
    }
    if (lastImportIndex >= 0 && lines[i].trim() === '') {
      break;
    }
  }
  
  if (lastImportIndex < 0) {
    console.log(`WARN: ${filePath} (could not find import section)`);
    return false;
  }
  
  // Insert runtime config after last import and blank line
  const runtimeConfig = `
// Force Node.js runtime and dynamic rendering for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
`;
  
  lines.splice(lastImportIndex + 2, 0, runtimeConfig);
  const newContent = lines.join('\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`FIXED: ${filePath}`);
  return true;
}

async function main() {
  const routes = await findDynamicRoutes();
  console.log(`Found ${routes.length} dynamic API routes\n`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const route of routes) {
    const result = addRuntimeConfig(route);
    if (result) {
      fixed++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\nDone! Fixed: ${fixed}, Skipped: ${skipped}, Total: ${routes.length}`);
}

main().catch(console.error);
