import fs from 'fs';
import path from 'path';

const source = path.join(process.cwd(), 'public', '_routes.json');
const dest = path.join(process.cwd(), 'dist', '_routes.json');

try {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`✓ Copied _routes.json to dist/`);
  } else {
    console.log(`ℹ _routes.json not found, skipping (Cloudflare Pages will auto-detect functions)`);
  }
} catch (err) {
  console.warn(`Warning: Could not copy _routes.json:`, err.message);
  // Don't fail the build for this
}
