// The vale at night: gradient sky, twinkling stars, a cratered moon with
// a halo, drifting aurora bands, two ridge layers with pine silhouettes,
// mist, the stone circle, and the Last Light crystal itself.
// Everything is drawn procedurally; the scene is pre-seeded once so the
// stars, ridges and trees never jump between frames.
import { Rng } from './rng.js';

const SKY_TOP = '#070a1e';
const SKY_MID = '#141233';
const SKY_LOW = '#2c1f4d';

export class Background {
  constructor(w, h, seed) {
    this.w = w;
    this.h = h;
    const rng = new Rng(seed);
    // Stars: position, size, twinkle phase and speed.
    this.stars = [];
    for (let i = 0; i < 170; i++) {
      this.stars.push({
        x: rng.range(0, w),
        y: rng.range(0, h * 0.62),
        r: rng.range(0.5, 1.9),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.4, 1.6),
      });
    }
    // Two ridge lines across the horizon, with a pine on some peaks.
    this.ridges = [this._ridge(rng, 0.6, 34), this._ridge(rng, 0.68, 52)];
    this.pines = [];
    for (let i = 0; i < 26; i++) {
      const ridge = this.ridges[i % 2];
      const x = rng.range(20, w - 20);
      const y = this._ridgeY(ridge, x) - rng.range(2, 10);
      this.pines.push({ x, y, s: rng.range(14, 34) });
    }
    // Drifting fog banks.
    this.fog = [];
    for (let i = 0; i < 7; i++) {
      this.fog.push({
        x: rng.range(0, w),
        y: rng.range(h * 0.55, h * 0.95),
        rx: rng.range(120, 260),
        speed: rng.range(4, 12) * (rng.chance(0.5) ? 1 : -1),
      });
    }
    // Fireflies that wander the lower field.
    this.flies = [];
    for (let i = 0; i < 22; i++) {
      this.flies.push({
        x: rng.range(60, w - 60),
        y: rng.range(h * 0.5, h - 40),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.3, 0.9),
        amp: rng.range(6, 18),
      });
    }
  }

  _ridge(rng, baseY, amp) {
    const pts = [];
    const step = 64;
    for (let x = -step; x <= this.w + step; x += step) {
      pts.push({ x, y: this.h * baseY + rng.range(-amp, amp) });
    }
    return pts;
  }

  _ridgeY(ridge, x) {
    for (let i = 0; i < ridge.length - 1; i++) {
      const a = ridge[i];
      const b = ridge[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / (b.x - a.x || 1);
        return a.y + (b.y - a.y) * t;
      }
    }
    return ridge[ridge.length - 1].y;
  }

  drawSky(ctx, time) {
    // Night gradient.
    const sky = ctx.createLinearGradient(0, 0, 0, this.h);
    sky.addColorStop(0, SKY_TOP);
    sky.addColorStop(0.55, SKY_MID);
    sky.addColorStop(0.78, SKY_LOW);
    sky.addColorStop(1, '#0a0f22');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h);

    // Stars, twinkling.
    for (const s of this.stars) {
      const a = 0.35 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon with halo and craters.
    const mx = this.w - 168;
    const my = 108;
    const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 150);
    halo.addColorStop(0, 'rgba(255, 246, 214, 0.28)');
    halo.addColorStop(1, 'rgba(255, 246, 214, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 150, my - 150, 300, 300);
    ctx.save();
    ctx.shadowColor = '#fff3c4';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#fdf3cf';
    ctx.beginPath();
    ctx.arc(mx, my, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(214, 196, 150, 0.5)';
    for (const [cx, cy, cr] of [[-14, -8, 8], [10, 12, 6], [16, -14, 5], [-4, 18, 4]]) {
      ctx.beginPath();
      ctx.arc(mx + cx, my + cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aurora: slow sine bands, additive glow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bands = [
      { y: 150, amp: 26, color: 'rgba(64, 224, 160, 0.10)', speed: 0.11, phase: 0 },
      { y: 205, amp: 34, color: 'rgba(120, 140, 255, 0.09)', speed: 0.07, phase: 2.1 },
      { y: 120, amp: 18, color: 'rgba(190, 110, 255, 0.07)', speed: 0.15, phase: 4.2 },
    ];
    for (const b of bands) {
      ctx.beginPath();
      ctx.moveTo(0, b.y);
      for (let x = 0; x <= this.w; x += 24) {
        const y = b.y + Math.sin(x * 0.004 + time * b.speed + b.phase) * b.amp
          + Math.sin(x * 0.011 - time * b.speed * 0.6) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.w, b.y + 70);
      ctx.lineTo(0, b.y + 70);
      ctx.closePath();
      ctx.fillStyle = b.color;
      ctx.fill();
    }
    ctx.restore();
  }

  drawGround(ctx, time) {
    // Far ridge, then near ridge with pines.
    const ridgeColors = ['#1a1433', '#120d26'];
    this.ridges.forEach((ridge, i) => {
      ctx.fillStyle = ridgeColors[i];
      ctx.beginPath();
      ctx.moveTo(-10, this.h);
      ctx.lineTo(-10, ridge[0].y);
      for (const p of ridge) ctx.lineTo(p.x, p.y);
      ctx.lineTo(this.w + 10, ridge[ridge.length - 1].y);
      ctx.lineTo(this.w + 10, this.h);
      ctx.closePath();
      ctx.fill();
    });
    // Pine silhouettes.
    ctx.fillStyle = '#0b0817';
    for (const p of this.pines) {
      const s = p.s;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x - s * 0.42, p.y);
      ctx.lineTo(p.x - s * 0.16, p.y);
      ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3);
      ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
      ctx.lineTo(p.x + s * 0.16, p.y);
      ctx.lineTo(p.x + s * 0.42, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // Ground: dark meadow gradient.
    const g = ctx.createLinearGradient(0, this.h * 0.62, 0, this.h);
    g.addColorStop(0, '#131a2e');
    g.addColorStop(1, '#070912');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.h * 0.68, this.w, this.h * 0.32);

    // Stone circle around the crystal.
    const cx = this.w / 2;
    const cy = this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sx = Math.cos(a) * 118;
      const sy = Math.sin(a) * 118 * 0.82;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#232a3d';
      ctx.strokeStyle = '#3a4560';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-9, -14, 18, 28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Rune ring on the ground, slowly rotating.
    ctx.rotate(time * 0.05);
    ctx.strokeStyle = 'rgba(126, 231, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Fog banks drifting.
    for (const f of this.fog) {
      const fx = ((f.x + time * f.speed) % (this.w + 560) + this.w + 560) % (this.w + 560) - 280;
      const fg = ctx.createRadialGradient(fx, f.y, 10, fx, f.y, f.rx);
      fg.addColorStop(0, 'rgba(150, 170, 220, 0.07)');
      fg.addColorStop(1, 'rgba(150, 170, 220, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(fx, f.y, f.rx, f.rx * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fireflies.
    for (const f of this.flies) {
      const fx = f.x + Math.sin(time * f.speed + f.phase) * f.amp;
      const fy = f.y + Math.cos(time * f.speed * 0.8 + f.phase) * f.amp * 0.6;
      const a = 0.35 + 0.5 * Math.abs(Math.sin(time * 1.3 + f.phase * 2));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffe9a0';
      ctx.shadowColor = '#ffdf6b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // The Last Light crystal: faceted gem, glow, orbiting runes, light pool.
  // hp01 (0..1) dims it and cracks it as the vale's light fades.
  drawCrystal(ctx, time, cx, cy, hp01) {
    const pulse = 0.75 + Math.sin(time * 1.6) * 0.15 + (1 - hp01) * -0.25;
    const R = 46;
    // Light pool on the ground.
    const pool = ctx.createRadialGradient(cx, cy + 26, 8, cx, cy + 26, 190);
    pool.addColorStop(0, `rgba(110, 220, 255, ${0.22 * pulse})`);
    pool.addColorStop(1, 'rgba(110, 220, 255, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 26, 190, 74, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rising light rays.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(time * 0.3) * 0.08);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.22;
      const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * 150, Math.sin(a) * 150);
      grad.addColorStop(0, `rgba(140, 230, 255, ${0.16 * pulse})`);
      grad.addColorStop(1, 'rgba(140, 230, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 7 - Math.abs(i - 2) * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.4);
      ctx.lineTo(Math.cos(a) * 150, Math.sin(a) * 150);
      ctx.stroke();
    }
    ctx.restore();

    // Gem body: hexagonal facets with a cyan-to-violet gradient.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = '#6ee2ff';
    ctx.shadowBlur = 34 * pulse + 8;
    const gem = ctx.createLinearGradient(0, -R, 0, R);
    gem.addColorStop(0, '#d9fbff');
    gem.addColorStop(0.35, '#7ee7ff');
    gem.addColorStop(0.7, '#4f8cff');
    gem.addColorStop(1, '#7a5cff');
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(R * 0.72, -R * 0.32);
    ctx.lineTo(R * 0.52, R * 0.62);
    ctx.lineTo(0, R);
    ctx.lineTo(-R * 0.52, R * 0.62);
    ctx.lineTo(-R * 0.72, -R * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Facet lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(0, R);
    ctx.moveTo(-R * 0.72, -R * 0.32);
    ctx.lineTo(R * 0.72, -R * 0.32);
    ctx.moveTo(-R * 0.52, R * 0.62);
    ctx.lineTo(R * 0.52, R * 0.62);
    ctx.stroke();
    // Bright core.
    const core = ctx.createRadialGradient(0, -6, 2, 0, -6, R * 0.7);
    core.addColorStop(0, 'rgba(255,255,255,0.9)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, -6, R * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Cracks when hurt.
    if (hp01 < 0.6) {
      ctx.strokeStyle = `rgba(20, 8, 30, ${0.75 * (1 - hp01 / 0.6)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-R * 0.3, -R * 0.5);
      ctx.lineTo(-R * 0.1, -R * 0.1);
      ctx.lineTo(-R * 0.35, R * 0.3);
      ctx.moveTo(R * 0.4, -R * 0.2);
      ctx.lineTo(R * 0.15, R * 0.25);
      ctx.lineTo(R * 0.4, R * 0.55);
      ctx.stroke();
    }
    // Orbiting runes.
    ctx.fillStyle = '#bfefff';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];
    for (let i = 0; i < runes.length; i++) {
      const a = time * 0.45 + (i / runes.length) * Math.PI * 2;
      const rx = Math.cos(a) * (R + 26);
      const ry = Math.sin(a) * (R + 26) * 0.72;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 2 + i);
      ctx.fillText(runes[i], rx, ry);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
