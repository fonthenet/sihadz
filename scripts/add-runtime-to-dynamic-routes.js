const fs = require('fs');
const path = require('path');

// Recursively find all route.ts files that contain [id] or other dynamic segments in their path
function findDynamicRoutes(dir, routes = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      findDynamicRoutes(fullPath, routes);
    } else if ((file.name === 'route.ts' || file.name === 'route.tsx') && fullPath.includes('[') && fullPath.includes(']')) {
      routes.push(fullPath);
    }
  }
  
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

function main() {
  const apiDir = path.join(process.cwd(), 'app/api');
  const routes = findDynamicRoutes(apiDir);
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

main();
