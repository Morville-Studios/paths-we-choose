const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'public/icons/icons.png';
const outDir = 'public/icons';

const icons = [
  // Base Stats (Row 1)
  { 
    name: 'str', x: 34, y: 104, w: 160, h: 164,
    holeSeeds: [[78, 68]]
  },
  { 
    name: 'dex', x: 212, y: 104, w: 160, h: 164 
  },
  { 
    name: 'agi', x: 390, y: 104, w: 160, h: 164 
  },
  { 
    name: 'int', x: 568, y: 104, w: 160, h: 164 
  },
  { 
    name: 'cha', x: 746, y: 104, w: 160, h: 164,
    holeSeeds: [[60, 74], [100, 85], [80, 118]]
  },
  { 
    name: 'luk', x: 924, y: 104, w: 160, h: 164 
  },

  // Derived Stats (Row 2)
  { 
    name: 'acc', x: 34, y: 547, w: 160, h: 164,
    mode: 'reticle'
  },
  { 
    name: 'eva', x: 212, y: 547, w: 160, h: 164 
  },
  { 
    name: 'atk', x: 390, y: 547, w: 160, h: 164,
    holeSeeds: [[80, 42], [80, 122], [42, 80], [122, 80]]
  },
  { 
    name: 'def', x: 568, y: 547, w: 160, h: 164,
    mode: 'shield'
  },
  { 
    name: 'matk', x: 746, y: 547, w: 160, h: 164 
  },
  { 
    name: 'mdef', x: 924, y: 547, w: 160, h: 164,
    mode: 'mdef-shield'
  },

  // Item Slots (Row 3 Left)
  { 
    name: 'slot-weapon', x: 38, y: 1010, w: 160, h: 164,
    alias: 'weapon'
  },
  { 
    name: 'slot-armor', x: 229, y: 1010, w: 160, h: 164,
    alias: 'armor',
    holeSeeds: [[80, 35]]
  },
  { 
    name: 'slot-accessory', x: 419, y: 1010, w: 160, h: 164,
    alias: 'accessory',
    holeSeeds: [[86, 95]]
  },

  // Resources (Row 3 Right)
  { 
    name: 'sp', x: 668, y: 1009, w: 194, h: 175 
  },
  { 
    name: 'gold', x: 888, y: 1009, w: 194, h: 175,
    holeSeeds: [[105, 110]]
  }
];

function isTraversableBg(name, x, y, r, g, b, w, h) {
  const lum = 0.299*r + 0.587*g + 0.114*b;
  const isCorner = (x < 25 || x > w - 25) && (y < 25 || y > h - 25);

  if (name === 'slot-accessory') {
    if (x < 26 || x > 145 || y < 15 || y > 152) return true;
    if (x < 42 && y < 42) return true;
    if (x > 125 && y < 35) return true;
    if (x < 35 && y > 130) return true;
    if (x > 142 && y > 138) return true;

    // Inside hole
    const dx = x - 86, dy = y - 95;
    if (dx*dx + dy*dy < 42*42) {
      if (r < 115 || lum < 85) return true;
    }

    if (lum < 55 && !(x > 80 && x < 130 && y > 135)) return true;

    const isGold = (r > 75 && g > 55 && r > b + 15);
    const isGem = (b > 65 && (b > r + 10 || lum > 110));
    return !(isGold || isGem);
  }

  if (name === 'slot-weapon') {
    if (x < 16 || y > 152) return true;
    if (y < 16 && !(x > 128 && y > 12)) return true;
    if (x > 142 && y < 22) return true;
    if (x < 30 && y < 30) return true;
    if (x > 130 && y > 130) return true;

    if (lum < 58 && !(x < 60 && y > 100)) return true;
    if (lum < 75 && r < 55 && b > r + 30) return true;

    const isGold = (r > 65 && g > 45 && r > b + 12);
    const isGrip = (r > 38 && g > 25 && r > b + 6 && x < 60 && y > 100);
    const isBlade = (lum > 62 && Math.abs(r - g) < 30);
    return !(isGold || isGrip || isBlade);
  }

  if (name === 'slot-armor') {
    if (x < 20 || x > 140 || y < 8 || y > 150) return true;
    if (x < 32 && y < 24) return true;
    if (x > 128 && y < 24) return true;
    if (x < 28 && y > 132) return true;
    if (x > 132 && y > 132) return true;

    if (lum < 35 && b > r + 10) return true;

    if (x > 60 && x < 100 && y > 16 && y < 45) {
      if (lum < 45 || b > r) return true;
    }

    const isGold = (r > 65 && g > 45 && r > b + 12);
    const isSteel = (lum > 30 && x > 20 && x < 140 && y > 10 && y < 148);
    const isLeather = (x > 18 && x < 142 && y > 50 && y < 130);
    return !(isGold || isSteel || isLeather);
  }

  if (name === 'gold') {
    if (x < 24 && y < 24) return true;
    if (x > w - 24 && y < 24) return true;
    if (isCorner && !(lum > 130 && r > b + 25)) return true;
    if (x < 16 || x > w - 16 || y < 16 || y > h - 16) {
      if (!(lum > 140 && r > b + 30)) return true;
    }
    if (lum < 40 && r < 75 && !(lum > 120)) return true;
    const isGold = (r > 80 && g > 60 && r > b + 18);
    const isSparkle = (lum > 130 && r > b + 20);
    return !(isGold || isSparkle);
  }

  if (name === 'cha') {
    if (isCorner && !(lum > 130 && r > b + 25)) return true;
    if (x < 18 || x > w - 14 || y < 14 || y > h - 14) {
      if (!(lum > 140 && r > b + 30)) return true;
    }
    const isGold = (r > 85 && g > 65 && r > b + 20);
    const isSparkle = (lum > 130 && r > b + 25);
    return !(isGold || isSparkle);
  }

  if (name === 'luk') {
    if (isCorner && !(lum > 130 && g > b)) return true;
    if (x < 14 || x > w - 14 || y < 14 || y > h - 14) {
      if (!(lum > 140 && g > b)) return true;
    }
    const isGreen = (g > 80 && g > r + 15 && g > b + 18);
    const isSparkle = (lum > 130 && g > b);
    return !(isGreen || isSparkle);
  }

  if (name === 'str') {
    if (x < 18 || y < 16) return true;
    if (x > w - 16 && y < h - 45) return true;
    if (x > w - 16 && y > h - 16) return true; // clear bottom-right tab
    if (isCorner && !(x > w - 30 && y > h - 45)) return true;
    if (lum < 35 && !(x > w - 30 && y > h - 45)) return true;

    // Muscle crease tolerance: lower to 42 so biceps and shoulder stay solid
    const isArm = (r > 42 && g > 26 && r > b + 5);
    const isFire = (r > 90 && g > 50 && r > b + 25);
    return !(isArm || isFire);
  }

  if (name === 'dex') {
    if (isCorner && !(lum > 130 && g > b)) return true;
    if ((x < 16 || x > w - 16 || y < 16 || y > h - 16) && !(lum > 130 && g > b)) return true;
    if (lum < 32 && r < 35 && g < 35) return true;

    // Keep glove leather, knuckle folds, and wrist solid
    const isGlove = (r > 18 && g > 12 && r > b + 2) || (lum > 25 && r > b);
    const isSkin = (r > 75 && g > 50 && r > b + 12);
    const isGreen = (g > 60 && g > r + 8 && g > b + 6);
    return !(isGlove || isSkin || isGreen);
  }

  if (name === 'agi') {
    if (isCorner && !(x > w - 30 && y < 35 && lum > 140)) return true;
    if ((x < 16 || y < 16 || y > h - 16) && !(x > w - 30 && y < 35 && lum > 140)) return true;
    if (lum < 35 && b > r + 10) return true;

    const isBoot = (r > 38 && g > 25 && r > b + 6);
    const isWing = (lum > 75 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
    const isTrail = (b > 75 && g > 60 && b > r + 15);
    return !(isBoot || isWing || isTrail);
  }

  if (name === 'int') {
    if (isCorner && !(lum > 130 && b > r)) return true;
    if ((x < 16 || x > w - 16 || y < 16 || y > h - 16) && !(lum > 130 && b > r)) return true;
    if (lum < 35 && b > r + 10) return true;

    const isCover = (b > 45 && lum > 25 && b > r + 8 && y > 50);
    const isPages = (lum > 50 && r > b + 4 && y > 50);
    const isFlame = (b > 70 && g > 45 && b > r + 10);
    return !(isCover || isPages || isFlame);
  }

  if (name === 'eva') {
    if (isCorner && !(lum > 130 && b > g)) return true;
    if (x < 16 || x > 134 || y < 16 || y > h - 16) return true;
    if (lum < 32 && r < 30) return true;

    const isRunner = (x > 35 && x < w - 25 && y > 25 && y < h - 20 && (b > 25 || r > 20) && lum < 85);
    const isAura = (lum > 38 && b > g + 8);
    return !(isRunner || isAura);
  }

  if (name === 'atk') {
    if (isCorner && !(lum > 120 && Math.abs(r - g) < 25)) return true;
    if (x < 16 || x > w - 16 || y < 16 || y > h - 16) {
      if (!((x < 35 || x > w - 35) && y < 38 && lum > 70)) return true;
    }
    if (lum < 48 && r < 80 && (b > 30 || g < 40)) return true;

    const isBlade = (lum > 55 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
    const isGold = (r > 75 && g > 55 && r > b + 18);
    const isGrip = (r > 42 && g > 28 && r > b + 12);
    const isSparkle = (lum > 130 && r > b + 20);
    return !(isBlade || isGold || isGrip || isSparkle);
  }

  if (name === 'matk') {
    if (isCorner && !(lum > 130 && b > g)) return true;
    if (x < 16 || x > w - 16 || y < 16 || y > h - 16) return true;
    if (lum < 32) return true;

    // Connect staff shaft smoothly
    const isWood = (r > 35 && g > 22 && r > b + 5);
    const isGold = (r > 80 && g > 60 && r > b + 18);
    const isOrb = (b > 50 && r > 38 && b > g + 6);
    return !(isWood || isGold || isOrb || lum > 60);
  }

  if (name === 'sp') {
    if (isCorner || x < 18 || x > w - 18 || y < 16 || y > h - 5) return true;
    if (lum < 35) return true;
    const isGreen = (g > 55 && g > r + 14 && g > b + 10);
    const isCore = (lum > 130 && g >= r);
    return !(isGreen || isCore);
  }

  return lum < 25 && r < 25 && g < 30 && b < 40;
}

function removeIslands(out, w, h, minSize = 40) {
  const visited = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (out[idx * 4 + 3] > 0 && !visited[idx]) {
        const comp = [];
        const qx = [x], qy = [y];
        visited[idx] = 1;
        let head = 0;
        while (head < qx.length) {
          const cx = qx[head], cy = qy[head];
          head++;
          comp.push(cy * w + cx);
          for (const [nx, ny] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (out[nidx * 4 + 3] > 0 && !visited[nidx]) {
                visited[nidx] = 1;
                qx.push(nx);
                qy.push(ny);
              }
            }
          }
        }
        if (comp.length < minSize) {
          for (const p of comp) {
            out[p * 4 + 3] = 0;
          }
        }
      }
    }
  }
}

async function processIcon(ic) {
  const { data } = await sharp(srcPath)
    .extract({ left: ic.x, top: ic.y, width: ic.w, height: ic.h })
    .raw().toBuffer({ resolveWithObject: true });

  const w = ic.w, h = ic.h;
  const out = Buffer.alloc(w * h * 4);

  if (ic.mode === 'reticle') {
    // ACC target reticle
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const outIdx = (y * w + x) * 4;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const lum = 0.299*r + 0.587*g + 0.114*b;

        if (x < 16 || x > w - 16 || y < 16 || y > h - 16) continue;
        const isCorner = (x < 24 || x > w - 24) && (y < 24 || y > h - 24);
        if (isCorner) continue;

        const isLine = (lum > 85 && r > 140 && (g > 50 || b > 35));
        const isLineGlow = (lum > 60 && r > 110 && (g > 40 || b > 25));

        if (isLine || isLineGlow) {
          out[outIdx] = r;
          out[outIdx+1] = g;
          out[outIdx+2] = b;
          out[outIdx+3] = isLine ? 255 : 180;
        }
      }
    }
  } else if (ic.mode === 'shield') {
    // DEF shield
    const isBg = new Uint8Array(w * h);
    const queueX = [], queueY = [];

    for (let x = 0; x < w; x++) {
      queueX.push(x, x);
      queueY.push(0, h - 1);
      isBg[0 * w + x] = 1;
      isBg[(h - 1) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      queueX.push(0, w - 1);
      queueY.push(y, y);
      isBg[y * w + 0] = 1;
      isBg[y * w + (w - 1)] = 1;
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      for (const [nx, ny] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!isBg[nidx]) {
            const idx = nidx * 3;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const isGoldRim = (r > 75 && g > 55 && r > b + 18);
            if (!isGoldRim) {
              isBg[nidx] = 1;
              queueX.push(nx);
              queueY.push(ny);
            }
          }
        }
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const outIdx = (y * w + x) * 4;
        const isCorner = (x < 24 || x > w - 24) && (y < 24 || y > h - 24);
        const isMargin = (x < 22 || x > w - 22 || y < 16 || y > h - 16);

        if (isBg[y * w + x] || isCorner || (isMargin && !(y > 20 && y < h - 20 && Math.abs(x - w/2) < 45))) {
          // transparent
        } else {
          out[outIdx] = data[idx];
          out[outIdx+1] = data[idx+1];
          out[outIdx+2] = data[idx+2];
          out[outIdx+3] = 255;
        }
      }
    }
  } else if (ic.mode === 'mdef-shield') {
    // MDEF crystal shield
    const isBg = new Uint8Array(w * h);
    const queueX = [], queueY = [];

    for (let x = 0; x < w; x++) {
      queueX.push(x, x);
      queueY.push(0, h - 1);
      isBg[0 * w + x] = 1;
      isBg[(h - 1) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      queueX.push(0, w - 1);
      queueY.push(y, y);
      isBg[y * w + 0] = 1;
      isBg[y * w + (w - 1)] = 1;
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      for (const [nx, ny] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!isBg[nidx]) {
            const idx = nidx * 3;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const isGoldRim = (r > 75 && g > 55 && r > b + 18);
            const isCrystal = (b > 80 && g > 60);
            const isOrbit = (b > 85 && g > 65 && ny > 55 && ny < 105);
            if (!isGoldRim && !isCrystal && !isOrbit) {
              isBg[nidx] = 1;
              queueX.push(nx);
              queueY.push(ny);
            }
          }
        }
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const outIdx = (y * w + x) * 4;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const isCorner = (x < 24 || x > w - 24) && (y < 24 || y > h - 24);
        const isMargin = (x < 20 || x > w - 20 || y < 14 || y > h - 14);

        // Clear margin unless it's the cyan/blue orbit ring
        if (isBg[y * w + x] || isCorner || (isMargin && !(y > 65 && y < 95 && b > 110 && g > 90))) {
          // transparent
        } else {
          out[outIdx] = data[idx];
          out[outIdx+1] = data[idx+1];
          out[outIdx+2] = data[idx+2];
          out[outIdx+3] = 255;
        }
      }
    }
  } else {
    // General perimeter & hole flood fill
    const isBg = new Uint8Array(w * h);
    const queueX = [];
    const queueY = [];

    for (let x = 0; x < w; x++) {
      queueX.push(x, x);
      queueY.push(0, h - 1);
      isBg[0 * w + x] = 1;
      isBg[(h - 1) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      queueX.push(0, w - 1);
      queueY.push(y, y);
      isBg[y * w + 0] = 1;
      isBg[y * w + (w - 1)] = 1;
    }

    if (ic.holeSeeds) {
      for (const [hx, hy] of ic.holeSeeds) {
        queueX.push(hx);
        queueY.push(hy);
        isBg[hy * w + hx] = 1;
      }
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = ny * w + nx;
          if (!isBg[nidx]) {
            const pidx = nidx * 3;
            const r = data[pidx], g = data[pidx+1], b = data[pidx+2];
            if (isTraversableBg(ic.name, nx, ny, r, g, b, w, h)) {
              isBg[nidx] = 1;
              queueX.push(nx);
              queueY.push(ny);
            }
          }
        }
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const outIdx = (y * w + x) * 4;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const nidx = y * w + x;

        if (isBg[nidx]) {
          out[outIdx] = 0;
          out[outIdx+1] = 0;
          out[outIdx+2] = 0;
          out[outIdx+3] = 0;
        } else {
          out[outIdx] = r;
          out[outIdx+1] = g;
          out[outIdx+2] = b;
          out[outIdx+3] = 255;
        }
      }
    }
  }

  // Remove small disconnected pixel islands
  removeIslands(out, w, h, 40);

  const destPath = path.join(outDir, `${ic.name}.png`);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(destPath);

  console.log(`Saved: ${destPath}`);

  if (ic.alias) {
    const aliasPath = path.join(outDir, `${ic.alias}.png`);
    await sharp(destPath).toFile(aliasPath);
    console.log(`  Also saved alias: ${aliasPath}`);
  }
}

async function main() {
  for (const ic of icons) {
    await processIcon(ic);
  }
  console.log('All 17 icons processed and saved to ' + outDir);
}

main();
