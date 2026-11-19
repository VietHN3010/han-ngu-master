#!/usr/bin/env node
/**
 * Antigravity Lifecycle Hook (SessionStart & PostToolUse)
 * - Syncs bundle, CSS, AUTO-SYNC-STATE, and AGENTS.md via scripts/build.js --quiet
 * - On SessionStart, injects latest workspace git status and recent commit context
 *   so Antigravity automatically understands recent edits made by Claude (or vice versa).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');

function runGit(cmd) {
  try {
    return execSync(cmd, {
      cwd: APP_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (e) {
    return '';
  }
}

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

function main() {
  const rawInput = readStdinSync();
  let payload = {};
  if (rawInput && rawInput.trim()) {
    try {
      payload = JSON.parse(rawInput);
    } catch (e) {
      payload = {};
    }
  }

  // Keep bundle, CSS, AUTO-SYNC-STATE and AGENTS.md in sync silently
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--quiet'], {
      cwd: APP_ROOT,
      stdio: 'ignore'
    });
  } catch (e) {
    // Non-fatal in hook context so intermediate edits never block tool loop
  }

  if (payload.hookEventName === 'SessionStart') {
    const gitStatus = runGit('git status -s');
    const recentCommits = runGit('git log -n 3 --oneline --stat');
    const sections = ['[Auto-Sync Claude <-> Antigravity] Trạng thái thay đổi mới nhất trong chinese-app:'];

    if (gitStatus) {
      sections.push('Working tree (git status -s):\n' + gitStatus);
    } else {
      sections.push('Working tree: clean (không có thay đổi chưa commit).');
    }

    if (recentCommits) {
      sections.push('3 commit gần nhất (git log -n 3 --oneline --stat):\n' + recentCommits);
    }

    sections.push('Hãy tự động đọc các file vừa thay đổi nếu liên quan đến yêu cầu của người dùng.');

    process.stdout.write(JSON.stringify({
      injectSteps: [
        {
          systemMessage: {
            systemMessage: sections.join('\n\n')
          }
        }
      ]
    }) + '\n');
    return;
  }

  process.stdout.write('{}\n');
}

main();
