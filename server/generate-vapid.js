import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

function main() {
  try {
    const keys = webpush.generateVAPIDKeys();
    const outPath = path.join(process.cwd(), '.env.vapid');
    const content = `# Generated VAPID keys - add these to your environment (keep private!)\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`;
    if (fs.existsSync(outPath)) {
      console.log('.env.vapid already exists at', outPath);
      console.log('Keys (public):', keys.publicKey);
      console.log('If you want to overwrite .env.vapid, delete it first.');
    } else {
      fs.writeFileSync(outPath, content, { encoding: 'utf8', flag: 'wx' });
      console.log('Wrote .env.vapid with generated VAPID keys at', outPath);
      console.log('Keys (public):', keys.publicKey);
    }
  } catch (e) {
    console.error('Failed to generate VAPID keys', e);
    process.exit(1);
  }
}

main();
