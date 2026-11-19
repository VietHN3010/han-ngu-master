#!/usr/bin/env node
/**
 * Claude Code lifecycle hook for parallel Claude <-> Antigravity editing.
 *
 *   SessionStart     -> build/sync, then inject git status, recent commits and the files
 *                       changed by others since Claude's previous session.
 *   UserPromptSubmit -> if Antigravity (or the user) changed files since Claude last looked,
 *                       inject the list so Claude re-reads them before editing.
 *   PostToolUse      -> run scripts/build.js --quiet; on failure exit 2 so Claude sees the
 *                       error (e.g. a syntax error) and fixes it. Marks Claude's own edit as seen.
 *
 * stdout of SessionStart / UserPromptSubmit is added to Claude's context.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const tracker = require('./sync-tracker');

const AGENT = 'claude';
const APP_ROOT = tracker.APP_ROOT;

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw && raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function runGit(cmd) {
  try {
    return execSync(cmd, { cwd: APP_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return '';
  }
}

function runBuild() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--quiet'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return null;
  } catch (e) {
    return (e.stderr || e.stdout || e.message || 'build failed').toString().trim();
  }
}

function othersChangedText(diff) {
  if (!diff) return '';
  const body = tracker.formatDiff(diff);
  if (!body) return '';
  return (
    '[Auto-Sync] Các file sau đã bị thay đổi bởi Antigravity (hoặc người dùng) kể từ lần cuối Claude xem:\n' +
    body +
    '\nHãy đọc lại các file này (hoặc `git diff`) trước khi chỉnh sửa để không ghi đè thay đổi của bên kia.'
  );
}

function onSessionStart() {
  const buildErr = runBuild();
  const diff = tracker.diffSinceLastSeen(AGENT);
  tracker.markAllSeen(AGENT);

  const sections = ['[Auto-Sync Claude <-> Antigravity] Trạng thái mới nhất của chinese-app:'];
  const status = runGit('git status -s');
  sections.push(status ? 'Working tree (git status -s):\n' + status : 'Working tree: clean.');
  const commits = runGit('git log -n 3 --format="%h %an %ar: %s" --stat');
  if (commits) sections.push('3 commit gần nhất:\n' + commits);
  const others = othersChangedText(diff);
  if (others) sections.push(others);
  if (buildErr) sections.push('⚠️ build.js đang lỗi:\n' + buildErr);
  process.stdout.write(sections.join('\n\n') + '\n');
}

function onUserPromptSubmit() {
  const diff = tracker.diffSinceLastSeen(AGENT);
  tracker.markAllSeen(AGENT);
  const text = othersChangedText(diff);
  if (text) process.stdout.write(text + '\n');
}

function onPostToolUse(payload) {
  const input = payload.tool_input || {};
  const rel = tracker.toRelPath(input.file_path || input.notebook_path);
  const buildErr = runBuild();
  if (rel) tracker.markFilesSeen(AGENT, [rel]);
  if (buildErr) {
    process.stderr.write(`[Auto-Sync] scripts/build.js thất bại sau khi sửa ${rel || 'file'}:\n${buildErr}\n`);
    process.exit(2);
  }
}

const payload = readStdin();
switch (payload.hook_event_name) {
  case 'SessionStart':
    onSessionStart();
    break;
  case 'UserPromptSubmit':
    onUserPromptSubmit();
    break;
  case 'PostToolUse':
    onPostToolUse(payload);
    break;
  default:
    runBuild();
}
