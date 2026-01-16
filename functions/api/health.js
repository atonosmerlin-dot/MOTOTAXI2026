export async function onRequest(context) {
  return new Response(JSON.stringify({
    ok: true,
    status: 'Functions are WORKING!',
    timestamp: new Date().toISOString(),
    environment: 'Cloudflare Pages Functions'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
