# Forest Gate Defense

Pure JavaScript HTML5 Canvas tower defense MVP for browser play and Yandex Games integration.

## Run Locally

Use any static local server from this folder:

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

The project includes a local `sdk.js` mock so `/sdk.js`, saves, rewarded ads, interstitials, and leaderboard calls do not crash outside Yandex Games.

## Project Structure

- `index.html` connects `/sdk.js`, styles, and the ES module entry point.
- `styles.css` owns the full-screen canvas shell.
- `src/main.js` boots the game.
- `src/game/` contains the loop, renderer, map, input, camera, waves, entities, UI, and effects.
- `src/config/towers.js` contains tower balance.
- `src/config/enemies.js` contains enemy balance.
- `src/config/waves.js` contains wave pacing.
- `src/config/map.js` contains tile size, path, build pads, spawn, and base.
- `src/platform/` wraps Yandex SDK, saves, and leaderboard behavior.

## Yandex Games Upload

Upload the folder as a static web game. The game expects the Yandex SDK at:

```html
<script src="/sdk.js"></script>
```

On the Yandex platform this should resolve to the real SDK. Locally it resolves to the included mock. If your upload pipeline warns about `sdk.js`, keep the script tag in `index.html` and follow the current Yandex Games packaging guidance for SDK resolution.

## Leaderboard

The leaderboard name is exported from `src/platform/Leaderboard.js`:

```js
export const LEADERBOARD_NAME = "main";
```

Create a leaderboard with the same name in the Yandex Games console. Change the constant if your console uses a different leaderboard id.

## Controls

- Select a tower in the bottom panel.
- Click or tap a highlighted build tile to place it.
- Select a built tower to upgrade or sell it.
- Press `Start Wave` to spawn the next wave.
- Use `Pause` to pause and resume.
- Add `?debug` to the URL to show FPS, active enemies, projectiles, and draw calls.

## Notes

The art is procedural placeholder geometry drawn on Canvas. It is intentionally inspired by classic forest tower defense layouts without copying third-party assets, names, UI, characters, music, or exact maps.
