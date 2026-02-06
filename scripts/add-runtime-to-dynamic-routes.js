const fs = require('fs');
const path = require('path');

// Recursively find ALL route.ts files in app/api
function findAllRoutes(dir, routes = []) {
  if (!fs.existsSync(dir)) return routes;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      findAllRoutes(fullPath, routes);
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
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
  // Try multiple possible locations
  const possiblePaths = [
    path.join(process.cwd(), 'app', 'api'),
    path.join(__dirname, '..', 'app', 'api'),
    '/vercel/share/v0-project/app/api',
  ];
  
  let apiDir = null;
  for (const p of possiblePaths) {
    console.log('Checking:', p, 'exists:', fs.existsSync(p));
    if (fs.existsSync(p)) {
      apiDir = p;
      break;
    }
  }
  
  if (!apiDir) {
    console.error('Could not find app/api directory');
    process.exit(1);
  }
  
  console.log('Using:', apiDir);
  const routes = findAllRoutes(apiDir);
  console.log('Found ' + routes.length + ' API routes\n');
  
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
