# Jack++ Language Reference

Jack++ is a class-based, statically typed language that compiles to a stack-based VM, which in turn compiles to Hack+ assembly for a 16-bit CPU. It is inspired by Jack (from Nand2Tetris) but adds modern features: `for`/`loop`, `break`/`continue`, enums, structs, bitwise/shift operators, short-circuit logic, and built-in hardware access functions.

---

## Program Structure

Every Jack++ program needs a `fn main()` as its entry point. A program consists of top-level declarations: functions, classes, structs, enums, and constants.

```
// Top-level function (entry point)
fn main() {
    Output.printString("Hello, Jack++!");
    Output.println();
    halt();
}
```

## Types

| Type    | Description                             |
|---------|-----------------------------------------|
| `int`   | 16-bit signed integer (-32768 to 32767) |
| `char`  | 16-bit character (ASCII)                |
| `bool`  | Boolean (`true` = -1/all bits set, `false` = 0) |
| `void`  | No return value                         |
| *Class* | Any class/struct name (e.g. `Counter`, `String`) — passed as a 16-bit pointer |

All values are 16-bit words. There are no floats, no 32-bit integers, and no references/pointers beyond raw addresses (which are just `int`).

## Literals

```
42              // decimal integer
0xFF30          // hexadecimal integer
0b10101010      // binary integer
'A'             // character literal (value 65)
'\n'            // escape: newline
'\xHH'          // hex escape in char/string
"Hello"         // string literal → creates String object
true            // boolean true (-1, all bits set)
false           // boolean false (0)
null            // null pointer (0)
```

**String literals** are compiled into `String.new(len)` followed by `String.appendChar()` calls for each character. They are heap-allocated objects, not raw pointers.

**Escape sequences** (in strings and char literals): `\n` `\t` `\r` `\\` `\"` `\'` `\0` `\xHH`

## Variables

```
var x: int = 42;
var name: String = "Alice";
var flag: bool = true;
var c: Counter = Counter.new(5);
```

Variables declared with `var` are local to the enclosing function/method. You must specify the type after the colon. Initialization is optional.

### Constants

```
const MAX: int = 100;
```

Constants must have an integer literal initializer. They are inlined at compile time (no runtime cost). Constants can appear at the top level, inside classes, or inside function bodies.

## Operators

### Binary operators (by precedence, lowest to highest)

| Prec | Operators           | Description             |
|------|---------------------|-------------------------|
| 2    | `\|\|`              | Logical OR (short-circuit) |
| 3    | `&&`                | Logical AND (short-circuit) |
| 4    | `\|`                | Bitwise OR              |
| 5    | `^`                 | Bitwise XOR             |
| 6    | `&`                 | Bitwise AND             |
| 7    | `==`  `!=`          | Equality                |
| 8    | `<`  `>`  `<=`  `>=` | Comparison             |
| 9    | `<<`  `>>`          | Bit shift left/right    |
| 10   | `+`  `-`            | Addition, subtraction   |
| 11   | `*`  `/`  `%`       | Multiply, divide, modulo |

**Important:** `*`, `/`, `%`, `^`, `<<`, `>>` are compiled as function calls to `Math.multiply`, `Math.divide`, `Math.modulo`, `Math.xor`, `Math.shiftLeft`, `Math.shiftRight` respectively. They work, but are slower than `+`, `-`, `&`, `|`.

### Unary operators

| Operator | Description        |
|----------|--------------------|
| `-`      | Arithmetic negation |
| `~`      | Bitwise NOT         |
| `!`      | Logical NOT (returns `true` if operand is 0, else `false`) |

### Short-circuit evaluation

`&&` and `||` use short-circuit evaluation: the right operand is only evaluated if needed.

## Control Flow

### if / else

```
if (x > 10) {
    Output.printString("big");
} else if (x > 5) {
    Output.printString("medium");
} else {
    Output.printString("small");
}
```

Braces are **required**. Parentheses around the condition are **required**.

### while loop

```
while (i < 10) {
    Output.printInt(i);
    i = i + 1;
}
```

### for loop

```
for (var i: int = 0; i < 10; i = i + 1) {
    Output.printInt(i);
    Output.printChar(32);
}
```

Note: there is no `++` or `+=` operator. Use `i = i + 1`.

### Infinite loop

```
loop {
    // runs forever until break or halt()
    var key: int = Keyboard.readChar();
    if (key == 27) {
        break;
    }
}
```

### break / continue

`break` exits the innermost `while`, `for`, or `loop`. `continue` jumps to the next iteration.

### return

```
return value;   // return a value
return;         // return void (from void functions)
```

## Functions

Top-level functions are declared with `fn`. They are static (no `this`).

```
fn add(a: int, b: int) -> int {
    return a + b;
}

fn greet() {
    Output.printString("Hi!");
}
```

- If no `-> ReturnType` is specified, the return type is `void`.
- `void` functions implicitly return 0.
- The entry point must be `fn main()`.

## Classes

```
class Counter {
    field count: int;
    field step: int;
    static totalCounters: int;

    new(initialStep: int) {
        this.count = 0;
        this.step = initialStep;
        Counter.totalCounters = Counter.totalCounters + 1;
    }

    method increment() {
        this.count = this.count + this.step;
    }

    method getValue() -> int {
        return this.count;
    }

    fn getTotal() -> int {
        return Counter.totalCounters;
    }
}
```

### Field kinds

| Keyword  | Description |
|----------|-------------|
| `field`  | Instance variable — each object gets its own copy, accessed via `this.fieldName` |
| `static` | Class-level variable — shared across all instances, accessed via `ClassName.varName` |

### Subroutine kinds

| Keyword  | Description |
|----------|-------------|
| `new`    | Constructor — allocates memory for fields, returns `this` automatically. Called as `ClassName.new(args)` |
| `method` | Instance method — receives the object as implicit first argument. Called as `obj.methodName(args)` |
| `fn`     | Static function — no `this`. Called as `ClassName.functionName(args)` |

### Usage

```
var c: Counter = Counter.new(5);  // calls constructor
c.increment();                     // calls method (passes c as this)
var v: int = c.getValue();         // method returning a value
var t: int = Counter.getTotal();   // static function call
```

### How methods work internally

When you call `c.increment()`, the compiler pushes `c` onto the stack as the first argument, then calls `Counter.increment`. Inside the method, `this` refers to that object. Field access like `this.count` compiles to indexed access into the object's memory block.

## Structs

Structs are like lightweight classes. The compiler auto-generates `new()` and `dispose()` methods.

```
struct Point {
    x: int;
    y: int;
}

fn main() {
    var p: Point = Point.new(10, 20);
    Output.printInt(p.x);       // field access
    Output.printChar(44);       // comma
    Output.printInt(p.y);
    p.dispose();                // free memory
    halt();
}
```

- `Point.new(x, y)` allocates 2 words, stores x at offset 0 and y at offset 1.
- Fields are accessed by name: `p.x`, `p.y`.
- `p.dispose()` frees the memory.
- Structs cannot have methods (beyond the auto-generated ones). Use classes if you need methods.

## Enums

Enums define named integer constants with auto-incrementing values.

```
enum Color {
    BLACK,       // 0
    RED,         // 1
    GREEN,       // 2
    BLUE = 10,   // 10
    YELLOW       // 11
}

fn main() {
    var c: int = Color.RED;    // c = 1
    if (c == Color.GREEN) {
        Output.printString("green!");
    }
    halt();
}
```

- Enum values are compile-time integer constants (zero cost).
- Values auto-increment from 0, or from a custom `= value`.

## Arrays

Arrays are created using `Array.new(size)` and accessed with `[]` syntax.

```
fn main() {
    var arr: Array = Array.new(10);
    var i: int = 0;
    while (i < 10) {
        arr[i] = i * i;
        i = i + 1;
    }

    // Print them
    i = 0;
    while (i < 10) {
        Output.printInt(arr[i]);
        Output.printChar(32);
        i = i + 1;
    }
    arr.dispose();
    halt();
}
```

- Arrays are untyped (each element is a 16-bit word).
- `arr[i]` compiles to pointer arithmetic (base address + index).
- You must manually `dispose()` arrays when done.

## Built-in Functions

These are special functions handled directly by the compiler:

| Function | Description |
|----------|-------------|
| `peek(addr)` | Read the 16-bit value at memory address `addr`. Returns `int`. |
| `poke(addr, value)` | Write `value` to memory address `addr`. |
| `halt()` | Stop the CPU (infinite loop). Call this at the end of `main()`. |
| `syscall(n, ...)` | Invoke system trap `n` with optional arguments. Advanced/OS use. |

### poke/peek for hardware access

```
poke(0xFF30, 1);           // switch to pixel mode
poke(0xFF30, 0);           // switch to text mode
var key: int = peek(0xFF00); // read keyboard status
```

## Standard Library

The following classes are available without import. They are linked automatically.

### Output

| Method | Description |
|--------|-------------|
| `Output.printChar(c: int)` | Print one character at the current cursor position (text mode). The high byte is the color attribute (default 0x0F = white on black). |
| `Output.printString(s: String)` | Print a string. |
| `Output.printInt(n: int)` | Print an integer (handles negative numbers). |
| `Output.println()` | Move cursor to the start of the next line. |
| `Output.moveCursor(row: int, col: int)` | Set text cursor position (row 0-29, col 0-79). |
| `Output.backSpace()` | Move cursor back one position and clear. |

### Screen (pixel mode)

Before using Screen functions, switch to pixel mode: `poke(0xFF30, 1);`

The pixel display is **160×60 pixels** with **16 CGA colors** (4-bit palette, 0–15).

| Method | Description |
|--------|-------------|
| `Screen.clearScreen()` | Clear the entire screen to black. |
| `Screen.setColor(color: int)` | Set the drawing color (0–15). |
| `Screen.drawPixel(x: int, y: int)` | Draw a single pixel at (x, y). |
| `Screen.drawRectangle(x1: int, y1: int, x2: int, y2: int)` | Draw a filled rectangle. |
| `Screen.drawLine(x1: int, y1: int, x2: int, y2: int)` | Draw a line (currently same as drawRectangle). |

**Color palette (CGA 16-color):**

| Index | Color        | Index | Color         |
|-------|--------------|-------|---------------|
| 0     | Black        | 8     | Dark gray     |
| 1     | Blue         | 9     | Light blue    |
| 2     | Green        | 10    | Light green   |
| 3     | Cyan         | 11    | Light cyan    |
| 4     | Red          | 12    | Light red     |
| 5     | Magenta      | 13    | Light magenta |
| 6     | Brown        | 14    | Yellow        |
| 7     | Light gray   | 15    | White         |

### Keyboard

| Method | Description |
|--------|-------------|
| `Keyboard.keyPressed()` | Returns the ASCII code of the currently pressed key, or 0 if none. Non-blocking. |
| `Keyboard.readChar()` | Blocks until a key is pressed, then returns its ASCII code. |

### Math

| Method | Description |
|--------|-------------|
| `Math.multiply(a: int, b: int) -> int` | Multiply (also invoked by `*`). |
| `Math.divide(a: int, b: int) -> int` | Integer division (also invoked by `/`). |
| `Math.modulo(a: int, b: int) -> int` | Modulo (also invoked by `%`). |
| `Math.xor(a: int, b: int) -> int` | Bitwise XOR (also invoked by `^`). |
| `Math.shiftLeft(x: int, n: int) -> int` | Left shift (also invoked by `<<`). |
| `Math.shiftRight(x: int, n: int) -> int` | Right shift (also invoked by `>>`). |
| `Math.sqrt(x: int) -> int` | Integer square root (floor). |
| `Math.min(a: int, b: int) -> int` | Minimum of two values. |
| `Math.max(a: int, b: int) -> int` | Maximum of two values. |
| `Math.abs(x: int) -> int` | Absolute value. |

### String

| Method | Description |
|--------|-------------|
| `String.new(maxLength: int) -> String` | Allocate a new string with capacity `maxLength`. |
| `String.dispose(s: String)` | Free string memory. |
| `String.length(s: String) -> int` | Get current length. |
| `String.charAt(s: String, index: int) -> int` | Get character at index. |
| `String.appendChar(s: String, c: int) -> String` | Append a character. Returns the string. |
| `String.setCharAt(s: String, index: int, c: int)` | Set character at index. |
| `String.eraseLastChar(s: String)` | Remove the last character. |

Note: String methods are typically called as `myString.length()`, `myString.charAt(i)`, etc. The compiler automatically passes the object as the first argument.

### Array

| Method | Description |
|--------|-------------|
| `Array.new(size: int) -> Array` | Allocate an array of `size` words. |
| `Array.dispose(arr: Array)` | Free array memory. |

### Memory

| Method | Description |
|--------|-------------|
| `Memory.alloc(size: int) -> int` | Allocate `size` words from the heap. Returns the base address. |
| `Memory.deAlloc(addr: int)` | Free previously allocated memory. |
| `Memory.peek(addr: int) -> int` | Read memory at address. |
| `Memory.poke(addr: int, value: int)` | Write memory at address. |

### Sys

| Method | Description |
|--------|-------------|
| `Sys.halt()` | Halt the CPU (same as built-in `halt()`). |
| `Sys.wait(ms: int)` | Busy-wait for approximately `ms` milliseconds. |
| `Sys.error(code: int)` | Print "ERR" followed by the error code and halt. |

## Memory Map

The Hack+ CPU has a 64K × 16-bit address space:

| Address Range | Description |
|---------------|-------------|
| `0x0000–0x000F` | Reserved (stack pointers, frame pointers, temp) |
| `0x0010–0x00FF` | Static variables |
| `0x0100–0xEFFF` | General RAM (heap, stack). Stack grows downward from `0xEFF0`. |
| `0xF000–0xF95F` | Framebuffer (2400 words). Text mode: 80×30 cells. Pixel mode: 40×60 words (160×60 pixels, 4 pixels per word). |
| `0xFF00–0xFF01` | Keyboard (status at +0, ASCII data at +1) |
| `0xFF10–0xFF12` | Timer (control at +0, interval at +1, counter at +2) |
| `0xFF20–0xFF23` | UART (TX status at +0, TX data at +1, RX status at +2, RX data at +3) |
| `0xFF30–0xFF31` | Display controller (mode at +0, cursor position at +1) |
| `0xFF50–0xFF53` | Disk controller (command at +0, sector at +1, mem address at +2, status at +3) |
| `0xFFF0–0xFFF1` | System/interrupt controller (pending at +0, mask at +1) |

### Text mode framebuffer (mode 0)

Each word in the framebuffer at `0xF000` represents one character cell:
- **High nibble** (bits 12–15): background color (0–15)
- **Next nibble** (bits 8–11): foreground color (0–15)
- **Low byte** (bits 0–7): ASCII character code

Example: `0x0F41` = black background, white foreground, character 'A'.

In Jack++, `Output.printChar()` handles this automatically with white-on-black (0x0F).

### Pixel mode framebuffer (mode 1)

Each word packs **4 pixels**, one nibble (4 bits) each, where each nibble is a color index 0–15. The pixel at the leftmost position in a word group is in the highest nibble.

Resolution: 160×60 pixels. Each row is 40 words (160 pixels / 4 pixels-per-word).

## Comments

```
// Single-line comment

/* Multi-line
   comment */
```

## Complete Examples

### Hello World

```
fn main() {
    Output.printString("Hello, Jack++!");
    Output.println();
    halt();
}
```

### Fibonacci Sequence

```
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
    halt();
}
```

### Pixel Art

```
fn main() {
    poke(0xFF30, 1);         // pixel mode
    Screen.clearScreen();

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

    Screen.setColor(15);
    Screen.drawRectangle(50, 15, 110, 45);
    Screen.setColor(0);
    Screen.drawRectangle(55, 20, 105, 40);

    halt();
}
```

### Classes and Objects

```
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
    var c: Counter = Counter.new(3);
    var i: int = 0;
    while (i < 8) {
        c.printValue();
        c.increment();
        i = i + 1;
    }
    Output.printString("Final: ");
    Output.printInt(c.getValue());
    halt();
}
```

### Keyboard Input

```
fn main() {
    Output.printString("Type something (ESC to quit):");
    Output.println();

    loop {
        var key: int = Keyboard.readChar();
        if (key == 27) {
            break;
        }
        Output.printChar(key);
    }

    Output.println();
    Output.printString("Goodbye!");
    halt();
}
```

### Structs and Enums

```
enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

struct Vec2 {
    x: int;
    y: int;
}

fn main() {
    var pos: Vec2 = Vec2.new(80, 30);
    var dir: int = Direction.RIGHT;

    Output.printString("Position: ");
    Output.printInt(pos.x);
    Output.printString(", ");
    Output.printInt(pos.y);
    Output.println();

    Output.printString("Direction: ");
    Output.printInt(dir);
    Output.println();

    pos.dispose();
    halt();
}
```

## Key Gotchas

1. **No `++`, `--`, `+=`, `-=` operators.** Use `i = i + 1`.
2. **All values are 16-bit signed integers.** Maximum value is 32767, minimum is -32768, and overflow wraps.
3. **Braces are always required** for `if`, `else`, `while`, `for`, `loop` bodies.
4. **Parentheses required** around `if` and `while` conditions.
5. **`true` is -1** (all bits set, `0xFFFF`), **`false` is 0**. This is important for bitwise operations.
6. **Strings are heap objects**, not arrays of characters. Use `String.new()` / `String.appendChar()` to build them, or use string literals which compile to that automatically.
7. **No garbage collection.** You must manually call `.dispose()` on objects/arrays/strings you allocate, or you will leak memory.
8. **Always end `main()` with `halt()`**, or the CPU will execute garbage memory.
9. **`*`, `/`, `%`, `^`, `<<`, `>>`** are library function calls (slower than `+`, `-`, `&`, `|`).
10. **No `import` is needed** for the standard library (Math, Output, Screen, Keyboard, String, Array, Memory, Sys). They are linked automatically.
11. **Variable declarations can appear anywhere** inside a function body (not just at the top).
12. **Field access on other objects** (e.g. `p.x`) requires the compiler to know the object's type. Declare variables with the correct type (e.g., `var p: Point`).
