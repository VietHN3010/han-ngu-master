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
 *   node scripts/build.js --force  # Override direct-edit guard on app.bundle.js
 *   node scripts/build.js --check  # Verify syntax & sync state without writing files
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const isForce = args.includes('--force');

const SRC_FILES = [
  'src/data.js',
  'src/storage.js',
  'src/audio.js',
  'src/writer.js',
  'src/flashcard.js',
  'src/quiz.js',
  'src/grammar.js',
  'src/match.js',
  'src/lessons.js',
  'src/dictionary.js',
  'src/pinyin.js',
  'src/app.js'
];

const BUNDLE_FILE = 'app.bundle.js';
const INDEX_FILE = 'index.html';
const STYLE_FILE = 'style.css';
const SW_FILE = 'sw.js';
const CLAUDE_FILE = 'CLAUDE.md';
const AGENTS_FILE = 'AGENTS.md';
const API_FILES = ['api/tts.js'];

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeIfChanged(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
  if (existing === content) return false;
  fs.writeFileSync(fullPath, content, 'utf8');
  return true;
}

function validateSyntax(code, filename) {
  try {
    new vm.Script(code, { filename });
  } catch (err) {
    console.error(`Syntax error in ${filename}: ${err.message}`);
    process.exit(1);
  }
}

function getGitChangedFiles() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return status
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.slice(3).trim().replace(/^.* -> /, ''));
  } catch (e) {
    return [];
  }
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

function syncAgentsFile() {
  const claudePath = path.join(ROOT, CLAUDE_FILE);
  const agentsPath = path.join(ROOT, AGENTS_FILE);
  if (!fs.existsSync(claudePath)) return false;

  const claudeContent = fs.readFileSync(claudePath, 'utf8');
  if (fs.existsSync(agentsPath)) {
    const stat = fs.lstatSync(agentsPath);
    if (stat.isSymbolicLink()) {
      if (isCheck) return true; // mismatch in --check mode
      fs.unlinkSync(agentsPath);
    } else {
      const agentsContent = fs.readFileSync(agentsPath, 'utf8');
      if (agentsContent === claudeContent) return false;
      if (isCheck) return true;
    }
  } else if (isCheck) {
    return true;
  }

  if (!isCheck) {
    fs.writeFileSync(agentsPath, claudeContent, 'utf8');
  }
  return true;
}

function run() {
  if (!isCheck) {
    checkDirectBundleEditGuard();
  }

  // 1. Validate individual src/*.js & api/*.js syntax
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
    const agentsPath = path.join(ROOT, AGENTS_FILE);
    if (!fs.existsSync(agentsPath) || fs.lstatSync(agentsPath).isSymbolicLink() || readUtf8(AGENTS_FILE) !== readUtf8(CLAUDE_FILE)) {
      errors.push('AGENTS.md must be a regular file synced with CLAUDE.md.');
    }

    if (errors.length > 0) {
      console.error('Check failed:\n - ' + errors.join('\n - '));
      process.exit(1);
    }
    console.log(`OK: All syntax, bundle, CSS, cache tag (${versionTag}), and docs checks passed.`);
    return;
  }

  // Write updated app.bundle.js
  const bundleUpdated = writeIfChanged(BUNDLE_FILE, expectedBundle);

  // Update cache-busting tag in index.html
  indexContent = indexContent.replace(
    /<!-- Application Bundle \(Cache busted [^)]+\) -->/,
    `<!-- Application Bundle (Cache busted ${versionTag}) -->`
  );
  indexContent = indexContent.replace(
    /app\.bundle\.js\?v=[^"]+/,
    `app.bundle.js?v=${versionTag}`
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

  // Sync AGENTS.md from CLAUDE.md
  const agentsUpdated = syncAgentsFile();

  console.log(`Build complete (${versionTag}):`);
  console.log(` - ${BUNDLE_FILE}: ${bundleUpdated ? 'updated' : 'unchanged'}`);
  console.log(` - ${STYLE_FILE}/${INDEX_FILE} CSS: ${cssSync.synced ? cssSync.direction : 'already in sync'}`);
  console.log(` - ${INDEX_FILE}: ${indexUpdated ? 'updated' : 'unchanged'}`);
  console.log(` - ${SW_FILE}: ${swUpdated ? 'updated' : 'unchanged'}`);
  console.log(` - ${AGENTS_FILE}: ${agentsUpdated ? 'synced from CLAUDE.md' : 'unchanged'}`);
}

run();
