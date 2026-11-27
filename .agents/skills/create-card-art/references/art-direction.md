# Paths to Odamyrus card art direction

Use this description when writing an image brief or prompt. The game's existing paintings in `public/cards/` are the visual reference; inspect the relevant family before generating. Keep art direction here, while card dimensions and overlays remain owned by `docs/GAME_DESIGN.md` and the UI templates.

## Shared look

- Painterly high fantasy illustration with believable anatomy, physical materials, and richly textured stone, leather, metal, cloth, wood, foliage, or magic. Details support the subject without turning the image into visual noise.
- A cinematic, story-filled moment rather than a flat icon or neutral catalog shot. Characters have deliberate poses and expressions; places have a sense of history and scale; objects feel like prized or dangerous artifacts.
- Strong light and shadow with a clear focal highlight. Warm fire or gold and cool moonlight, mist, or magical glow often separate the subject from a darker environment. Use color to support the card's identity, not a fixed palette on every card.
- Atmospheric depth: crisp, readable foreground subject; layered architecture, landscape, figures, smoke, fog, or particles behind it. The setting explains the card without competing with its main subject.
- Detailed rendering and controlled brush texture. Favor coherent forms, readable hands and faces, convincing perspective, and material-specific highlights. Avoid flat vector art, pixel art, plastic-looking surfaces, excessive blur, and cluttered effects.
- Serious adventurous tone with room for wonder, danger, or humor when the card calls for it. Keep violence and horror appropriate to the existing game art.

## Composition by card family

| Family | Primary visual story |
| --- | --- |
| Enemy Card | The enemy's recognizable anatomy, gear, temperament, and habitat. Keep its head and silhouette clear at mini size; bosses may use a larger, more imposing scene. |
| Action Card | An unmistakable action in progress: attack arc, ward, spell, maneuver, or aftermath. Show direction and energy without obscuring the acting figure or effect. |
| Adventure Card | A place the player could enter. Use a distinct landmark and depth cues to separate encounter, village, shrine, and undiscovered scenes. |
| Class Card | A memorable hero portrait in characteristic attire and environment. The class role should read from pose, tools, and context. |
| Paths Card | The specific discovery, choice, hazard, or reward at a glance; show the event rather than a generic terrain view. |
| Item Card | One identifiable object as the hero, with materials and scale readable. Its surroundings support its origin or power. |

## Image-only handoff

Create a clean illustration with no typography, card border, interface, stat badges, icon labels, or watermark. Portrait 5:7 is the target card canvas; allow enough space around the focal subject for the application's name header and lower text or ribbon. Verify the actual crop because some existing source art has another aspect ratio.

Use the approved card ID/code and explicit art path when connecting the image. Existing broad lookups in `src/ui/cardArt.ts` can assign the wrong image to a new card, so inspect the resolved path in the rendered result. The original belongs in `assets/raw/cards/`; `npm run art:optimize` creates the matching `public/cards/` derivative.
