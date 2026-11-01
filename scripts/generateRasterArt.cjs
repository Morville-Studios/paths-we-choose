const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicCardsDir = path.resolve(__dirname, '../public/cards');
const adventureDir = path.join(publicCardsDir, 'adventure');
const creaturesDir = path.join(publicCardsDir, 'creatures');

if (!fs.existsSync(adventureDir)) fs.mkdirSync(adventureDir, { recursive: true });
if (!fs.existsSync(creaturesDir)) fs.mkdirSync(creaturesDir, { recursive: true });

async function svgToJpg(svg, outPath) {
  await sharp(Buffer.from(svg))
    .resize(600, 840)
    .jpeg({ quality: 92 })
    .toFile(outPath);
  console.log('Generated:', path.basename(outPath));
}

async function main() {
  console.log('Generating raster arts...');
  const userUploadedDir = 'C:/Users/adoni/.gemini/antigravity/brain/2b03f092-d0bd-45c6-b845-27f159b2b185/.user_uploaded';

  // 1. Plains / Grassland from user upload
  const plainsSrc = path.join(userUploadedDir, 'media_1793283803808_1e594e0c.png');
  if (fs.existsSync(plainsSrc)) {
    await sharp(plainsSrc)
      .resize(600, 840, { fit: 'cover' })
      .jpeg({ quality: 92 })
      .toFile(path.join(adventureDir, 'grassland.jpg'));
    console.log('Generated: grassland.jpg');
  }

  // 2. Forest from user upload
  const forestSrc = path.join(userUploadedDir, 'media_1793283843170_f50cbf1b.png');
  if (fs.existsSync(forestSrc)) {
    await sharp(forestSrc)
      .resize(600, 840, { fit: 'cover' })
      .jpeg({ quality: 92 })
      .toFile(path.join(adventureDir, 'forest.jpg'));
    console.log('Generated: forest.jpg');
  }

  // 3. Grassland Village
  const villageSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
      <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="100%" stop-color="#22c55e"/>
      </linearGradient>
      <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="roofGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#9a3412"/>
      </linearGradient>
      <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef3c7"/>
        <stop offset="100%" stop-color="#fde68a"/>
      </linearGradient>
      <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#052e16" flood-opacity="0.4"/>
      </filter>
    </defs>
    <!-- Sky -->
    <rect width="600" height="840" fill="url(#skyGrad)"/>
    <circle cx="480" cy="180" r="140" fill="url(#sunGlow)"/>
    <circle cx="480" cy="180" r="45" fill="#fef08a"/>

    <!-- Clouds -->
    <ellipse cx="120" cy="140" rx="90" ry="30" fill="#ffffff" opacity="0.85"/>
    <ellipse cx="180" cy="130" rx="60" ry="35" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="340" cy="190" rx="100" ry="25" fill="#ffffff" opacity="0.75"/>

    <!-- Distant Mountains -->
    <polygon points="40,420 180,260 320,420" fill="#93c5fd" opacity="0.6"/>
    <polygon points="240,440 380,290 520,440" fill="#bfdbfe" opacity="0.5"/>

    <!-- Rolling Hills -->
    <path d="M-50,480 Q150,380 400,450 T650,440 L650,840 L-50,840 Z" fill="url(#hillGrad1)"/>
    <path d="M-50,560 Q200,490 380,540 T650,530 L650,840 L-50,840 Z" fill="url(#hillGrad2)"/>

    <!-- Windmill on distant ridge -->
    <rect x="440" y="380" width="30" height="60" fill="#78350f"/>
    <polygon points="435,380 455,350 475,380" fill="#b45309"/>
    <line x1="455" y1="365" x2="420" y2="330" stroke="#fef3c7" stroke-width="4"/>
    <line x1="455" y1="365" x2="490" y2="400" stroke="#fef3c7" stroke-width="4"/>
    <line x1="455" y1="365" x2="490" y2="330" stroke="#fef3c7" stroke-width="4"/>
    <line x1="455" y1="365" x2="420" y2="400" stroke="#fef3c7" stroke-width="4"/>

    <!-- Village Cottages -->
    <!-- House 1 Left -->
    <g filter="url(#shadow)">
      <rect x="70" y="560" width="130" height="95" rx="6" fill="url(#wallGrad)"/>
      <polygon points="50,565 135,490 220,565" fill="url(#roofGrad)"/>
      <rect x="180" y="475" width="22" height="40" fill="#78350f"/>
      <ellipse cx="195" cy="455" rx="14" ry="8" fill="#e2e8f0" opacity="0.6"/>
      <ellipse cx="205" cy="435" rx="20" ry="10" fill="#cbd5e1" opacity="0.4"/>
      <rect x="110" y="605" width="32" height="50" rx="3" fill="#78350f"/>
      <circle cx="135" cy="632" r="3" fill="#fbbf24"/>
      <rect x="85" y="580" width="26" height="26" rx="4" fill="#38bdf8" stroke="#78350f" stroke-width="3"/>
      <rect x="160" y="580" width="26" height="26" rx="4" fill="#38bdf8" stroke="#78350f" stroke-width="3"/>
    </g>

    <!-- House 2 Center-Right Main Inn -->
    <g filter="url(#shadow)">
      <rect x="250" y="530" width="180" height="130" rx="8" fill="url(#wallGrad)"/>
      <polygon points="230,535 340,440 450,535" fill="url(#roofGrad)"/>
      <rect x="270" y="445" width="26" height="45" fill="#78350f"/>
      <ellipse cx="280" cy="420" rx="16" ry="9" fill="#f1f5f9" opacity="0.7"/>
      <ellipse cx="295" cy="395" rx="22" ry="12" fill="#e2e8f0" opacity="0.5"/>
      <!-- Timber details -->
      <line x1="250" y1="585" x2="430" y2="585" stroke="#78350f" stroke-width="4"/>
      <line x1="340" y1="535" x2="340" y2="660" stroke="#78350f" stroke-width="4"/>
      <rect x="320" y="605" width="40" height="55" rx="4" fill="#78350f"/>
      <circle cx="352" cy="632" r="3.5" fill="#fbbf24"/>
      <!-- Windows with warm glowing light -->
      <rect x="270" y="550" width="35" height="28" rx="4" fill="#fef08a" stroke="#78350f" stroke-width="3"/>
      <rect x="375" y="550" width="35" height="28" rx="4" fill="#fef08a" stroke="#78350f" stroke-width="3"/>
      <rect x="270" y="605" width="35" height="28" rx="4" fill="#fef08a" stroke="#78350f" stroke-width="3"/>
      <rect x="375" y="605" width="35" height="28" rx="4" fill="#fef08a" stroke="#78350f" stroke-width="3"/>
      <!-- Village Inn Sign -->
      <rect x="280" y="515" width="40" height="18" rx="3" fill="#b45309" stroke="#fde68a" stroke-width="1.5"/>
    </g>

    <!-- Cobblestone / Dirt Road -->
    <path d="M120,840 C180,720 220,680 320,660 C380,650 420,660 460,670 C520,740 560,840 580,840 Z" fill="#d97706" opacity="0.35"/>
    <path d="M150,840 C200,740 250,700 330,670 C380,680 430,730 480,840 Z" fill="#b45309" opacity="0.45"/>

    <!-- Village Trees & Flowers -->
    <circle cx="50" cy="540" r="45" fill="#15803d"/>
    <circle cx="470" cy="540" r="50" fill="#16a34a"/>
    <circle cx="530" cy="570" r="40" fill="#15803d"/>
    <!-- Wildflowers in foreground -->
    <circle cx="80" cy="730" r="5" fill="#ec4899"/>
    <circle cx="100" cy="745" r="4" fill="#facc15"/>
    <circle cx="120" cy="720" r="5" fill="#38bdf8"/>
    <circle cx="490" cy="740" r="6" fill="#f43f5e"/>
    <circle cx="520" cy="725" r="5" fill="#a855f7"/>
    <circle cx="540" cy="750" r="4" fill="#facc15"/>
  </svg>
  `;
  await svgToJpg(villageSvg, path.join(adventureDir, 'grassland_village.jpg'));

  // 4. Grassland Shrine
  const shrineSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shrineSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="40%" stop-color="#38bdf8"/>
        <stop offset="80%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#fef9c3"/>
      </linearGradient>
      <radialGradient id="holyAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#fde047" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#eab308" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="hillSh" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="50%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <linearGradient id="goldGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#eab308"/>
      </linearGradient>
      <filter id="divineGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Background Sky -->
    <rect width="600" height="840" fill="url(#shrineSky)"/>

    <!-- Spiritual Golden Light Beams -->
    <polygon points="300,100 120,840 480,840" fill="#fef08a" opacity="0.35"/>
    <polygon points="300,100 200,840 400,840" fill="#fde047" opacity="0.4"/>
    <circle cx="300" cy="380" r="220" fill="url(#holyAura)"/>

    <!-- Hilltop Plateau -->
    <path d="M-50,560 Q300,480 650,560 L650,840 L-50,840 Z" fill="url(#hillSh)"/>

    <!-- Sacred Stone Pillars and Altar -->
    <!-- Left Pillar -->
    <g filter="drop-shadow(0 8px 12px rgba(5,46,22,0.4))">
      <rect x="150" y="380" width="45" height="190" rx="4" fill="url(#stoneGrad)"/>
      <rect x="140" y="365" width="65" height="20" rx="3" fill="#e2e8f0"/>
      <rect x="135" y="560" width="75" height="25" rx="3" fill="#94a3b8"/>
      <!-- Glowing runes on left pillar -->
      <line x1="172" y1="410" x2="172" y2="530" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6" filter="url(#divineGlow)"/>
    </g>

    <!-- Right Pillar -->
    <g filter="drop-shadow(0 8px 12px rgba(5,46,22,0.4))">
      <rect x="405" y="380" width="45" height="190" rx="4" fill="url(#stoneGrad)"/>
      <rect x="395" y="365" width="65" height="20" rx="3" fill="#e2e8f0"/>
      <rect x="390" y="560" width="75" height="25" rx="3" fill="#94a3b8"/>
      <!-- Glowing runes on right pillar -->
      <line x1="427" y1="410" x2="427" y2="530" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6" filter="url(#divineGlow)"/>
    </g>

    <!-- Central Sacred Shrine Altar -->
    <g filter="drop-shadow(0 10px 16px rgba(5,46,22,0.5))">
      <!-- Steps -->
      <polygon points="190,620 410,620 440,650 160,650" fill="#94a3b8"/>
      <polygon points="210,590 390,590 410,620 190,620" fill="#cbd5e1"/>
      <rect x="235" y="480" width="130" height="110" rx="6" fill="url(#stoneGrad)"/>
      <!-- Altar Tabletop -->
      <polygon points="220,480 380,480 395,460 205,460" fill="#f8fafc"/>
      <!-- Golden Relic / Sun Dial Chalice -->
      <path d="M275,445 Q300,425 325,445 L320,460 L280,460 Z" fill="url(#goldGlow)" filter="url(#divineGlow)"/>
      <!-- Hovering Sacred Light Crystal / Star -->
      <circle cx="300" cy="370" r="32" fill="#ffffff" filter="url(#divineGlow)"/>
      <polygon points="300,320 312,358 350,370 312,382 300,420 288,382 250,370 288,358" fill="#fef08a" filter="url(#divineGlow)"/>
    </g>

    <!-- Floral Offerings at Altar base -->
    <circle cx="210" cy="640" r="6" fill="#f43f5e"/>
    <circle cx="230" cy="645" r="5" fill="#38bdf8"/>
    <circle cx="370" cy="642" r="6" fill="#a855f7"/>
    <circle cx="390" cy="645" r="5" fill="#facc15"/>
  </svg>
  `;
  await svgToJpg(shrineSvg, path.join(adventureDir, 'grassland_shrine.jpg'));

  // 5. Grassland Encounter
  const grasslandEncSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stormSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="40%" stop-color="#431407"/>
        <stop offset="70%" stop-color="#9a3412"/>
        <stop offset="100%" stop-color="#ea580c"/>
      </linearGradient>
      <linearGradient id="darkGrass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#15803d"/>
        <stop offset="50%" stop-color="#166534"/>
        <stop offset="100%" stop-color="#052e16"/>
      </linearGradient>
      <filter id="encGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Ominous Twilight Dusk Sky -->
    <rect width="600" height="840" fill="url(#stormSky)"/>

    <!-- Blood Moon / Red Sunset Glow -->
    <circle cx="300" cy="300" r="110" fill="#f97316" opacity="0.45" filter="url(#encGlow)"/>
    <circle cx="300" cy="300" r="55" fill="#ffedd5" opacity="0.85"/>

    <!-- Dark Clouds -->
    <path d="M-50,220 Q120,180 300,230 T650,200 L650,380 L-50,380 Z" fill="#2e1065" opacity="0.75"/>
    <path d="M-50,280 Q200,240 420,290 T650,260 L650,440 L-50,440 Z" fill="#4c0519" opacity="0.6"/>

    <!-- Rugged Hills with Boulders -->
    <path d="M-50,460 Q180,390 420,440 T650,420 L650,840 L-50,840 Z" fill="url(#darkGrass)"/>

    <!-- Massive Jagged Boulders with Claw Scratches -->
    <g filter="drop-shadow(0 12px 18px rgba(0,0,0,0.7))">
      <!-- Left Rock -->
      <polygon points="60,650 110,480 200,520 220,680" fill="#334155"/>
      <polygon points="110,480 160,490 200,520 150,560" fill="#64748b"/>
      <!-- Claw Slash Marks Glowing Red -->
      <line x1="120" y1="510" x2="160" y2="580" stroke="#ef4444" stroke-width="4" stroke-linecap="round" filter="url(#encGlow)"/>
      <line x1="135" y1="505" x2="175" y2="575" stroke="#ef4444" stroke-width="4" stroke-linecap="round" filter="url(#encGlow)"/>
      <line x1="150" y1="510" x2="190" y2="580" stroke="#ef4444" stroke-width="4" stroke-linecap="round" filter="url(#encGlow)"/>

      <!-- Right Rock Formation -->
      <polygon points="380,690 420,490 530,510 560,700" fill="#1e293b"/>
      <polygon points="420,490 470,500 530,510 490,580" fill="#475569"/>
    </g>

    <!-- Glowing Wild Eyes in the Grass Shadows -->
    <g filter="url(#encGlow)">
      <!-- Pair 1 Center Left -->
      <circle cx="270" cy="530" r="5" fill="#facc15"/>
      <circle cx="290" cy="530" r="5" fill="#facc15"/>
      <line x1="268" y1="530" x2="272" y2="530" stroke="#000" stroke-width="2"/>
      <line x1="288" y1="530" x2="292" y2="530" stroke="#000" stroke-width="2"/>

      <!-- Pair 2 Right Ridge -->
      <circle cx="480" cy="470" r="6" fill="#ef4444"/>
      <circle cx="505" cy="470" r="6" fill="#ef4444"/>
      <line x1="478" y1="470" x2="482" y2="470" stroke="#000" stroke-width="2.5"/>
      <line x1="503" y1="470" x2="507" y2="470" stroke="#000" stroke-width="2.5"/>
    </g>

    <!-- Tall Windswept Wild Grass Blades in Foreground -->
    <path d="M40,840 Q60,730 80,710 Q50,750 30,840 Z" fill="#166534"/>
    <path d="M120,840 Q150,710 180,690 Q140,740 100,840 Z" fill="#14532d"/>
    <path d="M300,840 Q320,740 350,720 Q310,760 280,840 Z" fill="#166534"/>
    <path d="M480,840 Q510,710 550,680 Q500,750 460,840 Z" fill="#14532d"/>
  </svg>
  `;
  await svgToJpg(grasslandEncSvg, path.join(adventureDir, 'grassland_encounter.jpg'));

  // 6. Forest Encounter
  const forestEncSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="darkForSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#022c22"/>
        <stop offset="60%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>
      <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1c1917"/>
        <stop offset="40%" stop-color="#292524"/>
        <stop offset="80%" stop-color="#44403c"/>
        <stop offset="100%" stop-color="#0c0a09"/>
      </linearGradient>
      <radialGradient id="mistGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#064e3b" stop-opacity="0"/>
      </radialGradient>
      <filter id="viperGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Deep Enchanted Forest Twilight Background -->
    <rect width="600" height="840" fill="url(#darkForSky)"/>
    <ellipse cx="300" cy="500" rx="260" ry="200" fill="url(#mistGlow)"/>

    <!-- Giant Gnarly Ancient Tree Trunks Framing the scene -->
    <!-- Left Huge Trunk -->
    <path d="M-80,0 Q120,380 40,840 L-80,840 Z" fill="url(#trunkGrad)"/>
    <!-- Right Massive Trunk -->
    <path d="M680,0 Q460,350 560,840 L680,840 Z" fill="url(#trunkGrad)"/>

    <!-- Twisted Overhead Branches with Creeping Vines -->
    <path d="M0,80 Q250,220 500,120 Q560,90 600,60 L600,0 L0,0 Z" fill="#1c1917"/>
    <path d="M120,160 Q260,260 400,200 Q480,160 550,210" stroke="#064e3b" stroke-width="24" stroke-linecap="round" fill="none"/>
    <path d="M180,210 Q280,310 380,240" stroke="#022c22" stroke-width="16" stroke-linecap="round" fill="none"/>

    <!-- Hanging Moss and Spanish Vines -->
    <line x1="220" y1="230" x2="220" y2="380" stroke="#10b981" stroke-width="4" stroke-dasharray="12 8" opacity="0.75"/>
    <line x1="320" y1="270" x2="320" y2="440" stroke="#059669" stroke-width="5" stroke-dasharray="14 10" opacity="0.8"/>
    <line x1="420" y1="220" x2="420" y2="390" stroke="#34d399" stroke-width="4" stroke-dasharray="10 8" opacity="0.7"/>

    <!-- Glowing Bioluminescent Mushrooms on Mossy Trunk -->
    <g filter="url(#viperGlow)">
      <ellipse cx="90" cy="520" rx="22" ry="9" fill="#38bdf8"/>
      <ellipse cx="110" cy="480" rx="16" ry="7" fill="#67e8f9"/>
      <ellipse cx="80" cy="450" rx="14" ry="6" fill="#a855f7"/>

      <ellipse cx="500" cy="560" rx="24" ry="10" fill="#34d399"/>
      <ellipse cx="480" cy="510" rx="18" ry="8" fill="#10b981"/>
    </g>

    <!-- Serpent Eyes Lurking in the Forest Thicket Hollow -->
    <g filter="url(#viperGlow)">
      <!-- Main Predator Eyes (Serpent / Rattler ambush) -->
      <ellipse cx="280" cy="390" rx="9" ry="6" fill="#facc15"/>
      <ellipse cx="325" cy="390" rx="9" ry="6" fill="#facc15"/>
      <line x1="280" y1="384" x2="280" y2="396" stroke="#000" stroke-width="3"/>
      <line x1="325" y1="384" x2="325" y2="396" stroke="#000" stroke-width="3"/>

      <!-- Second Lurker in Lower Hollow -->
      <circle cx="210" cy="620" r="6" fill="#ef4444"/>
      <circle cx="230" cy="620" r="6" fill="#ef4444"/>
    </g>

    <!-- Forest Floor Moss & Ferns -->
    <path d="M-50,700 Q300,620 650,700 L650,840 L-50,840 Z" fill="#022c22"/>
    <!-- Giant Fern Leaves in Foreground -->
    <path d="M40,840 Q120,720 220,730 Q140,780 80,840 Z" fill="#059669"/>
    <path d="M560,840 Q480,700 370,720 Q450,780 500,840 Z" fill="#047857"/>
  </svg>
  `;
  await svgToJpg(forestEncSvg, path.join(adventureDir, 'forest_encounter.jpg'));

  // 7. Start Tile
  const startTileSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="startSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="45%" stop-color="#38bdf8"/>
        <stop offset="85%" stop-color="#fef08a"/>
      </linearGradient>
      <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#b45309"/>
        <stop offset="50%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <filter id="startShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#022c22" flood-opacity="0.45"/>
      </filter>
    </defs>
    <!-- Sunny Bright Sky -->
    <rect width="600" height="840" fill="url(#startSky)"/>
    <!-- Distant Mountains -->
    <polygon points="60,450 180,310 300,450" fill="#93c5fd" opacity="0.6"/>
    <polygon points="260,470 390,320 520,470" fill="#bfdbfe" opacity="0.55"/>

    <!-- Rolling Green Crossroads Meadow -->
    <path d="M-50,510 Q280,440 650,510 L650,840 L-50,840 Z" fill="url(#fieldGrad)"/>

    <!-- Forking Cobblestone Path / Dirt Crossroads -->
    <path d="M220,840 C240,700 270,640 280,590 C290,540 310,540 320,590 C330,640 360,700 380,840 Z" fill="#d97706" opacity="0.4"/>
    <path d="M250,840 C270,720 290,660 300,600 C310,660 330,720 350,840 Z" fill="#b45309" opacity="0.5"/>
    <!-- Left & Right Road forks -->
    <path d="M300,600 Q160,560 60,540 L40,570 Q160,590 300,630 Z" fill="#b45309" opacity="0.45"/>
    <path d="M300,600 Q440,560 540,540 L560,570 Q440,590 300,630 Z" fill="#b45309" opacity="0.45"/>

    <!-- Iconic Crossroads Signpost in Center -->
    <g filter="url(#startShadow)">
      <!-- Main wooden vertical post -->
      <rect x="288" y="380" width="24" height="260" rx="4" fill="url(#woodGrad)"/>
      <polygon points="280,640 320,640 330,660 270,660" fill="#451a03"/>

      <!-- Signboard pointing Right (Grasslands & Village) -->
      <polygon points="270,410 430,410 460,430 430,450 270,450" fill="url(#woodGrad)"/>
      <rect x="280" y="415" width="140" height="30" fill="#92400e"/>
      <text x="290" y="435" font-family="sans-serif" font-weight="bold" font-size="14" fill="#fef08a">&#10132; VILLAGE</text>

      <!-- Signboard pointing Left (Forest & Wilds) -->
      <polygon points="330,465 170,465 140,485 170,505 330,505" fill="url(#woodGrad)"/>
      <rect x="175" y="470" width="145" height="30" fill="#92400e"/>
      <text x="185" y="490" font-family="sans-serif" font-weight="bold" font-size="14" fill="#fef08a">&#11013; FOREST</text>

      <!-- Lantern hanging on the post -->
      <line x1="288" y1="400" x2="250" y2="400" stroke="#78350f" stroke-width="5"/>
      <rect x="240" y="405" width="20" height="28" rx="3" fill="#fef08a" stroke="#451a03" stroke-width="2.5"/>
      <circle cx="250" cy="419" r="6" fill="#ea580c"/>
    </g>

    <!-- Cheerful Wildflowers at the Signpost Base -->
    <circle cx="260" cy="650" r="6" fill="#f43f5e"/>
    <circle cx="275" cy="662" r="5" fill="#facc15"/>
    <circle cx="330" cy="655" r="6" fill="#38bdf8"/>
    <circle cx="345" cy="665" r="5" fill="#ec4899"/>
    <circle cx="140" cy="740" r="7" fill="#a855f7"/>
    <circle cx="460" cy="740" r="7" fill="#fbbf24"/>
  </svg>
  `;
  await svgToJpg(startTileSvg, path.join(adventureDir, 'start_tile.jpg'));

  // 8. Ramram (Creature: Level 2 mountain ram / goat warrior on grasslands)
  const ramramSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ramSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="60%" stop-color="#7dd3fc"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
      <linearGradient id="ramFleece" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="60%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
      <linearGradient id="hornGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="40%" stop-color="#d97706"/>
        <stop offset="80%" stop-color="#92400e"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fed7aa"/>
        <stop offset="100%" stop-color="#fb923c"/>
      </linearGradient>
      <filter id="ramShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#064e3b" flood-opacity="0.4"/>
      </filter>
    </defs>
    <!-- Sunny Plains Sky -->
    <rect width="600" height="840" fill="url(#ramSky)"/>
    <circle cx="490" cy="160" r="50" fill="#fef08a"/>

    <!-- Mountain Ridge & Meadow -->
    <polygon points="80,480 220,320 360,480" fill="#93c5fd" opacity="0.6"/>
    <polygon points="280,500 420,340 560,500" fill="#bfdbfe" opacity="0.5"/>
    <path d="M-50,560 Q300,480 650,560 L650,840 L-50,840 Z" fill="#22c55e"/>

    <!-- Ramram Character Art -->
    <g filter="url(#ramShadow)">
      <!-- Sturdy Hooves & Legs -->
      <rect x="220" y="580" width="34" height="110" rx="6" fill="#cbd5e1"/>
      <rect x="220" y="660" width="34" height="30" rx="4" fill="#451a03"/>

      <rect x="270" y="600" width="34" height="100" rx="6" fill="#94a3b8"/>
      <rect x="270" y="670" width="34" height="30" rx="4" fill="#334155"/>

      <rect x="345" y="580" width="34" height="110" rx="6" fill="#cbd5e1"/>
      <rect x="345" y="660" width="34" height="30" rx="4" fill="#451a03"/>

      <!-- Fluffy Stout Body -->
      <ellipse cx="300" cy="510" rx="140" ry="110" fill="url(#ramFleece)"/>
      <circle cx="210" cy="530" r="45" fill="#f8fafc"/>
      <circle cx="390" cy="530" r="45" fill="#f8fafc"/>
      <circle cx="300" cy="580" r="55" fill="#f1f5f9"/>

      <!-- Small Fluffy Tail -->
      <circle cx="160" cy="490" r="28" fill="#ffffff"/>

      <!-- Head & Snout -->
      <ellipse cx="360" cy="380" rx="70" ry="75" fill="url(#ramFleece)"/>
      <path d="M370,370 Q430,390 440,430 Q400,460 360,440 Z" fill="url(#skinGrad)"/>
      <!-- Nostril & Cute Mouth -->
      <ellipse cx="420" cy="425" rx="5" ry="3" fill="#451a03"/>
      <path d="M410,435 Q425,445 435,435" stroke="#451a03" stroke-width="3" fill="none"/>

      <!-- Brave Expressive Eyes -->
      <ellipse cx="380" cy="360" rx="14" ry="18" fill="#1e293b"/>
      <circle cx="376" cy="354" r="5" fill="#ffffff"/>
      <circle cx="383" cy="366" r="2.5" fill="#ffffff"/>

      <!-- Massive Spiraled Golden Horns -->
      <!-- Left Horn (Behind) -->
      <path d="M320,330 C260,260 220,330 240,400 C250,440 280,440 285,410 C290,380 270,350 300,340 Z" fill="url(#hornGrad)"/>
      <!-- Right Horn (Foreground) -->
      <path d="M360,320 C420,220 490,260 480,360 C470,420 420,430 400,390 C390,360 420,320 380,330 Z" fill="url(#hornGrad)"/>
      <!-- Horn ridges -->
      <path d="M410,290 Q430,280 445,300" stroke="#fef08a" stroke-width="4" fill="none"/>
      <path d="M440,320 Q465,315 470,340" stroke="#fef08a" stroke-width="4" fill="none"/>
      <path d="M440,365 Q450,380 430,395" stroke="#fef08a" stroke-width="4" fill="none"/>

      <!-- Warrior Headband / Bell Collar -->
      <path d="M320,440 Q360,470 410,430" stroke="#dc2626" stroke-width="12" fill="none"/>
      <circle cx="365" cy="460" r="14" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
    </g>

    <!-- Foreground Grass & Buttercups -->
    <path d="M80,840 Q110,740 140,710 Q100,770 70,840 Z" fill="#15803d"/>
    <path d="M460,840 Q490,730 520,700 Q480,760 440,840 Z" fill="#15803d"/>
    <circle cx="160" cy="740" r="6" fill="#facc15"/>
    <circle cx="480" cy="750" r="6" fill="#facc15"/>
  </svg>
  `;
  await svgToJpg(ramramSvg, path.join(creaturesDir, 'ramram.jpg'));

  // 9. Rattler (Creature: Level 2 pit viper / snake in enchanted forest)
  const rattlerSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="serpentSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#022c22"/>
        <stop offset="50%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>
      <linearGradient id="snakeSkin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10b981"/>
        <stop offset="35%" stop-color="#059669"/>
        <stop offset="70%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#064e3b"/>
      </linearGradient>
      <linearGradient id="snakeBelly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#facc15"/>
      </linearGradient>
      <linearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#292524"/>
        <stop offset="50%" stop-color="#44403c"/>
        <stop offset="100%" stop-color="#1c1917"/>
      </linearGradient>
      <filter id="snakeShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#022c22" flood-opacity="0.55"/>
      </filter>
      <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Forest Twilight Background -->
    <rect width="600" height="840" fill="url(#serpentSky)"/>
    <circle cx="300" cy="380" r="240" fill="#10b981" opacity="0.12"/>

    <!-- Ancient Gnarled Tree Branch -->
    <g filter="url(#snakeShadow)">
      <path d="M-50,560 Q260,520 420,460 Q520,420 650,380 L650,490 Q500,530 380,570 Q220,620 -50,660 Z" fill="url(#branchGrad)"/>
      <!-- Moss patches on branch -->
      <ellipse cx="140" cy="570" rx="60" ry="14" fill="#15803d"/>
      <ellipse cx="380" cy="505" rx="50" ry="12" fill="#15803d"/>
    </g>

    <!-- Coiled Rattler Serpent Body -->
    <g filter="url(#snakeShadow)">
      <!-- Background Coils -->
      <path d="M160,540 C120,440 220,380 320,420 C420,460 450,560 380,620 C320,680 180,660 140,580" 
            stroke="url(#snakeSkin)" stroke-width="58" stroke-linecap="round" fill="none"/>
      
      <!-- Belly Scales Overlay -->
      <path d="M160,540 C120,440 220,380 320,420 C420,460 450,560 380,620 C320,680 180,660 140,580" 
            stroke="url(#snakeBelly)" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.85"/>

      <!-- Diamond Scales Pattern Bands along Coils -->
      <polygon points="210,410 225,395 240,410 225,425" fill="#facc15"/>
      <polygon points="270,415 285,400 300,415 285,430" fill="#facc15"/>
      <polygon points="340,445 355,430 370,445 355,460" fill="#facc15"/>
      <polygon points="390,510 405,495 420,510 405,525" fill="#facc15"/>
      <polygon points="360,590 375,575 390,590 375,605" fill="#facc15"/>
      <polygon points="270,640 285,625 300,640 285,655" fill="#facc15"/>

      <!-- Raised Neck & Menacing Cobra-like Hood / Head -->
      <path d="M340,440 Q390,320 320,250 Q280,210 240,240 Q210,270 250,330 Q280,370 300,420"
            stroke="url(#snakeSkin)" stroke-width="64" stroke-linecap="round" fill="none"/>
      
      <!-- Head -->
      <path d="M220,220 Q290,170 330,230 Q300,280 230,270 Z" fill="url(#snakeSkin)"/>
      <ellipse cx="270" cy="225" rx="55" ry="32" fill="#047857"/>

      <!-- Vivid Glowing Golden Viper Eyes with Vertical Slits -->
      <g filter="url(#eyeGlow)">
        <ellipse cx="270" cy="205" rx="14" ry="10" fill="#facc15"/>
        <line x1="270" y1="197" x2="270" y2="213" stroke="#000000" stroke-width="4"/>
        <circle cx="266" cy="202" r="3" fill="#ffffff"/>
      </g>

      <!-- Forked Flickering Red Tongue -->
      <path d="M190,245 Q160,250 140,245 L125,230 M140,245 L125,260" stroke="#ef4444" stroke-width="4" stroke-linecap="round" fill="none"/>

      <!-- The Famous Tail Rattle at the end of the coil! -->
      <g transform="translate(110, 580) rotate(-40)">
        <ellipse cx="0" cy="0" rx="14" ry="10" fill="#fef08a" stroke="#78350f" stroke-width="2"/>
        <ellipse cx="14" cy="0" rx="12" ry="9" fill="#facc15" stroke="#78350f" stroke-width="2"/>
        <ellipse cx="26" cy="0" rx="10" ry="8" fill="#eab308" stroke="#78350f" stroke-width="2"/>
        <ellipse cx="36" cy="0" rx="8" ry="7" fill="#ca8a04" stroke="#78350f" stroke-width="2"/>
        <ellipse cx="44" cy="0" rx="6" ry="5" fill="#a16207" stroke="#78350f" stroke-width="2"/>
      </g>
    </g>

    <!-- Glowing Spores in the Canopy -->
    <circle cx="120" cy="280" r="5" fill="#6ee7b7" opacity="0.8"/>
    <circle cx="160" cy="180" r="4" fill="#a7f3d0" opacity="0.7"/>
    <circle cx="440" cy="240" r="6" fill="#34d399" opacity="0.6"/>
    <circle cx="490" cy="360" r="5" fill="#6ee7b7" opacity="0.75"/>
  </svg>
  `;
  await svgToJpg(rattlerSvg, path.join(creaturesDir, 'rattler.jpg'));

  console.log('All raster arts generated successfully!');
}

main().catch(console.error);
