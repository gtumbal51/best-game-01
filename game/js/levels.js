// Twelve hand-designed levels for Lumen Runes. Each level: a move limit,
// a score goal, star thresholds, the number of gem kinds in play, and
// blockers (stones that must be broken, frost that must be thawed).
// Difficulty grows through tighter move budgets and more blockers.
export const LEVELS = [
  {
    name: 'First Light', moves: 20, goal: 3000, kinds: 5,
    stones: [], frost: [],
    tip: 'Swap adjacent runes to match 3 or more.',
  },
  {
    name: 'Ember Path', moves: 20, goal: 4500, kinds: 5,
    stones: [[3, 3, 1], [4, 4, 1]], frost: [],
    tip: 'Match beside a stone to crack it.',
  },
  {
    name: 'Tide Pools', moves: 22, goal: 6000, kinds: 5,
    stones: [[2, 2, 1], [2, 5, 1], [5, 2, 1], [5, 5, 1]], frost: [],
    tip: 'Stones never move — break them from the side.',
  },
  {
    name: 'Starfall', moves: 22, goal: 7500, kinds: 6,
    stones: [[3, 4, 1], [4, 3, 1]], frost: [[1, 1], [6, 6]],
    tip: 'A sixth rune joins the board. Frosted runes cannot move.',
  },
  {
    name: 'Frost Hollow', moves: 24, goal: 9000, kinds: 6,
    stones: [], frost: [[2, 3], [2, 4], [5, 3], [5, 4]],
    tip: 'Thaw frost by matching beside it.',
  },
  {
    name: 'Thornwood', moves: 24, goal: 11000, kinds: 6,
    stones: [[1, 3, 1], [1, 4, 1], [6, 3, 1], [6, 4, 1]], frost: [[3, 1], [4, 6]],
    tip: 'Match 4 in a line to forge a Line Rune.',
  },
  {
    name: 'Moonwell', moves: 26, goal: 12000, kinds: 6,
    stones: [[2, 2, 1], [2, 5, 1], [3, 3, 1], [3, 4, 1], [5, 2, 1], [5, 5, 1]], frost: [],
    tip: 'A Line Rune clears its whole row or column.',
  },
  {
    name: 'Aurora Gate', moves: 26, goal: 14000, kinds: 6,
    stones: [[1, 2, 1], [1, 5, 1], [6, 2, 1], [6, 5, 1]], frost: [[3, 3], [3, 4], [4, 3], [4, 4]],
    tip: 'Match 5 in an L or T to forge a Burst Rune.',
  },
  {
    name: 'Deep Dark', moves: 28, goal: 15000, kinds: 6,
    stones: [[2, 3, 2], [2, 4, 2], [5, 3, 2], [5, 4, 2], [3, 1, 1], [4, 6, 1]], frost: [[0, 0], [7, 7]],
    tip: 'Dark stones take two hits to break.',
  },
  {
    name: 'Prism Court', moves: 28, goal: 17000, kinds: 6,
    stones: [[1, 1, 1], [1, 6, 1], [6, 1, 1], [6, 6, 1]], frost: [[2, 3], [2, 4], [5, 3], [5, 4]],
    tip: 'Match 5 in a line to forge a Prism Rune.',
  },
  {
    name: 'Umbral Mire', moves: 30, goal: 19000, kinds: 6,
    stones: [[1, 2, 2], [1, 5, 2], [2, 3, 1], [2, 4, 1], [5, 3, 1], [5, 4, 1], [6, 2, 2], [6, 5, 2]], frost: [[0, 3], [7, 4]],
    tip: 'Swap a Prism with any rune to clear its kind.',
  },
  {
    name: 'The Last Light', moves: 32, goal: 21000, kinds: 6,
    stones: [[1, 1, 2], [1, 6, 2], [2, 3, 1], [2, 4, 1], [5, 3, 1], [5, 4, 1], [6, 1, 2], [6, 6, 2]],
    frost: [[0, 3], [0, 4], [7, 3], [7, 4]],
    tip: 'The final trial. Every trick you know, at once.',
  },
];

export function starsFor(level, score) {
  const s2 = Math.round(level.goal * 1.6);
  const s3 = Math.round(level.goal * 2.2);
  if (score >= s3) return 3;
  if (score >= s2) return 2;
  if (score >= level.goal) return 1;
  return 0;
}

export function starThresholds(level) {
  return [level.goal, Math.round(level.goal * 1.6), Math.round(level.goal * 2.2)];
}
