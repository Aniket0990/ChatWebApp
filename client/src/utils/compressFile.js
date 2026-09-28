/**
 * Client-side attachment preparation.
 *
 * Every uploaded file must fit within `MAX_FILE_BYTES` (2 MB). Images are
 * re-encoded on a canvas (quality + dimension step-down) until they fit; other
 * formats (pdf, docx, zip, video...) are already compressed, so anything over
 * the limit is rejected instead of silently sent at full size.
 */

export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Longest edge kept when re-encoding, to bound canvas memory + output size. */
const MAX_DIMENSION = 1920;

/** Raster formats we can meaningfully re-encode. Gif/Svg are left untouched. */
const COMPRESSIBLE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
];

const mbLabel = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;

const isCompressibleImage = (file) =>
  COMPRESSIBLE_IMAGE_TYPES.includes((file.type || "").toLowerCase());

/** Probe whether the browser can actually encode the given mime type. */
const canEncode = (mime) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL(mime).startsWith(`data:${mime}`);
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image"));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, mime, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, mime, quality));

/** Wrap an encoded blob in a File, swapping the extension to match the mime. */
const toFile = (blob, originalName, mime) => {
  const ext = mime === "image/webp" ? "webp" : "jpg";
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
};

/**
 * Re-encode an image so it fits within `maxBytes`.
 * Quality is reduced first, then the dimensions are scaled down.
 * Returns the smallest encoding produced (which may still exceed `maxBytes`).
 */
export const compressImage = async (file, maxBytes = MAX_FILE_BYTES) => {
  if (!isCompressibleImage(file) || file.size <= maxBytes) return file;

  const img = await loadImage(file);
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // WebP keeps transparency and compresses better; fall back to JPEG.
  const mime = canEncode("image/webp") ? "image/webp" : "image/jpeg";

  let scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(naturalWidth, naturalHeight),
  );
  let quality = 0.9;
  let best = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // JPEG has no alpha channel, so flatten transparency onto white.
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, mime, quality);
    if (blob) {
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= maxBytes) return toFile(blob, file.name, mime);
    }

    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.1);
    } else {
      scale *= 0.8;
    }
  }

  return best ? toFile(best, file.name, mime) : file;
};

/**
 * Prepare a file for upload, guaranteeing it is within `maxBytes`.
 * Returns the original file when it already fits, the compressed image when
 * compression succeeds, and throws `FILE_TOO_LARGE` otherwise.
 */
export const prepareFileForUpload = async (file, maxBytes = MAX_FILE_BYTES) => {
  if (!file || file.size <= maxBytes) return file;

  if (isCompressibleImage(file)) {
    const compressed = await compressImage(file, maxBytes);
    if (compressed && compressed.size <= maxBytes) return compressed;
  }

  const error = new Error(
    `"${file.name}" is larger than ${mbLabel(maxBytes)} and can't be compressed`,
  );
  error.code = "FILE_TOO_LARGE";
  throw error;
};
