import { SupportError } from "./errors.js";

const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

// Images are sent as they came in, minus EXIF, XMP, text chunks and comments.
const PNG_KEEP = new Set([
  "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP",
  "sBIT", "pHYs", "bKGD", "cICP", "acTL", "fcTL", "fdAT",
]);

export function cleanImages(files) {
  const uploads = files.filter((file) => file && typeof file !== "string" && file.size > 0);
  if (uploads.length > MAX_FILES) {
    throw new SupportError("too_many_images", "You can add up to 4 images.", 413);
  }

  let inputBytes = 0;
  return Promise.all(uploads.map(async (file, index) => {
    const name = displayName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      throw new SupportError("image_too_large", `${name} is larger than 8 MB.`, 413);
    }
    inputBytes += file.size;
    if (inputBytes > MAX_TOTAL_BYTES) {
      throw new SupportError("images_too_large", "The selected images are larger than 16 MB combined.", 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = readImage(bytes, name);
    if (image.width * image.height > MAX_PIXELS) {
      throw new SupportError("image_pixels_too_large", `${name} is larger than 25 megapixels.`, 413);
    }
    return {
      name: `image-${index + 1}.${image.extension}`,
      mime: image.mime,
      bytes: image.bytes,
    };
  }));
}

function readImage(bytes, name) {
  try {
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return cleanPng(bytes);
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return cleanJpeg(bytes);
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return cleanWebp(bytes);
  } catch (error) {
    if (error instanceof SupportError) throw error;
    throw new SupportError("image_decode_invalid", `${name} could not be read as an image.`, 400);
  }
  throw new SupportError("image_type_invalid", `${name} must be a PNG, JPEG, or WebP image.`, 400);
}

function cleanPng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.subarray(0, 8)];
  let width = 0;
  let height = 0;
  let ended = false;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("truncated chunk");
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
    }
    if (PNG_KEEP.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === "IEND") {
      ended = true;
      break;
    }
  }
  if (!width || !height || !ended) throw new Error("bad png");
  return { mime: "image/png", extension: "png", width, height, bytes: concat(parts) };
}

function cleanJpeg(bytes) {
  const parts = [bytes.subarray(0, 2)];
  let width = 0;
  let height = 0;
  let scanned = false;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("bad marker");
    let marker = bytes[offset + 1];
    while (marker === 0xff) marker = bytes[++offset + 1];
    const start = offset;

    if (marker === 0xd9) {
      // End of image. Anything after it (extra previews, motion clips) is dropped.
      if (!width || !height || !scanned) throw new Error("no image data");
      parts.push(bytes.subarray(start, start + 2));
      return { mime: "image/jpeg", extension: "jpg", width, height, bytes: concat(parts) };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(start, start + 2));
      offset += 2;
      continue;
    }

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const end = offset + 2 + length;
    if (length < 2 || end > bytes.length) throw new Error("truncated segment");

    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      width = (bytes[offset + 7] << 8) | bytes[offset + 8];
    }
    if (marker === 0xda) {
      // Scan data runs until the next marker that isn't a stuffed byte or restart.
      let next = end;
      while (true) {
        next = bytes.indexOf(0xff, next);
        if (next < 0 || next + 1 >= bytes.length) throw new Error("truncated scan");
        const code = bytes[next + 1];
        if (code !== 0x00 && (code < 0xd0 || code > 0xd7)) break;
        next += 2;
      }
      parts.push(bytes.subarray(start, next));
      scanned = true;
      offset = next;
      continue;
    }
    if (keepJpegSegment(bytes, marker, offset + 4)) parts.push(bytes.subarray(start, end));
    offset = end;
  }
  throw new Error("no end of image");
}

function keepJpegSegment(bytes, marker, dataStart) {
  if (marker === 0xfe) return false;
  if (marker === 0xe0) return ascii(bytes, dataStart, 5) === "JFIF\0";
  if (marker === 0xe2) return ascii(bytes, dataStart, 12) === "ICC_PROFILE\0";
  if (marker === 0xee) return ascii(bytes, dataStart, 5) === "Adobe";
  return marker < 0xe0 || marker > 0xef;
}

function cleanWebp(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.slice(0, 12)];
  let width = 0;
  let height = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size + (size % 2);
    if (offset + 8 + size > bytes.length) throw new Error("truncated chunk");
    const data = offset + 8;

    if (type === "VP8X") {
      width = 1 + (bytes[data + 4] | (bytes[data + 5] << 8) | (bytes[data + 6] << 16));
      height = 1 + (bytes[data + 7] | (bytes[data + 8] << 8) | (bytes[data + 9] << 16));
      const chunk = bytes.slice(offset, Math.min(end, bytes.length));
      chunk[8] &= ~0x0c; // no EXIF or XMP chunks follow
      parts.push(chunk);
    } else if (type === "VP8 " && !width) {
      if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) throw new Error("bad vp8");
      width = view.getUint16(data + 6, true) & 0x3fff;
      height = view.getUint16(data + 8, true) & 0x3fff;
      parts.push(bytes.subarray(offset, Math.min(end, bytes.length)));
    } else if (type === "VP8L" && !width) {
      if (bytes[data] !== 0x2f) throw new Error("bad vp8l");
      const bits = view.getUint32(data + 1, true);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
      parts.push(bytes.subarray(offset, Math.min(end, bytes.length)));
    } else if (type !== "EXIF" && type !== "XMP ") {
      parts.push(bytes.subarray(offset, Math.min(end, bytes.length)));
    }
    offset = end;
  }
  if (!width || !height) throw new Error("bad webp");
  const output = concat(parts);
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  return { mime: "image/webp", extension: "webp", width, height, bytes: output };
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function displayName(name) {
  const clean = String(name || "image").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean || "image";
}
