const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.resolve(__dirname, '../public/cards/adventure');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// 1. GRASSLAND (Vibrant, sun-drenched rolling meadows, wildflowers, blue sky)
// ============================================================================
function renderGrasslandSvg() {
  const r = rng(77123);
  let clouds = '';
  for (let i = 0; i < 7; i++) {
    const cx = 50 + i * 85 + (r() - 0.5) * 40;
    const cy = 100 + r() * 90;
    const rx = 60 + r() * 50;
    const ry = 25 + r() * 20;
    clouds += `
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="0.82" filter="url(#blurSoft)"/>
      <ellipse cx="${cx + 15}" cy="${cy - 10}" rx="${rx * 0.7}" ry="${ry * 0.85}" fill="#ffffff" opacity="0.95"/>
      <ellipse cx="${cx - 15}" cy="${cy + 6}" rx="${rx * 0.75}" ry="${ry * 0.7}" fill="#e0f2fe" opacity="0.7"/>
    `;
  }

  // Hundreds of layered wildflowers
  let flowers = '';
  for (let i = 0; i < 260; i++) {
    const fx = r() * 600;
    const fy = 480 + r() * 360;
    const size = 1.8 + ((fy - 480) / 360) * 4.2;
    const col = r() > 0.65 ? '#fde047' : r() > 0.45 ? '#f43f5e' : r() > 0.25 ? '#ffffff' : r() > 0.1 ? '#a855f7' : '#38bdf8';
    flowers += `
      <circle cx="${fx}" cy="${fy}" r="${size}" fill="${col}" opacity="${0.8 + r() * 0.2}"/>
      <circle cx="${fx}" cy="${fy}" r="${size * 0.4}" fill="#f59e0b" opacity="0.9"/>
    `;
  }

  // Clumps of grass blades
  let grassBlades = '';
  for (let i = 0; i < 90; i++) {
    const gx = r() * 600;
    const gy = 560 + r() * 280;
    const gh = 10 + r() * 22;
    grassBlades += `
      <path d="M${gx},${gy} Q${gx + 4},${gy - gh} ${gx + 8},${gy - gh - 4} Q${gx + 3},${gy - gh / 2} ${gx + 1},${gy} Z" fill="#86efac" opacity="0.8"/>
      <path d="M${gx + 5},${gy} Q${gx + 1},${gy - gh * 0.8} ${gx - 3},${gy - gh} Q${gx + 2},${gy - gh / 2} ${gx + 4},${gy} Z" fill="#4ade80" opacity="0.85"/>
    `;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="30%" stop-color="#38bdf8"/>
        <stop offset="60%" stop-color="#7dd3fc"/>
        <stop offset="85%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
      <radialGradient id="gSun" cx="75%" cy="22%" r="45%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="15%" stop-color="#fffbeb" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#fef08a" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gMountFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#c7d2fe" stop-opacity="0.2"/>
      </linearGradient>
      <linearGradient id="gMountMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.4"/>
      </linearGradient>
      <linearGradient id="gHill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
      <linearGradient id="gHill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#16a34a"/>
      </linearGradient>
      <linearGradient id="gHill3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="60%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="gHillNear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#bbf7d0"/>
        <stop offset="45%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#166534"/>
      </linearGradient>
      <linearGradient id="gPath" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fde68a" stop-opacity="0.5"/>
        <stop offset="60%" stop-color="#d97706" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#92400e"/>
      </linearGradient>
      <filter id="blurSoft" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="4"/>
      </filter>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Sky -->
    <rect width="600" height="840" fill="url(#gSky)"/>

    <!-- Radiant Sun & Corona -->
    <circle cx="450" cy="180" r="160" fill="url(#gSun)"/>
    <circle cx="450" cy="180" r="42" fill="#ffffff" filter="url(#glow)"/>

    <!-- Soft Volumetric Clouds -->
    ${clouds}

    <!-- Distant Mountains Layer 1 -->
    <path d="M-20,410 Q80,310 180,360 T380,330 T620,350 L620,840 L-20,840 Z" fill="url(#gMountFar)"/>
    <!-- Distant Mountains Layer 2 -->
    <path d="M-20,440 Q120,360 260,400 T520,380 T620,410 L620,840 L-20,840 Z" fill="url(#gMountMid)"/>

    <!-- Rolling Hills Wave 1 -->
    <path d="M-20,480 Q140,430 320,470 T620,450 L620,840 L-20,840 Z" fill="url(#gHill1)"/>
    <!-- Rolling Hills Wave 2 -->
    <path d="M-20,530 Q200,480 420,520 T620,500 L620,840 L-20,840 Z" fill="url(#gHill2)"/>

    <!-- Winding Country Dirt Path -->
    <path d="M260,840 Q290,720 330,640 Q365,560 380,510 L398,510 Q382,560 350,640 Q315,720 295,840 Z" fill="url(#gPath)"/>
    <path d="M272,840 Q300,730 336,650 Q368,575 382,525 L388,525 Q375,575 345,650 Q312,730 286,840 Z" fill="#fbbf24" opacity="0.45"/>

    <!-- Foreground Rolling Knoll -->
    <path d="M-30,610 Q160,560 360,610 T630,590 L630,840 L-30,840 Z" fill="url(#gHill3)"/>
    <path d="M-20,690 Q220,630 460,680 T620,670 L620,840 L-20,840 Z" fill="url(#gHillNear)"/>

    <!-- Grass Blade Tufts -->
    ${grassBlades}

    <!-- Field of Wildflowers -->
    ${flowers}

    <!-- Atmospheric Sunlight Flares -->
    <ellipse cx="250" cy="380" r="14" fill="#ffffff" opacity="0.3" filter="url(#glow)"/>
    <ellipse cx="180" cy="480" r="22" fill="#fef08a" opacity="0.25" filter="url(#glow)"/>
  </svg>`;
}

// ============================================================================
// 2. FOREST (Enchanted ancient emerald woods with sunbeams & glowing flora)
// ============================================================================
function renderForestSvg() {
  const r = rng(99341);

  // Background tree silhouettes
  let bgTrees = '';
  for (let i = 0; i < 35; i++) {
    const tx = r() * 640 - 20;
    const ty = 340 + r() * 150;
    const tw = 30 + r() * 40;
    const th = 260 + r() * 220;
    bgTrees += `<polygon points="${tx},${ty} ${tx + tw / 2},${ty - th} ${tx + tw},${ty}" fill="#064e3b" opacity="${0.45 + r() * 0.4}"/>`;
  }

  // Foreground & midground massive trunks with organic roots
  let bigTrees = `
    <!-- Left Gnarled Grand Oak -->
    <path d="M-40,840 Q30,650 40,380 Q45,180 50,0 L130,0 Q120,200 110,420 Q120,680 190,840 Z" fill="#03221b"/>
    <path d="M-20,840 Q40,660 52,400 L85,400 Q75,680 140,840 Z" fill="#043a2f" opacity="0.6"/>
    <!-- Hanging moss & creeping ivy on left tree -->
    <path d="M30,300 Q15,360 25,420 Q35,480 20,540 L35,540 Q45,470 38,410 Z" fill="#10b981" opacity="0.75"/>
    <path d="M70,240 Q90,320 80,410 L95,410 Q105,310 85,240 Z" fill="#34d399" opacity="0.65"/>

    <!-- Right Ancient Trunk -->
    <path d="M460,840 Q510,650 500,380 Q495,160 510,0 L610,0 Q600,200 580,440 Q590,660 640,840 Z" fill="#021c16"/>
    <path d="M480,840 Q525,660 520,400 L555,400 Q550,680 595,840 Z" fill="#064e3b" opacity="0.55"/>

    <!-- Center Midground Trunk -->
    <path d="M260,780 Q290,560 285,340 L335,340 Q330,560 360,780 Z" fill="#043329"/>
  `;

  // Dense canopy foliage clusters
  let canopy = '';
  for (let i = 0; i < 24; i++) {
    const cx = r() * 640 - 20;
    const cy = r() * 260 - 40;
    const rx = 80 + r() * 90;
    const ry = 60 + r() * 70;
    const col = r() > 0.6 ? '#065f46' : r() > 0.3 ? '#047857' : '#059669';
    canopy += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${0.8 + r() * 0.15}"/>`;
  }

  // Bioluminescent glowing mushrooms along tree bases and path
  let mushrooms = '';
  const shroomLocs = [
    [70, 720, '#06b6d4'], [95, 750, '#38bdf8'], [50, 770, '#06b6d4'],
    [450, 730, '#c084fc'], [480, 755, '#e879f9'], [435, 780, '#c084fc'],
    [230, 680, '#f43f5e'], [250, 695, '#fb7185'], [340, 705, '#34d399']
  ];
  shroomLocs.forEach(([mx, my, col]) => {
    mushrooms += `
      <!-- Glow halo -->
      <circle cx="${mx}" cy="${my}" r="24" fill="${col}" opacity="0.35" filter="url(#fGlow)"/>
      <!-- Stem -->
      <path d="M${mx - 2},${my + 14} Q${mx},${my + 4} ${mx},${my} L${mx + 4},${my} Q${mx + 4},${my + 4} ${mx + 6},${my + 14} Z" fill="#e0f2fe"/>
      <!-- Cap -->
      <ellipse cx="${mx + 2}" cy="${my}" rx="12" ry="7" fill="${col}"/>
      <ellipse cx="${mx + 2}" cy="${my - 2}" rx="8" ry="4" fill="#ffffff" opacity="0.6"/>
      <circle cx="${mx - 3}" cy="${my - 1}" r="1.5" fill="#ffffff"/>
      <circle cx="${mx + 5}" cy="${my - 1}" r="1.2" fill="#ffffff"/>
    `;
  });

  // Floating magical spores / fireflies
  let motes = '';
  for (let i = 0; i < 55; i++) {
    const px = r() * 600;
    const py = 180 + r() * 580;
    const pr = 1.5 + r() * 2.8;
    const pcol = r() > 0.5 ? '#6ee7b7' : r() > 0.25 ? '#a7f3d0' : '#fef08a';
    motes += `<circle cx="${px}" cy="${py}" r="${pr}" fill="${pcol}" opacity="${0.6 + r() * 0.4}" filter="url(#fGlow)"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#022c22"/>
        <stop offset="35%" stop-color="#064e3b"/>
        <stop offset="70%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="fSunbeam" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.6"/>
        <stop offset="45%" stop-color="#6ee7b7" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fFloor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#065f46"/>
        <stop offset="40%" stop-color="#03382c"/>
        <stop offset="100%" stop-color="#011b15"/>
      </linearGradient>
      <radialGradient id="fCanopyLight" cx="45%" cy="20%" r="65%">
        <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.55"/>
        <stop offset="50%" stop-color="#047857" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#022c22" stop-opacity="0"/>
      </radialGradient>
      <filter id="fGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Deep Ambient Forest Atmosphere -->
    <rect width="600" height="840" fill="url(#fSky)"/>
    <rect width="600" height="840" fill="url(#fCanopyLight)"/>

    <!-- Background Silhouette Pines -->
    ${bgTrees}

    <!-- Midground Tree Canopies -->
    ${canopy}

    <!-- Giant Trunks -->
    ${bigTrees}

    <!-- Dramatic God Rays / Sunlight Shafts -->
    <polygon points="120,0 230,0 490,840 330,840" fill="url(#fSunbeam)"/>
    <polygon points="280,0 380,0 590,840 450,840" fill="url(#fSunbeam)" opacity="0.8"/>
    <polygon points="40,0 110,0 290,840 190,840" fill="url(#fSunbeam)" opacity="0.55"/>

    <!-- Mossy Forest Floor -->
    <path d="M-30,680 Q180,630 380,660 T630,650 L630,840 L-30,840 Z" fill="url(#fFloor)"/>

    <!-- Winding Moss & Dirt Trail -->
    <path d="M220,840 Q260,740 285,690 Q315,645 325,600 L345,600 Q335,645 315,690 Q285,745 255,840 Z" fill="#1b4d3e"/>
    <path d="M232,840 Q270,745 292,695 Q318,650 328,610 L336,610 Q326,650 302,695 Q276,745 244,840 Z" fill="#3f6f59" opacity="0.75"/>

    <!-- Bioluminescent Glowing Mushrooms -->
    ${mushrooms}

    <!-- Floating Spores / Fireflies -->
    ${motes}
  </svg>`;
}

// ============================================================================
// 3. GRASSLAND VILLAGE (Cozy medieval fantasy cottages, windmill, brook, gardens)
// ============================================================================
function renderVillageSvg() {
  const r = rng(44182);

  // Soft morning clouds
  let clouds = '';
  for (let i = 0; i < 5; i++) {
    const cx = 70 + i * 115 + (r() - 0.5) * 30;
    const cy = 90 + r() * 70;
    clouds += `
      <ellipse cx="${cx}" cy="${cy}" rx="${50 + r() * 40}" ry="${22 + r() * 16}" fill="#ffffff" opacity="0.85"/>
      <ellipse cx="${cx + 10}" cy="${cy - 8}" rx="${35 + r() * 25}" ry="${18 + r() * 12}" fill="#ffffff" opacity="0.95"/>
    `;
  }

  // Garden flowers in village
  let gardenFlowers = '';
  for (let i = 0; i < 90; i++) {
    const fx = 40 + r() * 520;
    const fy = 650 + r() * 180;
    const col = r() > 0.6 ? '#ec4899' : r() > 0.35 ? '#eab308' : r() > 0.15 ? '#8b5cf6' : '#ffffff';
    gardenFlowers += `<circle cx="${fx}" cy="${fy}" r="${2 + r() * 3}" fill="${col}" opacity="0.85"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="40%" stop-color="#7dd3fc"/>
        <stop offset="75%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <radialGradient id="vSun" cx="20%" cy="20%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#fffbeb"/>
        <stop offset="55%" stop-color="#fef08a" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="vHillsFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="vHillsMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="vHillsNear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="60%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#166534"/>
      </linearGradient>
      <linearGradient id="vThatch" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fde047"/>
        <stop offset="35%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <linearGradient id="vPlaster" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef3c7"/>
        <stop offset="100%" stop-color="#d97706" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="vStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <linearGradient id="vStream" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#e0f2fe"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <filter id="vGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Sky -->
    <rect width="600" height="840" fill="url(#vSky)"/>

    <!-- Radiant Morning Sun -->
    <circle cx="130" cy="150" r="130" fill="url(#vSun)"/>
    <circle cx="130" cy="150" r="32" fill="#ffffff"/>

    <!-- Clouds -->
    ${clouds}

    <!-- Distant Mountain Ridge -->
    <path d="M-20,400 Q140,320 280,370 T580,350 L620,400 L620,840 L-20,840 Z" fill="url(#vHillsFar)"/>

    <!-- Midground Rolling Pasture Hills with Sheep -->
    <path d="M-20,470 Q160,420 360,460 T620,440 L620,840 L-20,840 Z" fill="url(#vHillsMid)"/>
    <!-- Tiny Sheep dots on distant hill -->
    <ellipse cx="280" cy="445" rx="4" ry="2.5" fill="#ffffff"/>
    <ellipse cx="292" cy="447" rx="3.5" ry="2" fill="#ffffff"/>
    <ellipse cx="304" cy="444" rx="4.5" ry="2.8" fill="#ffffff"/>

    <!-- Quaint Hillside Windmill (Right background) -->
    <!-- Tower -->
    <polygon points="460,430 475,340 505,340 520,430" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
    <!-- Dome Roof -->
    <path d="M470,340 Q490,310 510,340 Z" fill="#991b1b"/>
    <!-- Mill Sails / Blades -->
    <g transform="translate(490, 340)">
      <line x1="0" y1="0" x2="0" y2="-55" stroke="#78350f" stroke-width="3"/>
      <polygon points="0,-55 18,-50 18,-15 0,-15" fill="#fef3c7" stroke="#78350f" stroke-width="1.2"/>
      <line x1="0" y1="0" x2="0" y2="55" stroke="#78350f" stroke-width="3"/>
      <polygon points="0,55 -18,50 -18,15 0,15" fill="#fef3c7" stroke="#78350f" stroke-width="1.2"/>
      <line x1="0" y1="0" x2="-55" y2="0" stroke="#78350f" stroke-width="3"/>
      <polygon points="-55,0 -50,-18 -15,-18 -15,0" fill="#fef3c7" stroke="#78350f" stroke-width="1.2"/>
      <line x1="0" y1="0" x2="55" y2="0" stroke="#78350f" stroke-width="3"/>
      <polygon points="55,0 50,18 15,18 15,0" fill="#fef3c7" stroke="#78350f" stroke-width="1.2"/>
      <circle cx="0" cy="0" r="5" fill="#451a03"/>
    </g>

    <!-- Foreground Pasture Terrace -->
    <path d="M-20,560 Q200,500 420,550 T620,530 L620,840 L-20,840 Z" fill="url(#vHillsNear)"/>

    <!-- Winding Village Cobblestone Lane -->
    <path d="M190,840 Q230,730 260,650 Q290,570 320,510 L345,510 Q325,570 295,650 Q265,730 230,840 Z" fill="#78716c"/>
    <path d="M202,840 Q238,735 266,655 Q294,575 324,515 L334,515 Q310,575 284,655 Q256,735 218,840 Z" fill="#d6d3d1" opacity="0.6"/>

    <!-- Crystal Village Brook flowing through pasture -->
    <path d="M420,840 Q400,750 380,690 Q360,630 350,580 L368,580 Q378,630 398,690 Q418,750 442,840 Z" fill="url(#vStream)"/>
    <!-- Small arched stone bridge over brook -->
    <path d="M360,670 Q395,655 430,670 L430,684 Q395,668 360,684 Z" fill="url(#vStone)"/>

    <!-- Main Medieval Thatched Cottage (Foreground Left) -->
    <!-- Stone Foundation -->
    <rect x="50" y="580" width="160" height="70" fill="url(#vStone)"/>
    <!-- Timbered Plaster Wall -->
    <rect x="50" y="500" width="160" height="80" fill="url(#vPlaster)"/>
    <!-- Half-timber Beams -->
    <line x1="50" y1="500" x2="210" y2="500" stroke="#451a03" stroke-width="4"/>
    <line x1="50" y1="540" x2="210" y2="540" stroke="#451a03" stroke-width="3"/>
    <line x1="50" y1="580" x2="210" y2="580" stroke="#451a03" stroke-width="4"/>
    <line x1="90" y1="500" x2="90" y2="580" stroke="#451a03" stroke-width="4"/>
    <line x1="170" y1="500" x2="170" y2="580" stroke="#451a03" stroke-width="4"/>
    <line x1="50" y1="500" x2="90" y2="540" stroke="#451a03" stroke-width="3"/>
    <line x1="170" y1="500" x2="210" y2="540" stroke="#451a03" stroke-width="3"/>

    <!-- Arched Wooden Oak Door -->
    <path d="M110,580 L110,650 L150,650 L150,580 Q130,560 110,580 Z" fill="#78350f" stroke="#451a03" stroke-width="2"/>
    <circle cx="142" cy="615" r="2.5" fill="#fbbf24"/>

    <!-- Glowing Cozy Amber Windows with diamond leaded panes -->
    <g transform="translate(62, 515)">
      <rect width="22" height="24" fill="#fde047" stroke="#451a03" stroke-width="2" filter="url(#vGlow)"/>
      <line x1="11" y1="0" x2="11" y2="24" stroke="#451a03" stroke-width="1.5"/>
      <line x1="0" y1="12" x2="22" y2="12" stroke="#451a03" stroke-width="1.5"/>
      <!-- Window flower box -->
      <rect x="-2" y="22" width="26" height="5" fill="#78350f"/>
      <circle cx="2" cy="21" r="3" fill="#ef4444"/>
      <circle cx="8" cy="20" r="3" fill="#f43f5e"/>
      <circle cx="14" cy="21" r="3" fill="#e11d48"/>
      <circle cx="20" cy="20" r="3" fill="#f43f5e"/>
    </g>
    <g transform="translate(176, 515)">
      <rect width="22" height="24" fill="#fde047" stroke="#451a03" stroke-width="2" filter="url(#vGlow)"/>
      <line x1="11" y1="0" x2="11" y2="24" stroke="#451a03" stroke-width="1.5"/>
      <line x1="0" y1="12" x2="22" y2="12" stroke="#451a03" stroke-width="1.5"/>
      <!-- Window flower box -->
      <rect x="-2" y="22" width="26" height="5" fill="#78350f"/>
      <circle cx="2" cy="21" r="3" fill="#ef4444"/>
      <circle cx="8" cy="20" r="3" fill="#fbbf24"/>
      <circle cx="14" cy="21" r="3" fill="#ef4444"/>
      <circle cx="20" cy="20" r="3" fill="#ec4899"/>
    </g>

    <!-- Curved Thick Thatched Roof -->
    <path d="M30,510 Q130,420 230,510 Q130,480 30,510 Z" fill="url(#vThatch)"/>
    <path d="M40,510 Q130,435 220,510 Q130,490 40,510 Z" fill="#ca8a04" opacity="0.6"/>

    <!-- Stone Chimney with White Smoke Puffs -->
    <rect x="70" y="420" width="24" height="60" fill="url(#vStone)"/>
    <ellipse cx="82" cy="405" rx="8" ry="6" fill="#f1f5f9" opacity="0.75" filter="url(#vGlow)"/>
    <ellipse cx="88" cy="380" rx="14" ry="10" fill="#f1f5f9" opacity="0.65" filter="url(#vGlow)"/>
    <ellipse cx="98" cy="345" rx="20" ry="14" fill="#f1f5f9" opacity="0.45" filter="url(#vGlow)"/>

    <!-- Second Cottage (Midground Center-Right) -->
    <rect x="360" y="480" width="110" height="60" fill="url(#vPlaster)"/>
    <path d="M350,485 L415,420 L480,485 Z" fill="#991b1b" stroke="#7f1d1d" stroke-width="2"/>
    <rect x="385" y="495" width="18" height="20" fill="#fde047" stroke="#451a03" stroke-width="1.5" filter="url(#vGlow)"/>
    <rect x="420" y="505" width="20" height="35" fill="#78350f"/>

    <!-- Rustic Split-rail Wooden Fences -->
    <line x1="215" y1="640" x2="270" y2="650" stroke="#78350f" stroke-width="3"/>
    <line x1="215" y1="652" x2="270" y2="662" stroke="#78350f" stroke-width="3"/>
    <line x1="220" y1="630" x2="220" y2="665" stroke="#5c2609" stroke-width="4"/>
    <line x1="245" y1="635" x2="245" y2="670" stroke="#5c2609" stroke-width="4"/>
    <line x1="270" y1="640" x2="270" y2="675" stroke="#5c2609" stroke-width="4"/>

    <!-- Village Flower Gardens & Greenery -->
    ${gardenFlowers}
  </svg>`;
}

// ============================================================================
// 4. GRASSLAND SHRINE (Sacred sun altar, celestial beam of light, glowing runes)
// ============================================================================
function renderShrineSvg() {
  const r = rng(12398);

  // Soft divine clouds parting
  let clouds = '';
  for (let i = 0; i < 6; i++) {
    const cx = (i < 3 ? 60 + i * 70 : 420 + (i - 3) * 70) + (r() - 0.5) * 20;
    const cy = 80 + r() * 90;
    clouds += `
      <ellipse cx="${cx}" cy="${cy}" rx="${65 + r() * 45}" ry="${28 + r() * 20}" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="${cx}" cy="${cy + 8}" rx="${50 + r() * 35}" ry="${20 + r() * 15}" fill="#bae6fd" opacity="0.6"/>
    `;
  }

  // Sacred white lilies and lotus flowers around altar dais
  let lilies = '';
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const lx = 300 + Math.cos(angle) * (140 + r() * 30);
    const ly = 660 + Math.sin(angle) * (50 + r() * 15);
    lilies += `
      <!-- White petals -->
      <ellipse cx="${lx}" cy="${ly}" rx="4" ry="7" fill="#ffffff" transform="rotate(${r() * 45}, ${lx}, ${ly})"/>
      <ellipse cx="${lx}" cy="${ly}" rx="4" ry="7" fill="#fef08a" transform="rotate(${90 + r() * 45}, ${lx}, ${ly})"/>
      <circle cx="${lx}" cy="${ly}" r="2" fill="#eab308"/>
    `;
  }

  // Floating divine sparks / golden embers
  let sparks = '';
  for (let i = 0; i < 60; i++) {
    const sx = 200 + r() * 200;
    const sy = 150 + r() * 520;
    const sr = 1.2 + r() * 2.8;
    sparks += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#fde047" opacity="${0.6 + r() * 0.4}" filter="url(#sBloom)"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="35%" stop-color="#38bdf8"/>
        <stop offset="70%" stop-color="#93c5fd"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <linearGradient id="sBeam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="25%" stop-color="#fef08a" stop-opacity="0.75"/>
        <stop offset="75%" stop-color="#fde047" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ca8a04" stop-opacity="0.1"/>
      </linearGradient>
      <radialGradient id="sAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#fef08a" stop-opacity="0.9"/>
        <stop offset="75%" stop-color="#f59e0b" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="sHills" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="60%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="sMarble" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#cbd5e1"/>
        <stop offset="35%" stop-color="#f8fafc"/>
        <stop offset="70%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
      <linearGradient id="sGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#a16207"/>
      </linearGradient>
      <filter id="sBloom" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Sky -->
    <rect width="600" height="840" fill="url(#sSky)"/>

    <!-- Clouds parting for Heaven's Light -->
    ${clouds}

    <!-- Distant Holy Mountains -->
    <path d="M-20,440 Q150,350 300,410 T620,380 L620,840 L-20,840 Z" fill="#93c5fd" opacity="0.6"/>

    <!-- Sacred Hilltop Knolls -->
    <path d="M-20,530 Q200,470 420,520 T620,490 L620,840 L-20,840 Z" fill="#4ade80"/>
    <path d="M-30,620 Q160,560 380,610 T630,590 L630,840 L-30,840 Z" fill="url(#sHills)"/>

    <!-- Celestial Golden Shaft of Divine Light descending straight down -->
    <polygon points="260,0 340,0 480,840 120,840" fill="url(#sBeam)"/>
    <polygon points="285,0 315,0 420,840 180,840" fill="#ffffff" opacity="0.45" filter="url(#sBloom)"/>

    <!-- Sacred Circular Stepped Stone Dais / Plinth -->
    <!-- Bottom Step -->
    <ellipse cx="300" cy="700" rx="200" ry="45" fill="#64748b"/>
    <ellipse cx="300" cy="695" rx="198" ry="43" fill="url(#sMarble)"/>
    <!-- Middle Step -->
    <ellipse cx="300" cy="670" rx="160" ry="36" fill="#475569"/>
    <ellipse cx="300" cy="665" rx="158" ry="34" fill="url(#sMarble)"/>
    <!-- Top Step -->
    <ellipse cx="300" cy="640" rx="120" ry="28" fill="#334155"/>
    <ellipse cx="300" cy="636" rx="118" ry="26" fill="url(#sMarble)"/>

    <!-- Ancient Fluted Columns / Standing Stones -->
    <!-- Left Column Outer -->
    <rect x="140" y="440" width="28" height="190" fill="url(#sMarble)" rx="3"/>
    <rect x="135" y="430" width="38" height="15" fill="#f1f5f9" rx="2"/>
    <rect x="135" y="620" width="38" height="15" fill="#94a3b8" rx="2"/>
    <!-- Left Column Inner -->
    <rect x="200" y="460" width="24" height="170" fill="url(#sMarble)" rx="3"/>
    <rect x="195" y="450" width="34" height="14" fill="#f1f5f9" rx="2"/>
    <rect x="195" y="620" width="34" height="14" fill="#94a3b8" rx="2"/>
    <!-- Right Column Inner -->
    <rect x="376" y="460" width="24" height="170" fill="url(#sMarble)" rx="3"/>
    <rect x="371" y="450" width="34" height="14" fill="#f1f5f9" rx="2"/>
    <rect x="371" y="620" width="34" height="14" fill="#94a3b8" rx="2"/>
    <!-- Right Column Outer -->
    <rect x="432" y="440" width="28" height="190" fill="url(#sMarble)" rx="3"/>
    <rect x="427" y="430" width="38" height="15" fill="#f1f5f9" rx="2"/>
    <rect x="427" y="620" width="38" height="15" fill="#94a3b8" rx="2"/>

    <!-- Creeping green moss & flowering ivy climbing columns -->
    <path d="M142,580 Q152,540 146,500 L152,500 Q158,540 148,580 Z" fill="#22c55e"/>
    <circle cx="150" cy="530" r="3" fill="#ec4899"/>
    <circle cx="146" cy="510" r="3" fill="#ec4899"/>
    <path d="M438,570 Q430,530 436,490 L442,490 Q436,530 444,570 Z" fill="#22c55e"/>
    <circle cx="434" cy="520" r="3" fill="#38bdf8"/>

    <!-- Central Sacred Sun Altar -->
    <rect x="250" y="520" width="100" height="90" fill="url(#sMarble)" rx="4"/>
    <rect x="240" y="510" width="120" height="16" fill="#f8fafc" rx="3"/>
    <rect x="242" y="600" width="116" height="16" fill="#64748b" rx="3"/>

    <!-- Carved Luminous Celestial Runes in the Altar Stone -->
    <circle cx="300" cy="560" r="22" fill="none" stroke="#fde047" stroke-width="3" filter="url(#sBloom)"/>
    <path d="M300,542 L300,578 M282,560 L318,560 M287,547 L313,573 M287,573 L313,547" stroke="#fde047" stroke-width="2.5" filter="url(#sBloom)"/>

    <!-- Levitating Sacred Sun Relic above the Altar -->
    <circle cx="300" cy="440" r="45" fill="url(#sAura)" filter="url(#sBloom)"/>
    <!-- Floating Golden Octahedron / Sun Diamond -->
    <polygon points="300,405 325,440 300,475 275,440" fill="url(#sGold)" filter="url(#sBloom)"/>
    <polygon points="300,405 325,440 300,440" fill="#fef08a" opacity="0.8"/>
    <polygon points="300,440 325,440 300,475" fill="#ca8a04" opacity="0.9"/>
    <circle cx="300" cy="440" r="8" fill="#ffffff" filter="url(#sBloom)"/>

    <!-- Sacred White Lilies Ring -->
    ${lilies}

    <!-- Divine Sparks & Celestial Floating Light Motes -->
    ${sparks}
  </svg>`;
}

// ============================================================================
// 5. GRASSLAND ENCOUNTER (Dramatic twilight sunset, windswept grass, glowing eyes)
// ============================================================================
function renderGrasslandEncounterSvg() {
  const r = rng(66782);

  // Fierce wind-swept golden & dark prairie grass blades
  let tallGrass = '';
  for (let i = 0; i < 280; i++) {
    const gx = r() * 620 - 10;
    const gy = 580 + r() * 260;
    const gh = 35 + r() * 55;
    const bend = 15 + r() * 25;
    const col = r() > 0.6 ? '#78350f' : r() > 0.35 ? '#d97706' : r() > 0.15 ? '#b45309' : '#451a03';
    tallGrass += `
      <path d="M${gx},${gy} Q${gx + bend * 0.5},${gy - gh * 0.6} ${gx + bend},${gy - gh} Q${gx + bend * 0.4},${gy - gh * 0.4} ${gx + 3},${gy} Z" fill="${col}"/>
    `;
  }

  // Glowing monster eyes lurking in dark grass
  const eyePairs = [
    [120, 690, '#facc15', 3.5],
    [190, 750, '#ef4444', 3],
    [380, 670, '#facc15', 4],
    [480, 720, '#ef4444', 3.5],
    [290, 780, '#facc15', 3.2],
  ];
  let monsterEyes = '';
  eyePairs.forEach(([ex, ey, col, sz]) => {
    monsterEyes += `
      <!-- Left eye -->
      <ellipse cx="${ex}" cy="${ey}" rx="${sz}" ry="${sz * 0.6}" fill="${col}" filter="url(#eGlow)"/>
      <ellipse cx="${ex}" cy="${ey}" rx="${sz * 0.4}" ry="${sz * 0.6}" fill="#000000"/>
      <!-- Right eye -->
      <ellipse cx="${ex + sz * 3.5}" cy="${ey}" rx="${sz}" ry="${sz * 0.6}" fill="${col}" filter="url(#eGlow)"/>
      <ellipse cx="${ex + sz * 3.5}" cy="${ey}" rx="${sz * 0.4}" ry="${sz * 0.6}" fill="#000000"/>
    `;
  });

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="eSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="25%" stop-color="#4c1d95"/>
        <stop offset="50%" stop-color="#831843"/>
        <stop offset="70%" stop-color="#be123c"/>
        <stop offset="85%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#fde047"/>
      </linearGradient>
      <radialGradient id="eSunset" cx="60%" cy="65%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="20%" stop-color="#fef08a"/>
        <stop offset="45%" stop-color="#f97316" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#be123c" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="eStormClouds" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#312e81" stop-opacity="0.6"/>
      </linearGradient>
      <linearGradient id="eRidgeFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#831843"/>
        <stop offset="100%" stop-color="#31102b"/>
      </linearGradient>
      <linearGradient id="eRidgeMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b45309"/>
        <stop offset="100%" stop-color="#1c1917"/>
      </linearGradient>
      <linearGradient id="eGround" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#451a03"/>
        <stop offset="50%" stop-color="#1c1917"/>
        <stop offset="100%" stop-color="#090503"/>
      </linearGradient>
      <filter id="eGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Fiery Sunset Twilight Sky -->
    <rect width="600" height="840" fill="url(#eSky)"/>

    <!-- Sinking Sun on the Horizon -->
    <circle cx="360" cy="540" r="160" fill="url(#eSunset)"/>
    <circle cx="360" cy="540" r="38" fill="#ffffff" filter="url(#eGlow)"/>

    <!-- Ominous Swirling Dusk Cloudbank -->
    <path d="M-20,120 Q120,60 280,110 T620,80 L620,280 Q450,220 280,260 T-20,240 Z" fill="url(#eStormClouds)"/>
    <path d="M-20,260 Q180,210 380,250 T620,230 L620,380 Q420,340 220,370 T-20,350 Z" fill="url(#eStormClouds)" opacity="0.7"/>

    <!-- Distant Jagged Ridge Silhouettes -->
    <path d="M-20,490 L90,440 L210,480 L350,430 L480,470 L620,440 L620,840 L-20,840 Z" fill="url(#eRidgeFar)"/>

    <!-- Midground Windswept Hills with Menacing Outcrops -->
    <path d="M-20,560 Q180,510 380,550 T620,530 L620,840 L-20,840 Z" fill="url(#eRidgeMid)"/>

    <!-- Menacing Monster Silhouette crouching on ridge -->
    <path d="M470,530 Q485,505 500,515 Q515,495 530,520 Q545,510 550,535 Z" fill="#090503"/>
    <circle cx="505" cy="510" r="2" fill="#ef4444" filter="url(#eGlow)"/>
    <circle cx="518" cy="510" r="2" fill="#ef4444" filter="url(#eGlow)"/>

    <!-- Foreground Prairie Ground -->
    <path d="M-20,650 Q220,600 440,640 T620,620 L620,840 L-20,840 Z" fill="url(#eGround)"/>

    <!-- Thick Swath of Wind-whipped Golden Prairie Grass -->
    ${tallGrass}

    <!-- Creepy Monster Eyes Lurking in the Dense Tall Grass -->
    ${monsterEyes}

    <!-- Twilight Floating Embers / Firefly Sparks -->
    <circle cx="160" cy="560" r="2.5" fill="#fde047" opacity="0.8" filter="url(#eGlow)"/>
    <circle cx="280" cy="620" r="3" fill="#ea580c" opacity="0.85" filter="url(#eGlow)"/>
    <circle cx="430" cy="580" r="2" fill="#fde047" opacity="0.9" filter="url(#eGlow)"/>
    <circle cx="510" cy="650" r="2.8" fill="#fbbf24" opacity="0.75" filter="url(#eGlow)"/>
  </svg>`;
}

// ============================================================================
// 6. START TILE (The Crossroads at dawn, carved wooden signpost, traveler lantern)
// ============================================================================
function renderStartTileSvg() {
  const r = rng(33821);

  // Soft morning dawn clouds
  let clouds = '';
  for (let i = 0; i < 6; i++) {
    const cx = 50 + i * 100 + (r() - 0.5) * 30;
    const cy = 110 + r() * 80;
    clouds += `
      <ellipse cx="${cx}" cy="${cy}" rx="${55 + r() * 45}" ry="${22 + r() * 18}" fill="#ffffff" opacity="0.88"/>
      <ellipse cx="${cx + 10}" cy="${cy - 8}" rx="${38 + r() * 30}" ry="${18 + r() * 14}" fill="#fed7aa" opacity="0.75"/>
    `;
  }

  // Morning wild adventure roses & clover at base of signpost
  let wildRoses = '';
  for (let i = 0; i < 45; i++) {
    const rx = 200 + r() * 200;
    const ry = 720 + r() * 110;
    const col = r() > 0.5 ? '#f43f5e' : r() > 0.25 ? '#fb7185' : '#ffffff';
    wildRoses += `
      <circle cx="${rx}" cy="${ry}" r="${2.5 + r() * 3.5}" fill="${col}"/>
      <circle cx="${rx}" cy="${ry}" r="1.5" fill="#fde047"/>
    `;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="30%" stop-color="#38bdf8"/>
        <stop offset="60%" stop-color="#f472b6"/>
        <stop offset="85%" stop-color="#fde047"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <radialGradient id="tDawnSun" cx="50%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#fffbeb"/>
        <stop offset="55%" stop-color="#fde047" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="tWood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#451a03"/>
        <stop offset="35%" stop-color="#78350f"/>
        <stop offset="70%" stop-color="#92400e"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="tWoodPlank" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b45309"/>
        <stop offset="50%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="tBrass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <radialGradient id="tLanternGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="30%" stop-color="#fde047" stop-opacity="0.95"/>
        <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="tPath" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <filter id="tGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Inspiring Dawn Sky -->
    <rect width="600" height="840" fill="url(#tSky)"/>

    <!-- Dawn Sunrise Cresting the Horizon -->
    <circle cx="300" cy="380" r="140" fill="url(#tDawnSun)"/>
    <circle cx="300" cy="380" r="32" fill="#ffffff" filter="url(#tGlow)"/>

    <!-- Morning Clouds -->
    ${clouds}

    <!-- Distant Misty Kingdom Peaks in Sunrise Glow -->
    <path d="M-20,380 Q140,280 260,340 T540,310 T620,350 L620,840 L-20,840 Z" fill="#c084fc" opacity="0.5"/>
    <path d="M-20,420 Q180,350 360,400 T620,380 L620,840 L-20,840 Z" fill="#818cf8" opacity="0.65"/>

    <!-- Rolling Green Foothills -->
    <path d="M-20,490 Q200,430 420,480 T620,460 L620,840 L-20,840 Z" fill="#34d399"/>
    <path d="M-30,580 Q180,510 380,560 T630,530 L630,840 L-30,840 Z" fill="#22c55e"/>

    <!-- The Great Crossroads Path (Splits in two directions) -->
    <!-- Left Trail heading to Forest -->
    <path d="M280,840 Q240,730 180,660 Q120,590 60,540 L85,540 Q145,590 205,660 Q265,730 300,840 Z" fill="url(#tPath)"/>
    <!-- Right Trail heading to Grasslands & Village -->
    <path d="M300,840 Q335,730 395,660 Q455,590 520,540 L545,540 Q480,590 420,660 Q360,730 320,840 Z" fill="url(#tPath)"/>

    <!-- Foreground Overlook Bluff -->
    <path d="M-20,680 Q180,620 400,670 T620,650 L620,840 L-20,840 Z" fill="#15803d"/>
    <path d="M-20,740 Q220,680 440,730 T620,710 L620,840 L-20,840 Z" fill="#14532d"/>

    <!-- Stone Crossroads Paving -->
    <ellipse cx="300" cy="770" rx="90" ry="32" fill="#78716c"/>
    <ellipse cx="300" cy="766" rx="86" ry="30" fill="#a8a29e"/>

    <!-- Grand Weathered Oak Signpost -->
    <!-- Vertical Post -->
    <rect x="286" y="320" width="28" height="460" fill="url(#tWood)" rx="3"/>
    <polygon points="286,320 300,295 314,320" fill="#451a03"/>
    <!-- Iron Post Bands -->
    <rect x="284" y="370" width="32" height="8" fill="#334155" rx="1"/>
    <rect x="284" y="470" width="32" height="8" fill="#334155" rx="1"/>
    <rect x="284" y="580" width="32" height="8" fill="#334155" rx="1"/>

    <!-- Sign Arrow 1: Pointing Right "→ GRASSLANDS" -->
    <g transform="translate(300, 340)">
      <polygon points="0,0 180,0 215,24 180,48 0,48" fill="url(#tWoodPlank)" stroke="#270e02" stroke-width="2.5"/>
      <circle cx="15" cy="24" r="3.5" fill="#1e293b"/>
      <text x="28" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="900" fill="#fef08a" letter-spacing="1">GRASSLANDS →</text>
    </g>

    <!-- Sign Arrow 2: Pointing Left "← FOREST" -->
    <g transform="translate(100, 410)">
      <polygon points="0,24 35,0 200,0 200,48 35,48" fill="url(#tWoodPlank)" stroke="#270e02" stroke-width="2.5"/>
      <circle cx="185" cy="24" r="3.5" fill="#1e293b"/>
      <text x="48" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="900" fill="#86efac" letter-spacing="1">← FOREST</text>
    </g>

    <!-- Sign Arrow 3: Pointing Right "VILLAGE →" -->
    <g transform="translate(300, 480)">
      <polygon points="0,0 160,0 195,24 160,48 0,48" fill="url(#tWoodPlank)" stroke="#270e02" stroke-width="2.5"/>
      <circle cx="15" cy="24" r="3.5" fill="#1e293b"/>
      <text x="28" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="900" fill="#fed7aa" letter-spacing="1">VILLAGE →</text>
    </g>

    <!-- Hanging Adventurer Brass Lantern on curved wrought-iron bracket -->
    <!-- Iron Bracket on left of post -->
    <path d="M286,365 Q230,360 220,390 L220,405" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
    <!-- Lantern Ring & Cap -->
    <circle cx="220" cy="405" r="5" fill="none" stroke="#d97706" stroke-width="2"/>
    <polygon points="208,415 220,408 232,415" fill="url(#tBrass)"/>
    <!-- Lantern Body & Glass -->
    <rect x="210" y="415" width="20" height="30" fill="url(#tLanternGlow)" stroke="#78350f" stroke-width="2" rx="3" filter="url(#tGlow)"/>
    <line x1="210" y1="425" x2="230" y2="425" stroke="#78350f" stroke-width="1.5"/>
    <line x1="210" y1="435" x2="230" y2="435" stroke="#78350f" stroke-width="1.5"/>
    <!-- Burning Flame inside Lantern -->
    <ellipse cx="220" cy="430" rx="3" ry="6" fill="#ffffff" filter="url(#tGlow)"/>
    <!-- Lantern Base -->
    <rect x="208" y="445" width="24" height="6" fill="url(#tBrass)" rx="1"/>

    <!-- Wild Roses & Green Foliage around the post -->
    ${wildRoses}
  </svg>`;
}

// ============================================================================
// BUILD ALL 6 IMAGES WITH SHARP (600x840, 95% JPEG, 4:4:4 Chroma)
// ============================================================================
async function generateAll() {
  const configs = [
    { name: 'grassland.jpg', svgFn: renderGrasslandSvg },
    { name: 'forest.jpg', svgFn: renderForestSvg },
    { name: 'grassland_village.jpg', svgFn: renderVillageSvg },
    { name: 'grassland_shrine.jpg', svgFn: renderShrineSvg },
    { name: 'grassland_encounter.jpg', svgFn: renderGrasslandEncounterSvg },
    { name: 'start_tile.jpg', svgFn: renderStartTileSvg },
  ];

  for (const c of configs) {
    console.log(`Generating novel raster art: ${c.name}...`);
    const svgStr = c.svgFn();
    const destPath = path.join(outDir, c.name);

    await sharp(Buffer.from(svgStr))
      .resize(600, 840)
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toFile(destPath);

    const stats = fs.statSync(destPath);
    console.log(`  -> Wrote ${destPath} (${stats.size} bytes)`);
  }
  console.log('All 6 adventure raster artwork files generated successfully!');
}

generateAll().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
