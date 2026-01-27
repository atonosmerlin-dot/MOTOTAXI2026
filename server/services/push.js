import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

// Configure VAPID keys for web-push
let VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC;
let VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

export async function ensureVapidKeys() {
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
        webpush.setVapidDetails('mailto:admin@motopoint.local', VAPID_PUBLIC, VAPID_PRIVATE);
        return;
    }

    // In development, generate a keypair automatically and persist to .env.vapid
    try {
        console.warn('VAPID keys not found in environment. Generating ephemeral keys...');
        const keys = webpush.generateVAPIDKeys();
        VAPID_PUBLIC = keys.publicKey;
        VAPID_PRIVATE = keys.privateKey;
        webpush.setVapidDetails('mailto:admin@motopoint.local', VAPID_PUBLIC, VAPID_PRIVATE);

        // Persist to a .env.vapid file
        const outPath = path.join(process.cwd(), '.env.vapid');
        if (!fs.existsSync(outPath)) {
            const content = `# Generated VAPID keys - add these to your environment (keep private!)\nVAPID_PUBLIC_KEY=${VAPID_PUBLIC}\nVAPID_PRIVATE_KEY=${VAPID_PRIVATE}\nVITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC}\n`;
            try {
                fs.writeFileSync(outPath, content, { encoding: 'utf8', flag: 'wx' });
                console.info('Generated VAPID keys and saved to .env.vapid');
            } catch (e) {
                console.warn('Could not write .env.vapid', e);
            }
        } else {
            console.info('.env.vapid already exists; not overwriting.');
        }
    } catch (e) {
        console.error('Failed to generate VAPID keys', e);
        console.warn('Push notifications will not work until VAPID keys are configured.');
    }
}

export const getVapidPublicKey = () => VAPID_PUBLIC;

export const sendNotification = async (subscription, payload) => {
    return webpush.sendNotification(subscription, payload, {
        TTL: 86400, // 24 hours
        headers: {
            'Urgency': 'high' // Critical for background delivery on Android
        }
    });
};

// Initialize keys
ensureVapidKeys();
