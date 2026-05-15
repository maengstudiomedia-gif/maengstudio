const ESC = 0x1b;
const GS = 0x1d;

export function u8(...bytes: number[]) {
  return new Uint8Array(bytes);
}

export function concat(...parts: Uint8Array[]) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// --- PERINTAH DASAR ---
export function initPrinter() { return u8(ESC, 0x40); }
export function align(pos: 0 | 1 | 2) { return u8(ESC, 0x61, pos); } // 0: Kiri, 1: Tengah, 2: Kanan
export function bold(on: boolean) { return u8(ESC, 0x45, on ? 1 : 0); }
export function textSize(doubleW: boolean, doubleH: boolean) {
  const n = (doubleW ? 0x10 : 0) | (doubleH ? 0x01 : 0);
  return u8(GS, 0x21, n);
}
export function textLine(s: string) { return new TextEncoder().encode(`${s}\n`); }
export function feed(n = 1) { return new TextEncoder().encode("\n".repeat(n)); }
export function partialCut() { return u8(GS, 0x56, 0x01); }

// --- PERINTAH BARCODE CODE128 ---
export function printBarcode128(data: string) {
  const bytes = new TextEncoder().encode(`{B${data}`); // Menggunakan Charset B
  return concat(
    u8(GS, 0x48, 0x02),             // Posisi Teks Barcode (0: Tidak ada, 1: Atas, 2: Bawah)
    u8(GS, 0x68, 60),               // Tinggi Barcode (60 dots)
    u8(GS, 0x77, 2),                // Ketebalan Garis Barcode (2 dots)
    u8(GS, 0x6B, 73, bytes.length), // Perintah Print Code128
    bytes
  );
}

// --- PERINTAH QR CODE ---
export function printQRCode(data: string, size = 6) {
  const bytes = new TextEncoder().encode(data);
  const len = bytes.length + 3;
  const pl = len % 256;
  const ph = Math.floor(len / 256);
  
  return concat(
    u8(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00), // Select Model 2
    u8(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size),       // Set Ukuran (Size)
    u8(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30),       // Error Correction L
    u8(GS, 0x28, 0x6B, pl, ph, 0x31, 0x50, 0x30),           // Store Data ke Buffer
    bytes,
    u8(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)        // Print QR Code
  );
}