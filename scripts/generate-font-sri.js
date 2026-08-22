#!/usr/bin/env node
/**
 * Generate SRI (Subresource Integrity) hash for Google Fonts CSS
 * Run with: node scripts/generate-font-sri.js
 * Updates index.html with the computed hash
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';
const INDEX_HTML_PATH = resolve(__dirname, '../index.html');

async function generateSRI() {
  try {
    console.log('Fetching Google Fonts CSS...');
    const response = await fetch(FONTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinancePal-SRI-Generator/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch fonts: ${response.status} ${response.statusText}`);
    }
    
    const css = await response.text();
    
    // Generate SHA-384 hash
    const hash = createHash('sha384').update(css).digest('base64');
    const sri = `sha384-${hash}`;
    
    console.log(`Generated SRI: ${sri}`);
    
    // Update index.html
    const html = readFileSync(INDEX_HTML_PATH, 'utf-8');
    const updatedHtml = html.replace(
      /integrity="sha384-[^"]*"/,
      `integrity="${sri}"`
    );
    
    if (html === updatedHtml) {
      console.warn('No SRI placeholder found in index.html - check the pattern');
    } else {
      writeFileSync(INDEX_HTML_PATH, updatedHtml);
      console.log('Updated index.html with new SRI hash');
    }
    
    // Also output for manual verification
    console.log('\n--- For manual verification ---');
    console.log(`Add to index.html:`);
    console.log(`<link rel="stylesheet" href="${FONTS_URL}" integrity="${sri}" crossorigin="anonymous" />`);
    
  } catch (error) {
    console.error('Error generating SRI:', error);
    process.exit(1);
  }
}

generateSRI();