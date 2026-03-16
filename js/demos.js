// Demo programs for Hack+ (assembly) and Jack++ (high-level)
var defaultProgram = `; Hack+ text demo
; Writes colored text cells directly into the framebuffer at 0xF000.
; Click a listing row to toggle a breakpoint.

      LDA A, 0xFF30
      CLR D
      STORE D, [A]      ; text mode

      LDA A, 0xF000

      ; HELLO HACK+
      LDA D, 0x0F48
      STORE D, [A+0]
      LDA D, 0x0F45
      STORE D, [A+1]
      LDA D, 0x0F4C
      STORE D, [A+2]
      STORE D, [A+3]
      LDA D, 0x0F4F
      STORE D, [A+4]
      LDA D, 0x0F20
      STORE D, [A+5]
      LDA D, 0x0F48
      STORE D, [A+6]
      LDA D, 0x0F41
      STORE D, [A+7]
      LDA D, 0x0F43
      STORE D, [A+8]
      LDA D, 0x0F4B
      STORE D, [A+9]
      LDA D, 0x0F2B
      STORE D, [A+10]

      ; A colored row lower down
      LDA A, 0xF050
      LDA D, 0x1F42
      STORE D, [A+0]
      LDA D, 0x2F4F
      STORE D, [A+1]
      LDA D, 0x4F4F
      STORE D, [A+2]
      LDA D, 0x5F4D
      STORE D, [A+3]
      LDA D, 0x6F21
      STORE D, [A+4]

      HALT
`;

var pixelProgram = `; Hack+ pixel-mode demo
; Pixel mode framebuffer: 0xF000.., 160x60 logical pixels.
; Each word packs 4 pixels, one nibble per pixel.

      LDA A, 0xFF30
      CLR D
      INC D
      STORE D, [A]      ; pixel mode

      LDA A, 0xF000
      LDA D, 0x1234
      STORE D, [A+0]
      LDA D, 0x5678
      STORE D, [A+1]
      LDA D, 0x9ABC
      STORE D, [A+2]
      LDA D, 0xDEF0
      STORE D, [A+3]

      LDA A, 0xF028
      LDA D, 0xFFFF
      STORE D, [A+0]
      STORE D, [A+1]
      STORE D, [A+2]
      STORE D, [A+3]

      LDA A, 0xF050
      LDA D, 0x0123
      STORE D, [A+0]
      LDA D, 0x4567
      STORE D, [A+1]
      LDA D, 0x89AB
      STORE D, [A+2]
      LDA D, 0xCDEF
      STORE D, [A+3]

      HALT
`;

var mosaicProgram = `; Pixel mosaic demo with more framebuffer writes

      LDA A, 0xFF30
      CLR D
      INC D
      STORE D, [A]

      LDA A, 0xF000
      LDA D, 0x1111
      STORE D, [A+0]
      LDA D, 0x2222
      STORE D, [A+1]
      LDA D, 0x3333
      STORE D, [A+2]
      LDA D, 0x4444
      STORE D, [A+3]
      LDA D, 0x5555
      STORE D, [A+4]
      LDA D, 0x6666
      STORE D, [A+5]
      LDA D, 0x7777
      STORE D, [A+6]
      LDA D, 0x8888
      STORE D, [A+7]

      LDA A, 0xF028
      LDA D, 0x89AB
      STORE D, [A+0]
      LDA D, 0xCDEF
      STORE D, [A+1]
      LDA D, 0x0123
      STORE D, [A+2]
      LDA D, 0x4567
      STORE D, [A+3]
      LDA D, 0x89AB
      STORE D, [A+4]
      LDA D, 0xCDEF
      STORE D, [A+5]
      LDA D, 0xFEDC
      STORE D, [A+6]
      LDA D, 0xBA98
      STORE D, [A+7]

      HALT
`;

var keyboardProgram = `; Keyboard echo demo
; Focus the screen or use the input box in the UI.
; Polls keyboard at 0xFF00/0xFF01, writes typed characters to the text screen,
; and echoes them to UART. Press ESC to halt.

      LDA A, 0xFF30
      CLR D
      STORE D, [A]      ; text mode

      LDA B, 0xF000     ; current text cell pointer

loop:
      LDA A, 0xFF00
waitKey:
      LOAD D, [A]       ; keyboard status
      BRZ waitKey
      LOAD D, [A+1]     ; ASCII

      PUSH A
      LDA A, 0xFF21     ; UART TX data
      STORE D, [A]
      POP A

      PUSH A
      LDA A, 27         ; ESC?
      SUB D, A
      BRZ halt
      POP A

      PUSH A
      PUSH B
      MOV A, D
      LDA B, 0x0F00
      OR A, B           ; black bg + white fg + ASCII
      MOV D, A
      POP B
      MOV A, B
      STORE D, [A]
      INC B
      POP A
      BRA loop

halt:
      POP A
      HALT
`;

// ============================================================
// Jack++ Demo Programs
// ============================================================

var jackHelloDemo = `// Jack++ Hello World
// Prints text to the screen using Output

fn main() {
  // Direct char test first
  Output.printChar(72);  // H
  Output.printChar(105); // i
  Output.printChar(33);  // !
  Output.printChar(32);  // space
  
  Output.printString("Hello, Jack++!");
  Output.println();
  Output.printString("Running on Hack+ CPU");
  Output.println();

  var i: int = 1;
  while (i <= 10) {
      Output.printInt(i);
      Output.printChar(32);
      i = i + 1;
  }

  Output.println();
  Output.printString("Done!");
  halt();
}
`;

var jackMathDemo = `// Jack++ Math Demo
// Demonstrates arithmetic, loops, and screen output

fn main() {
  Output.printString("Fibonacci:");
  Output.println();

  var a: int = 0;
  var b: int = 1;
  var i: int = 0;

  while (i < 15) {
      Output.printInt(a);
      Output.printChar(32);

      var temp: int = a + b;
      a = b;
      b = temp;
      i = i + 1;
  }

  Output.println();
  Output.println();

  // Factorial of 7
  Output.printString("7! = ");
  var fact: int = 1;
  var n: int = 1;
  while (n <= 7) {
      fact = fact * n;
      n = n + 1;
  }
  Output.printInt(fact);
  Output.println();

  // Demonstrate if/else
  if (fact > 5000) {
      Output.printString("That is big!");
  } else {
      Output.printString("That is small.");
  }

  halt();
}
`;

var jackPixelDemo = `// Jack++ Pixel Art Demo
// Draws colored rectangles in pixel mode

fn main() {
  // Switch to pixel mode
  poke(0xFF30, 1);

  // Clear screen
  Screen.clearScreen();

  // Draw colored bars
  var color: int = 1;
  var y: int = 0;
  while (y < 60) {
      Screen.setColor(color);
      Screen.drawRectangle(0, y, 159, y + 3);
      color = color + 1;
      if (color > 15) {
          color = 1;
      }
      y = y + 4;
  }

  // Draw a centered white box
  Screen.setColor(15);
  Screen.drawRectangle(50, 15, 110, 45);

  // Draw inner black box
  Screen.setColor(0);
  Screen.drawRectangle(55, 20, 105, 40);

  // Draw colored squares inside
  Screen.setColor(9);
  Screen.drawRectangle(60, 25, 70, 35);
  Screen.setColor(10);
  Screen.drawRectangle(75, 25, 85, 35);
  Screen.setColor(12);
  Screen.drawRectangle(90, 25, 100, 35);

  halt();
}
`;

var jackClassDemo = `// Jack++ Class Demo
// Demonstrates classes, methods, constructors

class Counter {
  field count: int;
  field step: int;

  new(initialStep: int) {
      this.count = 0;
      this.step = initialStep;
  }

  method increment() {
      this.count = this.count + this.step;
  }

  method getValue() -> int {
      return this.count;
  }

  method printValue() {
      Output.printString("Count: ");
      Output.printInt(this.count);
      Output.println();
  }
}

fn main() {
  Output.printString("=== Class Demo ===");
  Output.println();

  var c: Counter = Counter.new(3);
  var i: int = 0;

  while (i < 8) {
      c.printValue();
      c.increment();
      i = i + 1;
  }

  Output.println();
  Output.printString("Final: ");
  Output.printInt(c.getValue());
  Output.println();

  // Demonstrate a second counter
  var c2: Counter = Counter.new(7);
  i = 0;
  while (i < 5) {
      c2.increment();
      i = i + 1;
  }
  Output.printString("Counter2: ");
  Output.printInt(c2.getValue());

  halt();
}
`;

// ============================================================
// Demoscene Megademo
// ============================================================

var jackDemoSceneDemo = `// Jack++ Demoscene Megademo
// 7 scenes: Plasma, Starfield, Sine Scroller, Tunnel, Matrix Rain, Fire, Credits

class Demo {
    static FB: int;
    static SEED: int;
    static SINTAB: Array;

    // --- Fast pseudo-random (xorshift) ---
    fn rng() -> int {
        SEED = SEED ^ (SEED << 7);
        SEED = SEED & 32767;
        SEED = SEED ^ (SEED >> 5);
        SEED = SEED & 32767;
        SEED = SEED ^ (SEED << 3);
        SEED = SEED & 32767;
        if (SEED == 0) { SEED = 1; }
        return SEED;
    }

    // --- Build 64-entry sine table (range -16..+16) ---
    fn buildSinTable() {
        SINTAB = Array.new(64);
        SINTAB[0]  =  0; SINTAB[1]  =  2; SINTAB[2]  =  3; SINTAB[3]  =  5;
        SINTAB[4]  =  6; SINTAB[5]  =  7; SINTAB[6]  =  9; SINTAB[7]  = 10;
        SINTAB[8]  = 11; SINTAB[9]  = 12; SINTAB[10] = 13; SINTAB[11] = 14;
        SINTAB[12] = 15; SINTAB[13] = 15; SINTAB[14] = 16; SINTAB[15] = 16;
        SINTAB[16] = 16; SINTAB[17] = 16; SINTAB[18] = 16; SINTAB[19] = 15;
        SINTAB[20] = 15; SINTAB[21] = 14; SINTAB[22] = 13; SINTAB[23] = 12;
        SINTAB[24] = 11; SINTAB[25] = 10; SINTAB[26] =  9; SINTAB[27] =  7;
        SINTAB[28] =  6; SINTAB[29] =  5; SINTAB[30] =  3; SINTAB[31] =  2;
        SINTAB[32] =  0; SINTAB[33] = -2; SINTAB[34] = -3; SINTAB[35] = -5;
        SINTAB[36] = -6; SINTAB[37] = -7; SINTAB[38] = -9; SINTAB[39] =-10;
        SINTAB[40] =-11; SINTAB[41] =-12; SINTAB[42] =-13; SINTAB[43] =-14;
        SINTAB[44] =-15; SINTAB[45] =-15; SINTAB[46] =-16; SINTAB[47] =-16;
        SINTAB[48] =-16; SINTAB[49] =-16; SINTAB[50] =-16; SINTAB[51] =-15;
        SINTAB[52] =-15; SINTAB[53] =-14; SINTAB[54] =-13; SINTAB[55] =-12;
        SINTAB[56] =-11; SINTAB[57] =-10; SINTAB[58] = -9; SINTAB[59] = -7;
        SINTAB[60] = -6; SINTAB[61] = -5; SINTAB[62] = -3; SINTAB[63] = -2;
    }

    fn sin(idx: int) -> int {
        return SINTAB[idx & 63];
    }

    fn clearFB() {
        var i: int = 0;
        while (i < 2400) {
            poke(FB + i, 0);
            i = i + 1;
        }
    }

    fn clearText() {
        var i: int = 0;
        while (i < 2400) {
            poke(FB + i, 0);
            i = i + 1;
        }
    }

    fn putPixel(x: int, y: int, col: int) {
        if ((x < 0) | (x > 159) | (y < 0) | (y > 59)) { return; }
        var addr: int = FB + (y * 40) + (x / 4);
        var nib: int = 3 - (x & 3);
        var sh: int = nib * 4;
        var old: int = peek(addr);
        poke(addr, (old & (~(15 << sh))) | (col << sh));
    }

    fn init() {
        FB = 0xF000;
        SEED = 12345;
        Demo.buildSinTable();
    }

    // =========================================================
    // SCENE 1: PLASMA - colorful shifting sine plasma
    // =========================================================
    fn scenePlasma() {
        poke(0xFF30, 1);
        var t: int = 0;
        while (t < 80) {
            var yOff: int = 0;
            var y: int = 0;
            while (y < 60) {
                var sinY: int = Demo.sin(y + t + t);
                var x4: int = 0;
                var x: int = 0;
                while (x4 < 40) {
                    var s1: int = Demo.sin(x + t) + sinY;
                    var s2: int = Demo.sin(x + 1 + t) + sinY;
                    var s3: int = Demo.sin(x + 2 + t) + sinY;
                    var s4: int = Demo.sin(x + 3 + t) + sinY;
                    var c0: int = ((s1 + 32) / 4) & 15;
                    var c1: int = ((s2 + 32) / 4) & 15;
                    var c2: int = ((s3 + 32) / 4) & 15;
                    var c3: int = ((s4 + 32) / 4) & 15;
                    poke(FB + yOff + x4, (c0 << 12) | (c1 << 8) | (c2 << 4) | c3);
                    x4 = x4 + 1;
                    x = x + 4;
                }
                y = y + 1;
                yOff = yOff + 40;
            }
            t = t + 1;
        }
    }

    // =========================================================
    // SCENE 2: STARFIELD - 3D stars flying towards viewer
    // =========================================================
    fn sceneStarfield() {
        poke(0xFF30, 1);
        SEED = 42;
        var N: int = 50;
        var sx: Array = Array.new(N);
        var sy: Array = Array.new(N);
        var sz: Array = Array.new(N);

        var i: int = 0;
        while (i < N) {
            sx[i] = (Demo.rng() & 127) - 64;
            sy[i] = (Demo.rng() & 63) - 32;
            sz[i] = (Demo.rng() % 8) + 2;
            i = i + 1;
        }

        var t: int = 0;
        while (t < 160) {
            Demo.clearFB();
            i = 0;
            while (i < N) {
                var px: int = (sx[i] * 8) / sz[i] + 80;
                var py: int = (sy[i] * 8) / sz[i] + 30;
                var col: int = 15;
                if (sz[i] > 5) { col = 7; }
                if (sz[i] > 7) { col = 8; }
                if ((px > 0) & (px < 159) & (py > 0) & (py < 59)) {
                    Demo.putPixel(px, py, col);
                    if (sz[i] < 3) {
                        Demo.putPixel(px + 1, py, col);
                    }
                }
                sz[i] = sz[i] - 1;
                if (sz[i] < 1) {
                    sx[i] = (Demo.rng() & 127) - 64;
                    sy[i] = (Demo.rng() & 63) - 32;
                    sz[i] = (Demo.rng() % 8) + 6;
                }
                i = i + 1;
            }
            t = t + 1;
        }
        sx.dispose();
        sy.dispose();
        sz.dispose();
    }

    // =========================================================
    // SCENE 3: SINE WAVE TEXT SCROLLER
    // =========================================================
    fn sceneSineScroll() {
        poke(0xFF30, 0);
        Demo.clearText();

        // Title at top in rainbow colors
        var title: String = " ** HACK+ DEMOSCENE ** ";
        var tlen: int = title.length();
        var cx: int = 40 - (tlen / 2);
        var i: int = 0;
        while (i < tlen) {
            var col: int = ((i + 1) & 15);
            if (col == 0) { col = 1; }
            poke(FB + cx + i, (col * 256) | title.charAt(i));
            i = i + 1;
        }

        // Scrolling message
        var msg: String = "   GREETINGS FROM HACK+ DEMOSCENE!  THIS DEMO RUNS ON A 16-BIT CPU WITH ONLY 64K RAM.  JACK++ COMPILED TO VM THEN NATIVE CODE.  RESPECT TO ALL DEMOSCENERS!     ";
        var mlen: int = msg.length();

        var scroll: int = 0;
        var t: int = 0;
        while (t < 350) {
            // Clear rows 10-22
            var row: int = 10;
            while (row < 23) {
                var rx: int = 0;
                while (rx < 80) {
                    poke(FB + row * 80 + rx, 0);
                    rx = rx + 1;
                }
                row = row + 1;
            }

            // Sine-wave text
            i = 0;
            while (i < 80) {
                var ci: int = (scroll + i) % mlen;
                var ch: int = msg.charAt(ci);
                if (ch > 32) {
                    var wave: int = Demo.sin((i + i) + (t * 3)) / 3;
                    var yp: int = 16 + wave;
                    if ((yp > 10) & (yp < 23)) {
                        var color: int = ((i + t) & 14) + 1;
                        poke(FB + yp * 80 + i, (color * 256) | ch);
                    }
                }
                i = i + 1;
            }

            // Shimmering bottom border
            i = 0;
            while (i < 80) {
                var bc: int = ((i + t) & 15);
                if (bc == 0) { bc = 8; }
                poke(FB + 28 * 80 + i, (bc * 256) | 196);
                poke(FB + 29 * 80 + i, (bc * 256) | 205);
                i = i + 1;
            }

            scroll = scroll + 1;
            if (scroll > mlen) { scroll = 0; }
            t = t + 1;
        }
    }

    // =========================================================
    // SCENE 4: TUNNEL / VORTEX - hypnotic tunnel pattern
    // =========================================================
    fn sceneTunnel() {
        poke(0xFF30, 1);
        var t: int = 0;
        while (t < 100) {
            var yOff: int = 0;
            var y: int = 0;
            while (y < 60) {
                var dy: int = y - 30;
                if (dy < 0) { dy = -dy; }
                var x4: int = 0;
                var x: int = 0;
                while (x4 < 40) {
                    // Pixel 0
                    var dx: int = x - 80;
                    var adx: int = dx;
                    if (adx < 0) { adx = -adx; }
                    var dist: int = adx + dy;
                    var angle: int = dx + (y - 30);
                    var c0: int = ((dist + angle + t * 3) / 4) & 15;

                    // Pixel 1
                    dx = x + 1 - 80;
                    adx = dx;
                    if (adx < 0) { adx = -adx; }
                    var c1: int = (((adx + dy) + dx + (y - 30) + t * 3) / 4) & 15;

                    // Pixel 2
                    dx = x + 2 - 80;
                    adx = dx;
                    if (adx < 0) { adx = -adx; }
                    var c2: int = (((adx + dy) + dx + (y - 30) + t * 3) / 4) & 15;

                    // Pixel 3
                    dx = x + 3 - 80;
                    adx = dx;
                    if (adx < 0) { adx = -adx; }
                    var c3: int = (((adx + dy) + dx + (y - 30) + t * 3) / 4) & 15;

                    poke(FB + yOff + x4, (c0 << 12) | (c1 << 8) | (c2 << 4) | c3);
                    x4 = x4 + 1;
                    x = x + 4;
                }
                y = y + 1;
                yOff = yOff + 40;
            }
            t = t + 1;
        }
    }

    // =========================================================
    // SCENE 5: MATRIX RAIN - falling green characters
    // =========================================================
    fn sceneMatrix() {
        poke(0xFF30, 0);
        Demo.clearText();
        SEED = 777;

        var heads: Array = Array.new(80);
        var speeds: Array = Array.new(80);
        var lengths: Array = Array.new(80);
        var i: int = 0;
        while (i < 80) {
            heads[i] = 0 - (Demo.rng() % 30);
            speeds[i] = (Demo.rng() % 3) + 1;
            lengths[i] = (Demo.rng() % 10) + 5;
            i = i + 1;
        }

        var t: int = 0;
        while (t < 250) {
            i = 0;
            while (i < 80) {
                if ((t % speeds[i]) == 0) {
                    var h: int = heads[i];
                    // Draw bright head
                    if ((h > -1) & (h < 30)) {
                        var ch: int = (Demo.rng() % 75) + 48;
                        poke(FB + h * 80 + i, (10 * 256) | ch);
                    }
                    // Dim character behind head
                    if (((h - 1) > -1) & ((h - 1) < 30)) {
                        var old: int = peek(FB + (h - 1) * 80 + i);
                        poke(FB + (h - 1) * 80 + i, (2 * 256) | (old & 255));
                    }
                    // Erase tail
                    var tail: int = h - lengths[i];
                    if ((tail > -1) & (tail < 30)) {
                        poke(FB + tail * 80 + i, 0);
                    }
                    heads[i] = h + 1;
                    if (tail > 30) {
                        heads[i] = 0 - (Demo.rng() % 20);
                        speeds[i] = (Demo.rng() % 3) + 1;
                        lengths[i] = (Demo.rng() % 10) + 5;
                    }
                }
                i = i + 1;
            }
            t = t + 1;
        }
        heads.dispose();
        speeds.dispose();
        lengths.dispose();
    }

    // =========================================================
    // SCENE 6: FIRE EFFECT - classic demoscene fire
    // =========================================================
    fn sceneFire() {
        poke(0xFF30, 1);
        Demo.clearFB();
        SEED = 2345;

        var t: int = 0;
        while (t < 120) {
            // Seed bottom two rows with random hot colors
            var base: int = FB + (59 * 40);
            var x4: int = 0;
            while (x4 < 40) {
                var r: int = Demo.rng();
                var f0: int = (r & 3) + 4;
                var f1: int = ((r >> 2) & 3) + 4;
                var f2: int = ((r >> 4) & 3) + 6;
                var f3: int = ((r >> 6) & 3) + 6;
                if ((Demo.rng() & 3) == 0) { f0 = 14; f1 = 14; }
                if ((Demo.rng() & 7) == 0) { f2 = 15; f3 = 15; }
                poke(base + x4, (f0 << 12) | (f1 << 8) | (f2 << 4) | f3);
                x4 = x4 + 1;
            }
            base = FB + (58 * 40);
            x4 = 0;
            while (x4 < 40) {
                var r2: int = Demo.rng();
                poke(base + x4, (((r2 & 3) + 4) << 12) | ((((r2 >> 2) & 3) + 4) << 8) | ((((r2 >> 4) & 3) + 4) << 4) | (((r2 >> 6) & 3) + 4));
                x4 = x4 + 1;
            }

            // Propagate fire upward: average of below rows - cooling
            var y: int = 0;
            var dstOff: int = 0;
            while (y < 58) {
                var srcOff: int = dstOff + 40;
                var src2Off: int = dstOff + 80;
                x4 = 0;
                while (x4 < 40) {
                    var below: int = peek(FB + srcOff + x4);
                    var below2: int = peek(FB + src2Off + x4);
                    var p0: int = (below >> 12) & 15;
                    var p1: int = (below >> 8) & 15;
                    var p2: int = (below >> 4) & 15;
                    var p3: int = below & 15;
                    var q0: int = (below2 >> 12) & 15;
                    var q1: int = (below2 >> 8) & 15;
                    var q2: int = (below2 >> 4) & 15;
                    var q3: int = below2 & 15;
                    var n0: int = (p0 + q0) / 2;
                    var n1: int = (p1 + q1) / 2;
                    var n2: int = (p2 + q2) / 2;
                    var n3: int = (p3 + q3) / 2;
                    if (n0 > 0) { n0 = n0 - 1; }
                    if (n1 > 0) { n1 = n1 - 1; }
                    if (n2 > 0) { n2 = n2 - 1; }
                    if (n3 > 0) { n3 = n3 - 1; }
                    poke(FB + dstOff + x4, (n0 << 12) | (n1 << 8) | (n2 << 4) | n3);
                    x4 = x4 + 1;
                }
                y = y + 1;
                dstOff = dstOff + 40;
            }
            t = t + 1;
        }
    }

    // =========================================================
    // SCENE 7: CREDITS - grand finale with animated borders
    // =========================================================
    fn sceneCredits() {
        poke(0xFF30, 0);
        Demo.clearText();

        // Decorative top border
        var i: int = 0;
        while (i < 80) {
            var bc: int = (i & 7) + 9;
            poke(FB + i, (bc * 256) | 205);
            poke(FB + 80 + i, (bc * 256) | 196);
            i = i + 1;
        }

        // Title
        var t1: String = "H A C K +   D E M O S C E N E";
        var tlen: int = t1.length();
        var cx: int = 40 - (tlen / 2);
        i = 0;
        while (i < tlen) {
            var col: int = ((i / 2) % 7) + 9;
            poke(FB + 3 * 80 + cx + i, (col * 256) | t1.charAt(i));
            i = i + 1;
        }

        // Subtitle
        var t2: String = "A 16-Bit Demo Production";
        tlen = t2.length();
        cx = 40 - (tlen / 2);
        i = 0;
        while (i < tlen) {
            poke(FB + 5 * 80 + cx + i, (15 * 256) | t2.charAt(i));
            i = i + 1;
        }

        // Credits block
        var c1: String = "Code ..... Jack++ Language";
        var c2: String = "Target ... Hack+ 16-bit CPU";
        var c3: String = "Memory ... 64K x 16-bit";
        var c4: String = "Display .. 160x60 / 80x30";
        var c5: String = "Colors ... 16 CGA Palette";
        var lines: Array = Array.new(5);
        lines[0] = c1; lines[1] = c2; lines[2] = c3; lines[3] = c4; lines[4] = c5;

        var li: int = 0;
        while (li < 5) {
            var line: String = lines[li];
            var llen: int = line.length();
            var lx: int = 40 - (llen / 2);
            i = 0;
            while (i < llen) {
                var lch: int = line.charAt(i);
                var lcol: int = 7;
                if ((lch == 46) | (lch == 32)) { lcol = 8; }
                poke(FB + (9 + li + li) * 80 + lx + i, (lcol * 256) | lch);
                i = i + 1;
            }
            li = li + 1;
        }
        lines.dispose();

        // Greeting line
        var g1: String = ">> GREETINGS TO ALL DEMOSCENERS <<";
        tlen = g1.length();
        cx = 40 - (tlen / 2);
        i = 0;
        while (i < tlen) {
            poke(FB + 21 * 80 + cx + i, (14 * 256) | g1.charAt(i));
            i = i + 1;
        }

        var g2: String = "Coded with love in Jack++";
        tlen = g2.length();
        cx = 40 - (tlen / 2);
        i = 0;
        while (i < tlen) {
            poke(FB + 23 * 80 + cx + i, (13 * 256) | g2.charAt(i));
            i = i + 1;
        }

        // Animated bottom border (rainbow blocks)
        var t: int = 0;
        while (t < 200) {
            i = 0;
            while (i < 80) {
                var fc: int = ((i + t) % 15) + 1;
                poke(FB + 27 * 80 + i, (fc * 256) | 219);
                poke(FB + 28 * 80 + i, (fc * 256) | 178);
                poke(FB + 29 * 80 + i, (fc * 256) | 176);
                i = i + 1;
            }
            t = t + 1;
        }
    }
}

// Entry point
fn main() {
    Demo.init();
    Demo.scenePlasma();
    Demo.sceneStarfield();
    Demo.sceneSineScroll();
    Demo.sceneTunnel();
    Demo.sceneMatrix();
    Demo.sceneFire();
    Demo.sceneCredits();
    halt();
}
`;

// ============================================================
// HackOS - DOS-inspired OS simulation (compact)
// ============================================================

var jackHackOsDemo = `// HackOS - A DOS-inspired OS simulation

class OS {
    static FB: int;
    static row: int;
    static col: int;
    static clr: int;
    static buf: Array;
    static blen: int;
    static on: int;
    static ticks: int;
    static seed: int;

    // ---- Core text output ----

    fn pc(ch: int) {
        if (ch == 10) {
            col = 0;
            row = row + 1;
            if (row > 29) { OS.scroll(); row = 29; }
            return;
        }
        if (ch == 8) {
            if (col > 0) { col = col - 1; poke(FB + row * 80 + col, 0); }
            return;
        }
        poke(FB + row * 80 + col, (clr << 8) | ch);
        col = col + 1;
        if (col > 79) {
            col = 0; row = row + 1;
            if (row > 29) { OS.scroll(); row = 29; }
        }
    }

    fn scroll() {
        var i: int = 0;
        while (i < 2320) {
            poke(FB + i, peek(FB + 80 + i));
            i = i + 1;
        }
        i = 0;
        while (i < 80) { poke(FB + 2320 + i, 0); i = i + 1; }
    }

    fn ps(s: String) {
        var i: int = 0;
        while (i < s.length()) { OS.pc(s.charAt(i)); i = i + 1; }
    }

    fn ln() { OS.pc(10); }

    fn pn(n: int) {
        if (n < 0) { OS.pc(45); n = 0 - n; }
        if (n > 9999) { OS.pc(((n / 10000) % 10) + 48); }
        if (n > 999) { OS.pc(((n / 1000) % 10) + 48); }
        if (n > 99) { OS.pc(((n / 100) % 10) + 48); }
        if (n > 9) { OS.pc(((n / 10) % 10) + 48); }
        OS.pc((n % 10) + 48);
    }

    fn cls() {
        var i: int = 0;
        while (i < 2400) { poke(FB + i, 0); i = i + 1; }
        row = 0; col = 0;
    }

    // ---- Keyboard ----

    fn rk() -> int {
        while (peek(65280) == 0) { }
        return peek(65281);
    }

    fn readLine() {
        blen = 0;
        while (true) {
            var ch: int = OS.rk();
            if (ch == 10) { OS.ln(); return; }
            if (ch == 8) {
                if (blen > 0) { blen = blen - 1; OS.pc(8); }
            } else {
                if (blen < 60) {
                    buf[blen] = ch;
                    blen = blen + 1;
                    OS.pc(ch);
                }
            }
        }
    }

    // ---- String matching ----

    fn up(c: int) -> int {
        if ((c > 96) & (c < 123)) { return c - 32; }
        return c;
    }

    fn eq(s: String) -> bool {
        if (blen != s.length()) { return false; }
        var i: int = 0;
        while (i < blen) {
            if (OS.up(buf[i]) != OS.up(s.charAt(i))) { return false; }
            i = i + 1;
        }
        return true;
    }

    fn sw(s: String) -> bool {
        var sl: int = s.length();
        if (blen < sl) { return false; }
        var i: int = 0;
        while (i < sl) {
            if (OS.up(buf[i]) != OS.up(s.charAt(i))) { return false; }
            i = i + 1;
        }
        return true;
    }

    fn argeq(off: int, s: String) -> bool {
        var sl: int = s.length();
        if ((blen - off) != sl) { return false; }
        var i: int = 0;
        while (i < sl) {
            if (OS.up(buf[off + i]) != OS.up(s.charAt(i))) { return false; }
            i = i + 1;
        }
        return true;
    }

    fn pargs(off: int) {
        var i: int = off;
        while (i < blen) { OS.pc(buf[i]); i = i + 1; }
    }

    // ---- Random ----

    fn rng() -> int {
        seed = seed ^ (seed << 7);
        seed = seed & 32767;
        seed = seed ^ (seed >> 5);
        seed = seed & 32767;
        seed = seed ^ (seed << 3);
        seed = seed & 32767;
        if (seed == 0) { seed = 1; }
        return seed;
    }

    // ---- Boot ----

    fn boot() {
        FB = 0xF000;
        poke(0xFF30, 0);
        clr = 7; seed = 31337; ticks = 0;
        buf = Array.new(64); blen = 0; on = 1;
        OS.cls();
        clr = 15;
        OS.ps("HackOS v1.0 [Hack+ 16-bit CPU]"); OS.ln();
        clr = 8;
        OS.ps("64K RAM. Type HELP for commands."); OS.ln();
        clr = 7;
        OS.ln();
    }

    // ---- Commands ----

    fn cHelp() {
        clr = 15; OS.ps("Commands:"); OS.ln(); clr = 7;
        OS.ps(" HELP CLS VER DIR ECHO"); OS.ln();
        OS.ps(" MEM TIME COLOR EXIT"); OS.ln();
        OS.ps(" TYPE <file>  RUN <prog>"); OS.ln();
    }

    fn cVer() {
        clr = 15;
        OS.ps("HackOS 1.0 - Hack+ 16-bit"); OS.ln();
        clr = 7;
    }

    fn cDir() {
        clr = 15; OS.ps(" C:\\HACKOS"); OS.ln(); clr = 7;
        OS.ps(" README  TXT  512"); OS.ln();
        OS.ps(" HELLO   EXE  128"); OS.ln();
        OS.ps(" MATRIX  EXE  256"); OS.ln();
        OS.ps(" CONFIG  SYS   64"); OS.ln();
        clr = 8;
        OS.ps("  4 file(s) 63488 free"); OS.ln();
        clr = 7;
    }

    fn cType() {
        if (blen < 6) { OS.ps("Usage: TYPE <file>"); OS.ln(); return; }
        if (OS.argeq(5, "README.TXT")) {
            OS.ps("Welcome to HackOS!"); OS.ln();
            OS.ps("Runs on Hack+ 16-bit CPU."); OS.ln();
            OS.ps("Try: RUN HELLO, RUN MATRIX"); OS.ln();
        } else {
            if (OS.argeq(5, "CONFIG.SYS")) {
                clr = 8;
                OS.ps("cpu=hackplus"); OS.ln();
                OS.ps("mem=65536"); OS.ln();
                clr = 7;
            } else {
                OS.ps("File not found: ");
                OS.pargs(5); OS.ln();
            }
        }
    }

    fn cMem() {
        OS.ps("Total: 65536 words"); OS.ln();
        OS.ps("Free:  ~59000 words"); OS.ln();
    }

    fn cTime() {
        OS.ps("Uptime: "); OS.pn(ticks); OS.ps(" cmds"); OS.ln();
    }

    fn cColor() {
        if (blen < 7) {
            OS.ps("COLOR <0-15>  Now: "); OS.pn(clr); OS.ln();
            return;
        }
        var c: int = buf[6] - 48;
        if ((blen > 7) & (c == 1)) { c = 10 + (buf[7] - 48); }
        if ((c < 0) | (c > 15)) { OS.ps("Bad color"); OS.ln(); return; }
        clr = c;
    }

    fn cEcho() {
        if (blen < 6) { OS.ln(); return; }
        OS.pargs(5); OS.ln();
    }

    fn cRun() {
        if (blen < 5) { OS.ps("Usage: RUN <prog>"); OS.ln(); return; }
        if (OS.argeq(4, "HELLO")) { OS.runHello(); }
        else {
            if (OS.argeq(4, "MATRIX")) { OS.runMatrix(); }
            else { OS.ps("Not found: "); OS.pargs(4); OS.ln(); }
        }
    }

    // ---- Programs ----

    fn runHello() {
        clr = 14;
        OS.ps("** Hello from HackOS! **"); OS.ln();
        clr = 7;
    }

    fn runMatrix() {
        OS.cls();
        seed = 42;
        var heads: Array = Array.new(80);
        var len: Array = Array.new(80);
        var i: int = 0;
        while (i < 80) {
            heads[i] = 0 - (OS.rng() % 30);
            len[i] = (OS.rng() % 6) + 3;
            i = i + 1;
        }
        var t: int = 0;
        while (t < 120) {
            i = 0;
            while (i < 80) {
                var h: int = heads[i];
                if ((h > -1) & (h < 30)) {
                    var ch: int = (OS.rng() % 75) + 48;
                    poke(FB + h * 80 + i, (10 << 8) | ch);
                }
                if (((h - 1) > -1) & ((h - 1) < 30)) {
                    var old: int = peek(FB + (h - 1) * 80 + i);
                    poke(FB + (h - 1) * 80 + i, (2 << 8) | (old & 255));
                }
                var tail: int = h - len[i];
                if ((tail > -1) & (tail < 30)) {
                    poke(FB + tail * 80 + i, 0);
                }
                heads[i] = h + 1;
                if (tail > 30) {
                    heads[i] = 0 - (OS.rng() % 15);
                    len[i] = (OS.rng() % 6) + 3;
                }
                i = i + 1;
            }
            t = t + 1;
        }
        heads.dispose();
        len.dispose();
        OS.cls();
        clr = 7;
        OS.ps("Matrix done."); OS.ln();
    }

    // ---- Main loop ----

    fn prompt() {
        clr = 10;
        OS.ps("C:\\>");
        clr = 7;
    }

    fn dispatch() {
        if (blen == 0) { return; }
        if (OS.eq("HELP")) { OS.cHelp(); }
        else { if (OS.eq("VER")) { OS.cVer(); }
        else { if (OS.eq("CLS")) { OS.cls(); }
        else { if (OS.eq("DIR")) { OS.cDir(); }
        else { if (OS.eq("MEM")) { OS.cMem(); }
        else { if (OS.eq("TIME")) { OS.cTime(); }
        else { if (OS.eq("EXIT")) {
            clr = 15; OS.ps("Shutting down..."); OS.ln();
            on = 0;
        }
        else { if (OS.sw("ECHO ")) { OS.cEcho(); }
        else { if (OS.sw("TYPE ")) { OS.cType(); }
        else { if (OS.sw("COLOR ")) { OS.cColor(); }
        else { if (OS.sw("RUN ")) { OS.cRun(); }
        else {
            OS.ps("Bad command: ");
            OS.pargs(0); OS.ln();
        }}}}}}}}}}}
    }

    fn run() {
        OS.boot();
        while (on == 1) {
            OS.prompt();
            OS.readLine();
            OS.dispatch();
            ticks = ticks + 1;
        }
    }
}

fn main() {
    OS.run();
    halt();
}
`;

