const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const itemsDir = path.resolve(__dirname, '../public/cards/items');
if (!fs.existsSync(itemsDir)) fs.mkdirSync(itemsDir, { recursive: true });

async function svgToJpg(svg, outPath) {
  await sharp(Buffer.from(svg))
    .resize(600, 840)
    .jpeg({ quality: 92 })
    .toFile(outPath);
  console.log('Generated:', path.basename(outPath));
}

async function generateAll() {
  console.log('Generating item raster art for all 10 physical TCG items...');

  // 1. Health Potion
  const healthPotionSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#3b0764"/>
        <stop offset="60%" stop-color="#180424"/>
        <stop offset="100%" stop-color="#09010e"/>
      </radialGradient>
      <radialGradient id="elixirGlow" cx="50%" cy="55%" r="45%">
        <stop offset="0%" stop-color="#fda4af"/>
        <stop offset="40%" stop-color="#f43f5e"/>
        <stop offset="85%" stop-color="#be123c"/>
        <stop offset="100%" stop-color="#881337"/>
      </radialGradient>
      <radialGradient id="glassShine" cx="30%" cy="30%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="40%" stop-color="#ffffff" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#713f12"/>
      </linearGradient>
      <linearGradient id="corkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="35%" stop-color="#b45309"/>
        <stop offset="70%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#92400e"/>
      </linearGradient>
      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#bgGrad)"/>
    
    <!-- Stone Pedestal -->
    <ellipse cx="300" cy="730" rx="220" ry="60" fill="#1e293b"/>
    <ellipse cx="300" cy="720" rx="190" ry="48" fill="#334155"/>
    <ellipse cx="300" cy="710" rx="160" ry="36" fill="#475569"/>

    <!-- Ambient Aura -->
    <circle cx="300" cy="460" r="180" fill="#e11d48" opacity="0.25" filter="url(#softGlow)"/>
    <circle cx="300" cy="480" r="100" fill="#fb7185" opacity="0.3" filter="url(#softGlow)"/>

    <!-- Potion Flask Shadow -->
    <ellipse cx="300" cy="690" rx="110" ry="25" fill="#000000" opacity="0.6"/>

    <!-- Glass Flask Body -->
    <path d="M260,250 L340,250 L340,320 C340,340 430,420 430,530 C430,640 370,690 300,690 C230,690 170,640 170,530 C170,420 260,340 260,320 Z" fill="#1c1917" stroke="url(#goldRim)" stroke-width="4"/>
    
    <!-- Bubbling Restorative Elixir Liquid -->
    <path d="M185,530 C185,630 235,680 300,680 C365,680 415,630 415,530 C415,480 380,430 350,420 C320,410 280,410 250,420 C220,430 185,480 185,530 Z" fill="url(#elixirGlow)" filter="url(#softGlow)"/>
    
    <!-- Elixir Heart Core & Bubbles -->
    <circle cx="270" cy="540" r="18" fill="#ffffff" opacity="0.7" filter="url(#softGlow)"/>
    <circle cx="340" cy="500" r="12" fill="#ffffff" opacity="0.6"/>
    <circle cx="310" cy="590" r="10" fill="#ffffff" opacity="0.8"/>
    <circle cx="240" cy="500" r="8" fill="#ffffff" opacity="0.5"/>
    <circle cx="360" cy="560" r="14" fill="#ffffff" opacity="0.65"/>
    <circle cx="300" cy="470" r="6" fill="#ffffff" opacity="0.9"/>

    <!-- Glass Specular Highlights -->
    <path d="M210,460 C200,500 200,580 230,630" stroke="#ffffff" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.55"/>
    <ellipse cx="280" cy="380" rx="30" ry="12" fill="url(#glassShine)"/>

    <!-- Gold Filigree Neck Ring -->
    <rect x="250" y="310" width="100" height="20" rx="4" fill="url(#goldRim)"/>
    <circle cx="300" cy="320" r="7" fill="#dc2626" stroke="#fef08a" stroke-width="2"/>

    <!-- Wooden Cork Stopper -->
    <polygon points="255,250 345,250 335,170 265,170" fill="url(#corkGrad)" stroke="#451a03" stroke-width="3"/>
    <ellipse cx="300" cy="170" rx="35" ry="10" fill="#f59e0b"/>

    <!-- Wild Meadow Herbal Sprig Tied to Neck -->
    <path d="M340,320 Q390,340 420,380" stroke="#15803d" stroke-width="4" fill="none"/>
    <circle cx="420" cy="380" r="8" fill="#22c55e"/>
    <circle cx="400" cy="355" r="7" fill="#4ade80"/>
    <circle cx="430" cy="370" r="5" fill="#f43f5e"/>
  </svg>
  `;
  await svgToJpg(healthPotionSvg, path.join(itemsDir, 'health_potion.jpg'));

  // 2. Wooden Sword
  const woodenSwordSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="forestBack" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#1e3a1e"/>
        <stop offset="50%" stop-color="#0d2310"/>
        <stop offset="100%" stop-color="#040d05"/>
      </radialGradient>
      <linearGradient id="oakBlade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#78350f"/>
        <stop offset="45%" stop-color="#b45309"/>
        <stop offset="50%" stop-color="#fef3c7"/>
        <stop offset="55%" stop-color="#b45309"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <linearGradient id="steelTrim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="50%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <filter id="swordShine" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#forestBack)"/>

    <!-- Sun Ray Angle -->
    <polygon points="120,0 280,0 420,840 260,840" fill="#fef08a" opacity="0.08"/>

    <!-- Glowing Blade Aura -->
    <line x1="160" y1="680" x2="440" y2="160" stroke="#fef08a" stroke-width="48" opacity="0.2" filter="url(#swordShine)"/>

    <!-- The Sword Group (Rotated diagonally) -->
    <g transform="translate(300, 420) rotate(-45) translate(-300, -420)">
      <!-- Sword Tip & Blade -->
      <path d="M280,140 L300,90 L320,140 L320,530 L280,530 Z" fill="url(#oakBlade)" stroke="#451a03" stroke-width="3"/>
      <!-- Blade Fuller Center Ridge Line -->
      <line x1="300" y1="120" x2="300" y2="480" stroke="#451a03" stroke-width="4"/>
      <line x1="302" y1="120" x2="302" y2="480" stroke="#fde68a" stroke-width="2"/>

      <!-- Carved Leaf Runes on Blade -->
      <circle cx="300" cy="220" r="6" fill="#84cc16"/>
      <circle cx="300" cy="270" r="5" fill="#84cc16"/>
      <circle cx="300" cy="320" r="6" fill="#84cc16"/>

      <!-- Crossguard (Oak + Iron Bands) -->
      <rect x="200" y="530" width="200" height="32" rx="8" fill="#581c87" stroke="url(#steelTrim)" stroke-width="3"/>
      <rect x="195" y="532" width="210" height="28" rx="6" fill="#92400e" stroke="#451a03" stroke-width="2"/>
      <circle cx="215" cy="546" r="8" fill="url(#steelTrim)"/>
      <circle cx="385" cy="546" r="8" fill="url(#steelTrim)"/>
      <polygon points="300,534 314,546 300,558 286,546" fill="#22c55e" stroke="#14532d" stroke-width="2"/>

      <!-- Leather Wrapped Hilt Grip -->
      <rect x="282" y="562" width="36" height="130" rx="4" fill="#7c2d12" stroke="#431407" stroke-width="3"/>
      <!-- Leather cross-bindings -->
      <line x1="282" y1="585" x2="318" y2="595" stroke="#fef3c7" stroke-width="3"/>
      <line x1="282" y1="615" x2="318" y2="625" stroke="#fef3c7" stroke-width="3"/>
      <line x1="282" y1="645" x2="318" y2="655" stroke="#fef3c7" stroke-width="3"/>
      <line x1="282" y1="675" x2="318" y2="685" stroke="#fef3c7" stroke-width="3"/>

      <!-- Pommel -->
      <circle cx="300" cy="710" r="24" fill="url(#steelTrim)" stroke="#334155" stroke-width="3"/>
      <circle cx="300" cy="710" r="14" fill="#b45309"/>
      <circle cx="300" cy="710" r="6" fill="#facc15"/>
    </g>

    <!-- Sparkles of sharpness -->
    <polygon points="460,180 466,196 482,202 466,208 460,224 454,208 438,202 454,196" fill="#ffffff" filter="url(#swordShine)"/>
    <polygon points="210,630 214,640 224,644 214,648 210,658 206,648 196,644 206,640" fill="#fef08a" filter="url(#swordShine)"/>
  </svg>
  `;
  await svgToJpg(woodenSwordSvg, path.join(itemsDir, 'wooden_sword.jpg'));

  // 3. Apprentice Staff
  const apprenticeStaffSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="arcaneBg" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <radialGradient id="crystalGlow" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#67e8f9"/>
        <stop offset="70%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#0e7490"/>
      </radialGradient>
      <linearGradient id="woodStaff" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#451a03"/>
        <stop offset="40%" stop-color="#78350f"/>
        <stop offset="70%" stop-color="#92400e"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <filter id="arcaneBloom" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#arcaneBg)"/>

    <!-- Arcane Mandala Wheel in Background -->
    <g opacity="0.25" stroke="#38bdf8" stroke-width="2" fill="none">
      <circle cx="300" cy="240" r="170"/>
      <circle cx="300" cy="240" r="130" stroke-dasharray="8 6"/>
      <polygon points="300,70 447,325 153,325"/>
      <polygon points="300,410 447,155 153,155"/>
    </g>

    <!-- Staff Body -->
    <path d="M285,320 Q290,520 280,820 L320,820 Q310,520 315,320 Z" fill="url(#woodStaff)" stroke="#291003" stroke-width="3"/>
    
    <!-- Organic Prongs Cradle at the Top -->
    <path d="M285,330 C270,300 220,270 230,200 C235,160 260,150 265,180 C260,220 280,260 295,290 Z" fill="url(#woodStaff)" stroke="#291003" stroke-width="3"/>
    <path d="M315,330 C330,300 380,270 370,200 C365,160 340,150 335,180 C340,220 320,260 305,290 Z" fill="url(#woodStaff)" stroke="#291003" stroke-width="3"/>

    <!-- Arcane Glow Aura -->
    <circle cx="300" cy="220" r="110" fill="#06b6d4" opacity="0.35" filter="url(#arcaneBloom)"/>
    <circle cx="300" cy="220" r="60" fill="#38bdf8" opacity="0.5" filter="url(#arcaneBloom)"/>

    <!-- Levitating Crystal Orb Focus -->
    <polygon points="300,165 338,205 338,245 300,285 262,245 262,205" fill="url(#crystalGlow)" stroke="#e0f2fe" stroke-width="3" filter="url(#arcaneBloom)"/>
    
    <!-- Floating Arcane Runes orbiting crystal -->
    <circle cx="240" cy="190" r="6" fill="#a5f3fc" filter="url(#arcaneBloom)"/>
    <circle cx="360" cy="250" r="8" fill="#a5f3fc" filter="url(#arcaneBloom)"/>
    <circle cx="300" cy="130" r="5" fill="#ffffff" filter="url(#arcaneBloom)"/>
    <circle cx="280" cy="300" r="7" fill="#67e8f9" filter="url(#arcaneBloom)"/>

    <!-- Ribbon Binding on Shaft -->
    <rect x="282" y="440" width="36" height="40" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
    <line x1="282" y1="453" x2="318" y2="453" stroke="#facc15" stroke-width="2"/>
    <line x1="282" y1="467" x2="318" y2="467" stroke="#facc15" stroke-width="2"/>
  </svg>
  `;
  await svgToJpg(apprenticeStaffSvg, path.join(itemsDir, 'apprentice_staff.jpg'));

  // 4. Robe
  const robeSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="robeBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#312e81"/>
        <stop offset="60%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#090520"/>
      </radialGradient>
      <linearGradient id="silkFolds" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#3730a3"/>
        <stop offset="30%" stop-color="#4f46e5"/>
        <stop offset="50%" stop-color="#818cf8"/>
        <stop offset="70%" stop-color="#4338ca"/>
        <stop offset="100%" stop-color="#312e81"/>
      </linearGradient>
      <linearGradient id="silverTrim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <filter id="robeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#robeBg)"/>

    <!-- Subtle magic aura backdrop -->
    <ellipse cx="300" cy="450" rx="200" ry="260" fill="#6366f1" opacity="0.2" filter="url(#robeGlow)"/>

    <!-- Robe Mannequin Stand / Robe Silhouette -->
    <!-- Shoulders & Cowl -->
    <path d="M190,240 C230,210 370,210 410,240 L490,440 L420,470 L380,330 L410,720 L190,720 L220,330 L180,470 L110,440 Z" fill="url(#silkFolds)" stroke="#1e1b4b" stroke-width="4"/>
    
    <!-- Sleeves Wide Flare -->
    <path d="M190,240 L110,440 L180,470 L220,330 Z" fill="#3730a3" stroke="url(#silverTrim)" stroke-width="3"/>
    <path d="M410,240 L490,440 L420,470 L380,330 Z" fill="#312e81" stroke="url(#silverTrim)" stroke-width="3"/>

    <!-- Central Vestment Lapel with Silver Embroidery -->
    <polygon points="260,230 340,230 360,720 240,720" fill="#1e1b4b" stroke="url(#silverTrim)" stroke-width="3"/>
    
    <!-- Silver Runes along collar & chest -->
    <circle cx="300" cy="270" r="14" fill="#a5b4fc" filter="url(#robeGlow)"/>
    <circle cx="300" cy="270" r="8" fill="#ffffff"/>
    <polygon points="300,310 306,322 318,328 306,334 300,346 294,334 282,328 294,322" fill="#c7d2fe"/>
    <polygon points="300,370 306,382 318,388 306,394 300,406 294,394 282,388 294,382" fill="#c7d2fe"/>

    <!-- Embroidered Sash Belt -->
    <rect x="235" y="440" width="130" height="28" rx="4" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
    <circle cx="300" cy="454" r="9" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
    <polygon points="290,468 310,468 315,570 285,570" fill="#d97706"/>

    <!-- Hem Embroidery Wave -->
    <path d="M190,710 Q245,695 300,710 T410,710" stroke="url(#silverTrim)" stroke-width="8" fill="none"/>
  </svg>
  `;
  await svgToJpg(robeSvg, path.join(itemsDir, 'robe.jpg'));

  // 5. Leather Clothes
  const leatherClothesSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="leatherBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#27272a"/>
        <stop offset="60%" stop-color="#18181b"/>
        <stop offset="100%" stop-color="#09090b"/>
      </radialGradient>
      <linearGradient id="leatherTunic" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#542e18"/>
        <stop offset="30%" stop-color="#78350f"/>
        <stop offset="50%" stop-color="#92400e"/>
        <stop offset="70%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="brassHardware" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
    </defs>
    <rect width="600" height="840" fill="url(#leatherBg)"/>

    <!-- Forest Hunter Soft Ambient Backlight -->
    <ellipse cx="300" cy="450" rx="190" ry="240" fill="#15803d" opacity="0.15"/>

    <!-- Leather Vest / Tunic -->
    <path d="M210,230 C250,210 350,210 390,230 L470,330 L410,380 L380,320 L400,690 L200,690 L220,320 L190,380 L130,330 Z" fill="url(#leatherTunic)" stroke="#271104" stroke-width="4"/>
    
    <!-- Reinforced Shoulder Spaulders -->
    <path d="M170,240 C190,220 230,225 240,260 L200,320 C180,290 160,260 170,240 Z" fill="#9a3412" stroke="url(#brassHardware)" stroke-width="2"/>
    <path d="M430,240 C410,220 370,225 360,260 L400,320 C420,290 440,260 430,240 Z" fill="#7c2d12" stroke="url(#brassHardware)" stroke-width="2"/>

    <!-- Detailed Stitching Along Seams -->
    <path d="M260,230 L250,680" stroke="#fde68a" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="M340,230 L350,680" stroke="#fde68a" stroke-width="2" stroke-dasharray="6 5"/>

    <!-- Diagonal Utility Chest Straps & Buckles -->
    <line x1="220" y1="260" x2="380" y2="440" stroke="#291105" stroke-width="16" stroke-linecap="round"/>
    <rect x="290" y="340" width="28" height="20" rx="4" fill="url(#brassHardware)" stroke="#451a03" stroke-width="2"/>
    
    <line x1="380" y1="260" x2="220" y2="440" stroke="#291105" stroke-width="16" stroke-linecap="round"/>
    <rect x="282" y="338" width="28" height="20" rx="4" fill="url(#brassHardware)" stroke="#451a03" stroke-width="2"/>

    <!-- Waist Belt with Pouches -->
    <rect x="190" y="520" width="220" height="34" rx="4" fill="#291105" stroke="#120702" stroke-width="2"/>
    <rect x="280" y="515" width="40" height="44" rx="6" fill="url(#brassHardware)" stroke="#451a03" stroke-width="3"/>
    <!-- Small Pouch on hip -->
    <rect x="350" y="525" width="45" height="50" rx="6" fill="#78350f" stroke="#291105" stroke-width="2"/>
    <circle cx="372" cy="545" r="4" fill="url(#brassHardware)"/>
  </svg>
  `;
  await svgToJpg(leatherClothesSvg, path.join(itemsDir, 'leather_clothes.jpg'));

  // 6. Chainmail
  const chainmailSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="chainBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="60%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <linearGradient id="metalLuster" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="30%" stop-color="#94a3b8"/>
        <stop offset="50%" stop-color="#f8fafc"/>
        <stop offset="70%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
      <pattern id="chainPattern" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="7" fill="none" stroke="#94a3b8" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="7" fill="none" stroke="#64748b" stroke-width="2"/>
        <circle cx="20" cy="0" r="7" fill="none" stroke="#64748b" stroke-width="2"/>
        <circle cx="0" cy="20" r="7" fill="none" stroke="#64748b" stroke-width="2"/>
        <circle cx="20" cy="20" r="7" fill="none" stroke="#64748b" stroke-width="2"/>
      </pattern>
      <filter id="metalGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#chainBg)"/>

    <!-- Padded Gambeson Base Underlay -->
    <path d="M210,220 C250,200 350,200 390,220 L480,340 L410,400 L380,330 L400,710 L200,710 L220,330 L190,400 L120,340 Z" fill="#334155" stroke="#0f172a" stroke-width="4"/>

    <!-- Chainmail Hauberk Layer -->
    <path d="M210,220 C250,200 350,200 390,220 L480,340 L410,400 L380,330 L400,710 L200,710 L220,330 L190,400 L120,340 Z" fill="url(#chainPattern)"/>

    <!-- Steel Gorget / Neckguard -->
    <path d="M240,210 C270,195 330,195 360,210 L370,290 C330,315 270,315 230,290 Z" fill="url(#metalLuster)" stroke="#1e293b" stroke-width="3" filter="url(#metalGlow)"/>
    <circle cx="300" cy="255" r="8" fill="#e11d48" stroke="#f8fafc" stroke-width="2"/>

    <!-- Heavy Steel Buckled Belt -->
    <rect x="180" y="500" width="240" height="36" rx="4" fill="#0f172a" stroke="#020617" stroke-width="2"/>
    <rect x="275" y="490" width="50" height="56" rx="6" fill="url(#metalLuster)" stroke="#1e293b" stroke-width="3"/>
    
    <!-- Hanging Chainmail Tassets / Slits -->
    <line x1="300" y1="536" x2="300" y2="710" stroke="#0f172a" stroke-width="6"/>

    <!-- Metallic Edge Gleams -->
    <line x1="210" y1="710" x2="390" y2="710" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
  </svg>
  `;
  await svgToJpg(chainmailSvg, path.join(itemsDir, 'chainmail.jpg'));

  // 7. Book of Spells
  const bookOfSpellsSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="spellBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#2e1065"/>
        <stop offset="55%" stop-color="#170638"/>
        <stop offset="100%" stop-color="#070114"/>
      </radialGradient>
      <linearGradient id="leatherCover" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#581c87"/>
        <stop offset="50%" stop-color="#7e22ce"/>
        <stop offset="100%" stop-color="#3b0764"/>
      </linearGradient>
      <linearGradient id="goldFiligree" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#854d0e"/>
      </linearGradient>
      <filter id="spellGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#spellBg)"/>

    <!-- Mystical Magic Circles Radiating Outward -->
    <g opacity="0.3" stroke="#a855f7" stroke-width="2" fill="none">
      <circle cx="300" cy="440" r="220"/>
      <circle cx="300" cy="440" r="180" stroke-dasharray="10 8"/>
      <polygon points="300,230 482,545 118,545"/>
      <polygon points="300,650 482,335 118,335"/>
    </g>

    <!-- Glowing Pages Aura -->
    <ellipse cx="300" cy="450" rx="160" ry="120" fill="#38bdf8" opacity="0.3" filter="url(#spellGlow)"/>

    <!-- The Spellbook (Floating at a slight angle) -->
    <!-- Book Backing / Page Thickness -->
    <polygon points="120,580 440,620 480,590 160,550" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
    <polygon points="120,580 120,560 440,600 440,620" fill="#94a3b8"/>

    <!-- Front Leather Cover -->
    <polygon points="130,260 430,220 470,580 170,620" fill="url(#leatherCover)" stroke="#1e1b4b" stroke-width="5"/>
    
    <!-- Golden Spine Ribbon Binding -->
    <polygon points="130,260 170,280 190,630 150,610" fill="url(#goldFiligree)"/>

    <!-- Brass Corner Guards -->
    <polygon points="430,220 380,225 435,275" fill="url(#goldFiligree)"/>
    <polygon points="470,580 420,575 465,530" fill="url(#goldFiligree)"/>
    <polygon points="170,620 220,615 175,570" fill="url(#goldFiligree)"/>

    <!-- Embossed Arcane Seal in Center of Cover -->
    <circle cx="320" cy="410" r="55" fill="none" stroke="url(#goldFiligree)" stroke-width="5" filter="url(#spellGlow)"/>
    <polygon points="320,360 365,435 275,435" fill="none" stroke="url(#goldFiligree)" stroke-width="3"/>
    <polygon points="320,460 365,385 275,385" fill="none" stroke="url(#goldFiligree)" stroke-width="3"/>
    <circle cx="320" cy="410" r="16" fill="#38bdf8" stroke="#ffffff" stroke-width="2" filter="url(#spellGlow)"/>

    <!-- Golden Bookmark Ribbon with Sapphire Charm -->
    <path d="M300,230 Q280,400 310,670 L290,690 L280,660 Z" fill="#e11d48" stroke="#881337" stroke-width="2"/>
    <circle cx="295" cy="685" r="6" fill="#facc15"/>

    <!-- Arcane Runes Floating from Book -->
    <polygon points="380,290 386,302 398,308 386,314 380,326 374,314 362,308 374,302" fill="#67e8f9" filter="url(#spellGlow)"/>
    <polygon points="250,510 254,518 262,522 254,526 250,534 246,526 238,522 246,518" fill="#e879f9" filter="url(#spellGlow)"/>
  </svg>
  `;
  await svgToJpg(bookOfSpellsSvg, path.join(itemsDir, 'book_of_spells.jpg'));

  // 8. Ring of Beasts
  const ringOfBeastsSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ringBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#451a03"/>
        <stop offset="60%" stop-color="#1c0a01"/>
        <stop offset="100%" stop-color="#050100"/>
      </radialGradient>
      <linearGradient id="bronzeBand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fed7aa"/>
        <stop offset="30%" stop-color="#f97316"/>
        <stop offset="60%" stop-color="#c2410c"/>
        <stop offset="85%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#431407"/>
      </linearGradient>
      <radialGradient id="rubyGleam" cx="35%" cy="35%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="40%" stop-color="#fb7185"/>
        <stop offset="80%" stop-color="#e11d48"/>
        <stop offset="100%" stop-color="#881337"/>
      </radialGradient>
      <filter id="beastGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#ringBg)"/>

    <!-- Primal Beast Aura Fire -->
    <ellipse cx="300" cy="440" rx="190" ry="190" fill="#ea580c" opacity="0.25" filter="url(#beastGlow)"/>

    <!-- Altar Stone Display Pillow / Stand -->
    <ellipse cx="300" cy="650" rx="200" ry="50" fill="#18181b"/>
    <ellipse cx="300" cy="635" rx="160" ry="40" fill="#7f1d1d"/>

    <!-- Ring Band (Lower back section) -->
    <ellipse cx="300" cy="510" rx="130" ry="80" fill="none" stroke="url(#bronzeBand)" stroke-width="36"/>

    <!-- Heavy Roaring Beast/Chimera Signet Head -->
    <g filter="drop-shadow(0 15px 20px rgba(0,0,0,0.8))">
      <!-- Beast Mane & Jaws Base -->
      <polygon points="210,360 390,360 410,480 300,560 190,480" fill="url(#bronzeBand)" stroke="#431407" stroke-width="4"/>
      
      <!-- Fangs -->
      <polygon points="230,480 250,540 260,480" fill="#f8fafc"/>
      <polygon points="340,480 350,540 370,480" fill="#f8fafc"/>

      <!-- Beast Snout / Brow Ridge -->
      <polygon points="260,390 340,390 320,470 280,470" fill="#ea580c" stroke="#7c2d12" stroke-width="3"/>
      
      <!-- Roaring Nose -->
      <polygon points="285,450 315,450 300,470" fill="#431407"/>

      <!-- Glowing Ruby Eyes -->
      <ellipse cx="255" cy="410" rx="16" ry="10" transform="rotate(-15 255 410)" fill="url(#rubyGleam)" stroke="#ffffff" stroke-width="1.5" filter="url(#beastGlow)"/>
      <ellipse cx="345" cy="410" rx="16" ry="10" transform="rotate(15 345 410)" fill="url(#rubyGleam)" stroke="#ffffff" stroke-width="1.5" filter="url(#beastGlow)"/>

      <!-- Primal Sparkles -->
      <circle cx="255" cy="408" r="4" fill="#ffffff"/>
      <circle cx="345" cy="408" r="4" fill="#ffffff"/>
    </g>

    <!-- Ring Band (Front overlap section) -->
    <path d="M170,510 C170,570 220,620 300,620 C380,620 430,570 430,510" fill="none" stroke="url(#bronzeBand)" stroke-width="36"/>
    <path d="M185,510 C185,555 235,595 300,595 C365,595 415,555 415,510" fill="none" stroke="#fde047" stroke-width="4" opacity="0.6"/>
  </svg>
  `;
  await svgToJpg(ringOfBeastsSvg, path.join(itemsDir, 'ring_of_beasts.jpg'));

  // 9. Sandals of Swiftness
  const sandalsSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="skyBreeze" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="50%" stop-color="#022c22"/>
        <stop offset="100%" stop-color="#01140e"/>
      </radialGradient>
      <linearGradient id="leatherSole" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#b45309"/>
        <stop offset="50%" stop-color="#78350f"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#a7f3d0"/>
        <stop offset="100%" stop-color="#34d399"/>
      </linearGradient>
      <filter id="windGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#skyBreeze)"/>

    <!-- Breezy Wind Swirls -->
    <path d="M100,500 C200,420 400,420 500,480 C550,510 520,580 460,560 C400,540 380,480 440,460" stroke="#34d399" stroke-width="4" fill="none" opacity="0.4" filter="url(#windGlow)"/>
    <path d="M80,360 C180,300 380,310 480,350" stroke="#a7f3d0" stroke-width="3" fill="none" opacity="0.3"/>

    <!-- Left Sandal -->
    <g transform="translate(190, 430) rotate(-10)">
      <!-- Sole -->
      <ellipse cx="60" cy="110" rx="55" ry="120" fill="url(#leatherSole)" stroke="#291105" stroke-width="4"/>
      <!-- Straps -->
      <line x1="20" y1="60" x2="100" y2="60" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <line x1="25" y1="110" x2="95" y2="110" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <line x1="30" y1="160" x2="90" y2="160" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <!-- Gold Ankle Ring -->
      <circle cx="60" cy="190" r="16" fill="none" stroke="#facc15" stroke-width="4"/>
      <!-- Wing on Heel -->
      <path d="M10,130 C-30,100 -50,50 -20,10 C-10,30 -5,60 10,80 Z" fill="url(#wingGrad)" stroke="#065f46" stroke-width="2" filter="url(#windGlow)"/>
      <path d="M15,150 C-15,130 -30,100 -10,60 C-5,80 0,100 15,120 Z" fill="url(#wingGrad)" stroke="#065f46" stroke-width="2"/>
    </g>

    <!-- Right Sandal -->
    <g transform="translate(340, 420) rotate(15)">
      <!-- Sole -->
      <ellipse cx="60" cy="110" rx="55" ry="120" fill="url(#leatherSole)" stroke="#291105" stroke-width="4"/>
      <!-- Straps -->
      <line x1="20" y1="60" x2="100" y2="60" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <line x1="25" y1="110" x2="95" y2="110" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <line x1="30" y1="160" x2="90" y2="160" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
      <!-- Gold Ankle Ring -->
      <circle cx="60" cy="190" r="16" fill="none" stroke="#facc15" stroke-width="4"/>
      <!-- Wing on Heel -->
      <path d="M110,130 C150,100 170,50 140,10 C130,30 125,60 110,80 Z" fill="url(#wingGrad)" stroke="#065f46" stroke-width="2" filter="url(#windGlow)"/>
      <path d="M105,150 C135,130 150,100 130,60 C125,80 120,100 105,120 Z" fill="url(#wingGrad)" stroke="#065f46" stroke-width="2"/>
    </g>
  </svg>
  `;
  await svgToJpg(sandalsSvg, path.join(itemsDir, 'sandals_of_swiftness.jpg'));

  // 10. Lucky Charm
  const luckyCharmSvg = `
  <svg width="600" height="840" viewBox="0 0 600 840" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="charmBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#451a03"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <radialGradient id="goldCharm" cx="40%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#fef08a"/>
        <stop offset="55%" stop-color="#facc15"/>
        <stop offset="85%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#713f12"/>
      </radialGradient>
      <radialGradient id="emeraldHeart" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#6ee7b7"/>
        <stop offset="50%" stop-color="#10b981"/>
        <stop offset="100%" stop-color="#064e3b"/>
      </radialGradient>
      <filter id="charmGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="600" height="840" fill="url(#charmBg)"/>

    <!-- Radiant Fortune Sunburst Rays -->
    <g opacity="0.25" fill="#facc15">
      <polygon points="300,430 280,0 320,0"/>
      <polygon points="300,430 580,200 600,240"/>
      <polygon points="300,430 600,600 560,640"/>
      <polygon points="300,430 320,840 280,840"/>
      <polygon points="300,430 20,640 0,600"/>
      <polygon points="300,430 0,240 20,200"/>
    </g>

    <!-- Golden Chain Hanging Down from Top -->
    <path d="M300,80 Q290,160 300,240" stroke="url(#goldCharm)" stroke-width="8" stroke-dasharray="14 10" fill="none"/>
    <circle cx="300" cy="250" r="14" fill="none" stroke="url(#goldCharm)" stroke-width="6"/>

    <!-- Golden Clover Glow Aura -->
    <circle cx="300" cy="450" r="160" fill="#facc15" opacity="0.3" filter="url(#charmGlow)"/>

    <!-- Four Leaf Clover Pendant Structure -->
    <g filter="drop-shadow(0 15px 25px rgba(0,0,0,0.7))">
      <!-- Leaf 1 (Top) -->
      <path d="M300,430 C270,360 220,320 270,270 C310,230 350,300 300,430 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>
      <path d="M300,430 C330,360 380,320 330,270 C290,230 250,300 300,430 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>

      <!-- Leaf 2 (Bottom) -->
      <path d="M300,470 C270,540 220,580 270,630 C310,670 350,600 300,470 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>
      <path d="M300,470 C330,540 380,580 330,630 C290,670 250,600 300,470 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>

      <!-- Leaf 3 (Left) -->
      <path d="M280,450 C210,420 170,370 120,420 C80,460 150,500 280,450 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>
      <path d="M280,450 C210,480 170,530 120,480 C80,440 150,400 280,450 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>

      <!-- Leaf 4 (Right) -->
      <path d="M320,450 C390,420 430,370 480,420 C520,460 450,500 320,450 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>
      <path d="M320,450 C390,480 430,530 480,480 C520,440 450,400 320,450 Z" fill="url(#goldCharm)" stroke="#713f12" stroke-width="4"/>

      <!-- Central Emerald Gemstone Core -->
      <circle cx="300" cy="450" r="26" fill="url(#emeraldHeart)" stroke="url(#goldCharm)" stroke-width="5" filter="url(#charmGlow)"/>
      <polygon points="300,432 312,450 300,468 288,450" fill="#ffffff" opacity="0.8"/>
    </g>

    <!-- Glittering Fortune Stars -->
    <polygon points="460,250 466,266 482,272 466,278 460,294 454,278 438,272 454,266" fill="#fef08a" filter="url(#charmGlow)"/>
    <polygon points="140,590 144,600 154,604 144,608 140,618 136,608 126,604 136,600" fill="#fef08a" filter="url(#charmGlow)"/>
    <polygon points="210,210 214,220 224,224 214,228 210,238 206,228 196,224 206,220" fill="#ffffff" filter="url(#charmGlow)"/>
  </svg>
  `;
  await svgToJpg(luckyCharmSvg, path.join(itemsDir, 'lucky_charm.jpg'));

  console.log('Successfully generated all 10 item card raster illustrations!');
}

generateAll().catch((err) => {
  console.error('Failed generating item art:', err);
  process.exit(1);
});
