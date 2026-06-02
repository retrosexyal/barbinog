import { formatDamageRange, getAttackTypeLabel } from "../config/combat.js";
import { TOWER_TYPES, TOWERS_BY_ID } from "../config/towers.js";
import { formatCompact, rectContains } from "../utils/math.js";

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

export class UI {
  constructor() {
    this.buttons = [];
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

  draw(ctx, game) {
    this.buttons.length = 0;
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
        ? ["#24618a", "#3b8fc0", "#dff4ff"]
        : kind === "danger"
          ? ["#66322b", "#a85043", "#ffe2d4"]
          : kind === "gold"
            ? ["#715322", "#b8842f", "#fff0b8"]
            : ["#332d25", "#5c5142", "#f7edd5"];

    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fillStyle = enabled ? (hover ? palette[1] : palette[0]) : "#2b2926";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = enabled ? "rgba(255, 238, 190, 0.55)" : "rgba(255,255,255,0.12)";
    ctx.stroke();
    drawFittedText(ctx, label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.5, rect.w - 14, rect.h > 58 ? 22 : 15, enabled ? palette[2] : "#8f8878", "center");
  }

  drawGamePanel(ctx, game) {
    const panel = game.camera.uiRect;
    const portrait = panel.w < 760;
    ctx.save();
    ctx.fillStyle = "#1f1b17";
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = "#2b251d";
    ctx.fillRect(panel.x, panel.y, panel.w, 5);
    ctx.strokeStyle = "rgba(255, 231, 180, 0.22)";
    ctx.strokeRect(panel.x + 7, panel.y + 7, panel.w - 14, panel.h - 14);

    if (portrait) {
      this.drawPortraitPanel(ctx, game, panel);
    } else {
      this.drawLandscapePanel(ctx, game, panel);
    }
    ctx.restore();
  }

  drawLandscapePanel(ctx, game, panel) {
    const pad = 18;
    const statY = panel.y + 28;
    this.drawStat(ctx, panel.x + pad, statY, 142, "Gold", formatCompact(game.gold), "#ffd564");
    this.drawStat(ctx, panel.x + pad + 154, statY, 128, "Lives", `${game.lives}/20`, "#ff7669");
    this.drawStat(ctx, panel.x + pad + 294, statY, 138, "Wave", `${game.completedWave}/${game.totalWaves}`, "#d8d4ca");
    this.drawStat(ctx, panel.x + pad + 444, statY, 138, "Best", formatCompact(game.bestScore), "#9ee3ff");

    const startRect = { x: panel.x + panel.w - 184, y: panel.y + 24, w: 154, h: 72 };
    this.addButton("startWave", startRect, game.waveManager.running ? "Wave Active" : "Start Wave", {
      enabled: !game.waveManager.running && game.state !== "paused" && game.waveManager.hasMoreWaves(),
      kind: "primary",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const pauseRect = { x: panel.x + panel.w - 184, y: panel.y + 106, w: 74, h: 40 };
    this.addButton("pause", pauseRect, game.state === "paused" ? "Resume" : "Pause", { enabled: game.state !== "menu" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const rewardRect = { x: panel.x + panel.w - 102, y: panel.y + 106, w: 72, h: 40 };
    this.addButton("rewardGold", rewardRect, "+100", { kind: "gold", enabled: game.state !== "paused" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    this.drawTowerStrip(ctx, game, panel.x + pad, panel.y + 82, Math.min(440, panel.w * 0.42), 88, false);
    this.drawSelectedPanel(ctx, game, panel.x + pad + 462, panel.y + 76, Math.max(230, panel.w - 690), 104);
  }

  drawPortraitPanel(ctx, game, panel) {
    const pad = 12;
    const tight = panel.h < 230;
    const gap = tight ? 4 : 6;
    const statH = tight ? 22 : 26;
    const selectorH = tight ? 34 : 38;
    const actionH = tight ? 40 : 44;
    const statW = (panel.w - pad * 2 - gap) / 2;
    const row1 = panel.y + pad;
    const row2 = row1 + statH + gap;
    const selectorY = row2 + statH + gap;
    const selectedY = selectorY + selectorH + gap;
    const actionY = panel.y + panel.h - pad - actionH;
    const selectedH = Math.max(38, actionY - selectedY - gap);

    this.drawMiniStat(ctx, panel.x + pad, row1, statW, statH, "Gold", formatCompact(game.gold), "#ffd564");
    this.drawMiniStat(ctx, panel.x + pad + statW + gap, row1, statW, statH, "Lives", `${game.lives}/20`, "#ff7669");
    this.drawMiniStat(ctx, panel.x + pad, row2, statW, statH, "Wave", `${game.completedWave}/${game.totalWaves}`, "#d8d4ca");
    this.drawMiniStat(ctx, panel.x + pad + statW + gap, row2, statW, statH, "Best", formatCompact(game.bestScore), "#9ee3ff");

    this.drawTowerDropdown(ctx, game, panel.x + pad, selectorY, panel.w - pad * 2, selectorH, tight);
    this.drawCompactSelectedPanel(ctx, game, panel.x + pad, selectedY, panel.w - pad * 2, selectedH);

    const startRect = { x: panel.x + pad, y: actionY, w: panel.w - pad * 2 - 88, h: actionH };
    this.addButton("startWave", startRect, game.waveManager.running ? "Wave Active" : "Start Wave", {
      enabled: !game.waveManager.running && game.state !== "paused" && game.waveManager.hasMoreWaves(),
      kind: "primary",
    });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    const pauseRect = { x: startRect.x + startRect.w + 8, y: startRect.y, w: 80, h: actionH };
    this.addButton("pause", pauseRect, game.state === "paused" ? "Resume" : "Pause");
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);
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
    ctx.fillStyle = "#171511";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.18)";
    ctx.stroke();
    drawFittedText(ctx, label, x + 8, y + h * 0.5, w * 0.4, h <= 22 ? 10 : 11, "#b9ab8e", "left", "600");
    drawFittedText(ctx, value, x + w - 8, y + h * 0.5, w * 0.56, h <= 22 ? 15 : 17, color, "right");
  }

  drawTowerDropdown(ctx, game, x, y, w, h, tight) {
    const selected = TOWERS_BY_ID[game.selectedTowerType] || game.selectedTower?.config || null;
    const label = game.selectedTower ? `Selected: ${game.selectedTower.name}` : selected ? `Tower: ${selected.name}  ${selected.cost} v` : "Choose Tower";
    this.addButton("toggleTowerDropdown", { x, y, w, h }, label, { kind: game.towerDropdownOpen ? "gold" : "default" });
    this.drawButton(ctx, this.buttons[this.buttons.length - 1]);

    if (selected) {
      ctx.fillStyle = selected.color;
      ctx.beginPath();
      ctx.arc(x + 18, y + h * 0.5, tight ? 8 : 10, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!game.towerDropdownOpen) return;

    const rowH = tight ? 32 : 36;
    const gap = 4;
    const listH = TOWER_TYPES.length * rowH + (TOWER_TYPES.length - 1) * gap;
    const listY = Math.max(8, y - listH - 6);
    roundRect(ctx, x, listY - 6, w, listH + 12, 7);
    ctx.fillStyle = "rgba(23, 21, 17, 0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.28)";
    ctx.stroke();

    for (let i = 0; i < TOWER_TYPES.length; i += 1) {
      const tower = TOWER_TYPES[i];
      const rowY = listY + i * (rowH + gap);
      const canAfford = game.gold >= tower.cost;
      const isSelected = game.selectedTowerType === tower.id;
      this.addButton("selectTowerType", { x: x + 6, y: rowY, w: w - 12, h: rowH }, `${tower.name}  ${tower.cost}`, {
        meta: { typeId: tower.id },
        enabled: game.unlockedTowers.includes(tower.id),
        kind: isSelected ? "gold" : "default",
      });
      const button = this.buttons[this.buttons.length - 1];
      this.drawButton(ctx, button);
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(button.rect.x + 17, button.rect.y + rowH * 0.5, tight ? 7 : 8, 0, Math.PI * 2);
      ctx.fill();
      if (!canAfford) {
        drawFittedText(ctx, "low gold", button.rect.x + button.rect.w - 10, button.rect.y + rowH * 0.5, 64, 10, "#b9ab8e", "right", "600");
      }
    }
  }

  drawCompactSelectedPanel(ctx, game, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#171511";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.18)";
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
        enabled: game.unlockedTowers.includes(tower.id),
        kind: game.selectedTowerType === tower.id ? "gold" : "default",
      });
      const button = this.buttons[this.buttons.length - 1];
      this.drawButton(ctx, button);
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(rect.x + rect.w * 0.5, rect.y + 21, compact ? 10 : 13, 0, Math.PI * 2);
      ctx.fill();
      drawFittedText(ctx, `${tower.cost}`, rect.x + rect.w * 0.5, rect.y + rect.h - 13, rect.w - 8, 12, enabled ? "#ffd564" : "#9a8c75", "center", "600");
    }
  }

  drawSelectedPanel(ctx, game, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "#171511";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 238, 190, 0.18)";
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
