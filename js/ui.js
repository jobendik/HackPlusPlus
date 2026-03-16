// Build the UI DOM structure
function buildUi() {
  document.body.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div>
        <h1>Hack+ Assembler + Emulator <span class="jack-badge">Jack++ IDE</span></h1>
        <div class="subtitle">Skriv assembly eller Jack++, kompiler, assembler, kjør, step, sett breakpoints og se skjerm/RAM/I/O.</div>
      </div>
      <div class="top-actions toolbar compact">
        <div class="mode-toggle" id="modeToggle">
          <button class="mode-btn active" data-mode="asm">ASM</button>
          <button class="mode-btn" data-mode="jack">Jack++</button>
        </div>
        <span class="mode-divider"></span>
        <span id="demoButtonsAsm">
          <button id="loadTextDemo">Tekst</button>
          <button id="loadPixelDemo">Piksler</button>
          <button id="loadMosaicDemo">Mosaikk</button>
          <button id="loadKeyboardDemo">Tastatur</button>
        </span>
        <span id="demoButtonsJack" style="display:none">
          <button id="loadJackHello">Hello</button>
          <button id="loadJackMath">Matte</button>
          <button id="loadJackPixel">Piksler</button>
          <button id="loadJackClass">Klasser</button>
          <button id="loadJackDemoScene">Demoscene</button>
          <button id="loadJackHackOs">HackOS</button>
        </span>
      </div>
    </header>

    <main class="main-grid">
      <section class="panel editor-panel">
        <div class="panel-title-row">
          <h2 id="editorTitle">Kildekode <span class="editor-lang-tag" id="editorLangTag">ASM</span></h2>
          <div class="toolbar compact">
            <button id="assembleBtn">Assemble & load</button>
            <button id="compileBtn" style="display:none">Compile & Run</button>
            <button id="resetBtn">Reset</button>
            <button id="stepBtn">Step</button>
            <button id="runBtn">Run</button>
            <button id="pauseBtn">Pause</button>
          </div>
        </div>
        <textarea id="editor" spellcheck="false"></textarea>
        <div class="toolbar footerbar">
          <label>Hastighet <input id="speed" type="range" min="1000" max="5000000" value="500000" step="10000"></label>
          <span id="speedLabel">500K instr./batch</span>
          <button id="copyMachineBtn">Kopier maskinkode</button>
          <button id="downloadMachineBtn">Last ned .txt</button>
        </div>
        <div id="errors" class="errors"></div>
      </section>

      <section class="panel screen-panel">
        <div class="panel-title-row tight">
          <h2>Skjerm</h2>
          <div class="status-line" id="cpuStatus"></div>
        </div>
        <div class="screen-wrap big">
          <canvas id="screen" width="640" height="240" tabindex="0" aria-label="Hack Plus screen"></canvas>
        </div>
        <div class="screen-toolbar">
          <div class="hint">Klikk på skjermen for fokus og tastaturinput. Skjermen holder seg synlig under Run.</div>
        </div>
      </section>

      <section class="panel inspector-panel">
        <div class="panel-title-row">
          <h2>Inspektør</h2>
          <div class="inspector-tabbar">
            <button class="inspector-tab active" data-tab="listing">Listing</button>
            <button class="inspector-tab" data-tab="memory">Minne</button>
            <button class="inspector-tab" data-tab="pipeline" id="pipelineTabBtn" style="display:none">Pipeline</button>
            <button class="inspector-tab" data-tab="tools">Verktøy</button>
          </div>
        </div>

        <div class="tab-panels">
          <div class="tab-panel active" data-panel="listing">
            <div class="panel-title-row small-gap">
              <div class="hint">Klikk en rad for breakpoint. Dobbeltklikk for å hoppe i minnevisningen.</div>
            </div>
            <div id="listing" class="listing"></div>
          </div>

          <div class="tab-panel" data-panel="memory">
            <div class="panel-title-row small-gap">
              <h2>Minneinspektør</h2>
              <div class="toolbar compact">
                <button id="memPrevBtn">− 0x0080</button>
                <button id="memNextBtn">+ 0x0080</button>
                <button id="jumpPcBtn">Til PC</button>
                <button id="jumpFbBtn">Til framebuffer</button>
                <input id="memoryAddrInput" class="small-input" placeholder="0xF000">
                <button id="jumpMemoryBtn">Gå</button>
              </div>
            </div>
            <div id="memoryInfo" class="meta-line"></div>
            <div class="memory-scroll">
              <div id="memoryGrid" class="memory-grid"></div>
            </div>
          </div>

          <div class="tab-panel" data-panel="pipeline">
            <div class="pipeline-layout">
              <div class="pipeline-col">
                <h3>VM-kode (fra Jack++ kompilator)</h3>
                <pre id="pipelineVM" class="pipeline-pre"></pre>
              </div>
              <div class="pipeline-col">
                <h3>Generert assembly (fra VM-translator)</h3>
                <pre id="pipelineASM" class="pipeline-pre"></pre>
              </div>
            </div>
          </div>

          <div class="tab-panel" data-panel="tools">
            <div class="tools-grid">
              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>Breakpoints</h2>
                  <span class="hint">Klikk på en listing-rad</span>
                </div>
                <div class="toolbar slim">
                  <input id="breakpointInput" class="small-input" placeholder="0x0010">
                  <button id="addBreakpointBtn">Legg til</button>
                  <button id="clearBreakpointsBtn">Fjern alle</button>
                </div>
                <div id="breakpoints" class="chip-wrap"></div>
              </section>

              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>Tastatur inn</h2>
                  <span class="hint">Fokusér skjermen eller bruk feltet</span>
                </div>
                <div class="toolbar slim">
                  <input id="keyboardInput" class="grow-input" placeholder="Skriv her og send til maskinen">
                  <button id="sendKeyboardBtn">Send</button>
                  <button id="sendEnterBtn">+ Enter</button>
                </div>
                <div id="queueInfo" class="meta-line"></div>
              </section>

              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>Registere</h2>
                  <span class="hint">Live CPU-status</span>
                </div>
                <div id="registers" class="register-grid"></div>
              </section>

              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>UART</h2>
                  <span class="hint">Seriell output</span>
                </div>
                <pre id="uartOut" class="console"></pre>
              </section>

              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>Skjermprobe</h2>
                  <span class="hint">Flytt musen over skjermen</span>
                </div>
                <div id="screenProbe" class="probe-box">Ingen piksel/celle valgt ennå.</div>
              </section>

              <section class="tool-card">
                <div class="panel-title-row small-gap">
                  <h2>Maskinstatus</h2>
                  <span class="hint">I/O og siste RAM-skriving</span>
                </div>
                <div id="deviceState" class="probe-box"></div>
              </section>

              <section class="tool-card tools-span-2">
                <div class="panel-title-row small-gap">
                  <h2>Symboler</h2>
                  <span class="hint">Etter siste assembly</span>
                </div>
                <pre id="symbols" class="mini-console"></pre>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  `;

}


