// One-time authoring helper. Generated translations are bundled with the game;
// no player text is sent to a translation service at runtime.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { collect } = require('./extract-player-text.cjs');

const source = collect().filter(s =>
  !/^\[data-|^&[a-z]+;|(?:^|\s)(?:data-|--dy:|width:)/i.test(s) &&
  !/^[-+,:;()\d\s.%]+$/.test(s) &&
  !/^© 2026 Morville Studios$/.test(s)
);
const targets = { 'zh-Hant': 'zh-TW', 'zh-Hans': 'zh-CN', ja: 'ja', ko: 'ko' };
const outPath = 'src/i18n/generated.json';
const translations = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
for (const locale of Object.keys(targets)) translations[locale] ??= {};

async function translate(lines, language) {
  const response = execFileSync('curl.exe', ['-fsSG', 'https://translate.googleapis.com/translate_a/single',
    '--data-urlencode', 'client=gtx', '--data-urlencode', 'sl=en', '--data-urlencode', `tl=${language}`,
    '--data-urlencode', 'dt=t', '--data-urlencode', `q=${lines.join('\n')}`], { encoding: 'utf8', maxBuffer: 1000000 });
  const result = JSON.parse(response);
  const output = result[0].map(part => part[0]).join('').trimEnd().split('\n');
  if (output.length !== lines.length) throw new Error(`Line count ${output.length} != ${lines.length}`);
  return output.map(s => s.trim());
}

async function main() {
  console.log(`${source.length} source entries`);
  const sourceSet = new Set(source);
  for (const [locale, language] of Object.entries(targets)) {
    for (const english of Object.keys(translations[locale])) {
      if (!sourceSet.has(english)) delete translations[locale][english];
    }
    const pending = source.filter(s => !translations[locale][s]);
    console.log(`${locale}: ${pending.length} pending`);
    for (let index = 0; index < pending.length;) {
      let chunk = [];
      while (index + chunk.length < pending.length && chunk.length < 12 && chunk.join('\n').length < 1200) {
        chunk.push(pending[index + chunk.length]);
      }
      let output;
      try { output = await translate(chunk, language); }
      catch (error) {
        console.warn(`${locale} batch ${index}: ${error.message}; retrying individually`);
        output = [];
        for (const line of chunk) {
          for (let attempt = 0; attempt < 4; attempt++) {
            try { output.push((await translate([line], language))[0]); break; }
            catch (singleError) {
              if (attempt === 3) throw singleError;
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }
      }
      chunk.forEach((line, offset) => { translations[locale][line] = output[offset]; });
      index += chunk.length;
      fs.writeFileSync(outPath, JSON.stringify(translations, null, 2) + '\n');
      if (index % 120 < chunk.length) console.log(`${locale}: ${index}/${pending.length}`);
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(translations, null, 2) + '\n');
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { source };
