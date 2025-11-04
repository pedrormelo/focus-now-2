#!/usr/bin/env node
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

if (existsSync('android')) {
  console.log('[ensure-android] android/ already exists, skipping add.');
  process.exit(0);
}

console.log('[ensure-android] Adding Android platform...');
const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['cap', 'add', 'android'], {
  stdio: 'inherit'
});

if (res.status !== 0) {
  console.warn('[ensure-android] `npx cap add android` exited with code', res.status, '- continuing may fail if platform was not created.');
}
