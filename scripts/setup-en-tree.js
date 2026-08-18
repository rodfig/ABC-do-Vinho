'use strict';
/**
 * setup-en-tree.js
 * Creates the /en/ parallel HTML tree from PT source files.
 *
 * ABC do Vinho has a fixed 2-level structure: root index.html (landing) +
 * one moduloN/index.html per module. Unlike Vinhos do Mundo's arbitrary-depth
 * tree, root files have zero '../' prefixes (need one added) while module
 * files already have one '../' level (needs bumping to '../../').
 *
 * Per file:
 *   1. Copies to en/{same-path} with asset paths adjusted for the extra
 *      '/en' depth level
 *   2. Injects PT<->EN toggle anchor into the EN copy
 *   3. Injects EN toggle anchor into the PT source file
 *
 * Usage:
 *   node scripts/setup-en-tree.js             full run
 *   node scripts/setup-en-tree.js --dry-run   preview without writing
 *   node scripts/setup-en-tree.js --no-pt     skip PT source edits
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const EN_DIR = path.join(ROOT, 'en');
const DRY    = process.argv.includes('--dry-run');
const NO_PT  = process.argv.includes('--no-pt');

// ── File collection ─────────────────────────────────────────────────────────
// Root index.html (depth 0) + moduloN/index.html (depth 1). Nothing deeper.

function collectFiles() {
  const files = ['index.html'];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isDirectory() && /^modulo\d+$/.test(entry.name)) {
      const idx = path.join(ROOT, entry.name, 'index.html');
      if (fs.existsSync(idx)) files.push(`${entry.name}/index.html`);
    }
  }
  return files.sort();
}

// ── HTML transformations ────────────────────────────────────────────────────

// Root index.html's only relative links are shared-asset refs (css/js/img) and
// same-tree module links ("modulo1/", ...). Only the former point outside the
// /en/ tree and need a '../' prefix — module links stay relative-correct as-is
// since en/modulo1/ mirrors modulo1/ at the same depth.
function adjustPathsRoot(html) {
  return html.replace(/\b((?:src|href)=")(css|js|img|fonts)\//g, (_, attr, dir) => `${attr}../${dir}/`);
}

function adjustPathsModule(html) {
  return html.replace(/\b((?:src|href)=")(\.\.\/)/g, (_, attr, up) => `${attr}../${up}`);
}

// The "topbar-back" breadcrumb ("../") over-adjusts to the PT root once
// bumped to "../../" — pin it to the absolute EN root instead so it keeps
// the visitor inside the /en/ tree.
function fixBackLink(html) {
  return html.replace(
    /(<a\b[^>]*\bclass="topbar-back"[^>]*\bhref=")(\.\.\/)+"/,
    '$1/en/"'
  );
}

// Inject a language toggle anchor before </body> (idempotent).
function injectToggle(html, href, label) {
  if (html.includes('id="lang-toggle"')) return html;
  return html.replace('</body>', `<a id="lang-toggle" href="${href}">${label}</a>\n</body>`);
}

// ── Main ────────────────────────────────────────────────────────────────────

const files = collectFiles();

console.log(`${DRY ? '[DRY RUN] ' : ''}${files.length} HTML files found\n`);

let enCreated = 0;
let ptEdited  = 0;

for (const rel of files) {
  const isRoot = rel === 'index.html';
  const dirFwd = rel.replace(/[^/]+$/, '');   // '' for root, 'modulo1/' for modules
  const enUrl  = '/en/' + dirFwd + '?setlang=en';
  const ptUrl  = '/' + dirFwd + '?setlang=pt';

  const srcPath = path.join(ROOT, rel);
  const enPath  = path.join(EN_DIR, rel);
  const src     = fs.readFileSync(srcPath, 'utf8');

  // ── EN copy ──────────────────────────────────────────────────────────────
  let enHtml = isRoot ? adjustPathsRoot(src) : fixBackLink(adjustPathsModule(src));
  enHtml = injectToggle(enHtml, ptUrl, 'PT');

  if (!DRY) {
    fs.mkdirSync(path.dirname(enPath), { recursive: true });
    fs.writeFileSync(enPath, enHtml, 'utf8');
  }
  console.log(`  + en/${rel}`);
  enCreated++;

  // ── PT source edit ────────────────────────────────────────────────────────
  if (!NO_PT && !src.includes('id="lang-toggle"')) {
    if (!DRY) fs.writeFileSync(srcPath, injectToggle(src, enUrl, 'EN'), 'utf8');
    console.log(`  ~ ${rel}`);
    ptEdited++;
  }
}

const verb  = DRY ? 'would create' : 'created';
const verb2 = DRY ? 'would edit' : 'edited';
console.log(`\n${verb} ${enCreated} EN files, ${verb2} ${ptEdited} PT files.`);
if (DRY) console.log('Remove --dry-run to apply.');
