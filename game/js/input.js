// Mouse + keyboard input for the match-3 board.
// Supports click-click swapping (click a tile, click its neighbour) and
// drag swapping (press on a tile, drag toward a neighbour, release).
// All coordinates are translated into the canvas's own pixels.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.mouseDown = false;
    this.downX = 0;
    this.downY = 0;
    this.dragDX = 0;
    this.dragDY = 0;
    this.clicked = false; // edge: a press-and-release without a drag
    this.swiped = false; // edge: a drag past the swipe threshold
    this.swipeDX = 0;
    this.swipeDY = 0;
    this.keys = new Set();
    this.pressedKeys = new Set(); // edge: consumed by the game
    this._attach();
  }

  _toCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    this.x = (e.clientX - rect.left) * sx;
    this.y = (e.clientY - rect.top) * sy;
  }

  _attach() {
    this.canvas.addEventListener('pointermove', (e) => {
      this._toCanvas(e);
      if (this.mouseDown) {
        this.dragDX = this.x - this.downX;
        this.dragDY = this.y - this.downY;
        if (!this.swiped && Math.hypot(this.dragDX, this.dragDY) > 26) {
          this.swiped = true;
          this.swipeDX = this.dragDX;
          this.swipeDY = this.dragDY;
        }
      }
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      this._toCanvas(e);
      if (e.button !== 0) return;
      this.mouseDown = true;
      this.downX = this.x;
      this.downY = this.y;
      this.dragDX = 0;
      this.dragDY = 0;
      e.preventDefault();
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !this.mouseDown) return;
      this.mouseDown = false;
      this._toCanvas(e);
      if (!this.swiped) this.clicked = true;
      this.dragDX = 0;
      this.dragDY = 0;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      if (!this.keys.has(k)) this.pressedKeys.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
  }

  // True once after the key went down; clears on read.
  pressed(key) {
    const k = key.toLowerCase();
    if (this.pressedKeys.has(k)) {
      this.pressedKeys.delete(k);
      return true;
    }
    return false;
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  // A completed drag: returns {dx, dy} once, else null.
  consumeSwipe() {
    if (!this.swiped) return null;
    this.swiped = false;
    return { dx: this.swipeDX, dy: this.swipeDY };
  }

  endFrame() {
    this.pressedKeys.clear();
    this.clicked = false;
    this.swiped = false;
  }
}
