# AGENTS.md

## Project Context

This is a pure JavaScript HTML5 Canvas tower-defense game. Enemy art is drawn by `src/game/Renderer.js`; enemy balance and sprite metadata live in `src/config/enemies.js`; wave composition lives in `src/config/waves.js`.

The main visual reference is `scetch.png` in the repository root. It establishes the target style: hand-painted fantasy forest tower-defense art, warm earthy colors, crisp readable small-game silhouettes, and slightly top-down map readability.

## Project Quick Facts

- Entry point: `index.html` loads `src/main.js` as an ES module.
- Core game orchestration: `src/game/Game.js`.
- Enemy movement and animation-state selection: `src/game/Enemy.js`.
- Enemy rendering and sprite-sheet playback: `src/game/Renderer.js`.
- Enemy config, balance, sprite metadata, and animation URLs: `src/config/enemies.js`.
- Wave composition: `src/config/waves.js`.
- Tower config: `src/config/towers.js`.
- Combat multipliers and armor types: `src/config/combat.js`.
- Map/path/buildable layout: `src/config/map.js`.
- Enemy sprite assets: `src/assets/enemies/`.
- Tower sprite assets: `src/assets/towers/`.
- Map art assets: `src/assets/map/`.
- Lore and planned wave themes: `lor.md`.
- Balance iteration notes: `BALANCE_NOTES.md`.

This repo currently has no `package.json`; use the bundled Node executable for syntax checks. The game can be served as static files, but ES modules usually need an HTTP server rather than opening `index.html` directly from disk.

Current sprite-backed enemy ids include `dog`, `boar`, `walrus`, `murloc`, `flyingSheep`, `armoredBeetle`, `glassElemental`, `glassShard`, `blackTractBandit`, `blackTractRunner`, and `blackTractGuard`. Older procedural fallback ids still exist for balance/prototyping: `basic`, `fast`, `armored`, `swarm`, and `boss`.

Current implemented wave count is 15. Waves 13-15 follow `lor.md`: armored beetles, glass elementals/shards, and Black Tract bandits.

Current dog enemy sprite references:

- `src/assets/enemies/dog-idle.png`
- `src/assets/enemies/dog-run.png`
- `src/assets/enemies/dog-run-down.png`
- `src/assets/enemies/dog-run-up.png`

Use these as the strongest local reference when creating future mob sprites.

## Mob Sprite Requirements

When asked to create sprites for a path-following mob, do not create only a horizontal run animation. The path has horizontal and vertical segments, so a complete first-pass mob should include:

- `idle`: idle/breathing loop.
- `run`: side-view run loop facing right. The renderer mirrors this for left movement.
- `runDown`: vertical run loop moving down the screen, toward the camera/player.
- `runUp`: vertical run loop moving up the screen, away from the camera/player.

Use horizontal one-row sprite sheets. Keep every frame in equal-sized cells, centered, full body visible, with consistent scale and baseline.

Avoid text, labels, UI, cast shadows, contact shadows, reflections, extra characters, or background detail inside sprite sheets.

## Biped Animation Requirements

For any two-legged or humanoid path-following mob, the side-view `run` sheet must clearly show leg alternation. Do not accept six frames where only the torso bobs or the legs stay in nearly the same silhouette.

At minimum, a 6-frame side-run loop for a biped should alternate readable leg poses:

- Frames `1`, `3`, and `5`: one support/front leg is nearly vertical under the body, with the other leg trailing or tucked back.
- Frames `2`, `4`, and `6`: the next step has the front leg extended much more horizontally forward, with the foot clearly out in front.

The difference between these two poses must remain visible at in-game draw size, not only when zoomed in. Keep the upper body, weapon, shield, head, and overall silhouette stable enough that the motion reads as running rather than shape-shifting.

When prompting image generation for biped enemies, explicitly describe this vertical-leg / horizontal-forward-leg alternation. After generation, inspect the side-run sheet specifically for leg motion before accepting it. If the generated run cycle is too subtle, regenerate the `run` sheet or edit only that sheet before wiring it into the game.

## Image Generation Workflow

Use the `imagegen` skill / built-in `image_gen` tool for raster sprites. Treat sprite work as project-bound: final assets must be copied into the workspace under `src/assets/enemies/`.

Prompt generation with:

- `scetch.png` as the game style reference.
- Existing related sheets, especially dog sheets, as character/style references when applicable.
- A perfectly flat solid `#00ff00` chroma-key background.
- Explicit instructions that the background has no shadows, gradients, texture, floor plane, lighting variation, or contact shadow.
- Explicit instruction not to use `#00ff00` anywhere in the subject.

Generated images are saved under `$env:CODEX_HOME\generated_images\...` or `$env:USERPROFILE\.codex\generated_images\...` by default. Copy/process the selected output into the project, but leave the generated original in place unless the user explicitly asks to delete it.

For transparency, use the installed chroma-key helper:

```powershell
& '<bundled-python.exe>' "$env:USERPROFILE\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" `
  --input <source.png> `
  --out src\assets\enemies\<mob-animation>.png `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill
```

If `python` is not on PATH, call `load_workspace_dependencies` and use the bundled Python executable.

After chroma-key removal, inspect with `view_image` and validate:

- PNG mode is `RGBA`.
- Corners/background are transparent.
- No visible green fringe remains.
- Frames are aligned and readable at in-game size.

Normalize generated sheets before wiring them into the game. Crop each frame to its alpha bounding box, then composite it into a compact equal-cell sheet with a stable baseline. Keep only final transparent PNGs in `src/assets/enemies/`; do not keep source/chroma-key intermediates in the repo unless the user asks.

## Asset Naming

Use kebab-case filenames:

- `src/assets/enemies/<mob>-idle.png`
- `src/assets/enemies/<mob>-run.png`
- `src/assets/enemies/<mob>-run-down.png`
- `src/assets/enemies/<mob>-run-up.png`

For the current dog, the configured sheet geometry is:

- `dog-idle.png`: `1200x220`, `4` frames, `300x220` cells.
- `dog-run.png`: `2160x240`, `6` frames, `360x240` cells.
- `dog-run-down.png`: `1800x260`, `6` frames, `300x260` cells.
- `dog-run-up.png`: `1800x260`, `6` frames, `300x260` cells.

## Code Integration

Add animation metadata in `src/config/enemies.js` under the enemy type:

```js
animations: {
  idle: {
    imageSrc: new URL("../assets/enemies/<mob>-idle.png", import.meta.url).href,
    frames: 4,
    frameWidth: 300,
    frameHeight: 220,
    fps: 5,
    drawWidth: 48,
    drawHeight: 35,
    anchorY: 0.82,
  },
  run: {
    imageSrc: new URL("../assets/enemies/<mob>-run.png", import.meta.url).href,
    frames: 6,
    frameWidth: 360,
    frameHeight: 240,
    fps: 10,
    drawWidth: 58,
    drawHeight: 39,
    anchorY: 0.8,
  },
  runDown: {
    imageSrc: new URL("../assets/enemies/<mob>-run-down.png", import.meta.url).href,
    frames: 6,
    frameWidth: 300,
    frameHeight: 260,
    fps: 10,
    drawWidth: 42,
    drawHeight: 46,
    anchorY: 0.82,
    flipX: false,
  },
  runUp: {
    imageSrc: new URL("../assets/enemies/<mob>-run-up.png", import.meta.url).href,
    frames: 6,
    frameWidth: 300,
    frameHeight: 260,
    fps: 10,
    drawWidth: 42,
    drawHeight: 46,
    anchorY: 0.82,
    flipX: false,
  },
}
```

Adjust `drawWidth`, `drawHeight`, and `anchorY` per mob after visual testing. Keep vertical animations with `flipX: false`; only side-view `run` should mirror left/right.

The current code already supports:

- `Game.init()` preloading all enemy animation sheets through `renderer.loadEnemySprites(ENEMY_TYPES)`.
- `Enemy.getMovementAnimationState(dx, dy)` choosing `run`, `runDown`, or `runUp` based on movement direction.
- `Renderer.drawEnemySprite()` drawing sheet frames and respecting `animation.flipX === false`.
- Fallback procedural enemy shapes if a sprite fails to load.

## Verification

After adding or changing mob sprites, run syntax checks:

```powershell
& '<bundled-node.exe>' --check src\config\enemies.js
& '<bundled-node.exe>' --check src\game\Enemy.js
& '<bundled-node.exe>' --check src\game\Renderer.js
```

If the user has a local server running, prefer their URL, usually `http://localhost:3000/`.

Verify in browser/headless browser that:

- All new PNG URLs return `200`.
- `window.__game.renderer.images` contains every sheet with non-zero `naturalWidth`/`naturalHeight`.
- The target wave spawns the intended enemy type.
- The enemy animation states include `run`, `runDown`, and `runUp` while moving along the path.
- `idle` is used when paused or stationary.
- Browser console has no errors.

Do not change staging unless the user asks. This repo may already have staged changes from earlier sprite work.
