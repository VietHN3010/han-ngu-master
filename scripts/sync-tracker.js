/**
 * Shared change tracker for parallel Claude <-> Antigravity editing.
 *
 * Each agent keeps its own snapshot (file -> content hash) in .git/agent-sync/<agent>.json
 * (never committed). Comparing the current working tree against that snapshot tells an
 * agent which files were changed by *someone else* (the other agent or the user) since
 * it last looked — so it can re-read them before editing.
 *
 * Generated noise is ignored: app.bundle.js, CLAUDE.md/AGENTS.md and the cache-busting
 * tags inside index.html / sw.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_ROOT = path.resolve(__dirname, '..');

const TRACKED_DIRS = ['src', 'api', 'scripts'];
const TRACKED_FILES = ['index.html', 'style.css', 'sw.js', 'manifest.json', 'vercel.json', 'package.json'];
const IGNORED_EXT = /\.(pyc|log)$/;

function stateDir() {
  const gitDir = path.join(APP_ROOT, '.git');
  try {
    if (fs.statSync(gitDir).isDirectory()) return path.join(gitDir, 'agent-sync');
  } catch (e) { /* no .git dir */ }
  return path.join(require('os').tmpdir(), 'han-ngu-master-agent-sync');
}

function listTrackedFiles() {
  const out = [];
  const walk = (rel) => {
    let entries;
    try { entries = fs.readdirSync(path.join(APP_ROOT, rel), { withFileTypes: true }); } catch (e) { return; }
    for (const ent of entries) {
      if (ent.name.startsWith('.') || ent.name === '__pycache__' || ent.name === 'node_modules') continue;
      const child = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(child);
      else if (ent.isFile() && !IGNORED_EXT.test(ent.name)) out.push(child);
    }
  };
  TRACKED_DIRS.forEach(walk);
  for (const f of TRACKED_FILES) {
    if (fs.existsSync(path.join(APP_ROOT, f))) out.push(f);
  }
  return out.sort();
}

function normalize(rel, content) {
  if (rel === 'index.html') {
    return content
      .replace(/app\.bundle\.js\?v=[^"]+/g, 'app.bundle.js?v=X')
      .replace(/<!-- Application Bundle \(Cache busted [^)]+\) -->/g, '');
  }
  if (rel === 'sw.js') {
    return content
      .replace(/ \* Version: \S+/g, '')
      .replace(/const CACHE_NAME = '[^']+';/g, '');
  }
  return content;
}

function hashFile(rel) {
  try {
    const content = fs.readFileSync(path.join(APP_ROOT, rel), 'utf8');
    return crypto.createHash('sha1').update(normalize(rel, content)).digest('hex');
  } catch (e) {
    return null;
  }
}

function takeSnapshot() {
  const snap = {};
  for (const rel of listTrackedFiles()) {
    const h = hashFile(rel);
    if (h) snap[rel] = h;
  }
  return snap;
}

function snapshotPath(agent) {
  return path.join(stateDir(), `${agent}.json`);
}

function loadSnapshot(agent) {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath(agent), 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveSnapshot(agent, snap) {
  try {
    fs.mkdirSync(stateDir(), { recursive: true });
    const target = snapshotPath(agent);
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snap), 'utf8');
    fs.renameSync(tmp, target);
  } catch (e) { /* best effort */ }
}

/** Files changed since `agent` last synced: { changed, added, removed }. null when no snapshot yet. */
function diffSinceLastSeen(agent, current = takeSnapshot()) {
  const prev = loadSnapshot(agent);
  if (!prev) return null;
  const changed = [];
  const added = [];
  const removed = [];
  for (const [rel, h] of Object.entries(current)) {
    if (!(rel in prev)) added.push(rel);
    else if (prev[rel] !== h) changed.push(rel);
  }
  for (const rel of Object.keys(prev)) {
    if (!(rel in current)) removed.push(rel);
  }
  return { changed, added, removed };
}

/** Mark everything as seen by `agent`. */
function markAllSeen(agent, current = takeSnapshot()) {
  saveSnapshot(agent, current);
}

/**
 * Mark only the files `agent` itself just edited (plus the files the build derives from
 * them) as seen, so concurrent edits by the other agent are still reported later.
 */
function markFilesSeen(agent, relPaths) {
  const prev = loadSnapshot(agent);
  if (!prev) {
    markAllSeen(agent);
    return;
  }
  const set = new Set(relPaths);
  // style.css <-> index.html are synced by build.js, so editing one rewrites the other.
  if (set.has('style.css') || set.has('index.html')) {
    set.add('style.css');
    set.add('index.html');
  }
  for (const rel of set) {
    const h = hashFile(rel);
    if (h) prev[rel] = h;
    else delete prev[rel];
  }
  saveSnapshot(agent, prev);
}

function toRelPath(filePath) {
  if (!filePath) return null;
  const abs = path.resolve(filePath);
  const rel = path.relative(APP_ROOT, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

function formatDiff(diff) {
  if (!diff) return '';
  const lines = [];
  diff.changed.forEach((f) => lines.push(`  M ${f}`));
  diff.added.forEach((f) => lines.push(`  A ${f}`));
  diff.removed.forEach((f) => lines.push(`  D ${f}`));
  return lines.join('\n');
}

module.exports = {
  APP_ROOT,
  takeSnapshot,
  diffSinceLastSeen,
  markAllSeen,
  markFilesSeen,
  toRelPath,
  formatDiff
};
