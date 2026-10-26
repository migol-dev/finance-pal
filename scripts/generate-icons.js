#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const projectRoot = process.cwd();
  const defaultInput = path.join(projectRoot, "public", "favicon.svg");
  let input = process.argv[2] ? path.resolve(process.argv[2]) : defaultInput;

  // Si se pasa una ruta raster antigua (como .png) o no existe, priorizar public/favicon.svg
  if (!fs.existsSync(input) || input.endsWith(".png") || input.endsWith(".webp")) {
    if (fs.existsSync(defaultInput)) {
      input = defaultInput;
    }
  }

  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    console.error("Asegúrate de que 'public/favicon.svg' existe o pasa la ruta como argumento.");
    process.exit(1);
  }

  console.log(`Usando fuente maestra de logo: ${input}`);
  const svgContent = fs.readFileSync(input, "utf8");

  // Crear versión foreground sin el rect de fondo ni el borde squircle
  const foregroundSvg = svgContent.replace(
    /<rect\s+x="20"\s+y="20"[^>]*\/>/i,
    ""
  );

  // Crear versión redonda con máscara circular
  const roundSvg = svgContent.replace(
    /<rect\s+x="20"\s+y="20"\s+width="472"\s+height="472"\s+rx="118"[^>]*\/>/i,
    '<circle cx="256" cy="256" r="236" fill="url(#bgGrad)" stroke="#2C2C28" stroke-width="8" />'
  );

  const publicDir = path.join(projectRoot, "public");
  const assetsDir = path.join(projectRoot, "src", "assets");
  const androidRes = path.join(projectRoot, "android", "app", "src", "main", "res");

  ensureDir(publicDir);
  ensureDir(assetsDir);
  ensureDir(androidRes);

  console.log("Generando iconos de marca en src/assets/...");
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, "nuevo_logo.png"));

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .webp({ quality: 95 })
    .toFile(path.join(assetsDir, "nuevo_logo.webp"));

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, "app-icon.png"));

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .webp({ quality: 95 })
    .toFile(path.join(assetsDir, "app-icon.webp"));

  console.log("Generando iconos web en public/...");
  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .webp({ quality: 95 })
    .toFile(path.join(publicDir, "icon-192.webp"));

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .webp({ quality: 95 })
    .toFile(path.join(publicDir, "icon-512.webp"));

  const mipmaps = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];

  console.log("Generando iconos Android (mipmap standard, round y adaptive foreground)...");
  for (const [folder, size] of mipmaps) {
    const outDir = path.join(androidRes, folder);
    ensureDir(outDir);

    // 1. Icono estándar (squircle)
    await sharp(Buffer.from(svgContent))
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(path.join(outDir, "ic_launcher.png"));

    // 2. Icono redondo (round mask)
    await sharp(Buffer.from(roundSvg))
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(path.join(outDir, "ic_launcher_round.png"));

    // 3. Foreground adaptativo: monograma centrado dentro del 66% safe zone sobre fondo transparente
    const fgInnerSize = Math.max(16, Math.round(size * 0.66));
    const fgInnerBuffer = await sharp(Buffer.from(foregroundSvg))
      .resize(fgInnerSize, fgInnerSize, { fit: "contain" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: fgInnerBuffer, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, "ic_launcher_foreground.png"));
  }

  // Pantallas Splash sobre fondo #121211 (Obsidian Carbon v2)
  const splashBg = { r: 18, g: 18, b: 17, alpha: 1 }; // #121211
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

  console.log("Generando pantallas splash Android sobre fondo obsidiana #121211...");
  for (const [folder, w, h] of splashTargets) {
    const outDir = path.join(androidRes, folder);
    ensureDir(outDir);

    const logoSize = Math.min(Math.round(Math.min(w, h) * 0.42), 260);
    const logoBuffer = await sharp(Buffer.from(svgContent))
      .resize(logoSize, logoSize, { fit: "contain" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: splashBg,
      },
    })
      .composite([{ input: logoBuffer, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, "splash.png"));
  }

  // Root drawable fallback
  const drawableRoot = path.join(androidRes, "drawable");
  ensureDir(drawableRoot);
  const rootLogoSize = 260;
  const rootLogoBuffer = await sharp(Buffer.from(svgContent))
    .resize(rootLogoSize, rootLogoSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: splashBg,
    },
  })
    .composite([{ input: rootLogoBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(drawableRoot, "splash.png"));

  console.log("✓ Todos los iconos y splash screens generados exitosamente con el nuevo diseño.");
}

main().catch((err) => {
  console.error("Error al generar iconos:", err);
  process.exit(1);
});
