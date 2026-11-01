const { chromium } = require('D:/adoni/repos/bocarena/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175'],{stdio:'ignore',windowsHide:true});
process.on('exit',()=>server.kill());
(async () => {
 for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:5175/');if(r.ok)break;}catch{} await new Promise(r=>setTimeout(r,200));}
 const browser = await chromium.launch({headless:true,executablePath:'C:/Users/adoni/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__battleTest={store,ui,render};\n'});});
 await page.goto('http://127.0.0.1:5175/');
 await page.waitForFunction(()=>window.__battleTest);
 await page.evaluate(async()=>{
  const engine=await import('/src/core/engine.ts');const {createCombatSession}=await import('/src/core/combat.ts');const {MONSTER_TEMPLATES}=await import('/src/data/monsters.ts');
  const state=engine.welcomeUpgradeStat(engine.startAdventure('fighter','carousel-review'),'str');state.welcomePreparing=false;
  const foes=[{...MONSTER_TEMPLATES.goblin,id:'goblin'},{...MONSTER_TEMPLATES.stalker,id:'stalker'}];
  const combat=createCombatSession(foes,[],state.rngState).combat;combat.hand=[0,8,1,9,2].map(i=>state.playerMasterDeck[i]);
  state.activeHook={type:'COMBAT',combat};Object.assign(window.__battleTest.ui,{targetIndex:1,handIndex:0});window.__battleTest.store.set(state);
 });
 await page.locator('.hand-carousel-track').scrollIntoViewIfNeeded();
 assert.equal(await page.locator('[data-monster-id="stalker"] .creature-stat-footer [data-creature-stat="eva"]').getAttribute('aria-label'),'EVA: 1');
 assert.equal(await page.locator('[data-monster-id="stalker"] .creature-stat-footer [data-creature-stat="def"]').count(),0);
 await page.screenshot({path:path.resolve('.artifacts/battle-hand-desktop.png'),fullPage:true});
 await page.evaluate(()=>{window.__firstHandNode=document.querySelector('.hand-carousel-unit');});
 await page.locator('[data-hand-dot]').nth(2).click();
 assert.equal(await page.locator('.hand-carousel-unit.is-center').getAttribute('data-hand-index'),'2');
 assert.equal(await page.evaluate(()=>window.__firstHandNode===document.querySelector('.hand-carousel-unit')),true);
 await page.keyboard.press('q');assert.equal(await page.locator('.hand-carousel-unit.is-center').getAttribute('data-hand-index'),'1');
 await page.locator('.hand-carousel-unit.is-center [data-action="play-card"]').click();
 await page.locator('.combat-confirm-modal').waitFor();
 assert.equal(await page.evaluate(()=>window.__battleTest.store.get().activeHook.combat.playerAp),3);
 await page.keyboard.press('e');assert.equal(await page.evaluate(()=>window.__battleTest.ui.handIndex),1);
 await page.locator('[data-action="cancel-play-card"]').last().click();
 const track=await page.locator('.hand-carousel-track').boundingBox();
 await page.mouse.move(track.x+track.width/2+65,track.y+130);await page.mouse.down();await page.mouse.move(track.x+track.width/2-65,track.y+130,{steps:5});await page.mouse.up();
 assert.equal(await page.locator('.hand-carousel-unit.is-center').getAttribute('data-hand-index'),'2');
 await page.waitForTimeout(300);
 await page.locator('.hand-carousel-unit.is-center [data-action="play-card"]').click();
 await page.locator('[data-action="confirm-play-card"]').click();
 assert.equal(await page.locator('.hand-carousel-unit').count(),4);
 assert.equal(await page.evaluate(()=>window.__battleTest.store.get().activeHook.combat.playerAp),2);
 for(const [name,width,height] of [['tablet',768,1024],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.locator('.hand-carousel-track').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const bounds=await page.evaluate(()=>{const hand=document.querySelector('.battle-hand').getBoundingClientRect();const flee=document.querySelector('.flee-card-slot').getBoundingClientRect();return {hand:{left:hand.left,right:hand.right,top:hand.top,bottom:hand.bottom},flee:{left:flee.left,right:flee.right,top:flee.top,bottom:flee.bottom},width:innerWidth};});
  assert.ok(bounds.hand.left>=0&&bounds.hand.right<=bounds.width+1,JSON.stringify(bounds));
  assert.ok(bounds.flee.top>=bounds.hand.bottom||bounds.flee.left>=bounds.hand.right,JSON.stringify(bounds));
  await page.screenshot({path:path.resolve(`.artifacts/battle-hand-${name}.png`),fullPage:true});
 }
 await page.evaluate(()=>{const {store}=window.__battleTest;const state=store.get();store.set({...state,activeHook:{type:'COMBAT',combat:{...state.activeHook.combat,hand:[],playerAp:0}}});});
 assert.equal(await page.locator('.hand-carousel-unit').count(),0);
 assert.ok(await page.locator('[data-action="next-hand-card"]').isDisabled());
 assert.ok(await page.locator('[data-action="end-turn"]').isEnabled());
 assert.deepEqual(errors,[]);
 console.log('Passed browser checks: in-place carousel, dots, Q/E, swipe, confirmation/AP, card removal, tablet/mobile boundaries, separate Flee, empty hand.');
 await browser.close();
 server.kill();
})().catch(e=>{console.error(e);process.exit(1);});
