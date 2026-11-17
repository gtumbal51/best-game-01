// Lumen Runes bootstrap: creates the game on the page's canvas and runs
// its frame loop. Query parameters are for screenshots only:
//   ?shot=title|play|win|fail   jump to a screen the player can reach
//   &seed=123                    repeatable board for that screenshot
import { Game, VIEW_W, VIEW_H } from './game.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const game = new Game(canvas, {
  shot: params.get('shot') || undefined,
  seed: seedParam !== null ? Number(seedParam) || 1 : undefined,
});
// Exposed for automated testing only (screenshots, play-tests).
window.__game = game;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
