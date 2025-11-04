#!/usr/bin/env node
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const path = require('path');
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

// After platform is present, make sure cleartext HTTP is allowed for development
try {
  const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (existsSync(manifestPath)) {
    let xml = readFileSync(manifestPath, 'utf8');
    if (!/usesCleartextTraffic="true"/.test(xml)) {
      xml = xml.replace(/<application(\s+)/, '<application$1android:usesCleartextTraffic="true" ');
      writeFileSync(manifestPath, xml, 'utf8');
      console.log('[ensure-android] Enabled usesCleartextTraffic in AndroidManifest.xml');
    }

    const resXmlDir = path.join('android', 'app', 'src', 'main', 'res', 'xml');
    mkdirSync(resXmlDir, { recursive: true });
    const netCfgPath = path.join(resXmlDir, 'network_security_config.xml');
    const netCfg = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="true" />\n</network-security-config>\n`;
    writeFileSync(netCfgPath, netCfg, 'utf8');

    // Link network security config in manifest if missing
    let xml2 = readFileSync(manifestPath, 'utf8');
    if (!/android:networkSecurityConfig=/.test(xml2)) {
      xml2 = xml2.replace(/<application(\s+)/, '<application$1android:networkSecurityConfig="@xml/network_security_config" ');
      writeFileSync(manifestPath, xml2, 'utf8');
      console.log('[ensure-android] Linked network_security_config in AndroidManifest.xml');
    }
  }
} catch (e) {
  console.warn('[ensure-android] Failed to configure cleartext/network security config:', e?.message || e);
}
