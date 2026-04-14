/**
 * Upload all photos from public/photos/ to Cloudflare R2.
 * Run: node scripts/upload-photos-r2.mjs
 * Requires R2_* vars in .env.local
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET } = process.env;
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  console.error('ERROR: Missing R2_* env vars in .env.local');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const photosDir = join(rootDir, 'public', 'photos');
const progressFile = join(__dirname, 'upload-photos-r2-progress.json');

// Load progress (set of already uploaded filenames)
let uploaded = new Set();
if (existsSync(progressFile)) {
  try {
    uploaded = new Set(JSON.parse(readFileSync(progressFile, 'utf8')));
    console.log(`Resuming — ${uploaded.size} already uploaded.`);
  } catch { /* start fresh */ }
}

const allFiles = readdirSync(photosDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
const pending = allFiles.filter(f => !uploaded.has(f));

console.log(`Total: ${allFiles.length} | Pending: ${pending.length}`);

let done = 0;
let errors = 0;

for (const file of pending) {
  const filePath = join(photosDir, file);
  const key = `photos/${file}`;
  const ext = file.split('.').pop().toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  try {
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: readFileSync(filePath),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    uploaded.add(file);
    done++;

    if (done % 100 === 0) {
      writeFileSync(progressFile, JSON.stringify([...uploaded]));
      console.log(`  ${uploaded.size}/${allFiles.length} uploaded...`);
    }
  } catch (err) {
    console.error(`  ERROR: ${file} — ${err.message}`);
    errors++;
  }
}

// Final save
writeFileSync(progressFile, JSON.stringify([...uploaded]));
console.log(`\nDone: ${done} uploaded, ${errors} errors, ${uploaded.size}/${allFiles.length} total in R2`);
