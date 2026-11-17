// Seeded random numbers (mulberry32) for reproducible screenshot scenes.
// The live game uses Math.random; when a ?seed= value is given the game
// runs on this deterministic stream instead, so a screenshot is repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.next = seed === undefined ? Math.random : mulberry32(seed);
  }
  // Float in [0, 1).
  float() {
    return this.next();
  }
  // Float in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }
  // Integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  // True with probability p (0..1).
  chance(p) {
    return this.next() < p;
  }
  // One element of an array.
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  // Angle in radians, uniform over the circle.
  angle() {
    return this.next() * Math.PI * 2;
  }
}
