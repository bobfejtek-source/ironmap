/**
 * Upload all photos from public/photos/ to Vercel Blob.
 * Run: node scripts/upload-photos-blob.mjs
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 */

import { put } from '@vercel/blob';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
config({ path: join(rootDir, '.env.local') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN not found in .env.local');
  process.exit(1);
}

const photosDir = join(rootDir, 'public', 'photos');
const files = readdirSync(photosDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));

console.log(`Found ${files.length} photos to upload...`);

let uploaded = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  const filePath = join(photosDir, file);
  try {
    const data = readFileSync(filePath);
    await put(`photos/${file}`, data, {
      access: 'public',
      token,
      addRandomSuffix: false,
    });
    uploaded++;
    if (uploaded % 50 === 0) {
      console.log(`  ${uploaded}/${files.length} uploaded...`);
    }
  } catch (err) {
    // Skip if already exists (Blob returns existing URL)
    if (err.message?.includes('already exists') || err.status === 409) {
      skipped++;
    } else {
      console.error(`  ERROR: ${file} — ${err.message}`);
      errors++;
    }
  }
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);
