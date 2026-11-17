// Particles, floating score texts, shockwave rings and light shards.
// Shards are the economy: a slain wisp drops them, they drift to the
// crystal, and each one feeds the nova charge.
export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.rings = [];
    this.shards = [];
  }

  burst(x, y, color, count, speed, life = 0.7, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
      });
    }
  }

  smoke(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 12 + Math.random() * 30;
      this.list.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 14,
        life: 0.9 + Math.random() * 0.5,
        maxLife: 1.2,
        size: 7 + Math.random() * 9,
        color,
        smoke: true,
      });
    }
  }

  text(x, y, str, color = '#ffe9a8', size = 17) {
    this.texts.push({ x, y, str, color, size, life: 1.1, maxLife: 1.1 });
  }

  ring(x, y, color, maxR = 260, life = 0.6) {
    this.rings.push({ x, y, color, r: 12, maxR, life, maxLife: life });
  }

  dropShard(x, y, rng) {
    this.shards.push({
      x, y,
      vx: rng.range(-40, 40),
      vy: rng.range(-70, -20),
      rot: rng.range(0, Math.PI * 2),
      spin: rng.range(-3, 3),
      life: 6,
    });
  }

  update(dt, cx, cy) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 34 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) {
      r.r += (r.maxR - r.r) * dt * 5;
      r.life -= dt;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    // Shards arc out, then home in on the crystal.
    const arrived = [];
    for (const s of this.shards) {
      s.life -= dt;
      const dx = cx - s.x;
      const dy = cy - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = d < 260 ? 620 : 60;
      s.vx += (dx / d) * pull * dt;
      s.vy += (dy / d) * pull * dt;
      s.vx *= 0.99;
      s.vy *= 0.99;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.spin * dt;
      if (d < 52 || s.life <= 0) arrived.push(s);
    }
    if (arrived.length) {
      this.shards = this.shards.filter((s) => !arrived.includes(s));
    }
    return arrived.length;
  }

  draw(ctx) {
    // Shockwave rings.
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 + a * 4;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Sparks and smoke.
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      if (p.smoke) {
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Shards: small spinning gold diamonds.
    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = '#ffd76a';
      ctx.shadowColor = '#ffbf2e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4.5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Floating texts.
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(t.str, t.x, t.y);
      ctx.restore();
    }
  }
}
