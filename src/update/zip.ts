/**
 * Minimal ZIP reader for the self-updater. The release asset is a plain
 * Info-ZIP archive (deflate), so `DecompressionStream` parses it without
 * shipping an external library.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

// ZIP signatures, matched as little-endian dwords.
const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const u16 = (b: Uint8Array, off: number): number => b[off] | (b[off + 1] << 8);

const u32 = (b: Uint8Array, off: number): number =>
  (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;

const decoder = new TextDecoder();

// Normalises an entry name and returns null when it would escape the target
// directory (zip-slip) or is a plain directory record.
const normalizeName = (raw: string): string | null => {
  const name = raw.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!name || name.endsWith("/")) return null;
  if (name.startsWith("/") || /^[a-zA-Z]:/.test(name)) return null;
  const parts = name.split("/");
  if (parts.some((p) => p === ".." || p === "")) return null;
  return name;
};

const inflateRaw = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
};

export const parseZip = async (bytes: Uint8Array): Promise<ZipEntry[]> => {
  // Locate the End Of Central Directory record; the archive comment can hold
  // an arbitrary tail, so the scan walks back over up to 64 KiB.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(bytes, i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: end of central directory not found");
  const count = u16(bytes, eocd + 10);
  let off = u32(bytes, eocd + 16);

  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (u32(bytes, off) !== SIG_CENTRAL) throw new Error("zip: corrupt central directory");
    const method = u16(bytes, off + 10);
    const csize = u32(bytes, off + 20);
    const nameLen = u16(bytes, off + 28);
    const extraLen = u16(bytes, off + 30);
    const commentLen = u16(bytes, off + 32);
    const localOff = u32(bytes, off + 42);
    const name = normalizeName(decoder.decode(bytes.subarray(off + 46, off + 46 + nameLen)));
    if (name && csize > 0) {
      // The local header repeats the name/extra lengths; data starts after
      // them, so the local lengths must be read, not the central ones.
      if (u32(bytes, localOff) !== SIG_LOCAL) throw new Error("zip: corrupt local header");
      const nameLenL = u16(bytes, localOff + 26);
      const extraLenL = u16(bytes, localOff + 28);
      const dataOff = localOff + 30 + nameLenL + extraLenL;
      const raw = bytes.subarray(dataOff, dataOff + csize);
      const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
      if (!data) throw new Error(`zip: unsupported method ${method} for ${name}`);
      entries.push({ name, data });
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
};
