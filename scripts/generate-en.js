'use strict';
/**
 * generate-en.js
 * Translates a PT HTML lesson to English using the Google Translate
 * unofficial API. Walks text nodes directly — never sends raw HTML to
 * the API, so HTML structure cannot be corrupted.
 *
 * Usage: node scripts/generate-en.js <path/to/index.html>
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const TABLE_PATH = path.join(ROOT, 'js', 'translations.json');
const DELAY_MS   = 250;   // between GT calls — polite rate

// ── Text node walker ────────────────────────────────────────────────────────
// Collects translatable text nodes (skips script/style/pre, translate="no").

const SKIP_TAGS = new Set(['script','style','code','pre','textarea']);
const VOID_TAGS = new Set(['area','base','br','col','hr','img','input','link','meta','param','source','track','wbr']);

function collectNodes(html) {
  const nodes = [];
  const tagStack = [];
  let noTranslate = 0;
  let i = 0;

  while (i < html.length) {
    // Skip HTML comments
    if (html.slice(i, i + 4) === '<!--') {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }

    if (html[i] !== '<') {
      const stop = html.indexOf('<', i);
      const end  = stop === -1 ? html.length : stop;
      const text = html.slice(i, end);
      if (tagStack.length === 0 && noTranslate === 0 && text.trim()) {
        nodes.push({ start: i, end, text });
      }
      i = end;
      continue;
    }

    const close   = html.indexOf('>', i);
    if (close === -1) break;
    const tag     = html.slice(i, close + 1);
    const closing = tag[1] === '/';
    const name    = tag.slice(closing ? 2 : 1).split(/[\s\/>]/)[0].toLowerCase();
    const hasNT   = /\btranslate\s*=\s*["']?no/i.test(tag);
    const isVoid  = VOID_TAGS.has(name) || /\/>$/.test(tag);

    if (!closing && hasNT)  noTranslate++;
    if ( closing && noTranslate > 0) noTranslate--;
    if (!closing && !isVoid && SKIP_TAGS.has(name)) tagStack.push(name);
    if ( closing && tagStack.length && tagStack[tagStack.length - 1] === name) tagStack.pop();

    i = close + 1;
  }
  return nodes;
}

// Collects translatable attribute values (alt/title/aria-label) — these live
// inside tags, so collectNodes (which only walks text between tags) never
// sees them. Same {start, end, text} shape as text nodes so they can share
// the swap/protect/GT pipeline and the back-to-front replace pass.
const ATTR_NAMES = ['alt', 'title', 'aria-label'];

function collectAttrNodes(html) {
  const nodes = [];
  const re = new RegExp(`\\b(?:${ATTR_NAMES.join('|')})="([^"]*)"`, 'g');
  let m;
  while ((m = re.exec(html))) {
    const value = m[1];
    if (!value.trim()) continue;
    const start = m.index + m[0].indexOf('"') + 1;
    const end   = start + value.length;
    nodes.push({ start, end, text: value });
  }
  return nodes;
}

// ── Pre-swap (translations.json) ────────────────────────────────────────────
// Replaces known PT wine terms with their EN equivalents before GT sees the
// text, so GT treats them as already-English and leaves them alone.

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildSwaps(table) {
  return Object.entries(table.swap || {})
    .sort((a, b) => b[0].length - a[0].length)
    .map(([pt, en]) => [
      new RegExp(`(?<![a-zA-ZÀ-ɏ])${escapeRe(pt)}(?![a-zA-ZÀ-ɏ])`, 'gi'),
      en,
    ]);
}

// Protected terms are replaced with ⟦N⟧ placeholders before GT sees the text,
// then restored after — GT cannot translate Unicode bracket tokens.
function buildProtect(table) {
  return (table.protect || []).map((term, i) => ({
    term,
    placeholder: `⟦${i}⟧`,
    re: new RegExp(`(?<![a-zA-ZÀ-ɏ])${escapeRe(term)}(?![a-zA-ZÀ-ɏ])`, 'gi'),
  }));
}

function applyProtect(text, protects) {
  let out = text;
  for (const { re, placeholder } of protects) out = out.replace(re, placeholder);
  return out;
}

function restoreProtect(text, protects) {
  let out = text;
  for (const { placeholder, term } of protects) out = out.split(placeholder).join(term);
  return out;
}

function preserveCase(match, replacement) {
  if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase())
    return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function applySwaps(text, swaps) {
  let out = text;
  for (const [re, en] of swaps) out = out.replace(re, (match) => preserveCase(match, en));
  return out;
}

// ── Google Translate ────────────────────────────────────────────────────────

const SEP        = '\n⁣\n';  // invisible separator — GT preserves it, never translates it
const BATCH_SIZE = 10;

async function gtRaw(text, attempt = 0) {
  const url = 'https://translate.googleapis.com/translate_a/single'
    + `?client=gtx&sl=pt&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if ((res.status === 429 || res.status === 500) && attempt < 3) {
    const wait = (attempt + 1) * 5000;
    process.stdout.write(` [${res.status} — ${wait/1000}s]`);
    await new Promise(r => setTimeout(r, wait));
    return gtRaw(text, attempt + 1);
  }
  if (!res.ok) throw new Error(`GT ${res.status}`);
  const data = await res.json();
  return data[0].map(c => c[0]).join('');
}

// Translate a batch of texts in one GT call using an invisible separator.
// Falls back to individual calls if GT garbles the separator count.
async function gtBatch(texts) {
  if (texts.length === 1) return [await gtRaw(texts[0])];
  const joined    = texts.join(SEP);
  const result    = await gtRaw(joined);
  const parts     = result.split(SEP);
  if (parts.length === texts.length) return parts;
  // Fallback: individual calls
  process.stdout.write(' [split-fallback]');
  return Promise.all(texts.map(t => gtRaw(t)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── EN tree helpers ─────────────────────────────────────────────────────────

function adjustPaths(html, isRoot) {
  if (isRoot) {
    // Root index.html has no '../' yet — its shared-asset refs (css/js/img)
    // need one added; same-tree links ("modulo1/", ...) stay untouched.
    return html.replace(/\b((?:src|href)=")(css|js|img|fonts)\//g, (_, attr, dir) => `${attr}../${dir}/`);
  }
  return html.replace(/\b((?:src|href)=")(\.\.\/)/g, (_, a, up) => `${a}../${up}`);
}

// Root-pointing links (breadcrumb Home, back-link) end up pointing at the PT root
// after adjustPaths over-adjusts them. Replace with absolute /en/.
function fixRootLinks(html) {
  // Breadcrumb "Home" / "Início"
  html = html.replace(
    /(<a\b[^>]*\bhref=")([^"]*)"([^>]*)>(Home|Início)<\/a>/g,
    (_, pre, _href, attrs, label) => `${pre}/en/"${attrs}>${label}</a>`
  );
  // back-link anchors (class="back-link") that point to root
  html = html.replace(
    /(<a\b[^>]*class="back-link"[^>]*\bhref=")([^"]*)"/g,
    (_, pre, _href) => `${pre}/en/"`
  );
  html = html.replace(
    /(<a\b[^>]*\bhref=")([^"]*)"([^>]*class="back-link"[^>]*)>/g,
    (_, pre, _href, attrs) => `${pre}/en/"${attrs}>`
  );
  // topbar-back breadcrumb (ABC do Vinho markup: class before href)
  html = html.replace(
    /(<a\b[^>]*class="topbar-back"[^>]*\bhref=")([^"]*)"/g,
    (_, pre, _href) => `${pre}/en/"`
  );
  return html;
}

function injectToggle(html, href, label) {
  // Strip any existing toggle (PT source already has one pointing to /en/), then inject correct one.
  html = html.replace(/[ \t]*<a id="lang-toggle"[^>]*>[^<]*<\/a>\n?/g, '');
  return html.replace('</body>', `<a id="lang-toggle" href="${href}">${label}</a>\n</body>`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const relPath = process.argv[2];
  if (!relPath) {
    console.error('Usage: node scripts/generate-en.js <path/to/index.html>');
    process.exit(1);
  }

  const relNorm = relPath.replace(/\\/g, '/');
  const srcPath = path.resolve(ROOT, relNorm);
  const outPath = path.join(ROOT, 'en', relNorm);
  const table    = JSON.parse(fs.readFileSync(TABLE_PATH, 'utf8'));
  const swaps    = buildSwaps(table);
  const protects = buildProtect(table);

  console.log(`Source : ${relNorm}`);
  console.log(`Output : ${path.relative(ROOT, outPath)}`);

  let html  = fs.readFileSync(srcPath, 'utf8');
  const nodes = [...collectNodes(html), ...collectAttrNodes(html)];
  console.log(`Nodes  : ${nodes.length}`);

  // Annotate each node with its trimmed + pre-swapped text
  const annotated = nodes.map(node => {
    const trimmed    = node.text.trim();
    const leading    = node.text.slice(0, node.text.indexOf(trimmed[0]));
    const trailing   = node.text.slice(node.text.lastIndexOf(trimmed[trimmed.length - 1]) + 1);
    const preSwapped = applySwaps(trimmed, swaps);
    return { ...node, trimmed, leading, trailing, preSwapped };
  });

  // Deduplicate: only translate unique strings
  // Apply protect placeholders before sending to GT, restore after.
  const uniqueKeys = [...new Set(annotated.map(n => n.preSwapped))];
  const uniqueForGT = uniqueKeys.map(k => applyProtect(k, protects));
  console.log(`Unique : ${uniqueKeys.length}`);

  const cache = new Map();
  let done = 0;

  for (let i = 0; i < uniqueKeys.length; i += BATCH_SIZE) {
    const batchKeys  = uniqueKeys.slice(i, i + BATCH_SIZE);
    const batchForGT = uniqueForGT.slice(i, i + BATCH_SIZE);
    const results    = await gtBatch(batchForGT);
    batchKeys.forEach((key, j) => cache.set(key, restoreProtect(results[j], protects)));
    done += batchKeys.length;
    process.stdout.write(`\r  ${done}/${uniqueKeys.length}`);
    await sleep(DELAY_MS);
  }

  process.stdout.write('\n');

  // Replace back-to-front to keep earlier offsets valid
  const reversed = [...annotated].sort((a, b) => b.start - a.start);
  for (const node of reversed) {
    const translated = cache.get(node.preSwapped) ?? node.trimmed;
    const result     = node.leading + translated + node.trailing;
    html = html.slice(0, node.start) + result + html.slice(node.end);
  }

  html = html.replace(/(<html\b[^>]*\blang=)"pt"/, '$1"en"');
  html = html.replace(/(<title>[^<]+)(<\/title>)/, '$1 — EN$2');

  const dir = relNorm.replace(/[^/]+$/, '');
  html = adjustPaths(html, dir === '');
  html = fixRootLinks(html);
  html = injectToggle(html, '/' + dir, 'PT');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`\n✅  ${path.relative(ROOT, outPath)}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
