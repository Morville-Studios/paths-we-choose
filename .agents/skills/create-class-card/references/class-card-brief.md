# Class Card design brief

Collect these decisions in prose or a compact form. Each field is complete when the user specifies it, accepts a labeled suggestion, or explicitly adopts an existing rule. Silence is not approval.

```text
Identity: class name, stable ID, title/role, description, visible card wording
Stats: primary stat, two secondary stats, bonus to each stat, strengths/weaknesses
Starting build: exact Action Card IDs and copy counts; starting weapon and armor
Passive: name; exact trigger; effect/formula; targets; timing; duration;
         stacking, limits, and interaction with turn/battle boundaries
Progression: class-specific New Skills/training access; other acquisition routes
Art: subject, pose, attire, setting, palette, focal area, reference/source,
     generate/adapt/reuse/defer, and approved image path
Exceptions: changes to current class, stat, combat, or card presentation rules
```

Ask about repeated triggers, simultaneous events, insufficient resources, death or victory, and save/load if the passive persists. If the class needs new Action Cards, collect each card's full specification using the Action Card skill; a name or theme does not define its mechanics.

## Presentation and implementation checks

`data/classes.json` owns the class entry. `CharacterClassDef` and `ClassId` in `src/core/types.ts` own its contract; `src/data/classes.ts` adapts the catalog. `src/ui/screens/classSelect.ts` currently contains a fixed class order, class-name mapping, and deck summary. `src/ui/cardArt.ts` maps each class ID to its Adventurer image. Search for other class-specific branches before claiming the class is fully wired.

Class selection displays the name, title, description, portrait, role stats, passive, derived stats, HP, and deck summary. The unselected Class Card in the Void uses a physical card face. Preserve a consistent 5:7 physical card frame and the existing selection interaction; changing the carousel layout is an explicit design decision. Verify readable rendering at selection and mini sizes.

Exact formulas and starter copy counts belong to `docs/MECHANICS_AND_DATA.md` and the catalog. The generated `docs/CATALOGS.md` is an output of `npm run docs:sync`.
