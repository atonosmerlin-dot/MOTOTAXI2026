import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// Helper to send push notification via HTTP to push service
async function sendPushNotification(
  subscription: {
    endpoint: string;
    keys: { auth: string; p256dh: string };
  },
  payload: string
): Promise<boolean> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
      },
      body: new TextEncoder().encode(payload),
    });

    console.log(`[EDGE-PUSH] Send response: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error("[EDGE-PUSH] Error sending:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const { subscriptions = [], title = "Nova Corrida!", body = "", url = "/driver" } = await req.json();

    console.log(`[EDGE-PUSH] Received ${subscriptions.length} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });

    let sent = 0;
    let failed = 0;

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        if (!sub?.endpoint) {
          failed++;
          continue;
        }

        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || sub.p256dh || "",
            auth: sub.keys?.auth || sub.auth || "",
          },
        };

        if (!subscription.keys.p256dh || !subscription.keys.auth) {
          failed++;
          continue;
        }

        const success = await sendPushNotification(subscription, payload);
        if (success) {
          sent++;
          console.log("[EDGE-PUSH] ✓ Sent");
        } else {
          failed++;
          console.log("[EDGE-PUSH] ✗ Failed");
        }
      } catch (error) {
        failed++;
        console.warn("[EDGE-PUSH] ✗ Error:", error);
      }
    }

    console.log(`[EDGE-PUSH] Results: ${sent}/${subscriptions.length} sent`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: subscriptions.length,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[EDGE-PUSH] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send notifications" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
