const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const actionsDir = path.resolve(__dirname, '../public/cards/actions');
if (!fs.existsSync(actionsDir)) fs.mkdirSync(actionsDir, { recursive: true });

async function svgToJpg(svg, outPath) {
  await sharp(Buffer.from(svg))
    .resize(600, 840)
    .jpeg({ quality: 92 })
    .toFile(outPath);
  console.log('Generated action art:', path.basename(outPath));
}

async function generateActions() {
  console.log('Generating unique action card raster art...');

  // 1. Heavy Cleave (Overhead devastating greatsword cleave into ground, seismic crack & molten sparks)
  const heavyCleaveSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cleaveBg" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#450a0a"/>
        <stop offset="40%" stop-color="#2a0606"/>
        <stop offset="75%" stop-color="#150202"/>
        <stop offset="100%" stop-color="#050000"/>
      </radialGradient>
      <linearGradient id="bladeSteel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#71717a"/>
        <stop offset="35%" stop-color="#e4e4e7"/>
        <stop offset="50%" stop-color="#ffffff"/>
        <stop offset="65%" stop-color="#e4e4e7"/>
        <stop offset="100%" stop-color="#52525b"/>
      </linearGradient>
      <linearGradient id="cleaveShockwave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="25%" stop-color="#f97316"/>
        <stop offset="60%" stop-color="#dc2626"/>
        <stop offset="100%" stop-color="#7f1d1d"/>
      </linearGradient>
      <radialGradient id="impactCore" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="30%" stop-color="#fde047"/>
        <stop offset="65%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
      </radialGradient>
      <filter id="flameGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="16" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#cleaveBg)"/>

    <!-- Dark Dungeon / Cavern Background Pillars -->
    <rect x="50" y="80" width="80" height="600" fill="#18181b" opacity="0.6"/>
    <rect x="470" y="80" width="80" height="600" fill="#18181b" opacity="0.6"/>

    <!-- Massive Impact Flash Explosion in Foreground Bottom -->
    <ellipse cx="300" cy="620" rx="260" ry="120" fill="url(#impactCore)" filter="url(#flameGlow)"/>

    <!-- Seismic Ground Cracks -->
    <path d="M300,620 L240,680 L180,720 L110,800" stroke="#facc15" stroke-width="6" fill="none" filter="url(#flameGlow)"/>
    <path d="M300,620 L360,690 L420,730 L490,810" stroke="#facc15" stroke-width="6" fill="none" filter="url(#flameGlow)"/>
    <path d="M300,620 L290,730 L310,820" stroke="#f97316" stroke-width="4" fill="none"/>
    <path d="M240,680 L170,660 L80,680" stroke="#ea580c" stroke-width="3" fill="none"/>
    <path d="M360,690 L440,670 L520,700" stroke="#ea580c" stroke-width="3" fill="none"/>

    <!-- Kinetic Slash Arc Trail (Huge vertical downwards cleave arc) -->
    <path d="M180,120 Q360,180 320,620 L280,620 Q310,220 160,140 Z" fill="url(#cleaveShockwave)" opacity="0.95" filter="url(#flameGlow)"/>
    <path d="M210,100 Q400,200 340,610" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" filter="url(#flameGlow)"/>

    <!-- Two-Handed Colossal Greatsword Cleaving Down -->
    <g transform="translate(300, 480) rotate(12) translate(-300, -480)">
      <!-- Broad Blade -->
      <polygon points="275,180 325,180 325,560 300,600 275,560" fill="url(#bladeSteel)" stroke="#27272a" stroke-width="3"/>
      <!-- Serrated / Heavy Fuller Notch -->
      <polygon points="295,200 305,200 305,520 295,520" fill="#3f3f46"/>
      <line x1="300" y1="200" x2="300" y2="520" stroke="#fef08a" stroke-width="2"/>

      <!-- Heavy Steel Crossguard -->
      <rect x="220" y="160" width="160" height="26" rx="6" fill="#3f3f46" stroke="#e4e4e7" stroke-width="2"/>
      <circle cx="300" cy="173" r="8" fill="#dc2626"/>

      <!-- Two-Handed Leather Hilt Grip -->
      <rect x="286" y="70" width="28" height="90" rx="4" fill="#451a03" stroke="#1c0a01" stroke-width="2"/>
      <line x1="286" y1="90" x2="314" y2="90" stroke="#d97706" stroke-width="2"/>
      <line x1="286" y1="115" x2="314" y2="115" stroke="#d97706" stroke-width="2"/>
      <line x1="286" y1="140" x2="314" y2="140" stroke="#d97706" stroke-width="2"/>

      <!-- Heavy Iron Skull Pommel -->
      <circle cx="300" cy="55" r="20" fill="#52525b" stroke="#27272a" stroke-width="2"/>
      <circle cx="300" cy="55" r="9" fill="#dc2626"/>
    </g>

    <!-- Flying Shattered Rock Debris & Embers -->
    <polygon points="170,520 190,500 200,535 180,545" fill="#52525b" stroke="#27272a" stroke-width="2"/>
    <polygon points="410,510 435,495 440,530 420,540" fill="#3f3f46" stroke="#27272a" stroke-width="2"/>
    <polygon points="130,590 150,580 155,605 135,615" fill="#52525b"/>
    <polygon points="450,580 480,565 490,600 465,610" fill="#71717a"/>

    <!-- Searing Embers & Sparks -->
    <circle cx="210" cy="460" r="4" fill="#fde047" filter="url(#flameGlow)"/>
    <circle cx="390" cy="440" r="5" fill="#fde047" filter="url(#flameGlow)"/>
    <circle cx="260" cy="380" r="3.5" fill="#f97316"/>
    <circle cx="340" cy="370" r="4" fill="#f97316"/>
    <circle cx="160" cy="620" r="6" fill="#fde047" filter="url(#flameGlow)"/>
    <circle cx="440" cy="630" r="6" fill="#fde047" filter="url(#flameGlow)"/>
  </svg>
  `;
  await svgToJpg(heavyCleaveSvg, path.join(actionsDir, 'heavy_cleave.jpg'));

  // 2. Iron Parry (Blades clashing, steel deflecting steel with intense spark flash)
  const ironParrySvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="parryBg" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="45%" stop-color="#0f172a"/>
        <stop offset="80%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <linearGradient id="parrySteel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#cbd5e1"/>
        <stop offset="65%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <linearGradient id="enemyBlade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#b91c1c"/>
        <stop offset="50%" stop-color="#451a03"/>
        <stop offset="100%" stop-color="#18181b"/>
      </linearGradient>
      <filter id="parrySpark" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#parryBg)"/>

    <!-- Background Cross Shadows -->
    <line x1="0" y1="100" x2="600" y2="740" stroke="#0f172a" stroke-width="40" opacity="0.4"/>
    <line x1="600" y1="100" x2="0" y2="740" stroke="#0f172a" stroke-width="40" opacity="0.4"/>

    <!-- Clashing Blades -->
    <!-- Attacking Enemy Curved Scimitar / Orc Cleaver (from top right down to center) -->
    <path d="M520,120 Q360,260 280,440 L240,410 Q320,240 480,90 Z" fill="url(#enemyBlade)" stroke="#7f1d1d" stroke-width="3"/>
    <path d="M510,115 Q355,255 275,435" stroke="#ef4444" stroke-width="4" fill="none"/>

    <!-- Defender's Knightly Longsword Parrying Upwards (from bottom left to top right) -->
    <polygon points="120,720 145,740 380,310 395,280 370,290" fill="url(#parrySteel)" stroke="#334155" stroke-width="3"/>
    <line x1="130" y1="730" x2="385" y2="285" stroke="#ffffff" stroke-width="4"/>

    <!-- Longsword Crossguard & Hilt -->
    <g transform="translate(160, 680) rotate(-45)">
      <rect x="-60" y="-12" width="120" height="24" rx="4" fill="#64748b" stroke="#f8fafc" stroke-width="2"/>
      <rect x="-10" y="12" width="20" height="80" rx="3" fill="#78350f" stroke="#291105" stroke-width="2"/>
      <circle cx="0" cy="100" r="14" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
    </g>

    <!-- Intense Central Spark Explosion at Blade Contact Point (320, 390) -->
    <circle cx="320" cy="390" r="90" fill="#38bdf8" opacity="0.3" filter="url(#parrySpark)"/>
    <circle cx="320" cy="390" r="45" fill="#fef08a" opacity="0.7" filter="url(#parrySpark)"/>
    <circle cx="320" cy="390" r="18" fill="#ffffff" filter="url(#parrySpark)"/>

    <!-- Deflection Force Waves -->
    <circle cx="320" cy="390" r="130" fill="none" stroke="#67e8f9" stroke-width="3" opacity="0.6"/>
    <circle cx="320" cy="390" r="180" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="10 8" opacity="0.4"/>

    <!-- Sharp Ricochet Sparks -->
    <line x1="320" y1="390" x2="220" y2="280" stroke="#fef08a" stroke-width="4" stroke-linecap="round" filter="url(#parrySpark)"/>
    <line x1="320" y1="390" x2="420" y2="300" stroke="#ffffff" stroke-width="5" stroke-linecap="round" filter="url(#parrySpark)"/>
    <line x1="320" y1="390" x2="250" y2="480" stroke="#fef08a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="320" y1="390" x2="400" y2="490" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
    <line x1="320" y1="390" x2="330" y2="210" stroke="#ffffff" stroke-width="5" stroke-linecap="round" filter="url(#parrySpark)"/>
    <line x1="320" y1="390" x2="310" y2="560" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>

    <!-- Spark Stars -->
    <polygon points="420,290 426,306 442,312 426,318 420,334 414,318 398,312 414,306" fill="#ffffff" filter="url(#parrySpark)"/>
    <polygon points="230,270 234,280 244,284 234,288 230,298 226,288 216,284 226,280" fill="#fef08a" filter="url(#parrySpark)"/>
  </svg>
  `;
  await svgToJpg(ironParrySvg, path.join(actionsDir, 'iron_parry.jpg'));

  // 3. Battle Focus (Warrior in hyper-focused defensive poise, golden perception aura, dodging blades)
  const battleFocusSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="focusBg" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#422006"/>
        <stop offset="45%" stop-color="#1e1b4b"/>
        <stop offset="80%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <radialGradient id="zenAura" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#fef08a"/>
        <stop offset="55%" stop-color="#facc15"/>
        <stop offset="80%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#713f12" stop-opacity="0"/>
      </radialGradient>
      <filter id="focusGlow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="16" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#focusBg)"/>

    <!-- Concentric Golden Perception / Instinct Rings -->
    <ellipse cx="300" cy="420" rx="220" ry="220" fill="none" stroke="#facc15" stroke-width="2" opacity="0.3"/>
    <ellipse cx="300" cy="420" rx="170" ry="170" fill="none" stroke="#fef08a" stroke-width="3" stroke-dasharray="12 8" opacity="0.5"/>
    <ellipse cx="300" cy="420" rx="120" ry="120" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7"/>

    <!-- Golden Inner Core Aura -->
    <circle cx="300" cy="420" r="140" fill="url(#zenAura)" opacity="0.45" filter="url(#focusGlow)"/>

    <!-- Whizzing Enemy Arrows / Spear Miss Lines (Dodged) -->
    <!-- Whizzing Arrow Left to Right (slipped past) -->
    <path d="M60,280 L220,330" stroke="#f87171" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <polygon points="220,330 200,320 205,335" fill="#f87171" opacity="0.8"/>
    <!-- Whizzing Blade Path Right to Left (slipped past) -->
    <path d="M540,560 L380,500" stroke="#f87171" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <polygon points="380,500 400,510 395,495" fill="#f87171" opacity="0.8"/>

    <!-- Agile Fighter Silhouette in Focused Low Evade Stance -->
    <!-- Motion Afterimage 1 (Slightly to right) -->
    <path d="M330,300 C345,300 360,315 360,335 C360,355 345,370 330,370 C315,370 300,355 300,335 C300,315 315,300 330,300 Z
             M310,380 L350,380 L365,490 L395,590 L365,600 L340,510 L320,510 L295,600 L265,590 L295,490 Z" 
          fill="#ca8a04" opacity="0.35"/>

    <!-- Main Armored Hero Figure (Ready, Breathing, Centered) -->
    <!-- Head / Helm with Glowing Golden Eye Slit -->
    <circle cx="300" cy="320" r="32" fill="#1e293b" stroke="#facc15" stroke-width="3"/>
    <rect x="282" y="316" width="36" height="8" rx="2" fill="#fef08a" filter="url(#focusGlow)"/>

    <!-- Armored Torso in Athletic Combat Coil -->
    <polygon points="255,360 345,360 365,470 330,510 270,510 235,470" fill="#334155" stroke="#94a3b8" stroke-width="3"/>
    <polygon points="280,360 320,360 330,470 300,500 270,470" fill="#475569"/>

    <!-- Crossed Forearm Bracers in Deflection Balance -->
    <rect x="210" y="380" width="30" height="80" rx="6" transform="rotate(30 225 420)" fill="#1e293b" stroke="#facc15" stroke-width="2"/>
    <rect x="360" y="380" width="30" height="80" rx="6" transform="rotate(-30 375 420)" fill="#1e293b" stroke="#facc15" stroke-width="2"/>

    <!-- Strong Balanced Legs in Wide Stance -->
    <polygon points="250,510 280,510 250,660 210,650" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <polygon points="320,510 350,510 390,650 350,660" fill="#1e293b" stroke="#475569" stroke-width="2"/>

    <!-- Floating Breathing Runes of Clarity -->
    <circle cx="210" cy="260" r="8" fill="#fef08a" filter="url(#focusGlow)"/>
    <circle cx="390" cy="260" r="8" fill="#fef08a" filter="url(#focusGlow)"/>
    <polygon points="300,210 308,226 324,234 308,242 300,258 292,242 276,234 292,226" fill="#ffffff" filter="url(#focusGlow)"/>
  </svg>
  `;
  await svgToJpg(battleFocusSvg, path.join(actionsDir, 'battle_focus.jpg'));

  // 4. Arcane Blast (Overwhelming celestial burst of raw mana brilliance from wizard hands)
  const arcaneBlastSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="blastBg" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#3b0764"/>
        <stop offset="45%" stop-color="#1e1035"/>
        <stop offset="75%" stop-color="#0b0314"/>
        <stop offset="100%" stop-color="#020005"/>
      </radialGradient>
      <radialGradient id="manaCore" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#67e8f9"/>
        <stop offset="55%" stop-color="#c084fc"/>
        <stop offset="85%" stop-color="#9333ea"/>
        <stop offset="100%" stop-color="#581c87" stop-opacity="0"/>
      </radialGradient>
      <filter id="manaBloom" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#blastBg)"/>

    <!-- Radiant Mana Shockwave Nova -->
    <circle cx="300" cy="420" r="240" fill="none" stroke="#c084fc" stroke-width="4" opacity="0.4" filter="url(#manaBloom)"/>
    <circle cx="300" cy="420" r="190" fill="none" stroke="#38bdf8" stroke-width="6" opacity="0.7" filter="url(#manaBloom)"/>
    <circle cx="300" cy="420" r="140" fill="url(#manaCore)" filter="url(#manaBloom)"/>

    <!-- Shattering Space Rays -->
    <polygon points="300,420 180,60 220,50" fill="#a855f7" opacity="0.7" filter="url(#manaBloom)"/>
    <polygon points="300,420 380,50 420,60" fill="#38bdf8" opacity="0.7" filter="url(#manaBloom)"/>
    <polygon points="300,420 540,280 550,320" fill="#a855f7" opacity="0.7"/>
    <polygon points="300,420 520,540 500,570" fill="#38bdf8" opacity="0.7"/>
    <polygon points="300,420 80,540 100,570" fill="#38bdf8" opacity="0.7"/>
    <polygon points="300,420 50,320 60,280" fill="#a855f7" opacity="0.7"/>

    <!-- Wizard Robed Arms Thrust Forward Unleashing the Blast -->
    <!-- Left Sleeve -->
    <polygon points="120,740 220,560 270,590 170,760" fill="#312e81" stroke="#6366f1" stroke-width="3"/>
    <!-- Left Hand -->
    <circle cx="245" cy="540" r="22" fill="#c7d2fe" stroke="#818cf8" stroke-width="2"/>
    
    <!-- Right Sleeve -->
    <polygon points="480,740 380,560 330,590 430,760" fill="#312e81" stroke="#6366f1" stroke-width="3"/>
    <!-- Right Hand -->
    <circle cx="355" cy="540" r="22" fill="#c7d2fe" stroke="#818cf8" stroke-width="2"/>

    <!-- Lightning / Raw Plasma Arcs -->
    <path d="M300,420 Q240,320 180,240 Q150,220 110,210" stroke="#ffffff" stroke-width="6" fill="none" filter="url(#manaBloom)"/>
    <path d="M300,420 Q360,320 420,240 Q450,220 490,210" stroke="#ffffff" stroke-width="6" fill="none" filter="url(#manaBloom)"/>
    <path d="M300,420 Q320,290 300,160" stroke="#67e8f9" stroke-width="5" fill="none" filter="url(#manaBloom)"/>

    <!-- Orbiting Arcane Glyphs -->
    <polygon points="300,340 316,366 348,374 316,382 300,408 284,382 252,374 284,366" fill="#ffffff" filter="url(#manaBloom)"/>
    <polygon points="210,380 220,396 238,400 220,406 210,422 200,406 182,400 200,396" fill="#e879f9" filter="url(#manaBloom)"/>
    <polygon points="390,380 400,396 418,400 400,406 390,422 380,406 362,400 380,396" fill="#67e8f9" filter="url(#manaBloom)"/>
  </svg>
  `;
  await svgToJpg(arcaneBlastSvg, path.join(actionsDir, 'arcane_blast.jpg'));

  // 5. Frost Nova (Sub-zero glacial burst, freezing floor, sharp ice spikes)
  const frostNovaSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="frostBg" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="#083344"/>
        <stop offset="50%" stop-color="#021f2d"/>
        <stop offset="85%" stop-color="#010d14"/>
        <stop offset="100%" stop-color="#000508"/>
      </radialGradient>
      <linearGradient id="iceSpike" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#a5f3fc"/>
        <stop offset="70%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <filter id="iceBloom" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#frostBg)"/>

    <!-- Freezing Blizzard Ring -->
    <ellipse cx="300" cy="540" rx="260" ry="140" fill="#0e7490" opacity="0.4" filter="url(#iceBloom)"/>
    <ellipse cx="300" cy="540" rx="190" ry="90" fill="#38bdf8" opacity="0.5" filter="url(#iceBloom)"/>
    <ellipse cx="300" cy="540" rx="100" ry="40" fill="#ffffff" opacity="0.8" filter="url(#iceBloom)"/>

    <!-- Radiating Crystalline Glacial Spikes Outward -->
    <!-- Center Top Spike -->
    <polygon points="300,160 325,480 275,480" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2" filter="url(#iceBloom)"/>
    <!-- Diagonal Spikes -->
    <polygon points="140,260 270,510 240,540" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <polygon points="460,260 360,540 330,510" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <!-- Horizontal Lateral Spikes -->
    <polygon points="60,460 260,530 250,560" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <polygon points="540,460 350,560 340,530" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <!-- Forward Bottom Spikes -->
    <polygon points="180,690 280,560 250,550" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <polygon points="420,690 350,550 320,560" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>
    <polygon points="300,740 320,570 280,570" fill="url(#iceSpike)" stroke="#e0f2fe" stroke-width="2"/>

    <!-- Floating Snowflake Glyphs -->
    <g transform="translate(300, 360)" filter="url(#iceBloom)">
      <line x1="0" y1="-60" x2="0" y2="60" stroke="#ffffff" stroke-width="4"/>
      <line x1="-52" y1="-30" x2="52" y2="30" stroke="#ffffff" stroke-width="4"/>
      <line x1="-52" y1="30" x2="52" y2="-30" stroke="#ffffff" stroke-width="4"/>
      <circle cx="0" cy="0" r="14" fill="#a5f3fc"/>
    </g>

    <!-- Subzero Mist Particles -->
    <circle cx="160" cy="380" r="6" fill="#ffffff" filter="url(#iceBloom)"/>
    <circle cx="440" cy="380" r="6" fill="#ffffff" filter="url(#iceBloom)"/>
    <circle cx="220" cy="460" r="5" fill="#a5f3fc"/>
    <circle cx="380" cy="460" r="5" fill="#a5f3fc"/>
  </svg>
  `;
  await svgToJpg(frostNovaSvg, path.join(actionsDir, 'frost_nova.jpg'));

  // 6. Blink Ward (Wizard teleporting through prismatic spatial vortex, leaving mirror afterimage)
  const blinkWardSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="blinkBg" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="85%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <linearGradient id="riftPrism" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#818cf8"/>
        <stop offset="30%" stop-color="#c084fc"/>
        <stop offset="60%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#4f46e5"/>
      </linearGradient>
      <filter id="riftGlow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="15" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#blinkBg)"/>

    <!-- Dimensional Vortex Rings -->
    <ellipse cx="300" cy="420" rx="220" ry="160" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.4" filter="url(#riftGlow)"/>
    <ellipse cx="300" cy="420" rx="170" ry="110" fill="none" stroke="#a855f7" stroke-width="4" stroke-dasharray="16 10" opacity="0.6"/>
    <ellipse cx="300" cy="420" rx="110" ry="70" fill="none" stroke="#38bdf8" stroke-width="5" filter="url(#riftGlow)"/>

    <!-- Spatial Rift Opening in Center -->
    <path d="M290,140 Q340,320 310,480 Q260,620 300,720 Q240,540 280,380 Z" fill="url(#riftPrism)" filter="url(#riftGlow)"/>

    <!-- Translucent Shimmering Displaced Silhouette (The decoy afterimage) -->
    <g opacity="0.45" filter="url(#riftGlow)">
      <!-- Hat & Cloak -->
      <path d="M210,340 L260,220 L280,340 Z" fill="#6366f1"/>
      <ellipse cx="245" cy="340" rx="35" ry="10" fill="#4338ca"/>
      <path d="M215,350 L275,350 L295,580 L195,580 Z" fill="#4f46e5"/>
    </g>

    <!-- Emerging Wizard Figure Glinting Through Portal on Right -->
    <g transform="translate(350, 310)">
      <!-- Hat -->
      <path d="M10,90 L60,-30 L80,90 Z" fill="#4338ca" stroke="#c7d2fe" stroke-width="2"/>
      <ellipse cx="45" cy="90" rx="40" ry="12" fill="#312e81" stroke="#c7d2fe" stroke-width="2"/>
      <!-- Glowing Eye -->
      <circle cx="50" cy="115" r="4" fill="#38bdf8" filter="url(#riftGlow)"/>
      <!-- Robe Emerging -->
      <polygon points="15,130 85,130 115,340 5,340" fill="#3730a3" stroke="#818cf8" stroke-width="2"/>
      <!-- Staff in Hand -->
      <line x1="100" y1="60" x2="115" y2="360" stroke="#fef08a" stroke-width="5" filter="url(#riftGlow)"/>
      <circle cx="98" cy="50" r="14" fill="#38bdf8" filter="url(#riftGlow)"/>
    </g>

    <!-- Enemy Slash Slicing Empty Air in Left Afterimage -->
    <line x1="120" y1="280" x2="310" y2="440" stroke="#ef4444" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <polygon points="310,440 290,430 295,445" fill="#ef4444" opacity="0.7"/>

    <!-- Warp Stars & Constellations -->
    <polygon points="300,130 306,146 322,152 306,158 300,174 294,158 278,152 294,146" fill="#ffffff" filter="url(#riftGlow)"/>
    <polygon points="170,480 174,490 184,494 174,498 170,508 166,498 156,494 166,490" fill="#a5f3fc" filter="url(#riftGlow)"/>
    <polygon points="430,220 434,230 444,234 434,238 430,248 426,238 416,234 426,230" fill="#f0abfc" filter="url(#riftGlow)"/>
  </svg>
  `;
  await svgToJpg(blinkWardSvg, path.join(actionsDir, 'blink_ward.jpg'));

  console.log('Successfully generated all unique action raster illustrations!');
}

generateActions().catch((err) => {
  console.error('Failed generating action art:', err);
  process.exit(1);
});
