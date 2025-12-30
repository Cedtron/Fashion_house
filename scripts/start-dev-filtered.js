#!/usr/bin/env node
const { spawn } = require('child_process');

function start(name, cmd, args) {
  const child = spawn(cmd, args, { shell: true, env: process.env });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (data) => {
    data
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)











































      
      .forEach((line) => {
        // Filter out Console Ninja lines
        if (line.toLowerCase().includes('console ninja')) return;
        console.log(`[${name}] ${line}`);
      });
  });

  child.stderr.on('data', (data) => {
    data
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        if (line.toLowerCase().includes('console ninja')) return;
        console.error(`[${name}] ${line}`);
      });
  });

  child.on('exit', (code, signal) => {
    console.log(
      `[${name}] exited with code ${code}${signal ? ` signal ${signal}` : ''}`
    );
    // If one child exits, kill the process so the other doesn't hang
    process.exit(code === null ? 1 : code);
  });

  return child;
}

// Start backend and frontend
const back = start('API', 'npm', ['--prefix', 'back-end', 'run', 'start:dev']);
const web = start('WEB', 'npm', ['--prefix', 'front-end', 'run', 'dev']);

// Forward SIGINT/SIGTERM
function shutdown() {
  [back, web].forEach((c) => {
    if (c && !c.killed) c.kill('SIGINT');
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
