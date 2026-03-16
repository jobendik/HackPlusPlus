// Utility functions
var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var hex = (n, width = 4) => (n & 65535).toString(16).toUpperCase().padStart(width, "0");
var bin16 = (n) => (n & 65535).toString(2).padStart(16, "0");
var parseFlexibleNumber = (s) => {
  if (!s) return null;
  const t = String(s).trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16) & 65535;
  if (/^0b[01]+$/i.test(t)) return parseInt(t.slice(2), 2) & 65535;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10) & 65535;
  return null;
};
var asciiFromKey = (event) => {
  if (event.key.length === 1) return event.key.charCodeAt(0) & 255;
  if (event.key === "Enter") return 10;
  if (event.key === "Backspace") return 8;
  if (event.key === "Tab") return 9;
  if (event.key === "Escape") return 27;
  return null;
};

