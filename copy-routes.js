import fs from 'fs';
import path from 'path';

const source = path.join(process.cwd(), 'public', '_routes.json');
const dest = path.join(process.cwd(), 'dist', '_routes.json');

try {
  if (!fs.existsSync(source)) {
    console.error(`Source file not found: ${source}`);
    process.exit(1);
  }
  fs.copyFileSync(source, dest);
  console.log(`✓ Copied _routes.json to dist/`);
} catch (err) {
  console.error(`Error copying _routes.json:`, err);
  process.exit(1);
}
