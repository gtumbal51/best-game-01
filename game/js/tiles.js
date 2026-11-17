// The six rune-gems of the vale, each drawn procedurally with its own
// shape, gradient and glow so the board reads at a glance: moon, ember,
// tide, leaf, star and void. Special runes (line / burst / prism) add
// their own markings on top of a gem's shape.
export const GEM_KINDS = [
  { name: 'moon',  color: '#bfe3ff', dark: '#5f8fd0', glow: '#8fc8ff' },
  { name: 'ember', color: '#ffb066', dark: '#c94f2e', glow: '#ff8a3d' },
  { name: 'tide',  color: '#6fe3d8', dark: '#1f8f96', glow: '#3ddbd9' },
  { name: 'leaf',  color: '#a5e88a', dark: '#3f8f3a', glow: '#7ed957' },
  { name: 'star',  color: '#ffe27a', dark: '#c9962e', glow: '#ffd76a' },
  { name: 'void',  color: '#d3a6ff', dark: '#6d3bc0', glow: '#b388ff' },
];

function starPath(ctx, cx, cy, rOuter, rInner, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawGem(ctx, tile, x, y, size, time, opts = {}) {
  const kind = GEM_KINDS[tile.kind];
  const s = size;
  const selected = !!opts.selected;
  const hinted = !!opts.hinted;
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const scale = opts.scale === undefined ? 1 : opts.scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  // Glow.
  ctx.shadowColor = kind.glow;
  ctx.shadowBlur = selected ? 26 : 12;

  // Body gradient.
  const g = ctx.createRadialGradient(-s * 0.18, -s * 0.22, s * 0.08, 0, 0, s * 0.52);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, kind.color);
  g.addColorStop(1, kind.dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;

  const r = s * 0.36;
  if (tile.kind === 0) {
    // Crescent moon, drawn in one evenodd fill so the pale blue stays
    // bright against the night board.
    const mg = ctx.createLinearGradient(-r, -r, r * 0.6, r);
    mg.addColorStop(0, '#f2f9ff');
    mg.addColorStop(0.5, '#bcd9ff');
    mg.addColorStop(1, '#7ba7e8');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.3, r * 0.85, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.28, r * 0.13, r * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.kind === 1) {
    // Flame.
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.bezierCurveTo(r * 0.85, -r * 0.35, r * 0.7, r * 0.55, 0, r * 0.85);
    ctx.bezierCurveTo(-r * 0.7, r * 0.55, -r * 0.85, -r * 0.35, 0, -r * 1.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.45);
    ctx.bezierCurveTo(r * 0.4, -r * 0.05, r * 0.32, r * 0.4, 0, r * 0.55);
    ctx.bezierCurveTo(-r * 0.32, r * 0.4, -r * 0.4, -r * 0.05, 0, -r * 0.45);
    ctx.fill();
  } else if (tile.kind === 2) {
    // Droplet.
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.bezierCurveTo(r * 0.75, -r * 0.1, r * 0.85, r * 0.5, 0, r * 0.85);
    ctx.bezierCurveTo(-r * 0.85, r * 0.5, -r * 0.75, -r * 0.1, 0, -r * 1.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.15, r * 0.14, r * 0.26, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.kind === 3) {
    // Leaf.
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.95, -r * 0.4, r * 0.8, r * 0.7, 0, r * 0.95);
    ctx.bezierCurveTo(-r * 0.8, r * 0.7, -r * 0.95, -r * 0.4, 0, -r);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, r * 0.75);
    ctx.stroke();
  } else if (tile.kind === 4) {
    // Five-point star.
    starPath(ctx, 0, 0, r * 1.02, r * 0.48);
    ctx.fill();
    ctx.stroke();
  } else {
    // Void orb with a swirl.
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0.4, Math.PI * 1.25);
    ctx.stroke();
    ctx.fillStyle = 'rgba(20, 8, 36, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Special markings.
  if (tile.special === 'line-h' || tile.special === 'line-v') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (tile.special === 'line-h') {
      ctx.moveTo(-r * 0.9, 0);
      ctx.lineTo(r * 0.9, 0);
      ctx.moveTo(r * 0.55, -r * 0.28);
      ctx.lineTo(r * 0.9, 0);
      ctx.lineTo(r * 0.55, r * 0.28);
      ctx.moveTo(-r * 0.55, -r * 0.28);
      ctx.lineTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.55, r * 0.28);
    } else {
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.9);
      ctx.moveTo(-r * 0.28, -r * 0.55);
      ctx.lineTo(0, -r * 0.9);
      ctx.lineTo(r * 0.28, -r * 0.55);
      ctx.moveTo(-r * 0.28, r * 0.55);
      ctx.lineTo(0, r * 0.9);
      ctx.lineTo(r * 0.28, r * 0.55);
    }
    ctx.stroke();
  } else if (tile.special === 'burst') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + time * 0.8;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tile.special === 'prism') {
    // A prism is a rainbow diamond that replaces the gem's shape.
    const pg = ctx.createLinearGradient(-r, -r, r, r);
    pg.addColorStop(0, '#ff7a7a');
    pg.addColorStop(0.25, '#ffe27a');
    pg.addColorStop(0.5, '#7ed957');
    pg.addColorStop(0.75, '#6fc4ff');
    pg.addColorStop(1, '#d3a6ff');
    ctx.fillStyle = pg;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r * 1.05);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const tw = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Frost cover: icy glaze that must be broken before the gem can move.
  if (tile.frost) {
    ctx.fillStyle = 'rgba(190, 225, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + 0.4;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6);
      ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.stroke();
    }
  }

  // Selection ring / hint pulse.
  if (selected || hinted) {
    const pulse = selected ? 1 : 0.55 + 0.35 * Math.sin(time * 5);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = selected ? '#ffffff' : '#ffe27a';
    ctx.lineWidth = selected ? 3 : 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// A stone blocker: a cracked rune-stone that must be broken by matches
// beside it or by a special's blast. It never moves and never matches.
export function drawStone(ctx, stone, x, y, size, time) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = '#5a4a7a';
  ctx.shadowBlur = 8;
  const g = ctx.createLinearGradient(-s * 0.3, -s * 0.35, s * 0.3, s * 0.35);
  g.addColorStop(0, '#6d6390');
  g.addColorStop(0.5, '#453d63');
  g.addColorStop(1, '#2a2340');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8d82b3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8, 9);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Cracks deepen as the stone weakens.
  ctx.strokeStyle = 'rgba(12, 8, 24, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.3);
  ctx.lineTo(-s * 0.05, -s * 0.05);
  ctx.lineTo(-s * 0.25, s * 0.22);
  if (stone.hp >= 2) {
    ctx.moveTo(s * 0.28, -s * 0.18);
    ctx.lineTo(s * 0.08, s * 0.12);
    ctx.lineTo(s * 0.3, s * 0.3);
  }
  ctx.stroke();
  // A dim rune carved in the stone.
  ctx.fillStyle = 'rgba(200, 190, 240, 0.5)';
  ctx.font = `${Math.round(s * 0.34)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ᛟ', 0, 1);
  ctx.restore();
}
