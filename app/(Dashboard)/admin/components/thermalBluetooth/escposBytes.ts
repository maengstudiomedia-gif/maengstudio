const ESC = 0x1b;
const GS = 0x1d;

function u8(...bytes: number[]) {
  return new Uint8Array(bytes);
}

function concat(...parts: Uint8Array[]) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function initPrinter() {
  return u8(ESC, 0x40);
}

function textLine(s: string) {
  return new TextEncoder().encode(`${s}\n`);
}

function feed(n = 3) {
  return new TextEncoder().encode("\n".repeat(n));
}

/** Potong kertas (umum di printer 80mm ESC/POS). */
function partialCut() {
  return u8(GS, 0x56, 0x01);
}

export function buildEscPosBytes(lines: string[]): Uint8Array {
  const parts: Uint8Array[] = [initPrinter(), u8(ESC, 0x61, 0)];
  for (const line of lines) {
    parts.push(textLine(line));
  }
  parts.push(feed(4), partialCut());
  return concat(...parts);
}

export { concat as concatUint8Arrays };
