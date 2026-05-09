#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
        await processDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        const outPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, ".webp");
        console.log(`Optimizing: ${fullPath} -> ${outPath}`);
        try {
          await sharp(fullPath)
            .webp({ quality: 80, effort: 6 })
            .toFile(outPath);
          // Optional: remove original file if you want to fully migrate to webp
          // fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Error processing ${fullPath}:`, err.message);
        }
      }
    }
  }
}

async function main() {
  const projectRoot = process.cwd();
  console.log("Starting image optimization to WebP...");

  // Folders to optimize
  const folders = ["src/assets", "public"];

  for (const folder of folders) {
    const fullPath = path.join(projectRoot, folder);
    if (fs.existsSync(fullPath)) {
      console.log(`Processing folder: ${folder}`);
      await processDirectory(fullPath);
    }
  }

  console.log("Optimization complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
