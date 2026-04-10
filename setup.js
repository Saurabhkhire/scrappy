#!/usr/bin/env node
/**
 * Scrappy Setup Script
 * Run once to install all dependencies: node setup.js
 */
const { execSync } = require('child_process');
const path = require('path');

const run = (cmd, cwd) => {
  console.log(`\n→ ${cmd} (in ${path.basename(cwd)})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

console.log('\n🕷️  Scrappy Setup\n' + '='.repeat(40));
console.log('\nInstalling root dependencies...');
run('npm install', __dirname);
console.log('\nInstalling server dependencies...');
run('npm install', path.join(__dirname, 'server'));
console.log('\nInstalling client dependencies...');
run('npm install', path.join(__dirname, 'client'));
console.log('\n✅ Setup complete!\n');
console.log('Run the app with: npm run dev\n');
console.log('Admin login:');
console.log('  Email:    admin@scrappy.io');
console.log('  Password: admin123\n');
