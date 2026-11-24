const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const rawRoot = path.join(root, 'assets', 'raw');
const publicRoot = path.join(root, 'public');
const sourceFolders = ['background', 'brand', 'cards', 'icons', 'ui'];
const rawOnly = new Set(['cards/templates/grassland_creature.jpg', 'icons/icons.png', 'icons/icons_thumb.png']);
const webpOutputs = new Map([
  ['background/start-screen.png', 'background/start-screen.webp'],
  ['brand/paths-to-odamyrus-logo.png', 'brand/paths-to-odamyrus-logo.webp'],
]);
const jpegOutputs = new Map([
  ['cards/creatures/cultist_mage.png', 'cards/creatures/cultist_mage.jpg'],
  ['cards/creatures/lurker.png', 'cards/creatures/lurker.jpg'],
  ['cards/creatures/phalanx.png', 'cards/creatures/phalanx.jpg'],
]);

async function walk(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return files.flat();
}

function relativeTo(base, file) {
  const relative = path.relative(base, file).replace(/\\/g, '/');
  if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error(`Path leaves ${base}: ${file}`);
  return relative;
}

async function optimize(file, check) {
  const relative = relativeTo(rawRoot, file);
  if (!/\.(?:png|jpe?g)$/i.test(relative)) return { before: 0, after: 0 };
  const oldPublic = path.join(publicRoot, relative);
  if (rawOnly.has(relative)) {
    if (!check) await fs.rm(oldPublic, { force: true });
    else await fs.access(oldPublic).then(() => { throw new Error(`Raw-only asset still public: ${relative}`); }, () => {});
    return { before: 0, after: 0 };
  }

  const outputRelative = webpOutputs.get(relative) ?? jpegOutputs.get(relative) ?? relative;
  const destination = path.join(publicRoot, outputRelative);
  const source = await fs.readFile(file);
  const metadata = await sharp(source).metadata();
  let optimized;
  if (webpOutputs.has(relative)) {
    optimized = await sharp(source).webp({ quality: relative.startsWith('brand/') ? 88 : 78, effort: 6 }).toBuffer();
  } else if (jpegOutputs.has(relative) || /\.jpe?g$/i.test(relative)) {
    const pipeline = sharp(source);
    if (jpegOutputs.has(relative)) pipeline.resize({ width: 896, withoutEnlargement: true });
    optimized = await pipeline.jpeg({ quality: 79, mozjpeg: true, progressive: true }).toBuffer();
    if (metadata.format === 'jpeg' && optimized.length >= source.length) optimized = source;
  } else {
    optimized = await sharp(source).png({ compressionLevel: 9, effort: 10 }).toBuffer();
    if (optimized.length >= source.length) optimized = source;
  }

  if (check) {
    const current = await fs.readFile(destination);
    if (!current.equals(optimized)) throw new Error(`Run npm run art:optimize: ${outputRelative}`);
  } else {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, optimized);
    if (destination !== oldPublic) await fs.rm(oldPublic, { force: true });
  }
  return { before: source.length, after: optimized.length };
}

async function main() {
  const check = process.argv.includes('--check');
  await fs.access(rawRoot);
  const files = (await Promise.all(sourceFolders.map(async (folder) => walk(path.join(rawRoot, folder))))).flat();
  const expected = new Set(files
    .map((file) => relativeTo(rawRoot, file))
    .filter((relative) => /\.(?:png|jpe?g)$/i.test(relative) && !rawOnly.has(relative))
    .map((relative) => webpOutputs.get(relative) ?? jpegOutputs.get(relative) ?? relative));
  let before = 0;
  let after = 0;
  for (const file of files) {
    const result = await optimize(file, check);
    before += result.before;
    after += result.after;
  }
  const publicFiles = (await Promise.all(sourceFolders.map(async (folder) => walk(path.join(publicRoot, folder))))).flat();
  for (const file of publicFiles) {
    const relative = relativeTo(publicRoot, file);
    if (!/\.(?:png|jpe?g|webp)$/i.test(relative) || expected.has(relative)) continue;
    if (check) throw new Error(`Orphan public art: ${relative}. Remove it or add its raw source.`);
    await fs.rm(file);
  }
  console.log(`${check ? 'Verified' : 'Optimized'} public art: ${(before / 1048576).toFixed(2)} MiB raw → ${(after / 1048576).toFixed(2)} MiB public`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
