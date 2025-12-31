// Postinstall script to fix ajv-keywords compatibility issue
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const webpackAjvKeywordsPath = path.join(__dirname, 'node_modules', 'webpack', 'node_modules', 'ajv-keywords');
const webpackNodeModulesPath = path.join(__dirname, 'node_modules', 'webpack', 'node_modules');

// Always ensure we have the correct version
if (fs.existsSync(webpackAjvKeywordsPath)) {
  console.log('Removing incompatible nested ajv-keywords...');
  fs.rmSync(webpackAjvKeywordsPath, { recursive: true, force: true });
}

// Install the correct version directly into webpack's node_modules
console.log('Installing compatible ajv-keywords@3.5.2...');
try {
  if (!fs.existsSync(webpackNodeModulesPath)) {
    fs.mkdirSync(webpackNodeModulesPath, { recursive: true });
  }
  const originalCwd = process.cwd();
  process.chdir(webpackNodeModulesPath);
  execSync('npm install ajv-keywords@3.5.2 --no-save --legacy-peer-deps --loglevel=error', { stdio: 'pipe' });
  process.chdir(originalCwd);
  console.log('✅ Fixed ajv-keywords compatibility issue');
} catch (error) {
  console.log('⚠️ Could not install ajv-keywords automatically');
  console.log('You may need to manually install: cd node_modules/webpack/node_modules && npm install ajv-keywords@3.5.2');
}

