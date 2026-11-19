#!/usr/bin/env node
/**
 * Antigravity Lifecycle Hook (SessionStart, PreInvocation & PostToolUse)
 * - Syncs bundle, CSS, AUTO-SYNC-STATE, and AGENTS.md via scripts/build.js --quiet
 * - Uses sync-tracker.js snapshots (.git/agent-sync/antigravity.json) to detect edits
 *   made by Claude or the user both at session startup and mid-conversation.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const tracker = require('./sync-tracker');

const AGENT = 'antigravity';
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

  const eventName = payload.hookEventName || payload.hook_event_name;

  if (eventName === 'SessionStart') {
    const diff = tracker.diffSinceLastSeen(AGENT);
    tracker.markAllSeen(AGENT);
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

    const others = tracker.formatDiff(diff);
    if (others) {
      sections.push('Các file đã bị Claude (hoặc người dùng) thay đổi kể từ phiên Antigravity trước:\n' + others);
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

  if (eventName === 'PreInvocation') {
    const diff = tracker.diffSinceLastSeen(AGENT);
    const others = tracker.formatDiff(diff);
    tracker.markAllSeen(AGENT);

    if (others) {
      process.stdout.write(JSON.stringify({
        injectSteps: [
          {
            systemMessage: {
              systemMessage:
                '[Auto-Sync] Các file sau vừa được Claude (hoặc người dùng) chỉnh sửa kể từ lượt trước:\n' +
                others +
                '\nHãy đọc lại các file này trước khi chỉnh sửa.'
            }
          }
        ]
      }) + '\n');
      return;
    }

    process.stdout.write('{}\n');
    return;
  }

  if (eventName === 'PostToolUse' || !eventName) {
    const input = (payload.toolCall && payload.toolCall.args)
      || payload.toolInput
      || payload.tool_input
      || payload.arguments
      || payload;
    const candidates = [
      input.Path,
      input.path,
      input.file_path,
      input.filePath,
      input.TargetFile,
      input.AbsolutePath,
      input.target_file
    ]
      .map((p) => tracker.toRelPath(typeof p === 'string' ? p : null))
      .filter(Boolean);
    if (candidates.length) {
      tracker.markFilesSeen(AGENT, candidates);
    }
  }

  process.stdout.write('{}\n');
}

main();
