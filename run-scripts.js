
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine which script to run based on command line argument
const scriptArg = process.argv[2];

// Define our scripts
const scripts = {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
  lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
};

if (!scriptArg || !scripts[scriptArg]) {
  console.log('Available scripts:');
  Object.keys(scripts).forEach(script => {
    console.log(`  - ${script}`);
  });
  process.exit(1);
}

// Execute the script
try {
  console.log(`Running script: ${scriptArg}`);
  execSync(scripts[scriptArg], { stdio: 'inherit' });
} catch (error) {
  console.error(`Error running script: ${scriptArg}`);
  process.exit(1);
}
