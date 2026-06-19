import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ASSETS_DIR = path.resolve("public/assets");
const MIN_SIZE_BYTES = 50 * 1024;
const MAX_WIDTH = Number(process.env.IMAGE_MAX_WIDTH || 1600);
const JPEG_QUALITY = Number(process.env.IMAGE_JPEG_QUALITY || 76);
const WEBP_QUALITY = Number(process.env.IMAGE_WEBP_QUALITY || 76);
const MIN_SAVING_RATIO = 0.04;
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const original = await fs.readFile(filePath);

  if (original.byteLength < MIN_SIZE_BYTES) {
    return { skipped: true, reason: "small" };
  }

  const metadata = await sharp(original).metadata();
  let pipeline = sharp(original, { animated: true }).rotate();

  if (metadata.width && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY, effort: 5 });
  } else if (ext === ".png") {
    // Keep PNG format so existing asset paths keep working. This is mostly lossless compression.
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 });
  }

  const optimized = await pipeline.toBuffer();
  const savingRatio = 1 - optimized.byteLength / original.byteLength;

  if (optimized.byteLength < original.byteLength && savingRatio >= MIN_SAVING_RATIO) {
    await fs.writeFile(filePath, optimized);
    return {
      optimized: true,
      before: original.byteLength,
      after: optimized.byteLength,
      saved: original.byteLength - optimized.byteLength,
    };
  }

  return { skipped: true, reason: "not_smaller" };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  try {
    await fs.access(ASSETS_DIR);
  } catch {
    console.log("No public/assets directory found. Skipping image optimization.");
    return;
  }

  const files = await walk(ASSETS_DIR);
  let optimizedCount = 0;
  let savedBytes = 0;

  for (const filePath of files) {
    try {
      const result = await optimizeImage(filePath);
      if (result.optimized) {
        optimizedCount += 1;
        savedBytes += result.saved;
        console.log(`Optimized ${path.relative(process.cwd(), filePath)}: ${formatBytes(result.before)} → ${formatBytes(result.after)}`);
      }
    } catch (error) {
      console.warn(`Skipped ${path.relative(process.cwd(), filePath)}: ${error.message}`);
    }
  }

  console.log(`Image optimization complete: ${optimizedCount}/${files.length} files optimized, ${formatBytes(savedBytes)} saved before deploy.`);
}

main().catch((error) => {
  console.error("Image optimization failed:", error);
  process.exit(1);
});
