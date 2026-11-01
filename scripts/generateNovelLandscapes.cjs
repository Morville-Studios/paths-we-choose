const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const advDir = path.resolve(__dirname, '../public/cards/adventure');
if (!fs.existsSync(advDir)) fs.mkdirSync(advDir, { recursive: true });

// Seeded pseudorandom generator for deterministic, natural procedural generation
function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// 1. FOREST (Serene, deep ancient green woods with sunbeams)
// ---------------------------------------------------------------------------
function buildForestSvg() {
  const rng = makeRng(10482);
  let treesBg = '';
  for (let i = 0; i < 35; i++) {
    const x = rng() * 640 - 20;
    const y = 300 + rng() * 180;
    const h = 240 + rng() * 200;
    const w = 40 + rng() * 50;
    treesBg += `<path d="M${x},${y} L${x + w/2},${y - h} L${x + w},${y} Z" fill="#064e3b" opacity="${0.4 + rng() * 0.4}"/>`;
  }

  let treesMid = '';
  for (let i = 0; i < 18; i++) {
    const x = rng() * 620 - 10;
    const trunkW = 18 + rng() * 22;
    const trunkH = 500 + rng() * 250;
    treesMid += `
      <path d="M${x},840 Q${x + (rng()-0.5)*30},500 ${x + trunkW/2},${840 - trunkH} Q${x + trunkW},500 ${x + trunkW},840 Z" fill="#022c22"/>
      <ellipse cx="${x + trunkW/2}" cy="${840 - trunkH}" rx="${60 + rng()*40}" ry="${80 + rng()*60}" fill="#065f46" opacity="0.85"/>
      <ellipse cx="${x + trunkW/2 + (rng()-0.5)*40}" cy="${840 - trunkH - 30}" rx="${50 + rng()*30}" ry="${60 + rng()*40}" fill="#047857" opacity="0.9"/>
    `;
  }

  let foliage = '';
  for (let i = 0; i < 80; i++) {
    const x = rng() * 600;
    const y = 680 + rng() * 160;
    const r = 8 + rng() * 16;
    const col = rng() > 0.4 ? '#059669' : rng() > 0.3 ? '#10b981' : '#34d399';
    foliage += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${0.5 + rng()*0.4}"/>`;
  }

  let particles = '';
  for (let i = 0; i < 45; i++) {
    const px = rng() * 600;
    const py = 200 + rng() * 550;
    const pr = 1.5 + rng() * 2.5;
    particles += `<circle cx="${px}" cy="${py}" r="${pr}" fill="#a7f3d0" opacity="${0.4 + rng()*0.5}" filter="url(#glow)"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#022c22"/>
        <stop offset="40%" stop-color="#064e3b"/>
        <stop offset="70%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="sunbeam" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.55"/>
        <stop offset="40%" stop-color="#6ee7b7" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="50%" stop-color="#022c22"/>
        <stop offset="100%" stop-color="#011b15"/>
      </linearGradient>
      <radialGradient id="canopyGlow" cx="40%" cy="20%" r="60%">
        <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#047857" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#022c22" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="haze" x="0%" y="0%" width="100%" height="100%">
        <feGaussianBlur stdDeviation="8"/>
      </filter>
    </defs>

    <!-- Deep Forest Ambient Background -->
    <rect width="600" height="840" fill="url(#forestSky)"/>
    <rect width="600" height="840" fill="url(#canopyGlow)"/>

    <!-- Distant Pines & Mountain Silhouettes -->
    <path d="M0,520 Q180,450 340,490 T600,480 L600,840 L0,840 Z" fill="#044e3b" opacity="0.7"/>
    ${treesBg}

    <!-- Misty Atmospheric Light Band -->
    <rect x="0" y="380" width="600" height="180" fill="#34d399" opacity="0.12" filter="url(#haze)"/>

    <!-- Midground Trunks & Canopy -->
    ${treesMid}

    <!-- God Rays / Sunbeams from high canopy -->
    <polygon points="120,0 240,0 480,840 280,840" fill="url(#sunbeam)"/>
    <polygon points="280,0 380,0 590,840 450,840" fill="url(#sunbeam)" opacity="0.75"/>
    <polygon points="20,0 90,0 260,840 140,840" fill="url(#sunbeam)" opacity="0.6"/>

    <!-- Forest Floor & Mossy Path -->
    <path d="M-50,680 Q180,640 380,670 T650,660 L650,840 L-50,840 Z" fill="url(#groundGrad)"/>
    <!-- Winding Dirt & Moss Trail -->
    <path d="M220,840 Q260,740 290,690 Q320,650 330,620 Q335,600 340,580 L355,580 Q350,600 345,630 Q335,670 320,720 Q300,780 270,840 Z" fill="#1e3a2b" opacity="0.85"/>
    <path d="M235,840 Q270,750 295,700 Q315,665 330,630 L338,630 Q325,665 305,705 Q280,755 250,840 Z" fill="#3f5847" opacity="0.65"/>

    <!-- Foreground Ferns, Moss Rocks & Foliage -->
    ${foliage}

    <!-- Floating Forest Spores & Light Motes -->
    ${particles}

    <!-- Forest Edge Vignette -->
    <rect width="600" height="840" fill="none" stroke="#011812" stroke-width="8" opacity="0.7"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 2. GRASSLAND (Sunlit rolling green hills, wildflowers, bright adventure sky)
// ---------------------------------------------------------------------------
function buildGrasslandSvg() {
  const rng = makeRng(9281);

  let flowers = '';
  for (let i = 0; i < 180; i++) {
    const x = rng() * 600;
    const y = 520 + rng() * 320;
    const r = 1.2 + (y - 520) / 320 * 2.8;
    const col = rng() > 0.6 ? '#fde047' : rng() > 0.4 ? '#f43f5e' : rng() > 0.2 ? '#ffffff' : '#a855f7';
    flowers += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${0.75 + rng()*0.25}"/>`;
  }

  let clouds = '';
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 95 + (rng() - 0.5) * 40;
    const cy = 120 + rng() * 110;
    const rx = 65 + rng() * 55;
    const ry = 28 + rng() * 22;
    clouds += `
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="0.85"/>
      <ellipse cx="${cx + 25}" cy="${cy - 12}" rx="${rx * 0.7}" ry="${ry * 0.9}" fill="#ffffff" opacity="0.95"/>
      <ellipse cx="${cx - 20}" cy="${cy + 8}" rx="${rx * 0.8}" ry="${ry * 0.7}" fill="#f1f5f9" opacity="0.75"/>
    `;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="35%" stop-color="#38bdf8"/>
        <stop offset="65%" stop-color="#bae6fd"/>
        <stop offset="90%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <linearGradient id="sunGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fffbeb" stop-opacity="1"/>
        <stop offset="40%" stop-color="#fef08a" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6ee7b7"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
      <linearGradient id="hillMid1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
      <linearGradient id="hillMid2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#16a34a"/>
      </linearGradient>
      <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="50%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#78350f" stop-opacity="0.85"/>
      </linearGradient>
      <filter id="soft" x="0%" y="0%" width="100%" height="100%">
        <feGaussianBlur stdDeviation="5"/>
      </filter>
    </defs>

    <!-- Vast Summer Sky -->
    <rect width="600" height="840" fill="url(#skyGrad)"/>

    <!-- Brilliant Sun Disc & Golden Atmosphere -->
    <circle cx="480" cy="180" r="180" fill="url(#sunGlow)"/>
    <circle cx="480" cy="180" r="48" fill="#ffffff"/>

    <!-- Fluffy Volumetric Clouds -->
    ${clouds}

    <!-- Distant Haze Mountain Ridge -->
    <path d="M-20,440 Q150,340 320,410 T620,380 L620,840 L-20,840 Z" fill="#93c5fd" opacity="0.45"/>
    <path d="M-20,480 Q200,410 400,470 T620,450 L620,840 L-20,840 Z" fill="url(#hillFar)" opacity="0.65"/>

    <!-- Midground Rolling Hills -->
    <path d="M-20,530 Q160,470 350,520 T620,500 L620,840 L-20,840 Z" fill="url(#hillMid1)"/>
    <path d="M-20,590 Q220,530 420,580 T620,560 L620,840 L-20,840 Z" fill="url(#hillMid2)"/>

    <!-- Winding Country Dirt Trail curving through the hills -->
    <path d="M280,840 Q310,720 330,640 Q350,570 370,520 L382,520 Q362,570 345,640 Q325,720 310,840 Z" fill="url(#pathGrad)"/>

    <!-- Foreground Lush Hillcrest -->
    <path d="M-20,650 Q180,590 380,640 T620,620 L620,840 L-20,840 Z" fill="url(#hillNear)"/>

    <!-- Field of Wildflowers (Buttercups, Poppies, Daisies) -->
    ${flowers}

    <!-- Wind Lines / Atmosphere Shimmer -->
    <path d="M60,680 Q180,660 300,675" stroke="#ffffff" stroke-width="1.5" opacity="0.35" fill="none" stroke-linecap="round"/>
    <path d="M340,730 Q460,710 560,725" stroke="#ffffff" stroke-width="1.8" opacity="0.3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 3. GRASSLAND VILLAGE (Cozy medieval fantasy village with thatched cottages)
// ---------------------------------------------------------------------------
function buildVillageSvg() {
  const rng = makeRng(5821);

  // Cottages
  let houses = `
    <!-- Distant Castle / Fort on Bluff -->
    <rect x="360" y="380" width="60" height="40" fill="#64748b" opacity="0.6"/>
    <polygon points="355,380 390,345 425,380" fill="#475569" opacity="0.6"/>
    <rect x="430" y="370" width="30" height="50" fill="#64748b" opacity="0.55"/>
    <polygon points="425,370 445,340 465,370" fill="#475569" opacity="0.55"/>

    <!-- Cottage 1 (Left background) -->
    <rect x="90" y="490" width="95" height="70" fill="#fef3c7" stroke="#78350f" stroke-width="2"/>
    <polygon points="75,490 137,420 200,490" fill="#b45309" stroke="#78350f" stroke-width="2.5"/>
    <rect x="110" y="520" width="18" height="22" fill="#fde047" stroke="#78350f" stroke-width="1.5"/>
    <rect x="145" y="525" width="22" height="35" fill="#78350f"/>
    <!-- Chimney & Smoke -->
    <rect x="165" y="430" width="14" height="35" fill="#78350f"/>
    <ellipse cx="172" cy="415" rx="8" ry="12" fill="#e2e8f0" opacity="0.65"/>
    <ellipse cx="178" cy="390" rx="14" ry="18" fill="#e2e8f0" opacity="0.45"/>
    <ellipse cx="186" cy="360" rx="20" ry="22" fill="#e2e8f0" opacity="0.25"/>

    <!-- Cottage 2 (Center main tavern / manor) -->
    <rect x="220" y="510" width="140" height="85" fill="#fffbeb" stroke="#78350f" stroke-width="2.5"/>
    <!-- Timber beams -->
    <line x1="220" y1="510" x2="360" y2="595" stroke="#78350f" stroke-width="2"/>
    <line x1="360" y1="510" x2="220" y2="595" stroke="#78350f" stroke-width="2"/>
    <polygon points="205,510 290,430 375,510" fill="#d97706" stroke="#78350f" stroke-width="3"/>
    <!-- Glowing windows -->
    <rect x="245" y="530" width="22" height="24" fill="#fde047" stroke="#78350f" stroke-width="1.5"/>
    <rect x="310" y="530" width="22" height="24" fill="#fde047" stroke="#78350f" stroke-width="1.5"/>
    <!-- Arched Doorway -->
    <path d="M275,595 L275,555 A15,15 0 0,1 305,555 L305,595 Z" fill="#78350f" stroke="#451a03" stroke-width="2"/>
    <!-- Hanging Inn Sign -->
    <line x1="230" y1="540" x2="230" y2="555" stroke="#78350f" stroke-width="2"/>
    <rect x="222" y="555" width="16" height="12" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>

    <!-- Cottage 3 (Right foreground with watermill) -->
    <rect x="400" y="530" width="110" height="80" fill="#fef3c7" stroke="#78350f" stroke-width="2"/>
    <polygon points="385,530 455,460 525,530" fill="#b45309" stroke="#78350f" stroke-width="2.5"/>
    <rect x="420" y="550" width="20" height="22" fill="#fde047" stroke="#78350f" stroke-width="1.5"/>
    <rect x="460" y="560" width="24" height="50" fill="#78350f"/>
    <!-- Water wheel -->
    <circle cx="525" cy="600" r="34" fill="none" stroke="#78350f" stroke-width="6"/>
    <circle cx="525" cy="600" r="10" fill="#78350f"/>
    <line x1="525" y1="566" x2="525" y2="634" stroke="#78350f" stroke-width="3"/>
    <line x1="491" y1="600" x2="559" y2="600" stroke="#78350f" stroke-width="3"/>
  `;

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="villageSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="45%" stop-color="#bae6fd"/>
        <stop offset="75%" stop-color="#fed7aa"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
      <linearGradient id="vHill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
      <linearGradient id="vHill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#86efac"/>
        <stop offset="100%" stop-color="#16a34a"/>
      </linearGradient>
      <linearGradient id="cobbleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#cbd5e1"/>
        <stop offset="50%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#7dd3fc"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>

    <!-- Warm Golden Afternoon Sky -->
    <rect width="600" height="840" fill="url(#villageSky)"/>
    <!-- Golden Sun in Sky -->
    <circle cx="140" cy="190" r="50" fill="#fef08a" opacity="0.9"/>
    <circle cx="140" cy="190" r="120" fill="#fef08a" opacity="0.25"/>

    <!-- Distant Mountains -->
    <polygon points="120,440 280,290 440,440" fill="#93c5fd" opacity="0.5"/>
    <polygon points="280,440 420,310 560,440" fill="#bfdbfe" opacity="0.4"/>

    <!-- Rolling Green Countryside Terraces -->
    <path d="M-20,490 Q200,430 400,480 T620,460 L620,840 L-20,840 Z" fill="url(#vHill1)"/>
    <path d="M-20,570 Q180,510 380,560 T620,540 L620,840 L-20,840 Z" fill="url(#vHill2)"/>

    <!-- Mill Stream River -->
    <path d="M480,580 Q510,660 530,730 T560,840 L600,840 L600,580 Z" fill="url(#streamGrad)"/>

    <!-- Village Cottages & Watermill -->
    ${houses}

    <!-- Stone Arch Bridge over stream -->
    <path d="M470,680 Q530,660 590,680 L590,710 Q530,690 470,710 Z" fill="#64748b" stroke="#334155" stroke-width="2"/>

    <!-- Cobblestone Village Main Street -->
    <path d="M120,840 Q220,730 260,660 Q280,610 290,590 L315,590 Q305,620 285,670 Q245,740 180,840 Z" fill="url(#cobbleGrad)"/>

    <!-- Stone walls & Wooden fences -->
    <path d="M50,620 L160,630" stroke="#78350f" stroke-width="4" stroke-dasharray="10,6"/>
    <path d="M330,630 L450,640" stroke="#78350f" stroke-width="4" stroke-dasharray="10,6"/>

    <!-- Flowers & Green Grass along road -->
    <circle cx="80" cy="710" r="4" fill="#f43f5e"/>
    <circle cx="95" cy="725" r="5" fill="#fde047"/>
    <circle cx="110" cy="715" r="4" fill="#a855f7"/>
    <circle cx="320" cy="720" r="5" fill="#f43f5e"/>
    <circle cx="340" cy="735" r="4" fill="#fde047"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 4. GRASSLAND SHRINE (Ancient sacred marble sun altar with divine golden beams)
// ---------------------------------------------------------------------------
function buildShrineSvg() {
  const rng = makeRng(3317);

  let rays = '';
  for (let i = 0; i < 16; i++) {
    const angle = i * (Math.PI / 8);
    const x2 = 300 + Math.cos(angle) * 450;
    const y2 = 360 + Math.sin(angle) * 450;
    rays += `<line x1="300" y1="360" x2="${x2}" y2="${y2}" stroke="#fef08a" stroke-width="${12 + (i%3)*8}" opacity="${0.12 + (i%2)*0.08}"/>`;
  }

  let sparkles = '';
  for (let i = 0; i < 50; i++) {
    const sx = 140 + rng() * 320;
    const sy = 220 + rng() * 380;
    const sr = 1.5 + rng() * 3.5;
    sparkles += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#fef08a" opacity="${0.4 + rng()*0.6}" filter="url(#glow)"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shrineSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4338ca"/>
        <stop offset="30%" stop-color="#7c3aed"/>
        <stop offset="60%" stop-color="#c084fc"/>
        <stop offset="85%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <linearGradient id="divineLight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#fef08a" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="marbleGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
      <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="50%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <radialGradient id="altarBurst" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="35%" stop-color="#fef08a" stop-opacity="0.8"/>
        <stop offset="70%" stop-color="#fbbf24" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Celestial Sunset Sky -->
    <rect width="600" height="840" fill="url(#shrineSky)"/>

    <!-- Divine Radiance Beams -->
    ${rays}

    <!-- Distant Sacred Hills -->
    <path d="M-20,530 Q200,470 400,520 T620,500 L620,840 L-20,840 Z" fill="#6366f1" opacity="0.4"/>
    <path d="M-20,580 Q180,530 380,570 T620,550 L620,840 L-20,840 Z" fill="#22c55e" opacity="0.75"/>
    <path d="M-20,640 Q220,580 420,630 T620,610 L620,840 L-20,840 Z" fill="#15803d"/>

    <!-- Holy Light Pillar descending from Heaven -->
    <polygon points="260,0 340,0 430,680 170,680" fill="url(#divineLight)"/>

    <!-- Sacred Knoll Platform -->
    <ellipse cx="300" cy="690" rx="240" ry="60" fill="#166534"/>
    <ellipse cx="300" cy="680" rx="210" ry="50" fill="#15803d"/>

    <!-- Ancient White Marble Temple Structure -->
    <!-- Circular Steps -->
    <path d="M120,670 C120,650 480,650 480,670 L470,710 C470,730 130,730 130,710 Z" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="1.5"/>
    <path d="M150,650 C150,635 450,635 450,650 L442,675 C442,690 158,690 158,675 Z" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="1.5"/>

    <!-- Twin Sacred Pillars (Left & Right) -->
    <!-- Left Pillar -->
    <rect x="175" y="440" width="34" height="200" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="2"/>
    <rect x="165" y="430" width="54" height="15" fill="url(#goldTrim)" stroke="#b45309" stroke-width="1.5"/>
    <rect x="168" y="635" width="48" height="15" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Vines on left pillar -->
    <path d="M175,460 Q195,490 178,530 Q198,570 176,610" stroke="#22c55e" stroke-width="3" fill="none"/>
    <circle cx="188" cy="495" r="3" fill="#f43f5e"/>
    <circle cx="186" cy="565" r="3" fill="#f43f5e"/>

    <!-- Right Pillar -->
    <rect x="391" y="440" width="34" height="200" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="2"/>
    <rect x="381" y="430" width="54" height="15" fill="url(#goldTrim)" stroke="#b45309" stroke-width="1.5"/>
    <rect x="384" y="635" width="48" height="15" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Vines on right pillar -->
    <path d="M425,460 Q405,490 422,530 Q402,570 424,610" stroke="#22c55e" stroke-width="3" fill="none"/>
    <circle cx="412" cy="495" r="3" fill="#f43f5e"/>
    <circle cx="414" cy="565" r="3" fill="#f43f5e"/>

    <!-- Central Altar Plinth -->
    <rect x="235" y="550" width="130" height="90" fill="url(#marbleGrad)" stroke="#94a3b8" stroke-width="2"/>
    <rect x="220" y="535" width="160" height="18" fill="url(#goldTrim)" stroke="#b45309" stroke-width="2"/>

    <!-- Floating Sun Crystal / Divine Rune on Altar -->
    <circle cx="300" cy="450" r="70" fill="url(#altarBurst)"/>
    <!-- Sacred Star Gem -->
    <polygon points="300,390 325,440 375,450 335,480 345,530 300,505 255,530 265,480 225,450 275,440" fill="#fef08a" stroke="#f59e0b" stroke-width="3" filter="url(#glow)"/>
    <circle cx="300" cy="460" r="16" fill="#ffffff" filter="url(#glow)"/>

    <!-- Golden Sparkles and Holy Embers -->
    ${sparkles}
  </svg>`;
}

// ---------------------------------------------------------------------------
// 5. GRASSLAND ENCOUNTER (Dramatic wild high-grass savannah under stormy skies)
// ---------------------------------------------------------------------------
function buildEncounterSvg() {
  const rng = makeRng(7162);

  let tallGrass = '';
  for (let i = 0; i < 140; i++) {
    const x = rng() * 620 - 10;
    const y = 620 + rng() * 220;
    const h = 40 + rng() * 70;
    const bend = (rng() - 0.2) * 35;
    tallGrass += `<path d="M${x},${y} Q${x + bend/2},${y - h/2} ${x + bend},${y - h}" stroke="#ca8a04" stroke-width="${1.5 + rng()*2}" fill="none" opacity="${0.6 + rng()*0.4}"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stormSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="35%" stop-color="#1e293b"/>
        <stop offset="65%" stop-color="#475569"/>
        <stop offset="85%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <linearGradient id="breakBeam" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="rockGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="50%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="amberSavannah" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ca8a04"/>
        <stop offset="50%" stop-color="#a16207"/>
        <stop offset="100%" stop-color="#713f12"/>
      </linearGradient>
    </defs>

    <!-- Dramatic Thunderstorm Sunset Sky -->
    <rect width="600" height="840" fill="url(#stormSky)"/>

    <!-- Piercing Golden Sun Shafts through dark clouds -->
    <polygon points="200,100 270,100 480,750 360,750" fill="url(#breakBeam)"/>
    <polygon points="340,80 400,80 580,720 480,720" fill="url(#breakBeam)" opacity="0.6"/>

    <!-- Jagged Distant Mountain Peaks -->
    <polygon points="-20,520 80,360 220,520" fill="#1e293b" opacity="0.85"/>
    <polygon points="140,540 280,330 420,540" fill="#0f172a" opacity="0.95"/>
    <polygon points="360,530 470,370 580,530" fill="#1e293b" opacity="0.85"/>

    <!-- Wild Savannah Terraces -->
    <path d="M-20,560 Q180,510 380,550 T620,530 L620,840 L-20,840 Z" fill="#854d0e" opacity="0.8"/>
    <path d="M-20,620 Q220,560 420,610 T620,590 L620,840 L-20,840 Z" fill="url(#amberSavannah)"/>

    <!-- Jagged Sharp Rock Outcroppings (Left & Right) -->
    <polygon points="40,780 90,560 140,780" fill="url(#rockGrad)"/>
    <polygon points="100,790 135,620 180,790" fill="url(#rockGrad)"/>
    <polygon points="450,810 510,580 570,810" fill="url(#rockGrad)"/>
    <polygon points="410,820 450,650 500,820" fill="url(#rockGrad)"/>

    <!-- Prowling Beast Silhouette with Glowing Eyes -->
    <path d="M260,650 Q280,635 310,640 Q330,630 350,635 L365,655 L350,665 Q330,660 300,665 L275,675 Z" fill="#0f172a"/>
    <!-- Glowing predator eyes in grass -->
    <circle cx="342" cy="642" r="2.2" fill="#ef4444"/>
    <circle cx="350" cy="641" r="2.2" fill="#ef4444"/>

    <!-- Wind-blown Amber Tall Grass -->
    ${tallGrass}
  </svg>`;
}

// ---------------------------------------------------------------------------
// 6. START TILE (Picturesque Crossroads Waypoint at Sunrise)
// ---------------------------------------------------------------------------
function buildStartTileSvg() {
  const rng = makeRng(1948);

  let flowers = '';
  for (let i = 0; i < 90; i++) {
    const x = rng() * 600;
    const y = 620 + rng() * 220;
    const r = 1.5 + (y - 620) / 220 * 2.5;
    const col = rng() > 0.5 ? '#facc15' : rng() > 0.25 ? '#38bdf8' : '#ffffff';
    flowers += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${0.8 + rng()*0.2}"/>`;
  }

  return `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="30%" stop-color="#4338ca"/>
        <stop offset="60%" stop-color="#ec4899"/>
        <stop offset="85%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#fef08a"/>
      </linearGradient>
      <linearGradient id="dawnSun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <linearGradient id="hillGreen1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
      <linearGradient id="hillGreen2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="100%" stop-color="#16a34a"/>
      </linearGradient>
      <linearGradient id="woodPost" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="50%" stop-color="#b45309"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="stoneMile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e2e8f0"/>
        <stop offset="50%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <linearGradient id="roadDirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
    </defs>

    <!-- Magnificent Sunrise Sky -->
    <rect width="600" height="840" fill="url(#dawnSky)"/>
    <!-- Rising Sun over Mountain Gap -->
    <circle cx="300" cy="380" r="90" fill="url(#dawnSun)" opacity="0.95"/>
    <circle cx="300" cy="380" r="220" fill="#fef08a" opacity="0.25"/>

    <!-- Distant Misty Mountain Peaks -->
    <polygon points="60,460 190,310 330,460" fill="#4338ca" opacity="0.6"/>
    <polygon points="270,460 410,290 550,460" fill="#3730a3" opacity="0.7"/>

    <!-- Rolling Green Morning Hills -->
    <path d="M-20,520 Q180,450 380,500 T620,480 L620,840 L-20,840 Z" fill="url(#hillGreen1)"/>
    <path d="M-20,600 Q220,540 420,590 T620,570 L620,840 L-20,840 Z" fill="url(#hillGreen2)"/>

    <!-- Diverging Crossroads Paths -->
    <!-- Left Branch -->
    <path d="M280,840 Q240,730 180,650 Q130,590 80,540 L105,540 Q150,590 205,650 Q265,730 310,840 Z" fill="url(#roadDirt)" opacity="0.8"/>
    <!-- Right Branch -->
    <path d="M300,840 Q350,730 410,650 Q460,590 510,540 L535,540 Q485,590 435,650 Q375,730 325,840 Z" fill="url(#roadDirt)" opacity="0.8"/>

    <!-- Carved Wooden Waypoint Crossroad Signpost -->
    <!-- Post -->
    <rect x="290" y="440" width="22" height="260" fill="url(#woodPost)" rx="3" stroke="#451a03" stroke-width="2"/>
    <!-- Left Direction Arrow: "VILLAGE" -->
    <path d="M170,480 L295,480 L295,515 L170,515 L140,497.5 Z" fill="url(#woodPost)" stroke="#451a03" stroke-width="2"/>
    <text x="170" y="503" fill="#fef08a" font-size="16" font-weight="900" font-family="system-ui, sans-serif" letter-spacing="2">VILLAGE</text>
    <!-- Right Direction Arrow: "FOREST" -->
    <path d="M305,525 L430,525 L460,542.5 L430,560 L305,560 Z" fill="url(#woodPost)" stroke="#451a03" stroke-width="2"/>
    <text x="325" y="548" fill="#fef08a" font-size="16" font-weight="900" font-family="system-ui, sans-serif" letter-spacing="2">FOREST</text>
    <!-- Hanging Lantern on post arm -->
    <line x1="280" y1="455" x2="330" y2="455" stroke="#451a03" stroke-width="4"/>
    <line x1="275" y1="455" x2="275" y2="475" stroke="#78350f" stroke-width="2"/>
    <rect x="267" y="475" width="16" height="22" fill="#fde047" stroke="#451a03" stroke-width="2"/>

    <!-- Mossy Ancient Milestone Stone -->
    <path d="M210,710 C210,640 260,640 260,710 L260,730 L210,730 Z" fill="url(#stoneMile)" stroke="#334155" stroke-width="2"/>
    <!-- Carved Compass Star on milestone -->
    <polygon points="235,665 240,680 255,685 240,690 235,705 230,690 215,685 230,680" fill="#f59e0b"/>

    <!-- Blooming Prairie Flowers & Grass -->
    ${flowers}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Main Render Pipeline
// ---------------------------------------------------------------------------
async function generateAll() {
  console.log('Rendering 6 brand new novel landscape digital paintings...');

  const specs = [
    { file: 'forest.jpg', svg: buildForestSvg() },
    { file: 'grassland.jpg', svg: buildGrasslandSvg() },
    { file: 'grassland_village.jpg', svg: buildVillageSvg() },
    { file: 'grassland_shrine.jpg', svg: buildShrineSvg() },
    { file: 'grassland_encounter.jpg', svg: buildEncounterSvg() },
    { file: 'start_tile.jpg', svg: buildStartTileSvg() },
  ];

  for (const { file, svg } of specs) {
    const outPath = path.join(advDir, file);
    await sharp(Buffer.from(svg))
      .resize(600, 840)
      .jpeg({ quality: 95 })
      .toFile(outPath);
    console.log(`Generated novel asset: ${file}`);
  }

  console.log('All 6 adventure landscape cards generated successfully!');
}

generateAll().catch(err => {
  console.error('Error generating novel landscapes:', err);
  process.exit(1);
});
