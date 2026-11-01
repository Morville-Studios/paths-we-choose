# Documentation and Implementation Discrepancy Register

Audit date: **2026-11-01 (Asia/Manila)**. Status: **29 resolved, 0 pending** (29 findings including the follow-up documentation review).

This records the discrepancies identified in the current local working tree, including staged and unstaged work. It is an evidence register, not a replacement specification. Implementation is evidence of current behavior, not automatic authority. No gameplay decision is approved by this document. Source locations use file/section or symbol names so ordinary line shifts do not break the references.

## How to resolve one item

1. Select its stable ID.
2. Record the intended behavior and decision below that item.
3. Update code only if the accepted behavior differs from implementation.
4. Reconcile every affected document, example, UI description and test.
5. Record validation and mark resolved only when all affected surfaces agree.

The original 27 findings were resolved against the rules then recorded. D029 now applies the later ability-only fizzle clarification to encounter recycling as well as treasure mechanics. D015 follows the floor-rounding rule already present in AGENTS.md.

## Audit baseline that is aligned

The original audit baseline ordinary Stage 1 monster deck had **25 cards**. Subsequent Witch and quantity updates bring the current deck to **38 cards**; see the generated catalogs. Latest user-approved additions are already represented in catalog data:

| Creature | Collector ID | Level | Type | Stage 1 copies | SP | Gold |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| Leech | mon3smp-01 | 4 | Undead | 1 | 8 | 16 |
| Creeper | mon3smp-02 | 3 | Undead | 1 | 4 | 8 |
| Assasin | mon3smp-03 | 3 | Human | 1 | 4 | 8 |
| Stalker | mon1grs-06 | 2 | Unspecified | 1 | 2 | 4 |
| Rattler | mon2frs-01 | 2 | Reptile | 1 | 2 | 4 |

Other approved quantities at the original audit: Goblin ×6, Blob ×2, Pincer ×2, Scavenger ×2, Ramram ×2, Basilisk ×1, Zombie ×3, Ghoul ×1, Bullwark ×1. Goblin includes Swamp eligibility; Ramram is Grasslands-only. Boss cards are separate from the ordinary deck.

The appended Leech, Creeper, Assasin and Stalker mechanics sections and latest reward/type updates broadly match their implementations. Their earlier ambiguous details (e.g. poison timing/non-stacking, Skittish accumulation, revival timing) remain implementation interpretations documented in those sections; they can be revisited independently if desired. The latest local checks before this documentation-only change were **196 passing tests** and a passing production build.

Cloudflare release monitoring and conservative revalidation are implemented and documented. The more efficient content-versioned media strategy discussed after reviewing Bocarena/Morville has **not** been implemented. Treat it as a proposed follow-up, not the current caching behavior. Actual Cloudflare response headers and cross-deployment behavior still require deployment verification.

## Finding index

| ID | Finding | Classification | Status |
| --- | --- | --- | --- |
| [D001](#d001) | Classes and starting stats | Documentation conflict | Resolved |
| [D002](#d002) | Base-stat upgrade price | Documentation conflict | Resolved |
| [D003](#d003) | Where upgrades are allowed | Documentation conflict | Resolved |
| [D004](#d004) | Adventure deck size and composition | Documentation conflict | Resolved |
| [D005](#d005) | Initial pile counts | Documentation conflict | Resolved |
| [D006](#d006) | Monster deck summaries disagree | Documentation conflict | Resolved |
| [D007](#d007) | Monster mechanics table is incomplete | Documentation omission | Resolved |
| [D008](#d008) | Outdated Ramram and Rattler profiles | Documentation conflict | Resolved |
| [D009](#d009) | Treasure deck size | Documentation conflict | Resolved |
| [D010](#d010) | Old shop names in roadmap | Documentation conflict | Resolved |
| [D011](#d011) | Shrine boon selection flow | Documentation conflict | Resolved |
| [D012](#d012) | Hero accuracy formula | Documentation conflict | Resolved |
| [D013](#d013) | Hero physical attack and action-card formulas | Documentation conflict | Resolved |
| [D014](#d014) | Attribute bonus examples imply guaranteed derived gains | Documentation conflict | Resolved |
| [D015](#d015) | Critical damage rounding | Gameplay decision | Resolved |
| [D016](#d016) | Number of decks | Documentation conflict | Resolved |
| [D017](#d017) | Adventure conservation invariant | Incorrect documented invariant | Resolved |
| [D018](#d018) | Monster conservation invariant | Incomplete documented invariant | Resolved |
| [D019](#d019) | Purity and replay determinism | Architecture decision | Resolved |
| [D020](#d020) | Persistence and mobile packaging status | Documentation status conflict | Resolved |
| [D021](#d021) | State machine omits implemented states and continuation | Documentation omission | Resolved |
| [D022](#d022) | Roadmap implemented versus future scope | Documentation status conflict | Resolved |
| [D023](#d023) | Stale test count | Documentation status conflict | Resolved |
| [D024](#d024) | Embedded TypeScript schema drift | Documentation omission | Resolved |
| [D025](#d025) | Encounter filtering escape hatches | Gameplay decision | Resolved |
| [D026](#d026) | Duplicated sources of truth | Documentation maintenance issue | Resolved |

| [D027](#d027) | Unstocked purchase creates a new item | Implementation conflict | Resolved |
| [D028](#d028) | Stale Shrine, encounter terrain and protection prose | Documentation conflict | Resolved |
| [D029](#d029) | Encounter exhaustion after the ability-only fizzle clarification | Gameplay decision | Resolved |

## Findings

<a id="d001"></a>
### D001 — Classes and starting stats

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** README.md §Phase 1 Concept Summary; docs/ROADMAP.md §Phase 1; docs/ARCHITECTURE.md directory map.
- **Audit observation (before resolution):** Older summaries describe four attributes, two classes, Fighter 18 HP and Wizard 14 HP. Newer specs describe six attributes and three classes.
- **Implementation evidence:** `src/data/classes.ts; src/core/engine.ts:startAdventure`.
- **Current behavior:** Six base attributes start at 1. Fighter effective STR/DEX/AGI/INT/CHA/LUK = 3/2/2/1/1/1 (16 HP); Wizard = 1/2/1/3/2/1 (12 HP); Rogue = 2/2/3/1/1/1 (14 HP).
- **Decision / reconciliation needed:** Confirm the current three-class, six-attribute model; replace outdated summaries and include Rogue everywhere.
- **Accepted decision:** Retain the six-attribute, three-class model already specified in AGENTS.md and implemented in CLASS_CATALOG. Base stats are all 1; each class has one +2 Primary and two +1 Secondary bonuses. Starting HP is Fighter 16, Wizard 12, Rogue 14, before preparation upgrades, equipment or blessings.
- **Resolution / validation:** Reconciled README and roadmap class summaries, added Rogue and passives, updated architecture class references and the six-stat state label, and corrected incomplete attribute lists and starting-stat examples in GAME_DESIGN.md and MECHANICS_AND_DATA.md. Compared values and starter decks against src/data/classes.ts and AGENTS.md. This item required no runtime changes; subsequent item resolutions are recorded separately.

<a id="d002"></a>
### D002 — Base-stat upgrade price

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** README.md upgrade examples; docs/ROADMAP.md shrine milestones; docs/ARCHITECTURE.md stats module, testing row and invariant 2; docs/MECHANICS_AND_DATA.md embedded PlayerResources comment.
- **Audit observation (before resolution):** Older text says B + 1 SP; current rules elsewhere say (B + 1)^2 SP.
- **Implementation evidence:** `src/core/stats.ts:getBaseStatUpgradeCost`.
- **Behavior at audit:** Prices are 4, 9, 16, 25 SP for base 1→2→3→4→5.
- **Audit reconciliation target:** Choose the canonical formula; synchronize formulas, examples, architecture and schema comments.
- **Accepted decision:** Retain quadratic (B+1)^2 pricing from AGENTS.md and getBaseStatUpgradeCost.
- **Resolution / validation:** README, roadmap, architecture and stale schema comments now use quadratic pricing. The obsolete embedded schema was replaced with the canonical type link. See batch validation below.

<a id="d003"></a>
### D003 — Where upgrades are allowed

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/ARCHITECTURE.md Shop & Village rules; docs/GAME_DESIGN.md opening progression summary.
- **Audit observation (before resolution):** Some text says upgrades happen exclusively at shrines; newer sections include Turn 0 preparation.
- **Implementation evidence:** `src/core/engine.ts:welcomeUpgradeStat, shrineUpgradeStat; startAdventure`.
- **Behavior at audit:** New runs start with 4 SP and allow preparation upgrades as well as shrine upgrades.
- **Audit reconciliation target:** Confirm the preparation exception and document it in all upgrade restrictions.
- **Accepted decision:** Keep the explicit Turn 0 preparation exception in AGENTS.md.
- **Resolution / validation:** Upgrade restrictions now consistently permit initial preparation and Shrine visits; runtime behavior is unchanged. See batch validation below.

<a id="d004"></a>
### D004 — Adventure deck size and composition

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** README.md documentation index and 18-card list; docs/ARCHITECTURE.md deck/stages map and state diagram; docs/ROADMAP.md adventure milestone.
- **Audit observation (before resolution):** References to 15, 18 and 20 cards coexist with the newer 30-card definitions.
- **Implementation evidence:** `src/data/stages.ts:STAGE_1_DECK_COMPOSITION, STAGE_2_DECK_COMPOSITION`.
- **Behavior at audit:** Both missions have 30 adventure cards, with different mixes of Grasslands, Forest and Swamp.
- **Audit reconciliation target:** Confirm the current catalogs and replace every earlier deck composition rather than only changing headings.
- **Accepted decision:** Keep the two approved 30-card mission compositions.
- **Resolution / validation:** Removed obsolete 15/18/20-card summaries. Generated Adventure Decks table records both complete compositions. See batch validation below.

<a id="d005"></a>
### D005 — Initial pile counts

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/GAME_DESIGN.md §Play Area sidebar pile counts.
- **Audit observation (before resolution):** Adventure Deck / Discard is listed as 15 / 0 based on a 20-card deck.
- **Implementation evidence:** `src/core/engine.ts:startAdventure`.
- **Behavior at audit:** Five adventure cards are initially dealt; a 30-card deck leaves 25 in the draw pile, 0 discarded. Start Tile is separate.
- **Audit reconciliation target:** Confirm initial displayed counts and explain Start Tile exclusion.
- **Accepted decision:** Count only the 30 adventure cards, excluding Start Tile.
- **Resolution / validation:** Initial adventure draw/discard is documented as 25/0 after five cards are dealt. See batch validation below.

<a id="d006"></a>
### D006 — Monster deck summaries disagree

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** AGENTS.md §Stage 1 Monster Deck (19 Hostiles); docs/ARCHITECTURE.md monsters.ts map says 13; README.md and docs/ROADMAP.md lists are incomplete.
- **Audit observation (before resolution):** Top-level lists correctly say 25, but older sections still say 19 or 13, or list only part of the 25-card deck.
- **Implementation evidence:** `src/data/monsters.ts:STAGE_1_MONSTER_DECK_COMPOSITION`.
- **Behavior at audit:** 25 cards across 14 ordinary creature types, plus the separately spawned boss.
- **Audit reconciliation target:** Keep the approved 25-card composition and remove or reconcile obsolete duplicate summaries.
- **Accepted decision:** Keep the approved 25 ordinary Stage 1 cards, with separately spawned bosses.
- **Resolution / validation:** Removed obsolete 19/13-card summaries and partial duplicate lists; all documents link to generated complete catalogs. See batch validation below.

<a id="d007"></a>
### D007 — Monster mechanics table is incomplete

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation omission
- **Documentation locations:** docs/MECHANICS_AND_DATA.md §4.1 Monster Deck.
- **Audit observation (before resolution):** The 25-card heading covers a table with only 10 types (21 copies); Leech, Creeper, Assasin and Stalker are in later prose only. A blank line also separates the Ghoul row from the table. MDEF and creature types are not table columns.
- **Implementation evidence:** `src/data/monsters.ts:MONSTER_TEMPLATES and deck composition`.
- **Behavior at audit:** Four additional single-copy types supply the other 4 cards. Latest types, MDEF values and rewards exist in catalog data.
- **Audit reconciliation target:** Decide a single complete catalog format; include all 14 rows and current fields and repair the split table.
- **Accepted decision:** Use a generated complete catalog instead of another handwritten table.
- **Resolution / validation:** CATALOGS.md includes all 14 ordinary types/25 copies, types, MDEF, rewards, terrain, patterns and abilities; the split Ghoul table is removed. See batch validation below.

<a id="d008"></a>
### D008 — Outdated Ramram and Rattler profiles

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** README.md monster list; docs/ROADMAP.md Ramram description.
- **Audit observation (before resolution):** README gives Ramram Level 2, 16 HP, 3 SP/8 Gold and Rattler 14 HP, 3 SP/9 Gold; roadmap still calls Ramram Level 2.
- **Implementation evidence:** `src/data/monsters.ts:ramram, rattler`.
- **Behavior at audit:** Ramram: Level 1, 6 HP, 1 SP/2 Gold, Grasslands only. Rattler: Level 2, 6 HP, 2 SP/4 Gold, Forest only, Reptile. Neither uses a standalone ATK stat.
- **Audit reconciliation target:** Confirm catalog values, update older profiles and stop representing pattern damage as monster ATK.
- **Accepted decision:** Keep the current Ramram/Rattler values already reflected in the newer authoritative catalog and recent user changes.
- **Resolution / validation:** Old README/roadmap profiles were removed in favor of generated data: Ramram Level 1/6 HP/1 SP/2 Gold; Rattler Level 2/6 HP/2 SP/4 Gold, Reptile. See batch validation below.

<a id="d009"></a>
### D009 — Treasure deck size

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/GAME_DESIGN.md §Village Shop Stock says 20 cards / 10 items.
- **Audit observation (before resolution):** AGENTS.md describes 28 cards / 14 items.
- **Implementation evidence:** `src/core/deck.ts:buildStage1TreasureDeck; src/data/shopItems.ts`.
- **Behavior at audit:** Two copies of each of 14 shop items = 28 cards.
- **Audit reconciliation target:** Confirm 28 cards and replace the earlier 20-card description.
- **Accepted decision:** Keep two copies of each of the 14 current shop items.
- **Resolution / validation:** The audit baseline standardized the then-current 28 cards / 14 items. A later approved content expansion supersedes that baseline: the current catalog has 21 items and the Treasure Deck has 42 cards (two copies each). Current descriptions and the deck-builder comment use those values.

<a id="d010"></a>
### D010 — Old shop names in roadmap

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/ROADMAP.md §Village Shop milestone.
- **Audit observation (before resolution):** Lists Iron Broadsword, Studded Leather, Chainmail Vest, Sage Amulet and Lucky Coin.
- **Implementation evidence:** `src/data/shopItems.ts:SHOP_ITEM_CATALOG`.
- **Behavior at audit:** The catalog then used Iron Sword, Leather Clothes, Chainmail, Book of Spells, Lucky Charm and the other current items. Current canonical names are always supplied by `SHOP_ITEM_CATALOG`.
- **Audit reconciliation target:** Choose whether the milestone is historical or current; label history explicitly or update the names.
- **Accepted decision:** Treat roadmap as current status; canonical item names come from SHOP_ITEM_CATALOG.
- **Resolution / validation:** Replaced historical item names with a generated shop catalog reference. See batch validation below.

<a id="d011"></a>
### D011 — Shrine boon selection flow

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** README.md Shrine description; docs/GAME_DESIGN.md opening Shrine Prayer Boons bullet; docs/ARCHITECTURE.md state diagram and shrine invariant; docs/ROADMAP.md Altar Prayers.
- **Audit observation (before resolution):** Older text offers a manual choice of 1 of 3 boons and sometimes says choosing exits; newer sections grant one automatically.
- **Implementation evidence:** `src/core/engine.ts:chooseCard; src/core/shrine.ts:grantShrineBoonOnEnter; src/ui/render.ts:shrineModal`.
- **Behavior at audit:** Arrival grants one eligible random boon. Player can spend SP and leave. Compatibility prayer functions/fields still exist.
- **Audit reconciliation target:** Confirm automatic grant; separately decide whether legacy prayer APIs and UI branches should be removed.
- **Accepted decision:** Keep automatic eligible random grant on Shrine arrival and single blessing replacement.
- **Resolution / validation:** Reconciled old manual three-option descriptions and diagrams. Legacy APIs are explicitly identified as compatibility code, not current player flow. See batch validation below.

<a id="d012"></a>
### D012 — Hero accuracy formula

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** AGENTS.md Derived Combat Stats; docs/GAME_DESIGN.md Hero ACC & EVA; docs/MECHANICS_AND_DATA.md §2.4 and starting-stat examples.
- **Audit observation (before resolution):** Some text says ACC = DEX, or DEX + gear.acc. Other text says floor(DEX / 2).
- **Implementation evidence:** `src/core/stats.ts:getPlayerAcc; src/core/types.ts:CombatGearBonuses`.
- **Behavior at audit:** Base ACC = floor(DEX / 2), plus card and temporary combat modifiers. Direct gear.acc was not then a defined gear bonus.
- **Audit reconciliation target:** Choose one formula and reconcile direct gear accuracy versus stat bonuses.
- **Accepted decision (superseded by equipment update):** Direct gear ACC is valid: Hero ACC is floor(DEX/2) + gear.acc + card and temporary modifiers. Iron Sword + provides +1 gear ACC.
- **Resolution / validation:** Reconciled formulas and examples with the direct gear ACC schema and hit checks. See batch validation below.

<a id="d013"></a>
### D013 — Hero physical attack and action-card formulas

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** AGENTS.md Derived Combat Stats Physical ATK; docs/GAME_DESIGN.md equipment formulas; docs/MECHANICS_AND_DATA.md §2.4 and §3 action table.
- **Audit observation (before resolution):** Older ATK formulas omit DEX contribution. Action table lists e.g. Melee as 2 + floor(STR/2) without applicable DEX, weapon and Berzerk contributions.
- **Implementation evidence:** `src/core/stats.ts:getPlayerAtk; src/core/combat.ts:computeCardEffect`.
- **Behavior at audit:** Derived ATK = floor(STR/2) + floor(DEX/3) + gear.atk. STR-scaled damage cards additionally use floor(DEX/3), gear ATK and supplied Berzerk bonus.
- **Audit reconciliation target:** Confirm derived ATK versus per-card scaling; document full formulas without double-counting STR.
- **Accepted decision:** Keep DEX contribution, equipment and Berzerk in STR-scaled damage; distinguish card scaling from derived ATK.
- **Resolution / validation:** Documented complete damage/Block/EVA formulas. Hand, pile, confirmation, training and inspection previews now pass equipment/passive inputs into the existing core calculation. Added live-preview regression coverage. See batch validation below.

<a id="d014"></a>
### D014 — Attribute bonus examples imply guaranteed derived gains

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/MECHANICS_AND_DATA.md §1.6 blessing_dex and blessing_agi rows.
- **Audit observation (before resolution):** +1 DEX is described as +1 ACC and +1 AGI as +1 EVA.
- **Implementation evidence:** `src/core/stats.ts:getPlayerAcc, getPlayerEva`.
- **Behavior at audit:** Both derived values use floor(stat/2), so +1 attribute only improves them when crossing the next even value.
- **Audit reconciliation target:** Replace guaranteed gains with threshold-dependent descriptions, or choose a different stat formula.
- **Accepted decision:** Keep floor(stat/2) thresholds.
- **Resolution / validation:** DEX/AGI blessing text now explains that +1 only increases ACC/EVA when crossing an even stat value. See batch validation below.

<a id="d015"></a>
### D015 — Critical damage rounding

- **Status:** Resolved (2026-11-01)
- **Classification:** Gameplay decision
- **Documentation locations:** AGENTS.md Critical Hits; docs/MECHANICS_AND_DATA.md §3.2.
- **Audit observation (before resolution):** Specs explicitly use floor(damage × 1.5).
- **Implementation evidence:** `src/core/combat.ts:playCombatCardFromHand, endPlayerCombatTurn`.
- **Behavior at audit:** Both attack paths use max(damage + 1, round(damage × 1.5)). Base 3 becomes 5, whereas the documented floor rule gives 4.
- **Audit reconciliation target:** Choose floor versus nearest rounding and whether critical hits guarantee at least +1 damage; update engine, UI examples and tests together.
- **Accepted decision:** Apply floor(damage × 1.5) exactly as the latest AGENTS.md requires, without an additional minimum +1 rule.
- **Resolution / validation:** Changed hero and monster critical damage paths. Added tests for base damage 1, 3 and 5 on each path. See batch validation below.

<a id="d016"></a>
### D016 — Number of decks

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation conflict
- **Documentation locations:** docs/GAME_DESIGN.md Three Interlocking Decks; docs/ARCHITECTURE.md Three-Deck Conservation Laws.
- **Audit observation (before resolution):** Descriptions enumerate Adventure, Monster and Player Combat decks, omitting Treasure.
- **Implementation evidence:** `src/core/types.ts:RunState; src/core/deck.ts`.
- **Behavior at audit:** Treasure is a fourth independently managed deck/discard system with stock, backpack and equipped-card locations.
- **Audit reconciliation target:** Adopt four-deck terminology and document treasure conservation across all card locations.
- **Accepted decision:** Describe all four deck systems and ownership locations.
- **Resolution / validation:** Updated terminology and documented Treasure transfers, inventory, equipped items, consumed copies and non-owning UI references. See batch validation below.

<a id="d017"></a>
### D017 — Adventure conservation invariant

- **Status:** Resolved (2026-11-01)
- **Classification:** Incorrect documented invariant
- **Documentation locations:** docs/ARCHITECTURE.md Key State Invariants 6.
- **Audit observation (before resolution):** Claims deck + discard + all board cards = 15 after turn 1.
- **Implementation evidence:** `src/core/engine.ts:startAdventure, chooseCard; src/data/stages.ts`.
- **Behavior at audit:** The mission has 30 adventure cards. At Turn 0 the separate Start Tile also occupies the board and must be excluded from adventure accounting.
- **Audit reconciliation target:** Define conservation over adventure cards only, with an explicit Start Tile rule and turn-boundary scope.
- **Accepted decision:** Conserve 30 adventure cards, excluding the separate Start Tile.
- **Resolution / validation:** Replaced the incorrect 15-card equation and documented Turn 0 and stage-reset boundaries. See batch validation below.

<a id="d018"></a>
### D018 — Monster conservation invariant

- **Status:** Resolved (2026-11-01)
- **Classification:** Incomplete documented invariant
- **Documentation locations:** docs/ARCHITECTURE.md Key State Invariants 6.
- **Audit observation (before resolution):** Uses livingMonstersCount and says outside normal combat, without distinguishing bosses or victory overlays.
- **Implementation evidence:** `src/core/combat.ts:playCombatCardFromHand, endPlayerCombatTurn; src/core/engine.ts:handleCombatVictory`.
- **Behavior at audit:** Defeated creatures remain battle participants until encounter resolution; bosses are created separately; Leech transfers a card from monsterDiscard to combat. Victory presentation can reference already-discarded cards.
- **Audit reconciliation target:** Define ownership versus display references; count all owned encounter cards, exclude separately spawned bosses, and state exact transition boundaries.
- **Accepted decision:** Count all ordinary active encounter participants, not only living monsters; distinguish ownership from showcase references.
- **Resolution / validation:** Documented boss exclusion, Leech/Creeper transfers, victory references and terminal GameOver snapshots. Terminal GameOver does not retain the active encounter and is outside the live ownership equation. See batch validation below.

<a id="d019"></a>
### D019 — Purity and replay determinism

- **Status:** Resolved (2026-11-01)
- **Classification:** Architecture decision
- **Documentation locations:** AGENTS.md Pure Core Logic and Deterministic RNG; docs/ARCHITECTURE.md pure-transition claims.
- **Audit observation (before resolution):** Rules promise pure core transitions and replayable state; specs also request real-time combat timestamps.
- **Implementation evidence:** `src/core/combat.ts:createTimestamp; src/core/rng.ts`.
- **Behavior at audit:** RNG-driven mechanics are seeded, but combat logs call new Date(), so complete output states differ across identical replays. Date is not a DOM dependency; the conflict is purity/determinism, not browser portability.
- **Audit reconciliation target:** Inject a clock, move timestamps to presentation, or explicitly exempt observational metadata from determinism.
- **Accepted decision:** Honor pure core transitions while preserving requested real-time logs through explicit observational inputs.
- **Resolution / validation:** Moved wall-clock sampling to Store via an injectable clock; RunState.logTimestamp and session timestamp are explicit inputs. Core defaults to 00:00:00. Removed a hidden shop instance counter along with its catalog-minting fallback. Fixed the shallow combat mutation during enemy-turn resolution. Added replay, input immutability and no-op store identity checks. See batch validation below.

<a id="d020"></a>
### D020 — Persistence and mobile packaging status

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation status conflict
- **Documentation locations:** AGENTS.md Mobile-First wording; docs/ARCHITECTURE.md technology table and store.ts description; docs/ROADMAP.md Phase 3.
- **Audit observation (before resolution):** Some descriptions imply Capacitor packaging and a persistence hook exist; roadmap and new release docs say these are pending.
- **Implementation evidence:** `package.json; src/state/store.ts; src/updates.ts`.
- **Behavior at audit:** Store is in-memory pub/sub. No Capacitor dependencies or run-save implementation are present. Reload warns that an active run is lost.
- **Audit reconciliation target:** Label native packaging and run persistence as planned until implemented; avoid claiming a save hook exists.
- **Accepted decision:** Describe only the installed web runtime as implemented; saves and Capacitor remain planned.
- **Resolution / validation:** Updated README, contributor wording, architecture and roadmap. Store is documented as in-memory; reload warnings remain accurate. See batch validation below.

<a id="d021"></a>
### D021 — State machine omits implemented states and continuation

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation omission
- **Documentation locations:** docs/ARCHITECTURE.md State Machine & Turn Lifecycle.
- **Audit observation (before resolution):** Diagram moves directly from combat to map/stage completion and completion to welcome; it lacks preparation, exploration roll, victory acknowledgement and Stage 2 continuation.
- **Implementation evidence:** `src/core/types.ts:ActiveHook; src/core/engine.ts:confirmExplorationCombat, confirmCombatVictory, startNextMission`.
- **Behavior at audit:** Those states/transitions are implemented. Stage 1 can proceed to Cult of Trolls rather than only resetting.
- **Audit reconciliation target:** Redraw the diagram around actual hooks and stage continuation, including audio transitions.
- **Accepted decision:** Describe actual screens/hooks and the implemented Stage 1→2 continuation.
- **Resolution / validation:** Rebuilt the architecture diagram with preparation, exploration, victory acknowledgement and mission continuation; updated the game-design overview and audio state table. See batch validation below.

<a id="d022"></a>
### D022 — Roadmap implemented versus future scope

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation status conflict
- **Documentation locations:** docs/ROADMAP.md Phase 2 and Phase 3.
- **Audit observation (before resolution):** Stage 2 biomes, advanced monster abilities and statuses appear under future work despite implemented portions. Audio section does not distinguish soundtrack from future SFX.
- **Implementation evidence:** `src/data/stages.ts; src/data/monsters.ts; src/core/combat.ts; src/audio/audioManager.ts`.
- **Behavior at audit:** Two missions, Swamp cards, poison, advanced abilities and looping soundtracks exist; Ruins, native packaging, save support and assorted SFX remain separate future work.
- **Audit reconciliation target:** Split completed, partially completed and planned work; preserve historical milestones only if clearly labeled.
- **Accepted decision:** Separate implemented, incomplete and planned work.
- **Resolution / validation:** Rewrote roadmap: Stage 2, Swamp, poison, creature abilities and soundtracks are implemented; saves, native pipelines, SFX and further biomes remain pending. See batch validation below.

<a id="d023"></a>
### D023 — Stale test count

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation status conflict
- **Documentation locations:** docs/ROADMAP.md Phase 1 engine milestone; docs/ARCHITECTURE.md test-directory map.
- **Audit observation (before resolution):** Roadmap reports 13 tests; architecture lists an older subset of suites.
- **Implementation evidence:** `src/tests/; latest npm test result`.
- **Behavior at audit:** 196 tests across 9 files passed at the audit baseline. This is a snapshot, not a future guarantee.
- **Audit reconciliation target:** Update coverage descriptions; decide whether to avoid hard-coded test totals in long-lived docs.
- **Accepted decision:** Avoid hard-coded suite counts in durable overview documents.
- **Resolution / validation:** Removed obsolete 13-test claims; roadmap directs readers to npm test. Audit totals below remain explicitly historical snapshots. See batch validation below.

<a id="d024"></a>
### D024 — Embedded TypeScript schema drift

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation omission
- **Documentation locations:** docs/MECHANICS_AND_DATA.md TypeScript schema block.
- **Audit observation (before resolution):** Embedded contracts do not include all recent creature intent/runtime fields and MDEF, while newer prose describes those mechanics; PlayerResources retains an old SP-price comment.
- **Implementation evidence:** `src/core/types.ts`.
- **Behavior at audit:** Current contracts include magical intents, drain fractions, revival metadata, poison, DEF piercing, Resilient, Sprint durations and Skittish state. TerrainType remains start/grasslands/forest/swamp; creature spawn tags also include Cave/Underground.
- **Audit reconciliation target:** Choose generated schemas or clearly labeled illustrative excerpts; document adventure terrain versus monster spawn tags separately.
- **Accepted decision:** Maintain TypeScript contracts only in src/core/types.ts, linking rather than copying schemas into specs.
- **Resolution / validation:** Removed the obsolete embedded schema and documented recent fields, spawn-tag versus map-terrain distinctions, legacy prayer compatibility and explicit timestamp input. See batch validation below.

<a id="d025"></a>
### D025 — Encounter filtering escape hatches

- **Status:** Resolved (2026-11-01)
- **Classification:** Gameplay decision
- **Documentation locations:** AGENTS.md Hostile Level & Terrain-Filtered Encounter Spawning; docs/GAME_DESIGN.md encounter rules; docs/MECHANICS_AND_DATA.md encounter draw rules.
- **Audit observation (before resolution):** Rules describe matching terrain and rejecting over-level creatures as strict requirements.
- **Implementation evidence:** `src/core/deck.ts:drawMonsterCardWithReshuffle`.
- **Behavior at audit:** Fallbacks can select an incompatible-terrain creature when no match exists, or an over-level creature when the pool exceeds the budget, to prevent endless draw loops.
- **Audit reconciliation target:** Choose explicit fallback behavior (empty encounter, error, alternate pool, or current fallback) and document/test exhausted or incompatible pools.
- **Accepted decision:** User clarified that draw-until searches fizzle at current-deck exhaustion; a subsequent draw from an empty deck reshuffles its graveyard. Graveyards are public, explicit graveyard searches fizzle immediately when no target exists, and deck order is hidden while card counting/type-count inspection is allowed.
- **Resolution / validation:** Removed incompatible/over-level fallbacks and mid-search reshuffles; bounded terrain rotations and encounter accumulation to one pass. A search beginning empty may reshuffle once. Retained successful partial encounter draws; zero-monster encounters return to tile resolution without victory rewards, preserving boss triggers. Treasure searches return no item on fizzle. Leech already performs a bounded public graveyard lookup. Added exhaustion, reshuffle-boundary, partial-success, no-reward, boss-trigger and hidden-order viewer tests. Updated AGENTS and gameplay/architecture specs.

<a id="d026"></a>
### D026 — Duplicated sources of truth

- **Status:** Resolved (2026-11-01)
- **Classification:** Documentation maintenance issue
- **Documentation locations:** AGENTS.md, README.md and all four docs repeat monster quantities; current creature details are appended separately from older catalog tables.
- **Audit observation (before resolution):** Updating one summary can leave older lists, tables and code-like examples contradictory.
- **Implementation evidence:** `src/data/monsters.ts; src/data/stages.ts; current document structure`.
- **Behavior at audit:** Recent approved creature values are present in code and appended prose, while older summaries were not fully reconciled.
- **Audit reconciliation target:** Choose an authoritative catalog/spec location; link to it from summaries or generate tables, then reconcile all duplicates after each decision.
- **Accepted decision:** Generate numerical content catalogs from src/data and use links in overview documents.
- **Resolution / validation:** Added scripts/sync-doc-catalogs.cjs, docs:sync and docs:check. Production build checks freshness. Replaced duplicate tables and old partial summaries with canonical references; specs retain gameplay interpretation and timing rather than competing catalog snapshots. See batch validation below.

<a id="d027"></a>
### D027 — Unstocked purchase creates a new item

- **Status:** Resolved (2026-11-01)
- **Classification:** Implementation conflict discovered during reconciliation
- **Documentation locations:** AGENTS.md Treasure Deck and village stock rules; architecture Treasure conservation.
- **Audit observation (before resolution):** buyItem could fall back to SHOP_ITEM_CATALOG when the requested item was absent from stock, minting a new instance with a module-global counter. This violated stock-only purchases, finite Treasure ownership and pure transition guarantees.
- **Implementation evidence:** src/core/village.ts:buyItem and the former createItemInstance helper.
- **Accepted decision:** Enforce the existing stock-only shop rule; no new gameplay choice is required.
- **Resolution / validation:** Removed catalog minting and the global counter. Purchases now transfer a stocked physical card or return the original state. Updated two old fixtures to buy actual stock. Added a regression checking unstocked rejection, instance preservation, stock removal and rejection of repeated purchase.

<a id="d028"></a>
### D028 — Stale Shrine, encounter terrain and protection prose

- **Status:** Resolved (2026-11-01 follow-up review)
- **Evidence:** GAME_DESIGN.md still listed Stage 1 Shrines as Grassland ×2, Forest ×2, Swamp ×1 instead of ×3/×2/×0; described every Stage 1 encounter as Level 2; and included Ramram in Forest while omitting newer terrain-eligible creatures. AGENTS.md and GAME_DESIGN.md described Divine Protection as reducing all damage despite poison bypassing it.
- **Resolution:** Corrected Shrine quantities and encounter-level range, replaced the incomplete terrain lists with the generated catalog reference, and specified monster attack damage with an explicit poison exception. No gameplay code changed.
- **Validation:** Compared src/data/stages.ts and src/data/monsters.ts with the prose and src/core/combat.ts with the protection/poison descriptions. Catalog check and all 231 tests passed during this review.

<a id="d029"></a>
### D029 — Encounter exhaustion after the ability-only fizzle clarification

- **Status:** Resolved (2026-11-01)
- **Prior behavior:** Encounter generation used one bounded pass without recycling mid-encounter, and engine messages called unfinished draws fizzles. Specs described that implementation even after the user limited fizzle to spells/abilities.
- **Accepted decision:** Apply the user's game-mechanic recycling rule to encounters. Draw until total creature level reaches the encounter budget; recycle when a further draw needs an empty deck and eligible graveyard supply remains. Preserve strict terrain/level filtering, terrain-reject bottom placement and physical card identity.
- **Safe termination:** A pass leaving only incompatible terrain cards stops without accessing the graveyard of a nonempty deck. An empty deck with no eligible graveyard supply also stops. Partial encounters fight their existing creatures; zero-monster encounters resolve without rewards and retain boss checks. These are unavailable-supply outcomes, not ability fizzles.
- **Resolution:** Updated drawEncounterMonsters and engine messages; renamed its result flag to supplyExhausted. Synchronized README, AGENTS and gameplay/architecture specs. The bounded single-card ability-search helper retains its original behavior.
- **Validation:** All 235 tests pass, including mid-encounter recycling, a fully rejected initial deck, terrain-only dead ends, unavailable supply, card conservation, deterministic replay, input immutability and engine/boss integration. Production build passed, including generated catalog freshness and strict TypeScript checks.

## Reconciliation batch validation

- Generated catalog freshness is enforced by npm run docs:check, also run by npm run build.
- Runtime regression coverage includes critical rounding, deterministic logs, state immutability, store no-op identity, accurate damage previews and finite-stock purchases.
- Validation on 2026-11-01: 206 tests across 10 files passed; npm run build passed including catalog freshness and strict TypeScript checks. Register totals and rewritten documentation file links were checked. The earlier 196-test total is the original audit baseline, not the current suite total.
- No Cloudflare deployment was performed. Live cache header and update/rollback verification remain release work, not a resolved runtime guarantee.

## Scope and limitations

This register covers the discrepancies found in the reviewed guidance, README, four specification documents and relevant implementation. It does not assert that every possible rendering, gameplay edge case or runtime bug has been found. The original register was documentation-only. Subsequent reconciliation changes are recorded per finding above. Historical observations remain for traceability and should not be read as current defects after an item is resolved. D025 now records the explicit user decision and implemented exhaustion boundaries.

D025 follow-up validation (2026-11-01): 219 tests across 11 files passed; npm run build passed including catalog freshness and strict TypeScript checks. All 27 register entries are resolved. Prior batch totals remain historical records.

## Treasure-rule refinement after D025

The user clarified that the fizzle rule applies to spells/abilities, not guaranteed treasure mechanics. Shop stock now requires exact village-level equality; terrain discoveries accept at or below terrain level. Both discard rejects and reshuffle during the mechanic until complete while eligible physical supply exists. Earlier D025 references to treasure fizzling and bounded encounters describe superseded implementations; encounter recycling is resolved in D029. Tests now cover exact-level stock, capped rewards, mid-mechanic reshuffle, physical-copy conservation, exhausted supply and one stock draw per village visit. No Level 3 items currently exist; Level 3 shops require a content addition.

Stage 1 content update (2026-11-01): added 1 Witch (`mon3smp-04`), then raised the ordinary deck to 38 cards across 15 creature types. Earlier 25-card and 26-card audit observations remain historical.
