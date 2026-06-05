import { formatDamageRange, getAttackTypeLabel } from "../config/combat.js";
import { TOWER_TYPES, TOWERS_BY_ID } from "../config/towers.js";
import { clamp, formatCompact, rectContains } from "../utils/math.js";

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawInsetStroke(ctx, rect, inset, color, width = 1) {
  roundRect(ctx, rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2, Math.max(2, 7 - inset * 0.35));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawRivets(ctx, rect, color = "#c19a57") {
  const points = [
    [rect.x + 9, rect.y + 9],
    [rect.x + rect.w - 9, rect.y + 9],
    [rect.x + 9, rect.y + rect.h - 9],
    [rect.x + rect.w - 9, rect.y + rect.h - 9],
  ];
  for (const [x, y] of points) {
    const shine = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 5);
    shine.addColorStop(0, "#ffe0a1");
    shine.addColorStop(0.55, color);
    shine.addColorStop(1, "#51351f");
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(31, 20, 13, 0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawPanelTexture(ctx, rect, seed = 0, alpha = 0.24) {
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
  ctx.clip();
  for (let i = 0; i < 18; i += 1) {
    const y = rect.y + 8 + ((i * 29 + seed * 11) % Math.max(1, rect.h - 12));
    const x = rect.x + 6 + ((i * 43 + seed * 7) % Math.max(1, rect.w - 16));
    ctx.strokeStyle = i % 2 ? `rgba(255, 230, 171, ${alpha * 0.42})` : `rgba(39, 24, 15, ${alpha})`;
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x - 36, y);
    ctx.bezierCurveTo(x - 8, y - 4, x + 24, y + 5, x + 58, y - 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFittedText(ctx, text, x, y, maxWidth, size, color = "#f7edd5", align = "left", weight = "700") {
  let fontSize = size;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  do {
    ctx.font = `${weight} ${fontSize}px Trebuchet MS, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || fontSize <= 10) break;
    fontSize -= 1;
  } while (fontSize > 10);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function getTowerDamageText(tower) {
  const fallbackDamage = Number.isFinite(tower.damage) ? tower.damage : 0;
  const minDamage = Number.isFinite(tower.minDamage) ? tower.minDamage : fallbackDamage;
  const maxDamage = Number.isFinite(tower.maxDamage) ? tower.maxDamage : minDamage;
  return formatDamageRange(minDamage, maxDamage);
}

function getTowerSpecialText(tower) {
  const special = tower.special || {};
  const attackType = getAttackTypeLabel(tower.damageType);
  if (special.slowPercent) return `${attackType} Slow ${Math.round(special.slowPercent * 100)}%`;
  if (special.splashRadius) return `${attackType} Splash ${Math.round(special.splashRadius)}`;
  if (special.chainTargets) return `${attackType} Chain ${special.chainTargets}`;
  return attackType;
}

function getTowerBuildText(tower) {
  if (tower?.isBuilding) return `Building ${Math.round((tower.buildProgress || 0) * 100)}%`;
  const buildTime = Number.isFinite(tower?.buildTime) ? tower.buildTime : 0;
  return buildTime > 0 ? `Build ${buildTime.toFixed(1)}s` : "Instant build";
}

function getTowerStatsText(tower) {
  return `Dmg ${getTowerDamageText(tower)}  Rng ${Math.round(tower.range)}  Rate ${tower.fireRate.toFixed(1)}  ${getTowerSpecialText(tower)}  ${getTowerBuildText(tower)}`;
}

function getTowerStatLines(tower) {
  return [
    `Damage ${getTowerDamageText(tower)}`,
    `Range ${Math.round(tower.range)}`,
    `Rate ${tower.fireRate.toFixed(1)}/s`,
    getTowerSpecialText(tower),
    getTowerBuildText(tower),
  ];
}

function getStartWaveLabel(game) {
  if (game.waveManager.running) return "Wave Active";
  if (game.state === "waveComplete" && game.nextWaveCountdown != null && game.waveManager.hasMoreWaves()) {
    return `Start Wave ${Math.ceil(game.nextWaveCountdown)}s`;
  }
  return "Start Wave";
}

export class UI {
  constructor() {
    this.buttons = [];
    this.blockingRects = [];
    this.pointer = { x: -1000, y: -1000 };
    this.lastWidth = 1;
    this.lastHeight = 1;
  }

  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  addButton(action, rect, label, options = {}) {
    const button = {
      action,
      rect,
      label,
      meta: options.meta || null,
      enabled: options.enabled !== false,
      kind: options.kind || "default",
    };
    this.buttons.push(button);
    return button;
  }

  hitTest(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
      const button = this.buttons[i];
      if (button.enabled && rectContains(button.rect, x, y)) return button;
    }
    return null;
  }

  blocksPointer(x, y) {
    for (let i = this.blockingRects.length - 1; i >= 0; i -= 1) {
      if (rectContains(this.blockingRects[i], x, y)) return true;
    }
    return false;
  }

  addBlockingRect(rect) {
    this.blockingRects.push(rect);
  }

  draw(ctx, game) {
    this.buttons.length = 0;
    this.blockingRects.length = 0;
    this.lastWidth = game.camera.width;
    this.lastHeight = game.camera.height;

    if (game.isRunState()) {
      this.drawGamePanel(ctx, game);
    }

    if (game.state === "menu") this.drawMenu(ctx, game);
    if (game.state === "paused") this.drawCenteredOverlay(ctx, "Paused", "Resume", "pause");
    if (game.state === "waveComplete") this.drawWaveComplete(ctx, game);
    if (game.state === "gameOver") this.drawEndScreen(ctx, game, "Game Over");
    if (game.state === "victory") this.drawEndScreen(ctx, game, "Victory");
    if (game.state === "leaderboard") this.drawLeaderboard(ctx, game);
  }

  drawButton(ctx, button) {
    const { rect, label, enabled, kind } = button;
    const hover = enabled && rectContains(rect, this.pointer.x, this.pointer.y);
    const palette =
      kind === "primary"
        ? ["#15577d", "#237da8", "#f1fbff", "#0b3147"]
        : kind === "danger"
          ? ["#6d2f25", "#a94838", "#ffe2d4", "#311814"]
          : kind === "gold"
            ? ["#7a5520", "#b47a28", "#fff0b8", "#3d2a13"]
            : ["#3a2c20", "#5d4630", "#f7edd5", "#1c1510"];

    ctx.save();
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
    ctx.fillStyle = "#1b130d";
    ctx.fill();

    const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fill.addColorStop(0, enabled ? (hover ? palette[1] : palette[0]) : "#38342d");
    fill.addColorStop(0.52, enabled ? palette[0] : "#292722");
    fill.addColorStop(1, enabled ? palette[3] : "#1d1b18");
    roundRect(ctx, rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, 5);
    ctx.fillStyle = fill;
    ctx.fill();

    drawPanelTexture(ctx, { x: rect.x + 4, y: rect.y + 4, w: rect.w - 8, h: rect.h - 8 }, rect.x + rect.y, kind === "primary" ? 0.12 : 0.18);

    ctx.strokeStyle = enabled ? "rgba(255, 225, 147, 0.7)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(26, 16, 10, 0.78)";
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 4);
    ctx.stroke();

    if (kind === "primary" && rect.h >= 42) {
      ctx.fillStyle = "rgba(152, 222, 255, 0.24)";
      roundRect(ctx, rect.x + 11, rect.y + 9, rect.w - 22, Math.max(4, rect.h * 0.18), 4);
      ctx.fill();
    }

    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 2;
    drawFittedText(ctx, label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.5, rect.w - 14, rect.h > 58 ? 22 : 15, enabled ? palette[2] : "#8f8878", "center");
    ctx.restore();
  }

  drawGamePanel(ctx, game) {
    const panel = game.camera.uiRect;
    const portrait = game.camera.height > game.camera.width;
    ctx.save();
    this.drawPlayGutters(ctx, game.camera);

    if (portrait) {
      this.addBlockingRect(panel);
      this.addBlockingRect(game.camera.statsRect);
      this.drawUiBackdrop(ctx, game.camera.statsRect, "top");
      this.drawPortraitStatsBar(ctx, game, game.camera.statsRect);
      this.drawUiBackdrop(ctx, panel, "bottom");
      this.drawSidePanelSurface(ctx, panel);
      this.drawPortraitPanel(ctx, game, panel);
    } else {
      this.drawLandscapePanel(ctx, game);
    }
    ctx.restore();
  }

  drawPlayGutters(ctx, camera) {
    const mapRect = {
      x: camera.x,
      y: camera.y,
      w: camera.worldWidth * camera.scale,
      h: camera.worldHeight * camera.scale,
    };
    const play = camera.playRect;
    this.drawUiBackdrop(ctx, { x: play.x, y: play.y, w: Math.max(0, mapRect.x - play.x), h: play.h }, "left");
    this.drawUiBackdrop(ctx, { x: mapRect.x + mapRect.w, y: play.y, w: Math.max(0, play.x + play.w - (mapRect.x + mapRect.w)), h: play.h }, "right");
    this.drawUiBackdrop(ctx, { x: play.x, y: play.y, w: play.w, h: Math.max(0, mapRect.y - play.y) }, "top");
    this.drawUiBackdrop(ctx, { x: play.x, y: mapRect.y + mapRect.h, w: play.w, h: Math.max(0, play.y + play.h - (mapRect.y + mapRect.h)) }, "bottom");
  }

  drawLandscapePanel(ctx, game) {
    const inset = 8;
    this.addBlockingRect(game.camera.leftUiRect);
    this.addBlockingRect(game.camera.rightUiRect);
    this.drawUiBackdrop(ctx, game.camera.leftUiRect, "left");
    this.drawUiBackdrop(ctx, game.camera.rightUiRect, "right");
    const contentW = Math.max(0, Math.min(220, game.camera.leftUiRect.w - inset * 2, game.camera.rightUiRect.w - inset * 2));
    const left = {
      x: game.camera.leftUiRect.x + game.camera.leftUiRect.w - contentW - inset,
      y: game.camera.leftUiRect.y + inset,
      w: contentW,
      h: Math.max(0, game.camera.leftUiRect.h - inset * 2),
    };
    const right = {
      x: game.camera.rightUiRect.x + inset,
      y: game.camera.rightUiRect.y + inset,
      w: contentW,
      h: Math.max(0, game.camera.rightUiRect.h - inset * 2),
    };
    if (left.w < 76 || right.w < 76) return;

    const pad = 10;

    this.drawSidePanelSurface(ctx, left);
    this.drawSidePanelSurface(ctx, right);

    const statGap = 6;
    const statH = 30;
    const statW = (left.w - pad * 2 - statGap) * 0.5;
    const statY = left.y + pad;
    this.drawMiniStat(ctx, left.x + pad, statY, statW, statH, "Gold", formatCompact(game.gold), "#ffd564");
    this.drawMiniStat(ctx, left.x + pad + statW + statGap, statY, statW, statH, "Lives", `${game.lives}/20`, "#ff7669");
    this.drawMiniStat(ctx, left.x + pad, statY + statH + statGap, statW, statH, "Wave", `${game.completedWave}/${game.totalWaves}`, "#d8d4ca");
    this.drawMiniStat(ctx, left.x + pad + statW + statGap, statY + statH + statGap, statW, statH, "Best", formatCompact(game.bestScore), "#9ee3ff");

    this.drawLandscapeTowerList(ctx, game, left.x + pad, statY + (statH + statGap) * 2 + 28, left.w - pad * 2, left.y + left.h - pad);

    const startRect = { x: right.x + pad, y: right.y + pad, w: right.w - pad * 2, h: 58 };
    this.addButton("startWave", startRect, getStartWaveLabel(game), {
      enabled: !game.waveManager.running && game.state !== "paused" && game.waveManager.hasMoreWaves(),
      kind: "primary",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const pauseRect = { x: right.x + pad, y: startRect.y + startRect.h + 10, w: (right.w - pad * 2 - 8) * 0.5, h: 38 };
    this.addButton("pause", pauseRect, game.state === "paused" ? "Resume" : "Pause", { enabled: game.state !== "menu" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const rewardRect = { x: pauseRect.x + pauseRect.w + 8, y: pauseRect.y, w: pauseRect.w, h: pauseRect.h };
    this.addButton("rewardGold", rewardRect, "+100", { kind: "gold", enabled: game.state !== "paused" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const selectedY = pauseRect.y + pauseRect.h + 12;
    this.drawDesktopSelectedPanel(ctx, game, right.x + pad, selectedY, right.w - pad * 2, right.y + right.h - selectedY - pad);
  }

  drawUiBackdrop(ctx, rect, variant) {
    if (!rect || rect.w <= 0 || rect.h <= 0) return;

    const vertical = variant === "left" || variant === "right";
    const gradient = vertical
      ? ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y)
      : ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, "#11180f");
    gradient.addColorStop(0.45, "#23371d");
    gradient.addColorStop(1, "#0b100a");
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    for (let i = 0; i < 24; i += 1) {
      const seed = i * 37 + rect.w + rect.h;
      const x = rect.x + ((seed * 23) % Math.max(1, rect.w + 40)) - 20;
      const y = rect.y + ((seed * 41) % Math.max(1, rect.h + 40)) - 20;
      const w = 22 + (seed % 31);
      const h = 8 + (seed % 13);
      ctx.fillStyle = i % 2 ? "rgba(91, 126, 63, 0.22)" : "rgba(114, 145, 69, 0.15)";
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, (seed % 7) * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 10; i += 1) {
      const seed = i * 53 + rect.w * 3 + rect.h;
      const x = rect.x + ((seed * 17) % Math.max(1, rect.w));
      const y = rect.y + ((seed * 31) % Math.max(1, rect.h));
      ctx.fillStyle = "rgba(117, 120, 93, 0.2)";
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + (seed % 9), 3 + (seed % 5), 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(244, 221, 160, 0.18)";
    ctx.lineWidth = 2;
    if (variant === "left") {
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w - 1, rect.y);
      ctx.lineTo(rect.x + rect.w - 1, rect.y + rect.h);
      ctx.stroke();
    } else if (variant === "right") {
      ctx.beginPath();
      ctx.moveTo(rect.x + 1, rect.y);
      ctx.lineTo(rect.x + 1, rect.y + rect.h);
      ctx.stroke();
    } else if (variant === "top") {
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + rect.h - 1);
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSidePanelSurface(ctx, rect) {
    this.addBlockingRect(rect);
    ctx.save();
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
    ctx.fillStyle = "#17120e";
    ctx.fill();

    const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fill.addColorStop(0, "rgba(82, 70, 55, 0.96)");
    fill.addColorStop(0.08, "rgba(43, 34, 25, 0.96)");
    fill.addColorStop(0.52, "rgba(35, 30, 24, 0.97)");
    fill.addColorStop(1, "rgba(24, 19, 15, 0.98)");
    roundRect(ctx, rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, 5);
    ctx.fillStyle = fill;
    ctx.fill();
    drawPanelTexture(ctx, { x: rect.x + 7, y: rect.y + 7, w: rect.w - 14, h: rect.h - 14 }, rect.x + rect.h, 0.28);

    ctx.strokeStyle = "rgba(255, 226, 154, 0.42)";
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 7);
    ctx.stroke();
    drawInsetStroke(ctx, rect, 7, "rgba(20, 13, 9, 0.72)", 2);
    drawInsetStroke(ctx, rect, 11, "rgba(255, 237, 181, 0.12)", 1);
    drawRivets(ctx, rect);
    ctx.restore();
  }

  drawLandscapeTowerList(ctx, game, x, y, w, bottomY) {
    drawFittedText(ctx, "Towers", x, y - 12, w, 13, "#cdbb91", "left", "600");
    const gap = 6;
    const availableH = Math.max(1, bottomY - y);
    const rowH = clamp((availableH - gap * (TOWER_TYPES.length - 1)) / TOWER_TYPES.length, 34, 50);

    for (let i = 0; i < TOWER_TYPES.length; i += 1) {
      const tower = TOWER_TYPES[i];
      const rect = { x, y: y + i * (rowH + gap), w, h: rowH };
      const enabled = game.unlockedTowers.includes(tower.id) && game.gold >= tower.cost;
      const name = tower.name.replace(" Tower", "").replace(" Post", "");
      this.addButton("selectTowerType", rect, `${name} ${tower.cost}`, {
        meta: { typeId: tower.id },
        enabled,
        kind: game.selectedTowerType === tower.id ? "gold" : "default",
      });
      const button = this.buttons[this.buttons.length - 1];
      this.drawButton(ctx, button);
      this.drawTowerIcon(ctx, game, tower, rect.x + 19, rect.y + rect.h * 0.5, 11, 12);
      if (!enabled) {
        drawFittedText(ctx, "low", rect.x + rect.w - 9, rect.y + rect.h * 0.5, 34, 10, "#b9ab8e", "right", "600");
      }
    }
  }

  getTowerIconImage(game, tower) {
    const config = tower?.config || tower;
    const source = config?.sprite?.imageSrc;
    const image = source ? game.renderer.images.get(source)?.image : null;
    return image && image.complete && image.naturalWidth > 0 ? image : null;
  }

  drawTowerIcon(ctx, game, tower, x, y, radius, size = 13) {
    const config = tower?.config || tower;
    const image = this.getTowerIconImage(game, config);
    if (image) {
      const sprite = config.sprite || {};
      const sourceWidth = sprite.drawWidth || image.naturalWidth;
      const sourceHeight = sprite.drawHeight || image.naturalHeight;
      const aspect = sourceWidth / Math.max(1, sourceHeight);
      const maxWidth = radius * 2.35;
      const maxHeight = radius * 2.55;
      let drawWidth = maxWidth;
      let drawHeight = drawWidth / aspect;
      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = drawHeight * aspect;
      }

      ctx.save();
      ctx.fillStyle = "rgba(20, 14, 10, 0.82)";
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 238, 190, 0.42)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
      return;
    }

    ctx.fillStyle = config.color || "#c48a42";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawFittedText(ctx, config.icon || "T", x, y + 0.5, radius * 1.4, size, "#1b1711", "center", "800");
  }

  drawDesktopSelectedPanel(ctx, game, x, y, w, h) {
    const rect = { x, y, w, h };
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#201811";
    ctx.fill();
    drawPanelTexture(ctx, rect, x + y, 0.18);
    ctx.strokeStyle = "rgba(255, 238, 190, 0.28)";
    ctx.stroke();

    const tower = game.selectedTower || TOWERS_BY_ID[game.selectedTowerType];
    if (!tower) {
      drawFittedText(ctx, "Select a tower", x + 12, y + 24, w - 24, 15, "#d9c9a5", "left");
      return;
    }

    const title = game.selectedTower ? `${tower.name} Lv.${tower.level + 1}` : tower.name;
    this.drawTowerIcon(ctx, game, tower, x + 28, y + 32, 17, 15);
    drawFittedText(ctx, title, x + 54, y + 24, w - 64, 16, "#f7edd5", "left");
    if (!game.selectedTower && Number.isFinite(tower.cost)) {
      drawFittedText(ctx, `${tower.cost} gold`, x + 54, y + 46, w - 64, 12, "#ffd564", "left", "600");
    }

    const lines = getTowerStatLines(tower);
    const lineTop = y + 78;
    for (let i = 0; i < lines.length; i += 1) {
      drawFittedText(ctx, lines[i], x + 14, lineTop + i * 22, w - 28, 13, i === 0 ? "#ffdca3" : "#cdbb91", "left", "600");
    }

    if (!game.selectedTower) return;

    const upgrade = tower.isBuilding ? null : tower.nextUpgrade();
    const sellW = Math.min(76, w * 0.38);
    const buttonY = y + h - 42;
    const upgradeLabel = tower.isBuilding ? "Building" : upgrade ? `Upgrade ${upgrade.cost}` : "Max";
    this.addButton("upgradeTower", { x: x + 10, y: buttonY, w: w - sellW - 26, h: 30 }, upgradeLabel, {
      enabled: !!upgrade && game.gold >= upgrade.cost,
      kind: "gold",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
    this.addButton("sellTower", { x: x + w - sellW - 10, y: buttonY, w: sellW, h: 30 }, `Sell`, { kind: "danger" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
  }

  drawPortraitPanel(ctx, game, panel) {
    const pad = 8;
    const tight = panel.h < 150;
    const gap = tight ? 4 : 6;
    const selectorH = tight ? 30 : 34;
    const actionH = tight ? 36 : 40;
    const selectorY = panel.y + pad;
    const selectedY = selectorY + selectorH + gap;
    const actionY = panel.y + panel.h - pad - actionH;
    const selectedH = Math.max(38, actionY - selectedY - gap);

    this.drawTowerDropdown(ctx, game, panel.x + pad, selectorY, panel.w - pad * 2, selectorH, tight);
    this.drawCompactSelectedPanel(ctx, game, panel.x + pad, selectedY, panel.w - pad * 2, selectedH);

    const startRect = { x: panel.x + pad, y: actionY, w: panel.w - pad * 2 - 88, h: actionH };
    this.addButton("startWave", startRect, getStartWaveLabel(game), {
      enabled: !game.waveManager.running && game.state !== "paused" && game.waveManager.hasMoreWaves(),
      kind: "primary",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const pauseRect = { x: startRect.x + startRect.w + 8, y: startRect.y, w: 80, h: actionH };
    this.addButton("pause", pauseRect, game.state === "paused" ? "Resume" : "Pause");
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
  }

  drawPortraitStatsBar(ctx, game, rect) {
    const pad = 6;
    const gap = 4;
    const statH = 24;
    const statW = (rect.w - pad * 2 - gap * 3) / 4;
    const y = rect.y + (rect.h - statH) * 0.5;

    const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    fill.addColorStop(0, "#4f4132");
    fill.addColorStop(0.28, "#2a2118");
    fill.addColorStop(1, "#17110d");
    ctx.fillStyle = fill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(255, 226, 154, 0.28)";
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h - 1);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h - 1);
    ctx.stroke();
    this.drawMiniStat(ctx, rect.x + pad, y, statW, statH, "Gold", formatCompact(game.gold), "#ffd564");
    this.drawMiniStat(ctx, rect.x + pad + (statW + gap), y, statW, statH, "Lives", `${game.lives}/20`, "#ff7669");
    this.drawMiniStat(ctx, rect.x + pad + (statW + gap) * 2, y, statW, statH, "Wave", `${game.completedWave}/${game.totalWaves}`, "#d8d4ca");
    this.drawMiniStat(ctx, rect.x + pad + (statW + gap) * 3, y, statW, statH, "Best", formatCompact(game.bestScore), "#9ee3ff");
  }

  drawStat(ctx, x, y, w, label, value, color) {
    const h = 36;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#171511";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.18)";
    ctx.stroke();
    drawFittedText(ctx, label, x + 10, y + h * 0.5, w * 0.42, 12, "#b9ab8e", "left", "600");
    drawFittedText(ctx, value, x + w - 10, y + h * 0.5, w * 0.55, 20, color, "right");
  }

  drawMiniStat(ctx, x, y, w, h, label, value, color) {
    roundRect(ctx, x, y, w, h, 5);
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, "#31261b");
    fill.addColorStop(1, "#15100c");
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 218, 138, 0.28)";
    ctx.stroke();
    ctx.strokeStyle = "rgba(24, 15, 9, 0.72)";
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    drawFittedText(ctx, label, x + 7, y + h * 0.5, w * 0.38, h <= 24 ? 9 : 11, "#b9ab8e", "left", "600");
    drawFittedText(ctx, value, x + w - 7, y + h * 0.5, w * 0.58, h <= 24 ? 14 : 17, color, "right");
  }

  drawTowerDropdown(ctx, game, x, y, w, h, tight) {
    const selected = TOWERS_BY_ID[game.selectedTowerType] || game.selectedTower?.config || null;
    const label = game.selectedTower ? `Selected: ${game.selectedTower.name}` : selected ? `Tower: ${selected.name}  ${selected.cost} v` : "Choose Tower";
    this.addButton("toggleTowerDropdown", { x, y, w, h }, label, { kind: game.towerDropdownOpen ? "gold" : "default" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    if (selected) {
      this.drawTowerIcon(ctx, game, selected, x + 18, y + h * 0.5, tight ? 8 : 10, tight ? 10 : 12);
    }

    if (!game.towerDropdownOpen) return;

    const rowH = tight ? 32 : 36;
    const gap = 4;
    const listH = TOWER_TYPES.length * rowH + (TOWER_TYPES.length - 1) * gap;
    const listY = Math.max(8, y - listH - 6);
    roundRect(ctx, x, listY - 6, w, listH + 12, 7);
    ctx.fillStyle = "rgba(38, 29, 20, 0.98)";
    ctx.fill();
    drawPanelTexture(ctx, { x, y: listY - 6, w, h: listH + 12 }, listH, 0.16);
    ctx.strokeStyle = "rgba(255, 238, 190, 0.38)";
    ctx.stroke();

    for (let i = 0; i < TOWER_TYPES.length; i += 1) {
      const tower = TOWER_TYPES[i];
      const rowY = listY + i * (rowH + gap);
      const canAfford = game.gold >= tower.cost;
      const isSelected = game.selectedTowerType === tower.id;
      this.addButton("selectTowerType", { x: x + 6, y: rowY, w: w - 12, h: rowH }, `${tower.name}  ${tower.cost}`, {
        meta: { typeId: tower.id },
        enabled: game.unlockedTowers.includes(tower.id) && canAfford,
        kind: isSelected ? "gold" : "default",
      });
      const button = this.buttons[this.buttons.length - 1];
      this.drawButton(ctx, button);
      this.drawTowerIcon(ctx, game, tower, button.rect.x + 17, button.rect.y + rowH * 0.5, tight ? 7 : 8, tight ? 9 : 10);
      if (!canAfford) {
        drawFittedText(ctx, "low gold", button.rect.x + button.rect.w - 10, button.rect.y + rowH * 0.5, 64, 10, "#b9ab8e", "right", "600");
      }
    }
  }

  drawCompactSelectedPanel(ctx, game, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#211811";
    ctx.fill();
    drawPanelTexture(ctx, { x, y, w, h }, x + h, 0.14);
    ctx.strokeStyle = "rgba(255, 238, 190, 0.28)";
    ctx.stroke();

    const tower = game.selectedTower || TOWERS_BY_ID[game.selectedTowerType];
    if (!tower) {
      drawFittedText(ctx, "Select a tower", x + 10, y + h * 0.5, w - 20, 14, "#d9c9a5", "left");
      return;
    }

    const name = game.selectedTower ? `${tower.name} Lv.${tower.level + 1}` : tower.name;
    const stats = game.selectedTower?.isBuilding ? getTowerBuildText(tower) : getTowerStatsText(tower);

    if (!game.selectedTower || h < 54) {
      drawFittedText(ctx, name, x + 10, y + h * 0.35, w - 20, 15, "#f7edd5", "left");
      drawFittedText(ctx, stats, x + 10, y + h * 0.72, w - 20, 12, "#cdbb91", "left", "600");
      return;
    }

    const actionW = Math.min(150, w * 0.42);
    drawFittedText(ctx, name, x + 10, y + 17, w - actionW - 18, 14, "#f7edd5", "left");
    drawFittedText(ctx, stats, x + 10, y + 40, w - actionW - 18, 11, "#cdbb91", "left", "600");

    const upgrade = tower.isBuilding ? null : tower.nextUpgrade();
    const buttonH = Math.min(30, h - 14);
    const buttonY = y + (h - buttonH) * 0.5;
    const sellW = Math.min(62, actionW * 0.42);
    const upgradeLabel = tower.isBuilding ? "Build" : upgrade ? `${upgrade.cost}` : "Max";
    this.addButton("upgradeTower", { x: x + w - actionW - 6, y: buttonY, w: actionW - sellW - 8, h: buttonH }, upgradeLabel, {
      enabled: !!upgrade && game.gold >= upgrade.cost,
      kind: "gold",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
    this.addButton("sellTower", { x: x + w - sellW - 6, y: buttonY, w: sellW, h: buttonH }, "Sell", { kind: "danger" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
  }

  drawTowerStrip(ctx, game, x, y, w, h, compact) {
    drawFittedText(ctx, "Towers", x, y - 12, 140, 14, "#cdbb91", "left");
    const gap = compact ? 6 : 8;
    const buttonW = Math.floor((w - gap * (TOWER_TYPES.length - 1)) / TOWER_TYPES.length);
    const buttonH = h;
    for (let i = 0; i < TOWER_TYPES.length; i += 1) {
      const tower = TOWER_TYPES[i];
      const rect = { x: x + i * (buttonW + gap), y, w: buttonW, h: buttonH };
      const enabled = game.unlockedTowers.includes(tower.id) && game.gold >= tower.cost;
      this.addButton("selectTowerType", rect, compact ? tower.icon : tower.name.replace(" Tower", ""), {
        meta: { typeId: tower.id },
        enabled,
        kind: game.selectedTowerType === tower.id ? "gold" : "default",
      });
      const button = this.buttons[this.buttons.length - 1];
      this.drawButton(ctx, button);
      this.drawTowerIcon(ctx, game, tower, rect.x + rect.w * 0.5, rect.y + 21, compact ? 10 : 13, compact ? 11 : 13);
      drawFittedText(ctx, `${tower.cost}`, rect.x + rect.w * 0.5, rect.y + rect.h - 13, rect.w - 8, 12, enabled ? "#ffd564" : "#9a8c75", "center", "600");
    }
  }

  drawSelectedPanel(ctx, game, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#211811";
    ctx.fill();
    drawPanelTexture(ctx, { x, y, w, h }, y, 0.14);
    ctx.strokeStyle = "rgba(255, 238, 190, 0.28)";
    ctx.stroke();

    const tower = game.selectedTower || TOWERS_BY_ID[game.selectedTowerType];
    if (!tower) {
      drawFittedText(ctx, "Select a tower", x + 12, y + 24, w - 24, 15, "#d9c9a5", "left");
      return;
    }

    const name = game.selectedTower ? `${tower.name} Lv.${tower.level + 1}` : tower.name;
    drawFittedText(ctx, name, x + 12, y + 18, w - 24, 16, "#f7edd5", "left");

    const stats = game.selectedTower?.isBuilding ? getTowerBuildText(tower) : getTowerStatsText(tower);
    drawFittedText(ctx, stats, x + 12, y + 44, w - 24, 13, "#cdbb91", "left", "600");

    if (game.selectedTower) {
      const upgrade = tower.isBuilding ? null : tower.nextUpgrade();
      const buttonY = y + h - 38;
      const sellW = Math.min(92, w * 0.33);
      const upgradeLabel = tower.isBuilding ? "Building" : upgrade ? `Upgrade ${upgrade.cost}` : "Max Level";
      this.addButton("upgradeTower", { x: x + 10, y: buttonY, w: w - sellW - 26, h: 28 }, upgradeLabel, {
        enabled: !!upgrade && game.gold >= upgrade.cost,
        kind: "gold",
      });
      this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
      this.addButton("sellTower", { x: x + w - sellW - 10, y: buttonY, w: sellW, h: 28 }, `Sell ${tower.sellValue()}`, { kind: "danger" });
      this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
    }
  }

  drawMenu(ctx, game) {
    this.drawScrim(ctx, 0.58);
    const w = Math.min(520, this.lastWidth - 40);
    const x = (this.lastWidth - w) * 0.5;
    const y = Math.max(48, this.lastHeight * 0.16);
    drawFittedText(ctx, "Forest Gate Defense", this.lastWidth * 0.5, y, w, 42, "#f7edd5", "center");
    drawFittedText(ctx, "Single-player canvas tower defense", this.lastWidth * 0.5, y + 44, w, 17, "#cdbb91", "center", "600");
    this.addAndDraw(ctx, "newGame", x + 70, y + 86, w - 140, 50, "New Game", "primary");
    this.addAndDraw(ctx, "loadGame", x + 70, y + 146, w - 140, 46, `Load Wave ${game.savedData.completedWave || 0}`, "default", {
      enabled: (game.savedData.completedWave || 0) > 0,
    });
    this.addAndDraw(ctx, "leaderboard", x + 70, y + 200, w - 140, 46, "Leaderboard", "default");
  }

  drawCenteredOverlay(ctx, title, buttonLabel, action) {
    this.drawScrim(ctx, 0.45);
    drawFittedText(ctx, title, this.lastWidth * 0.5, this.lastHeight * 0.36, Math.min(460, this.lastWidth - 40), 38, "#f7edd5", "center");
    this.addAndDraw(ctx, action, this.lastWidth * 0.5 - 90, this.lastHeight * 0.45, 180, 48, buttonLabel, "primary");
  }

  drawWaveComplete(ctx, game) {
    this.drawScrim(ctx, 0.22);
    const text = game.waveManager.hasMoreWaves() ? "Wave Complete" : "Last wave cleared";
    drawFittedText(ctx, text, this.lastWidth * 0.5, Math.max(60, game.camera.playRect.h * 0.14), Math.min(460, this.lastWidth - 40), 30, "#f7edd5", "center");
    if (game.nextWaveCountdown != null && game.waveManager.hasMoreWaves()) {
      drawFittedText(ctx, `Next wave in ${Math.ceil(game.nextWaveCountdown)}s`, this.lastWidth * 0.5, Math.max(96, game.camera.playRect.h * 0.14 + 34), Math.min(360, this.lastWidth - 40), 16, "#ffd564", "center", "600");
    }
  }

  drawEndScreen(ctx, game, title) {
    this.drawScrim(ctx, 0.64);
    const centerY = this.lastHeight * 0.28;
    drawFittedText(ctx, title, this.lastWidth * 0.5, centerY, Math.min(520, this.lastWidth - 40), 42, "#f7edd5", "center");
    drawFittedText(ctx, `Score ${formatCompact(game.score)}  Best ${formatCompact(game.bestScore)}`, this.lastWidth * 0.5, centerY + 44, Math.min(520, this.lastWidth - 40), 20, "#ffd564", "center");
    const x = this.lastWidth * 0.5 - 105;
    this.addAndDraw(ctx, "newGame", x, centerY + 82, 210, 48, "New Game", "primary");
    this.addAndDraw(ctx, "leaderboard", x, centerY + 140, 210, 44, "Leaderboard", "default");
    if (game.state === "gameOver" && !game.usedContinue) {
      this.addAndDraw(ctx, "rewardContinue", x, centerY + 192, 210, 42, "Continue +5 Lives", "gold");
    }
  }

  drawLeaderboard(ctx, game) {
    this.drawScrim(ctx, 0.7);
    const w = Math.min(560, this.lastWidth - 32);
    const h = Math.min(520, this.lastHeight - 64);
    const x = (this.lastWidth - w) * 0.5;
    const y = (this.lastHeight - h) * 0.5;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = "#1d1914";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.28)";
    ctx.stroke();
    drawFittedText(ctx, "Leaderboard", x + w * 0.5, y + 34, w - 40, 28, "#f7edd5", "center");

    if (game.leaderboardNeedsAuth) {
      drawFittedText(ctx, "Sign in to submit scores on Yandex Games", x + w * 0.5, y + 76, w - 48, 15, "#cdbb91", "center", "600");
      this.addAndDraw(ctx, "authLeaderboard", x + w * 0.5 - 105, y + 96, 210, 38, "Sign In", "gold");
    }

    const rows = game.leaderboardEntries || [];
    const listY = y + (game.leaderboardNeedsAuth ? 148 : 86);
    if (rows.length === 0) {
      drawFittedText(ctx, "No scores yet", x + w * 0.5, listY + 32, w - 40, 18, "#cdbb91", "center");
    } else {
      for (let i = 0; i < Math.min(rows.length, 8); i += 1) {
        const row = rows[i];
        const ry = listY + i * 34;
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.07)";
        ctx.fillRect(x + 24, ry, w - 48, 28);
        drawFittedText(ctx, `${row.rank || i + 1}. ${row.name}`, x + 36, ry + 14, w * 0.58, 15, "#f7edd5", "left", "600");
        drawFittedText(ctx, formatCompact(row.score), x + w - 36, ry + 14, w * 0.28, 16, "#ffd564", "right");
      }
    }

    this.addAndDraw(ctx, "closeLeaderboard", x + w * 0.5 - 90, y + h - 56, 180, 40, "Close", "primary");
  }

  addAndDraw(ctx, action, x, y, w, h, label, kind, options = {}) {
    this.addButton(action, { x, y, w, h }, label, { ...options, kind });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
  }

  drawScrim(ctx, alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, this.lastWidth, this.lastHeight);
  }
}
