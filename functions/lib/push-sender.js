
/**
 * Native VAPID Push sender for Cloudflare Workers.
 * This sends a "silent push" (no payload) which does not require complex encryption.
 * The Service Worker will show a default notification when it receives this push.
 */

export async function sendPush(subscription, vapidKeys) {
    const { endpoint } = subscription;

    // 1. Prepare VAPID Headers
    const vapidHeaders = await generateVapidHeaders(endpoint, vapidKeys);

    // 2. Send Request without body
    // An empty body push does NOT need encryption.
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            ...vapidHeaders,
            'ttl': '600',       // 10 minutes to survive momentary offline
            'urgency': 'high',  // Wake device
            'content-length': '0'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Push service error (${response.status}): ${text}`);
    }

    return true;
}

async function generateVapidHeaders(endpoint, vapidKeys) {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: 'mailto:admin@motopoint.online',
    };

    const token = await signJwt(header, payload, vapidKeys.privateKey);
    const cleanPublicKey = vapidKeys.publicKey.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return {
        'Authorization': `vapid t=${token}, k=${cleanPublicKey}`,
        'Topic': 'ride-request'
    };
}

async function signJwt(header, payload, privateKeyBase64) {
    const encoder = new TextEncoder();
    const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const part1 = b64(encoder.encode(JSON.stringify(header)));
    const part2 = b64(encoder.encode(JSON.stringify(payload)));
    const data = encoder.encode(`${part1}.${part2}`);

    try {
        // Convert raw private key to PKCS8 format for Web Crypto
        const key = await importVapidPrivateKey(privateKeyBase64);

        const sig = await crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            key,
            data
        );

        return `${part1}.${part2}.${b64(sig)}`;
    } catch (err) {
        console.error('[VAPID] Sign error:', err);
        throw err;
    }
}

async function importVapidPrivateKey(base64PrivateKey) {
    const rawKey = urlBase64ToUint8Array(base64PrivateKey);

    // If it's 32 bytes, it's a raw private key from web-push.
    // Web Crypto requires PKCS8 or JWK. We'll wrap it in PKCS8.
    if (rawKey.length === 32) {
        const pkcs8 = wrapRawKeyInPkcs8(rawKey);
        return await crypto.subtle.importKey(
            'pkcs8',
            pkcs8,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
        );
    }

    // Otherwise try importing as-is
    return await crypto.subtle.importKey(
        'pkcs8',
        rawKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );
}

function wrapRawKeyInPkcs8(privateKey) {
    // PKCS#8 wrapper for a 32-byte P-256 private key
    const header = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
        0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
        0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);

    const result = new Uint8Array(header.length + privateKey.length);
    result.set(header);
    result.set(privateKey, header.length);
    return result;
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
