const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const background = path.join(root, 'public', 'background', 'start-screen.png');
const outputDirectory = path.join(root, 'public', 'seo');
const output = path.join(outputDirectory, 'the-paths-we-choose-share-1200x630.jpg');

const overlay = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#05080e" stop-opacity=".96"/>
        <stop offset=".6" stop-color="#05080e" stop-opacity=".5"/>
        <stop offset="1" stop-color="#05080e" stop-opacity=".12"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)"/>
    <g fill="#f1efe8" transform="translate(64 54) scale(.58)">
      <path d="M0 21 18 34v48L0 96V21ZM29 0l20 14v53L39 78 29 68V0Zm31 25 20-15v76l-20 14V25Z"/>
    </g>
    <text x="124" y="91" fill="#f1efe8" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="5">MORVILLE</text>
    <text x="126" y="118" fill="#9dafff" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="5">STUDIOS · GAMES</text>
    <text x="64" y="285" fill="#ffffff" font-family="Georgia, Times New Roman, serif" font-size="75" font-weight="600">The Paths</text>
    <text x="64" y="362" fill="#ffffff" font-family="Georgia, Times New Roman, serif" font-size="75" font-weight="600">We Choose</text>
    <text x="67" y="414" fill="#e4bd65" font-family="Georgia, Times New Roman, serif" font-size="24">Build a path. Shape a hero. Survive the consequence.</text>
    <rect x="64" y="470" width="430" height="52" rx="3" fill="#e4bd65"/>
    <text x="88" y="504" fill="#171207" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="1">PLAY FREE IN YOUR BROWSER</text>
    <text x="64" y="573" fill="#b7c0cf" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" letter-spacing="2">CARD ADVENTURE · DECK-BUILDING · 2D6 COMBAT</text>
  </svg>
`);

async function generate() {
  await fs.mkdir(outputDirectory, { recursive: true });
  await sharp(background)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .composite([{ input: overlay }])
    .jpeg({ quality: 88, progressive: true, mozjpeg: true })
    .toFile(output);
  console.log(`Generated ${path.relative(root, output)}`);
}

generate().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
