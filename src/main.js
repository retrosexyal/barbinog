import { Game } from "./game/Game.js";

const canvas = document.getElementById("gameCanvas");
const root = document.body;

const game = new Game(canvas, {
  debugPerf: new URLSearchParams(window.location.search).has("debug"),
});

if (location.hostname === "127.0.0.1" || location.hostname === "localhost" || game.debugPerf) {
  window.__game = game;
}

game
  .init()
  .then(() => {
    root.classList.add("game-ready");
    game.start();
  })
  .catch((error) => {
    console.error("[Game] Failed to start", error);
    const fallback = document.getElementById("fallback-message");
    fallback.textContent = "Unable to start the game. Check the console for details.";
  });
