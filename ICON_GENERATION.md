Icon generation
=================

Este proyecto incluye un pequeño script para generar los iconos de la web y los recursos Android (launcher, round, foreground y splash) a partir de una única imagen fuente.

Uso:

1. Coloca tu nuevo logo en `src/assets/nuevo_logo.png` (recomendado: PNG con fondo transparente y resolución alta, p.ej. 1024x1024).
2. Instala dependencias de desarrollo si no están instaladas:

```bash
npm install
```

3. Ejecuta el generador:

```bash
npm run generate-icons
```

El script generará y sobrescribirá los archivos en:

- `public/icon-192.png` y `public/icon-512.png`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png` (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi)
- `android/app/src/main/res/drawable*-*/splash.png` (versiones portrait/landscape)

Notas:
- El script utiliza `sharp` para redimensionar y centrar la imagen. Si prefieres más control (padding, color de fondo, recorte), ajusta `scripts/generate-icons.js`.
- No se modifica `AndroidManifest.xml` ni archivos XML de adaptive icon; los `ic_launcher.xml` existentes apuntan a `@mipmap/ic_launcher_foreground` y al color de fondo configurado.
