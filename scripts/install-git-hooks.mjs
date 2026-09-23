import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let gitDirectory;

try {
  gitDirectory = execFileSync('git', ['rev-parse', '--git-dir'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
} catch {
  console.warn('Git repository not initialized; skipping hook installation.');
  process.exit(0);
}

const resolvedGitDirectory = path.resolve(projectRoot, gitDirectory);
const hooksDirectory = path.join(resolvedGitDirectory, 'hooks');
const sourceHook = path.join(projectRoot, '.githooks', 'pre-commit');
const targetHook = path.join(hooksDirectory, 'pre-commit');

if (!existsSync(sourceHook)) {
  throw new Error(`Git hook source was not found: ${sourceHook}`);
}

mkdirSync(hooksDirectory, { recursive: true });
copyFileSync(sourceHook, targetHook);
chmodSync(targetHook, 0o755);
console.log(`Installed pre-commit hook at ${targetHook}`);
