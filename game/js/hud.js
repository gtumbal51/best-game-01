// Screens and HUD, all drawn on the canvas so screenshots show exactly
// what the player sees: the title with its level map, the play HUD, and
// the level-complete / level-failed / paused panels.
import { starThresholds } from './levels.js';

export class Hud {
  constructor(w, h) {
    this.w = w;
    this.h = h;
  }

  _text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
    ctx.save();
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 5;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  _bar(ctx, x, y, w, h, pct, fill) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(h, w * Math.min(1, pct)), h, h / 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.stroke();
    ctx.restore();
  }

  _star(ctx, x, y, r, filled, time, delay = 0) {
    ctx.save();
    ctx.translate(x, y);
    const pop = filled ? 1 + 0.15 * Math.max(0, Math.sin((time - delay) * 4)) : 1;
    ctx.scale(pop, pop);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = '#ffd76a';
      ctx.shadowColor = '#ffbf2e';
      ctx.shadowBlur = 14;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Board frame: a carved stone slab behind the tiles.
  drawBoardFrame(ctx, bx, by, size) {
    ctx.save();
    const g = ctx.createLinearGradient(bx, by, bx + size, by + size);
    g.addColorStop(0, '#2b2447');
    g.addColorStop(1, '#17122e');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(bx - 12, by - 12, size + 24, size + 24, 18);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cell grid lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const cell = size / 8;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * cell, by);
      ctx.lineTo(bx + i * cell, by + size);
      ctx.moveTo(bx, by + i * cell);
      ctx.lineTo(bx + size, by + i * cell);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlay(ctx, g) {
    const pad = 20;
    // Top bar: level + name on the left, score in the middle, moves right.
    this._text(ctx, `LEVEL ${g.levelIndex + 1} — ${g.level.name.toUpperCase()}`, pad, 36, 17, '#eafcff');
    this._text(ctx, `SCORE  ${g.score.toLocaleString('en-US')}`, this.w / 2, 36, 18, '#ffffff', 'center');
    const movesColor = g.movesLeft <= 5 ? '#ff8a96' : '#ffe9a8';
    this._text(ctx, `MOVES  ${g.movesLeft}`, this.w - pad, 36, 18, movesColor, 'right');
    // Goal progress bar under the score.
    const goalPct = Math.min(1, g.score / g.level.goal);
    this._bar(ctx, this.w / 2 - 130, 48, 260, 10, goalPct, '#5fe3a0');
    this._text(ctx, `GOAL ${g.level.goal.toLocaleString('en-US')}`, this.w / 2, 76, 12, '#c9d6ff', 'center');
    // Star thresholds.
    const [s1, s2, s3] = starThresholds(g.level);
    this._text(ctx, `★ ${s1.toLocaleString('en-US')}   ★★ ${s2.toLocaleString('en-US')}   ★★★ ${s3.toLocaleString('en-US')}`, this.w / 2, 96, 12, 'rgba(220,232,255,0.7)', 'center');
    // Left panel: level tip + legend.
    const lx = 24;
    let ly = 150;
    this._text(ctx, g.level.tip, lx, ly, 14, '#ffe9a8');
    ly += 44;
    this._text(ctx, 'HOW TO PLAY', lx, ly, 13, '#9fe8ff');
    ly += 26;
    const lines = [
      'Swap neighbours to match 3+',
      '4 in a line → Line Rune',
      'L or T of 5 → Burst Rune',
      '5 in a line → Prism Rune',
      'Match beside stones & frost',
      'to break them',
    ];
    for (const line of lines) {
      this._text(ctx, line, lx, ly, 13, '#dbe7ff');
      ly += 22;
    }
    // Right panel: stones left + best score.
    const rx = this.w - 24;
    this._text(ctx, 'STONES LEFT', rx, 150, 13, '#9fe8ff', 'right');
    this._text(ctx, String(g.stonesLeft), rx, 182, 30, '#ffffff', 'right');
    this._text(ctx, 'BEST', rx, 230, 13, '#9fe8ff', 'right');
    this._text(ctx, g.bestScore.toLocaleString('en-US'), rx, 256, 20, '#ffffff', 'right');
    this._text(ctx, 'R restart · P pause · M sound', rx, 300, 12, 'rgba(220,232,255,0.65)', 'right');
    // Cascade banner.
    if (g.bannerTimer > 0 && g.banner) {
      const a = Math.min(1, g.bannerTimer * 2);
      ctx.save();
      ctx.globalAlpha = a;
      this._text(ctx, g.banner, this.w / 2, 640, 30, '#ffe9a8', 'center', 800);
      ctx.restore();
    }
  }

  _panel(ctx, title, titleColor, accent, body) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 22, 0.66)';
    ctx.fillRect(0, 0, this.w, this.h);
    const pw = 640;
    const ph = 430;
    const px = cx - pw / 2;
    const py = cy - ph / 2;
    ctx.fillStyle = 'rgba(16, 20, 44, 0.94)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
    ctx.stroke();
    ctx.shadowBlur = 0;
    this._text(ctx, title, cx, py + 64, 38, titleColor, 'center', 800);
    body(cx, py + 96, pw);
    ctx.restore();
  }

  drawTitle(ctx, g, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 22, 0.42)';
    ctx.fillRect(0, 0, this.w, this.h);
    const cx = this.w / 2;
    const bob = Math.sin(time * 1.2) * 5;
    this._text(ctx, '✦', cx, 128 + bob, 28, '#7ee7ff', 'center');
    this._text(ctx, 'LUMEN RUNES', cx, 190 + bob, 58, '#eafcff', 'center', 800);
    this._text(ctx, '— Match the Light of the Vale —', cx, 226 + bob, 18, '#9fe8ff', 'center');
    this._text(ctx, 'Swap runes, match three or more, forge Line, Burst and Prism runes,', cx, 268, 15, '#dbe7ff', 'center');
    this._text(ctx, 'break every stone and thaw every frost — twelve trials wait.', cx, 292, 15, '#dbe7ff', 'center');
    // Level map: 12 nodes in two rows of six.
    const startX = cx - 5 * 52;
    const startY = 348;
    for (let i = 0; i < 12; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = startX + col * 104;
      const y = startY + row * 84;
      const unlocked = i <= g.unlockedLevel;
      const stars = g.levelStars[i] || 0;
      ctx.save();
      ctx.fillStyle = unlocked ? 'rgba(24, 32, 64, 0.95)' : 'rgba(14, 18, 38, 0.7)';
      ctx.strokeStyle = unlocked ? '#7ee7ff' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (unlocked) {
        this._text(ctx, String(i + 1), x, y + 7, 20, '#ffffff', 'center', 800);
        for (let s = 0; s < 3; s++) {
          this._star(ctx, x - 16 + s * 16, y + 44, 6, s < stars, time, s * 0.25);
        }
      } else {
        this._text(ctx, '🔒', x, y + 7, 16, 'rgba(255,255,255,0.5)', 'center');
      }
      ctx.restore();
    }
    const glow = 0.8 + 0.2 * Math.sin(time * 3);
    ctx.save();
    ctx.globalAlpha = glow;
    this._text(ctx, 'CLICK A LEVEL TO PLAY', cx, 576, 20, '#ffe9a8', 'center', 800);
    ctx.restore();
    this._text(ctx, 'Click or drag a rune onto its neighbour to swap · R restart · P pause · M sound', cx, 622, 13, 'rgba(220,232,255,0.75)', 'center');
    ctx.restore();
  }

  drawLevelComplete(ctx, g, time) {
    const stars = g.earnedStars;
    this._panel(ctx, 'LEVEL COMPLETE', '#8dffb0', '#5fe3a0', (cx, y) => {
      this._star(ctx, cx - 70, y + 26, 30, stars >= 1, time, 0);
      this._star(ctx, cx, y + 8, 38, stars >= 2, time, 0.3);
      this._star(ctx, cx + 70, y + 26, 30, stars >= 3, time, 0.6);
      let yy = y + 108;
      this._text(ctx, `Score  ${g.score.toLocaleString('en-US')}`, cx, yy, 18, '#ffffff', 'center');
      yy += 32;
      this._text(ctx, `Moves left  ${g.movesLeft}  ·  Best combo  x${g.bestComboMult}`, cx, yy, 15, '#c9d6ff', 'center');
      yy += 52;
      const next = g.levelIndex + 1 < 12 ? 'NEXT LEVEL' : 'PLAY AGAIN';
      this._text(ctx, `▶  ${next}  ·  R replay  ·  M menu`, cx, yy, 17, '#ffe9a8', 'center', 800);
    });
  }

  drawLevelFailed(ctx, g) {
    this._panel(ctx, 'OUT OF MOVES', '#ff7a8a', '#ff5f6d', (cx, y) => {
      this._star(ctx, cx - 70, y + 26, 30, false, 0);
      this._star(ctx, cx, y + 8, 38, false, 0);
      this._star(ctx, cx + 70, y + 26, 30, false, 0);
      let yy = y + 108;
      this._text(ctx, `Score  ${g.score.toLocaleString('en-US')}  /  ${g.level.goal.toLocaleString('en-US')}`, cx, yy, 18, '#ffffff', 'center');
      yy += 32;
      const need = Math.max(0, g.level.goal - g.score);
      this._text(ctx, `You needed ${need.toLocaleString('en-US')} more points`, cx, yy, 15, '#c9d6ff', 'center');
      yy += 52;
      this._text(ctx, '↻  TRY AGAIN  ·  R retry  ·  M menu', cx, yy, 17, '#ffe9a8', 'center', 800);
    });
  }

  drawPaused(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 22, 0.6)';
    ctx.fillRect(0, 0, this.w, this.h);
    this._text(ctx, 'PAUSED', this.w / 2, this.h / 2 - 8, 40, '#eafcff', 'center', 800);
    this._text(ctx, 'Press P to resume · R to restart the level', this.w / 2, this.h / 2 + 30, 16, '#c9d6ff', 'center');
    ctx.restore();
  }
}
