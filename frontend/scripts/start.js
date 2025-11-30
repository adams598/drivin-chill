#!/usr/bin/env node
/**
 * Script de démarrage avec allocation mémoire augmentée
 */
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

// Trouver le chemin de craco
let cracoPath;
const nodeModulesPath = path.join(__dirname, '..', 'node_modules', '@craco', 'craco', 'dist', 'bin', 'craco.js');

if (fs.existsSync(nodeModulesPath)) {
  cracoPath = nodeModulesPath;
} else {
  try {
    // Essayer de résoudre depuis require.resolve
    cracoPath = require.resolve('@craco/craco/dist/bin/craco.js');
  } catch (e) {
    console.error('Erreur: @craco/craco n\'est pas trouvé.');
    console.error('Veuillez installer les dépendances avec: npm install');
    process.exit(1);
  }
}

const startArgs = ['start', ...args];

const child = spawn('node', [cracoPath, ...startArgs], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096'
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Erreur lors du démarrage:', err);
  process.exit(1);
});

