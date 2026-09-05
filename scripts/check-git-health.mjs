import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const gitDir = path.join(rootDir, '.git');
const indexPath = path.join(gitDir, 'index');
const lockPath = path.join(gitDir, 'index.lock');

console.log('=== GIT LOCAL ENVIRONMENT HEALTH CHECK ===');

let isHealthy = true;

// 1. Check for stale lock file
if (fs.existsSync(lockPath)) {
  const stat = fs.statSync(lockPath);
  const ageSec = Math.round((Date.now() - stat.mtimeMs) / 1000);
  console.error(`[WARN] .git/index.lock exists! Created ${ageSec}s ago.`);
  if (ageSec > 30) {
    console.error('       Lock is older than 30s; likely stale from an interrupted process.');
    console.error('       Safe removal command: Remove-Item .git/index.lock');
  }
  isHealthy = false;
} else {
  console.log('  [PASS] No .git/index.lock present');
}

// 2. Check .git/index integrity
if (!fs.existsSync(indexPath)) {
  console.error('  [FAIL] .git/index is missing!');
  isHealthy = false;
} else {
  const stat = fs.statSync(indexPath);
  if (stat.size < 12) {
    console.error(`  [FAIL] .git/index is corrupted/truncated! (size: ${stat.size} bytes, minimum valid header is 12 bytes)`);
    console.error('         Safe non-destructive repair: Remove-Item .git/index -Force; git reset');
    isHealthy = false;
  } else {
    console.log(`  [PASS] .git/index is intact (size: ${stat.size} bytes)`);
  }
}

// 3. Check for concurrent git processes
try {
  const output = execSync('powershell -NoProfile -Command "Get-Process | Where-Object { $_.ProcessName -like \'*git*\' } | Select-Object -ExpandProperty ProcessName"', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

  if (output) {
    const procs = output.split(/\r?\n/).filter(Boolean);
    console.warn(`  [WARN] ${procs.length} active git process(es) detected: ${procs.join(', ')}`);
  } else {
    console.log('  [PASS] Zero concurrent git processes running');
  }
} catch {
  // Ignore process query errors
}

// 4. Test actual git status execution
try {
  execSync('git status --porcelain', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log('  [PASS] git status executes cleanly with code 0');
} catch (err) {
  console.error(`  [FAIL] git status command failed: ${err.message}`);
  isHealthy = false;
}

console.log('==========================================');
if (isHealthy) {
  console.log('STATUS: HEALTHY - Git repository environment is stable.');
  process.exit(0);
} else {
  console.error('STATUS: UNHEALTHY - Git repository environment requires attention.');
  process.exit(1);
}

