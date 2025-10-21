const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use tsc to generate bundled declarations
const tscCommand = `npx tsc --declaration --emitDeclarationOnly --outDir dist/types --project tsconfig.build.json`;

try {
  console.log('Generating bundled TypeScript declarations...');
  execSync(tscCommand, { stdio: 'inherit' });

  // Move the generated declaration files to the correct locations
  const typesDir = path.join(__dirname, '../dist/types');
  const distDir = path.join(__dirname, '../dist');

  if (fs.existsSync(typesDir)) {
    // Copy declaration files to the main dist directory
    const files = fs.readdirSync(typesDir);
    files.forEach(file => {
      if (file.endsWith('.d.ts')) {
        const srcPath = path.join(typesDir, file);
        const destPath = path.join(distDir, file);
        fs.copyFileSync(srcPath, destPath);
      }
    });

    // Also copy multichain declarations
    const multichainSrc = path.join(typesDir, 'multichain', 'index.d.ts');
    const multichainDest = path.join(distDir, 'multichain', 'index.d.ts');
    if (fs.existsSync(multichainSrc)) {
      fs.copyFileSync(multichainSrc, multichainDest);
    }

    console.log('TypeScript declarations generated successfully');
  }
} catch (error) {
  console.error('Error generating TypeScript declarations:', error.message);
  process.exit(1);
}
