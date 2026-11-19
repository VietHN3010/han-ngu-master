#!/usr/bin/env node
/**
 * Build, Sync & Validation Pipeline for Hán Ngữ Master
 * - Guards against accidental direct edits to app.bundle.js
 * - Bidirectionally syncs style.css <-> <style> in index.html
 * - Bundles src/*.js -> app.bundle.js
 * - Validates syntax across src/*.js, app.bundle.js, and api/*.js via vm.Script
 * - Updates content-hash cache-busting versions in index.html and sw.js
 * - Keeps AGENTS.md synced as a regular file copy of CLAUDE.md
 *
 * Usage:
 *   node scripts/build.js          # Build & sync all artifacts
 *   node scripts/build.js --quiet  # Suppress informational output (for hooks)
 *   node scripts/build.js --force  # Override direct-edit guard on app.bundle.js
 *   node scripts/build.js --check  # Verify syntax & sync state without writing files
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PARENT_ROOT = path.resolve(ROOT, '..');
const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const isForce = args.includes('--force');
const isQuiet = args.includes('--quiet');

function log(msg) {
  if (!isQuiet) console.log(msg);
}

// Curriculum data ships as its own bundle: it rarely changes, so browsers keep it cached
// while app code updates.
const DATA_FILES = ['src/data.js', 'src/data-hsk3.js', 'src/notes.js'];
const SRC_FILES = [
  'src/storage.js',
  'src/audio.js',
  'src/ui.js',
  'src/writer.js',
  'src/flashcard.js',
  'src/quiz.js',
  'src/grammar.js',
  'src/grammar-hsk3.js',
  'src/match.js',
  'src/lessons.js',
  'src/dictionary.js',
  'src/pinyin.js',
  'src/review.js',
  'src/tones.js',
  'src/guide.js',
  'src/app.js'
];

const BUNDLE_FILE = 'app.bundle.js';
const DATA_BUNDLE_FILE = 'data.bundle.js';
const INDEX_FILE = 'index.html';
const STYLE_FILE = 'style.css';
const SW_FILE = 'sw.js';
const CLAUDE_FILE = 'CLAUDE.md';
const AGENTS_FILE = 'AGENTS.md';
const API_FILES = ['api/tts.js'];

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// Write via temp file + rename so the other agent never reads a half-written file.
function atomicWrite(fullPath, content) {
  const tmp = `${fullPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, fullPath);
}

function writeIfChanged(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
  if (existing === content) return false;
  atomicWrite(fullPath, content);
  return true;
}

// Cross-process lock: Claude and Antigravity hooks may run build.js at the same time.
function acquireBuildLock() {
  let lockBase = path.join(ROOT, '.git');
  try {
    if (!fs.statSync(lockBase).isDirectory()) lockBase = require('os').tmpdir();
  } catch (e) {
    lockBase = require('os').tmpdir();
  }
  const lockDir = path.join(lockBase, 'han-ngu-master-build.lock');
  const started = Date.now();
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') return; // cannot lock (read-only FS) -> proceed unlocked
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > 30000) {
          fs.rmSync(lockDir, { recursive: true, force: true }); // stale lock from a crashed build
          continue;
        }
      } catch (_) {
        continue;
      }
      if (Date.now() - started > 12000) {
        console.error(`ERROR: another build is still running (lock: ${lockDir}). Retry in a moment.`);
        process.exit(1);
      }
      sleep(100);
    }
  }
  process.on('exit', () => {
    try { fs.rmdirSync(lockDir); } catch (_) { /* already released */ }
  });
}

function validateSyntax(code, filename) {
  try {
    new vm.Script(code, { filename });
  } catch (err) {
    console.error(`Syntax error in ${filename}: ${err.message}`);
    process.exit(1);
  }
}

function runGit(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (e) {
    return '';
  }
}

function getGitChangedFiles() {
  const status = runGit('git status --porcelain');
  if (!status) return [];
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/^.* -> /, ''));
}

function checkDirectBundleEditGuard() {
  const changed = getGitChangedFiles();
  if (!changed.length) return;

  const bundleModified = changed.some((f) => f === BUNDLE_FILE);
  const srcModified = changed.some((f) => f.startsWith('src/'));

  if (bundleModified && !srcModified && !isForce) {
    console.error(
      `ERROR: "${BUNDLE_FILE}" has direct modifications in git working tree while no file in "src/" is modified.\n` +
      `Never edit "${BUNDLE_FILE}" directly because it is generated from "src/*.js".\n` +
      `Port your changes into "src/" or pass "--force" if you intentionally want to overwrite "${BUNDLE_FILE}".`
    );
    process.exit(1);
  }
}

function extractHtmlStyle(htmlContent) {
  const match = htmlContent.match(/<style>\r?\n([\s\S]*?)\r?\n([ \t]*)<\/style>/);
  if (!match) {
    throw new Error('Could not find <style>...</style> block inside index.html');
  }
  return {
    fullMatch: match[0],
    css: match[1],
    closingIndent: match[2]
  };
}

function normalizeCss(css) {
  return css.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function syncCss(indexContent) {
  const stylePath = path.join(ROOT, STYLE_FILE);
  const indexPath = path.join(ROOT, INDEX_FILE);
  const styleBlock = extractHtmlStyle(indexContent);
  const htmlCss = normalizeCss(styleBlock.css);
  const styleExists = fs.existsSync(stylePath);
  const styleCss = styleExists ? normalizeCss(readUtf8(STYLE_FILE)) : '';

  if (htmlCss === styleCss) {
    return { indexContent, styleCss, synced: false, direction: null };
  }

  let extractToStyle = !styleExists;
  if (styleExists) {
    const changed = getGitChangedFiles();
    const styleModified = changed.includes(STYLE_FILE);
    const indexModified = changed.includes(INDEX_FILE);

    if (styleModified && !indexModified) {
      extractToStyle = false;
    } else if (indexModified && !styleModified) {
      extractToStyle = true;
    } else {
      const htmlStat = fs.statSync(indexPath);
      const styleStat = fs.statSync(stylePath);
      extractToStyle = htmlStat.mtimeMs > styleStat.mtimeMs;
    }
  }

  if (extractToStyle) {
    // Extract inline <style> from index.html -> style.css
    if (!isCheck) {
      writeIfChanged(STYLE_FILE, htmlCss);
    }
    return { indexContent, styleCss: htmlCss, synced: true, direction: 'index.html -> style.css' };
  } else {
    // Inject style.css -> inline <style> in index.html
    const replacement = `<style>\n${styleCss.trimEnd()}\n${styleBlock.closingIndent}</style>`;
    const updatedIndex = indexContent.replace(styleBlock.fullMatch, () => replacement);
    return { indexContent: updatedIndex, styleCss, synced: true, direction: 'style.css -> index.html' };
  }
}

function updateAutoSyncState(versionTag) {
  const claudePath = path.join(ROOT, CLAUDE_FILE);
  if (!fs.existsSync(claudePath)) return false;

  const claudeContent = fs.readFileSync(claudePath, 'utf8');
  const startMarker = '<!-- AUTO-SYNC-STATE:START -->';
  const endMarker = '<!-- AUTO-SYNC-STATE:END -->';
  const startIdx = claudeContent.indexOf(startMarker);
  const endIdx = claudeContent.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return false;

  const targetPaths = '-- src/ style.css index.html api/';
  const dirtyStat = runGit(`git diff HEAD --stat ${targetPaths}`);
  const dirtyNames = runGit(`git diff HEAD --name-only ${targetPaths}`);
  const untrackedNames = runGit('git ls-files --others --exclude-standard -- src/ api/');

  let sourceSummary = '';
  let fileList = [];
  let statLines = [];

  if (dirtyStat || dirtyNames || untrackedNames) {
    sourceSummary = 'Thay đổi đang thực hiện trong working tree (chưa commit)';
    const combined = [
      ...dirtyNames.split(/\r?\n/),
      ...untrackedNames.split(/\r?\n/)
    ].map((s) => s.trim()).filter(Boolean);
    fileList = Array.from(new Set(combined)).sort();
    statLines = dirtyStat ? dirtyStat.split(/\r?\n/).filter(Boolean) : [];
  } else {
    const commitSubject = runGit(`git log -1 --format="%s" ${targetPaths}`) || 'Khởi tạo dự án';
    const commitNames = runGit(`git log -1 --name-only --format="" ${targetPaths}`);
    const commitStat = runGit(`git log -1 --stat --format="" ${targetPaths}`);
    sourceSummary = `Commit gần nhất: ${commitSubject}`;
    fileList = Array.from(new Set(commitNames.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)));
    statLines = commitStat ? commitStat.split(/\r?\n/).filter(Boolean) : [];
  }

  if (statLines.length > 20) {
    statLines = [...statLines.slice(0, 20), '... (truncated)'];
  }

  const filesText = fileList.length ? fileList.map((f) => `\`${f}\``).join(', ') : '_Không có thay đổi nguồn_';
  const blockLines = [
    startMarker,
    `- **Build Tag:** \`${versionTag}\``,
    `- **Trạng thái nguồn:** ${sourceSummary}`,
    `- **Các file nguồn liên quan:** ${filesText}`
  ];
  if (statLines.length) {
    blockLines.push('```text');
    blockLines.push(...statLines);
    blockLines.push('```');
  }
  blockLines.push(endMarker);

  const before = claudeContent.slice(0, startIdx);
  const after = claudeContent.slice(endIdx + endMarker.length);
  const nextClaude = before + blockLines.join('\n') + after;

  if (nextClaude === claudeContent) return false;
  atomicWrite(claudePath, nextClaude);
  return true;
}

function mirrorToParentWorkspace(claudeContent) {
  try {
    if (PARENT_ROOT === ROOT || !fs.existsSync(PARENT_ROOT)) return;
    fs.accessSync(PARENT_ROOT, fs.constants.W_OK);
    for (const filename of [CLAUDE_FILE, AGENTS_FILE]) {
      const target = path.join(PARENT_ROOT, filename);
      const existing = fs.existsSync(target) && !fs.lstatSync(target).isSymbolicLink()
        ? fs.readFileSync(target, 'utf8')
        : null;
      if (existing !== claudeContent) {
        atomicWrite(target, claudeContent);
      }
    }
  } catch (e) {
    // Parent directory not writable (e.g., isolated CI container); skip safely
  }
}

function syncAgentsFile() {
  const claudePath = path.join(ROOT, CLAUDE_FILE);
  const agentsPath = path.join(ROOT, AGENTS_FILE);
  if (!fs.existsSync(claudePath)) return false;

  const claudeContent = fs.readFileSync(claudePath, 'utf8');
  let changed = false;

  if (fs.existsSync(agentsPath)) {
    const stat = fs.lstatSync(agentsPath);
    if (stat.isSymbolicLink()) {
      if (isCheck) return true; // mismatch in --check mode
      fs.unlinkSync(agentsPath);
      changed = true;
    } else {
      const agentsContent = fs.readFileSync(agentsPath, 'utf8');
      if (agentsContent !== claudeContent) {
        if (isCheck) return true;
        changed = true;
      }
    }
  } else {
    if (isCheck) return true;
    changed = true;
  }

  if (!isCheck) {
    if (changed) {
      atomicWrite(agentsPath, claudeContent);
    }
    mirrorToParentWorkspace(claudeContent);
  }
  return changed;
}

function run() {
  if (!isCheck) {
    acquireBuildLock();
    checkDirectBundleEditGuard();
  }

  // 1. Validate individual src/*.js & api/*.js syntax
  const dataParts = [];
  for (const rel of DATA_FILES) {
    const content = readUtf8(rel);
    validateSyntax(content, rel);
    dataParts.push(content.endsWith('\n') ? content : content + '\n');
  }
  const expectedDataBundle = dataParts.join('');
  validateSyntax(expectedDataBundle, DATA_BUNDLE_FILE);

  const parts = [];
  for (const rel of SRC_FILES) {
    const content = readUtf8(rel);
    validateSyntax(content, rel);
    parts.push(content.endsWith('\n') ? content : content + '\n');
  }
  for (const rel of API_FILES) {
    if (fs.existsSync(path.join(ROOT, rel))) {
      validateSyntax(readUtf8(rel), rel);
    }
  }

  // 2. Concatenate and validate app.bundle.js
  const expectedBundle = parts.join('');
  validateSyntax(expectedBundle, BUNDLE_FILE);

  // 3. Read & sync index.html <-> style.css
  let indexContent = readUtf8(INDEX_FILE);
  const cssSync = syncCss(indexContent);
  indexContent = cssSync.indexContent;

  // 4. Compute deterministic content-hash cache tag
  const hash = crypto
    .createHash('sha256')
    .update(expectedDataBundle)
    .update(expectedBundle)
    .update(cssSync.styleCss)
    .digest('hex')
    .slice(0, 8);
  const versionTag = `v13-${hash}`;

  if (isCheck) {
    const errors = [];
    const currentBundle = fs.existsSync(path.join(ROOT, BUNDLE_FILE)) ? readUtf8(BUNDLE_FILE) : '';
    if (currentBundle !== expectedBundle) {
      errors.push(`${BUNDLE_FILE} is out of sync with src/*.js (run npm run build).`);
    }
    const currentData = fs.existsSync(path.join(ROOT, DATA_BUNDLE_FILE)) ? readUtf8(DATA_BUNDLE_FILE) : '';
    if (currentData !== expectedDataBundle) {
      errors.push(`${DATA_BUNDLE_FILE} is out of sync with src/data.js (run npm run build).`);
    }
    if (!indexContent.includes(`data.bundle.js?v=${versionTag}`)) {
      errors.push(`index.html data bundle cache tag is not ${versionTag}.`);
    }
    if (cssSync.synced) {
      errors.push(`style.css and index.html <style> differ (${cssSync.direction}).`);
    }
    if (!indexContent.includes(`app.bundle.js?v=${versionTag}`)) {
      errors.push(`index.html script cache tag is not ${versionTag}.`);
    }
    const swContent = readUtf8(SW_FILE);
    if (!swContent.includes(`'han-ngu-master-${versionTag}'`)) {
      errors.push(`sw.js CACHE_NAME is not 'han-ngu-master-${versionTag}'.`);
    }
    const claudeContent = fs.existsSync(path.join(ROOT, CLAUDE_FILE)) ? readUtf8(CLAUDE_FILE) : '';
    if (!claudeContent.includes('<!-- AUTO-SYNC-STATE:START -->') || !claudeContent.includes(`\`${versionTag}\``)) {
      errors.push(`CLAUDE.md AUTO-SYNC-STATE is missing or does not match ${versionTag}.`);
    }
    const agentsPath = path.join(ROOT, AGENTS_FILE);
    if (!fs.existsSync(agentsPath) || fs.lstatSync(agentsPath).isSymbolicLink() || readUtf8(AGENTS_FILE) !== claudeContent) {
      errors.push('AGENTS.md must be a regular file synced with CLAUDE.md.');
    }

    if (errors.length > 0) {
      console.error('Check failed:\n - ' + errors.join('\n - '));
      process.exit(1);
    }
    log(`OK: All syntax, bundle, CSS, cache tag (${versionTag}), and docs checks passed.`);
    return;
  }

  // Write updated app.bundle.js
  const bundleUpdated = writeIfChanged(BUNDLE_FILE, expectedBundle);
  const dataBundleUpdated = writeIfChanged(DATA_BUNDLE_FILE, expectedDataBundle);

  // Update cache-busting tag in index.html
  indexContent = indexContent.replace(
    /<!-- Application Bundle \(Cache busted [^)]+\) -->/,
    `<!-- Application Bundle (Cache busted ${versionTag}) -->`
  );
  indexContent = indexContent.replace(
    /app\.bundle\.js\?v=[^"]+/,
    `app.bundle.js?v=${versionTag}`
  );
  indexContent = indexContent.replace(
    /data\.bundle\.js\?v=[^"]+/,
    `data.bundle.js?v=${versionTag}`
  );
  const indexUpdated = writeIfChanged(INDEX_FILE, indexContent);

  // Update cache-busting tag in sw.js
  let swContent = readUtf8(SW_FILE);
  swContent = swContent.replace(
    / \* Version: [^\s(]+/,
    ` * Version: ${versionTag}`
  );
  swContent = swContent.replace(
    /const CACHE_NAME = '[^']+';/,
    `const CACHE_NAME = 'han-ngu-master-${versionTag}';`
  );
  const swUpdated = writeIfChanged(SW_FILE, swContent);

  // Update AUTO-SYNC-STATE in CLAUDE.md, sync AGENTS.md and mirror to parent root
  const claudeUpdated = updateAutoSyncState(versionTag);
  const agentsUpdated = syncAgentsFile();

  log(`Build complete (${versionTag}):`);
  log(` - ${BUNDLE_FILE}: ${bundleUpdated ? 'updated' : 'unchanged'}`);
  log(` - ${DATA_BUNDLE_FILE}: ${dataBundleUpdated ? 'updated' : 'unchanged'}`);
  log(` - ${STYLE_FILE}/${INDEX_FILE} CSS: ${cssSync.synced ? cssSync.direction : 'already in sync'}`);
  log(` - ${INDEX_FILE}: ${indexUpdated ? 'updated' : 'unchanged'}`);
  log(` - ${SW_FILE}: ${swUpdated ? 'updated' : 'unchanged'}`);
  log(` - ${CLAUDE_FILE} AUTO-SYNC-STATE: ${claudeUpdated ? 'updated' : 'unchanged'}`);
  log(` - ${AGENTS_FILE}: ${agentsUpdated ? 'synced from CLAUDE.md' : 'unchanged'}`);
}

run();
