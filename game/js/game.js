// Lumen Runes: a match-3 puzzle in the night vale. Swap adjacent runes
// to match three or more; matches clear, runes above fall, new runes drop
// in, and chains cascade. Four in a line forges a Line Rune, an L or T
// of five forges a Burst Rune, five in a line forges a Prism Rune.
// Twelve hand-made levels: reach the score goal before the moves run
// out, break every stone, thaw every frost.
import { Rng } from './rng.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Board, ROWS, COLS } from './board.js';
import { LEVELS, starsFor } from './levels.js';
import { drawGem, drawStone } from './tiles.js';
import { Particles } from './particles.js';
import { Background } from './background.js';
import { Hud } from './hud.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;
const CELL = 66;
const BOARD_PX = CELL * 8;
const BX = (VIEW_W - BOARD_PX) / 2;
const BY = 112;
const TILE = 62;

const tileCenter = (r, c) => ({ x: BX + c * CELL + CELL / 2, y: BY + r * CELL + CELL / 2 });
const cellAtPoint = (x, y) => {
  const c = Math.floor((x - BX) / CELL);
  const r = Math.floor((y - BY) / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { r, c };
};

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.rng = new Rng(opts.seed);
    this.bg = new Background(VIEW_W, VIEW_H, opts.seed ?? 20261117);
    this.hud = new Hud(VIEW_W, VIEW_H);
    this.particles = new Particles();
    this.time = 0;
    this.state = 'title';
    this.paused = false;
    this.unlockedLevel = 0;
    this.levelStars = {};
    try {
      this.unlockedLevel = Number(window.localStorage.getItem('lumenrunes.unlocked') || 0) || 0;
      this.levelStars = JSON.parse(window.localStorage.getItem('lumenrunes.stars') || '{}');
    } catch (e) {
      this.unlockedLevel = 0;
      this.levelStars = {};
    }
    this.bestScore = 0;
    this._resetLevelState();
    if (opts.shot) this._applyShot(opts.shot);
  }

  _resetLevelState() {
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.board = null;
    this.score = 0;
    this.movesLeft = 0;
    this.selected = null;
    this.phase = 'idle';
    this.phaseT = 0;
    this.cascade = 0;
    this.bestComboMult = 1;
    this.clearSet = null;
    this.banner = '';
    this.bannerTimer = 0;
    this.idleTimer = 0;
    this.hint = null;
    this.movedCell = null;
    this.earnedStars = 0;
    this.shots = 0;
  }

  get stonesLeft() {
    return this.board ? this.board.countStones() : 0;
  }

  startLevel(i) {
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.board = new Board(this.level, this.rng);
    this.score = 0;
    this.movesLeft = this.level.moves;
    this.selected = null;
    this.phase = 'idle';
    this.cascade = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.idleTimer = 0;
    this.hint = null;
    this.earnedStars = 0;
    this.state = 'playing';
    this.paused = false;
    try {
      const best = JSON.parse(window.localStorage.getItem('lumenrunes.best') || '{}');
      this.bestScore = best[i] || 0;
    } catch (e) {
      this.bestScore = 0;
    }
    this._syncVisuals(true);
    this.sound.horn();
  }

  // Attach pixel positions to every tile; snap on first sync.
  _syncVisuals(snap) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.board.at(r, c);
        if (!t || t.stone) continue;
        const p = tileCenter(r, c);
        if (t.vx === undefined || snap) {
          t.vx = p.x;
          t.vy = p.y;
        }
        t.tx = p.x;
        t.ty = p.y;
        if (t.scale === undefined) t.scale = 1;
        if (t.alpha === undefined) t.alpha = 1;
      }
    }
  }

  _tilesSettled() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.board.at(r, c);
        if (!t || t.stone) continue;
        if (Math.abs(t.vx - t.tx) > 0.6 || Math.abs(t.vy - t.ty) > 0.6) return false;
      }
    }
    return true;
  }

  _saveProgress() {
    try {
      window.localStorage.setItem('lumenrunes.unlocked', String(this.unlockedLevel));
      window.localStorage.setItem('lumenrunes.stars', JSON.stringify(this.levelStars));
      const best = JSON.parse(window.localStorage.getItem('lumenrunes.best') || '{}');
      if (this.score > (best[this.levelIndex] || 0)) best[this.levelIndex] = this.score;
      window.localStorage.setItem('lumenrunes.best', JSON.stringify(best));
      this.bestScore = Math.max(this.bestScore, this.score);
    } catch (e) {
      // Storage unavailable; progress lives for this session only.
    }
  }

  _levelComplete() {
    this.state = 'complete';
    this.earnedStars = starsFor(this.level, this.score);
    this.levelStars[this.levelIndex] = Math.max(this.levelStars[this.levelIndex] || 0, this.earnedStars);
    this.unlockedLevel = Math.max(this.unlockedLevel, Math.min(11, this.levelIndex + 1));
    this._saveProgress();
    this.sound.victory();
    this.particles.burst(VIEW_W / 2, VIEW_H / 2 - 60, '#ffd76a', 60, 300, 1.2, 4);
    this.particles.ring(VIEW_W / 2, VIEW_H / 2 - 60, '#8dffb0', 420, 1);
  }

  _levelFailed() {
    this.state = 'failed';
    this.sound.defeat();
  }

  // ---- swapping ----
  _attemptSwap(a, b) {
    if (!this.board.isSwappable(a.r, a.c) || !this.board.isSwappable(b.r, b.c)) return false;
    const ta = this.board.at(a.r, a.c);
    const tb = this.board.at(b.r, b.c);
    // A prism activates on any swap: clear every rune of the other kind.
    if (ta.special === 'prism' || tb.special === 'prism') {
      const prismCell = ta.special === 'prism' ? a : b;
      const other = ta.special === 'prism' ? tb : ta;
      if (other.kind === null || other.kind === undefined) return false;
      this.movesLeft--;
      this.cascade = 1;
      this.board.swap(a, b);
      this._syncVisuals(false);
      const computed = this.board.prismClear(prismCell, other.kind);
      this._beginPop(computed, `PRISM! All ${this._kindName(other.kind)} runes!`);
      this.sound.nova();
      return true;
    }
    this.board.swap(a, b);
    this._syncVisuals(false);
    this.movedCell = b;
    this.phase = 'swapping';
    this.phaseT = 0;
    this.pendingSwap = { a, b };
    return true;
  }

  _kindName(kind) {
    return ['Moon', 'Ember', 'Tide', 'Leaf', 'Star', 'Void'][kind] || 'rune';
  }

  _settleSwap() {
    const groups = this.board.findMatches();
    if (!groups.length) {
      // No match: swap back, free of charge.
      const { a, b } = this.pendingSwap;
      this.board.swap(a, b);
      this._syncVisuals(false);
      this.phase = 'swapback';
      this.phaseT = 0;
      this.sound.click();
      return;
    }
    this.movesLeft--;
    this.cascade = 1;
    this._beginClearRound(this.movedCell);
  }

  // One clear round: find matches, plan a special, compute the full clear
  // set (with chained specials), pop them with particles, then fall.
  _beginClearRound(movedCell) {
    const groups = this.board.findMatches();
    if (!groups.length) {
      this._endMove();
      return;
    }
    const planned = this.board.planSpecial(groups, movedCell);
    const computed = this.board.computeClear(groups, planned);
    let label = '';
    if (planned) {
      label = planned.type === 'prism' ? 'PRISM RUNE FORGED!'
        : planned.type === 'burst' ? 'BURST RUNE FORGED!'
        : 'LINE RUNE FORGED!';
      this.sound.waveClear();
    }
    this._beginPop(computed, label);
  }

  _beginPop(computed, label) {
    this.clearSet = computed;
    this.phase = 'popping';
    this.phaseT = 0.24;
    for (const { r, c } of computed.clear) {
      const t = this.board.at(r, c);
      const p = tileCenter(r, c);
      const color = t && t.kind !== null && t.kind !== undefined
        ? ['#bfe3ff', '#ffb066', '#6fe3d8', '#a5e88a', '#ffe27a', '#d3a6ff'][t.kind]
        : '#ffffff';
      this.particles.burst(p.x, p.y, color, 8, 170, 0.55, 3);
    }
    if (label) {
      this.banner = label;
      this.bannerTimer = 1.6;
    }
    this.sound.pop(false);
  }

  _finishPop() {
    const computed = this.clearSet;
    this.clearSet = null;
    const mult = this.cascade;
    const result = this.board.applyClear(computed);
    let gained = result.cleared * 60 * mult;
    gained += result.brokeStone * 100 + result.brokeFrost * 50;
    if (computed.special) {
      gained += computed.special.type === 'prism' ? 300 : computed.special.type === 'burst' ? 200 : 150;
    }
    this.score += gained;
    this.bestComboMult = Math.max(this.bestComboMult, mult);
    if (result.cleared > 0) {
      const cx = VIEW_W / 2;
      this.particles.text(cx, 620, `+${gained.toLocaleString('en-US')}${mult > 1 ? `  CASCADE x${mult}` : ''}`, '#ffe9a8', 20);
      this.sound.matchChime(mult);
    }
    if (this.cascade >= 2) {
      this.banner = `CASCADE x${this.cascade}!`;
      this.bannerTimer = 1.4;
    }
    // Collapse and refill; new tiles start above the board.
    const moves = this.board.collapse();
    const spawns = this.board.refill();
    for (const m of moves) {
      const p = tileCenter(m.fromR, m.c);
      m.tile.vy = p.y;
      m.tile.vx = p.x;
    }
    for (const s of spawns) {
      const p = tileCenter(s.toR, s.c);
      s.tile.vx = p.x;
      s.tile.vy = BY + s.fromR * CELL + CELL / 2;
      s.tile.tx = p.x;
      s.tile.ty = p.y;
    }
    this._syncVisuals(false);
    this.phase = 'falling';
    this.phaseT = 0;
  }

  _endMove() {
    this.cascade = 0;
    this.movedCell = null;
    if (this.score >= this.level.goal) {
      this._levelComplete();
      return;
    }
    if (this.movesLeft <= 0) {
      this._levelFailed();
      return;
    }
    if (!this.board.hasValidMove()) {
      this.board.shuffle();
      this._syncVisuals(true);
      this.banner = 'NO MOVES — SHUFFLING!';
      this.bannerTimer = 1.6;
      this.sound.horn();
    }
    this.phase = 'idle';
    this.idleTimer = 0;
    this.hint = null;
  }

  // ---- per-frame update ----
  frame(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    if (this.state === 'title') {
      this.sound.ensure();
      if (this.input.consumeClick()) {
        const level = this._levelNodeAt(this.input.x, this.input.y);
        if (level !== null) {
          this.sound.click();
          this.startLevel(level);
        }
      }
      if (this.input.pressed('m')) this.sound.toggleMute();
    } else if (this.state === 'playing') {
      this.sound.ensure();
      this._updatePlaying(dt);
    } else if (this.state === 'complete') {
      if (this.input.consumeClick() || this.input.pressed('enter')) {
        this.sound.click();
        if (this.levelIndex + 1 < 12) this.startLevel(this.levelIndex + 1);
        else this.state = 'title';
      }
      if (this.input.pressed('r')) this.startLevel(this.levelIndex);
      if (this.input.pressed('m')) this.state = 'title';
    } else if (this.state === 'failed') {
      if (this.input.consumeClick() || this.input.pressed('r') || this.input.pressed('enter')) {
        this.sound.click();
        this.startLevel(this.levelIndex);
      }
      if (this.input.pressed('m')) this.state = 'title';
    }
    this._render();
    this.input.endFrame();
  }

  _levelNodeAt(x, y) {
    const cx = VIEW_W / 2;
    const startX = cx - 5 * 52;
    const startY = 348;
    for (let i = 0; i < 12; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const nx = startX + col * 104;
      const ny = startY + row * 84;
      if (Math.hypot(x - nx, y - ny) < 34 && i <= this.unlockedLevel) return i;
    }
    return null;
  }

  _updatePlaying(dt) {
    if (this.input.pressed('p')) {
      this.paused = !this.paused;
      this.sound.click();
    }
    if (this.input.pressed('m')) this.sound.toggleMute();
    if (this.input.pressed('r')) {
      this.startLevel(this.levelIndex);
      return;
    }
    if (this.input.pressed('escape')) {
      this.state = 'title';
      return;
    }
    if (this.paused) return;

    // Ease tiles toward their targets.
    const k = Math.min(1, dt * 13);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.board.at(r, c);
        if (!t || t.stone) continue;
        t.vx += (t.tx - t.vx) * k;
        t.vy += (t.ty - t.vy) * k;
        if (Math.abs(t.tx - t.vx) < 0.5) t.vx = t.tx;
        if (Math.abs(t.ty - t.vy) < 0.5) t.vy = t.ty;
      }
    }
    this.particles.update(dt, VIEW_W / 2, VIEW_H / 2);

    if (this.phase === 'swapping' || this.phase === 'swapback') {
      if (this._tilesSettled()) {
        if (this.phase === 'swapping') this._settleSwap();
        else {
          this.phase = 'idle';
          this.selected = null;
        }
      }
      return;
    }
    if (this.phase === 'popping') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this._finishPop();
      return;
    }
    if (this.phase === 'falling') {
      if (this._tilesSettled()) {
        if (this.board.findMatches().length) {
          this.cascade++;
          this._beginClearRound(null);
        } else {
          this._endMove();
        }
      }
      return;
    }
    if (this.phase !== 'idle') return;

    // Idle: hint timer.
    this.idleTimer += dt;
    if (this.idleTimer > 6 && !this.hint) {
      this.hint = this.board.findHint();
    }

    // Drag swap.
    const swipe = this.input.consumeSwipe();
    if (swipe) {
      const cell = cellAtPoint(this.input.downX, this.input.downY);
      if (cell) {
        const dir = Math.abs(swipe.dx) > Math.abs(swipe.dy)
          ? { r: 0, c: swipe.dx > 0 ? 1 : -1 }
          : { r: swipe.dy > 0 ? 1 : -1, c: 0 };
        const to = { r: cell.r + dir.r, c: cell.c + dir.c };
        if (this.board.inBounds(to.r, to.c)) {
          this.selected = null;
          this.hint = null;
          this.idleTimer = 0;
          this._attemptSwap(cell, to);
          return;
        }
      }
    }
    // Click-click swap.
    if (this.input.consumeClick()) {
      const cell = cellAtPoint(this.input.x, this.input.y);
      if (!cell) {
        this.selected = null;
        return;
      }
      const t = this.board.at(cell.r, cell.c);
      if (!t || t.stone) {
        this.selected = null;
        return;
      }
      // Double-click a prism: clear a random kind.
      if (t.special === 'prism' && this.selected
        && this.selected.r === cell.r && this.selected.c === cell.c) {
        const kinds = [];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const x = this.board.at(r, c);
            if (x && !x.stone && x.kind !== null && x.kind !== undefined && !kinds.includes(x.kind)) {
              kinds.push(x.kind);
            }
          }
        }
        if (kinds.length) {
          this.movesLeft--;
          this.cascade = 1;
          const kind = kinds[this.rng.int(0, kinds.length - 1)];
          const computed = this.board.prismClear(cell, kind);
          this._beginPop(computed, `PRISM! All ${this._kindName(kind)} runes!`);
          this.sound.nova();
          this.selected = null;
          this.hint = null;
          this.idleTimer = 0;
        }
        return;
      }
      if (!this.selected) {
        if (this.board.isSwappable(cell.r, cell.c)) {
          this.selected = cell;
          this.sound.click();
        }
        return;
      }
      const s = this.selected;
      const adjacent = Math.abs(s.r - cell.r) + Math.abs(s.c - cell.c) === 1;
      if (s.r === cell.r && s.c === cell.c) {
        this.selected = null;
        return;
      }
      if (adjacent) {
        this.selected = null;
        this.hint = null;
        this.idleTimer = 0;
        this._attemptSwap(s, cell);
      } else if (this.board.isSwappable(cell.r, cell.c)) {
        this.selected = cell;
        this.sound.click();
      } else {
        this.selected = null;
      }
    }
  }

  // ---- screenshot presets ----
  _applyShot(shot) {
    if (shot === 'title') {
      this.state = 'title';
      this.levelStars = { 0: 3, 1: 3, 2: 2, 3: 1 };
      this.unlockedLevel = 4;
      return;
    }
    if (shot === 'play') {
      this.startLevel(2);
      this.score = 4200;
      this.movesLeft = 14;
      // Play three real moves through the synchronous resolver so the
      // board, score and cascades are genuinely mid-game.
      for (let i = 0; i < 3; i++) {
        const hint = this.board.findHint();
        if (!hint) break;
        this._attemptSwapSync(hint.a, hint.b);
      }
      this.hint = this.board.findHint();
      this.idleTimer = 7;
      this.particles.burst(BX + 3 * CELL, BY + 4 * CELL, '#ffe27a', 12, 180, 0.7, 3);
      return;
    }
    if (shot === 'win') {
      this.startLevel(0);
      this.score = 7450;
      this.movesLeft = 6;
      this.state = 'complete';
      this.earnedStars = 3;
      return;
    }
    if (shot === 'fail') {
      this.startLevel(2);
      this.score = 5100;
      this.movesLeft = 0;
      this.state = 'failed';
      return;
    }
  }

  // Synchronous swap + full cascade resolution (used by the 'play'
  // screenshot preset). Mirrors the animated flow, without animations.
  _attemptSwapSync(a, b) {
    if (!this.board.isSwappable(a.r, a.c) || !this.board.isSwappable(b.r, b.c)) return false;
    const ta = this.board.at(a.r, a.c);
    const tb = this.board.at(b.r, b.c);
    if (ta.special === 'prism' || tb.special === 'prism') {
      const prismCell = ta.special === 'prism' ? a : b;
      const other = ta.special === 'prism' ? tb : ta;
      if (other.kind === null || other.kind === undefined) return false;
      this.movesLeft--;
      this.board.swap(a, b);
      const computed = this.board.prismClear(prismCell, other.kind);
      this._resolveSync(computed, 1);
      return true;
    }
    this.board.swap(a, b);
    if (!this.board.findMatches().length) {
      this.board.swap(a, b);
      return false;
    }
    this.movesLeft--;
    let cascade = 1;
    let movedCell = b;
    for (;;) {
      const groups = this.board.findMatches();
      if (!groups.length) break;
      const planned = this.board.planSpecial(groups, movedCell);
      const computed = this.board.computeClear(groups, planned);
      this._resolveSync(computed, cascade);
      cascade++;
      movedCell = null;
    }
    return true;
  }

  _resolveSync(computed, cascade) {
    const result = this.board.applyClear(computed);
    let gained = result.cleared * 60 * cascade;
    gained += result.brokeStone * 100 + result.brokeFrost * 50;
    if (computed.special) {
      gained += computed.special.type === 'prism' ? 300 : computed.special.type === 'burst' ? 200 : 150;
    }
    this.score += gained;
    this.board.collapse();
    this.board.refill();
  }

  // ---- render ----
  _render() {
    const ctx = this.ctx;
    this.bg.drawSky(ctx, this.time);
    this.bg.drawGround(ctx, this.time);
    if (this.state === 'title') {
      this.hud.drawTitle(ctx, this, this.time);
      return;
    }
    this.hud.drawBoardFrame(ctx, BX, BY, BOARD_PX);
    // Tiles and stones.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.board.at(r, c);
        if (!t) continue;
        const p = tileCenter(r, c);
        if (t.stone) {
          drawStone(ctx, t, p.x, p.y, TILE, this.time);
          continue;
        }
        const clearing = this.clearSet
          && this.clearSet.clear.some((cell) => cell.r === r && cell.c === c);
        const popping = clearing && this.phase === 'popping';
        const scale = popping ? Math.max(0.05, this.phaseT / 0.24) : (t.scale || 1);
        const alpha = popping ? Math.max(0.05, this.phaseT / 0.24) : 1;
        const selected = this.selected && this.selected.r === r && this.selected.c === c;
        const hinted = this.hint && ((this.hint.a.r === r && this.hint.a.c === c)
          || (this.hint.b.r === r && this.hint.b.c === c));
        drawGem(ctx, t, t.vx, t.vy, TILE, this.time, { selected, hinted, scale, alpha });
      }
    }
    this.particles.draw(ctx);
    // Vignette.
    const vg = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95,
    );
    vg.addColorStop(0, 'rgba(4, 6, 16, 0)');
    vg.addColorStop(1, 'rgba(4, 6, 16, 0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.state === 'playing') {
      this.hud.drawPlay(ctx, this);
      if (this.paused) this.hud.drawPaused(ctx);
    } else if (this.state === 'complete') {
      this.hud.drawLevelComplete(ctx, this, this.time);
    } else if (this.state === 'failed') {
      this.hud.drawLevelFailed(ctx, this);
    }
  }
}
