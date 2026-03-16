// os-boot.js — HackOS Boot: links bootloader ASM + Jack++ OS, assembles, and runs
(function() {
  "use strict";

  // --- DOM refs ---
  var bootloaderEditor = document.getElementById("bootloaderEditor");
  var osEditor = document.getElementById("osEditor");
  var bootBtn = document.getElementById("bootBtn");
  var resetBtn = document.getElementById("resetBtn");
  var pauseBtn = document.getElementById("pauseBtn");
  var resumeBtn = document.getElementById("resumeBtn");
  var toggleSetupBtn = document.getElementById("toggleSetup");
  var screen = document.getElementById("screen");
  var statusEl = document.getElementById("status");
  var errorPanel = document.getElementById("errorPanel");
  var setupPanel = document.getElementById("setupPanel");
  var speedEl = document.getElementById("speed");

  // --- Graphics setup (same as app.js) ---
  var gfxCtx = screen.getContext("2d");
  var gfxImgData = gfxCtx.createImageData(640, 240);
  var gfxBuf32 = new Uint32Array(gfxImgData.data.buffer);
  var palette32 = new Uint32Array(16);
  for (var pi = 0; pi < 16; pi++) {
    var c = PALETTE[pi];
    var r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    palette32[pi] = 0xFF000000 | (b << 16) | (g << 8) | r;
  }

  function renderFbText(fb) {
    var buf = gfxBuf32, pal = palette32, font = FONT_8X8;
    for (var row = 0; row < 30; row++) {
      var fbRowOff = row * 80, screenRowBase = row * 8 * 640;
      for (var col = 0; col < 80; col++) {
        var word = fb[fbRowOff + col];
        var bgC = pal[(word >> 12) & 15], fgC = pal[(word >> 8) & 15];
        var ch = word & 255;
        var fontBase = ch < 128 ? ch * 8 : -1;
        var colBase = screenRowBase + col * 8;
        for (var py = 0; py < 8; py++) {
          var fb2 = fontBase >= 0 ? font[fontBase + py] : 0;
          var off = colBase + py * 640;
          buf[off]     = fb2 & 128 ? fgC : bgC;
          buf[off + 1] = fb2 & 64  ? fgC : bgC;
          buf[off + 2] = fb2 & 32  ? fgC : bgC;
          buf[off + 3] = fb2 & 16  ? fgC : bgC;
          buf[off + 4] = fb2 & 8   ? fgC : bgC;
          buf[off + 5] = fb2 & 4   ? fgC : bgC;
          buf[off + 6] = fb2 & 2   ? fgC : bgC;
          buf[off + 7] = fb2 & 1   ? fgC : bgC;
        }
      }
    }
    gfxCtx.putImageData(gfxImgData, 0, 0);
  }

  function renderFbPixel(fb) {
    var buf = gfxBuf32, pal = palette32;
    for (var y = 0; y < 60; y++) {
      var fbRow = y * 40, screenBase = y * 4 * 640;
      for (var xWord = 0; xWord < 40; xWord++) {
        var word = fb[fbRow + xWord];
        var c0 = pal[word >> 12 & 15], c1 = pal[word >> 8 & 15];
        var c2 = pal[word >> 4 & 15], c3 = pal[word & 15];
        var baseX = xWord * 16;
        for (var dy = 0; dy < 4; dy++) {
          var rr = screenBase + dy * 640 + baseX;
          buf[rr]=c0;buf[rr+1]=c0;buf[rr+2]=c0;buf[rr+3]=c0;
          buf[rr+4]=c1;buf[rr+5]=c1;buf[rr+6]=c1;buf[rr+7]=c1;
          buf[rr+8]=c2;buf[rr+9]=c2;buf[rr+10]=c2;buf[rr+11]=c2;
          buf[rr+12]=c3;buf[rr+13]=c3;buf[rr+14]=c3;buf[rr+15]=c3;
        }
      }
    }
    gfxCtx.putImageData(gfxImgData, 0, 0);
  }

  // --- State ---
  var running = false;
  var displayMode = 0;
  var lastFb = new Uint16Array(2400);
  var keyboardQueue = [];
  var wKbSt = 0;
  var rafId = 0;
  var pendingRender = false;

  // --- Worker ---
  var emu = new Worker("js/emu-worker.js");

  emu.onmessage = function(e) {
    var msg = e.data;
    switch (msg.t) {
      case "snap":
        lastFb = new Uint16Array(msg.fb);
        displayMode = msg.dm;
        wKbSt = msg.ks;
        if (msg.u && msg.u.length > 0) { /* UART output — could show in a console panel */ }
        if (running) {
          pendingRender = true;
          if (!rafId) rafId = requestAnimationFrame(renderFrame);
        } else {
          renderScreen();
        }
        break;
      case "stop":
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        pendingRender = false;
        if (msg.reason === "halted") setStatus("CPU stoppet (HALT).");
        else setStatus("Pauset.");
        renderScreen();
        break;
      case "dm":
        displayMode = msg.mode;
        break;
    }
  };

  function renderScreen() {
    if (displayMode === 0) renderFbText(lastFb); else renderFbPixel(lastFb);
  }

  function renderFrame() {
    rafId = 0;
    if (pendingRender) { renderScreen(); pendingRender = false; }
    if (running) rafId = requestAnimationFrame(renderFrame);
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (isError ? " error" : "");
  }

  function showErrors(text) {
    errorPanel.textContent = text;
    errorPanel.classList.toggle("visible", !!text);
  }

  // --- Keyboard input → emulator ---
  function pumpInputQueue() {
    if (!keyboardQueue.length) return;
    if (wKbSt === 0) {
      var ascii = keyboardQueue.shift();
      emu.postMessage({t: "key", a: ascii});
    }
  }
  setInterval(function() { if (running) pumpInputQueue(); }, 50);

  screen.addEventListener("keydown", function(ev) {
    var ascii = asciiFromKey(ev);
    if (ascii !== null) { keyboardQueue.push(ascii); pumpInputQueue(); ev.preventDefault(); }
  });
  screen.addEventListener("click", function() { screen.focus(); });

  // --- Compile & Link ---
  /**
   * Compiles Jack++ OS to assembly, prepends the bootloader ASM,
   * generates the VM bootstrap, assembles everything into machine code.
   *
   * Memory layout:
   *   [0x0000 ...] Bootloader ASM
   *   [continued ]  __vm_boot: VM bootstrap (sets SP, base ptrs, calls Main.main)
   *   [continued ]  Jack++ stdlib + OS compiled assembly
   */
  function compileAndLink(bootloaderSrc, osSrc) {
    showErrors("");

    // 1. Compile Jack++ OS → VM code
    var vmCode;
    try {
      var parser = new Parser(osSrc);
      var ast = parser.parse();
      var codegen = new CodeGenerator();
      vmCode = codegen.generate(ast, "Main");
    } catch (e) {
      return { success: false, error: "Jack++ kompileringsfeil:\n" + e.message };
    }

    // 2. Translate VM code (with stdlib) → assembly
    var fullVM = STDLIB_VM + "\n" + vmCode;
    var vmTranslator = new VMTranslator();
    var vmResult = vmTranslator.translate(fullVM, "Main");
    if (!vmResult.success) {
      return { success: false, error: "VM-oversetterfeil:\n" + vmResult.errors.join("\n") };
    }

    // 3. Generate the VM bootstrap with a label the bootloader can jump to
    var vmBootstrap = [
      "",
      "; === VM Bootstrap (auto-generated) ===",
      "__vm_boot:",
      "    LDA SP, 0xEFF0",
      "",
      "    LDA A, 1",
      "    LDA D, 0xEFF0",
      "    STORE D, [A+0]",
      "    LDA A, 2",
      "    STORE D, [A+0]",
      "",
      "    LDA D, __vm_halt",
      "    PUSH D",
      "    LDA D, 0xEFF0",
      "    PUSH D",
      "    PUSH D",
      "    LDI D, 0",
      "    PUSH D",
      "    PUSH D",
      "",
      "    MOV D, SP",
      "    PUSH B",
      "    LDI B, 4",
      "    ADD D, B",
      "    LDA A, 2",
      "    STORE D, [A+0]",
      "    POP B",
      "",
      "    MOV D, SP",
      "    LDA A, 1",
      "    STORE D, [A+0]",
      "",
      "    LDA A, Main.main",
      "    JMP",
      "__vm_halt:",
      "    HALT",
      ""
    ].join("\n");

    // 4. Concatenate: bootloader ASM + VM bootstrap + compiled Jack++ ASM
    var fullAssembly = bootloaderSrc + "\n" + vmBootstrap + "\n" + vmResult.assembly;

    // 5. Assemble
    var assembler = new Assembler();
    var asmResult = assembler.assemble(fullAssembly);
    if (!asmResult.success) {
      return { success: false, error: "Assembly-feil:\n" + asmResult.errors.join("\n") };
    }

    return { success: true, code: asmResult.code, symbols: asmResult.symbols, fullAssembly: fullAssembly };
  }

  // --- Boot ---
  function boot() {
    var bootloaderSrc = bootloaderEditor.value;
    var osSrc = osEditor.value;

    setStatus("Kompilerer og linker...");
    var result = compileAndLink(bootloaderSrc, osSrc);

    if (!result.success) {
      setStatus("Kompilering feilet.", true);
      showErrors(result.error);
      return;
    }

    showErrors("");

    // Reset and load
    var buf = result.code.buffer.slice(0);
    emu.postMessage({t: "load", code: buf}, [buf]);

    // Collapse setup panel and focus screen
    setupPanel.classList.add("collapsed");
    toggleSetupBtn.textContent = "\u25B6";

    // Run
    running = true;
    keyboardQueue = [];
    var speed = Number(speedEl.value) || 500000;
    emu.postMessage({t: "run", speed: speed});
    if (!rafId) rafId = requestAnimationFrame(renderFrame);
    setStatus("HackOS bootet — " + result.code.length + " ord lastet. Klikk skjermen for tastaturinput.");
    screen.focus();
  }

  // --- Controls ---
  bootBtn.addEventListener("click", boot);

  resetBtn.addEventListener("click", function() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    emu.postMessage({t: "reset"});
    keyboardQueue = [];
    setStatus("Maskinen nullstilt. Klikk Boot for å starte.");
    renderScreen();
  });

  pauseBtn.addEventListener("click", function() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    emu.postMessage({t: "pause"});
    setStatus("Pauset.");
  });

  resumeBtn.addEventListener("click", function() {
    running = true;
    var speed = Number(speedEl.value) || 500000;
    emu.postMessage({t: "run", speed: speed});
    if (!rafId) rafId = requestAnimationFrame(renderFrame);
    setStatus("Kjører...");
    screen.focus();
  });

  toggleSetupBtn.addEventListener("click", function() {
    var collapsed = setupPanel.classList.toggle("collapsed");
    toggleSetupBtn.textContent = collapsed ? "\u25B6" : "\u25C0";
  });

  speedEl.addEventListener("input", function() {
    emu.postMessage({t: "spd", v: Number(speedEl.value)});
  });

  // Clean up on page close
  window.addEventListener("beforeunload", function() { emu.terminate(); });

  // Initial render
  renderScreen();
  setStatus("Klar. Rediger bootloader og OS-kode, klikk deretter Boot.");

})();
