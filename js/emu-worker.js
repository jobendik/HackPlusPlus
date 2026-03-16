  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var FAULT_FETCH = 16;
  var FAULT_LOAD = 17;
  var FAULT_STORE = 18;
  var FAULT_STACK = 19;
  var FAULT_PRIVILEGE = 20;
  var FAULT_IO = 21;

  var CPU = class _CPU {
    constructor(memory) {
      // Visible registers
      __publicField(this, "A", 0);
      __publicField(this, "D", 0);
      __publicField(this, "B", 0);
      __publicField(this, "SP", 0);
      __publicField(this, "PC", 0);
      // Control registers
      __publicField(this, "STATUS", 0);
      // [15..4:reserved][3:MODE][2:IE][1:N][0:Z]
      __publicField(this, "EPC", 0);
      __publicField(this, "CAUSE", 0);
      __publicField(this, "BASE", 0);
      __publicField(this, "LIMIT", 65535);
      __publicField(this, "KSP", 0);
      // State
      __publicField(this, "halted", false);
      __publicField(this, "doubleFault", false);
      __publicField(this, "cycleCount", 0);
      __publicField(this, "activeMode", false);
      // The real execution mode: false=kernel, true=user
      // Flags (cached from STATUS)
      __publicField(this, "flagN", false);
      __publicField(this, "flagZ", false);
      __publicField(this, "memory");
      __publicField(this, "inFaultHandler", false);
      this.memory = memory;
    }
    get ie() {
      return !!(this.STATUS & 4);
    }
    get mode() {
      return this.activeMode;
    }
    // ============================================================
    // Public API
    // ============================================================
    reset() {
      this.A = 0;
      this.D = 0;
      this.B = 0;
      this.SP = 0;
      this.KSP = 0;
      this.PC = 0;
      this.STATUS = 0;
      this.EPC = 0;
      this.CAUSE = 0;
      this.BASE = 0;
      this.LIMIT = 65535;
      this.flagN = false;
      this.flagZ = false;
      this.halted = false;
      this.doubleFault = false;
      this.inFaultHandler = false;
      this.cycleCount = 0;
      this.activeMode = false;
    }
    step() {
      if (this.halted) return false;
      this.checkInterrupts();
      const fetchResult = this.translate(this.PC, "fetch");
      if (fetchResult === null) return true;
      const instruction = this.memory.read(fetchResult);
      this.PC = this.PC + 1 & 65535;
      this.execute(instruction);
      this.cycleCount++;
      return !this.halted;
    }
    run(maxSteps) {
      let executed = 0;
      while (executed < maxSteps && !this.halted) {
        this.step();
        executed++;
      }
      return executed;
    }
    /**
     * High-performance batch execution.
     * Inlines the entire fetch-decode-execute loop with registers in locals
     * and direct RAM access. Falls back to step() for privileged/interrupt ops.
     * Returns number of cycles executed.
     */
    runFast(maxCycles) {
      if (this.halted) return 0;
      const ram = this.memory.ram;
      let A = this.A;
      let D = this.D;
      let B = this.B;
      let SP = this.SP;
      let PC = this.PC;
      let fN = this.flagN;
      let fZ = this.flagZ;
      let cycles = 0;
      const canFast = !this.activeMode && !(this.STATUS & 4);
      if (!canFast) {
        while (cycles < maxCycles && !this.halted) {
          this.step();
          cycles++;
        }
        return cycles;
      }
      while (cycles < maxCycles) {
        const instr = ram[PC];
        PC = PC + 1 & 65535;
        const op = instr >> 12 & 15;
        switch (op) {
          case 0: {
            const dst = instr >> 10 & 3;
            const imm10 = instr & 1023;
            const val = (imm10 & 1023 ^ 512) - 512 & 65535;
            switch (dst) {
              case 0:
                A = val;
                break;
              case 1:
                D = val;
                break;
              case 2:
                B = val;
                break;
              case 3:
                SP = val;
                break;
            }
            break;
          }
          case 1: {
            const dst = instr >> 10 & 3;
            const imm6 = instr & 63;
            let cur;
            switch (dst) {
              case 0:
                cur = A;
                break;
              case 1:
                cur = D;
                break;
              case 2:
                cur = B;
                break;
              default:
                cur = SP;
                break;
            }
            const res = cur & 1023 | (imm6 & 63) << 10;
            switch (dst) {
              case 0:
                A = res;
                break;
              case 1:
                D = res;
                break;
              case 2:
                B = res;
                break;
              case 3:
                SP = res;
                break;
            }
            break;
          }
          case 2: {
            const dst = instr >> 10 & 3;
            const src = instr >> 8 & 3;
            let a, b;
            switch (dst) {
              case 0:
                a = A;
                break;
              case 1:
                a = D;
                break;
              case 2:
                a = B;
                break;
              default:
                a = SP;
                break;
            }
            switch (src) {
              case 0:
                b = A;
                break;
              case 1:
                b = D;
                break;
              case 2:
                b = B;
                break;
              default:
                b = SP;
                break;
            }
            const r = a + b & 65535;
            switch (dst) {
              case 0:
                A = r;
                break;
              case 1:
                D = r;
                break;
              case 2:
                B = r;
                break;
              case 3:
                SP = r;
                break;
            }
            fZ = r === 0;
            fN = !!(r & 32768);
            break;
          }
          case 3: {
            const dst = instr >> 10 & 3;
            const src = instr >> 8 & 3;
            let a, b;
            switch (dst) {
              case 0:
                a = A;
                break;
              case 1:
                a = D;
                break;
              case 2:
                a = B;
                break;
              default:
                a = SP;
                break;
            }
            switch (src) {
              case 0:
                b = A;
                break;
              case 1:
                b = D;
                break;
              case 2:
                b = B;
                break;
              default:
                b = SP;
                break;
            }
            const r = a - b & 65535;
            switch (dst) {
              case 0:
                A = r;
                break;
              case 1:
                D = r;
                break;
              case 2:
                B = r;
                break;
              case 3:
                SP = r;
                break;
            }
            fZ = r === 0;
            fN = !!(r & 32768);
            break;
          }
          case 4: {
            const dst = instr >> 10 & 3;
            const src = instr >> 8 & 3;
            let a, b;
            switch (dst) {
              case 0:
                a = A;
                break;
              case 1:
                a = D;
                break;
              case 2:
                a = B;
                break;
              default:
                a = SP;
                break;
            }
            switch (src) {
              case 0:
                b = A;
                break;
              case 1:
                b = D;
                break;
              case 2:
                b = B;
                break;
              default:
                b = SP;
                break;
            }
            const r = a & b;
            switch (dst) {
              case 0:
                A = r;
                break;
              case 1:
                D = r;
                break;
              case 2:
                B = r;
                break;
              case 3:
                SP = r;
                break;
            }
            fZ = r === 0;
            fN = !!(r & 32768);
            break;
          }
          case 5: {
            const dst = instr >> 10 & 3;
            const src = instr >> 8 & 3;
            let a, b;
            switch (dst) {
              case 0:
                a = A;
                break;
              case 1:
                a = D;
                break;
              case 2:
                a = B;
                break;
              default:
                a = SP;
                break;
            }
            switch (src) {
              case 0:
                b = A;
                break;
              case 1:
                b = D;
                break;
              case 2:
                b = B;
                break;
              default:
                b = SP;
                break;
            }
            const r = a | b;
            switch (dst) {
              case 0:
                A = r;
                break;
              case 1:
                D = r;
                break;
              case 2:
                B = r;
                break;
              case 3:
                SP = r;
                break;
            }
            fZ = r === 0;
            fN = !!(r & 32768);
            break;
          }
          case 6: {
            const dst = instr >> 10 & 3;
            const subOp = instr >> 7 & 7;
            const src = instr >> 5 & 3;
            let a;
            switch (dst) {
              case 0:
                a = A;
                break;
              case 1:
                a = D;
                break;
              case 2:
                a = B;
                break;
              default:
                a = SP;
                break;
            }
            let r;
            switch (subOp) {
              case 0:
                r = ~a & 65535;
                break;
              // NOT
              case 1:
                r = a << 1 & 65535;
                break;
              // SHL
              case 2: {
                const s = a & 32768 ? a | ~65535 : a;
                r = s >> 1 & 65535;
                break;
              }
              // ASR
              case 3: {
                switch (src) {
                  case 0:
                    r = A;
                    break;
                  case 1:
                    r = D;
                    break;
                  case 2:
                    r = B;
                    break;
                  default:
                    r = SP;
                    break;
                }
                r &= 65535;
                break;
              }
              // MOV
              case 4: {
                let sv;
                switch (src) {
                  case 0:
                    sv = A;
                    break;
                  case 1:
                    sv = D;
                    break;
                  case 2:
                    sv = B;
                    break;
                  default:
                    sv = SP;
                    break;
                }
                r = (a ^ sv) & 65535;
                break;
              }
              // XOR
              default:
                r = 0;
            }
            switch (dst) {
              case 0:
                A = r;
                break;
              case 1:
                D = r;
                break;
              case 2:
                B = r;
                break;
              case 3:
                SP = r;
                break;
            }
            fZ = r === 0;
            fN = !!(r & 32768);
            break;
          }
          case 7: {
            const dst = instr >> 10 & 3;
            const off8 = instr & 255;
            const offset = (off8 ^ 128) - 128;
            const addr = A + offset & 65535;
            let val;
            if (addr >= 65280) {
              val = this.memory.read(addr);
            } else {
              val = ram[addr];
            }
            switch (dst) {
              case 0:
                A = val;
                break;
              case 1:
                D = val;
                break;
              case 2:
                B = val;
                break;
              case 3:
                SP = val;
                break;
            }
            break;
          }
          case 8: {
            const src = instr >> 10 & 3;
            const off8 = instr & 255;
            const offset = (off8 ^ 128) - 128;
            const addr = A + offset & 65535;
            let sv;
            switch (src) {
              case 0:
                sv = A;
                break;
              case 1:
                sv = D;
                break;
              case 2:
                sv = B;
                break;
              default:
                sv = SP;
                break;
            }
            if (addr >= 65280) {
              this.memory.write(addr, sv);
            } else {
              ram[addr] = sv & 65535;
            }
            break;
          }
          case 9: {
            const nzp = instr >> 9 & 7;
            const off9 = instr & 511;
            const offset = (off9 ^ 256) - 256;
            const n = nzp & 4 ? fN : false;
            const z = nzp & 2 ? fZ : false;
            const p = nzp & 1 ? !fN && !fZ : false;
            if (n || z || p) PC = PC + offset & 65535;
            break;
          }
          case 10: {
            PC = A & 65535;
            break;
          }
          case 11: {
            SP = SP - 1 & 65535;
            ram[SP] = PC;
            PC = A & 65535;
            break;
          }
          case 12: {
            const dir = instr >> 11 & 1;
            const reg = instr >> 9 & 3;
            if (dir === 0) {
              let v;
              switch (reg) {
                case 0:
                  v = A;
                  break;
                case 1:
                  v = D;
                  break;
                case 2:
                  v = B;
                  break;
                default:
                  v = SP;
                  break;
              }
              SP = SP - 1 & 65535;
              ram[SP] = v;
            } else {
              const v = ram[SP];
              if (reg === 3) {
                SP = v;
              } else {
                switch (reg) {
                  case 0:
                    A = v;
                    break;
                  case 1:
                    D = v;
                    break;
                  case 2:
                    B = v;
                    break;
                }
                SP = SP + 1 & 65535;
              }
            }
            break;
          }
          case 13:
          // TRAP
          case 14: {
            this.A = A;
            this.D = D;
            this.B = B;
            this.SP = SP;
            this.PC = PC - 1 & 65535;
            this.flagN = fN;
            this.flagZ = fZ;
            this.STATUS = this.STATUS & ~3 | (fN ? 2 : 0) | (fZ ? 1 : 0);
            this.cycleCount += cycles;
            this.step();
            if (this.halted || this.activeMode || this.STATUS & 4) {
              return cycles + 1;
            }
            A = this.A;
            D = this.D;
            B = this.B;
            SP = this.SP;
            PC = this.PC;
            fN = this.flagN;
            fZ = this.flagZ;
            cycles++;
            continue;
          }
          case 15: {
            PC = ram[SP];
            SP = SP + 1 & 65535;
            break;
          }
        }
        cycles++;
      }
      this.A = A;
      this.D = D;
      this.B = B;
      this.SP = SP;
      this.PC = PC;
      this.flagN = fN;
      this.flagZ = fZ;
      this.STATUS = this.STATUS & ~3 | (fN ? 2 : 0) | (fZ ? 1 : 0);
      this.cycleCount += cycles;
      return cycles;
    }
    getState() {
      return {
        A: this.A & 65535,
        D: this.D & 65535,
        B: this.B & 65535,
        SP: this.SP & 65535,
        PC: this.PC & 65535,
        STATUS: this.STATUS & 65535,
        EPC: this.EPC & 65535,
        CAUSE: this.CAUSE & 65535,
        BASE: this.BASE & 65535,
        LIMIT: this.LIMIT & 65535,
        KSP: this.KSP & 65535,
        flagN: this.flagN,
        flagZ: this.flagZ,
        ie: this.ie,
        mode: this.mode,
        cycleCount: this.cycleCount
      };
    }
    // ============================================================
    // Address translation & memory protection
    // ============================================================
    translate(virtualAddr, accessType) {
      const addr = virtualAddr & 65535;
      if (!this.mode) {
        return addr;
      }
      if (addr >= 65280) {
        this.raiseFault(FAULT_IO);
        return null;
      }
      if (addr >= this.LIMIT) {
        const faultMap = {
          "fetch": FAULT_FETCH,
          "load": FAULT_LOAD,
          "store": FAULT_STORE,
          "stack": FAULT_STACK
        };
        this.raiseFault(faultMap[accessType]);
        return null;
      }
      return this.BASE + addr & 65535;
    }
    // ============================================================
    // Fault system
    // ============================================================
    raiseFault(cause) {
      if (this.inFaultHandler) {
        this.doubleFault = true;
        this.halted = true;
        return;
      }
      this.inFaultHandler = true;
      this.EPC = this.PC - 1 & 65535;
      this.CAUSE = (this.STATUS & 255) << 8 | cause & 255;
      const oldStatus = this.STATUS;
      const wasUser = !!(oldStatus & 8);
      this.STATUS = oldStatus & ~12;
      this.activeMode = false;
      if (wasUser) {
        const tmp = this.SP;
        this.SP = this.KSP;
        this.KSP = tmp;
      }
      this.PC = 12;
    }
    // ============================================================
    // Interrupt system
    // ============================================================
    checkInterrupts() {
      if (!this.ie) return;
      const pending = this.memory.read(65520);
      const mask = this.memory.read(65521);
      const active = pending & mask;
      if (active === 0) return;
      let irq = 0;
      for (let i = 0; i < 8; i++) {
        if (active & 1 << i) {
          irq = i;
          break;
        }
      }
      this.EPC = this.PC;
      this.CAUSE = (this.STATUS & 255) << 8 | irq & 255;
      this.memory.write(65520, 1 << irq);
      const oldStatus = this.STATUS;
      const wasUser = !!(oldStatus & 8);
      this.STATUS = oldStatus & ~12;
      this.activeMode = false;
      if (wasUser) {
        const tmp = this.SP;
        this.SP = this.KSP;
        this.KSP = tmp;
      }
      this.PC = 4;
    }
    // ============================================================
    // Instruction execution
    // ============================================================
    execute(instruction) {
      const opcode = instruction >> 12 & 15;
      switch (opcode) {
        case 0:
          this.execLDI(instruction);
          break;
        case 1:
          this.execLDU(instruction);
          break;
        case 2:
          this.execALU(instruction, "ADD");
          break;
        case 3:
          this.execALU(instruction, "SUB");
          break;
        case 4:
          this.execALU(instruction, "AND");
          break;
        case 5:
          this.execALU(instruction, "OR");
          break;
        case 6:
          this.execALU2(instruction);
          break;
        case 7:
          this.execLOAD(instruction);
          break;
        case 8:
          this.execSTORE(instruction);
          break;
        case 9:
          this.execBR(instruction);
          break;
        case 10:
          this.execJMP();
          break;
        case 11:
          this.execCALL();
          break;
        case 12:
          this.execSTACK(instruction);
          break;
        case 13:
          this.execTRAP(instruction);
          break;
        case 14:
          this.execSYS(instruction);
          break;
        case 15:
          this.execRET();
          break;
      }
    }
    // --- Register read/write helpers ---
    readReg(idx) {
      switch (idx & 3) {
        case 0:
          return this.A & 65535;
        case 1:
          return this.D & 65535;
        case 2:
          return this.B & 65535;
        case 3:
          return this.SP & 65535;
        default:
          return 0;
      }
    }
    writeReg(idx, value) {
      const v = value & 65535;
      switch (idx & 3) {
        case 0:
          this.A = v;
          break;
        case 1:
          this.D = v;
          break;
        case 2:
          this.B = v;
          break;
        case 3:
          this.SP = v;
          break;
      }
    }
    updateFlags(value) {
      const v = value & 65535;
      this.flagZ = v === 0;
      this.flagN = !!(v & 32768);
      this.STATUS = this.STATUS & ~3 | (this.flagN ? 2 : 0) | (this.flagZ ? 1 : 0);
    }
    signExtend(value, bits) {
      const mask = 1 << bits - 1;
      const val = value & (1 << bits) - 1;
      return (val ^ mask) - mask;
    }
    // --- Instruction implementations ---
    execLDI(instr) {
      const dst = instr >> 10 & 3;
      const imm10 = instr & 1023;
      const value = this.signExtend(imm10, 10) & 65535;
      this.writeReg(dst, value);
    }
    execLDU(instr) {
      const dst = instr >> 10 & 3;
      const imm6 = instr & 63;
      const current = this.readReg(dst);
      const result = current & 1023 | (imm6 & 63) << 10;
      this.writeReg(dst, result);
    }
    execALU(instr, op) {
      const dst = instr >> 10 & 3;
      const src = instr >> 8 & 3;
      const a = this.readReg(dst);
      const b = this.readReg(src);
      let result;
      switch (op) {
        case "ADD":
          result = a + b & 65535;
          break;
        case "SUB":
          result = a - b & 65535;
          break;
        case "AND":
          result = a & b;
          break;
        case "OR":
          result = a | b;
          break;
        default:
          result = 0;
      }
      this.writeReg(dst, result);
      this.updateFlags(result);
    }
    execALU2(instr) {
      const dst = instr >> 10 & 3;
      const subOp = instr >> 7 & 7;
      const src = instr >> 5 & 3;
      const a = this.readReg(dst);
      let result;
      switch (subOp) {
        case 0:
          result = ~a & 65535;
          break;
        // NOT
        case 1:
          result = a << 1 & 65535;
          break;
        // SHL
        case 2: {
          const signed = a & 32768 ? a | ~65535 : a;
          result = signed >> 1 & 65535;
          break;
        }
        case 3:
          result = this.readReg(src) & 65535;
          break;
        // MOV
        case 4:
          result = (a ^ this.readReg(src)) & 65535;
          break;
        // XOR
        default:
          result = 0;
      }
      this.writeReg(dst, result);
      this.updateFlags(result);
    }
    execLOAD(instr) {
      const dst = instr >> 10 & 3;
      const offset = this.signExtend(instr & 255, 8);
      const addr = this.A + offset & 65535;
      const physAddr = this.translate(addr, "load");
      if (physAddr === null) return;
      this.writeReg(dst, this.memory.read(physAddr));
    }
    execSTORE(instr) {
      const src = instr >> 10 & 3;
      const offset = this.signExtend(instr & 255, 8);
      const addr = this.A + offset & 65535;
      const physAddr = this.translate(addr, "store");
      if (physAddr === null) return;
      this.memory.write(physAddr, this.readReg(src));
    }
    execBR(instr) {
      const nzp = instr >> 9 & 7;
      const offset = this.signExtend(instr & 511, 9);
      const n = nzp & 4 ? this.flagN : false;
      const z = nzp & 2 ? this.flagZ : false;
      const p = nzp & 1 ? !this.flagN && !this.flagZ : false;
      if (n || z || p) {
        this.PC = this.PC + offset & 65535;
      }
    }
    execJMP() {
      this.PC = this.A & 65535;
    }
    execCALL() {
      this.SP = this.SP - 1 & 65535;
      const physAddr = this.translate(this.SP, "stack");
      if (physAddr === null) return;
      this.memory.write(physAddr, this.PC);
      this.PC = this.A & 65535;
    }
    execRET() {
      const physAddr = this.translate(this.SP, "stack");
      if (physAddr === null) return;
      this.PC = this.memory.read(physAddr);
      this.SP = this.SP + 1 & 65535;
    }
    execSTACK(instr) {
      const dir = instr >> 11 & 1;
      const reg = instr >> 9 & 3;
      if (dir === 0) {
        const value = this.readReg(reg);
        this.SP = this.SP - 1 & 65535;
        const physAddr = this.translate(this.SP, "stack");
        if (physAddr === null) return;
        this.memory.write(physAddr, value);
      } else {
        const physAddr = this.translate(this.SP, "stack");
        if (physAddr === null) return;
        const value = this.memory.read(physAddr);
        if (reg === 3) {
          this.SP = value;
        } else {
          this.writeReg(reg, value);
          this.SP = this.SP + 1 & 65535;
        }
      }
    }
    execTRAP(instr) {
      const trapNum = instr & 4095;
      this.EPC = this.PC;
      this.CAUSE = trapNum;
      const oldStatus = this.STATUS;
      const wasUser = !!(oldStatus & 8);
      this.STATUS = oldStatus & ~12;
      this.activeMode = false;
      if (wasUser) {
        const tmp = this.SP;
        this.SP = this.KSP;
        this.KSP = tmp;
      }
      this.PC = 8;
    }
    execSYS(instr) {
      const subOp = instr >> 8 & 15;
      if (this.mode) {
        this.raiseFault(FAULT_PRIVILEGE);
        return;
      }
      switch (subOp) {
        case 0: {
          const targetIsUser = !!(this.STATUS & 8);
          if (targetIsUser) {
            const tmp = this.SP;
            this.SP = this.KSP;
            this.KSP = tmp;
          }
          this.PC = this.EPC;
          this.activeMode = targetIsUser;
          this.inFaultHandler = false;
          break;
        }
        case 1: {
          const dst = instr >> 6 & 3;
          const cr = instr >> 3 & 7;
          this.writeReg(dst, this.readCtrlReg(cr));
          break;
        }
        case 2: {
          const src = instr >> 6 & 3;
          const cr = instr >> 3 & 7;
          this.writeCtrlReg(cr, this.readReg(src));
          break;
        }
        case 3: {
          this.halted = true;
          break;
        }
      }
    }
    // ============================================================
    // Control register access
    // ============================================================
    readCtrlReg(idx) {
      switch (idx) {
        case 0:
          return this.STATUS & 65535;
        case 1:
          return this.EPC & 65535;
        case 2:
          return this.CAUSE & 65535;
        case 3:
          return this.BASE & 65535;
        case 4:
          return this.LIMIT & 65535;
        case 5:
          return this.KSP & 65535;
        default:
          return 0;
      }
    }
    writeCtrlReg(idx, value) {
      const v = value & 65535;
      switch (idx) {
        case 0:
          this.STATUS = v;
          this.flagN = !!(v & 2);
          this.flagZ = !!(v & 1);
          this.activeMode = !!(v & 8);
          break;
        case 1:
          this.EPC = v;
          break;
        case 2:
          this.CAUSE = v;
          break;
        case 3:
          this.BASE = v;
          break;
        case 4:
          this.LIMIT = v;
          break;
        case 5:
          this.KSP = v;
          break;
      }
    }
    // ============================================================
    // Disassembler (static)
    // ============================================================
    static disassemble(instruction) {
      const opcode = instruction >> 12 & 15;
      const regNames = ["A", "D", "B", "SP"];
      const ctrlRegNames = ["STATUS", "EPC", "CAUSE", "BASE", "LIMIT", "KSP"];
      const dst = instruction >> 10 & 3;
      const src8 = instruction >> 8 & 3;
      const signExtend = (val, bits) => {
        const mask = 1 << bits - 1;
        const v = val & (1 << bits) - 1;
        return (v ^ mask) - mask;
      };
      switch (opcode) {
        case 0:
          return `LDI ${regNames[dst]}, ${signExtend(instruction & 1023, 10)}`;
        case 1:
          return `LDU ${regNames[dst]}, ${instruction & 63}`;
        case 2:
          return `ADD ${regNames[dst]}, ${regNames[src8]}`;
        case 3:
          return `SUB ${regNames[dst]}, ${regNames[src8]}`;
        case 4:
          return `AND ${regNames[dst]}, ${regNames[src8]}`;
        case 5:
          return `OR ${regNames[dst]}, ${regNames[src8]}`;
        case 6: {
          const subOp = instruction >> 7 & 7;
          const src5 = instruction >> 5 & 3;
          const ops = ["NOT", "SHL", "ASR", "MOV", "XOR"];
          if (subOp < 3) return `${ops[subOp]} ${regNames[dst]}`;
          if (subOp < 5) return `${ops[subOp]} ${regNames[dst]}, ${regNames[src5]}`;
          return `ALU2 ???`;
        }
        case 7:
          return `LOAD ${regNames[dst]}, [A+${signExtend(instruction & 255, 8)}]`;
        case 8:
          return `STORE ${regNames[dst]}, [A+${signExtend(instruction & 255, 8)}]`;
        case 9: {
          const nzp = instruction >> 9 & 7;
          const off9 = signExtend(instruction & 511, 9);
          if (nzp === 0) return "NOP";
          const conds = { 1: "BRP", 2: "BRZ", 3: "BRZP", 4: "BRN", 5: "BRNP", 6: "BRNZ", 7: "BRA" };
          return `${conds[nzp] || "BR"} ${off9}`;
        }
        case 10:
          return "JMP";
        case 11:
          return "CALL";
        case 12: {
          const dir = instruction >> 11 & 1;
          const reg = instruction >> 9 & 3;
          return `${dir ? "POP" : "PUSH"} ${regNames[reg]}`;
        }
        case 13:
          return `TRAP ${instruction & 4095}`;
        case 14: {
          const subOp2 = instruction >> 8 & 15;
          if (subOp2 === 0) return "IRET";
          if (subOp2 === 3) return "HALT";
          if (subOp2 === 1) {
            const d = instruction >> 6 & 3;
            const cr = instruction >> 3 & 7;
            return `RDCTL ${regNames[d]}, ${ctrlRegNames[cr] || "???"}`;
          }
          if (subOp2 === 2) {
            const s = instruction >> 6 & 3;
            const cr = instruction >> 3 & 7;
            return `WRCTL ${ctrlRegNames[cr] || "???"}, ${regNames[s]}`;
          }
          return `SYS ???`;
        }
        case 15:
          return "RET";
        default:
          return "???";
      }
    }
  };

  // src/memory.ts

  var Memory = class {
    constructor() {
      __publicField(this, "ram");
      __publicField(this, "ioDevices", /* @__PURE__ */ new Map());
      __publicField(this, "onWriteCallback", null);
      this.ram = new Uint16Array(65536);
    }
    read(address) {
      const addr = address & 65535;
      if (addr >= 65280) {
        const base = addr & 65520;
        const device = this.ioDevices.get(base);
        if (device) return device.read(addr - base);
        return 0;
      }
      return this.ram[addr];
    }
    write(address, value) {
      const addr = address & 65535;
      const val = value & 65535;
      if (addr >= 65280) {
        const base = addr & 65520;
        const device = this.ioDevices.get(base);
        if (device) device.write(addr - base, val);
        return;
      }
      this.ram[addr] = val;
      this.onWriteCallback?.(addr, val);
    }
    loadProgram(code) {
      for (let i = 0; i < code.length && i < this.ram.length; i++) {
        this.ram[i] = code[i];
      }
      // Set heap free-pointer (used by Memory.alloc) to start after loaded code
      if (code.length < 61425) this.ram[61425] = code.length;
    }
    clear() {
      this.ram.fill(0);
    }
    registerDevice(baseAddress, device) {
      this.ioDevices.set(baseAddress & 65520, device);
    }
    onWrite(callback) {
      this.onWriteCallback = callback;
    }
  };

  // src/graphics.ts

  var DisplayController = class {
    constructor() {
      __publicField(this, "mode", 0);
      // 0=text, 1=pixel
      __publicField(this, "cursorPos", 0);
      // Position in text mode
      __publicField(this, "onModeChange", null);
    }
    read(offset) {
      switch (offset) {
        case 0:
          return this.mode;
        case 1:
          return this.cursorPos;
        default:
          return 0;
      }
    }
    write(offset, value) {
      switch (offset) {
        case 0:
          this.mode = value & 1;
          this.onModeChange?.(this.mode);
          break;
        case 1:
          this.cursorPos = value & 65535;
          break;
      }
    }
    setModeChangeCallback(cb) {
      this.onModeChange = cb;
    }
    getMode() {
      return this.mode;
    }
    getCursorPos() {
      return this.cursorPos;
    }
  };

  // src/devices/keyboard.ts

  var Keyboard = class {
    constructor() {
      __publicField(this, "status", 0);
      // bit 0: key available
      __publicField(this, "data", 0);
      // ASCII keycode
      __publicField(this, "pendingInterrupt", false);
    }
    read(offset) {
      switch (offset) {
        case 0:
          return this.status;
        case 1: {
          const val = this.data;
          this.status = 0;
          return val;
        }
        default:
          return 0;
      }
    }
    write(_offset, _value) {
    }
    /**
     * Called by the UI when a key is pressed.
     */
    keyDown(ascii) {
      this.data = ascii & 255;
      this.status = 1;
      this.pendingInterrupt = true;
    }
    /**
     * Check and consume interrupt.
     */
    hasPendingInterrupt() {
      if (this.pendingInterrupt) {
        this.pendingInterrupt = false;
        return true;
      }
      return false;
    }
  };

  // src/devices/system.ts

  var SystemControl = class {
    constructor() {
      __publicField(this, "pending", 0);
      // Pending interrupt bitmask
      __publicField(this, "mask", 0);
    }
    // Interrupt enable mask
    read(offset) {
      switch (offset) {
        case 0:
          return this.pending;
        case 1:
          return this.mask;
        default:
          return 0;
      }
    }
    write(offset, value) {
      switch (offset) {
        case 0:
          this.pending &= ~(value & 65535);
          break;
        case 1:
          this.mask = value & 65535;
          break;
      }
    }
    /**
     * Set a pending interrupt bit.
     * @param bit Interrupt source bit (0=timer, 1=keyboard, 2=UART RX, etc.)
     */
    setInterrupt(bit) {
      this.pending |= 1 << bit;
    }
    /**
     * Clear a pending interrupt bit.
     */
    clearInterrupt(bit) {
      this.pending &= ~(1 << bit);
    }
    /**
     * Check if any active (pending & masked) interrupts exist.
     */
    hasActiveInterrupt() {
      return (this.pending & this.mask) !== 0;
    }
    getPending() {
      return this.pending;
    }
    getMask() {
      return this.mask;
    }
  };

  // src/devices/timer.ts

  var Timer = class {
    constructor() {
      __publicField(this, "control", 0);
      // bit 0: enabled
      __publicField(this, "interval", 0);
      // cycles between interrupts
      __publicField(this, "counter", 0);
      // current count
      __publicField(this, "pendingInterrupt", false);
    }
    get enabled() {
      return !!(this.control & 1);
    }
    read(offset) {
      switch (offset) {
        case 0:
          return this.control;
        case 1:
          return this.interval;
        case 2:
          return this.counter & 65535;
        default:
          return 0;
      }
    }
    write(offset, value) {
      switch (offset) {
        case 0:
          this.control = value & 1;
          if (!this.enabled) this.counter = 0;
          break;
        case 1:
          this.interval = value & 65535;
          this.counter = 0;
          break;
      }
    }
    /**
     * Advance the timer by one CPU cycle.
     * Returns true if an interrupt should fire.
     */
    tick() {
      if (!this.enabled || this.interval === 0) return false;
      this.counter++;
      if (this.counter >= this.interval) {
        this.counter = 0;
        this.pendingInterrupt = true;
        return true;
      }
      return false;
    }
    hasPendingInterrupt() {
      if (this.pendingInterrupt) {
        this.pendingInterrupt = false;
        return true;
      }
      return false;
    }
  };

  // src/devices/uart.ts

  var UART = class {
    constructor() {
      __publicField(this, "txStatus", 1);
      // Ready to send (always ready in emulator)
      __publicField(this, "rxStatus", 0);
      // No data
      __publicField(this, "rxData", 0);
      // Received byte
      __publicField(this, "pendingTxInterrupt", false);
      __publicField(this, "pendingRxInterrupt", false);
      __publicField(this, "onOutput", null);
    }
    read(offset) {
      switch (offset) {
        case 0:
          return this.txStatus;
        case 1:
          return 0;
        // TX data is write-only
        case 2:
          return this.rxStatus;
        case 3: {
          const val = this.rxData;
          this.rxStatus = 0;
          return val;
        }
        default:
          return 0;
      }
    }
    write(offset, value) {
      switch (offset) {
        case 1:
          this.onOutput?.(value & 255);
          this.txStatus = 1;
          this.pendingTxInterrupt = true;
          break;
      }
    }
    /**
     * Feed a character into the UART receive buffer (from UI).
     */
    receive(ascii) {
      this.rxData = ascii & 255;
      this.rxStatus = 1;
      this.pendingRxInterrupt = true;
    }
    /**
     * Set callback for output characters.
     */
    setOutputCallback(cb) {
      this.onOutput = cb;
    }
    hasPendingRxInterrupt() {
      if (this.pendingRxInterrupt) {
        this.pendingRxInterrupt = false;
        return true;
      }
      return false;
    }
    hasPendingTxInterrupt() {
      if (this.pendingTxInterrupt) {
        this.pendingTxInterrupt = false;
        return true;
      }
      return false;
    }
  };

  // src/devices/sound.ts

  var SECTOR_SIZE = 128;
  var DISK_SECTORS = 256;
  var DiskController = class {
    constructor() {
      __publicField(this, "command", 0);
      __publicField(this, "sector", 0);
      __publicField(this, "memAddr", 0);
      __publicField(this, "status", 0);
      // bit0: busy, bit1: done, bit2: error
      __publicField(this, "pendingInterrupt", false);
      // Disk storage (256 sectors × 128 words)
      __publicField(this, "storage", new Uint16Array(DISK_SECTORS * SECTOR_SIZE));
      // Reference to main memory for DMA
      __publicField(this, "dmaRead", null);
      __publicField(this, "dmaWrite", null);
    }
    read(offset) {
      switch (offset) {
        case 0:
          return this.command;
        case 1:
          return this.sector;
        case 2:
          return this.memAddr;
        case 3:
          return this.status;
        default:
          return 0;
      }
    }
    write(offset, value) {
      switch (offset) {
        case 0:
          this.command = value & 3;
          if (this.command > 0) this.executeCommand();
          break;
        case 1:
          this.sector = value & 255;
          break;
        case 2:
          this.memAddr = value & 65535;
          break;
      }
    }
    setDMA(read, write) {
      this.dmaRead = read;
      this.dmaWrite = write;
    }
    executeCommand() {
      if (this.sector >= DISK_SECTORS) {
        this.status = 4;
        this.command = 0;
        return;
      }
      const endAddr = this.memAddr + SECTOR_SIZE - 1;
      if (this.memAddr >= 65280 || endAddr >= 65280) {
        this.status = 4;
        this.command = 0;
        return;
      }
      this.status = 1;
      const diskOffset = this.sector * SECTOR_SIZE;
      if (this.command === 1 && this.dmaWrite) {
        for (let i = 0; i < SECTOR_SIZE; i++) {
          this.dmaWrite(this.memAddr + i, this.storage[diskOffset + i]);
        }
      } else if (this.command === 2 && this.dmaRead) {
        for (let i = 0; i < SECTOR_SIZE; i++) {
          this.storage[diskOffset + i] = this.dmaRead(this.memAddr + i);
        }
      }
      this.status = 2;
      this.command = 0;
      this.pendingInterrupt = true;
    }
    hasPendingInterrupt() {
      if (this.pendingInterrupt) {
        this.pendingInterrupt = false;
        return true;
      }
      return false;
    }
  };

  // ============================================================
  // JACK++ COMPILER PIPELINE
  // ============================================================

  // --- Lexer ---

// === Worker handler ===
var cpu, memory, display, keyboard, system, timer, uart, disk;
var wRunning = false;
var wSpeed = 50000;
var bpSet = new Set();
var snapTimer = null;
var uartBuf = '';

function initEmu() {
  memory = new Memory();
  cpu = new CPU(memory);
  display = new DisplayController();
  keyboard = new Keyboard();
  system = new SystemControl();
  timer = new Timer();
  uart = new UART();
  disk = new DiskController();
  memory.registerDevice(65280, keyboard);
  memory.registerDevice(65296, timer);
  memory.registerDevice(65312, uart);
  memory.registerDevice(65328, display);
  memory.registerDevice(65360, disk);
  memory.registerDevice(65520, system);
  display.setModeChangeCallback(function(mode) {
    self.postMessage({t:'dm', mode:mode});
  });
  disk.setDMA(
    function(addr) { return memory.read(addr); },
    function(addr, val) { memory.write(addr, val); }
  );
  uart.setOutputCallback(function(ch) { uartBuf += String.fromCharCode(ch & 255); });
}

function resetDev() {
  display.write(0,0); display.write(1,0);
  system.pending = 0; system.mask = 0;
  timer.control = 0; timer.interval = 0; timer.counter = 0; timer.pendingInterrupt = false;
  keyboard.status = 0; keyboard.data = 0; keyboard.pendingInterrupt = false;
  uart.txStatus = 1; uart.rxStatus = 0; uart.rxData = 0;
  uart.pendingRxInterrupt = false; uart.pendingTxInterrupt = false;
  disk.command = 0; disk.sector = 0; disk.memAddr = 0; disk.status = 0; disk.pendingInterrupt = false;
}

function svcBatch(cycles) {
  if (cycles > 0 && timer.enabled && timer.interval !== 0) {
    var total = timer.counter + cycles;
    if (total >= timer.interval) system.setInterrupt(0);
    timer.counter = total % timer.interval;
  }
  if (keyboard.hasPendingInterrupt()) system.setInterrupt(1);
  if (uart.hasPendingRxInterrupt()) system.setInterrupt(2);
  if (uart.hasPendingTxInterrupt()) system.setInterrupt(3);
  if (disk.hasPendingInterrupt && disk.hasPendingInterrupt()) system.setInterrupt(4);
}

function svcCycle() {
  if (timer.tick()) system.setInterrupt(0);
  if (keyboard.hasPendingInterrupt()) system.setInterrupt(1);
  if (uart.hasPendingRxInterrupt()) system.setInterrupt(2);
  if (uart.hasPendingTxInterrupt()) system.setInterrupt(3);
  if (disk.hasPendingInterrupt && disk.hasPendingInterrupt()) system.setInterrupt(4);
}

function sendSnap() {
  var fb = new Uint16Array(2400);
  fb.set(memory.ram.subarray(0xF000, 0xF000 + 2400));
  self.postMessage({
    t: 'snap',
    s: {
      A: cpu.A & 65535, D: cpu.D & 65535, B: cpu.B & 65535, SP: cpu.SP & 65535,
      PC: cpu.PC & 65535, STATUS: cpu.STATUS & 65535, EPC: cpu.EPC & 65535,
      CAUSE: cpu.CAUSE & 65535, BASE: cpu.BASE & 65535, LIMIT: cpu.LIMIT & 65535,
      KSP: cpu.KSP & 65535, flagN: cpu.flagN, flagZ: cpu.flagZ,
      ie: cpu.ie, mode: cpu.mode, cyc: cpu.cycleCount,
      halted: cpu.halted, df: cpu.doubleFault
    },
    fb: fb.buffer,
    dm: display.getMode(),
    u: uartBuf,
    r: wRunning,
    ks: keyboard.status,
    us: uart.rxStatus
  }, [fb.buffer]);
  uartBuf = '';
}

function runLoop() {
  if (!wRunning || cpu.halted) {
    wRunning = false;
    sendSnap();
    self.postMessage({t: 'stop', reason: cpu.halted ? 'halted' : 'paused'});
    return;
  }
  var t0 = performance.now();
  var executed = 0;
  var hasBP = bpSet.size > 0;

  if (hasBP) {
    while (executed < wSpeed && !cpu.halted && wRunning) {
      if (bpSet.has(cpu.PC)) {
        wRunning = false;
        sendSnap();
        self.postMessage({t: 'stop', reason: 'bp', pc: cpu.PC});
        return;
      }
      if (!cpu.activeMode && !(cpu.STATUS & 4)) {
        var chunk = Math.min(wSpeed - executed, 4096);
        var ran = cpu.runFast(chunk);
        if (ran <= 0) break;
        svcBatch(ran);
        executed += ran;
      } else {
        cpu.step();
        svcCycle();
        executed++;
      }
      if (bpSet.has(cpu.PC)) {
        wRunning = false;
        sendSnap();
        self.postMessage({t: 'stop', reason: 'bp', pc: cpu.PC});
        return;
      }
      if (performance.now() - t0 > 12) break;
    }
  } else {
    while (executed < wSpeed && !cpu.halted && wRunning) {
      if (!cpu.activeMode && !(cpu.STATUS & 4)) {
        var chunk2 = Math.min(wSpeed - executed, 200000);
        var ran2 = cpu.runFast(chunk2);
        if (ran2 <= 0) { cpu.step(); svcCycle(); executed++; continue; }
        svcBatch(ran2);
        executed += ran2;
      } else {
        cpu.step();
        svcCycle();
        executed++;
      }
      if (performance.now() - t0 > 12) break;
    }
  }

  if (cpu.halted) {
    wRunning = false;
    sendSnap();
    self.postMessage({t: 'stop', reason: 'halted'});
    return;
  }
  if (wRunning) setTimeout(runLoop, 0);
}

function startSnaps() { if (!snapTimer) snapTimer = setInterval(sendSnap, 33); }
function stopSnaps() { if (snapTimer) { clearInterval(snapTimer); snapTimer = null; } }

initEmu();

self.onmessage = function(e) {
  var msg = e.data;
  switch (msg.t) {
    case 'load': {
      wRunning = false; stopSnaps();
      memory.clear(); resetDev(); cpu.reset(); uartBuf = '';
      memory.loadProgram(new Uint16Array(msg.code));
      sendSnap();
      break;
    }
    case 'run':
      if (msg.speed) wSpeed = msg.speed;
      wRunning = true; startSnaps(); runLoop();
      break;
    case 'pause':
      wRunning = false; stopSnaps(); sendSnap();
      break;
    case 'step': {
      var count = msg.n || 1;
      for (var i = 0; i < count; i++) {
        if (cpu.halted) break;
        if (bpSet.has(cpu.PC) && i > 0) break;
        cpu.step(); svcCycle();
      }
      sendSnap();
      break;
    }
    case 'reset':
      wRunning = false; stopSnaps();
      memory.clear(); resetDev(); cpu.reset(); uartBuf = '';
      if (msg.code) memory.loadProgram(new Uint16Array(msg.code));
      sendSnap();
      break;
    case 'bp':
      bpSet = new Set(msg.a);
      break;
    case 'spd':
      wSpeed = msg.v || 50000;
      break;
    case 'key':
      if (keyboard.status === 0) keyboard.keyDown(msg.a);
      break;
    case 'mem': {
      var start = msg.start & 65535;
      var len = msg.len || 128;
      var data = new Uint16Array(len);
      for (var j = 0; j < len; j++) data[j] = memory.read((start + j) & 65535);
      self.postMessage({t: 'memp', start: start, len: len, data: data.buffer, rid: msg.rid}, [data.buffer]);
      break;
    }
  }
};
sendSnap();

