const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function catalog(file) {
  const source = fs.readFileSync(path.join(root, 'src/data', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const result = {};
  new Function('exports', js)(result);
  return result;
}
const { CLASS_CATALOG, STARTING_BASE_STATS } = catalog('classes.ts');
const {
  MONSTER_TEMPLATES,
  STAGE_1_MONSTER_DECK_COMPOSITION,
  STAGE_2_MONSTER_DECK_COMPOSITION,
  getMonsterMainTerrain,
  getMonsterRarity,
  getMonsterSupplyCount,
} = catalog('monsters.ts');
const { ADVENTURE_CARD_CATALOG, ADVENTURE_CARD_ORDER, STAGE_1_DECK_COMPOSITION, STAGE_2_DECK_COMPOSITION } = catalog('stages.ts');
const { SHOP_ITEM_CATALOG } = catalog('shopItems.ts');
const { COMBAT_CARD_CATALOG, CLASS_TRAIN_POOLS } = catalog('combatCards.ts');
const count = Object.fromEntries(STAGE_1_MONSTER_DECK_COMPOSITION.map(m => [m.templateId, m.count]));
const stage2Count = Object.fromEntries(STAGE_2_MONSTER_DECK_COMPOSITION.map(m => [m.templateId, m.count]));
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.map(value => String(value).replaceAll('|', '/').replaceAll('\n', ' ')).join(' | ')} |`).join('\n');
const stats = ['str','dex','agi','int','cha','luk'];
const intents = m => m.pattern.map((p, i) => `${i + 1}. ${p.label}: ${[
  p.damage ? `${p.damage} ${p.damageType === 'magical' ? 'magical' : 'physical'} damage` : '',
  p.block ? `+${p.block} Block` : '', p.heal ? `+${p.heal} HP` : '',
  p.evaBonus ? `+${p.evaBonus} EVA for ${p.bonusDuration ?? 1} turn(s)` : '',
  p.accBonus ? `+${p.accBonus} ACC for ${p.bonusDuration ?? 1} turn(s)` : '',
  p.defBonus ? `${p.defBonus > 0 ? '+' : ''}${p.defBonus} DEF for ${p.bonusDuration ?? 1} turn(s)` : '',
  p.randomBuff ? `random +${p.randomBuff.amount} ${p.randomBuff.stats.map(stat => stat.toUpperCase()).join(' or ')} for ${p.randomBuff.duration} turn(s)` : '',
  p.hitCount && p.hitCount > 1 ? `${p.hitCount} separate hits` : '',
  p.ignoreDef ? `ignore ${p.ignoreDef} DEF` : '', p.poisonOnHit ? 'poison on hit' : '',
  p.drainFraction ? `drain ${p.drainFraction * 100}% HP damage` : '',
  p.reviveEvery ? `every ${p.reviveEvery} casts revive one discarded ${p.reviveTemplateId}` : '',
  p.heroStatDebuff ? Object.entries(p.heroStatDebuff.stats).map(([stat, value]) => `-${value} Hero ${stat.toUpperCase()}`).join(', ') + ` for ${p.heroStatDebuff.duration} turns${p.heroStatDebuffOnHit ? ' on hit' : ''}` : '',
  p.heroEvaDebuff ? `-${p.heroEvaDebuff} Hero EVA for ${p.heroEvaDebuffDuration ?? 2} turns` : '',
  p.summonFromMonsterDeck ? `tutor one ${p.summonFromMonsterDeck} from Monster Deck into play` : '',
  p.returnDiscardToMonsterDeckOnMiss ? `if tutor misses, return one discarded ${p.returnDiscardToMonsterDeckOnMiss} to top of Monster Deck` : '',
  p.damagePerCreatureInPlay ? `+${p.damagePerCreatureInPlay.amount} damage per living ${p.damagePerCreatureInPlay.templateId}` : '',
  p.damagePerHeroDebuff ? `+${p.damagePerHeroDebuff} damage per active Hero debuff` : '',
].filter(Boolean).join('; ')}`).join('<br>');
let text = `# Generated Content Catalogs\n\nGenerated from src/data by scripts/sync-doc-catalogs.cjs. Do not edit these tables manually. Run npm run docs:sync after changing catalogs; npm run docs:check verifies them. These tables record implementation data, not approval for a new gameplay rule. Mechanics and ability timing are specified in MECHANICS_AND_DATA.md.\n\n`;
text += '## Classes\n\nEffective stats below are Base + Class, before preparation upgrades, gear or blessings. Stat order: STR / DEX / AGI / INT / CHA / LUK.\n\n';
text += table(['Class','Primary','Secondary','Class bonuses','Effective stats','Max HP','Starter deck','Passive'], Object.values(CLASS_CATALOG).map(c => [c.name,c.primaryStat,c.secondaryStats.join(', '),stats.map(s => c.classBonuses[s]).join(' / '),stats.map(s => STARTING_BASE_STATS[s]+c.classBonuses[s]).join(' / '),10+2*(STARTING_BASE_STATS.str+c.classBonuses.str),Object.entries(c.starterCardIds.reduce((a,id) => ({...a,[id]:(a[id]??0)+1}),{})).map(([id,n]) => `${n}× ${COMBAT_CARD_CATALOG[id].name}`).join(', '),c.passive.description]));
const ordinaryMonsters = Object.values(MONSTER_TEMPLATES).filter(m=>!m.isBoss);
const physicalSupplyTotal = ordinaryMonsters.reduce((total, monster) => total + getMonsterSupplyCount(monster), 0);
const stage1Total = Object.values(count).reduce((a,b)=>a+b,0);
const stage2Total = Object.values(stage2Count).reduce((a,b)=>a+b,0);
text += `\n\n## Ordinary Monsters\n\nPhysical ordinary-creature supply: **${physicalSupplyTotal} cards**. Common types have 6 copies, Uncommon types have 4, and Rare types have 3. Scenario setup pulls cards from the Void by main-terrain band: 100% / rounded 2/3 / rounded 1/3. Stage 1 pulls **${stage1Total}** cards and leaves **${physicalSupplyTotal-stage1Total}** in the Void; Stage 2 pulls **${stage2Total}** and leaves **${physicalSupplyTotal-stage2Total}**. Runtime instance IDs distinguish physical copies; collector numbers identify types.\n\n`;
text += table(['Collector ID','Template ID','Name','Type','Rarity','Supply','Main terrain','Stage 1 deck','Stage 1 Void','Stage 2 deck','Level','HP','DEF','MDEF','ACC','EVA','SP','Gold','Terrains','Pattern','Abilities'], ordinaryMonsters.sort((a,b)=>a.cardNumber.localeCompare(b.cardNumber)).map(m=>{const supply=getMonsterSupplyCount(m);const stage1=count[m.templateId]??0;return [m.cardNumber,m.templateId,m.name,m.creatureType??'Unspecified',getMonsterRarity(m),supply,getMonsterMainTerrain(m),stage1,supply-stage1,stage2Count[m.templateId]??0,m.level,m.maxHp,m.def??0,m.mdef??0,m.acc??1,m.eva??0,m.statPointReward,m.goldReward,m.spawnTerrains.join(', '),intents(m),m.abilities.join('; ')||'None'];}));
text += '\n\n## Bosses\n\nBosses are spawned separately and excluded from ordinary-deck conservation. Stage 1 uses Grundy; Stage 2 uses the three Trolls together.\n\n';
text += table(['Name','Template','Level','HP','DEF','MDEF','ACC','EVA','SP','Gold','Pattern','Abilities'],Object.values(MONSTER_TEMPLATES).filter(m=>m.isBoss).map(m=>[m.name,m.templateId,m.level,m.maxHp,m.def??0,m.mdef??0,m.acc??1,m.eva??0,m.statPointReward,m.goldReward,intents(m),m.abilities.join('; ')]));
text += '\n\n## Adventure Decks\n\nBoth missions contain 30 land cards. Start Tile is separate.\n\n';
text += table(['Collector ID','Name','Terrain','Level','Stage 1 copies','Stage 2 copies'],ADVENTURE_CARD_ORDER.map(id=>{const c=ADVENTURE_CARD_CATALOG[id];return [id,c.name,c.terrain,c.level,STAGE_1_DECK_COMPOSITION[id]??0,STAGE_2_DECK_COMPOSITION[id]??0];}));
text += '\n\n## Shop and Treasure\n\nTreasure deck: two copies per item, '+(SHOP_ITEM_CATALOG.length*2)+' cards total. Prices below are before Charisma discount.\n\n';
text += table(['Item','ID','Slot/type','Level','Buy Gold','Sell Gold','Effects'],SHOP_ITEM_CATALOG.map(i=>[i.name,i.id,i.category,i.level??1,i.buyPrice,i.sellPrice,i.description]));
text += '\n\n## Combat Cards\n\nFields below are base data, not complete effective damage. STR damage also adds floor(DEX/3), weapon ATK and Berzerk; INT damage adds weapon MATK. Gear DEF/MDEF do not directly increase card Block. EVA effects use the multiplier as a flat amount. See MECHANICS_AND_DATA.md for formulas.\n\n';
text += table(['Card','ID','AP','Damage base','Damage scaling','Block base','Block scaling','Round EVA','Card ACC','Zone','Upgrades'],Object.values(COMBAT_CARD_CATALOG).map(c=>[c.name,c.id,c.apCost,c.baseDamage,c.damageScalingStat?`${c.damageScalingMultiplier??1}×${c.damageScalingStat}/${c.damageScalingDivisor??2}${c.damageAddsAccuracy?' + ACC':''}`:'None',c.baseBlock,c.blockScalingStat?`${c.blockScalingMultiplier??1}×${c.blockScalingStat}/${c.blockScalingDivisor??2}`:'None',c.evasionScalingStat?(c.evasionMultiplier??1):0,c.accBonus??0,c.isSkillUpgrade?'Void':'Starter / New Skills',c.upgradeOf??'None']));
const voidCards = Object.values(COMBAT_CARD_CATALOG).filter(c=>c.isSkillUpgrade);
text += '\n\nTrain pools: '+Object.entries(CLASS_TRAIN_POOLS).map(([c,pool])=>`${c}: ${pool.join(', ')}`).join('; ')+'.\n';
text += '\nVoid cards: '+voidCards.map(c=>`${c.name} (upgrades ${COMBAT_CARD_CATALOG[c.upgradeOf]?.name??c.upgradeOf})`).join('; ')+'. Void cards are not trainable or physically counted in New Skills decks.\n';
const dest = path.join(root,'docs/CATALOGS.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(dest) || fs.readFileSync(dest,'utf8').replaceAll('\r\n','\n') !== text) {
    console.error('Catalog docs differ from src/data. Run npm run docs:sync.'); process.exitCode = 1;
  } else console.log('Catalog documentation matches src/data.');
} else { fs.writeFileSync(dest,text); console.log('Generated docs/CATALOGS.md'); }
