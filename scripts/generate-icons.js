#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const input = process.argv[2] || "src/assets/nuevo_logo.png";
  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    console.error("Coloca tu nuevo logo en 'src/assets/nuevo_logo.png' o pásalo como argumento.");
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const publicDir = path.join(projectRoot, "public");
  const androidRes = path.join(projectRoot, "android", "app", "src", "main", "res");

  ensureDir(publicDir);
  ensureDir(androidRes);

  console.log("Generando iconos web...");
  await sharp(input).resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, "icon-192.png"));
  await sharp(input).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, "icon-512.png"));
  await sharp(input).resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toFile(path.join(publicDir, "icon-192.webp"));
  await sharp(input).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toFile(path.join(publicDir, "icon-512.webp"));

  const mipmaps = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];

  console.log("Generando iconos Android (mipmap)...");
  for (const [folder, size] of mipmaps) {
    const outDir = path.join(androidRes, folder);
    ensureDir(outDir);
    await sharp(input).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(outDir, "ic_launcher.png"));
    await sharp(input).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(outDir, "ic_launcher_round.png"));
    await sharp(input).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(outDir, "ic_launcher_foreground.png"));
  }

  // Splash sizes (portrait and landscape): approximate sensible defaults
  const splashTargets = [
    ["drawable-port-mdpi", 320, 480],
    ["drawable-port-hdpi", 480, 800],
    ["drawable-port-xhdpi", 720, 1280],
    ["drawable-port-xxhdpi", 960, 1600],
    ["drawable-port-xxxhdpi", 1280, 1920],
    ["drawable-land-mdpi", 480, 320],
    ["drawable-land-hdpi", 800, 480],
    ["drawable-land-xhdpi", 1280, 720],
    ["drawable-land-xxhdpi", 1600, 960],
    ["drawable-land-xxxhdpi", 1920, 1280],
  ];

  console.log("Generando pantallas splash para Android...");
  for (const [folder, w, h] of splashTargets) {
    const outDir = path.join(androidRes, folder);
    ensureDir(outDir);
    await sharp(input).resize(w, h, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(path.join(outDir, "splash.png"));
  }

  // Root drawable fallback
  const drawableRoot = path.join(androidRes, "drawable");
  ensureDir(drawableRoot);
  await sharp(input).resize(1024, 1024, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(path.join(drawableRoot, "splash.png"));

  console.log("Iconos y splash generados correctamente. Revisa 'public/' y 'android/app/src/main/res/'");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
