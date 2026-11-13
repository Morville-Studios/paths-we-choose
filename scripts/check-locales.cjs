const fs = require('node:fs');
const { source } = require('./generate-locales.cjs');

const catalogs = JSON.parse(fs.readFileSync('src/i18n/generated.json', 'utf8'));
let missing = 0;
const sourceSet = new Set(source);
for (const locale of ['zh-Hant', 'zh-Hans', 'ja', 'ko']) {
  const absent = source.filter(english => !catalogs[locale]?.[english]);
  const obsolete = Object.keys(catalogs[locale] || {}).filter(english => !sourceSet.has(english));
  if (absent.length) {
    console.error(`${locale}: ${absent.length} untranslated source entries`);
    console.error(absent.slice(0, 15).join('\n'));
    missing += absent.length;
  }
  if (obsolete.length) {
    console.error(`${locale}: ${obsolete.length} obsolete translation entries`);
    console.error(obsolete.slice(0, 15).join('\n'));
    missing += obsolete.length;
  }
  if (!absent.length && !obsolete.length) console.log(`${locale}: ${source.length} entries present; no obsolete entries`);
}
if (missing) process.exitCode = 1;
