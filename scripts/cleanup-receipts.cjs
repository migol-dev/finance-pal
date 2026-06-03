#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function usage() {
  console.log('Usage: node scripts/cleanup-receipts.cjs [--dir=receipts] [--export=export.json] [--delete]');
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    if (a.startsWith('--dir=')) opts.dir = a.split('=')[1];
    else if (a.startsWith('--export=')) opts.export = a.split('=')[1];
    else if (a === '--delete') opts.delete = true;
    else if (a === '--help' || a === '-h') { usage(); return; }
  }
  const dir = opts.dir ? path.resolve(opts.dir) : path.resolve(process.cwd(), 'receipts');
  if (!await exists(dir)) {
    console.log(`Receipts directory not found: ${dir}`);
    return;
  }
  const files = await fs.readdir(dir);
  const referenced = new Set();
  if (opts.export) {
    const expPath = path.resolve(opts.export);
    if (!await exists(expPath)) {
      console.log(`Export file not found: ${expPath}`);
    } else {
      try {
        const raw = await fs.readFile(expPath, 'utf8');
        const parsed = JSON.parse(raw);
        const txs = (parsed?.data?.transactions) || parsed?.transactions || [];
        for (const t of txs) {
          const r = t?.receipt;
          if (typeof r === 'string') referenced.add(path.basename(r));
        }
      } catch (e) {
        console.error('Failed to parse export JSON:', e.message || e);
      }
    }
  }

  const orphans = files.filter(f => !referenced.has(f));
  console.log(`Found ${files.length} files in ${dir}`);
  if (opts.export) console.log(`Referenced from export: ${referenced.size}`);
  if (orphans.length === 0) {
    console.log('No orphan receipts found.');
    return;
  }
  console.log('Orphan receipts:');
  for (const o of orphans) console.log(' -', o);

  if (opts.delete) {
    for (const o of orphans) {
      try { await fs.unlink(path.join(dir, o)); console.log('Deleted', o); } catch (e) { console.error('Failed to delete', o, e.message || e); }
    }
  } else {
    console.log('Run with --delete to remove these files.');
  }
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
