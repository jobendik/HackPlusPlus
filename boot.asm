; ============================================================
; HackDOS Boot Loader - boot.asm
; Hack+ Assembly
;
; This is the first stage boot loader for HackDOS.
; It initializes hardware, clears the screen, shows a
; boot splash, and (in a real system) would jump to
; the OS kernel loaded at a known address.
;
; Memory layout:
;   RAM[0x0002] = cursor variable (framebuffer address)
;   Stack: 0xEFF0 (grows downward)
;
; Framebuffer: 0xF000 (80x30 text cells)
; Cell format: (bg<<12) | (fg<<8) | ascii
;   Example: 0x0F48 = black bg, white fg, 'H'
;            0x1F48 = blue bg,  white fg, 'H'
; ============================================================

.EQU DISP_CTRL,    0xFF30    ; Display mode register (0=text, 1=pixel)
.EQU FRAMEBUF,     0xF000    ; Start of framebuffer
.EQU FRAMEBUF_END, 0xF960    ; End of framebuffer (0xF000 + 2400)
.EQU STACK_TOP,    0xEFF0    ; Stack grows down from here
.EQU CURSOR_VAR,   0x0002    ; RAM address holding current cursor

; ============================================================
; RESET VECTOR / ENTRY POINT (address 0x0000)
; ============================================================

reset:
    ; --- Initialize stack pointer ---
    LDA SP, STACK_TOP

    ; --- Switch to text mode ---
    LDA A, DISP_CTRL
    CLR D
    STORE D, [A]

    ; --- Initialize cursor to framebuffer start ---
    LDA A, CURSOR_VAR
    LDA D, FRAMEBUF
    STORE D, [A]

    ; --------------------------------------------------------
    ; CLEAR SCREEN
    ; Fill 0xF000..0xF95F with 0x0720 (black bg, gray fg, space)
    ; This gives the classic dark DOS look.
    ; --------------------------------------------------------
    LDA A, FRAMEBUF
    LDA D, 0x0720
cls_loop:
    STORE D, [A]
    INC A
    PUSH D
    LDA D, FRAMEBUF_END
    CMP A, D
    POP D
    BRN cls_loop

    ; --------------------------------------------------------
    ; HEADER ROW (row 0)
    ; Fill row 0 (80 cells) with 0x1F20 (blue bg, white fg, space)
    ; --------------------------------------------------------
    LDA A, FRAMEBUF
    LDA D, 0x1F20
hdr_fill:
    STORE D, [A]
    INC A
    PUSH D
    LDA D, 0xF050
    CMP A, D
    POP D
    BRN hdr_fill

    ; Write "  HackDOS v1.0  " at col 32 (white on blue)
    ; 0xF000 + 32 = 0xF020
    LDA A, 0xF020
    LDA D, 0x1F20 ; ' '
    STORE D, [A+0]
    STORE D, [A+1]
    LDA D, 0x1F48 ; 'H'
    STORE D, [A+2]
    LDA D, 0x1F61 ; 'a'
    STORE D, [A+3]
    LDA D, 0x1F63 ; 'c'
    STORE D, [A+4]
    LDA D, 0x1F6B ; 'k'
    STORE D, [A+5]
    LDA D, 0x1F44 ; 'D'
    STORE D, [A+6]
    LDA D, 0x1F4F ; 'O'
    STORE D, [A+7]
    LDA D, 0x1F53 ; 'S'
    STORE D, [A+8]
    LDA D, 0x1F20 ; ' '
    STORE D, [A+9]
    LDA D, 0x1F76 ; 'v'
    STORE D, [A+10]
    LDA D, 0x1F31 ; '1'
    STORE D, [A+11]
    LDA D, 0x1F2E ; '.'
    STORE D, [A+12]
    LDA D, 0x1F30 ; '0'
    STORE D, [A+13]
    LDA D, 0x1F20 ; ' '
    STORE D, [A+14]
    STORE D, [A+15]

    ; Write "[?=Help]" at right side of header (col 70)
    ; 0xF000 + 70 = 0xF046
    LDA A, 0xF046
    LDA D, 0x1F5B ; '['
    STORE D, [A+0]
    LDA D, 0x1F3F ; '?'
    STORE D, [A+1]
    LDA D, 0x1F3D ; '='
    STORE D, [A+2]
    LDA D, 0x1F48 ; 'H'
    STORE D, [A+3]
    LDA D, 0x1F65 ; 'e'
    STORE D, [A+4]
    LDA D, 0x1F6C ; 'l'
    STORE D, [A+5]
    LDA D, 0x1F70 ; 'p'
    STORE D, [A+6]
    LDA D, 0x1F5D ; ']'
    STORE D, [A+7]

    ; --------------------------------------------------------
    ; BOOT MESSAGES
    ; Set cursor to each row and call print_str (B = string ptr)
    ; --------------------------------------------------------

    ; Row 2 = 0xF000 + 160 = 0xF0A0
    LDA A, CURSOR_VAR
    LDA D, 0xF0A0
    STORE D, [A]
    LDA A, STR_INIT
    MOV B, A
    LDA A, print_str
    CALL

    ; Row 3 = 0xF000 + 240 = 0xF0F0
    LDA A, CURSOR_VAR
    LDA D, 0xF0F0
    STORE D, [A]
    LDA A, STR_COPY
    MOV B, A
    LDA A, print_str
    CALL

    ; Row 5 = 0xF000 + 400 = 0xF190
    LDA A, CURSOR_VAR
    LDA D, 0xF190
    STORE D, [A]
    LDA A, STR_MEM
    MOV B, A
    LDA A, print_str
    CALL

    ; Row 6 = 0xF000 + 480 = 0xF1E0
    LDA A, CURSOR_VAR
    LDA D, 0xF1E0
    STORE D, [A]
    LDA A, STR_VID
    MOV B, A
    LDA A, print_str
    CALL

    ; Row 7 = 0xF000 + 560 = 0xF230
    LDA A, CURSOR_VAR
    LDA D, 0xF230
    STORE D, [A]
    LDA A, STR_KB
    MOV B, A
    LDA A, print_str
    CALL

    ; Short delay
    LDA A, delay
    CALL

    ; Row 9 = 0xF000 + 720 = 0xF2D0
    LDA A, CURSOR_VAR
    LDA D, 0xF2D0
    STORE D, [A]
    LDA A, STR_LOAD
    MOV B, A
    LDA A, print_str
    CALL

    ; Longer delay (3x)
    LDA A, delay
    CALL
    LDA A, delay
    CALL
    LDA A, delay
    CALL

    ; Row 11 = 0xF000 + 880 = 0xF370
    LDA A, CURSOR_VAR
    LDA D, 0xF370
    STORE D, [A]
    LDA A, STR_READY
    MOV B, A
    LDA A, print_str
    CALL

    ; --------------------------------------------------------
    ; Jump to VM bootstrap which starts the Jack++ OS kernel
    ; --------------------------------------------------------
    LDA A, __vm_boot
    JMP


; ============================================================
; SUBROUTINE: print_str
;
; Prints a null-terminated string to the framebuffer.
; Uses white-on-black (0x0F) color attribute.
;
; Input:  B = address of null-terminated string
;         RAM[CURSOR_VAR] (0x0002) = current cursor position
; Output: RAM[CURSOR_VAR] updated to next write position
; Clobbers: A, D (but saves/restores via stack), B (advances)
; ============================================================
print_str:
    PUSH A
    PUSH D
pstr_loop:
    MOV A, B              ; A = current string pointer
    LOAD D, [A]           ; D = character at that address
    TST D                 ; test D (sets Z if D == 0)
    BRZ pstr_done         ; null terminator -> done
    ; Build colored cell: 0x0F00 | character
    PUSH D                ; save raw character
    LDA D, 0x0F00         ; D = white-on-black attribute
    POP A                 ; A = raw character
    OR D, A               ; D = 0x0F00 | char (colored cell)
    ; Write colored cell to framebuffer at cursor position
    PUSH D                ; save colored cell
    LDA A, CURSOR_VAR     ; A = address of cursor variable
    LOAD A, [A]           ; A = cursor (framebuffer address)
    POP D                 ; D = colored cell
    STORE D, [A]          ; framebuffer[cursor] = colored cell
    INC A                 ; advance cursor (A = cursor + 1)
    ; Save updated cursor back to RAM
    PUSH D                ; save D (colored cell, no longer needed)
    MOV D, A              ; D = new cursor value
    LDA A, CURSOR_VAR     ; A = &cursor
    STORE D, [A]          ; RAM[CURSOR_VAR] = new cursor
    POP D                 ; restore D
    ; Advance string pointer: B = B + 1
    PUSH A                ; save A (= CURSOR_VAR = 2)
    LDI A, 1
    ADD B, A              ; B++ (string pointer advances)
    POP A                 ; restore A
    BRA pstr_loop
pstr_done:
    POP D
    POP A
    RET


; ============================================================
; SUBROUTINE: delay
;
; Busy-wait delay loop (~5000 iterations).
; ============================================================
delay:
    PUSH A
    PUSH D
    LDA D, 5000
dly_loop:
    DEC D
    TST D
    BRP dly_loop
    POP D
    POP A
    RET


; ============================================================
; STRING DATA (placed after HALT - CPU never reaches here)
; ============================================================

STR_INIT:
    .string "Initializing HackDOS v1.0 ..."

STR_COPY:
    .string "Copyright (c) 2025 HackCorp. All rights reserved."

STR_MEM:
    .string "Memory test ..............  2400 words [ OK ]"

STR_VID:
    .string "Video adapter .............  Text 80x30 [ OK ]"

STR_KB:
    .string "Keyboard ......................  PS/2 std [ OK ]"

STR_LOAD:
    .string "Loading COMMAND.COM ..."

STR_READY:
    .string "System ready. Run hackdos.jack to start."
