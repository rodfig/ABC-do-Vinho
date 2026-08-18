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
function buildProtect(table, prefix = '') {
  // Longest-first: a short term (e.g. protecting "Vintage") must not fragment
  // a longer already-swapped phrase (e.g. "...or vintage on the label") before
  // that phrase gets protected as one contiguous unit.
  return [...(table.protect || [])]
    .sort((a, b) => b.length - a.length)
    .map((term, i) => ({
      term,
      placeholder: `⟦${prefix}${i}⟧`,
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

function adjustPaths(html, isRoot, moduleDir) {
  if (isRoot) {
    // Root index.html has no '../' yet — its shared-asset refs (css/js/img)
    // need one added; same-tree links ("modulo1/", ...) stay untouched.
    return html.replace(/\b((?:src|href)=")(css|js|img|fonts)\//g, (_, attr, dir) => `${attr}../${dir}/`);
  }
  // Module pages: bump existing '../' (css/js refs, which point at the
  // project-root-level shared folders) up one level for the extra /en/
  // depth. But each module also has its OWN sibling img/ folder — unlike
  // css/js, images are per-module, not shared at the root — referenced
  // without a leading '../' (e.g. src="img/p005-....jpeg"). From
  // en/moduloN/, reaching that folder needs '../../moduloN/img/...': up
  // two levels to the project root, then back into the PT module's img/.
  html = html.replace(/\b((?:src|href)=")(\.\.\/)/g, (_, a, up) => `${a}../${up}`);
  html = html.replace(/\b(src=")(img)\//g, (_, attr, dir) => `${attr}../../${moduleDir}${dir}/`);
  return html;
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
  // Proper nouns that a generic swap would otherwise corrupt (e.g. "tinta":
  // "red" mangling the grape name "Tinta Roriz") must be shielded BEFORE
  // swaps run. But protecting a proper noun BEFORE swaps also blocks any
  // swap key that legitimately references that same literal text (e.g. a
  // "Vinhos tintos do Douro" swap key can't match once "Douro" has already
  // become a placeholder). So: only pre-protect terms swaps would actually
  // touch; everything else is protected after swapping, same timing as the
  // swap-value protection below, so swap keys can still reference them.
  const allProtect  = table.protect || [];
  const vulnerable  = allProtect.filter(term => applySwaps(term, swaps) !== term);
  const safe        = allProtect.filter(term => applySwaps(term, swaps) === term);
  const ptProtectsPre  = buildProtect({ protect: vulnerable }, 'P');
  // A sentence that opens with "A/O [Proper Noun]" (e.g. "A Tinta Roriz...",
  // "A Touriga Nacional...") reads as "The [Name]..." once translated, but
  // proper noun grape/place names normally don't take an article in English
  // ("Tinta Roriz has...", not "The Tinta Roriz has..."). Checked against the
  // RAW text before any protection runs (vulnerable terms would otherwise
  // already be placeholders by the time we could match them here) and only
  // at the very start of the string — mid-sentence "a Touriga Nacional" (e.g.
  // "sobre a Touriga Nacional") legitimately keeps its article.
  const dropArticleRe = new RegExp(
    `^[AO] (${[...allProtect].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})(?![a-zA-ZÀ-ɏ])`
  );
  // GT doesn't reliably leave already-swapped English text alone either — it
  // still tweaks capitalization or inserts words even in text that's already
  // in the target language. Route every swap *value* through the same
  // placeholder protection, applied after swapping — alongside the "safe"
  // proper nouns above.
  // Single-word swap values (e.g. "white", "glass") don't need placeholder
  // protection — GT reliably leaves a lone common word alone — and giving
  // them one is actively harmful: the case-insensitive protect/restore cycle
  // always restores the flat literal JSON value, silently undoing whatever
  // capital preserveCase() applied (e.g. "Branco" -> "White" via preserveCase,
  // then flattened back to "white" by a same-named protect entry). Multi-word
  // phrases still need protection since GT does reword those.
  const swapValues     = [...new Set(Object.values(table.swap || {}))].filter(v => v.includes(' '));
  const enProtects  = buildProtect({ protect: [...safe, ...swapValues] }, 'S');

  console.log(`Source : ${relNorm}`);
  console.log(`Output : ${path.relative(ROOT, outPath)}`);

  let html  = fs.readFileSync(srcPath, 'utf8');
  const nodes = [...collectNodes(html), ...collectAttrNodes(html)];
  console.log(`Nodes  : ${nodes.length}`);

  // Annotate each node: protect proper nouns, THEN swap, THEN protect swap output.
  const annotated = nodes.map(node => {
    const trimmed0    = node.text.trim();
    const trimmed     = trimmed0.replace(dropArticleRe, '$1');
    const leading      = node.text.slice(0, node.text.indexOf(trimmed0[0]));
    const trailing     = node.text.slice(node.text.lastIndexOf(trimmed0[trimmed0.length - 1]) + 1);
    const ptShielded   = applyProtect(trimmed, ptProtectsPre);
    const preSwapped   = applySwaps(ptShielded, swaps);
    return { ...node, trimmed, leading, trailing, preSwapped };
  });

  // A lone leading article ("A "/"O ") before a term where English idiom drops
  // the article entirely (e.g. "Ampelography is..." not "The ampelography
  // is...") — checked by position, not by the article's own isolated text,
  // since "A "/"O " legitimately becomes "The" everywhere else.
  const DROP_ARTICLE_BEFORE = new Set(['ampelografia', 'altitude elevada', 'clima mediterrânico quente e seco']);
  for (let i = 0; i < annotated.length - 1; i++) {
    if (annotated[i].trimmed in { O: 1, A: 1, o: 1, a: 1 } && DROP_ARTICLE_BEFORE.has(annotated[i + 1].trimmed)) {
      annotated[i].preSwapped = '⟦DROP-ARTICLE⟧';
      annotated[i].trailing = '';
      // The dropped article was carrying the sentence-initial capital — the
      // next node is now sentence-first and needs it, but only for THIS
      // occurrence (the cached translation is shared with other identical
      // nodes elsewhere, e.g. a lowercase mid-sentence "ampelografia").
      annotated[i + 1].forceCapitalize = true;
    }
  }

  // Deduplicate: only translate unique strings
  const uniqueKeys = [...new Set(annotated.map(n => n.preSwapped))];
  console.log(`Unique : ${uniqueKeys.length}`);

  // Isolated single-word nodes (whole node text is just a Portuguese article,
  // e.g. a leading "O " before a <strong>Name</strong>) have no sentence context
  // for GT to work with and translate unreliably. Exact-match only — this must
  // never be a substring swap, since "o"/"a" are the most common words in
  // Portuguese and would corrupt any longer text they appear within.
  const ISOLATED_WORDS = { O: 'The', A: 'The', Os: 'The', As: 'The', o: 'the', a: 'the', os: 'the', as: 'the', ', a': ',', Vinho: 'Vinho', moderado: '', 'O consumo': 'Moderate consumption', '⟦DROP-ARTICLE⟧': '' };
  // "Choro" means something different per module: vine-cycle "bleeding" in
  // modulo2, a bottle-storage fault ("weeping") in modulo8 — same isolated
  // word, different sense, so the mapping is file-specific rather than global.
  if (relNorm === 'modulo2/index.html') ISOLATED_WORDS['Choro'] = 'Bleeding';
  if (relNorm === 'modulo8/index.html') ISOLATED_WORDS['Choro'] = 'Weeping';
  // "Touriga Francesa" para "Touriga Franca" — the isolated "para" between
  // the two protected names means "to" (renamed X to Y), not "for".
  if (relNorm === 'modulo3/index.html') ISOLATED_WORDS['para'] = 'to';
  // Isolated "Americano" (nav link, chapter title) is the cocktail's proper
  // name and must stay "Americano" — but lowercase "americano" elsewhere in
  // this file means the nationality adjective ("cocktail americano" = "American
  // cocktail") and must keep translating normally, so this can't be a blanket
  // case-insensitive protect entry.
  if (relNorm === 'modulo6/index.html') ISOLATED_WORDS['Americano'] = 'Americano';

  const cache = new Map();
  let done = 0;

  const toTranslate = uniqueKeys.filter(k => !(k in ISOLATED_WORDS));
  for (const k of uniqueKeys) if (k in ISOLATED_WORDS) cache.set(k, ISOLATED_WORDS[k]);

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batchKeys  = toTranslate.slice(i, i + BATCH_SIZE);
    const batchForGT = batchKeys.map(k => applyProtect(k, enProtects));
    const results    = await gtBatch(batchForGT);
    batchKeys.forEach((key, j) => {
      const restored = restoreProtect(restoreProtect(results[j], enProtects), ptProtectsPre);
      cache.set(key, restored);
    });
    done += batchKeys.length;
    process.stdout.write(`\r  ${done}/${toTranslate.length}`);
    await sleep(DELAY_MS);
  }

  process.stdout.write('\n');

  // Replace back-to-front to keep earlier offsets valid
  const reversed = [...annotated].sort((a, b) => b.start - a.start);
  for (const node of reversed) {
    let translated = cache.get(node.preSwapped) ?? node.trimmed;
    if (node.forceCapitalize && translated) {
      translated = translated[0].toUpperCase() + translated.slice(1);
    }
    const result     = node.leading + translated + node.trailing;
    html = html.slice(0, node.start) + result + html.slice(node.end);
  }

  html = html.replace(/(<html\b[^>]*\blang=)"pt"/, '$1"en"');
  html = html.replace(/(<title>[^<]+)(<\/title>)/, '$1 — EN$2');

  const dir = relNorm.replace(/[^/]+$/, '');
  html = adjustPaths(html, dir === '', dir);
  html = fixRootLinks(html);
  html = injectToggle(html, '/' + dir, 'PT');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`\n✅  ${path.relative(ROOT, outPath)}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
