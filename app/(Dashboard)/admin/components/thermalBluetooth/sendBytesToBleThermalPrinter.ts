type BleChar = {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue: (v: BufferSource) => Promise<void>;
  writeValueWithoutResponse: (v: BufferSource) => Promise<void>;
};

type BleServer = {
  disconnect: () => void;
  getPrimaryServices: () => Promise<{ getCharacteristics: () => Promise<BleChar[]> }[]>;
};

type BleGatt = {
  connect: () => Promise<BleServer>;
};

type BleDevice = { gatt?: BleGatt };

/**
 * Kirim byte ESC/POS ke printer thermal BLE (Web Bluetooth).
 * Mendukung banyak printer 80mm yang mengekspos karakteristik GATT writable.
 */
export async function sendBytesToBleThermalPrinter(payload: Uint8Array): Promise<void> {
  const nav = navigator as unknown as { bluetooth?: { requestDevice: (o: object) => Promise<BleDevice> } };
  const bluetooth = nav.bluetooth;
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge desktop atau Android.");
  }

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "0000ff00-0000-1000-8000-00805f9b34fb",
      "000018f0-0000-1000-8000-00805f9b34fb",
    ],
  });

  const gatt = device.gatt;
  if (!gatt) throw new Error("GATT tidak tersedia pada perangkat ini.");

  const server = await gatt.connect();
  const services = await server.getPrimaryServices();

  let writable: BleChar | null = null;
  let preferWithoutResponse = false;

  outer: for (const service of services) {
    let characteristics: BleChar[];
    try {
      characteristics = await service.getCharacteristics();
    } catch {
      continue;
    }
    for (const c of characteristics) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        const uuid = c.uuid.toLowerCase();
        if (uuid.includes("6e400002") || uuid.includes("49535343-8841") || uuid.includes("0000ff02")) {
          writable = c;
          preferWithoutResponse = Boolean(c.properties.writeWithoutResponse);
          break outer;
        }
        if (!writable) {
          writable = c;
          preferWithoutResponse = Boolean(c.properties.writeWithoutResponse && !c.properties.write);
        }
      }
    }
  }

  if (!writable) {
    server.disconnect();
    throw new Error("Tidak menemukan kanal tulis (TX). Pastikan printer BLE ESC/POS dan sudah pairing.");
  }

  const chunkSize = preferWithoutResponse ? 100 : 512;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const slice = payload.subarray(i, i + chunkSize);
    const chunk = new Uint8Array(slice.byteLength);
    chunk.set(slice);
    const buf = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    try {
      if (preferWithoutResponse && writable.properties.writeWithoutResponse) {
        await writable.writeValueWithoutResponse(buf);
      } else {
        await writable.writeValue(buf);
      }
    } catch (e) {
      if (preferWithoutResponse) {
        await writable.writeValue(buf);
      } else {
        throw e;
      }
    }
  }

  try {
    server.disconnect();
  } catch {
    /* abaikan */
  }
}
