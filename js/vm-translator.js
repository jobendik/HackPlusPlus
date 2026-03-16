// Jack++ VM Translator and Standard Library
// --- VMTranslator ---
var VMTranslator = class {
  constructor() { this.output=[]; this.errors=[]; this.currentFunction=''; this.labelCount=0; this._fileName='Main'; this.staticAlloc=new Map(); this.nextStaticAddr=16; }
  get fileName(){return this._fileName;} set fileName(v){this._fileName=v;}
  get currentClassPrefix() {
    if(!this.currentFunction) return this._fileName;
    const dot = this.currentFunction.indexOf('.');
    return dot >= 0 ? this.currentFunction.substring(0, dot) : this._fileName;
  }
  resolveStaticAddr(idx) {
    const prefix = this.currentClassPrefix;
    const key = `${prefix}::${idx}`;
    if(!this.staticAlloc.has(key)) {
      this.staticAlloc.set(key, this.nextStaticAddr);
      this.nextStaticAddr++;
    }
    return this.staticAlloc.get(key);
  }
  translate(source, fileName='Main') {
    this.output=[]; this.errors=[]; this.currentFunction=''; this.labelCount=0; this.fileName=fileName;
    this.staticAlloc=new Map(); this.nextStaticAddr=16;
    const lines=source.split('\n').map((l,i)=>({num:i+1,text:l.replace(/\/\/.*$/,'').trim()}));
    for(const line of lines) { if(line.text==='') continue; const cmd=this.parseLine(line.text,line.num); if(cmd) this.translateCommand(cmd,line.num); }
    return { success:this.errors.length===0, assembly:this.output.join('\n'), errors:[...this.errors] };
  }
  bootstrap() {
    return ['; === VM Bootstrap ===','    LDA SP, 0xEFF0','',`    LDA A, 1`,'    LDA D, 0xEFF0','    STORE D, [A+0]',`    LDA A, 2`,'    STORE D, [A+0]','','    LDA D, _BOOT_HALT','    PUSH D','    LDA D, 0xEFF0','    PUSH D','    PUSH D','    LDI D, 0','    PUSH D','    PUSH D','','    MOV D, SP','    PUSH B','    LDI B, 4','    ADD D, B',`    LDA A, 2`,'    STORE D, [A+0]','    POP B','','    MOV D, SP',`    LDA A, 1`,'    STORE D, [A+0]','','    LDA A, Main.main','    JMP','_BOOT_HALT:','    HALT',''].join('\n');
  }
  parseLine(text,ln) {
    const p=text.split(/\s+/); const cmd=p[0];
    const arith=['add','sub','neg','eq','gt','lt','and','or','not'];
    if(arith.includes(cmd)) return {type:'arithmetic',op:cmd};
    if(cmd==='push'||cmd==='pop') {
      if(p.length<3){this.addError(ln,`${cmd} needs segment and index`);return null;}
      const idx=parseInt(p[2]);
      if(isNaN(idx)){this.addError(ln,`Invalid index '${p[2]}' for ${cmd}`);return null;}
      return {type:cmd,segment:p[1],index:idx};
    }
    if(cmd==='label') return {type:'label',name:p[1]}; if(cmd==='goto') return {type:'goto',name:p[1]}; if(cmd==='if-goto') return {type:'if-goto',name:p[1]};
    if(cmd==='function') {
      const nL=parseInt(p[2]);
      if(isNaN(nL)){this.addError(ln,`Invalid nLocals '${p[2]}' for function`);return null;}
      return {type:'function',name:p[1],nLocals:nL};
    }
    if(cmd==='call') {
      const nA=parseInt(p[2]);
      if(isNaN(nA)){this.addError(ln,`Invalid nArgs '${p[2]}' for call`);return null;}
      return {type:'call',name:p[1],nArgs:nA};
    }
    if(cmd==='return') return {type:'return'};
    if(cmd==='syscall') {
      const nA=parseInt(p[1]);
      if(isNaN(nA)){this.addError(ln,`Invalid nArgs '${p[1]}' for syscall`);return null;}
      return {type:'syscall',nArgs:nA};
    }
    this.addError(ln,`Unknown VM command: '${cmd}'`); return null;
  }
  translateCommand(cmd,ln) {
    this.emit(`; --- VM: ${this.cmdStr(cmd)} ---`);
    switch(cmd.type) {
      case 'arithmetic': this.trArith(cmd.op); break; case 'push': this.trPush(cmd.segment,cmd.index,ln); break; case 'pop': this.trPop(cmd.segment,cmd.index,ln); break;
      case 'label': this.emit(`${this.ql(cmd.name)}:`); break; case 'goto': this.emit(`    LDA A, ${this.ql(cmd.name)}`); this.emit('    JMP'); break;
      case 'if-goto': this.emit('    POP D'); this.emit('    PUSH A'); this.emit('    MOV A, D'); this.emit('    POP A'); this.emit('    BRZ 3'); this.emit(`    LDA A, ${this.ql(cmd.name)}`); this.emit('    JMP'); break;
      case 'function': this.currentFunction=cmd.name; this.emit(`${cmd.name}:`); if(cmd.nLocals>0){this.emit('    LDI D, 0');for(let i=0;i<cmd.nLocals;i++)this.emit('    PUSH D');} break;
      case 'call': this.trCall(cmd.name,cmd.nArgs); break; case 'return': this.trReturn(); break;
      case 'syscall': {
        // Pop syscall number (first arg) into D, then put remaining args into temp slots
        // nArgs includes the syscall number
        const nSysArgs = cmd.nArgs || 0;
        if(nSysArgs > 0) {
          // All args are on stack: arg_N-1 ... arg_1 arg_0(syscall#) <- top
          // Pop syscall number (arg0) into D
          this.emit('    POP D');
          // Pop and discard remaining arguments to restore stack balance
          for(let i = 1; i < nSysArgs; i++) {
            this.emit('    POP A'); // Discard extra args
          }
          this.emit('    MOV A, D');
          this.emit('    TRAP 0');
          this.emit('    PUSH D');
        } else {
          this.emit('    LDI D, 0');
          this.emit('    MOV A, D');
          this.emit('    TRAP 0');
          this.emit('    PUSH D');
        }
        break;
      }
    }
  }
  trArith(op) {
    switch(op) {
      case 'add': this.emit('    POP D'); this.emit('    POP A'); this.emit('    ADD D, A'); this.emit('    PUSH D'); break;
      case 'sub': this.emit('    POP D'); this.emit('    POP A'); this.emit('    PUSH B'); this.emit('    MOV B, D'); this.emit('    MOV D, A'); this.emit('    SUB D, B'); this.emit('    POP B'); this.emit('    PUSH D'); break;
      case 'neg': this.emit('    POP D'); this.emit('    NOT D'); this.emit('    PUSH B'); this.emit('    LDI B, 1'); this.emit('    ADD D, B'); this.emit('    POP B'); this.emit('    PUSH D'); break;
      case 'eq': this.trCmp('BRZ'); break; case 'gt': this.trCmp('BRN'); break; case 'lt': this.trCmp('BRP'); break;
      case 'and': this.emit('    POP D'); this.emit('    POP A'); this.emit('    AND D, A'); this.emit('    PUSH D'); break;
      case 'or': this.emit('    POP D'); this.emit('    POP A'); this.emit('    OR D, A'); this.emit('    PUSH D'); break;
      case 'not': this.emit('    POP D'); this.emit('    NOT D'); this.emit('    PUSH D'); break;
    }
  }
  trCmp(br) {
    const tl=this.ul('CMP_T'), el=this.ul('CMP_E');
    const cb=br==='BRN'?'BRP':br==='BRP'?'BRN':'BRZ';
    this.emit('    POP D'); this.emit('    POP A'); this.emit('    SUB A, D');
    this.emit(`    ${cb} ${tl}`); this.emit('    LDI D, 0'); this.emit(`    BRA ${el}`); this.emit(`${tl}:`); this.emit('    LDI D, -1'); this.emit(`${el}:`); this.emit('    PUSH D');
  }
  trPush(seg,idx,ln) {
    switch(seg) {
      case 'constant': this.emit(`    LDA D, ${idx}`); this.emit('    PUSH D'); break;
      case 'local': this.loadSP('local'); this.emit(`    LOAD D, [A-${idx+1}]`); this.emit('    PUSH D'); break;
      case 'argument': this.loadSP('argument'); if(idx===0) this.emit('    LOAD D, [A+0]'); else this.emit(`    LOAD D, [A-${idx}]`); this.emit('    PUSH D'); break;
      case 'this': case 'that': this.loadSP(seg); this.emit(`    LOAD D, [A+${idx}]`); this.emit('    PUSH D'); break;
      case 'temp': this.emit(`    LDA A, ${5+idx}`); this.emit('    LOAD D, [A+0]'); this.emit('    PUSH D'); break;
      case 'pointer': this.emit(`    LDA A, ${idx===0?3:4}`); this.emit('    LOAD D, [A+0]'); this.emit('    PUSH D'); break;
      case 'static': { const sa=this.resolveStaticAddr(idx); this.emit(`    LDA A, ${sa}`); this.emit('    LOAD D, [A+0]'); this.emit('    PUSH D'); break; }
      default: this.addError(ln,`Unknown segment '${seg}'`);
    }
  }
  trPop(seg,idx,ln) {
    switch(seg) {
      case 'local': this.emit('    POP D'); this.emit('    PUSH D'); this.loadSP('local'); this.emit('    POP D'); this.emit(`    STORE D, [A-${idx+1}]`); break;
      case 'argument': this.emit('    POP D'); this.emit('    PUSH D'); this.loadSP('argument'); this.emit('    POP D'); if(idx===0) this.emit('    STORE D, [A+0]'); else this.emit(`    STORE D, [A-${idx}]`); break;
      case 'this': case 'that': this.emit('    POP D'); this.emit('    PUSH D'); this.loadSP(seg); this.emit('    POP D'); this.emit(`    STORE D, [A+${idx}]`); break;
      case 'temp': this.emit('    POP D'); this.emit(`    LDA A, ${5+idx}`); this.emit('    STORE D, [A+0]'); break;
      case 'pointer': this.emit('    POP D'); this.emit(`    LDA A, ${idx===0?3:4}`); this.emit('    STORE D, [A+0]'); break;
      case 'static': { const sa=this.resolveStaticAddr(idx); this.emit('    POP D'); this.emit(`    LDA A, ${sa}`); this.emit('    STORE D, [A+0]'); break; }
      default: this.addError(ln,`Cannot pop to '${seg}'`);
    }
  }
  loadSP(seg) { const m={local:1,argument:2,this:3,that:4}; this.emit(`    LDA A, ${m[seg]}`); this.emit('    LOAD A, [A+0]'); }
  trCall(name,nArgs) {
    const rl=this.ul('RET');
    this.emit(`    LDA D, ${rl}`); this.emit('    PUSH D');
    this.pushFA(1); this.pushFA(2); this.pushFA(3); this.pushFA(4);
    this.emit('    MOV D, SP'); this.emit('    PUSH B'); this.emit(`    LDI B, ${nArgs+4}`); this.emit('    ADD D, B'); this.emit('    LDA A, 2'); this.emit('    STORE D, [A+0]'); this.emit('    POP B');
    this.emit('    MOV D, SP'); this.emit('    LDA A, 1'); this.emit('    STORE D, [A+0]');
    this.emit(`    LDA A, ${name}`); this.emit('    JMP'); this.emit(`${rl}:`);
  }
  trReturn() {
    this.emit('    LDA A, 1'); this.emit('    LOAD D, [A+0]'); this.emit('    LDA A, 12'); this.emit('    STORE D, [A+0]');
    this.emit('    MOV A, D'); this.emit('    LOAD D, [A+4]'); this.emit('    LDA A, 11'); this.emit('    STORE D, [A+0]');
    this.emit('    POP D'); this.emit('    LDA A, 2'); this.emit('    LOAD A, [A+0]'); this.emit('    STORE D, [A+0]');
    this.emit('    LDA A, 2'); this.emit('    LOAD D, [A+0]'); this.emit('    MOV SP, D');
    this.restoreFrame(0,4); this.restoreFrame(1,3); this.restoreFrame(2,2); this.restoreFrame(3,1);
    this.emit('    LDA A, 11'); this.emit('    LOAD A, [A+0]'); this.emit('    JMP');
  }
  pushFA(addr) { this.emit(`    LDA A, ${addr}`); this.emit('    LOAD D, [A+0]'); this.emit('    PUSH D'); }
  restoreFrame(off,dest) { this.emit('    LDA A, 12'); this.emit('    LOAD A, [A+0]'); this.emit(`    LOAD D, [A+${off}]`); this.emit(`    LDA A, ${dest}`); this.emit('    STORE D, [A+0]'); }
  ql(name) { return this.currentFunction?`${this.currentFunction}$${name}`:name; }
  ul(prefix) { return `_VM_${prefix}_${this.labelCount++}`; }
  emit(line) { this.output.push(line); }
  addError(ln,msg) { this.errors.push(`VM line ${ln}: ${msg}`); }
  cmdStr(c) { switch(c.type){case'arithmetic':return c.op;case'push':case'pop':return `${c.type} ${c.segment} ${c.index}`;case'label':case'goto':case'if-goto':return `${c.type} ${c.name}`;case'function':return `function ${c.name} ${c.nLocals}`;case'call':return `call ${c.name} ${c.nArgs}`;case'return':return 'return';case'syscall':return `syscall ${c.nArgs}`;} }
};

// --- STDLIB_VM ---
var STDLIB_VM = `
function Math.multiply 3
push constant 0
pop local 0
push argument 0
pop local 1
push constant 1
pop local 2
label Math.multiply$loop
push local 2
push constant 0
eq
if-goto Math.multiply$done
push argument 1
push local 2
and
push constant 0
eq
if-goto Math.multiply$skip
push local 0
push local 1
add
pop local 0
label Math.multiply$skip
push local 1
push local 1
add
pop local 1
push local 2
push local 2
add
pop local 2
goto Math.multiply$loop
label Math.multiply$done
push local 0
return
function Math.divide 4
push constant 0
pop local 0
push constant 0
pop local 3
push argument 0
pop local 1
push argument 1
pop local 2
push local 1
push constant 0
lt
not
if-goto Math.divide$apos
push constant 0
push local 1
sub
pop local 1
push local 3
not
pop local 3
label Math.divide$apos
push local 2
push constant 0
lt
not
if-goto Math.divide$bpos
push constant 0
push local 2
sub
pop local 2
push local 3
not
pop local 3
label Math.divide$bpos
push constant 0
pop static 246
push local 1
push local 2
call Math._divU 2
pop local 0
push local 3
push constant 0
eq
if-goto Math.divide$ret
push constant 0
push local 0
sub
pop local 0
label Math.divide$ret
push local 0
return
function Math._divU 1
push argument 1
push argument 0
gt
if-goto Math._divU$base
push argument 1
push constant 0
lt
if-goto Math._divU$base
push argument 0
push argument 1
push argument 1
add
call Math._divU 2
pop local 0
push argument 0
push static 246
sub
push argument 1
lt
if-goto Math._divU$even
push static 246
push argument 1
add
pop static 246
push local 0
push local 0
add
push constant 1
add
return
label Math._divU$even
push local 0
push local 0
add
return
label Math._divU$base
push constant 0
pop static 246
push constant 0
return
function Math.modulo 2
push argument 0
push argument 1
call Math.divide 2
pop local 0
push local 0
push argument 1
call Math.multiply 2
pop local 1
push argument 0
push local 1
sub
return
function Math.xor 0
push argument 0
push argument 1
or
push argument 0
push argument 1
and
not
and
return
function Math.shiftLeft 1
push argument 0
pop local 0
label Math.shiftLeft$loop
push argument 1
push constant 0
gt
not
if-goto Math.shiftLeft$done
push local 0
push local 0
add
pop local 0
push argument 1
push constant 1
sub
pop argument 1
goto Math.shiftLeft$loop
label Math.shiftLeft$done
push local 0
return
function Math.shiftRight 2
push constant 1
pop local 0
push argument 1
pop local 1
label Math.shiftRight$pow
push local 1
push constant 0
gt
not
if-goto Math.shiftRight$divide
push local 0
push local 0
add
pop local 0
push local 1
push constant 1
sub
pop local 1
goto Math.shiftRight$pow
label Math.shiftRight$divide
push argument 0
push local 0
call Math.divide 2
return
function Math.min 0
push argument 0
push argument 1
lt
if-goto Math.min$a
push argument 1
return
label Math.min$a
push argument 0
return
function Math.max 0
push argument 0
push argument 1
gt
if-goto Math.max$a
push argument 1
return
label Math.max$a
push argument 0
return
function Math.abs 0
push argument 0
push constant 0
lt
not
if-goto Math.abs$pos
push constant 0
push argument 0
sub
return
label Math.abs$pos
push argument 0
return
function Memory.peek 0
push argument 0
pop pointer 1
push that 0
return
function Memory.poke 0
push argument 0
pop pointer 1
push argument 1
pop that 0
push constant 0
return
function Memory.alloc 2
push constant 61425
pop pointer 1
push that 0
pop local 1
push local 1
push constant 0
eq
not
if-goto Memory.alloc$ready
push constant 8192
pop local 1
label Memory.alloc$ready
push local 1
pop local 0
push local 0
pop pointer 1
push argument 0
pop that 0
push local 1
push argument 0
add
push constant 1
add
pop local 1
push constant 61425
pop pointer 1
push local 1
pop that 0
push local 0
push constant 1
add
return
function Memory.deAlloc 0
push constant 0
return
function String.new 1
push argument 0
push constant 2
add
call Memory.alloc 1
pop local 0
push local 0
pop pointer 1
push argument 0
pop that 0
push local 0
push constant 1
add
pop pointer 1
push constant 0
pop that 0
push local 0
return
function String.dispose 0
push argument 0
call Memory.deAlloc 1
pop temp 0
push constant 0
return
function String.length 0
push argument 0
push constant 1
add
pop pointer 1
push that 0
return
function String.charAt 0
push argument 0
push constant 2
add
push argument 1
add
pop pointer 1
push that 0
return
function String.appendChar 1
push argument 0
push constant 1
add
pop pointer 1
push that 0
pop local 0
push argument 0
push constant 2
add
push local 0
add
pop pointer 1
push argument 1
pop that 0
push local 0
push constant 1
add
pop local 0
push argument 0
push constant 1
add
pop pointer 1
push local 0
pop that 0
push argument 0
return
function Array.new 0
push argument 0
call Memory.alloc 1
return
function Array.dispose 0
push argument 0
call Memory.deAlloc 1
pop temp 0
push constant 0
return
function Output.printChar 2
push constant 61426
pop pointer 1
push that 0
pop local 0
push constant 61440
push local 0
add
pop local 1
push local 1
pop pointer 1
push argument 0
push constant 255
gt
if-goto Output.printChar$hasattr
push constant 3840
push argument 0
or
goto Output.printChar$write
label Output.printChar$hasattr
push argument 0
label Output.printChar$write
pop that 0
push local 0
push constant 1
add
pop local 0
push local 0
push constant 2400
lt
if-goto Output.printChar$ok
push constant 0
pop local 0
label Output.printChar$ok
push constant 61426
pop pointer 1
push local 0
pop that 0
push constant 0
return
function Output.printString 2
push constant 0
pop local 0
push argument 0
call String.length 1
pop local 1
label Output.printString$loop
push local 0
push local 1
lt
not
if-goto Output.printString$done
push argument 0
push local 0
call String.charAt 2
call Output.printChar 1
pop temp 0
push local 0
push constant 1
add
pop local 0
goto Output.printString$loop
label Output.printString$done
push constant 0
return
function Output.printInt 4
push argument 0
push constant 0
lt
not
if-goto Output.printInt$pos
push constant 45
call Output.printChar 1
pop temp 0
push constant 0
push argument 0
sub
pop local 0
goto Output.printInt$start
label Output.printInt$pos
push argument 0
pop local 0
label Output.printInt$start
push constant 10000
pop local 2
label Output.printInt$skipzero
push local 2
push constant 1
gt
not
if-goto Output.printInt$print
push local 0
push local 2
lt
not
if-goto Output.printInt$print
push local 2
push constant 10
call Math.divide 2
pop local 2
goto Output.printInt$skipzero
label Output.printInt$print
label Output.printInt$digitloop
push local 2
push constant 0
gt
not
if-goto Output.printInt$done
push local 0
push local 2
call Math.divide 2
pop local 3
push local 3
push constant 48
add
call Output.printChar 1
pop temp 0
push local 3
push local 2
call Math.multiply 2
pop temp 0
push local 0
push temp 0
sub
pop local 0
push local 2
push constant 10
call Math.divide 2
pop local 2
goto Output.printInt$digitloop
label Output.printInt$done
push constant 0
return
function Output.println 2
push constant 61426
pop pointer 1
push that 0
pop local 0
push local 0
push constant 80
call Math.modulo 2
pop local 1
push local 0
push constant 80
push local 1
sub
add
pop local 0
push local 0
push constant 2400
lt
if-goto Output.println$ok
push constant 0
pop local 0
label Output.println$ok
push constant 61426
pop pointer 1
push local 0
pop that 0
push constant 0
return
function Sys.halt 0
label Sys.halt$spin
goto Sys.halt$spin
push constant 0
return
function Sys.error 0
push constant 69
call Output.printChar 1
pop temp 0
push constant 82
call Output.printChar 1
pop temp 0
push constant 82
call Output.printChar 1
pop temp 0
push argument 0
call Output.printInt 1
pop temp 0
label Sys.error$halt
goto Sys.error$halt
push constant 0
return
function Sys.wait 1
push argument 0
push constant 10
call Math.multiply 2
pop local 0
label Sys.wait$loop
push local 0
push constant 0
gt
not
if-goto Sys.wait$done
push local 0
push constant 1
sub
pop local 0
goto Sys.wait$loop
label Sys.wait$done
push constant 0
return

// Math.sqrt(x) -> floor(sqrt(x)) via binary search
function Math.sqrt 3
push constant 0
pop local 0
push constant 255
pop local 1
label Math.sqrt$loop
push local 0
push local 1
gt
if-goto Math.sqrt$done
push local 0
push local 1
add
push constant 1
add
push constant 1
call Math.shiftRight 2
pop local 2
push local 2
push local 2
call Math.multiply 2
push argument 0
gt
if-goto Math.sqrt$less
push local 2
pop local 0
goto Math.sqrt$loop
label Math.sqrt$less
push local 2
push constant 1
sub
pop local 1
goto Math.sqrt$loop
label Math.sqrt$done
push local 0
return

// Output.moveCursor(row, col)
function Output.moveCursor 0
push argument 0
push constant 80
call Math.multiply 2
push argument 1
add
push constant 61426
pop pointer 1
pop that 0
push constant 0
return

// Output.backSpace()
function Output.backSpace 1
push constant 61426
pop pointer 1
push that 0
pop local 0
push local 0
push constant 0
gt
not
if-goto Output.backSpace$done
push local 0
push constant 1
sub
pop local 0
push constant 61426
pop pointer 1
push local 0
pop that 0
push constant 61440
push local 0
add
pop pointer 1
push constant 0
pop that 0
label Output.backSpace$done
push constant 0
return

// Screen.clearScreen()
function Screen.clearScreen 2
push constant 61440
pop local 0
push constant 63840
pop local 1
label Screen.clearScreen$loop
push local 0
push local 1
lt
not
if-goto Screen.clearScreen$done
push local 0
pop pointer 1
push constant 0
pop that 0
push local 0
push constant 1
add
pop local 0
goto Screen.clearScreen$loop
label Screen.clearScreen$done
push constant 0
return

// Screen.setColor(color)
function Screen.setColor 0
push constant 61427
pop pointer 1
push argument 0
pop that 0
push constant 0
return

// Screen.drawPixel(x, y)
function Screen.drawPixel 5
push argument 1
push constant 40
call Math.multiply 2
push argument 0
push constant 4
call Math.divide 2
add
push constant 61440
add
pop local 0
push argument 0
push constant 3
and
pop local 1
push constant 3
push local 1
sub
push constant 4
call Math.multiply 2
pop local 2
push constant 61427
pop pointer 1
push that 0
pop local 4
push local 4
push local 2
call Math.shiftLeft 2
pop local 4
push constant 15
push local 2
call Math.shiftLeft 2
not
pop local 3
push local 0
pop pointer 1
push that 0
push local 3
and
push local 4
or
pop temp 0
push local 0
pop pointer 1
push temp 0
pop that 0
push constant 0
return

// Screen.drawRectangle(x1, y1, x2, y2)
function Screen.drawRectangle 2
push argument 1
pop local 0
label Screen.drawRectangle$yloop
push local 0
push argument 3
gt
if-goto Screen.drawRectangle$done
push argument 0
pop local 1
label Screen.drawRectangle$xloop
push local 1
push argument 2
gt
if-goto Screen.drawRectangle$xdone
push local 1
push local 0
call Screen.drawPixel 2
pop temp 0
push local 1
push constant 1
add
pop local 1
goto Screen.drawRectangle$xloop
label Screen.drawRectangle$xdone
push local 0
push constant 1
add
pop local 0
goto Screen.drawRectangle$yloop
label Screen.drawRectangle$done
push constant 0
return

// Screen.drawLine(x1, y1, x2, y2)
function Screen.drawLine 0
push argument 0
push argument 1
push argument 2
push argument 3
call Screen.drawRectangle 4
return

// Screen.drawCircle -- placeholder
function Screen.drawCircle 0
push constant 0
return

// Keyboard.keyPressed() -> current key (0 if none)
function Keyboard.keyPressed 0
push constant 65280
pop pointer 1
push that 0
return

// Keyboard.readChar() -> char (blocking)
// Polls status at 0xFF00, then reads data from 0xFF01 (which clears status)
function Keyboard.readChar 1
label Keyboard.readChar$wait
push constant 65280
pop pointer 1
push that 0
push constant 0
eq
if-goto Keyboard.readChar$wait
push constant 65281
pop pointer 1
push that 0
pop local 0
push local 0
return

// String.eraseLastChar(str)
function String.eraseLastChar 1
push argument 0
push constant 1
add
pop pointer 1
push that 0
pop local 0
push local 0
push constant 0
eq
if-goto String.eraseLastChar$nop
push local 0
push constant 1
sub
pop local 0
push argument 0
push constant 1
add
pop pointer 1
push local 0
pop that 0
label String.eraseLastChar$nop
push constant 0
return

// String.setCharAt(str, index, char)
function String.setCharAt 0
push argument 0
push constant 2
add
push argument 1
add
pop pointer 1
push argument 2
pop that 0
push constant 0
return
`;

// ============================================================
// END JACK++ COMPILER PIPELINE
// ============================================================

