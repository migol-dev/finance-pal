const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readRoots() {
  const files = [];
  const roots = ['src', 'public', 'scripts', 'vite.config.ts', 'index.html', 'postcss.config.js'];
  for (const r of roots) {
    const p = path.join(process.cwd(), r);
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isFile()) files.push(p);
        else walk(p, files);
      }
    } catch (e) { /* ignore */ }
  }
  // Also include project root files
  ['package.json', 'tsconfig.json', 'vite.config.ts'].forEach((f) => {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) files.push(p);
  });
  return files.filter(Boolean);
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function main() {
  const pkg = JSON.parse(readFileSafe(path.join(process.cwd(), 'package.json')) || '{}');
  const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  const files = readRoots();
  const content = files.map((f) => ({ path: path.relative(process.cwd(), f), text: readFileSafe(f) }));

  const used = [];
  const maybe = [];
  const unused = [];

  for (const d of deps) {
    const pattern = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp("from\\s+['\"]" + pattern + "['\"]|require\\(\\s*['\"]" + pattern + "['\"]\\s*\\)|['\"]" + pattern + "['\"]", 'm');
    let found = false;
    for (const f of content) {
      if (re.test(f.text)) { found = true; break; }
    }
    if (found) used.push(d);
    else unused.push(d);
  }

  const report = { scannedFiles: files.length, depsChecked: deps.length, used, unused };
  fs.writeFileSync(path.join(process.cwd(), 'depcheck_report.json'), JSON.stringify(report, null, 2));
  console.log('Wrote depcheck_report.json —', report.depsChecked, 'deps checked,', report.used.length, 'used,', report.unused.length, 'candidates unused');
}

main();
