const fs = require('node:fs');
const { source } = require('./generate-locales.cjs');

const catalogs = JSON.parse(fs.readFileSync('src/i18n/generated.json', 'utf8'));
let missing = 0;
for (const locale of ['zh-Hant', 'zh-Hans', 'ja', 'ko']) {
  const absent = source.filter(english => !catalogs[locale]?.[english]);
  if (absent.length) {
    console.error(`${locale}: ${absent.length} untranslated source entries`);
    console.error(absent.slice(0, 15).join('\n'));
    missing += absent.length;
  } else console.log(`${locale}: ${source.length} entries present`);
}
if (missing) process.exitCode = 1;
