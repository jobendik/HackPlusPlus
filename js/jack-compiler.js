// Jack++ Compiler: Lexer, Parser, SymbolTable, CodeGenerator
// JACK++ COMPILER PIPELINE
// ============================================================

// --- Lexer ---
var TokenType = { KEYWORD:'KEYWORD', SYMBOL:'SYMBOL', IDENTIFIER:'IDENTIFIER', INT_CONST:'INT_CONST', STRING_CONST:'STRING_CONST', CHAR_CONST:'CHAR_CONST', EOF:'EOF' };
var JP_KEYWORDS = new Set(['class','struct','enum','const','import','fn','method','new','static','field','var','if','else','while','for','loop','break','continue','return','pub','true','false','null','this','void','int','char','bool','unsafe','syscall']);
var JP_SYMBOLS = ['<<','>>','<=','>=','!=','==','&&','||','->','{','}','(',')','[',']','.',',',';',':','+','-','*','/','%','&','|','^','~','!','<','>','='];

var Lexer = class {
  constructor(source) {
    this.source = source; this.pos = 0; this.line = 1; this.col = 1;
    this.currentToken = null; this.nextTokenCache = null;
  }
  peek() { if (!this.nextTokenCache) this.nextTokenCache = this.readNextToken(); return this.nextTokenCache; }
  next() { if (this.nextTokenCache) { this.currentToken = this.nextTokenCache; this.nextTokenCache = null; } else { this.currentToken = this.readNextToken(); } return this.currentToken; }
  eof() { return this.peek().type === TokenType.EOF; }
  readNextToken() {
    this.skipWC();
    if (this.pos >= this.source.length) return this.mkTok(TokenType.EOF, '');
    const c = this.source[this.pos];
    if (c === '"') return this.readStr();
    if (c === "'") return this.readCharLit();
    if (/[a-zA-Z_]/.test(c)) return this.readIdOrKw();
    if (/[0-9]/.test(c)) return this.readNum();
    for (const sym of JP_SYMBOLS) {
      if (this.source.startsWith(sym, this.pos)) { const t = this.mkTok(TokenType.SYMBOL, sym); this.adv(sym.length); return t; }
    }
    throw new Error(`Lexer Error: Unexpected '${c}' at line ${this.line}, col ${this.col}`);
  }
  skipWC() {
    while (this.pos < this.source.length) {
      const c = this.source[this.pos];
      if (/\s/.test(c)) { if (c === '\n') { this.line++; this.col = 1; } else this.col++; this.pos++; continue; }
      if (this.source.startsWith('//', this.pos)) { while (this.pos < this.source.length && this.source[this.pos] !== '\n') this.pos++; continue; }
      if (this.source.startsWith('/*', this.pos)) { const startLine = this.line; this.pos += 2; this.col += 2; while (this.pos < this.source.length && !this.source.startsWith('*/', this.pos)) { if (this.source[this.pos] === '\n') { this.line++; this.col = 1; } else this.col++; this.pos++; } if (this.pos >= this.source.length) throw new Error(`Unterminated block comment starting at line ${startLine}`); this.pos += 2; this.col += 2; continue; }
      break;
    }
  }
  readStr() {
    const sL = this.line, sC = this.col; this.adv(1); let s = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\') { this.adv(1); const e = this.source[this.pos];
        switch(e) { case 'n': s+='\n'; break; case 't': s+='\t'; break; case 'r': s+='\r'; break; case '\\': s+='\\'; break; case '"': s+='"'; break; case "'": s+="'"; break; case '0': s+='\0'; break;
          case 'x': { const h = this.source.substring(this.pos+1, this.pos+3); if (/^[0-9a-fA-F]{2}$/.test(h)) { s+=String.fromCharCode(parseInt(h,16)); this.adv(2); continue; } else s+='x'; break; }
          default: s+=e; }
      } else s += this.source[this.pos];
      this.adv(1);
    }
    if (this.pos >= this.source.length) throw new Error(`Unterminated string at line ${sL}`);
    this.adv(1); return { type: TokenType.STRING_CONST, value: s, line: sL, column: sC };
  }
  readCharLit() {
    const sL = this.line, sC = this.col; this.adv(1); let s = '';
    if (this.source[this.pos] === '\\') { this.adv(1); const e = this.source[this.pos];
      switch(e) { case 'n': s='\n'; break; case 't': s='\t'; break; case '\\': s='\\'; break; case "'": s="'"; break; case '0': s='\0'; break;
        case 'x': { const h = this.source.substring(this.pos+1,this.pos+3); if (/^[0-9a-fA-F]{2}$/.test(h)) { s=String.fromCharCode(parseInt(h,16)); this.adv(3); } else { s='x'; this.adv(1); } break; }
        default: s=e; this.adv(1); }
    } else { s = this.source[this.pos]; this.adv(1); }
    if (this.source[this.pos] !== "'") throw new Error(`Invalid char literal at line ${sL}`);
    this.adv(1); return { type: TokenType.CHAR_CONST, value: s, line: sL, column: sC };
  }
  readIdOrKw() {
    const sL=this.line, sC=this.col; let id='';
    while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.pos])) { id+=this.source[this.pos]; this.adv(1); }
    return JP_KEYWORDS.has(id) ? { type: TokenType.KEYWORD, value: id, line: sL, column: sC } : { type: TokenType.IDENTIFIER, value: id, line: sL, column: sC };
  }
  readNum() {
    const sL=this.line, sC=this.col; let ns='';
    if (this.source.startsWith('0x',this.pos)||this.source.startsWith('0X',this.pos)) { ns='0x'; this.adv(2); while(this.pos<this.source.length&&/[0-9a-fA-F]/.test(this.source[this.pos])){ns+=this.source[this.pos];this.adv(1);} if(ns.length<=2) throw new Error(`Invalid hex literal at line ${sL}, col ${sC}: no digits after '0x'`); return {type:TokenType.INT_CONST,value:parseInt(ns,16),line:sL,column:sC}; }
    if (this.source.startsWith('0b',this.pos)||this.source.startsWith('0B',this.pos)) { this.adv(2); while(this.pos<this.source.length&&/[01]/.test(this.source[this.pos])){ns+=this.source[this.pos];this.adv(1);} if(ns.length===0) throw new Error(`Invalid binary literal at line ${sL}, col ${sC}: no digits after '0b'`); return {type:TokenType.INT_CONST,value:parseInt(ns,2),line:sL,column:sC}; }
    while(this.pos<this.source.length&&/[0-9]/.test(this.source[this.pos])){ns+=this.source[this.pos];this.adv(1);}
    return {type:TokenType.INT_CONST,value:parseInt(ns,10),line:sL,column:sC};
  }
  mkTok(type,value) { return {type,value,line:this.line,column:this.col}; }
  adv(n) { for(let i=0;i<n;i++) { if(this.source[this.pos]==='\n'){this.line++;this.col=1;}else this.col++; this.pos++; } }
};

// --- Parser ---
var PRECEDENCE = {'||':2,'&&':3,'|':4,'^':5,'&':6,'==':7,'!=':7,'<':8,'>':8,'<=':8,'>=':8,'<<':9,'>>':9,'+':10,'-':10,'*':11,'/':11,'%':11};

var Parser = class {
  constructor(source) { this.lexer = new Lexer(source); }
  parse() {
    const prog = { type:'Program', classes:[], declarations:[] };
    while (!this.lexer.eof()) { const d = this.parseTLD(); prog.declarations.push(d); if(d.type==='ClassDecl') prog.classes.push(d); }
    return prog;
  }
  parseTLD() {
    const t = this.pk();
    if(t.type===TokenType.KEYWORD) {
      if(t.value==='class') return this.parseClass();
      if(t.value==='struct') return this.parseStruct();
      if(t.value==='enum') return this.parseEnum();
      if(t.value==='fn') return this.parseTLFn();
      if(t.value==='const') return this.parseTLConst();
      if(t.value==='import') return this.parseImport();
      if(t.value==='static') return this.parseTLStatic();
    }
    throw this.err(`Expected declaration, got '${t.value}'`);
  }
  parseTLFn() {
    this.ckw('fn'); const name=this.cid(); this.cs('(');
    const params=[]; if(!this.chk(')')) do { const pn=this.cid(); this.cs(':'); const pt=this.parseType(); params.push({type:'VarDecl',kind:'argument',name:pn,varType:pt}); } while(this.ms(','));
    this.cs(')'); let rt={type:'TypeRef',name:'void'}; if(this.ms('->')) rt=this.parseType();
    return {type:'SubroutineDecl',kind:'function',name,returnType:rt,parameters:params,body:this.parseBlock()};
  }
  parseTLConst() { this.ckw('const'); const n=this.cid(); this.cs(':'); const vt=this.parseType(); this.cs('='); const init=this.parseExpr(); this.cs(';'); return {type:'VarDecl',kind:'const',name:n,varType:vt,initializer:init}; }
  parseTLStatic() { this.ckw('static'); const n=this.cid(); this.cs(':'); const vt=this.parseType(); let init; if(this.ms('=')) init=this.parseExpr(); this.cs(';'); return {type:'VarDecl',kind:'static',name:n,varType:vt,initializer:init}; }
  parseImport() { this.ckw('import'); const n=this.cid(); this.cs(';'); return {type:'ImportDecl',name:n}; }
  parseClass() {
    this.ckw('class'); const name=this.cid(); this.cs('{'); const decls=[];
    while(!this.ms('}')) {
      const t=this.pk();
      if(t.type===TokenType.KEYWORD) {
        if(['static','field','pub'].includes(t.value)) decls.push(this.parseClassVar());
        else if(['new','method','fn'].includes(t.value)) decls.push(this.parseSub());
        else if(t.value==='enum') decls.push(this.parseEnum());
        else if(t.value==='const') decls.push(this.parseClassConst());
        else throw this.err(`Unexpected '${t.value}' in class`);
      } else throw this.err(`Expected class member, got '${t.value}'`);
    }
    return {type:'ClassDecl',name,declarations:decls};
  }
  parseClassConst() { this.ckw('const'); const n=this.cid(); this.cs(':'); const vt=this.parseType(); this.cs('='); const init=this.parseExpr(); this.cs(';'); return {type:'VarDecl',kind:'const',name:n,varType:vt,initializer:init}; }
  parseClassVar() {
    let pub=false; if(this.mkw('pub')) pub=true;
    const kt=this.lexer.next(); if(!['static','field'].includes(kt.value)) throw this.err(`Expected 'static'/'field', got '${kt.value}'`);
    const n=this.cid(); this.cs(':'); const vt=this.parseType(); let init; if(this.ms('=')) init=this.parseExpr(); this.cs(';');
    return {type:'VarDecl',kind:kt.value,isPublic:pub,name:n,varType:vt,initializer:init};
  }
  parseSub() {
    const kind=this.lexer.next().value; let sk; if(kind==='new') sk='new'; else if(kind==='method') sk='method'; else sk='function';
    let name='new'; if(sk!=='new') name=this.cid();
    this.cs('('); const params=[]; if(!this.chk(')')) do { const pn=this.cid(); this.cs(':'); const pt=this.parseType(); params.push({type:'VarDecl',kind:'argument',name:pn,varType:pt}); } while(this.ms(','));
    this.cs(')'); let rt={type:'TypeRef',name:'void'}; if(this.ms('->')) rt=this.parseType();
    return {type:'SubroutineDecl',kind:sk,name,returnType:rt,parameters:params,body:this.parseBlock()};
  }
  parseStruct() {
    this.ckw('struct'); const name=this.cid(); this.cs('{'); const fields=[];
    while(!this.ms('}')) { const fn=this.cid(); this.cs(':'); const ft=this.parseType(); this.cs(';'); fields.push({type:'VarDecl',kind:'field',name:fn,varType:ft,isPublic:true}); }
    return {type:'StructDecl',name,fields};
  }
  parseEnum() {
    this.ckw('enum'); const name=this.cid(); this.cs('{'); const vals=[];
    while(!this.ms('}')) { const vn=this.cid(); let v; if(this.ms('=')) { const nt=this.lexer.next(); v=nt.value; } vals.push({name:vn,value:v}); if(!this.ms(',')) { if(this.pk().value==='}') { this.cs('}'); break; } throw this.err("Expected ',' or '}'"); } }
    return {type:'EnumDecl',name,values:vals};
  }
  parseType() { const t=this.lexer.next(); if(t.type===TokenType.KEYWORD&&['int','char','bool','void'].includes(t.value)) return {type:'TypeRef',name:t.value}; if(t.type===TokenType.IDENTIFIER) return {type:'TypeRef',name:t.value}; throw this.errAt(t,`Expected type, got '${t.value}'`); }
  parseBlock() { this.cs('{'); const stmts=[]; while(!this.ms('}')) stmts.push(this.parseStmt()); return {type:'Block',statements:stmts}; }
  parseStmt() {
    const t=this.pk();
    if(t.type===TokenType.KEYWORD) { switch(t.value) {
      case 'var': case 'const': return this.parseLVD();
      case 'if': return this.parseIf(); case 'while': return this.parseWhile(); case 'for': return this.parseFor();
      case 'loop': return this.parseLoop(); case 'return': return this.parseReturn();
      case 'break': this.ckw('break'); this.cs(';'); return {type:'BreakStatement'};
      case 'continue': this.ckw('continue'); this.cs(';'); return {type:'ContinueStatement'};
      case 'unsafe': this.ckw('unsafe'); return {type:'UnsafeBlock',body:this.parseBlock()};
    }}
    const expr=this.parseExpr(); if(this.ms('=')) { const val=this.parseExpr(); this.cs(';'); return {type:'AssignmentStatement',target:expr,value:val}; }
    this.cs(';'); return {type:'ExpressionStatement',expr};
  }
  parseLVD() { const k=this.lexer.next().value; const n=this.cid(); this.cs(':'); const vt=this.parseType(); let init; if(this.ms('=')) init=this.parseExpr(); this.cs(';'); return {type:'VarDecl',kind:k,name:n,varType:vt,initializer:init}; }
  parseIf() { this.ckw('if'); this.cs('('); const cond=this.parseExpr(); this.cs(')'); const tb=this.parseBlock(); let eb; if(this.mkw('else')) { if(this.pk().value==='if') eb=this.parseIf(); else eb=this.parseBlock(); } return {type:'IfStatement',condition:cond,thenBlock:tb,elseBlock:eb}; }
  parseWhile() { this.ckw('while'); this.cs('('); const cond=this.parseExpr(); this.cs(')'); return {type:'WhileStatement',condition:cond,body:this.parseBlock()}; }
  parseFor() {
    this.ckw('for'); this.cs('('); let init; if(!this.ms(';')) init=this.parseStmt(); let cond; if(!this.ms(';')) { cond=this.parseExpr(); this.cs(';'); }
    let upd; if(!this.chk(')')) { const e=this.parseExpr(); if(this.ms('=')) { const v=this.parseExpr(); upd={type:'AssignmentStatement',target:e,value:v}; } else upd={type:'ExpressionStatement',expr:e}; }
    this.cs(')'); return {type:'ForStatement',init,condition:cond,update:upd,body:this.parseBlock()};
  }
  parseLoop() { this.ckw('loop'); return {type:'LoopStatement',body:this.parseBlock()}; }
  parseReturn() { this.ckw('return'); let val; if(!this.ms(';')) { val=this.parseExpr(); this.cs(';'); } return {type:'ReturnStatement',value:val}; }
  parseExpr(minP=0) {
    let left=this.parseUnary();
    while(true) { const t=this.pk(); if(t.type!==TokenType.SYMBOL) break; const op=t.value; const p=PRECEDENCE[op]; if(p===undefined||p<minP) break;
      this.lexer.next(); if(op==='=') throw this.err("'=' not allowed as inline expression");
      left={type:'BinaryExpression',operator:op,left,right:this.parseExpr(p+1)};
    }
    return left;
  }
  parseUnary() { const t=this.pk(); if(t.type===TokenType.SYMBOL&&['-','~','!'].includes(t.value)) { this.lexer.next(); return {type:'UnaryExpression',operator:t.value,expr:this.parseUnary()}; } return this.parsePrimary(); }
  parsePrimary() {
    const t=this.lexer.next();
    if(t.type===TokenType.INT_CONST) return {type:'IntegerLiteral',value:t.value};
    if(t.type===TokenType.STRING_CONST) return {type:'StringLiteral',value:t.value};
    if(t.type===TokenType.CHAR_CONST) return {type:'CharLiteral',value:t.value};
    if(t.type===TokenType.KEYWORD) {
      if(t.value==='true') return {type:'BooleanLiteral',value:true};
      if(t.value==='false') return {type:'BooleanLiteral',value:false};
      if(t.value==='null') return {type:'NullLiteral'};
      if(t.value==='this') return this.parsePostfix({type:'ThisExpression'});
      if(t.value==='syscall') { this.cs('('); const args=this.parseArgList(); this.cs(')'); return {type:'SubroutineCall',name:'syscall',args}; }
    }
    if(t.type===TokenType.IDENTIFIER) return this.parsePostfix({type:'VarRef',name:t.value});
    if(t.type===TokenType.SYMBOL&&t.value==='(') { const e=this.parseExpr(); this.cs(')'); return this.parsePostfix(e); }
    throw this.errAt(t,`Unexpected '${t.value}' in expression`);
  }
  parsePostfix(expr) {
    while(true) {
      if(this.ms('(')) { if(expr.type==='VarRef') expr=this.finishCall(undefined,expr.name); else { const args=this.parseArgList(); this.cs(')'); expr={type:'SubroutineCall',caller:expr,name:'call',args}; } }
      else if(this.ms('.')) { const m=this.cidOrKw(); if(this.ms('(')) expr=this.finishCall(expr,m); else expr={type:'FieldAccess',obj:expr,name:m}; }
      else if(this.ms('[')) { const idx=this.parseExpr(); this.cs(']'); expr={type:'ArrayAccess',array:expr,index:idx}; }
      else break;
    }
    return expr;
  }
  finishCall(caller,name) { const args=this.parseArgList(); this.cs(')'); return {type:'SubroutineCall',caller,name,args}; }
  parseArgList() { const args=[]; if(!this.chk(')')) do { args.push(this.parseExpr()); } while(this.ms(',')); return args; }
  pk() { return this.lexer.peek(); }
  chk(s) { const t=this.pk(); return t.type===TokenType.SYMBOL&&t.value===s; }
  ms(s) { if(this.chk(s)){this.lexer.next();return true;} return false; }
  cs(s) { const t=this.lexer.next(); if(t.type!==TokenType.SYMBOL||t.value!==s) throw this.errAt(t,`Expected '${s}', got '${t.value}'`); }
  mkw(kw) { const t=this.pk(); if(t.type===TokenType.KEYWORD&&t.value===kw){this.lexer.next();return true;} return false; }
  ckw(kw) { const t=this.lexer.next(); if(t.type!==TokenType.KEYWORD||t.value!==kw) throw this.errAt(t,`Expected '${kw}', got '${t.value}'`); }
  cid() { const t=this.lexer.next(); if(t.type!==TokenType.IDENTIFIER) throw this.errAt(t,`Expected identifier, got '${t.value}'`); return t.value; }
  cidOrKw() { const t=this.lexer.next(); if(t.type!==TokenType.IDENTIFIER&&t.type!==TokenType.KEYWORD) throw this.errAt(t,`Expected identifier, got '${t.value}'`); return t.value; }
  err(msg) { const t=this.pk(); return new Error(`Parse Error at line ${t.line}, col ${t.column}: ${msg}`); }
  errAt(t,msg) { return new Error(`Parse Error at line ${t.line}, col ${t.column}: ${msg}`); }
};

// --- SymbolTable ---
var SymbolTable = class {
  constructor() { this.classScope=new Map(); this.subroutineScope=new Map(); this.indices={'static':0,'field':0,'argument':0,'var':0}; }
  startClass() { this.classScope.clear(); this.indices['static']=0; this.indices['field']=0; }
  startSubroutine() { this.subroutineScope.clear(); this.indices['argument']=0; this.indices['var']=0; }
  define(name,type,kind) {
    const scope = (kind==='static'||kind==='field') ? this.classScope : this.subroutineScope;
    if(scope.has(name)) throw new Error(`Duplicate symbol: '${name}' already defined as ${scope.get(name).kind}`);
    const e={name,type,kind,index:this.indices[kind]++};
    scope.set(name,e);
  }
  varCount(kind) { return this.indices[kind]; }
  lookup(name) { if(this.subroutineScope.has(name)) return this.subroutineScope.get(name); if(this.classScope.has(name)) return this.classScope.get(name); return null; }
};

// --- CodeGenerator ---
var CodeGenerator = class {
  constructor() { this.out=[]; this.symbols=new SymbolTable(); this.className=''; this.moduleName=''; this.labelCounts={}; this.loopStack=[]; this.globalConstants=new Map(); this.localConstants=new Map(); this.enumValues=new Map(); this.fieldLayouts=new Map(); this.classFieldCounts=new Map(); this.knownFunctions=new Set(); }
  generate(program, moduleName='Main') {
    this.out=[]; this.symbols=new SymbolTable(); this.moduleName=moduleName;
    this.globalConstants=new Map(); this.localConstants=new Map(); this.enumValues=new Map(); this.fieldLayouts=new Map(); this.classFieldCounts=new Map(); this.knownFunctions=new Set(); this.labelCounts={}; this.loopStack=[];
    // Pass 1: collect declarations
    for(const d of program.declarations) {
      if(d.type==='VarDecl'&&d.kind==='const'&&d.initializer&&d.initializer.type==='IntegerLiteral') this.globalConstants.set(d.name,d.initializer.value);
      if(d.type==='VarDecl'&&d.kind==='static') { this.symbols.startClass(); this.symbols.define(d.name,d.varType.name,'static'); }
      if(d.type==='EnumDecl') this.collectEnum(d);
      if(d.type==='StructDecl') this.collectFL(d.name,d.fields);
      if(d.type==='SubroutineDecl') this.knownFunctions.add(`${moduleName}.${d.name}`);
      if(d.type==='ClassDecl') {
        this.symbols.startClass();
        const fds=[];
        for(const m of d.declarations) {
          if(m.type==='VarDecl'&&(m.kind==='static'||m.kind==='field')) { this.symbols.define(m.name,m.varType.name,m.kind); if(m.kind==='field') fds.push(m); }
          else if(m.type==='VarDecl'&&m.kind==='const'&&m.initializer&&m.initializer.type==='IntegerLiteral') this.globalConstants.set(`${d.name}.${m.name}`,m.initializer.value);
          else if(m.type==='EnumDecl') this.collectEnum(m);
          else if(m.type==='SubroutineDecl') { if(m.kind==='function') this.knownFunctions.add(`${d.name}.${m.name}`); }
        }
        this.classFieldCounts.set(d.name, fds.length);
        this.collectFL(d.name,fds);
      }
    }
    // Pass 2: compile
    for(const d of program.declarations) {
      if(d.type==='ClassDecl') {
        this.className=d.name;
        // Re-register class-level symbols for this class
        this.symbols.startClass();
        for(const m of d.declarations) {
          if(m.type==='VarDecl'&&(m.kind==='static'||m.kind==='field')) this.symbols.define(m.name,m.varType.name,m.kind);
        }
        for(const m of d.declarations) { if(m.type==='SubroutineDecl') this.compileSub(m); }
      }
      else if(d.type==='SubroutineDecl') { this.className=this.moduleName; this.symbols.startClass(); this.compileSub(d); }
      else if(d.type==='StructDecl') this.compileStructHelpers(d);
    }
    return this.out.join('\n')+'\n';
  }
  em(c) { this.out.push(c); }
  gl(prefix) { const c=this.labelCounts[prefix]||0; this.labelCounts[prefix]=c+1; return `${prefix}_${c}`; }
  getConstant(name) {
    if(this.localConstants.has(name)) return this.localConstants.get(name);
    // Check class-qualified constant
    const qn = `${this.className}.${name}`;
    if(this.globalConstants.has(qn)) return this.globalConstants.get(qn);
    if(this.globalConstants.has(name)) return this.globalConstants.get(name);
    return undefined;
  }
  compileStructHelpers(node) {
    const fc=node.fields.length;
    this.em(`function ${node.name}.new 0`); this.em(`push constant ${fc}`); this.em('call Memory.alloc 1'); this.em('pop pointer 0');
    for(let i=0;i<fc;i++) { this.em(`push argument ${i}`); this.em(`pop this ${i}`); }
    this.em('push pointer 0'); this.em('return');
    this.em(`function ${node.name}.dispose 0`); this.em('push argument 0'); this.em('call Memory.deAlloc 1'); this.em('push constant 0'); this.em('return');
  }
  compileSub(node) {
    this.symbols.startSubroutine();
    this.localConstants = new Map(); // Clear local constants per subroutine
    if(node.kind==='method') this.symbols.define('this',this.className,'argument');
    for(const p of node.parameters) this.symbols.define(p.name,p.varType.name,'argument');
    let lc=0; const countL=(s)=>{
      if(s.type==='Block') s.statements.forEach(countL);
      else if(s.type==='VarDecl'&&s.kind==='var') lc++;
      else if(s.type==='VarDecl'&&s.kind==='const'&&s.initializer&&s.initializer.type==='IntegerLiteral') this.localConstants.set(s.name,s.initializer.value);
      else if(s.type==='IfStatement'){countL(s.thenBlock);if(s.elseBlock)countL(s.elseBlock);}
      else if(s.type==='WhileStatement'||s.type==='LoopStatement') countL(s.body);
      else if(s.type==='ForStatement'){if(s.init)countL(s.init);countL(s.body);}
      else if(s.type==='UnsafeBlock') countL(s.body);
    };
    node.body.statements.forEach(countL);
    this.em(`function ${this.className}.${node.name} ${lc}`);
    if(node.kind==='method') { this.em('push argument 0'); this.em('pop pointer 0'); }
    else if(node.kind==='new') {
      const fc = this.classFieldCounts.get(this.className) || 0;
      this.em(`push constant ${fc}`); this.em('call Memory.alloc 1'); this.em('pop pointer 0');
    }
    this.compileBlock(node.body);
    if(node.kind==='new') { this.em('push pointer 0'); this.em('return'); }
    else if(node.returnType.name==='void') { this.em('push constant 0'); this.em('return'); }
    else { /* Non-void safety net: emit push 0; return in case control falls through */ this.em('push constant 0'); this.em('return'); }
  }
  compileBlock(n) { for(const s of n.statements) this.compileStmt(s); }
  compileStmt(n) {
    switch(n.type) {
      case 'Block': this.compileBlock(n); break;
      case 'VarDecl':
        if(n.kind==='const') break;
        if(n.varType && n.varType.name==='void') throw new Error(`Cannot declare variable '${n.name}' with type 'void'`);
        if(n.kind==='var') this.symbols.define(n.name,n.varType.name,'var');
        if(n.initializer) { this.compileExpr(n.initializer); const sym=this.symbols.lookup(n.name); if(!sym) throw new Error(`Var ${n.name} not found`); this.em(`pop ${this.k2s(sym.kind)} ${sym.index}`); } break;
      case 'AssignmentStatement': this.compileAssign(n); break;
      case 'ExpressionStatement': this.compileExpr(n.expr); this.em('pop temp 0'); break;
      case 'IfStatement': this.compileIf(n); break;
      case 'WhileStatement': { const cl=this.gl('WH_C'), el=this.gl('WH_E'); this.loopStack.push({breakLabel:el,continueLabel:cl}); this.em(`label ${cl}`); this.compileExpr(n.condition); this.em('not'); this.em(`if-goto ${el}`); this.compileBlock(n.body); this.em(`goto ${cl}`); this.em(`label ${el}`); this.loopStack.pop(); break; }
      case 'ForStatement': { const cl=this.gl('FOR_C'), ul=this.gl('FOR_U'), el=this.gl('FOR_E'); if(n.init) this.compileStmt(n.init); this.em(`label ${cl}`); if(n.condition){this.compileExpr(n.condition);this.em('not');this.em(`if-goto ${el}`);} this.loopStack.push({breakLabel:el,continueLabel:ul}); this.compileBlock(n.body); this.em(`label ${ul}`); if(n.update) this.compileStmt(n.update); this.em(`goto ${cl}`); this.em(`label ${el}`); this.loopStack.pop(); break; }
      case 'LoopStatement': { const tl=this.gl('LP_T'), el=this.gl('LP_E'); this.loopStack.push({breakLabel:el,continueLabel:tl}); this.em(`label ${tl}`); this.compileBlock(n.body); this.em(`goto ${tl}`); this.em(`label ${el}`); this.loopStack.pop(); break; }
      case 'ReturnStatement': if(n.value) this.compileExpr(n.value); else this.em('push constant 0'); this.em('return'); break;
      case 'BreakStatement': if(!this.loopStack.length) throw new Error('Break outside loop'); this.em(`goto ${this.loopStack[this.loopStack.length-1].breakLabel}`); break;
      case 'ContinueStatement': if(!this.loopStack.length) throw new Error('Continue outside loop'); this.em(`goto ${this.loopStack[this.loopStack.length-1].continueLabel}`); break;
      case 'UnsafeBlock': this.compileBlock(n.body); break;
    }
  }
  compileAssign(n) {
    if(n.target.type==='VarRef') { this.compileExpr(n.value); const s=this.symbols.lookup(n.target.name); if(!s) throw new Error(`Var ${n.target.name} not found`); this.em(`pop ${this.k2s(s.kind)} ${s.index}`); }
    else if(n.target.type==='ArrayAccess') { this.compileExpr(n.target.array); this.compileExpr(n.target.index); this.em('add'); this.compileExpr(n.value); this.em('pop temp 0'); this.em('pop pointer 1'); this.em('push temp 0'); this.em('pop that 0'); }
    else if(n.target.type==='FieldAccess') {
      if(n.target.obj.type==='ThisExpression') { const s=this.symbols.lookup(n.target.name); if(!s) throw new Error(`Field ${n.target.name} not found`); this.compileExpr(n.value); this.em(`pop ${this.k2s(s.kind)} ${s.index}`); }
      else { const off=this.resolveFieldOffset(n.target.obj,n.target.name); this.compileExpr(n.target.obj); this.em('pop pointer 1'); this.compileExpr(n.value); this.em(`pop that ${off}`); }
    } else throw new Error(`Invalid assignment target ${n.target.type}`);
  }
  compileIf(n) {
    const l1=this.gl('IF_T'), l2=this.gl('IF_F'), end=this.gl('IF_E');
    this.compileExpr(n.condition); this.em(`if-goto ${l1}`); this.em(`goto ${l2}`);
    this.em(`label ${l1}`); this.compileBlock(n.thenBlock); this.em(`goto ${end}`);
    this.em(`label ${l2}`); if(n.elseBlock) { if(n.elseBlock.type==='IfStatement') this.compileIf(n.elseBlock); else this.compileBlock(n.elseBlock); }
    this.em(`label ${end}`);
  }
  compileExpr(n) {
    switch(n.type) {
      case 'IntegerLiteral': this.em(`push constant ${n.value}`); break;
      case 'BooleanLiteral': if(n.value){this.em('push constant 0');this.em('not');}else this.em('push constant 0'); break;
      case 'NullLiteral': this.em('push constant 0'); break;
      case 'ThisExpression': this.em('push pointer 0'); break;
      case 'StringLiteral': this.em(`push constant ${n.value.length}`); this.em('call String.new 1'); for(let i=0;i<n.value.length;i++){this.em(`push constant ${n.value.charCodeAt(i)}`);this.em('call String.appendChar 2');} break;
      case 'CharLiteral': this.em(`push constant ${n.value.charCodeAt(0)}`); break;
      case 'VarRef': { const cv=this.getConstant(n.name); if(cv!==undefined){this.em(`push constant ${cv}`);break;} const s=this.symbols.lookup(n.name); if(!s) throw new Error(`Var ${n.name} not found`); this.em(`push ${this.k2s(s.kind)} ${s.index}`); break; }
      case 'ArrayAccess': this.compileExpr(n.array); this.compileExpr(n.index); this.em('add'); this.em('pop pointer 1'); this.em('push that 0'); break;
      case 'BinaryExpression':
        if(n.operator==='&&') { const fl=this.gl('SC_F'), el=this.gl('SC_E'); this.compileExpr(n.left); this.em('push constant 0'); this.em('eq'); this.em(`if-goto ${fl}`); this.compileExpr(n.right); this.em('push constant 0'); this.em('eq'); this.em('not'); this.em(`goto ${el}`); this.em(`label ${fl}`); this.em('push constant 0'); this.em(`label ${el}`); }
        else if(n.operator==='||') { const tl=this.gl('OR_T'), el=this.gl('OR_E'); this.compileExpr(n.left); this.em(`if-goto ${tl}`); this.compileExpr(n.right); this.em('push constant 0'); this.em('eq'); this.em('not'); this.em(`goto ${el}`); this.em(`label ${tl}`); this.em('push constant 0'); this.em('not'); this.em(`label ${el}`); }
        else { this.compileExpr(n.left); this.compileExpr(n.right); this.compileBinOp(n.operator); }
        break;
      case 'UnaryExpression': this.compileExpr(n.expr); if(n.operator==='-') this.em('neg'); else if(n.operator==='~') this.em('not'); else if(n.operator==='!') { this.em('push constant 0'); this.em('eq'); } break;
      case 'SubroutineCall': this.compileCall(n); break;
      case 'FieldAccess':
        if(n.obj.type==='VarRef') { const ek=`${n.obj.name}.${n.name}`; const ev=this.enumValues.get(ek); if(ev!==undefined){this.em(`push constant ${ev}`);break;} }
        if(n.obj.type==='ThisExpression') { const s=this.symbols.lookup(n.name); if(s) this.em(`push ${this.k2s(s.kind)} ${s.index}`); else throw new Error(`Field ${n.name} not found`); }
        else { const off=this.resolveFieldOffset(n.obj,n.name); this.compileExpr(n.obj); this.em('pop pointer 1'); this.em(`push that ${off}`); }
        break;
      default: throw new Error(`Unsupported expr: ${n.type}`);
    }
  }
  compileBinOp(op) {
    const m={'+':`add`,'-':'sub','&':'and','|':'or','<':'lt','>':'gt','==':'eq'};
    if(m[op]) { this.em(m[op]); return; }
    if(op==='!=') { this.em('eq'); this.em('not'); } else if(op==='<=') { this.em('gt'); this.em('not'); } else if(op==='>=') { this.em('lt'); this.em('not'); }
    else if(op==='*') this.em('call Math.multiply 2'); else if(op==='/') this.em('call Math.divide 2'); else if(op==='%') this.em('call Math.modulo 2');
    else if(op==='^') this.em('call Math.xor 2'); else if(op==='<<') this.em('call Math.shiftLeft 2'); else if(op==='>>') this.em('call Math.shiftRight 2');
    else throw new Error(`Unsupported op ${op}`);
  }
  compileCall(n) {
    if(n.name==='syscall') { for(let i=1;i<n.args.length;i++) this.compileExpr(n.args[i]); if(n.args.length>0) this.compileExpr(n.args[0]); this.em(`syscall ${n.args.length}`); return; }
    if(!n.caller) {
      if(n.name==='peek'&&n.args.length===1) { this.compileExpr(n.args[0]); this.em('pop pointer 1'); this.em('push that 0'); return; }
      if(n.name==='poke'&&n.args.length===2) { this.compileExpr(n.args[0]); this.compileExpr(n.args[1]); this.em('pop temp 0'); this.em('pop pointer 1'); this.em('push temp 0'); this.em('pop that 0'); this.em('push constant 0'); return; }
      if(n.name==='halt'&&n.args.length===0) { this.em('call Sys.halt 0'); return; }
    }
    let nArgs=n.args.length, callName='';
    if(!n.caller) {
      // Check if this is a known static function or an implicit method call
      const fnName = `${this.className}.${n.name}`;
      if(this.knownFunctions.has(fnName)) {
        // Static function call -- no implicit this
        callName = fnName;
      } else {
        // Implicit method call on this
        this.em('push pointer 0'); nArgs++; callName = fnName;
      }
    }
    else if(n.caller.type==='VarRef') { const s=this.symbols.lookup(n.caller.name); if(s) { this.em(`push ${this.k2s(s.kind)} ${s.index}`); nArgs++; callName=`${s.type}.${n.name}`; } else callName=`${n.caller.name}.${n.name}`; }
    else if(n.caller.type==='ThisExpression') { this.em('push pointer 0'); nArgs++; callName=`${this.className}.${n.name}`; }
    else throw new Error('Complex caller not supported');
    for(const a of n.args) this.compileExpr(a);
    this.em(`call ${callName} ${nArgs}`);
  }
  resolveFieldOffset(obj,fieldName) {
    if(obj.type==='VarRef') {
      const s=this.symbols.lookup(obj.name);
      if(s) { const l=this.fieldLayouts.get(s.type); if(l) { const o=l.get(fieldName); if(o!==undefined) return o; } }
    }
    throw new Error(`Cannot resolve field '${fieldName}' -- unknown type or field`);
  }
  collectEnum(d) {
    let av=0;
    for(const v of d.values) {
      let val;
      if(v.value !== undefined) {
        val = typeof v.value === 'number' ? v.value : parseInt(v.value, 10);
        if(isNaN(val)) throw new Error(`Enum '${d.name}.${v.name}' has non-integer value '${v.value}'`);
      } else {
        val = av;
      }
      this.enumValues.set(`${d.name}.${v.name}`, val);
      av = val + 1;
    }
  }
  collectFL(name,fields) { const l=new Map(); let off=0; for(const f of fields) { if(f.kind==='field') { l.set(f.name,off); off++; } } this.fieldLayouts.set(name,l); }
  k2s(kind) { return kind==='static'?'static':kind==='field'?'this':kind==='argument'?'argument':'local'; }
};

