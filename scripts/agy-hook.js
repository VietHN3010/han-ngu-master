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
const sync = require('./agent-sync');

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

function coordinationText() {
  const parts = [];
  const held = sync.conflicts(AGENT, Object.keys(tracker.takeSnapshot()).concat(['CLAUDE.md']));
  if (held.length) {
    parts.push('[Auto-Sync] Claude đang giữ (đang sửa) các file sau — KHÔNG sửa chúng, hãy làm file khác hoặc hỏi người dùng:\n' +
      held.map((c) => `  ${c.file}${c.note ? ` · ${c.note}` : ''}`).join('\n'));
  }
  const fresh = sync.unseenNotes(AGENT);
  if (fresh.length) parts.push('[Auto-Sync] Ghi chú bàn giao mới từ Claude:\n' + sync.formatNotes(fresh));
  return parts.join('\n\n');
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

    const coord = coordinationText();
    if (coord) sections.push(coord);
    sections.push('Trước khi sửa file: `node scripts/agent-sync.js check antigravity <file>`; xong việc: `node scripts/agent-sync.js handoff antigravity "tóm tắt"` (workflow /sync, /handoff).');
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
    const coord = coordinationText();

    if (others || coord) {
      process.stdout.write(JSON.stringify({
        injectSteps: [
          {
            systemMessage: {
              systemMessage:
                [
                  others ? '[Auto-Sync] Các file sau vừa được Claude (hoặc người dùng) chỉnh sửa kể từ lượt trước:\n' +
                    others + '\nHãy đọc lại các file này trước khi chỉnh sửa.' : '',
                  coord
                ].filter(Boolean).join('\n\n')
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
    let edited = candidates;
    if (!edited.length) {
      // Payload without a path: files Antigravity hasn't seen AND Claude hasn't seen were edited by Antigravity.
      const agyDiff = tracker.diffSinceLastSeen(AGENT);
      const claudeDiff = tracker.diffSinceLastSeen('claude');
      if (agyDiff && claudeDiff) {
        const byClaudeUnseen = new Set([...claudeDiff.changed, ...claudeDiff.added]);
        edited = [...agyDiff.changed, ...agyDiff.added].filter((f) => byClaudeUnseen.has(f));
      }
    }
    if (edited.length) {
      tracker.markFilesSeen(AGENT, edited);
      sync.claim(AGENT, edited, '', true);
    }
  }

  process.stdout.write('{}\n');
}

main();
