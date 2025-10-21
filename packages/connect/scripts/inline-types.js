const fs = require('fs');
const path = require('path');

// Read the multichain type definitions
const multichainTypesPath = path.join(__dirname, '../../multichain/dist/types/multichain.d.ts');
const outputPath = path.join(__dirname, '../dist/multichain/index.d.ts');

if (fs.existsSync(multichainTypesPath)) {
  try {
    // Read the multichain type definitions
    const multichainTypes = fs.readFileSync(multichainTypesPath, 'utf8');

    // Create a new declaration file that includes the multichain types
    const inlineTypes = `// Inlined types from @metamask/multichain
${multichainTypes}

// Re-export everything for compatibility
export * from '@metamask/multichain';
`;

    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the inlined types
    fs.writeFileSync(outputPath, inlineTypes);

    console.log('Successfully inlined multichain types');
  } catch (error) {
    console.error('Error inlining types:', error.message);
    process.exit(1);
  }
} else {
  console.error('Multichain types not found at:', multichainTypesPath);
  process.exit(1);
}
