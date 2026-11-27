---
name: create-card-art
description: Create or revise original Paths to Odamyrus card illustrations and connect them to the correct card. Use for Action, Enemy, Adventure, Class, Paths, and Item card art; clarify the subject and visual brief before generating.
---

# Create Card Art

Read [references/art-direction.md](references/art-direction.md) for the game's visual language and composition rules. This skill handles the illustration and its asset mapping. If the request also changes a card's identity or gameplay, use the relevant card creation skill for those decisions.

## Confirm the image brief

Identify the exact card name, ID or card code, card family, subject, action or scene, setting, mood, palette, important visual details, and any supplied reference image. Ask grouped questions about details that would materially change the image; do not invent a required appearance, pose, equipment, species, landmark, or effect from the card name alone. Existing art can be offered as a labeled visual suggestion. If the user delegates art direction, propose a specific brief for approval before generation. Confirm whether the work is new art, a revision of a named asset, or an explicitly chosen reuse.

## Create and connect the illustration

1. Inspect several existing images from the same card family and the target card's current rendering. Follow the art-direction reference, the user's approved details, and the current card dimensions. Generate or edit a standalone raster painting with the image generation tool; include references when provided. Do not bake card borders, names, levels, rarity marks, stats, rules text, logos, or UI into the painting. The application renders those elements.
2. Keep one clear focal subject or event, a readable silhouette, purposeful lighting, and enough environmental context to tell the card's story. Compose for a portrait 5:7 card and check the actual crop in the game's full and mini views. Protect the areas covered by the header and lower rules or ribbon; the important face, object, gesture, or effect must stay visible. For a revision, preserve approved identity and recognizable details.
3. Save the original under `assets/raw/cards/<family>/` using the repository's existing family folder and a stable descriptive filename. Do not write generated originals straight to `public/`. Run `npm run art:optimize` to publish the browser-ready derivative, then `npm run art:check`.
4. Record an explicit card ID or code to image association in `src/ui/cardArt.ts` or the existing canonical lookup for that family. Verify the rendered card resolves to the intended file; a generic fallback or similar filename is not proof. Reuse an image only when the user chose that specific reuse. Keep game mechanics and data unchanged for an art-only request.
5. Inspect the final art and rendered card at normal, inspection, and mini sizes. Check focal visibility, legibility under overlays, family consistency, and whether the image clearly distinguishes the card. Run the repository checks required by `AGENTS.md` for code or data changes. Report the asset path and any unresolved visual decision.

Do not include other games' or artists' names in the style brief or generation prompt. Describe the visible qualities directly.
