// The match-3 board: pure game logic, no drawing. The board owns the
// grid, finds matches, plans special-rune creation, expands clears
// through chained specials, damages blockers, collapses columns around
// stones, refills, and answers whether any move exists.
// A tile: { kind, special: null | 'line-h' | 'line-v' | 'burst' | 'prism', frost: bool }
// A stone: { stone: hp } — never moves, never matches, breaks at 0 hp.
// Empty cells are null (only between a clear and the refill).
export const ROWS = 8;
export const COLS = 8;

const key = (r, c) => r * COLS + c;

export class Board {
  constructor(level, rng) {
    this.rows = ROWS;
    this.cols = COLS;
    this.kinds = level.kinds;
    this.rng = rng;
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid.push(new Array(COLS).fill(null));
    }
    // Place stones first, then fill the rest with no opening matches.
    for (const [r, c, hp] of level.stones || []) {
      this.grid[r][c] = { stone: hp || 1, maxHp: hp || 1 };
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c]) continue;
        let kind;
        do {
          kind = this.rng.int(0, this.kinds - 1);
        } while (this._wouldMatch(r, c, kind));
        this.grid[r][c] = this._newTile(kind);
      }
    }
    for (const [r, c] of level.frost || []) {
      const t = this.grid[r][c];
      if (t && !t.stone) t.frost = true;
    }
    // Guarantee an opening move (reshuffle kinds until one exists).
    let guard = 0;
    while (!this.hasValidMove() && guard < 200) {
      this.shuffle();
      guard++;
    }
  }

  _newTile(kind) {
    return { kind, special: null, frost: false };
  }

  _wouldMatch(r, c, kind) {
    const at = (rr, cc) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return -1;
      const t = this.grid[rr][cc];
      return t && !t.stone ? t.kind : -1;
    };
    const h = (at(r, c - 1) === kind && at(r, c - 2) === kind)
      || (at(r, c - 1) === kind && at(r, c + 1) === kind)
      || (at(r, c + 1) === kind && at(r, c + 2) === kind);
    const v = (at(r - 1, c) === kind && at(r - 2, c) === kind)
      || (at(r - 1, c) === kind && at(r + 1, c) === kind)
      || (at(r + 1, c) === kind && at(r + 2, c) === kind);
    return h || v;
  }

  inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  at(r, c) {
    return this.inBounds(r, c) ? this.grid[r][c] : null;
  }

  isTile(r, c) {
    const t = this.at(r, c);
    return !!t && !t.stone;
  }

  // A tile the player may pick up and swap (prisms included; frost excluded).
  isSwappable(r, c) {
    const t = this.at(r, c);
    return !!t && !t.stone && !t.frost;
  }

  swap(a, b) {
    const tmp = this.grid[a.r][a.c];
    this.grid[a.r][a.c] = this.grid[b.r][b.c];
    this.grid[b.r][b.c] = tmp;
  }

  // Maximal runs of 3+ equal kinds, horizontally and vertically.
  // Frosted tiles count in runs; prisms (kind null) never do.
  findMatches() {
    const groups = [];
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const t = this.grid[r][c];
        if (!t || t.stone || t.kind === null || t.kind === undefined) { c++; continue; }
        let len = 1;
        while (c + len < COLS) {
          const n = this.grid[r][c + len];
          if (!n || n.stone || n.kind !== t.kind) break;
          len++;
        }
        if (len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ r, c: c + i });
          groups.push({ cells, dir: 'h', len });
        }
        c += len;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const t = this.grid[r][c];
        if (!t || t.stone || t.kind === null || t.kind === undefined) { r++; continue; }
        let len = 1;
        while (r + len < ROWS) {
          const n = this.grid[r + len][c];
          if (!n || n.stone || n.kind !== t.kind) break;
          len++;
        }
        if (len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ r: r + i, c });
          groups.push({ cells, dir: 'v', len });
        }
        r += len;
      }
    }
    return groups;
  }

  // Decide which special rune (if any) a swap's matches create, at the
  // cell the player moved — or, for a cascade with no moved cell, at the
  // middle of the qualifying run. Priority: 5-line prism, L/T burst, 4-line.
  planSpecial(groups, movedCell) {
    const pickCell = (g) => {
      if (movedCell) return movedCell;
      const mid = g.cells[Math.floor(g.cells.length / 2)];
      return { r: mid.r, c: mid.c };
    };
    const mine = movedCell
      ? groups.filter((g) => g.cells.some((cell) => key(cell.r, cell.c) === key(movedCell.r, movedCell.c)))
      : groups;
    if (!mine.length) return null;
    // Five in a line.
    for (const g of mine) {
      if (g.len >= 5) {
        const cell = pickCell(g);
        return { r: cell.r, c: cell.c, type: 'prism' };
      }
    }
    // L or T: a cell in both a horizontal and a vertical run.
    const hCells = new Set();
    const vCells = new Set();
    for (const g of groups) {
      for (const cell of g.cells) {
        (g.dir === 'h' ? hCells : vCells).add(key(cell.r, cell.c));
      }
    }
    for (const k of hCells) {
      if (vCells.has(k)) {
        const r = Math.floor(k / COLS);
        const c = k % COLS;
        if (this.at(r, c) && !this.at(r, c).stone) {
          return { r, c, type: 'burst' };
        }
      }
    }
    // Four in a line.
    for (const g of mine) {
      if (g.len === 4) {
        const cell = pickCell(g);
        return { r: cell.r, c: cell.c, type: g.dir === 'h' ? 'line-h' : 'line-v' };
      }
    }
    return null;
  }

  // Expand a set of matched groups into the full clear set, chaining
  // specials, and collect blocker damage (adjacent clears + direct hits).
  // Returns { clear: [{r,c}], damage: Map<key, {r,c}>, special: plan|null }.
  computeClear(groups, plannedSpecial) {
    const clear = new Map();
    const damage = new Map();
    const queue = [];
    const addClear = (r, c) => {
      if (!this.inBounds(r, c)) return;
      const t = this.grid[r][c];
      if (!t || t.stone) return;
      const k = key(r, c);
      if (!clear.has(k)) {
        clear.set(k, { r, c });
        if (t.special) queue.push({ r, c, special: t.special });
      }
    };
    const addDamage = (r, c) => {
      if (!this.inBounds(r, c)) return;
      const t = this.grid[r][c];
      if (!t) return;
      if (t.stone || t.frost) damage.set(key(r, c), { r, c });
    };
    for (const g of groups) {
      for (const cell of g.cells) addClear(cell.r, cell.c);
    }
    // Chain specials: a cleared special fires its effect, which may
    // clear further specials.
    while (queue.length) {
      const { r, c, special } = queue.shift();
      if (special === 'line-h') {
        for (let cc = 0; cc < COLS; cc++) {
          if (cc !== c) addClear(r, cc);
          addDamage(r, cc);
        }
      } else if (special === 'line-v') {
        for (let rr = 0; rr < ROWS; rr++) {
          if (rr !== r) addClear(rr, c);
          addDamage(rr, c);
        }
      } else if (special === 'burst') {
        for (let rr = r - 1; rr <= r + 1; rr++) {
          for (let cc = c - 1; cc <= c + 1; cc++) {
            if (rr !== r || cc !== c) addClear(rr, cc);
            addDamage(rr, cc);
          }
        }
      }
    }
    // Blockers beside any cleared cell take a hit.
    for (const { r, c } of clear.values()) {
      addDamage(r - 1, c);
      addDamage(r + 1, c);
      addDamage(r, c - 1);
      addDamage(r, c + 1);
    }
    // The planned special's cell survives the clear as the new rune.
    if (plannedSpecial) {
      clear.delete(key(plannedSpecial.r, plannedSpecial.c));
    }
    return {
      clear: [...clear.values()],
      damage: [...damage.values()],
      special: plannedSpecial,
    };
  }

  // Apply a computed clear: remove tiles, damage blockers, plant the new
  // special. Returns what broke, for score and effects.
  applyClear(computed) {
    let cleared = 0;
    let brokeStone = 0;
    let brokeFrost = 0;
    for (const { r, c } of computed.clear) {
      const t = this.grid[r][c];
      if (!t || t.stone) continue;
      if (t.frost) {
        // A frosted tile in a clear loses its frost, not the tile.
        t.frost = false;
        brokeFrost++;
      } else {
        this.grid[r][c] = null;
        cleared++;
      }
    }
    for (const { r, c } of computed.damage) {
      const t = this.grid[r][c];
      if (!t) continue;
      if (t.stone) {
        t.stone--;
        if (t.stone <= 0) {
          this.grid[r][c] = null;
          brokeStone++;
        }
      } else if (t.frost) {
        t.frost = false;
        brokeFrost++;
      }
    }
    if (computed.special) {
      const { r, c, type } = computed.special;
      const t = this.grid[r][c];
      if (t && !t.stone) {
        t.special = type;
        t.frost = false;
      }
    }
    return { cleared, brokeStone, brokeFrost };
  }

  // Prism activation: clear every tile of the given kind (plus the prism).
  prismClear(prismCell, kind) {
    const clear = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.grid[r][c];
        if (!t || t.stone) continue;
        if (t.kind === kind) clear.push({ r, c });
      }
    }
    clear.push({ r: prismCell.r, c: prismCell.c });
    const damage = [];
    const addDamage = (r, c) => {
      const t = this.at(r, c);
      if (t && (t.stone || t.frost)) damage.push({ r, c });
    };
    for (const { r, c } of clear) {
      addDamage(r - 1, c);
      addDamage(r + 1, c);
      addDamage(r, c - 1);
      addDamage(r, c + 1);
    }
    return { clear, damage, special: null };
  }

  // Tiles fall within each column segment (stones pin their segments).
  // Returns moves [{tile, fromR, toR, c}] for animation.
  collapse() {
    const moves = [];
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const t = this.grid[r][c];
        if (t && t.stone) {
          write = r - 1;
        } else if (t) {
          if (write !== r) {
            this.grid[write][c] = t;
            this.grid[r][c] = null;
            moves.push({ tile: t, fromR: r, toR: write, c });
          }
          write--;
        }
      }
    }
    return moves;
  }

  // Fill every empty cell with a fresh tile dropping from above the board.
  // Returns spawns [{tile, toR, c, fromR}] (fromR < 0: above the board).
  refill() {
    const spawns = [];
    for (let c = 0; c < COLS; c++) {
      let above = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          if (this.grid[r][c].stone) above = 0;
          continue;
        }
        const kind = this.rng.int(0, this.kinds - 1);
        const tile = this._newTile(kind);
        this.grid[r][c] = tile;
        above++;
        spawns.push({ tile, toR: r, c, fromR: -above });
      }
    }
    return spawns;
  }

  // Is there any legal swap that makes a match (or a prism activation)?
  hasValidMove() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.isSwappable(r, c)) continue;
        const t = this.grid[r][c];
        if (t.special === 'prism') return true;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (!this.isSwappable(nr, nc)) continue;
          this.swap({ r, c }, { r: nr, c: nc });
          const ok = this.findMatches().length > 0
            || this.grid[r][c].special === 'prism'
            || this.grid[nr][nc].special === 'prism';
          this.swap({ r, c }, { r: nr, c: nc });
          if (ok) return true;
        }
      }
    }
    return false;
  }

  // One legal swap, for the idle hint. Returns {a, b} or null.
  findHint() {
    const options = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.isSwappable(r, c)) continue;
        const t = this.grid[r][c];
        if (t.special === 'prism') {
          // Any neighbour works for a prism.
          if (this.isSwappable(r, c + 1)) options.push({ a: { r, c }, b: { r, c: c + 1 } });
          else if (this.isSwappable(r + 1, c)) options.push({ a: { r, c }, b: { r: r + 1, c } });
          continue;
        }
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (!this.isSwappable(nr, nc)) continue;
          this.swap({ r, c }, { r: nr, c: nc });
          const ok = this.findMatches().length > 0;
          this.swap({ r, c }, { r: nr, c: nc });
          if (ok) options.push({ a: { r, c }, b: { r: nr, c: nc } });
        }
      }
    }
    return options.length ? options[this.rng.int(0, options.length - 1)] : null;
  }

  // Reshuffle tile kinds until a move exists and no match is showing.
  shuffle() {
    const tiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.grid[r][c];
        if (t && !t.stone) tiles.push(t);
      }
    }
    for (let attempt = 0; attempt < 200; attempt++) {
      // Fisher-Yates over kinds, keeping specials and frost on their tiles.
      const kinds = tiles.map((t) => t.kind);
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = this.rng.int(0, i);
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      tiles.forEach((t, i) => { t.kind = kinds[i]; });
      if (this.findMatches().length === 0 && this.hasValidMove()) return true;
    }
    return false;
  }

  countStones() {
    let n = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] && this.grid[r][c].stone) n++;
      }
    }
    return n;
  }
}
