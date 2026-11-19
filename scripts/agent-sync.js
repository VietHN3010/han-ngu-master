#!/usr/bin/env node
/**
 * agent-sync — điều phối Claude <-> Antigravity khi sửa song song.
 *
 *   node scripts/agent-sync.js status   <agent>                  Ai đang giữ file nào, file bên kia vừa sửa, ghi chú bàn giao mới
 *   node scripts/agent-sync.js claim    <agent> <file...> [-m "việc đang làm"]   Giữ file trước khi sửa
 *   node scripts/agent-sync.js check    <agent> <file...>        Exit 1 nếu file đang bị bên kia giữ
 *   node scripts/agent-sync.js release  <agent> [file...|--all]  Nhả file
 *   node scripts/agent-sync.js note     <agent> "nội dung"       Ghi chú bàn giao cho bên kia
 *   node scripts/agent-sync.js handoff  <agent> "tóm tắt"        Kết thúc lượt: ghi chú + nhả mọi file + build/test
 *
 * <agent>: claude | antigravity (alias: agy)
 * Dữ liệu lưu cục bộ trong .git/agent-sync/ (không commit).
 * File tự giữ khi agent sửa (hook) hết hạn sau 30 phút; giữ thủ công hết hạn sau 3 giờ.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const tracker = require('./sync-tracker');

const AUTO_TTL_MS = 30 * 60 * 1000;
const MANUAL_TTL_MS = 3 * 60 * 60 * 1000;
const AGENTS = ['claude', 'antigravity'];
const LABEL = { claude: 'Claude', antigravity: 'Antigravity' };

function normAgent(a) {
  const v = String(a || '').toLowerCase();
  if (v === 'agy' || v === 'ag' || v === 'gemini') return 'antigravity';
  return AGENTS.includes(v) ? v : null;
}

function other(agent) {
  return agent === 'claude' ? 'antigravity' : 'claude';
}

const claimsPath = () => path.join(tracker.stateDir(), 'claims.json');
const notesPath = () => path.join(tracker.stateDir(), 'handoff.jsonl');
const notesSeenPath = (agent) => path.join(tracker.stateDir(), `${agent}.notes-seen`);

function atomicWriteJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function loadClaims() {
  let claims = {};
  try { claims = JSON.parse(fs.readFileSync(claimsPath(), 'utf8')); } catch (e) { claims = {}; }
  const now = Date.now();
  for (const [file, c] of Object.entries(claims)) {
    const ttl = c.auto ? AUTO_TTL_MS : MANUAL_TTL_MS;
    if (!c || now - (c.updated || 0) > ttl) delete claims[file];
  }
  return claims;
}

function saveClaims(claims) {
  atomicWriteJson(claimsPath(), claims);
}

function toRel(f) {
  return tracker.toRelPath(path.resolve(tracker.APP_ROOT, f)) || f;
}

/** Claims held by the *other* agent on any of `files`. */
function conflicts(agent, files) {
  const claims = loadClaims();
  return files
    .map(toRel)
    .filter((f) => claims[f] && claims[f].agent !== agent)
    .map((f) => ({ file: f, ...claims[f] }));
}

function claim(agent, files, note, auto = false) {
  const claims = loadClaims();
  const now = Date.now();
  const taken = [];
  const blocked = [];
  for (const raw of files) {
    const f = toRel(raw);
    const cur = claims[f];
    if (cur && cur.agent !== agent) {
      blocked.push({ file: f, ...cur });
      continue;
    }
    // An auto touch never downgrades a manual claim.
    const keepManual = cur && !cur.auto && auto;
    claims[f] = {
      agent,
      note: note || (cur && cur.note) || '',
      since: (cur && cur.since) || now,
      updated: now,
      auto: keepManual ? false : auto
    };
    taken.push(f);
  }
  saveClaims(claims);
  return { taken, blocked };
}

function release(agent, files, all) {
  const claims = loadClaims();
  const released = [];
  for (const [f, c] of Object.entries(claims)) {
    if (c.agent !== agent) continue;
    if (all || files.map(toRel).includes(f)) {
      delete claims[f];
      released.push(f);
    }
  }
  saveClaims(claims);
  return released;
}

function addNote(agent, text) {
  fs.mkdirSync(tracker.stateDir(), { recursive: true });
  fs.appendFileSync(notesPath(), JSON.stringify({ agent, time: Date.now(), text }) + '\n', 'utf8');
}

function readNotes() {
  try {
    return fs.readFileSync(notesPath(), 'utf8').split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/** Notes written by the other agent that `agent` has not seen yet; marks them seen. */
function unseenNotes(agent, markSeen = true) {
  let seen = 0;
  try { seen = Number(fs.readFileSync(notesSeenPath(agent), 'utf8')) || 0; } catch (e) { seen = 0; }
  const notes = readNotes();
  const fresh = notes.filter((n) => n.agent !== agent && n.time > seen);
  if (markSeen && notes.length) {
    fs.mkdirSync(tracker.stateDir(), { recursive: true });
    fs.writeFileSync(notesSeenPath(agent), String(notes[notes.length - 1].time), 'utf8');
  }
  return fresh;
}

function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  return `${Math.round(m / 60)} giờ trước`;
}

function formatClaims(claims) {
  const rows = Object.entries(claims);
  if (!rows.length) return '  (không có file nào đang được giữ)';
  return rows
    .sort((a, b) => a[1].agent.localeCompare(b[1].agent))
    .map(([f, c]) => `  ${LABEL[c.agent].padEnd(11)} ${f}  — ${c.auto ? 'tự giữ khi sửa' : 'giữ thủ công'}, cập nhật ${ago(c.updated)}${c.note ? ` · ${c.note}` : ''}`)
    .join('\n');
}

function formatNotes(notes) {
  return notes.map((n) => `  [${LABEL[n.agent]} · ${ago(n.time)}] ${n.text}`).join('\n');
}

function statusText(agent, { markSeen = true } = {}) {
  const out = [];
  const diff = tracker.diffSinceLastSeen(agent);
  const changes = tracker.formatDiff(diff);
  out.push(`== File ${LABEL[other(agent)]}/người dùng đã sửa kể từ lần cuối ${LABEL[agent]} xem ==`);
  out.push(changes || (diff ? '  (không có)' : '  (chưa có snapshot — lần đầu chạy)'));
  out.push('');
  out.push('== File đang được giữ ==');
  out.push(formatClaims(loadClaims()));
  const fresh = unseenNotes(agent, markSeen);
  out.push('');
  out.push(`== Ghi chú bàn giao mới từ ${LABEL[other(agent)]} ==`);
  out.push(fresh.length ? formatNotes(fresh) : '  (không có)');
  const recent = readNotes().slice(-5);
  if (recent.length) {
    out.push('');
    out.push('== 5 ghi chú gần nhất ==');
    out.push(formatNotes(recent));
  }
  if (markSeen) tracker.markAllSeen(agent);
  return out.join('\n');
}

function runBuildAndTest() {
  const root = tracker.APP_ROOT;
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js'), '--quiet'], { cwd: root, stdio: 'inherit' });
    execFileSync(process.execPath, [path.join(__dirname, 'verify.js')], { cwd: root, stdio: 'inherit' });
    return true;
  } catch (e) {
    return false;
  }
}

function parseArgs(argv) {
  const files = [];
  let note = '';
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-m' || argv[i] === '--note') note = argv[++i] || '';
    else if (argv[i] === '--all') all = true;
    else files.push(argv[i]);
  }
  return { files, note, all };
}

function cli() {
  const [cmd, rawAgent, ...rest] = process.argv.slice(2);
  const agent = normAgent(rawAgent);
  if (!cmd || cmd === 'help' || !agent) {
    const src = fs.readFileSync(__filename, 'utf8');
    console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^ \* ?/gm, '').trim());
    process.exit(cmd && cmd !== 'help' ? 1 : 0);
  }
  const { files, note, all } = parseArgs(rest);

  switch (cmd) {
    case 'status':
      console.log(statusText(agent));
      break;
    case 'claim': {
      if (!files.length) { console.error('Cần ít nhất 1 file.'); process.exit(1); }
      const { taken, blocked } = claim(agent, files, note);
      if (taken.length) console.log(`${LABEL[agent]} đã giữ: ${taken.join(', ')}`);
      if (blocked.length) {
        console.error('KHÔNG giữ được (bên kia đang sửa):\n' + blocked.map((b) => `  ${b.file} — ${LABEL[b.agent]}, ${ago(b.updated)}${b.note ? ` · ${b.note}` : ''}`).join('\n'));
        process.exit(1);
      }
      break;
    }
    case 'check': {
      const c = conflicts(agent, files);
      if (c.length) {
        console.error('Đang bị bên kia giữ:\n' + c.map((b) => `  ${b.file} — ${LABEL[b.agent]}, ${ago(b.updated)}${b.note ? ` · ${b.note}` : ''}`).join('\n'));
        process.exit(1);
      }
      console.log('OK: không có xung đột.');
      break;
    }
    case 'release': {
      const r = release(agent, files, all || !files.length);
      console.log(r.length ? `Đã nhả: ${r.join(', ')}` : 'Không có file nào để nhả.');
      break;
    }
    case 'note':
      if (!files.length) { console.error('Thiếu nội dung ghi chú.'); process.exit(1); }
      addNote(agent, files.join(' '));
      console.log('Đã ghi chú bàn giao.');
      break;
    case 'handoff': {
      const ok = runBuildAndTest();
      const summary = files.join(' ') || note;
      if (summary) addNote(agent, (ok ? '' : '[BUILD/TEST LỖI] ') + summary);
      const r = release(agent, [], true);
      tracker.markAllSeen(agent);
      console.log(`\n${ok ? '✅ Build & test OK.' : '❌ Build/test LỖI — xem log phía trên.'}`);
      console.log(r.length ? `Đã nhả: ${r.join(', ')}` : 'Không có file nào đang giữ.');
      if (!ok) process.exit(1);
      break;
    }
    default:
      console.error(`Lệnh không hợp lệ: ${cmd}`);
      process.exit(1);
  }
}

module.exports = { claim, release, conflicts, addNote, unseenNotes, formatNotes, statusText, LABEL, other };

if (require.main === module) cli();
