# Balance Notes

This MVP keeps balance data in plain JavaScript config files so iteration does not require touching engine code.

## Towers

Edit `src/config/towers.js`.

- Increase damage: raise `minDamage`/`maxDamage` on the base tower or the `damage` delta inside an upgrade.
- Base towers use `minDamage`/`maxDamage`. Each shot rolls an integer in that range; equal bounds are fixed damage.
- Upgrade `damage` raises both bounds. Use upgrade `minDamage`/`maxDamage` only when the spread should change.
- Change range: edit `range`. One map tile is `48` world pixels.
- Change attack speed: edit `fireRate`, measured as attacks per second.
- Change projectile speed: edit `projectileSpeed`. Instant and chain towers ignore this value.
- Tune splash or slow: edit the `special` fields such as `splashRadius`, `slowPercent`, and `slowDuration`.
- Add a new tower: copy an existing tower object, give it a unique `id`, add a visual `color` and `shape`, then make sure `unlockedTowers` in storage includes that id for existing saves.
- Damage types are configured in `src/config/combat.js`: `piercing`, `magic`, `siege`, and `chaos`.

## Waves

Edit `src/config/waves.js`.

- Add a new wave by appending `{ wave, groups, rewardOnComplete }`.
- `spawnInterval` is seconds between enemies.
- `delayBeforeNextGroup` is the pause before the next group in the same wave.
- Keep `rewardOnComplete` high enough to fund at least one meaningful upgrade every few waves.

## Enemies

Edit `src/config/enemies.js`.

- `hp`, `speed`, `armor`, `rewardGold`, and `damageToBase` are the main knobs.
- `armorType` uses the combat table in `src/config/combat.js`: `unarmored`, `light`, `heavy`, and `magical`.
- `armor` is still flat damage reduction after the attack-vs-armor multiplier.
- `boss` enemies get a larger radius and light regeneration through their `regen` trait.

## Map

Edit `src/config/map.js`.

- `pathWaypoints` defines the enemy route in tile coordinates.
- `buildableTiles` are generated from rectangles near the top of the file.
- `blockedTiles` are generated from the route and base area.
- Keep waypoints axis-aligned unless `makePathTiles()` is extended to support diagonal blocking.
