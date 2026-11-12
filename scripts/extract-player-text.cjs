const fs = require('node:fs');
const ts = require('typescript');

const files = [
  ...['src/ui', 'src/data', 'src/core'].flatMap(dir =>
    fs.readdirSync(dir).filter(name => name.endsWith('.ts')).map(name => `${dir}/${name}`)
  ),
  'src/main.ts', 'src/updates.ts',
];

function decode(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|mdash|ndash|bull|times|plusmn|trade|rarr|larr|ge|le|sup2|lfloor|rfloor|middot|ldquo|rdquo|minus|equals);|&#(?:x[0-9a-f]+|\d+);/gi, entity => {
    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&bull;': '•', '&times;': '×', '&plusmn;': '±', '&trade;': '™', '&rarr;': '→', '&larr;': '←', '&ge;': '≥', '&le;': '≤', '&sup2;': '²', '&lfloor;': '⌊', '&rfloor;': '⌋', '&middot;': '·', '&ldquo;': '“', '&rdquo;': '”', '&minus;': '−', '&equals;': '=' };
    return named[entity.toLowerCase()] ?? (entity.startsWith('&#x') ? String.fromCodePoint(parseInt(entity.slice(3, -1), 16)) : entity.startsWith('&#') ? String.fromCodePoint(parseInt(entity.slice(2, -1), 10)) : entity);
  });
}

function add(value, set) {
  const clean = decode(value).replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 2 || !/[a-zA-Z]/.test(clean)) return;
  if (/[<>"{}=]/.test(clean) || /(?:^|\s)(?:class|data-action|aria-label|src|href|style|width|height)=/.test(clean)) return;
  if (/^[\w-]+$/.test(clean) && clean === clean.toLowerCase()) return;
  if (/^[,;:.!?()\s\d%+\-/]*[A-Z]{1,5}[,;:.!?()\s\d%+\-/]*$/.test(clean)) return;
  if (/^(?:data-|class=|src=|href=|https?:|\/|[.#]|[a-z-]+\.(?:jpg|png|svg|mp3))/.test(clean)) return;
  set.add(clean);
}

function collect() {
  const set = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function walk(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const value = node.text;
        if (!value.includes('<') && !value.includes('>')) add(value, set);
      }
      if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const value = node.text;
        for (const attr of value.matchAll(/(?:aria-label|title|alt|placeholder)=["']([^"']+)["']/g)) add(attr[1], set);
        const plain = value.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, '\n');
        for (const part of plain.split('\n')) add(part, set);
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
  }
  return [...set].sort((a,b) => a.localeCompare(b));
}

if (require.main === module) {
  const entries = collect();
  console.log(`${entries.length} candidates`);
  if (process.argv.includes('--write')) fs.writeFileSync('scripts/player-text-candidates.json', JSON.stringify(entries, null, 2) + '\n');
  else console.log(entries.slice(0, 100).join('\n'));
}

module.exports = { collect };
